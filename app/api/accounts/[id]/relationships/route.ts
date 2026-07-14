import { GET as getAccounts, POST as mutateAccount } from "../../../discoveries/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  url.searchParams.set("scope", "private");
  url.searchParams.set("accountId", id);
  const response = await getAccounts(new Request(url, request));
  if (!response.ok) return response;
  const payload = (await response.json()) as { relationships?: unknown[]; graphLayouts?: unknown[] };
  return Response.json({ relationships: payload.relationships || [], graphLayouts: payload.graphLayouts || [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  return mutateAccount(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ ...body, id, scope: "private", action: "relationship" }),
    }),
  );
}
