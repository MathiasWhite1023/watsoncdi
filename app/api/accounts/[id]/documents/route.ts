import { env } from "cloudflare:workers";
import { recomputeAccount } from "../../../discoveries/route";

export const dynamic = "force-dynamic";

const allowedExtensions = new Set(["pdf", "docx", "txt", "md", "markdown"]);
const safeName = (name: string) => name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);

async function authorize(request: Request, id: string) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return { error: Response.json({ error: "Autenticação necessária." }, { status: 401 }) };
  const runtime = env as unknown as Record<string, unknown>;
  const allowlist = String(runtime.PRIVATE_ALLOWED_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(email)) return { error: Response.json({ error: "E-mail não autorizado." }, { status: 403 }) };
  const db = (env as unknown as { DB: D1Database }).DB;
  const account = await db.prepare("SELECT id FROM discoveries WHERE id = ? AND visibility = 'private' AND owner_email = ?").bind(id, email).first();
  if (!account) return { error: Response.json({ error: "Conta não encontrada ou acesso não autorizado." }, { status: 404 }) };
  return { db, email };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const auth = await authorize(request, id); if (auth.error) return auth.error; const { db } = auth;
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Arquivo obrigatório." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "O arquivo excede 15 MB." }, { status: 413 });
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedExtensions.has(extension)) return Response.json({ error: "Use PDF, DOCX, TXT ou Markdown." }, { status: 415 });
  const original = new Uint8Array(await file.arrayBuffer()); const digest = await crypto.subtle.digest("SHA-256", original); const sha = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const documentId = `doc-${Date.now()}-${sha.slice(0, 8)}`; const key = `accounts/${id}/${documentId}/${safeName(file.name)}`; const bucket = (env as unknown as { FILES: R2Bucket }).FILES;
  if (!bucket) return Response.json({ error: "Armazenamento de documentos não configurado." }, { status: 503 });
  await bucket.put(key, original, { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { accountId: id, originalName: file.name } });
  const extractedText = String(form.get("extractedText") || "").trim().slice(0, 250000); const pageInput = String(form.get("pagesJson") || "[]"); let pages: Array<{ page?: number; text?: string }> = [];
  try { pages = JSON.parse(pageInput); } catch { pages = []; }
  const status = extractedText ? "processed" : extension === "pdf" ? "manual_summary_required" : "empty"; const now = new Date().toISOString(); const summary = extractedText ? extractedText.replace(/\s+/g, " ").slice(0, 320) : "Não foi possível extrair texto. Adicione um resumo manual para usar este documento na memória.";
  await db.prepare("INSERT INTO documents (id, discovery_id, name, content_type, size_bytes, r2_key, status, summary, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(documentId, id, file.name, file.type || extension, file.size, key, status, summary, sha, now).run();
  const sourcePages = pages.length ? pages : [{ page: 1, text: extractedText }]; let ordinal = 0;
  for (const page of sourcePages) { const text = String(page.text || "").trim(); for (let offset = 0; offset < text.length; offset += 1400) { const chunk = text.slice(offset, offset + 1400).trim(); if (!chunk) continue; await db.prepare("INSERT INTO document_chunks (id, document_id, discovery_id, ordinal, content, page, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`${documentId}-${ordinal}`, documentId, id, ordinal, chunk, Number(page.page || 1), now).run(); ordinal += 1; } }
  await db.prepare("INSERT INTO account_events (id, discovery_id, type, title, content, source_type, source_id, evidence_status, confidence, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`evt-${documentId}`, id, "document", `Documento: ${file.name}`, summary, "document", documentId, extractedText ? "confirmed" : "gap", extractedText ? 82 : 60, now, now).run();
  await recomputeAccount(db, id); return Response.json({ ok: true, document: { id: documentId, name: file.name, status, summary } }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const auth = await authorize(request, id); if (auth.error) return auth.error; const { db } = auth; const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) return Response.json({ error: "documentId obrigatório." }, { status: 400 }); const row = await db.prepare("SELECT r2_key FROM documents WHERE id = ? AND discovery_id = ?").bind(documentId, id).first<{ r2_key: string }>(); if (!row) return Response.json({ error: "Documento não encontrado." }, { status: 404 });
  const bucket = (env as unknown as { FILES: R2Bucket }).FILES; await bucket.delete(row.r2_key); await db.batch([db.prepare("DELETE FROM account_embeddings WHERE discovery_id = ? AND source_type = 'document' AND source_id LIKE ?").bind(id, `${documentId}-%`), db.prepare("DELETE FROM document_chunks WHERE document_id = ? AND discovery_id = ?").bind(documentId, id), db.prepare("DELETE FROM documents WHERE id = ? AND discovery_id = ?").bind(documentId, id), db.prepare("DELETE FROM account_events WHERE source_type = 'document' AND source_id = ? AND discovery_id = ?").bind(documentId, id)]); await recomputeAccount(db, id); return Response.json({ ok: true });
}
