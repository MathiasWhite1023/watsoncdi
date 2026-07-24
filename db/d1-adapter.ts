import type {
  DatabaseResult,
  DatabaseValue,
  PortableDatabase,
  PortablePreparedStatement,
} from "./contracts";

type D1StatementLike = {
  bind(...values: unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{
    results: T[];
    success: boolean;
    meta: Record<string, unknown>;
  }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<{
    results?: T[];
    success: boolean;
    meta: Record<string, unknown>;
  }>;
};

type D1DatabaseLike = {
  prepare(sql: string): D1StatementLike;
  batch<T = Record<string, unknown>>(
    statements: D1StatementLike[],
  ): Promise<
    Array<{
      results?: T[];
      success: boolean;
      meta: Record<string, unknown>;
    }>
  >;
};

const normalizeResult = <T extends Record<string, unknown>>(
  value: {
    results?: T[];
    success: boolean;
    meta: Record<string, unknown>;
  },
): DatabaseResult<T> => ({
  results: value.results ?? [],
  success: value.success,
  meta: {
    changes: Number(value.meta.changes ?? value.results?.length ?? 0),
    duration:
      value.meta.duration == null ? undefined : Number(value.meta.duration),
    last_row_id:
      value.meta.last_row_id == null
        ? undefined
        : Number(value.meta.last_row_id),
  },
});

class D1PreparedStatementAdapter implements PortablePreparedStatement {
  readonly sql: string;
  readonly values: readonly DatabaseValue[];
  readonly statement: D1StatementLike;

  constructor(
    private readonly binding: D1DatabaseLike,
    sql: string,
    values: readonly DatabaseValue[] = [],
  ) {
    this.sql = sql;
    this.values = values;
    this.statement = binding.prepare(sql).bind(...values);
  }

  bind(...values: DatabaseValue[]) {
    return new D1PreparedStatementAdapter(this.binding, this.sql, values);
  }

  async all<T extends Record<string, unknown> = Record<string, unknown>>() {
    return normalizeResult(await this.statement.all<T>());
  }

  async first<T extends Record<string, unknown> = Record<string, unknown>>() {
    return this.statement.first<T>();
  }

  async run<T extends Record<string, unknown> = Record<string, unknown>>() {
    return normalizeResult(await this.statement.run<T>());
  }
}

export class D1DatabaseAdapter implements PortableDatabase {
  readonly kind = "d1" as const;

  constructor(private readonly binding: D1DatabaseLike) {}

  prepare(sql: string) {
    return new D1PreparedStatementAdapter(this.binding, sql);
  }

  async batch<T extends Record<string, unknown> = Record<string, unknown>>(
    statements: PortablePreparedStatement[],
  ) {
    const nativeStatements = statements.map((statement) => {
      if (!(statement instanceof D1PreparedStatementAdapter)) {
        throw new Error("Cannot mix PostgreSQL and D1 statements in a batch.");
      }
      return statement.statement;
    });
    return (await this.binding.batch<T>(nativeStatements)).map(normalizeResult);
  }
}

export function wrapD1Database(binding: unknown): PortableDatabase {
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Configure D1 for the Sites runtime or DATABASE_URL for the IBM runtime.",
    );
  }
  return new D1DatabaseAdapter(binding as D1DatabaseLike);
}
