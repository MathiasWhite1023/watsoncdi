import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { appIdRuntimeConfig } from "../ibm-cloud-bindings";

export const AUTH_TRANSACTION_COOKIE = "watson_cdi_auth_tx";
export const SESSION_COOKIE = "watson_cdi_session";

const AUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
  end_session_endpoint?: string;
};

type AuthTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  issuedAt: number;
};

export type AppIdIdentity = {
  provider: "ibm-app-id";
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
};

let discoveryCache:
  | { expiresAt: number; value: Promise<OidcDiscovery> }
  | undefined;

const base64Url = (value: Uint8Array | Buffer | string) =>
  Buffer.from(value).toString("base64url");

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

function appBaseUrl(): string {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) throw new Error("APP_BASE_URL is not configured.");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
  }
  return url.origin;
}

function config() {
  const runtime = appIdRuntimeConfig();
  if (!runtime.discoveryUrl || !runtime.clientId || !runtime.clientSecret) {
    throw new Error("IBM App ID is not fully configured.");
  }
  return {
    discoveryUrl: runtime.discoveryUrl,
    clientId: runtime.clientId,
    clientSecret: runtime.clientSecret,
  };
}

async function oidcDiscovery(): Promise<OidcDiscovery> {
  if (discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.value;
  }
  const { discoveryUrl } = config();
  const value = (async () => {
    const response = await fetch(discoveryUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`IBM App ID discovery failed (${response.status}).`);
    }
    const payload = (await response.json()) as Partial<OidcDiscovery>;
    if (
      !payload.authorization_endpoint ||
      !payload.token_endpoint ||
      !payload.jwks_uri ||
      !payload.issuer
    ) {
      throw new Error("IBM App ID discovery response is incomplete.");
    }
    return payload as OidcDiscovery;
  })();
  discoveryCache = { expiresAt: Date.now() + 5 * 60 * 1000, value };
  return value;
}

function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/workspace";
  }
  try {
    const parsed = new URL(value, "https://watson-cdi.local");
    if (parsed.origin !== "https://watson-cdi.local") return "/workspace";
    if (parsed.pathname.startsWith("/auth/")) return "/workspace";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/workspace";
  }
}

function sign(value: string): string {
  return base64Url(
    createHmac("sha256", sessionSecret()).update(value).digest(),
  );
}

export function encodeAuthTransaction(transaction: AuthTransaction): string {
  const payload = base64Url(JSON.stringify(transaction));
  return `${payload}.${sign(payload)}`;
}

export function decodeAuthTransaction(
  cookie: string | null | undefined,
): AuthTransaction | null {
  if (!cookie) return null;
  const [payload, signature, extra] = cookie.split(".");
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return null;
  }
  try {
    const transaction = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AuthTransaction;
    if (
      !transaction.state ||
      !transaction.nonce ||
      !transaction.codeVerifier ||
      Date.now() - transaction.issuedAt > AUTH_TRANSACTION_TTL_MS
    ) {
      return null;
    }
    return { ...transaction, returnTo: safeReturnTo(transaction.returnTo) };
  } catch {
    return null;
  }
}

export async function beginAuthorization(returnTo?: string | null) {
  const discovery = await oidcDiscovery();
  const { clientId } = config();
  const transaction: AuthTransaction = {
    state: base64Url(randomBytes(32)),
    nonce: base64Url(randomBytes(32)),
    codeVerifier: base64Url(randomBytes(64)),
    returnTo: safeReturnTo(returnTo),
    issuedAt: Date.now(),
  };
  const codeChallenge = base64Url(
    createHash("sha256").update(transaction.codeVerifier).digest(),
  );
  const redirectUri = `${appBaseUrl()}/auth/callback`;
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return {
    url,
    transactionCookie: encodeAuthTransaction(transaction),
    maxAge: Math.floor(AUTH_TRANSACTION_TTL_MS / 1000),
  };
}

function claimString(payload: JWTPayload, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function completeAuthorization(input: {
  code: string;
  state: string;
  transactionCookie?: string | null;
}): Promise<{ identity: AppIdIdentity; returnTo: string }> {
  const transaction = decodeAuthTransaction(input.transactionCookie);
  if (!transaction || input.state !== transaction.state) {
    throw new Error("The authentication transaction is invalid or expired.");
  }
  const discovery = await oidcDiscovery();
  const { clientId, clientSecret } = config();
  const redirectUri = `${appBaseUrl()}/auth/callback`;
  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: transaction.codeVerifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`IBM App ID token exchange failed (${response.status}).`);
  }
  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("IBM App ID did not return an ID token.");
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const verified = await jwtVerify(tokens.id_token, jwks, {
    issuer: discovery.issuer,
    audience: clientId,
  });
  if (claimString(verified.payload, "nonce") !== transaction.nonce) {
    throw new Error("IBM App ID returned an ID token with an invalid nonce.");
  }
  const subject = claimString(verified.payload, "sub");
  const email =
    claimString(verified.payload, "email").toLowerCase() ||
    claimString(verified.payload, "preferred_username").toLowerCase();
  const emailVerified =
    verified.payload.email_verified === true ||
    verified.payload.email_verified === "true";
  if (!subject || !email) {
    throw new Error("IBM App ID identity is missing subject or email.");
  }
  if (!emailVerified) {
    throw new Error("IBM App ID email verification is required.");
  }
  const displayName =
    claimString(verified.payload, "name") ||
    claimString(verified.payload, "given_name") ||
    email;
  return {
    identity: {
      provider: "ibm-app-id",
      subject,
      email,
      emailVerified,
      displayName,
    },
    returnTo: transaction.returnTo,
  };
}

export async function logoutRedirect(): Promise<URL> {
  const fallback = new URL("/", appBaseUrl());
  try {
    const endpoint = (await oidcDiscovery()).end_session_endpoint;
    if (!endpoint) return fallback;
    const url = new URL(endpoint);
    url.searchParams.set("post_logout_redirect_uri", fallback.toString());
    return url;
  } catch {
    return fallback;
  }
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const sessionMaxAgeSeconds = SESSION_TTL_SECONDS;
