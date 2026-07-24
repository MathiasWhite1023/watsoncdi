import {
  getRuntimeDatabase,
  getRuntimeEnvironment,
} from "../../../../db/runtime";
import {
  finalizeApiResponse,
  localizedApiError,
  resolveResponseLocale,
} from "../../../../lib/api-locale";
import { identityFromRequest } from "../../../../lib/auth/session";
import { configurationStatus } from "../../../../lib/ibm-cloud-bindings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleGET(request: Request) {
  const locale = resolveResponseLocale(request);
  const identity = await identityFromRequest(request);
  if (!identity) {
    return localizedApiError(locale, "AUTH_REQUIRED", 401, {
      en: "Authentication is required.",
      pt: "Autenticação necessária.",
    });
  }

  const runtime = getRuntimeEnvironment();
  const configuration = configurationStatus();
  const watsonxConfigured = Boolean(
    runtime.WATSONX_API_KEY &&
      runtime.WATSONX_PROJECT_ID &&
      runtime.WATSONX_URL &&
      runtime.WATSONX_MODEL_ID,
  );
  let database = false;
  try {
    const db = await getRuntimeDatabase();
    const check = await db.prepare("SELECT 1 AS healthy").first();
    database = Boolean(check);
  } catch {
    database = false;
  }

  return Response.json({
    mode: runtime.AI_PROVIDER_MODE || "auto",
    provider: watsonxConfigured
      ? "ibm-watsonx"
      : "deterministic-fallback",
    watsonx: {
      configured: watsonxConfigured,
      model: watsonxConfigured ? runtime.WATSONX_MODEL_ID : null,
    },
    fallback: { available: true },
    runtime: {
      target:
        runtime.WATSON_CDI_RUNTIME === "ibm" ||
        runtime.PLATFORM_TARGET === "ibm"
          ? "ibm-cloud"
          : "openai-sites",
      database,
      objectStorage: configuration.objectStorage,
      authentication:
        configuration.authentication &&
        configuration.sessionSecret &&
        configuration.baseUrl,
    },
    secretsExposed: false,
  });
}

export async function GET(request: Request) {
  const locale = resolveResponseLocale(request);
  return finalizeApiResponse(await handleGET(request), locale);
}
