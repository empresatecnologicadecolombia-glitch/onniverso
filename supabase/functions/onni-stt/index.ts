type SttRequest = {
  audioBase64?: string;
  mimeType?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "gemini-2.5-flash";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractGeminiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = (candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) =>
      part && typeof part === "object" && typeof (part as { text?: string }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim() ?? "";
    if (!apiKey) {
      return json({ error: "Missing GEMINI_API_KEY in Supabase Edge secrets" }, 500);
    }

    const body = (await req.json()) as SttRequest;
    const audioBase64 = body.audioBase64?.trim() ?? "";
    if (!audioBase64) {
      return json({ error: "Missing audioBase64" }, 400);
    }

    const mimeType = body.mimeType?.trim() || "audio/webm";
    const model = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_MODEL;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Transcribe exactly what the person says in this audio. Language: Spanish (Colombia). Return only the spoken words, without quotes or commentary.",
                },
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      },
    );

    const payload = await geminiRes.json();
    if (!geminiRes.ok) {
      const message =
        typeof payload === "object" && payload && "error" in payload
          ? String((payload as { error?: { message?: string } }).error?.message ?? "Gemini STT failed")
          : "Gemini STT failed";
      return json({ error: message }, 502);
    }

    const text = extractGeminiText(payload);
    return json({ text, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected STT error";
    return json({ error: message }, 500);
  }
});
