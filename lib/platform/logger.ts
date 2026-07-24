type LogLevel = "debug" | "info" | "warn" | "error";
type SafePrimitive = boolean | number | string | null;

export type SafeLogContext = Record<string, unknown>;

const SAFE_CONTEXT_KEYS = new Set([
  "cacheStatus",
  "check",
  "component",
  "configured",
  "durationMs",
  "environment",
  "errorCode",
  "errorName",
  "method",
  "model",
  "operation",
  "outcome",
  "provider",
  "requestId",
  "required",
  "route",
  "runtime",
  "status",
  "statusCode",
  "version",
]);

const MAX_VALUE_LENGTH = 200;
const SAFE_LABEL = /^[a-zA-Z0-9/][a-zA-Z0-9._:/{}[\]-]*$/;

function safeString(value: string) {
  const truncated = value.slice(0, MAX_VALUE_LENGTH);
  const withoutQuery = truncated.split(/[?#]/, 1)[0];
  return SAFE_LABEL.test(withoutQuery) ? withoutQuery : "[redacted]";
}

function safePrimitive(value: unknown): SafePrimitive | undefined {
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }

  if (typeof value === "string") {
    return safeString(value);
  }

  return undefined;
}

export function sanitizeLogContext(context: SafeLogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) => {
      if (!SAFE_CONTEXT_KEYS.has(key)) {
        return [];
      }

      const safeValue = safePrimitive(value);
      return safeValue === undefined ? [] : [[key, safeValue]];
    }),
  );
}

export function errorForLog(error: unknown) {
  if (!(error instanceof Error)) {
    return { errorName: "UnknownError" };
  }

  const code =
    "code" in error && typeof error.code === "string"
      ? safeString(error.code)
      : undefined;

  return {
    errorName: safeString(error.name),
    ...(code ? { errorCode: code } : {}),
  };
}

function writeLog(
  level: LogLevel,
  component: string,
  event: string,
  context: SafeLogContext,
) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    ...sanitizeLogContext(context),
    component: safeString(component),
    event: safeString(event),
  };
  const serialized = JSON.stringify(record);

  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else if (level === "debug") {
    console.debug(serialized);
  } else {
    console.info(serialized);
  }
}

export function createLogger(component: string) {
  return {
    debug(event: string, context: SafeLogContext = {}) {
      writeLog("debug", component, event, context);
    },
    error(event: string, context: SafeLogContext = {}) {
      writeLog("error", component, event, context);
    },
    info(event: string, context: SafeLogContext = {}) {
      writeLog("info", component, event, context);
    },
    warn(event: string, context: SafeLogContext = {}) {
      writeLog("warn", component, event, context);
    },
  };
}
