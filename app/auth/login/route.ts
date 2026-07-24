import { NextResponse } from "next/server";
import {
  AUTH_TRANSACTION_COOKIE,
  authCookieOptions,
  beginAuthorization,
} from "../../../lib/auth/app-id";
import { logEvent } from "../../../lib/structured-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const returnTo = new URL(request.url).searchParams.get("return_to");
    const authorization = await beginAuthorization(returnTo);
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set(
      AUTH_TRANSACTION_COOKIE,
      authorization.transactionCookie,
      {
        ...authCookieOptions,
        maxAge: authorization.maxAge,
      },
    );
    return response;
  } catch (error) {
    logEvent("error", "auth.login.start_failed", {
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
    return NextResponse.redirect(new URL("/auth/error?code=config", request.url));
  }
}
