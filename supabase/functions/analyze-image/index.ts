// supabase/functions/analyze-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function downloadAsBase64(supabase: any, storagePath: string): Promise<{ base64: string; mimeType: string; buffer: Uint8Array } | null> {
  try {
    const { data, error } = await supabase.storage.from("photos").download(storagePath);
    if (error || !data) return null;
    const buffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    return { base64: btoa(binary), mimeType: data.type || "image/jpeg", buffer: uint8 };
  } catch {
    return null;
  }
}

// Läs GPS-koordinater från EXIF-data i JPEG
function readExifGps(buffer: Uint8Array): { lat: number; lon: number } | null {
  try {
    // Hitta APP1-markören (0xFFE1) som innehåller EXIF
    let offset = 2; // Hoppa över SOI-markören
    while (offset < buffer.length - 2) {
      const marker = (buffer[offset] << 8) | buffer[offset + 1];
      const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3];

      if (marker === 0xFFE1) {
        // APP1 — kolla om det är EXIF
        const exifHeader = String.fromCharCode(...buffer.slice(offset + 4, offset + 10));
        if (exifHeader.startsWith("Exif")) {
          return parseExifGps(buffer, offset + 10);
        }
      }
      if (marker === 0xFFDA) break; // SOS — bilddata börjar, sluta leta
      offset += 2 + segmentLength;
    }
  } catch {
    // Ignorera fel vid EXIF-läsning
  }
  return null;
}

function parseExifGps(buffer: Uint8Array, exifStart: number): { lat: number; lon: number } | null {
  try {
    // Bestäm byte-ordning
    const byteOrder = String.fromCharCode(buffer[exifStart], buffer[exifStart + 1]);
    const littleEndian = byteOrder === "II";

    const readUint16 = (pos: number) => littleEndian
      ? buffer[pos] | (buffer[pos + 1] << 8)
      : (buffer[pos] << 8) | buffer[pos + 1];

    const readUint32 = (pos: number) => littleEndian
      ? buffer[pos] | (buffer[pos + 1] << 8) | (buffer[pos + 2] << 16) | (buffer[pos + 3] << 24)
      : (buffer[pos] << 24) | (buffer[pos + 1] << 16) | (buffer[pos + 2] << 8) | buffer[pos + 3];

    const ifdOffset = readUint32(exifStart + 4);
    const ifdPos = exifStart + ifdOffset;
    const entryCount = readUint16(ifdPos);

    let gpsIfdOffset = -1;
    for (let i = 0; i < entryCount; i++) {
      const entryPos = ifdPos + 2 + i * 12;
      const tag = readUint16(entryPos);
      if (tag === 0x8825) { // GPS IFD pointer
        gpsIfdOffset = readUint32(entryPos + 8);
        break;
      }
    }

    if (gpsIfdOffset === -1) return null;

    const gpsPos = exifStart + gpsIfdOffset;
    const gpsEntryCount = readUint16(gpsPos);

    let latRef = "N", lonRef = "E";
    let lat = -1, lon = -1;

    for (let i = 0; i < gpsEntryCount; i++) {
      const entryPos = gpsPos + 2 + i * 12;
      const tag = readUint16(entryPos);
      const valueOffset = readUint32(entryPos + 8);

      if (tag === 0x0001) { // GPSLatitudeRef
        latRef = String.fromCharCode(buffer[entryPos + 8]);
      } else if (tag === 0x0003) { // GPSLongitudeRef
        lonRef = String.fromCharCode(buffer[entryPos + 8]);
      } else if (tag === 0x0002) { // GPSLatitude
        lat = readDmsRational(buffer, exifStart + valueOffset, readUint32);
      } else if (tag === 0x0004) { // GPSLongitude
        lon = readDmsRational(buffer, exifStart + valueOffset, readUint32);
      }
    }

    if (lat === -1 || lon === -1) return null;
    if (latRef === "S") lat = -lat;
    if (lonRef === "W") lon = -lon;
    return { lat, lon };
  } catch {
    return null;
  }
}

function readDmsRational(buffer: Uint8Array, offset: number, readUint32: (pos: number) => number): number {
  const deg = readUint32(offset) / readUint32(offset + 4);
  const min = readUint32(offset + 8) / readUint32(offset + 12);
  const sec = readUint32(offset + 16) / readUint32(offset + 20);
  return deg + min / 60 + sec / 3600;
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=sv`;
    const response = await fetch(url, {
      headers: { "User-Agent": "LevandeFotoalbum/1.0" }
    });
    const data = await response.json();
    const addr = data.address;
    if (!addr) return "";

    // Bygg ett läsbart platsnamn: by/stad + land
    const place = addr.village || addr.town || addr.city || addr.municipality || "";
    const country = addr.country || "";
    return [place, country].filter(Boolean).join(", ");
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storagePath, context } = await req.json();
    if (!storagePath) throw new Error("storagePath krävs");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Hämta huvudbilden
    const mainImage = await downloadAsBase64(supabase, storagePath);
    if (!mainImage) throw new Error(`Kunde inte hämta bilden: ${storagePath}`);

    // Läs GPS från EXIF om admin inte angett plats
    let exifLocation = "";
    if (!context?.location) {
      const gps = readExifGps(mainImage.buffer);
      if (gps) {
        exifLocation = await reverseGeocode(gps.lat, gps.lon);
      }
    }

    // Bygg kontexttext
    const contextParts = [];
    if (context?.persons) contextParts.push(`Personer enligt admin: ${context.persons}`);
    if (context?.location) contextParts.push(`Plats enligt admin: ${context.location}`);
    else if (exifLocation) contextParts.push(`Plats från fotots GPS-data: ${exifLocation}`);
    if (context?.year) contextParts.push(`År/period enligt admin: ${context.year}`);
    if (context?.description) contextParts.push(`Beskrivning enligt admin: ${context.description}`);
    if (context?.notes) contextParts.push(`Anteckningar: ${context.notes}`);
    const contextText = contextParts.length > 0
      ? `\n\nAdmin har redan angett:\n${contextParts.join("\n")}`
      : "";

    // Hämta referensfoton och bygg personregister
    const registryItems: any[] = [];
    const referenceImages: any[] = [];

    if (context?.personRegistry?.length > 0) {
      for (const person of context.personRegistry) {
        if (person.photoPath) {
          const refImage = await downloadAsBase64(supabase, person.photoPath);
          if (refImage) {
            registryItems.push(`- ${person.name} (referensfoto bifogat som bild ${referenceImages.length + 2})`);
            referenceImages.push({ person, image: refImage });
          } else {
            registryItems.push(`- ${person.name}: ${person.description}`);
          }
        } else {
          registryItems.push(`- ${person.name}: ${person.description}`);
        }
      }
    }

    const registryText = registryItems.length > 0
      ? `\n\nKänt personregister för familjen:\n${registryItems.join("\n")}\n\nFörsök identifiera personer i huvudbilden (bild 1) genom att jämföra med referensfotona.`
      : "";

    const prompt = `Du är en hjälpsam assistent som analyserar fotografier för ett minnesalbum för äldre.
Svara ENBART med ett JSON-objekt (inga markdown-backticks):
{
  "description": "Varm, mänsklig beskrivning på 2-3 meningar. Använd namn på personer du känner igen från referensfotona. Om du är osäker på vem som är vem, skriv 'möjligen [namn]' istället för att riskera fel.",
  "location": "Plats om möjligt, annars tom sträng",
  "era": "Ungefärligt år eller årtionde, annars tom sträng",
  "persons": "Lista personer du känner igen med konfidensgrad, t.ex. 'Bo (säker), Thommy (osäker)'. Om du jämför referensfoton, utgå från ansiktsdrag, inte kläder eller position.",
  "keywords": ["max", "fem", "nyckelord"]
}

${contextText ? "VIKTIG INFORMATION FRÅN ADMIN SOM MÅSTE ANVÄNDAS I BESKRIVNINGEN:\n" + contextText : ""}${registryText}`;

    // Bygg content-array med huvudbild + eventuella referensfoton
    const content: any[] = [
      { type: "image", source: { type: "base64", media_type: mainImage.mimeType, data: mainImage.base64 } },
    ];
    for (const ref of referenceImages) {
      content.push({ type: "image", source: { type: "base64", media_type: ref.image.mimeType, data: ref.image.base64 } });
    }
    content.push({ type: "text", text: prompt });

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const text = claudeData.content?.find((b: any) => b.type === "text")?.text || "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Om vi hittade en plats via EXIF men Claude inte fyllt i location, använd EXIF-platsen
    if (exifLocation && !result.location) {
      result.location = exifLocation;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});