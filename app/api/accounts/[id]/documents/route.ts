import { env } from "cloudflare:workers";
import {
  localizedApiError,
  localizedJson,
  localizedText,
  resolveResponseLocale,
  type ResponseLocale,
} from "../../../../../lib/api-locale";
import { recomputeAccount } from "../../../discoveries/route";

export const dynamic = "force-dynamic";

const allowedExtensions = new Set(["pdf", "docx", "txt", "md", "markdown"]);
const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 120);

type AuthorizationResult =
  | { db: D1Database; email: string; error?: never }
  | { error: Response; db?: never; email?: never };

async function authorize(
  request: Request,
  id: string,
  locale: ResponseLocale,
): Promise<AuthorizationResult> {
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (!email) {
    return {
      error: localizedApiError(locale, "AUTH_REQUIRED", 401, {
        en: "Authentication is required.",
        pt: "Autenticação necessária.",
      }),
    };
  }
  const runtime = env as unknown as Record<string, unknown>;
  const allowlist = String(runtime.PRIVATE_ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.length) {
    return {
      error: localizedApiError(
        locale,
        "WORKSPACE_ALLOWLIST_NOT_CONFIGURED",
        503,
        {
          en: "The private workspace allowlist has not been configured yet.",
          pt: "A allowlist do workspace privado ainda não foi configurada.",
        },
      ),
    };
  }
  if (!allowlist.includes(email)) {
    return {
      error: localizedApiError(locale, "WORKSPACE_EMAIL_NOT_ALLOWED", 403, {
        en: "This email is not authorized.",
        pt: "E-mail não autorizado.",
      }),
    };
  }
  const db = (env as unknown as { DB: D1Database }).DB;
  const account = await db
    .prepare(
      "SELECT id FROM discoveries WHERE id = ? AND visibility = 'private' AND owner_email = ?",
    )
    .bind(id, email)
    .first();
  if (!account) {
    return {
      error: localizedApiError(locale, "ACCOUNT_NOT_FOUND", 404, {
        en: "The account was not found or you are not authorized to access it.",
        pt: "Conta não encontrada ou acesso não autorizado.",
      }),
    };
  }
  return { db, email };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const { id } = await context.params;
  const auth = await authorize(request, id, locale);
  if (auth.error) return auth.error;
  const { db } = auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return localizedApiError(locale, "INVALID_FORM_DATA", 400, {
      en: "Send the document as valid multipart form data.",
      pt: "Envie o documento como multipart form data válido.",
    });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return localizedApiError(locale, "DOCUMENT_REQUIRED", 400, {
      en: "A document is required.",
      pt: "Arquivo obrigatório.",
    });
  }
  if (file.size > 15 * 1024 * 1024) {
    return localizedApiError(locale, "DOCUMENT_TOO_LARGE", 413, {
      en: "The document exceeds the 15 MB limit.",
      pt: "O arquivo excede 15 MB.",
    });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!allowedExtensions.has(extension)) {
    return localizedApiError(locale, "DOCUMENT_TYPE_NOT_SUPPORTED", 415, {
      en: "Use PDF, DOCX, TXT, or Markdown.",
      pt: "Use PDF, DOCX, TXT ou Markdown.",
    });
  }
  const bucket = (env as unknown as { FILES?: R2Bucket }).FILES;
  if (!bucket) {
    return localizedApiError(locale, "DOCUMENT_STORAGE_NOT_CONFIGURED", 503, {
      en: "Document storage has not been configured.",
      pt: "Armazenamento de documentos não configurado.",
    });
  }

  const original = new Uint8Array(await file.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", original);
  const sha = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const documentId = `doc-${Date.now()}-${sha.slice(0, 8)}`;
  const key = `accounts/${id}/${documentId}/${safeName(file.name)}`;
  await bucket.put(key, original, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { accountId: id, originalName: file.name },
  });

  const extractedText = String(form.get("extractedText") || "")
    .trim()
    .slice(0, 250000);
  const pageInput = String(form.get("pagesJson") || "[]");
  let pages: Array<{ page?: number; text?: string }> = [];
  try {
    pages = JSON.parse(pageInput);
  } catch {
    pages = [];
  }
  const status = extractedText
    ? "processed"
    : extension === "pdf"
      ? "manual_summary_required"
      : "empty";
  const now = new Date().toISOString();
  const summary = extractedText
    ? extractedText.replace(/\s+/g, " ").slice(0, 320)
    : localizedText(
        locale,
        "Text could not be extracted. Add a manual summary to use this document in account memory.",
        "Não foi possível extrair texto. Adicione um resumo manual para usar este documento na memória.",
      );
  await db
    .prepare(
      "INSERT INTO documents (id, discovery_id, name, content_type, size_bytes, r2_key, status, summary, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      documentId,
      id,
      file.name,
      file.type || extension,
      file.size,
      key,
      status,
      summary,
      sha,
      now,
    )
    .run();
  const sourcePages = pages.length ? pages : [{ page: 1, text: extractedText }];
  let ordinal = 0;
  for (const page of sourcePages) {
    const text = String(page.text || "").trim();
    for (let offset = 0; offset < text.length; offset += 1400) {
      const chunk = text.slice(offset, offset + 1400).trim();
      if (!chunk) continue;
      await db
        .prepare(
          "INSERT INTO document_chunks (id, document_id, discovery_id, ordinal, content, page, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `${documentId}-${ordinal}`,
          documentId,
          id,
          ordinal,
          chunk,
          Number(page.page || 1),
          now,
        )
        .run();
      ordinal += 1;
    }
  }
  await db
    .prepare(
      "INSERT INTO account_events (id, discovery_id, type, title, content, source_type, source_id, evidence_status, confidence, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `evt-${documentId}`,
      id,
      "document",
      `${localizedText(locale, "Document", "Documento")}: ${file.name}`,
      summary,
      "document",
      documentId,
      extractedText ? "confirmed" : "gap",
      extractedText ? 82 : 60,
      now,
      now,
    )
    .run();
  await recomputeAccount(db, id, { responseLocale: locale });
  return localizedJson(
    locale,
    {
      ok: true,
      document: { id: documentId, name: file.name, status, summary },
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const { id } = await context.params;
  const auth = await authorize(request, id, locale);
  if (auth.error) return auth.error;
  const { db } = auth;
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) {
    return localizedApiError(locale, "DOCUMENT_ID_REQUIRED", 400, {
      en: "documentId is required.",
      pt: "documentId obrigatório.",
    });
  }
  const row = await db
    .prepare("SELECT r2_key FROM documents WHERE id = ? AND discovery_id = ?")
    .bind(documentId, id)
    .first<{ r2_key: string }>();
  if (!row) {
    return localizedApiError(locale, "DOCUMENT_NOT_FOUND", 404, {
      en: "The document was not found.",
      pt: "Documento não encontrado.",
    });
  }
  const bucket = (env as unknown as { FILES?: R2Bucket }).FILES;
  if (!bucket) {
    return localizedApiError(locale, "DOCUMENT_STORAGE_NOT_CONFIGURED", 503, {
      en: "Document storage has not been configured.",
      pt: "Armazenamento de documentos não configurado.",
    });
  }
  await bucket.delete(row.r2_key);
  await db.batch([
    db
      .prepare(
        "DELETE FROM account_embeddings WHERE discovery_id = ? AND source_type = 'document' AND source_id LIKE ?",
      )
      .bind(id, `${documentId}-%`),
    db
      .prepare(
        "DELETE FROM document_chunks WHERE document_id = ? AND discovery_id = ?",
      )
      .bind(documentId, id),
    db
      .prepare("DELETE FROM documents WHERE id = ? AND discovery_id = ?")
      .bind(documentId, id),
    db
      .prepare(
        "DELETE FROM account_events WHERE source_type = 'document' AND source_id = ? AND discovery_id = ?",
      )
      .bind(documentId, id),
  ]);
  await recomputeAccount(db, id, { responseLocale: locale });
  return localizedJson(locale, { ok: true });
}
