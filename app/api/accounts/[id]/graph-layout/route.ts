import {
  parseLocalizedJsonObject,
  resolveResponseLocale,
} from "../../../../../lib/api-locale";
import { POST as mutateAccount } from "../../../discoveries/route";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = await parseLocalizedJsonObject(
    request,
    resolveResponseLocale(request),
  );
  if (!parsed.ok) return parsed.response;
  return mutateAccount(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ...parsed.value,
        id,
        scope: "private",
        action: "graph_layout",
      }),
    }),
  );
}
