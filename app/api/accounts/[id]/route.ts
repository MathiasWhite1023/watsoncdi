import { GET as getAccounts } from "../../discoveries/route";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  url.searchParams.set("scope", "private");
  url.searchParams.set("accountId", id);
  return getAccounts(new Request(url, request));
}
