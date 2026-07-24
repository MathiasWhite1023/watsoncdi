import type {
  DatabaseResult,
  DatabaseValue,
  PortableDatabase,
  PortablePreparedStatement,
} from "../contracts";
import {
  query,
  transaction,
  type TransactionClient,
} from "./client";

type QueryExecutor = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
};

const TABLE_CONFLICT_KEYS: Record<string, string[]> = {
  account_actions: ["discovery_id", "dedupe_key"],
  account_embeddings: [
    "discovery_id",
    "source_type",
    "source_id",
    "chunk_ordinal",
    "model",
  ],
  account_graph_layouts: ["discovery_id", "mode"],
  account_maps: ["discovery_id"],
  account_memory: ["discovery_id"],
  account_plans: ["discovery_id"],
  account_relationships: [
    "discovery_id",
    "source_stakeholder_id",
    "target_stakeholder_id",
    "relation_type",
  ],
  ai_cache: ["cache_key"],
  content_translations: [
    "discovery_id",
    "source_type",
    "source_id",
    "source_fingerprint",
    "target_locale",
  ],
  daily_briefing_variants: ["owner_subject", "briefing_date", "locale"],
  opportunity_hypotheses: ["discovery_id", "capability_key"],
};

const TABLE_COLUMNS: Record<string, string[]> = {
  account_maps: ["discovery_id", "nodes_json", "edges_json", "updated_at"],
  account_memory: [
    "discovery_id",
    "executive_summary",
    "known_json",
    "assumptions_json",
    "gaps_json",
    "changes_json",
    "ai_status",
    "version",
    "updated_at",
  ],
  opportunity_hypotheses: [
    "id",
    "discovery_id",
    "capability_key",
    "title",
    "problem",
    "products_json",
    "stakeholder_ids_json",
    "evidence_json",
    "gaps_json",
    "confidence",
    "stage",
    "next_step",
    "created_at",
    "updated_at",
  ],
  account_plans: [
    "discovery_id",
    "priorities_json",
    "initiatives_json",
    "objectives_json",
    "risks_json",
    "ecosystem_json",
    "relationship_json",
    "plan_30_json",
    "plan_60_json",
    "plan_90_json",
    "approval_status",
    "suggestion_json",
    "updated_at",
  ],
  stakeholders: [
    "id",
    "discovery_id",
    "name",
    "role",
    "area",
    "reports_to_id",
    "influence",
    "stance",
    "priorities_json",
    "notes",
    "source",
    "created_at",
    "updated_at",
  ],
};

const replaceQuestionPlaceholders = (sql: string) => {
  let result = "";
  let index = 0;
  let singleQuoted = false;
  let doubleQuoted = false;

  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const character = sql[cursor];
    const next = sql[cursor + 1];
    if (character === "'" && !doubleQuoted) {
      result += character;
      if (singleQuoted && next === "'") {
        result += next;
        cursor += 1;
      } else {
        singleQuoted = !singleQuoted;
      }
      continue;
    }
    if (character === '"' && !singleQuoted) {
      result += character;
      doubleQuoted = !doubleQuoted;
      continue;
    }
    if (character === "?" && !singleQuoted && !doubleQuoted) {
      index += 1;
      result += `$${index}`;
      continue;
    }
    result += character;
  }
  return result;
};

const upsertSql = (sql: string) => {
  const match = sql.match(
    /^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?/i,
  );
  if (!match) return sql;
  const table = match[1];
  const explicitColumns = match[2]
    ?.split(",")
    .map((column) => column.trim().replace(/^["`]|["`]$/g, ""));
  const columns = explicitColumns?.length
    ? explicitColumns
    : TABLE_COLUMNS[table];
  if (!columns?.length) {
    throw new Error(
      `PostgreSQL compatibility requires an explicit column list for ${table}.`,
    );
  }
  const conflictColumns = TABLE_CONFLICT_KEYS[table] || [columns[0]];
  const conflictSet = new Set(conflictColumns);
  const assignments = columns
    .filter((column) => !conflictSet.has(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(", ");
  const insert = sql.replace(/INSERT\s+OR\s+REPLACE/i, "INSERT");
  return `${insert} ON CONFLICT (${conflictColumns.join(", ")}) DO UPDATE SET ${assignments}`;
};

/**
 * Translate the intentionally small SQLite surface left in legacy route SQL.
 * Schema creation and PRAGMA statements are never sent through this adapter;
 * PostgreSQL migrations run before the application revision starts.
 */
export function translateSqliteQuery(input: string) {
  if (/^\s*PRAGMA\b/i.test(input)) {
    throw new Error("PRAGMA is not supported by the PostgreSQL runtime.");
  }
  const withConflictHandling = /\bINSERT\s+OR\s+REPLACE\b/i.test(input)
    ? upsertSql(input)
    : input.replace(/\bINSERT\s+OR\s+IGNORE\b/i, "INSERT");
  const insertOrIgnore = /\bINSERT\s+OR\s+IGNORE\b/i.test(input)
    ? `${withConflictHandling} ON CONFLICT DO NOTHING`
    : withConflictHandling;
  return replaceQuestionPlaceholders(insertOrIgnore);
}

class PostgresPreparedStatement implements PortablePreparedStatement {
  readonly values: readonly DatabaseValue[];

  constructor(
    readonly sql: string,
    values: readonly DatabaseValue[] = [],
  ) {
    this.values = values;
  }

  bind(...values: DatabaseValue[]): PortablePreparedStatement {
    return new PostgresPreparedStatement(this.sql, values);
  }

  private async execute<T extends Record<string, unknown>>(
    executor: QueryExecutor,
  ): Promise<DatabaseResult<T>> {
    const startedAt = Date.now();
    const result = await executor.query<T>(
      translateSqliteQuery(this.sql),
      this.values,
    );
    return {
      results: result.rows,
      success: true,
      meta: {
        changes: result.rowCount,
        duration: Date.now() - startedAt,
      },
    };
  }

  executeWith<T extends Record<string, unknown>>(executor: QueryExecutor) {
    return this.execute<T>(executor);
  }

  all<T extends Record<string, unknown> = Record<string, unknown>>() {
    return this.execute<T>({ query });
  }

  async first<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(): Promise<T | null> {
    const result = await this.execute<T>({ query });
    return result.results[0] ?? null;
  }

  run<T extends Record<string, unknown> = Record<string, unknown>>() {
    return this.execute<T>({ query });
  }
}

class PostgresDatabaseAdapter implements PortableDatabase {
  readonly kind = "postgres" as const;

  prepare(sql: string): PortablePreparedStatement {
    return new PostgresPreparedStatement(sql);
  }

  async batch<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(
    statements: PortablePreparedStatement[],
  ) {
    return transaction(async (client: TransactionClient) => {
      const results: DatabaseResult<T>[] = [];
      for (const statement of statements) {
        if (!(statement instanceof PostgresPreparedStatement)) {
          throw new Error("Cannot mix D1 and PostgreSQL statements in a batch.");
        }
        results.push(await statement.executeWith<T>(client));
      }
      return results;
    });
  }
}

let adapter: PortableDatabase | null = null;

export function getPostgresDatabase(): PortableDatabase {
  const current = adapter ?? new PostgresDatabaseAdapter();
  adapter = current;
  return current;
}
