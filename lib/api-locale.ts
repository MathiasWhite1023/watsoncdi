export const SUPPORTED_RESPONSE_LOCALES = ["en-US", "pt-BR"] as const;

export type ResponseLocale = (typeof SUPPORTED_RESPONSE_LOCALES)[number];

const LOCALE_COOKIE = "watson-cdi-locale";

export function parseResponseLocale(value: unknown): ResponseLocale | null {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "en" || normalized === "en-us" || normalized === "en_us")
    return "en-US";
  if (normalized === "pt" || normalized === "pt-br" || normalized === "pt_br")
    return "pt-BR";
  return null;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") || "";
  for (const pair of cookie.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return pair.slice(separator + 1).trim();
    }
  }
  return null;
}

/** Header wins over the persisted preference; English is intentionally the default. */
export function resolveResponseLocale(request: Request): ResponseLocale {
  return (
    parseResponseLocale(request.headers.get("x-watson-cdi-locale")) ||
    parseResponseLocale(cookieValue(request, LOCALE_COOKIE)) ||
    "en-US"
  );
}

export function localizedText(
  locale: ResponseLocale,
  english: string,
  portuguese: string,
): string {
  return locale === "pt-BR" ? portuguese : english;
}

export function withContentLanguage(
  response: Response,
  locale: ResponseLocale,
): Response {
  response.headers.set("Content-Language", locale);
  const vary = response.headers.get("Vary") || "";
  const values = new Set(
    vary
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  values.add("x-watson-cdi-locale");
  values.add("Cookie");
  response.headers.set("Vary", Array.from(values).join(", "));
  return response;
}

export function localizedJson(
  locale: ResponseLocale,
  value: unknown,
  init?: ResponseInit,
): Response {
  return withContentLanguage(Response.json(value, init), locale);
}

const GENERIC_ERROR_MESSAGES: Record<number, { en: string; pt: string }> = {
  400: {
    en: "Review the information provided and try again.",
    pt: "Revise as informações fornecidas e tente novamente.",
  },
  401: {
    en: "Sign in to Watson CDI to continue.",
    pt: "Entre no Watson CDI para continuar.",
  },
  403: {
    en: "You are not authorized to perform this operation.",
    pt: "Você não está autorizado a realizar esta operação.",
  },
  404: {
    en: "The requested resource was not found.",
    pt: "O recurso solicitado não foi encontrado.",
  },
  409: {
    en: "The operation conflicts with the current resource state.",
    pt: "A operação conflita com o estado atual do recurso.",
  },
  429: {
    en: "The experimental AI quota has been reached. Try again later.",
    pt: "A cota experimental de IA foi atingida. Tente novamente mais tarde.",
  },
  503: {
    en: "The requested service is temporarily unavailable.",
    pt: "O serviço solicitado está temporariamente indisponível.",
  },
};

export function localizedApiError(
  locale: ResponseLocale,
  errorCode: string,
  status: number,
  messages?: { en: string; pt: string },
  extra?: Record<string, unknown>,
): Response {
  const selected = messages ||
    GENERIC_ERROR_MESSAGES[status] || {
      en: "The request could not be completed.",
      pt: "Não foi possível concluir a solicitação.",
    };
  return localizedJson(
    locale,
    {
      errorCode,
      error: locale === "pt-BR" ? selected.pt : selected.en,
      ...extra,
    },
    { status },
  );
}

export type ParsedJsonObject =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

/** Parse a JSON object without allowing framework-level, unlocalized parse errors to escape. */
export async function parseLocalizedJsonObject(
  request: Request,
  locale: ResponseLocale = resolveResponseLocale(request),
): Promise<ParsedJsonObject> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new TypeError("JSON object required");
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: localizedApiError(locale, "INVALID_JSON", 400, {
        en: "Send a valid JSON object in the request body.",
        pt: "Envie um objeto JSON válido no corpo da requisição.",
      }),
    };
  }
}

/**
 * Compatibility bridge for older handlers that returned a localized sentence
 * without a stable code. New handlers should call localizedApiError directly.
 */
export async function finalizeApiResponse(
  response: Response,
  locale: ResponseLocale,
): Promise<Response> {
  if (
    response.status < 400 ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    return withContentLanguage(response, locale);
  }
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  if (!payload || typeof payload.error !== "string")
    return withContentLanguage(response, locale);
  const statusMessage = GENERIC_ERROR_MESSAGES[response.status] || {
    en: "The request could not be completed.",
    pt: "Não foi possível concluir a solicitação.",
  };
  const body = {
    ...payload,
    errorCode:
      typeof payload.errorCode === "string"
        ? payload.errorCode
        : `HTTP_${response.status}`,
    error:
      typeof payload.errorCode === "string"
        ? payload.error
        : locale === "pt-BR"
          ? payload.error
          : statusMessage.en,
  };
  return withContentLanguage(
    Response.json(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
    locale,
  );
}
