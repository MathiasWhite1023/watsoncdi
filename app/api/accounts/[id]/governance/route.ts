import { GET as getAccounts } from "../../../discoveries/route";
import {
  localizedApiError,
  localizedJson,
  resolveResponseLocale,
} from "../../../../../lib/api-locale";

export const dynamic = "force-dynamic";

type ScopedRecord = {
  discoveryId?: string;
  answerId?: string | null;
  capabilityKey?: string;
  questionId?: string;
  trace?: Array<{ questionId?: string }>;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = resolveResponseLocale(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const answerId = url.searchParams.get("answerId");
  url.searchParams.set("scope", "private");
  url.searchParams.set("accountId", id);
  const response = await getAccounts(new Request(url, request));
  if (!response.ok) return response;
  const payload = (await response.json()) as {
    discoveries?: Array<{ id?: string }>;
    answerImpacts?: ScopedRecord[];
    cdiEvidence?: ScopedRecord[];
    cdiCapabilitySnapshots?: ScopedRecord[];
    cdiConflicts?: ScopedRecord[];
    cdiTechnologyReviews?: ScopedRecord[];
    accountEvents?: ScopedRecord[];
    events?: ScopedRecord[];
    meetings?: ScopedRecord[];
    documents?: ScopedRecord[];
    aiRuns?: ScopedRecord[];
    crmHandoffs?: ScopedRecord[];
  };
  const account = payload.discoveries?.find((item) => item.id === id);
  if (!account)
    return localizedApiError(locale, "ACCOUNT_NOT_FOUND", 404, {
      en: "Account not found or you do not have access to it.",
      pt: "Conta não encontrada ou você não possui acesso a ela.",
    });
  const accountRows = <T extends ScopedRecord>(rows: T[] | undefined) =>
    (rows || []).filter((item) => item.discoveryId === id);
  const allImpacts = accountRows(payload.answerImpacts);
  const answerImpacts = answerId
    ? allImpacts.filter((item) => item.answerId === answerId)
    : allImpacts;
  if (answerId && !answerImpacts.length)
    return localizedApiError(locale, "ANSWER_IMPACT_NOT_FOUND", 404, {
      en: "The requested answer impact was not found in this account.",
      pt: "O impacto da resposta solicitado não foi encontrado nesta conta.",
    });
  const relatedAnswerIds = new Set(
    answerImpacts.map((item) => item.answerId).filter(Boolean),
  );
  const relatedCapabilities = new Set(
    answerImpacts.map((item) => item.capabilityKey).filter(Boolean),
  );
  const relatedQuestions = new Set(
    answerImpacts.map((item) => item.questionId).filter(Boolean),
  );
  const scoped = <T extends ScopedRecord>(rows: T[] | undefined) => {
    const accountScoped = accountRows(rows);
    if (!answerId) return accountScoped;
    return accountScoped.filter(
      (item) =>
        (item.answerId && relatedAnswerIds.has(item.answerId)) ||
        (item.capabilityKey &&
          relatedCapabilities.has(item.capabilityKey)) ||
        (item.questionId && relatedQuestions.has(item.questionId)) ||
        item.trace?.some(
          (trace) =>
            trace.questionId && relatedQuestions.has(trace.questionId),
        ),
    );
  };
  return localizedJson(locale, {
    discoveryId: id,
    answerId: answerId || null,
    answerImpacts,
    evidence: scoped(payload.cdiEvidence),
    capabilitySnapshots: scoped(payload.cdiCapabilitySnapshots),
    conflicts: scoped(payload.cdiConflicts),
    technologyReviews: scoped(payload.cdiTechnologyReviews),
    activities: {
      accountEvents: accountRows(payload.accountEvents),
      auditEvents: accountRows(payload.events),
      meetings: accountRows(payload.meetings),
      documents: accountRows(payload.documents),
      aiRuns: accountRows(payload.aiRuns),
      crmHandoffs: accountRows(payload.crmHandoffs),
    },
  });
}
