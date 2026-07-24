/**
 * Small database contract shared by the Cloudflare/D1 and IBM/PostgreSQL
 * runtimes. It intentionally mirrors the subset of the D1 API used by the
 * application so route handlers stay independent from the hosting provider.
 */
export type DatabaseKind = "d1" | "postgres";

// Database drivers validate supported scalar values at execution time. Keeping
// the public contract broad preserves the existing D1 call sites, some of
// which narrow values only after request validation.
export type DatabaseValue = unknown;

export type DatabaseRunMeta = {
  changes: number;
  duration?: number;
  last_row_id?: number;
};

export type DatabaseResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  results: T[];
  success: boolean;
  meta: DatabaseRunMeta;
};

export interface PortablePreparedStatement {
  readonly sql: string;
  readonly values: readonly DatabaseValue[];
  bind(...values: DatabaseValue[]): PortablePreparedStatement;
  all<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<
    DatabaseResult<T>
  >;
  first<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(): Promise<T | null>;
  run<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<
    DatabaseResult<T>
  >;
}

export interface PortableDatabase {
  readonly kind: DatabaseKind;
  prepare(sql: string): PortablePreparedStatement;
  batch<T extends Record<string, unknown> = Record<string, unknown>>(
    statements: PortablePreparedStatement[],
  ): Promise<DatabaseResult<T>[]>;
}
