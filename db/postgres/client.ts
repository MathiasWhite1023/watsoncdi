import type { Pool, PoolClient, PoolConfig, QueryResultRow } from "pg";
import { databaseRuntimeConfig } from "../../lib/ibm-cloud-bindings";
import { createLogger, errorForLog } from "../../lib/platform/logger";

export type QueryResult<T extends Record<string, unknown>> = {
  rows: T[];
  rowCount: number;
};

export type TransactionClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<T>>;
};

type PgModule = typeof import("pg");

let poolPromise: Promise<Pool> | null = null;
const logger = createLogger("postgres");

const runtimeEnvironment = () => {
  const node =
    typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)
      : {};
  const injected = (globalThis as { __WATSON_CDI_ENV__?: Record<string, string> })
    .__WATSON_CDI_ENV__;
  return { ...injected, ...node };
};

const normalizeCertificate = (value: string | undefined) => {
  if (!value) return undefined;
  const decoded = value.includes("BEGIN CERTIFICATE")
    ? value
    : Buffer.from(value, "base64").toString("utf8");
  return decoded.replace(/\\n/g, "\n");
};

function poolConfiguration(): PoolConfig {
  const environment = runtimeEnvironment();
  const bound = databaseRuntimeConfig();
  const connectionString = bound.url?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the PostgreSQL runtime.");
  }

  const parsed = new URL(connectionString);
  const local =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";
  const localContainerSmoke =
    environment.WATSON_CDI_LOCAL_SMOKE_TEST === "true" &&
    (local || parsed.hostname === "host.docker.internal");
  const sslMode = (
    environment.DATABASE_SSL_MODE || (local ? "disable" : "verify-full")
  ).toLowerCase();

  if (
    environment.NODE_ENV === "production" &&
    !localContainerSmoke &&
    (sslMode === "disable" ||
      environment.DATABASE_SSL_REJECT_UNAUTHORIZED === "false")
  ) {
    throw new Error(
      "PostgreSQL TLS verification cannot be disabled in production.",
    );
  }

  // `pg` gives URL sslmode parameters precedence over an explicit ssl object.
  // Remove them so IBM's CA certificate and strict verification always win.
  for (const parameter of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
  ]) {
    parsed.searchParams.delete(parameter);
  }

  const max = Math.max(
    1,
    Math.min(20, Number(environment.DATABASE_POOL_MAX || 8)),
  );
  const ssl =
    sslMode === "disable"
      ? false
      : {
          rejectUnauthorized: true,
          ca: normalizeCertificate(
            bound.caCertificateBase64 || environment.DATABASE_CA_CERT,
          ),
          servername: parsed.hostname,
        };

  return {
    connectionString: parsed.toString(),
    ssl,
    max,
    connectionTimeoutMillis: Math.max(
      1_000,
      Number(environment.DATABASE_CONNECT_TIMEOUT_MS || 10_000),
    ),
    idleTimeoutMillis: Math.max(
      1_000,
      Number(environment.DATABASE_IDLE_TIMEOUT_MS || 30_000),
    ),
    statement_timeout: Math.max(
      1_000,
      Number(environment.DATABASE_STATEMENT_TIMEOUT_MS || 30_000),
    ),
    application_name: "watson-cdi",
    allowExitOnIdle: environment.NODE_ENV !== "production",
  };
}

async function createPool() {
  // Keep the Node-only driver out of the Cloudflare bundle. The IBM standalone
  // image installs `pg` and resolves this import at runtime.
  const moduleName = "pg";
  const pg = (await import(
    /* webpackIgnore: true */
    /* @vite-ignore */
    moduleName
  )) as PgModule;
  const pool = new pg.Pool(poolConfiguration());
  pool.on("error", (error: Error) => {
    logger.error("pool.error", errorForLog(error));
  });
  return pool;
}

async function getPool() {
  poolPromise ??= createPool();
  return poolPromise;
}

const normalizeQueryResult = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  result: { rows: QueryResultRow[]; rowCount: number | null },
): QueryResult<T> => ({
  rows: result.rows as T[],
  rowCount: Number(result.rowCount ?? 0),
});

export async function query<
  T extends Record<string, unknown> = Record<string, unknown>,
>(text: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
  const pool = await getPool();
  return normalizeQueryResult<T>(await pool.query(text, [...params]));
}

function transactionQuery(client: PoolClient): TransactionClient {
  return {
    async query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params: readonly unknown[] = [],
    ) {
      return normalizeQueryResult<T>(await client.query(text, [...params]));
    },
  };
}

export async function transaction<T>(
  callback: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await callback(transactionQuery(client));
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startedAt = Date.now();
  try {
    await query("SELECT 1 AS healthy");
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Database unavailable",
    };
  }
}

export async function closeDatabasePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = null;
  await pool.end();
}
