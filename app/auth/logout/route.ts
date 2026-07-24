import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authCookieOptions,
  logoutRedirect,
} from "../../../lib/auth/app-id";
import { revokeSession } from "../../../lib/auth/session";
import { rejectInvalidMutationOrigin } from "../../../lib/auth/csrf";
import { logEvent } from "../../../lib/structured-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function logout(request: Request) {
  const invalidOrigin = rejectInvalidMutationOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  try {
    await revokeSession(request);
  } catch (error) {
    logEvent("warn", "auth.logout.revoke_failed", {
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
  }
  const response = NextResponse.redirect(await logoutRedirect());
  response.cookies.set(SESSION_COOKIE, "", {
    ...authCookieOptions,
    maxAge: 0,
  });
  return response;
}

export const POST = logout;
