// supabase/functions/ask-about-photo/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storagePath, question, photoContext } = await req.json();
    if (!storagePath) throw new Error("storagePath krävs");
    if (!question) throw new Error("question krävs");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Hämta bilden
    const { data, error } = await supabase.storage.from("photos").download(storagePath);
    if (error || !data) throw new Error("Kunde inte hämta bilden");
    const buffer = await data.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64 = btoa(binary);
    const mimeType = data.type || "image/jpeg";

    // Bygg kontexttext från befintliga metadata
    const contextParts = [];
    if (photoContext?.description) contextParts.push(`Beskrivning: ${photoContext.description}`);
    if (photoContext?.location) contextParts.push(`Plats: ${photoContext.location}`);
    if (photoContext?.year) contextParts.push(`År: ${photoContext.year}`);
    if (photoContext?.persons) contextParts.push(`Personer: ${photoContext.persons}`);
    const contextText = contextParts.length > 0
      ? `\n\nKänd information om bilden:\n${contextParts.join("\n")}`
      : "";

    const prompt = `Du är en varm och hjälpsam assistent i ett minnesalbum för äldre. 
En användare tittar på ett foto och har ställt följande fråga: "${question}"

Svara på svenska, kort och tydligt (max 2-3 meningar). Tala direkt till användaren på ett varmt och enkelt sätt. Använd den kända informationen om bilden om det hjälper svaret. Använd ALDRIG markdown-formatering som ** eller * och använd INGA emojis — svaret ska läsas upp som tal.${contextText}`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
            { type: "text", text: prompt }
          ]
        }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const answer = claudeData.content?.find((b: any) => b.type === "text")?.text || "";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});