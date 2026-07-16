import {
  GET as getAccounts,
  POST as mutateAccount,
} from "../../../discoveries/route";
import {
  localizedJson,
  parseLocalizedJsonObject,
  resolveResponseLocale,
} from "../../../../../lib/api-locale";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  url.searchParams.set("scope", "private");
  url.searchParams.set("accountId", id);
  const response = await getAccounts(new Request(url, request));
  if (!response.ok) return response;
  const payload = (await response.json()) as {
    relationships?: unknown[];
    graphLayouts?: unknown[];
  };
  return localizedJson(locale, {
    relationships: payload.relationships || [],
    graphLayouts: payload.graphLayouts || [],
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const { id } = await context.params;
  const parsed = await parseLocalizedJsonObject(request, locale);
  if (!parsed.ok) return parsed.response;
  return mutateAccount(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ...parsed.value,
        id,
        scope: "private",
        action: "relationship",
      }),
    }),
  );
}
