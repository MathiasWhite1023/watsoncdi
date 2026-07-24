import { createHash } from "node:crypto";
import {
  getRuntimeDatabase,
  type PortableDatabase,
} from "../../../../../db/runtime";
import {
  identityFromRequest,
  type RequestIdentity,
} from "../../../../../lib/auth/session";
import { rejectInvalidMutationOrigin } from "../../../../../lib/auth/csrf";
import {
  documentObjectKey,
  getObjectStore,
} from "../../../../../lib/storage/object-store";
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
const allowedMimeTypes: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  txt: new Set(["text/plain"]),
  md: new Set(["text/markdown", "text/plain"]),
  markdown: new Set(["text/markdown", "text/plain"]),
};
const maxFileBytes = 15 * 1024 * 1024;
const maxMultipartBytes = 18 * 1024 * 1024;
const maxExtractedCharacters = 250_000;
const maxDocumentsPerUser = 100;
const maxStoredBytesPerUser = 250 * 1024 * 1024;

function signatureMatches(extension: string, bytes: Uint8Array) {
  if (extension === "pdf") {
    return new TextDecoder("ascii")
      .decode(bytes.slice(0, 1024))
      .includes("%PDF-");
  }
  if (extension === "docx") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    );
  }
  return !bytes.slice(0, 4096).includes(0);
}

type AuthorizationResult =
  | {
      db: PortableDatabase;
      identity: RequestIdentity;
      error?: never;
    }
  | { error: Response; db?: never; identity?: never };

async function authorize(
  request: Request,
  id: string,
  locale: ResponseLocale,
): Promise<AuthorizationResult> {
  const identity = await identityFromRequest(request);
  if (!identity) {
    return {
      error: localizedApiError(locale, "AUTH_REQUIRED", 401, {
        en: "Authentication is required.",
        pt: "Autenticação necessária.",
      }),
    };
  }
  const db = await getRuntimeDatabase();
  const account = await db
    .prepare(
      "SELECT id FROM discoveries WHERE id = ? AND visibility = 'private' AND owner_subject = ?",
    )
    .bind(id, identity.subject)
    .first();
  if (!account) {
    return {
      error: localizedApiError(locale, "ACCOUNT_NOT_FOUND", 404, {
        en: "The account was not found or you are not authorized to access it.",
        pt: "Conta não encontrada ou acesso não autorizado.",
      }),
    };
  }
  return { db, identity };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const invalidOrigin = rejectInvalidMutationOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxMultipartBytes) {
    return localizedApiError(locale, "REQUEST_TOO_LARGE", 413, {
      en: "The upload request exceeds the pilot limit.",
      pt: "A requisição de upload excede o limite do piloto.",
    });
  }
  const { id } = await context.params;
  const auth = await authorize(request, id, locale);
  if (auth.error) return auth.error;
  const { db, identity } = auth;

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
  if (file.size > maxFileBytes) {
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
  const normalizedMime = file.type.trim().toLowerCase();
  if (
    normalizedMime &&
    !allowedMimeTypes[extension]?.has(normalizedMime)
  ) {
    return localizedApiError(locale, "DOCUMENT_MIME_MISMATCH", 415, {
      en: "The document content type does not match its extension.",
      pt: "O tipo de conteúdo do documento não corresponde à extensão.",
    });
  }
  const documentName = file.name.trim().slice(0, 255) || `document.${extension}`;
  let store: Awaited<ReturnType<typeof getObjectStore>>;
  try {
    store = await getObjectStore();
  } catch {
    return localizedApiError(locale, "DOCUMENT_STORAGE_NOT_CONFIGURED", 503, {
      en: "Document storage has not been configured.",
      pt: "Armazenamento de documentos não configurado.",
    });
  }

  const original = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(extension, original)) {
    return localizedApiError(locale, "DOCUMENT_SIGNATURE_MISMATCH", 415, {
      en: "The file signature does not match the selected document type.",
      pt: "A assinatura do arquivo não corresponde ao tipo de documento.",
    });
  }
  const sha = createHash("sha256").update(original).digest("hex");
  const existingDocument = await db
    .prepare(
      "SELECT id FROM documents WHERE discovery_id = ? AND sha256 = ? LIMIT 1",
    )
    .bind(id, sha)
    .first();
  if (existingDocument) {
    return localizedApiError(locale, "DOCUMENT_ALREADY_EXISTS", 409, {
      en: "This document is already stored in the account.",
      pt: "Este documento já está armazenado na conta.",
    });
  }
  const usage = await db
    .prepare(
      "SELECT COUNT(d.id) AS document_count, COALESCE(SUM(d.size_bytes), 0) AS total_bytes, SUM(CASE WHEN d.created_at >= ? THEN 1 ELSE 0 END) AS recent_count FROM documents d INNER JOIN discoveries a ON a.id = d.discovery_id WHERE a.visibility = 'private' AND a.owner_subject = ?",
    )
    .bind(new Date(Date.now() - 3600_000).toISOString(), identity.subject)
    .first<{
      document_count: number | string;
      total_bytes: number | string;
      recent_count: number | string | null;
    }>();
  if (
    Number(usage?.document_count ?? 0) >= maxDocumentsPerUser ||
    Number(usage?.total_bytes ?? 0) + file.size > maxStoredBytesPerUser
  ) {
    return localizedApiError(locale, "DOCUMENT_STORAGE_QUOTA_REACHED", 429, {
      en: "This pilot workspace has reached its document storage quota.",
      pt: "Este workspace piloto atingiu a cota de armazenamento de documentos.",
    });
  }
  if (Number(usage?.recent_count ?? 0) >= 20) {
    return localizedApiError(locale, "DOCUMENT_UPLOAD_RATE_LIMITED", 429, {
      en: "Too many documents were uploaded recently. Try again in one hour.",
      pt: "Muitos documentos foram enviados recentemente. Tente novamente em uma hora.",
    });
  }
  const documentId = `doc-${crypto.randomUUID()}`;
  const key = documentObjectKey({
    subject: identity.subject,
    accountId: id,
    documentId,
    filename: documentName,
    sha256: sha,
  });

  const extractedText = String(form.get("extractedText") || "")
    .trim()
    .slice(0, maxExtractedCharacters);
  const pageInput = String(form.get("pagesJson") || "[]");
  let pages: Array<{ page?: number; text?: string }> = [];
  try {
    const parsed = JSON.parse(pageInput);
    if (Array.isArray(parsed)) {
      let remaining = maxExtractedCharacters;
      pages = parsed.slice(0, 500).flatMap((page) => {
        if (!page || typeof page !== "object" || remaining <= 0) return [];
        const text = String((page as { text?: unknown }).text || "")
          .trim()
          .slice(0, remaining);
        remaining -= text.length;
        return text
          ? [
              {
                page: Math.max(
                  1,
                  Math.min(
                    100_000,
                    Number((page as { page?: unknown }).page || 1),
                  ),
                ),
                text,
              },
            ]
          : [];
      });
    }
  } catch {
    pages = [];
  }
  const indexedText =
    extractedText ||
    pages
      .map((page) => page.text || "")
      .join("\n")
      .slice(0, maxExtractedCharacters);
  const status = indexedText
    ? "processed"
    : extension === "pdf"
      ? "manual_summary_required"
      : "empty";
  const now = new Date().toISOString();
  const summary = indexedText
    ? indexedText.replace(/\s+/g, " ").slice(0, 320)
    : localizedText(
        locale,
        "Text could not be extracted. Add a manual summary to use this document in account memory.",
        "Não foi possível extrair texto. Adicione um resumo manual para usar este documento na memória.",
      );
  try {
    await store.put({
      key,
      body: original,
      contentType:
        file.type ||
        allowedMimeTypes[extension]?.values().next().value ||
        "application/octet-stream",
      metadata: {
        accountId: id,
        documentId,
        sha256: sha,
      },
    });
  } catch {
    return localizedApiError(locale, "DOCUMENT_UPLOAD_FAILED", 503, {
      en: "The document could not be stored. Try again.",
      pt: "Não foi possível armazenar o documento. Tente novamente.",
    });
  }
  const statements = [
    db
      .prepare(
        "INSERT INTO documents (id, discovery_id, name, content_type, size_bytes, r2_key, status, summary, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        documentId,
        id,
        documentName,
        file.type || extension,
        file.size,
        key,
        status,
        summary,
        sha,
        now,
      ),
  ];
  const sourcePages = pages.length ? pages : [{ page: 1, text: indexedText }];
  let ordinal = 0;
  for (const page of sourcePages) {
    const text = String(page.text || "").trim();
    for (let offset = 0; offset < text.length; offset += 1400) {
      const chunk = text.slice(offset, offset + 1400).trim();
      if (!chunk) continue;
      statements.push(
        db
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
          ),
      );
      ordinal += 1;
    }
  }
  statements.push(
    db
      .prepare(
        "INSERT INTO account_events (id, discovery_id, type, title, content, source_type, source_id, evidence_status, confidence, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `evt-${documentId}`,
        id,
        "document",
        `${localizedText(locale, "Document", "Documento")}: ${documentName}`,
        summary,
        "document",
        documentId,
        indexedText ? "confirmed" : "gap",
        indexedText ? 82 : 60,
        now,
        now,
      ),
  );
  try {
    await db.batch(statements);
    await recomputeAccount(db, id, { responseLocale: locale });
  } catch {
    await store.delete(key).catch(() => undefined);
    return localizedApiError(locale, "DOCUMENT_PERSISTENCE_FAILED", 503, {
      en: "The document was not saved. The uploaded object was removed.",
      pt: "O documento não foi salvo. O objeto enviado foi removido.",
    });
  }
  return localizedJson(
    locale,
    {
      ok: true,
      document: { id: documentId, name: documentName, status, summary },
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const invalidOrigin = rejectInvalidMutationOrigin(request);
  if (invalidOrigin) return invalidOrigin;
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
  let store: Awaited<ReturnType<typeof getObjectStore>>;
  try {
    store = await getObjectStore();
  } catch {
    return localizedApiError(locale, "DOCUMENT_STORAGE_NOT_CONFIGURED", 503, {
      en: "Document storage has not been configured.",
      pt: "Armazenamento de documentos não configurado.",
    });
  }
  try {
    await store.delete(row.r2_key);
  } catch {
    return localizedApiError(locale, "DOCUMENT_DELETE_FAILED", 503, {
      en: "The stored object could not be removed. No metadata was changed.",
      pt: "Não foi possível remover o objeto armazenado. Nenhum metadado foi alterado.",
    });
  }
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
