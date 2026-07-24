import { createLogger } from "@/lib/platform/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("health");

export async function GET() {
  const startedAt = performance.now();
  const response = Response.json(
    {
      status: "ok",
      service: "watson-cdi",
      version: process.env.APP_VERSION ?? "development",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

  logger.info("liveness.checked", {
    route: "/api/health/live",
    statusCode: response.status,
    durationMs: Math.round(performance.now() - startedAt),
    runtime: process.env.WATSON_CDI_RUNTIME ?? "sites",
  });

  return response;
}
