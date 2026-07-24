import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "../../db/postgres/client";
import {
  SESSION_COOKIE,
  sessionMaxAgeSeconds,
  type AppIdIdentity,
} from "./app-id";

export type RequestIdentity = {
  userId: string;
  subject: string;
  provider: string;
  email: string;
  displayName: string;
};

const nowIso = () => new Date().toISOString();
const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0) continue;
    const key = segment.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(segment.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function subjectHash(subject: string): string {
  return sha256(subject).slice(0, 32);
}

export async function createApplicationSession(
  identity: AppIdIdentity,
): Promise<{ token: string; expiresAt: Date }> {
  const now = nowIso();
  const userId = `usr-${sha256(`${identity.provider}:${identity.subject}`).slice(
    0,
    24,
  )}`;
  const identityId = `idn-${sha256(
    `${identity.provider}:${identity.subject}`,
  ).slice(0, 24)}`;
  const token = randomBytes(32).toString("base64url");
  const sessionId = `ses-${randomBytes(18).toString("base64url")}`;
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);

  await query(
    `INSERT INTO users (id, email, display_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           updated_at = EXCLUDED.updated_at`,
    [userId, identity.email, identity.displayName, now],
  );
  await query(
    `INSERT INTO user_identities
       (id, user_id, provider, subject, email, email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (provider, subject) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           email = EXCLUDED.email,
           email_verified = EXCLUDED.email_verified,
           updated_at = EXCLUDED.updated_at`,
    [
      identityId,
      userId,
      identity.provider,
      identity.subject,
      identity.email,
      identity.emailVerified ? 1 : 0,
      now,
    ],
  );
  await query(
    `INSERT INTO auth_sessions
       (id, user_id, provider, subject, token_hash, expires_at, last_seen_at, revoked_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $7)`,
    [
      sessionId,
      userId,
      identity.provider,
      identity.subject,
      tokenHash,
      expiresAt.toISOString(),
      now,
    ],
  );
  await query(
    `DELETE FROM auth_sessions
      WHERE expires_at <= $1
         OR (revoked_at IS NOT NULL AND revoked_at < $2)`,
    [now, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()],
  );

  return { token, expiresAt };
}

async function identityForToken(token: string): Promise<RequestIdentity | null> {
  const result = await query<{
    user_id: string;
    subject: string;
    provider: string;
    email: string;
    display_name: string;
  }>(
    `SELECT s.user_id, s.subject, s.provider, u.email, u.display_name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > $2
      LIMIT 1`,
    [sha256(token), nowIso()],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    subject: row.subject,
    provider: row.provider,
    email: row.email,
    displayName: row.display_name || row.email,
  };
}

function sitesCompatibilityIdentity(requestHeaders: Headers): RequestIdentity | null {
  if (process.env.SITES_AUTH_COMPATIBILITY !== "true") return null;
  const email = requestHeaders
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (!email) return null;
  const displayName =
    requestHeaders.get("oai-authenticated-user-full-name")?.trim() || email;
  return {
    userId: `sites-${sha256(email).slice(0, 24)}`,
    subject: `chatgpt:${sha256(email)}`,
    provider: "openai-sites",
    email,
    displayName,
  };
}

export async function identityFromHeaders(
  requestHeaders: Headers,
): Promise<RequestIdentity | null> {
  const token = cookieValue(requestHeaders.get("cookie"), SESSION_COOKIE);
  if (token) {
    const identity = await identityForToken(token);
    if (identity) return identity;
  }
  return sitesCompatibilityIdentity(requestHeaders);
}

export async function identityFromRequest(
  request: Request,
): Promise<RequestIdentity | null> {
  return identityFromHeaders(request.headers);
}

export async function requireRequestIdentity(
  request: Request,
): Promise<RequestIdentity> {
  const identity = await identityFromRequest(request);
  if (!identity) throw new Error("AUTH_REQUIRED");
  return identity;
}

export async function currentIdentity(): Promise<RequestIdentity | null> {
  const requestHeaders = new Headers();
  const serverHeaders = await headers();
  for (const [key, value] of serverHeaders.entries()) {
    requestHeaders.set(key, value);
  }
  return identityFromHeaders(requestHeaders);
}

export async function requireCurrentIdentity(
  returnTo = "/workspace",
): Promise<RequestIdentity> {
  const identity = await currentIdentity();
  if (identity) return identity;
  redirect(`/auth/login?return_to=${encodeURIComponent(returnTo)}`);
}

export async function revokeSession(request: Request): Promise<void> {
  const token = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return;
  await query(
    `UPDATE auth_sessions
        SET revoked_at = $2
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [sha256(token), nowIso()],
  );
}

export async function renewApplicationSession(
  request: Request,
): Promise<{ token: string; expiresAt: Date } | null> {
  const currentToken = cookieValue(
    request.headers.get("cookie"),
    SESSION_COOKIE,
  );
  if (!currentToken) return null;
  const nextToken = randomBytes(32).toString("base64url");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  const result = await query<{ id: string }>(
    `UPDATE auth_sessions
        SET token_hash = $1,
            expires_at = $2,
            last_seen_at = $4
      WHERE token_hash = $3
        AND revoked_at IS NULL
        AND expires_at > $4
      RETURNING id`,
    [sha256(nextToken), expiresAt.toISOString(), sha256(currentToken), now],
  );
  if (!result.rowCount) return null;
  return { token: nextToken, expiresAt };
}
