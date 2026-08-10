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
    stakeholders?: Array<{ discoveryId?: string }>;
    relationships?: unknown[];
    graphLayouts?: unknown[];
    stakeholderCapabilityAssignments?: Array<{ discoveryId?: string }>;
    relationshipCapabilityCoverage?: Array<{
      discoveryId?: string;
      catalogVersion?: string;
      capabilities?: unknown[];
    }>;
  };
  const coverage = payload.relationshipCapabilityCoverage?.find(
    (item) => item.discoveryId === id,
  );
  return localizedJson(locale, {
    discoveryId: id,
    stakeholders: (payload.stakeholders || []).filter(
      (item) => item.discoveryId === id,
    ),
    relationships: payload.relationships || [],
    graphLayouts: payload.graphLayouts || [],
    capabilityAssignments: (
      payload.stakeholderCapabilityAssignments || []
    ).filter((item) => item.discoveryId === id),
    capabilityCoverage: coverage || {
      discoveryId: id,
      catalogVersion: null,
      capabilities: [],
    },
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
  const requestedAction = String(parsed.value.action || "relationship");
  const action = [
    "relationship",
    "stakeholder_upsert",
    "stakeholder_delete",
  ].includes(requestedAction)
    ? requestedAction
    : "relationship";
  return mutateAccount(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        ...parsed.value,
        id,
        scope: "private",
        action,
      }),
    }),
  );
}
