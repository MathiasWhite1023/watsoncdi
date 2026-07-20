import { env } from "cloudflare:workers";
import { finalizeApiResponse, localizedApiError, resolveResponseLocale } from "../../../../lib/api-locale";

export const dynamic = "force-dynamic";

async function handleGET(request: Request) {
  const locale = resolveResponseLocale(request);
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return localizedApiError(locale, "AUTH_REQUIRED", 401, { en: "Authentication is required.", pt: "Autenticação necessária." });
  const runtime = env as unknown as Record<string, string | undefined>;
  const watsonxConfigured = Boolean(
    runtime.WATSONX_API_KEY && runtime.WATSONX_PROJECT_ID && runtime.WATSONX_URL && runtime.WATSONX_MODEL_ID,
  );
  const geminiConfigured = Boolean(runtime.GEMINI_API_KEY);
  const provider = watsonxConfigured ? "ibm-watsonx" : geminiConfigured ? "google-gemini" : "deterministic-fallback";
  let usage = { generativeToday: 0, embeddingsToday: 0, generativeMinute: 0, embeddingsMinute: 0, circuitOpen: false };
  try {
    const db = (env as unknown as { DB: D1Database }).DB;
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const circuitWindow = new Date(Date.now() - 5 * 60_000).toISOString();
    const [generativeToday, embeddingsToday, generativeMinute, embeddingsMinute, recent] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND agent <> 'semantic-index' AND created_at >= ?").bind(dayAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND agent = 'semantic-index' AND created_at >= ?").bind(dayAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND agent <> 'semantic-index' AND created_at >= ?").bind(minuteAgo).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND agent = 'semantic-index' AND created_at >= ?").bind(minuteAgo).first<{ count: number }>(),
      db.prepare("SELECT status FROM ai_runs WHERE provider = 'google-gemini' AND created_at >= ? ORDER BY created_at DESC LIMIT 3").bind(circuitWindow).all<{ status: string }>(),
    ]);
    usage = { generativeToday: Number(generativeToday?.count || 0), embeddingsToday: Number(embeddingsToday?.count || 0), generativeMinute: Number(generativeMinute?.count || 0), embeddingsMinute: Number(embeddingsMinute?.count || 0), circuitOpen: recent.results.length === 3 && recent.results.every((item) => item.status === "error") };
  } catch {
    // Status remains useful before the additive V5 schema is initialized.
  }
  return Response.json({
    mode: runtime.AI_PROVIDER_MODE || "auto",
    provider,
    watsonx: { configured: watsonxConfigured, model: runtime.WATSONX_MODEL_ID || null },
    gemini: {
      configured: geminiConfigured,
      model: runtime.GEMINI_MODEL_ID || "gemini-3.1-flash-lite",
      embeddingModel: runtime.GEMINI_EMBEDDING_MODEL_ID || "gemini-embedding-2",
      limits: { generativeRpm: 12, generativeDaily: 450, embeddingRpm: 80, embeddingDaily: 900 },
      usage,
      remaining: { generativeDaily: Math.max(0, 450 - usage.generativeToday), embeddingDaily: Math.max(0, 900 - usage.embeddingsToday) },
    },
    fallback: { available: true },
    secretsExposed: false,
  });
}

export async function GET(request: Request) {
  const locale = resolveResponseLocale(request);
  return finalizeApiResponse(await handleGET(request), locale);
}
