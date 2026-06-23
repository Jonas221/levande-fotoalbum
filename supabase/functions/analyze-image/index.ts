// supabase/functions/analyze-image/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function downloadAsBase64(supabase: any, storagePath: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const { data, error } = await supabase.storage.from("photos").download(storagePath);
    if (error || !data) return null;
    const buffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    return { base64: btoa(binary), mimeType: data.type || "image/jpeg" };
  } catch {
    return null;
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

    // Bygg kontexttext
    const contextParts = [];
    if (context?.persons) contextParts.push(`Personer enligt admin: ${context.persons}`);
if (context?.location) contextParts.push(`Plats enligt admin: ${context.location}`);
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});