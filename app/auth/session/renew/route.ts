import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  authCookieOptions,
  sessionMaxAgeSeconds,
} from "../../../../lib/auth/app-id";
import { rejectInvalidMutationOrigin } from "../../../../lib/auth/csrf";
import { renewApplicationSession } from "../../../../lib/auth/session";
import { logEvent } from "../../../../lib/structured-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const invalidOrigin = rejectInvalidMutationOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  try {
    const session = await renewApplicationSession(request);
    if (!session) {
      return Response.json(
        { errorCode: "AUTH_REQUIRED", error: "Authentication is required." },
        { status: 401 },
      );
    }
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...authCookieOptions,
      maxAge: sessionMaxAgeSeconds,
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    logEvent("warn", "auth.session.renew_failed", {
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
    return Response.json(
      {
        errorCode: "SESSION_RENEWAL_FAILED",
        error: "The session could not be renewed.",
      },
      { status: 503 },
    );
  }
}
