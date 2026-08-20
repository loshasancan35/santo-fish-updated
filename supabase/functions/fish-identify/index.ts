// AI Fish Identification — Supabase Edge Function
//
// ANTHROPIC_API_KEY must be set via `supabase secrets set ANTHROPIC_API_KEY=...`
// This key is server-side only and never exposed to the client.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FishIDResult {
  species: string;
  confidence: number;
  estimatedSizeCm?: number;
  estimatedWeightKg?: number;
  characteristics?: string[];
  habitat?: string;
  recommendedBaits?: string[];
  recommendedMethods?: string[];
  seasonalSuitability?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Balık tanıma yapılandırılmamış: ANTHROPIC_API_KEY eksik." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "Görüntü dosyası bulunamadı." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const mediaType = imageFile.type || "image/jpeg";

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Image },
              },
              {
                type: "text",
                text: `You are a fish identification expert. Analyze this image and identify the fish species. Respond ONLY with a JSON object matching this TypeScript interface (no markdown, no explanation outside JSON):

interface FishIDResult {
  species: string;           // Turkish common name of the fish
  confidence: number;        // 0-100
  estimatedSizeCm?: number;  // estimated length in cm
  estimatedWeightKg?: number;
  characteristics?: string[];
  habitat?: string;          // in Turkish
  recommendedBaits?: string[]; // in Turkish
  recommendedMethods?: string[]; // in Turkish (e.g. "Olta", "Zıpkın", "Ağ")
  seasonalSuitability?: string; // in Turkish
}

If the image does not contain a fish, return: {"species":"Bilinmiyor","confidence":0,"characteristics":["Görüntüde balık tespit edilemedi"]}
If you are uncertain, set confidence accordingly (below 75).`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      return new Response(
        JSON.stringify({ error: `AI servisi hatası: ${anthropicResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const text = anthropicData?.content?.[0]?.text;
    if (typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "AI yanıtı bozuk geldi." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "AI yanıtı JSON içermiyor." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: FishIDResult;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI yanıtı ayrıştırılamadı." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return new Response(
      JSON.stringify({ error: `Bağlantı hatası: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
