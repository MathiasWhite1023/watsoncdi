import type { PortableDatabase } from "./contracts";
import { wrapD1Database } from "./d1-adapter";
import { getPostgresDatabase } from "./postgres/compat";
import { databaseRuntimeConfig } from "../lib/ibm-cloud-bindings";

let database: PortableDatabase | null = null;
let platformEnvironment: Record<string, string | undefined> = {};

const nodeEnvironment = () =>
  typeof process === "undefined"
    ? {}
    : (process.env as Record<string, string | undefined>);

export function getRuntimeEnvironment(): Record<string, string | undefined> {
  return { ...platformEnvironment, ...nodeEnvironment() };
}

/**
 * Selects PostgreSQL on the IBM standalone runtime and D1 on OpenAI Sites.
 * Keeping this decision here prevents route handlers and domain services from
 * importing either provider directly.
 */
export async function getRuntimeDatabase(): Promise<PortableDatabase> {
  if (database) return database;
  const node = nodeEnvironment();
  const boundDatabaseUrl =
    typeof process === "undefined" ? undefined : databaseRuntimeConfig().url;
  if (node.DATABASE_URL || boundDatabaseUrl) {
    database = getPostgresDatabase();
    return database;
  }

  // This import is reached only by the Sites Worker. Keeping it behind the
  // PostgreSQL check lets the standalone Node runtime start without loading a
  // Cloudflare virtual module.
  const { env } = await import("cloudflare:workers");
  const cloudflareEnvironment = env as unknown as Record<string, unknown>;
  platformEnvironment = Object.fromEntries(
    Object.entries(cloudflareEnvironment).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  if (platformEnvironment.DATABASE_URL) {
    (
      globalThis as {
        __WATSON_CDI_ENV__?: Record<string, string>;
      }
    ).__WATSON_CDI_ENV__ = platformEnvironment as Record<string, string>;
    database = getPostgresDatabase();
    return database;
  }

  database = wrapD1Database(cloudflareEnvironment.DB);
  return database;
}

export function resetRuntimeDatabaseForTests() {
  database = null;
  platformEnvironment = {};
}

export type {
  DatabaseKind,
  DatabaseResult,
  DatabaseRunMeta,
  DatabaseValue,
  PortableDatabase,
  PortablePreparedStatement,
} from "./contracts";
