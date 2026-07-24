import { createLogger } from "@/lib/platform/logger";
import { assessReadiness } from "@/lib/platform/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("health");

export async function GET() {
  const startedAt = performance.now();
  const report = await assessReadiness();
  const statusCode = report.ready ? 200 : 503;

  logger[report.ready ? "info" : "warn"]("readiness.checked", {
    route: "/api/health/ready",
    statusCode,
    durationMs: Math.round(performance.now() - startedAt),
    outcome: report.ready ? "ready" : "not_ready",
    runtime: process.env.WATSON_CDI_RUNTIME ?? "sites",
  });

  return Response.json(
    {
      status: report.ready ? "ready" : "not_ready",
      checks: report.checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
