import {
  parseLocalizedJsonObject,
  resolveResponseLocale,
} from "../../../lib/api-locale";
import { POST as mutateAccount } from "../discoveries/route";

export const dynamic = "force-dynamic";

const proxy = (request: Request, force: boolean) =>
  mutateAccount(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ scope: "private", action: "briefing", force }),
    }),
  );

export async function GET(request: Request) {
  return proxy(request, false);
}

export async function POST(request: Request) {
  const parsed = await parseLocalizedJsonObject(
    request,
    resolveResponseLocale(request),
  );
  if (!parsed.ok) return parsed.response;
  return proxy(request, Boolean(parsed.value.force));
}
