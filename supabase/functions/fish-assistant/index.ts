// Balık Asistanı — Supabase Edge Function
//
// ANTHROPIC_API_KEY bu fonksiyon için bir ortam gizli anahtarıdır ve
// `supabase secrets set ANTHROPIC_API_KEY=...` ile ayarlanmalıdır.
// Bu anahtar, istemci tarafında kullanılan Supabase anon anahtarından
// TAMAMEN FARKLIDIR ve asla istemciye açıklanmamalıdır.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContextData {
  location?: { lat: number; lng: number };
  weather?: {
    temp: number;
    condition: string;
    windSpeed?: number;
    windDirection?: string;
    humidity?: number;
    waveHeight?: number;
    precipitation?: number;
  };
  waterTemp?: number;
  moonPhase?: { name: string; illumination: number };
  sunTimes?: { sunrise: string; sunset: string };
  season?: string;
  currentTime?: string;
  fishingScore?: number;
  targetSpecies?: string;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  context?: ContextData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Asistan yapılandırılmamış: ANTHROPIC_API_KEY eksik." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const userMessage = body?.message?.trim();
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Boş mesaj gönderilemez." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];
    const ctx = body.context;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    let catchSummary = "Henüz kayıtlı av verisi yok.";
    try {
      const { data: catches, error } = await supabase
        .from("catches")
        .select("fish_name,species,location_name,catch_date,season,fishing_method,total_weight,depth_m,weather_condition,bait,tackle,catch_time");
      if (!error && catches && catches.length > 0) {
        const total = catches.length;
        const speciesCounts = new Map<string, number>();
        const locCounts = new Map<string, number>();
        const methodCounts = new Map<string, number>();
        const baitCounts = new Map<string, number>();
        let weightSum = 0;
        let depthSum = 0;
        let depthCount = 0;

        for (const c of catches) {
          const sp = (c.species || c.fish_name || "Bilinmiyor").trim();
          speciesCounts.set(sp, (speciesCounts.get(sp) ?? 0) + 1);
          if (c.location_name) locCounts.set(c.location_name.trim(), (locCounts.get(c.location_name.trim()) ?? 0) + 1);
          if (c.fishing_method) methodCounts.set(c.fishing_method, (methodCounts.get(c.fishing_method) ?? 0) + 1);
          if (c.bait) baitCounts.set(c.bait.trim(), (baitCounts.get(c.bait.trim()) ?? 0) + 1);
          if (typeof c.total_weight === "number") weightSum += c.total_weight;
          if (typeof c.depth_m === "number") { depthSum += c.depth_m; depthCount++; }
        }

        const topSpecies = Array.from(speciesCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topLocations = Array.from(locCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const topMethods = Array.from(methodCounts.entries()).sort((a, b) => b[1] - a[1]);
        const topBaits = Array.from(baitCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

        const lines: string[] = [`Toplam av sayısı: ${total}`];
        if (weightSum > 0) lines.push(`Toplam ağırlık: ${weightSum.toFixed(1)} kg`);
        if (topSpecies.length) lines.push(`En çok yakalanan türler: ${topSpecies.map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (topLocations.length) lines.push(`En çok kullanılan konumlar: ${topLocations.map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (topMethods.length) lines.push(`Kullanılan av yöntemleri: ${topMethods.map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (topBaits.length) lines.push(`En çok kullanılan yemler: ${topBaits.map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (depthCount > 0) lines.push(`Ortalama derinlik: ${(depthSum / depthCount).toFixed(1)} m (${depthCount} kayıt)`);
        catchSummary = lines.join("\n");
      }
    } catch {
      // Veritabanı sorgusu başarısız olursa sohbete engel olma
    }

    const contextLines: string[] = [];
    if (ctx) {
      if (ctx.location) contextLines.push(`Konum: ${ctx.location.lat.toFixed(4)}, ${ctx.location.lng.toFixed(4)}`);
      if (ctx.weather) {
        contextLines.push(`Hava: ${ctx.weather.temp}°C, ${ctx.weather.condition}`);
        if (ctx.weather.windSpeed != null) contextLines.push(`Rüzgar: ${ctx.weather.windSpeed} km/h${ctx.weather.windDirection ? ` (${ctx.weather.windDirection})` : ""}`);
        if (ctx.weather.humidity != null) contextLines.push(`Nem: ${ctx.weather.humidity}%`);
        if (ctx.weather.waveHeight != null) contextLines.push(`Dalga: ${ctx.weather.waveHeight} m`);
        if (ctx.weather.precipitation != null) contextLines.push(`Yağış: ${ctx.weather.precipitation} mm`);
      }
      if (ctx.waterTemp != null) contextLines.push(`Su sıcaklığı: ${ctx.waterTemp}°C`);
      if (ctx.moonPhase) contextLines.push(`Ay evresi: ${ctx.moonPhase.name} (%${Math.round(ctx.moonPhase.illumination * 100)} aydınlanma)`);
      if (ctx.sunTimes) contextLines.push(`Gün doğumu: ${ctx.sunTimes.sunrise}, gün batımı: ${ctx.sunTimes.sunset}`);
      if (ctx.season) contextLines.push(`Mevsim: ${ctx.season}`);
      if (ctx.currentTime) contextLines.push(`Şu anki saat: ${ctx.currentTime}`);
      if (ctx.fishingScore != null) contextLines.push(`Balıkçılık Skoru: ${ctx.fishingScore}/100`);
      if (ctx.targetSpecies) contextLines.push(`Hedef tür: ${ctx.targetSpecies}`);
    }

    const contextBlock = contextLines.length > 0 ? `\n\nMevcut bağlamsal veriler:\n${contextLines.join("\n")}` : "";

    const systemPrompt = `Sen "Balık Günlüğü" uygulamasının dostça balıkçılık asistanısın. Türkçe yanıt ver. Cevaplarını kısa ve pratik tut. Genel balıkçılık sorularına (tür davranışları, teknikler, hava/mevsim önerileri, yem/olta takımı) cevap verebilirsin.

Kullanıcının av geçmişinden bir özet aşağıda verilmiştir. Yanıtlarını bu verilerle zengenleştir. Kullanıcı kendi geçmişine dayalı bir soru sorduğunda (örn. "nerede avlanmalıyım?", "hangi yemi denemeliyim?"), bu verileri kullanarak kişisel öneriler ver. Verilerle ilgili konuşurken, tahmin yaptığını mı yoksa kayıtlı verilere dayandığını mı net olarak belirt.

Mevcut hava, deniz, ay evresi ve konum verileri verilmişse, bunları kullanarak daha kesin öneriler ver. Eğer veriler eksikse, eksik olduğunu açıkça belirt ve tahmin yaptığını söyle.

Kullanıcının av geçmişi özeti:
${catchSummary}${contextBlock}`;

    const anthropicMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

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
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Asistan hatası: ${anthropicResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const reply = anthropicData?.content?.[0]?.text;

    if (typeof reply !== "string" || !reply.trim()) {
      return new Response(
        JSON.stringify({ error: "Asistan boş yanıt döndürdü." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ reply }),
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
