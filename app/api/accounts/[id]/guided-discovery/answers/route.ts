import { POST as mutateAccount } from "../../../../discoveries/route";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  return mutateAccount(new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ ...body, id, scope: "private", action: "guided_discovery_answer" }),
  }));
}
