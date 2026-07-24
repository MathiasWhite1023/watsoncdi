export function mutationOriginIsValid(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return true;
  }
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) return process.env.NODE_ENV !== "production";
  let expected: string;
  try {
    expected = new URL(configured).origin;
  } catch {
    return false;
  }
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === expected;
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  return process.env.NODE_ENV !== "production";
}

export function rejectInvalidMutationOrigin(request: Request): Response | null {
  if (mutationOriginIsValid(request)) return null;
  return Response.json(
    {
      errorCode: "INVALID_REQUEST_ORIGIN",
      error: "The request origin is not allowed.",
    },
    { status: 403 },
  );
}
