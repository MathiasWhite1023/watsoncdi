import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const [route, retrieval, runtime, client, compat, schema, migrator] =
  await Promise.all(
    [
      "app/api/discoveries/route.ts",
      "lib/account-retrieval.ts",
      "db/runtime.ts",
      "db/postgres/client.ts",
      "db/postgres/compat.ts",
      "db/postgres/schema.ts",
      "db/postgres/migrate.mjs",
    ].map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")),
  );

const migrationDirectory = new URL(
  "../db/postgres/migrations/",
  import.meta.url,
);
const migrationFiles = (await readdir(migrationDirectory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();
const migrationDocuments = await Promise.all(
  migrationFiles.map(async (file) => ({
    file,
    sql: await readFile(new URL(file, migrationDirectory), "utf8"),
  })),
);
const baselineMigration = migrationDocuments[0]?.sql ?? "";
const allMigrations = migrationDocuments
  .map(({ sql }) => sql)
  .join("\n--> migration-file-breakpoint\n");
const migrationJournal = JSON.parse(
  await readFile(
    new URL("meta/_journal.json", migrationDirectory),
    "utf8",
  ),
);

test("discovery and retrieval code use the portable database contract", () => {
  assert.doesNotMatch(route, /from ["']cloudflare:workers["']/);
  assert.match(route, /getRuntimeDatabase/);
  assert.doesNotMatch(route, /\bD1Database\b/);
  assert.match(retrieval, /RetrievalDatabase/);
  assert.match(runtime, /node\.DATABASE_URL \|\| boundDatabaseUrl/);
  assert.match(runtime, /databaseRuntimeConfig\(\)\.url/);
});

test("PostgreSQL initialization is migration-driven", () => {
  assert.match(route, /if \(db\.kind === "d1"\) \{\s*await ensureSchema\(db\)/);
  assert.doesNotMatch(
    route,
    /if \(db\.kind === "postgres"\)[\s\S]{0,120}ensureSchema/,
  );
  assert.match(compat, /PRAGMA is not supported by the PostgreSQL runtime/);
  assert.match(compat, /ON CONFLICT/);
  assert.match(compat, /replaceQuestionPlaceholders/);
});

test("the migration runner discovers and verifies every forward-only migration", () => {
  assert.ok(migrationFiles.length >= 2);
  assert.deepEqual(
    migrationJournal.entries.map(({ tag }) => `${tag}.sql`),
    migrationFiles,
  );
  assert.match(migrator, /readdir\(migrationDirectory\)/);
  assert.match(migrator, /\.filter\(\(file\) => \/\^\\d\+\.\*\\\.sql\$\/\.test\(file\)\)/);
  assert.match(migrator, /\.sort\(\)/);
  assert.match(migrator, /__watson_cdi_migrations/);
  assert.match(migrator, /changed after it was applied/);
  for (const { file, sql } of migrationDocuments) {
    assert.doesNotMatch(
      sql,
      /\b(?:DROP\s+(?:TABLE|COLUMN|INDEX)|TRUNCATE\s+TABLE)\b/i,
      `${file} must remain forward-only`,
    );
  }
});

test("pg-core schema and baseline migration cover the same tables", () => {
  const schemaTables = [
    ...schema.matchAll(/pgTable\(\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
  const migrationTables = [
    ...baselineMigration.matchAll(/CREATE TABLE "([^"]+)"/g),
  ].map((match) => match[1]);
  assert.ok(schemaTables.length >= 35);
  assert.deepEqual(
    [...new Set(migrationTables)].sort(),
    [...new Set(schemaTables)].sort(),
  );
});

test("every composite compatibility conflict target has a matching unique index", () => {
  const compositeTargets = {
    account_actions: ["discovery_id", "dedupe_key"],
    account_embeddings: [
      "discovery_id",
      "source_type",
      "source_id",
      "chunk_ordinal",
      "model",
    ],
    account_graph_layouts: ["discovery_id", "mode"],
    account_relationships: [
      "discovery_id",
      "source_stakeholder_id",
      "target_stakeholder_id",
      "relation_type",
    ],
    content_translations: [
      "discovery_id",
      "source_type",
      "source_id",
      "source_fingerprint",
      "target_locale",
    ],
    daily_briefing_variants: [
      "owner_subject",
      "briefing_date",
      "locale",
    ],
    opportunity_hypotheses: ["discovery_id", "capability_key"],
  };
  const compactCompat = compat.replace(/\s+/g, "").replace(/,\]/g, "]");
  const migratedUniqueTargets = new Set(
    [
      ...allMigrations.matchAll(
        /CREATE UNIQUE INDEX "[^"]+" ON "([^"]+)" USING btree \(([^)]+)\)/g,
      ),
    ].map((match) => {
      const columns = [...match[2].matchAll(/"([^"]+)"/g)].map(
        (column) => column[1],
      );
      return `${match[1]}:${columns.join(",")}`;
    }),
  );

  for (const [table, columns] of Object.entries(compositeTargets)) {
    const serializedTarget = `${table}:[${columns
      .map((column) => `"${column}"`)
      .join(",")}]`;
    assert.ok(
      compactCompat.includes(serializedTarget),
      `${table} must declare its complete compatibility conflict target`,
    );
    assert.ok(
      migratedUniqueTargets.has(`${table}:${columns.join(",")}`),
      `${table} must have a unique index matching its compatibility conflict target`,
    );
  }
});

test("identity ownership and sessions are additive and indexed", () => {
  assert.match(allMigrations, /"owner_subject" text/);
  assert.match(allMigrations, /CREATE TABLE "users"/);
  assert.match(allMigrations, /CREATE TABLE "user_identities"/);
  assert.match(allMigrations, /CREATE TABLE "auth_sessions"/);
  assert.match(
    allMigrations,
    /CREATE UNIQUE INDEX "user_identities_provider_subject_idx"/,
  );
  assert.match(
    allMigrations,
    /CREATE UNIQUE INDEX "auth_sessions_token_hash_idx"/,
  );
});

test("IBM PostgreSQL connections require verified TLS in production", () => {
  assert.match(client, /databaseRuntimeConfig/);
  assert.match(client, /DATABASE_CA_CERT/);
  assert.match(client, /rejectUnauthorized: true/);
  assert.match(
    client,
    /PostgreSQL TLS verification cannot be disabled in production/,
  );
  assert.doesNotMatch(client, /console\.(?:log|error)\([^)]*DATABASE_URL/);
});
