import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migrationDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run PostgreSQL migrations.");
}

const parsed = new URL(connectionString);
const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
const sslMode = (
  process.env.DATABASE_SSL_MODE || (local ? "disable" : "verify-full")
).toLowerCase();
if (
  process.env.NODE_ENV === "production" &&
  (sslMode === "disable" ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false")
) {
  throw new Error("PostgreSQL TLS verification cannot be disabled in production.");
}
for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
  parsed.searchParams.delete(parameter);
}
const caValue =
  process.env.DATABASE_CA_CERT_BASE64 || process.env.DATABASE_CA_CERT;
const ca = caValue
  ? (caValue.includes("BEGIN CERTIFICATE")
      ? caValue
      : Buffer.from(caValue, "base64").toString("utf8")
    ).replace(/\\n/g, "\n")
  : undefined;

const pool = new pg.Pool({
  connectionString: parsed.toString(),
  ssl:
    sslMode === "disable"
      ? false
      : { rejectUnauthorized: true, ca, servername: parsed.hostname },
  max: 1,
  application_name: "watson-cdi-migrations",
});

const runtimeUser = process.env.DATABASE_RUNTIME_USER?.trim();
const runtimePassword = process.env.DATABASE_RUNTIME_PASSWORD;
if (
  runtimeUser &&
  (!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeUser) ||
    !runtimePassword ||
    runtimePassword.length < 20)
) {
  throw new Error("The PostgreSQL runtime role configuration is invalid.");
}

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;

async function provisionRuntimeRole(client) {
  if (!runtimeUser || !runtimePassword) return;
  const role = quoteIdentifier(runtimeUser);
  const password = quoteLiteral(runtimePassword);
  const exists = await client.query(
    "SELECT 1 FROM pg_roles WHERE rolname = $1",
    [runtimeUser],
  );
  if (exists.rowCount) {
    await client.query(`ALTER ROLE ${role} LOGIN PASSWORD ${password}`);
  } else {
    await client.query(`CREATE ROLE ${role} LOGIN PASSWORD ${password}`);
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName) throw new Error("The PostgreSQL database name is missing.");
  await client.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${role}`,
  );
  await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`,
  );
}

const files = (await readdir(migrationDirectory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS __watson_cdi_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at text NOT NULL
    )
  `);

  for (const file of files) {
    const sql = await readFile(join(migrationDirectory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT checksum FROM __watson_cdi_migrations WHERE name = $1",
      [file],
    );
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(
          `Migration ${file} changed after it was applied. Add a new forward-only migration instead.`,
        );
      }
      continue;
    }

    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await client.query("BEGIN");
    try {
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query(
        "INSERT INTO __watson_cdi_migrations (name, checksum, applied_at) VALUES ($1, $2, $3)",
        [file, checksum, new Date().toISOString()],
      );
      await client.query("COMMIT");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  await provisionRuntimeRole(client);
  if (runtimeUser) {
    console.log("Provisioned the restricted PostgreSQL runtime role.");
  }
} finally {
  client.release();
  await pool.end();
}
