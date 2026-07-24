import {
  createLogger,
  errorForLog,
  sanitizeLogContext,
  type SafeLogContext,
} from "./platform/logger";

export type StructuredLogLevel = "debug" | "info" | "warn" | "error";

const applicationLogger = createLogger("application");

export function logEvent(
  level: StructuredLogLevel,
  event: string,
  context: SafeLogContext = {},
) {
  applicationLogger[level](event, context);
}

export {
  createLogger,
  errorForLog,
  sanitizeLogContext,
  type SafeLogContext,
};
