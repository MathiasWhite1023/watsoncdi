export type RetrievalSource = {
  id: string;
  accountId: string;
  kind: string;
  title: string;
  content: string;
  sourceId: string;
  page: number | null;
  occurredAt: string;
  confidence: number;
};

export type RankedSource = RetrievalSource & {
  score: number;
  semanticScore: number;
  keywordScore: number;
  recencyScore: number;
};

type EmbeddingRow = { source_id: string; vector_json: string };

const safeJson = <T,>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const tokens = (value: string) =>
  Array.from(
    new Set(
      normalize(value)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2),
    ),
  );

const cosine = (a: number[], b: number[]) => {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
};

const sourceFromRow = (accountId: string, row: Record<string, unknown>): RetrievalSource => ({
  id: String(row.id),
  accountId,
  kind: String(row.kind),
  title: String(row.title),
  content: String(row.content),
  sourceId: String(row.source_id || row.id),
  page: row.page == null ? null : Number(row.page),
  occurredAt: String(row.occurred_at),
  confidence: Number(row.confidence || 70),
});

export async function collectAccountSources(
  db: D1Database,
  accountId: string,
  documentLimit = 60,
): Promise<RetrievalSource[]> {
  const [events, chunks, stakeholders, hypotheses, actions, plan] = await Promise.all([
    db
      .prepare(
        "SELECT id, type AS kind, title, content, COALESCE(source_id, id) AS source_id, NULL AS page, occurred_at, confidence FROM account_events WHERE discovery_id = ? ORDER BY occurred_at DESC LIMIT 120",
      )
      .bind(accountId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT id, 'document' AS kind, ('Documento' || CASE WHEN page IS NOT NULL THEN ' · pág. ' || page ELSE '' END) AS title, content, document_id AS source_id, page, created_at AS occurred_at, 82 AS confidence FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY ordinal ASC) AS document_rank FROM document_chunks WHERE discovery_id = ?) WHERE document_rank <= ? ORDER BY created_at DESC, ordinal ASC LIMIT 300",
      )
      .bind(accountId, documentLimit)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT id, 'stakeholder' AS kind, (name || ' · ' || role) AS title, (notes || ' Prioridades: ' || priorities_json || ' Área: ' || area || ' Influência: ' || influence || ' Postura: ' || stance) AS content, id AS source_id, NULL AS page, updated_at AS occurred_at, CASE WHEN source = 'manual' THEN 90 ELSE 55 END AS confidence FROM stakeholders WHERE discovery_id = ? ORDER BY updated_at DESC",
      )
      .bind(accountId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT id, 'hypothesis' AS kind, title, (problem || ' Próximo passo: ' || next_step || ' Lacunas: ' || gaps_json) AS content, id AS source_id, NULL AS page, updated_at AS occurred_at, confidence FROM opportunity_hypotheses WHERE discovery_id = ? ORDER BY confidence DESC",
      )
      .bind(accountId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT id, 'action' AS kind, title, (rationale || ' Próximo passo: ' || next_step) AS content, id AS source_id, NULL AS page, updated_at AS occurred_at, confidence FROM account_actions WHERE discovery_id = ? ORDER BY priority_score DESC LIMIT 30",
      )
      .bind(accountId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT discovery_id AS id, 'account_plan' AS kind, 'Account Plan' AS title, (priorities_json || ' ' || initiatives_json || ' ' || objectives_json || ' ' || risks_json || ' ' || ecosystem_json || ' ' || relationship_json || ' ' || plan_30_json || ' ' || plan_60_json || ' ' || plan_90_json) AS content, discovery_id AS source_id, NULL AS page, updated_at AS occurred_at, 88 AS confidence FROM account_plans WHERE discovery_id = ?",
      )
      .bind(accountId)
      .all<Record<string, unknown>>(),
  ]);

  return [
    ...events.results,
    ...chunks.results,
    ...stakeholders.results,
    ...hypotheses.results,
    ...actions.results,
    ...plan.results,
  ].map((row) => sourceFromRow(accountId, row));
}

export async function retrieveAccountSources(
  db: D1Database,
  accountId: string,
  query: string,
  queryVector?: number[] | null,
  limit = 12,
): Promise<RankedSource[]> {
  const sources = await collectAccountSources(db, accountId);
  const queryTokens = tokens(query);
  const vectors = queryVector?.length
    ? await db
        .prepare(
          "SELECT source_id, vector_json FROM account_embeddings WHERE discovery_id = ? AND dimensions = ?",
        )
        .bind(accountId, queryVector.length)
        .all<EmbeddingRow>()
    : { results: [] as EmbeddingRow[] };
  const vectorMap = new Map(
    vectors.results.map((row) => [row.source_id, safeJson<number[]>(row.vector_json, [])]),
  );
  const now = Date.now();

  return sources
    .map((source) => {
      const haystack = normalize(`${source.title} ${source.content}`);
      const hits = queryTokens.filter((token) => haystack.includes(token)).length;
      const keywordScore = queryTokens.length ? hits / queryTokens.length : 0;
      const ageDays = Math.max(0, (now - new Date(source.occurredAt).getTime()) / 86_400_000);
      const recencyScore = Math.max(0, 1 - ageDays / 365);
      const semanticScore = queryVector?.length
        ? Math.max(0, cosine(queryVector, vectorMap.get(source.id) || []))
        : 0;
      const confidenceScore = source.confidence / 100;
      const score =
        semanticScore * 0.5 + keywordScore * 0.27 + recencyScore * 0.13 + confidenceScore * 0.1;
      return { ...source, score, semanticScore, keywordScore, recencyScore };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function evidenceFingerprint(sources: RetrievalSource[]) {
  const payload = sources
    .map((source) => `${source.id}:${source.occurredAt}:${source.content.length}`)
    .sort()
    .join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function persistEmbeddings(
  db: D1Database,
  accountId: string,
  sources: RetrievalSource[],
  vectors: number[][],
  model: string,
) {
  const now = new Date().toISOString();
  const statements = sources
    .slice(0, vectors.length)
    .filter((_, index) => vectors[index]?.length)
    .map((source, index) =>
      db
        .prepare(
          "INSERT OR REPLACE INTO account_embeddings (id, discovery_id, source_type, source_id, chunk_ordinal, content_hash, model, dimensions, vector_json, content_preview, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `emb-${accountId}-${source.id}`,
          accountId,
          source.kind,
          source.id,
          0,
          `${source.content.length}:${source.occurredAt}`,
          model,
          vectors[index].length,
          JSON.stringify(vectors[index]),
          source.content.slice(0, 240),
          now,
          now,
        ),
    );
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}
