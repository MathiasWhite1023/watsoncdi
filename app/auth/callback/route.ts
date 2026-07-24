import { NextResponse } from "next/server";
import {
  AUTH_TRANSACTION_COOKIE,
  SESSION_COOKIE,
  authCookieOptions,
  completeAuthorization,
  sessionMaxAgeSeconds,
} from "../../../lib/auth/app-id";
import { createApplicationSession } from "../../../lib/auth/session";
import { logEvent } from "../../../lib/structured-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const transactionCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_TRANSACTION_COOKIE}=`))
    ?.slice(AUTH_TRANSACTION_COOKIE.length + 1);
  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/error?code=callback", url));
  }
  try {
    const authorization = await completeAuthorization({
      code,
      state,
      transactionCookie: transactionCookie
        ? decodeURIComponent(transactionCookie)
        : null,
    });
    const session = await createApplicationSession(authorization.identity);
    const response = NextResponse.redirect(
      new URL(authorization.returnTo, url.origin),
    );
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...authCookieOptions,
      maxAge: sessionMaxAgeSeconds,
      expires: session.expiresAt,
    });
    response.cookies.set(AUTH_TRANSACTION_COOKIE, "", {
      ...authCookieOptions,
      maxAge: 0,
    });
    logEvent("info", "auth.login.completed", {
      provider: authorization.identity.provider,
    });
    return response;
  } catch (error) {
    logEvent("warn", "auth.login.callback_failed", {
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
    const response = NextResponse.redirect(
      new URL("/auth/error?code=callback", url),
    );
    response.cookies.set(AUTH_TRANSACTION_COOKIE, "", {
      ...authCookieOptions,
      maxAge: 0,
    });
    return response;
  }
}
