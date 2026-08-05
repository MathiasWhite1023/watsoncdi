import { z } from "zod";
import type { Locale } from "./i18n";
import {
  CDI_CAPABILITIES,
  CDI_CAPABILITY_CATALOG_VERSION,
  CDI_CAPABILITY_KEYS,
  CDI_QUESTIONS,
  cdiQuestion,
  type CdiCapabilityKey,
} from "./cdi/capability-driven";

export const GUIDED_DISCOVERY_CATALOG_VERSION = CDI_CAPABILITY_CATALOG_VERSION;
export const GUIDED_DISCOVERY_PILLARS = CDI_CAPABILITY_KEYS;

export type GuidedDiscoveryPillarKey = CdiCapabilityKey;
export type GuidedDiscoveryMode = "adaptive" | "direct";
export type GuidedDiscoveryAnswerStatus = "draft" | "confirmed" | "unknown";

export type GuidedDiscoveryInput = {
  kind: "scale" | "single" | "multi";
  label: string;
  min?: number;
  max?: number;
  options?: string[];
};

export type GuidedDiscoveryCatalogQuestion = {
  id: string;
  pillar: GuidedDiscoveryPillarKey;
  title: string;
  question: string;
  rationale: string;
  hint: string;
  input: GuidedDiscoveryInput;
  keywords: string[];
  essential: boolean;
  triggerQuestionId?: string;
};

export type GuidedDiscoveryAnswerLike = {
  questionId: string;
  status: GuidedDiscoveryAnswerStatus;
  evidenceStatus?: "confirmed" | "reported" | "hypothesis" | "unknown";
  stakeholderId?: string | null;
  sourceDate?: string | null;
  answerText?: string;
  structured?: Record<string, unknown>;
  confidence?: number;
  updatedAt?: string;
};

export type GuidedDiscoveryMetrics = {
  addressed: number;
  total: number;
  progressPercent: number;
  confirmedWithEvidence: number;
  coveragePercent: number;
  gaps: number;
  stale: number;
  contradictions: number;
};

export type GuidedDiscoveryQuestionDelta = {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
};

const responseOptionsPt = ["Sim", "Não", "Não se aplica", "Não sei"];
const responseOptionsEn = ["Yes", "No", "Not applicable", "Don't know"];

const CORE_GUIDED_DISCOVERY_CATALOG: GuidedDiscoveryCatalogQuestion[] =
  CDI_QUESTIONS.filter((item) => item.level === "core").map((item) => ({
    id: item.id,
    pillar: item.capabilityKey,
    title: item.title.pt,
    question: item.prompt.pt,
    rationale: item.rationale.pt,
    hint: "Adicione contexto somente quando ele aumentar a força da evidência.",
    input: {
      kind: "single",
      label: "Resposta",
      options: responseOptionsPt,
    },
    keywords: item.keywords,
    essential: true,
  }));

const FOLLOW_UP_CATALOG: GuidedDiscoveryCatalogQuestion[] =
  CDI_QUESTIONS.filter((item) => item.level === "deep").map((item) => ({
    id: item.id,
    pillar: item.capabilityKey,
    title: item.title.pt,
    question: item.prompt.pt,
    rationale: item.rationale.pt,
    hint: "Registre uma métrica, sistema, responsável ou decisão verificável.",
    input: {
      kind: "single",
      label: "Confirmação",
      options: responseOptionsPt,
    },
    keywords: item.keywords,
    essential: false,
    triggerQuestionId: item.id.replace("_D", "_C"),
  }));

export const GUIDED_DISCOVERY_CATALOG: GuidedDiscoveryCatalogQuestion[] = [
  ...CORE_GUIDED_DISCOVERY_CATALOG,
  ...FOLLOW_UP_CATALOG,
];

export const GUIDED_DISCOVERY_CATALOG_EN_US: Record<
  string,
  Omit<GuidedDiscoveryCatalogQuestion, "id" | "pillar">
> = Object.fromEntries([
  ...CDI_QUESTIONS.filter((item) => item.level === "core").map((item) => [
    item.id,
    {
      title: item.title.en,
      question: item.prompt.en,
      rationale: item.rationale.en,
      hint: "Add context only when it increases the strength of the evidence.",
      input: {
        kind: "single",
        label: "Answer",
        options: responseOptionsEn,
      },
      keywords: item.keywords,
      essential: true,
    },
  ]),
  ...CDI_QUESTIONS.filter((item) => item.level === "deep").map((item) => [
    item.id,
    {
      title: item.title.en,
      question: item.prompt.en,
      rationale: item.rationale.en,
      hint: "Record a verifiable metric, system, owner, or decision.",
      input: {
        kind: "single" as const,
        label: "Confirmation",
        options: responseOptionsEn,
      },
      keywords: item.keywords,
      essential: false,
      triggerQuestionId: item.id.replace("_D", "_C"),
    },
  ]),
]);

export const GUIDED_DISCOVERY_PILLAR_META: Record<
  GuidedDiscoveryPillarKey,
  { label: string; description: string }
> = Object.fromEntries(
  CDI_CAPABILITIES.map((capability) => [
    capability.key,
    { label: capability.label.pt, description: capability.description.pt },
  ]),
) as Record<GuidedDiscoveryPillarKey, { label: string; description: string }>;

export const GUIDED_DISCOVERY_PILLAR_META_EN_US: typeof GUIDED_DISCOVERY_PILLAR_META =
  Object.fromEntries(
    CDI_CAPABILITIES.map((capability) => [
      capability.key,
      { label: capability.label.en, description: capability.description.en },
    ]),
  ) as typeof GUIDED_DISCOVERY_PILLAR_META;

const catalogById = new Map(
  GUIDED_DISCOVERY_CATALOG.map((question) => [question.id, question]),
);

export function getLocalizedQuestionById(id: string, locale: Locale = "pt-BR") {
  const canonical = catalogById.get(id);
  if (!canonical || locale === "pt-BR") return canonical || null;
  const translation = GUIDED_DISCOVERY_CATALOG_EN_US[id];
  return translation
    ? {
        ...canonical,
        ...translation,
        id: canonical.id,
        pillar: canonical.pillar,
      }
    : canonical;
}

export function getLocalizedPillarMeta(
  pillar: GuidedDiscoveryPillarKey,
  locale: Locale = "pt-BR",
) {
  return (
    locale === "en-US"
      ? GUIDED_DISCOVERY_PILLAR_META_EN_US
      : GUIDED_DISCOVERY_PILLAR_META
  )[pillar];
}

export function localizeGuidedDiscoveryOption(
  questionId: string,
  canonicalValue: string,
  locale: Locale = "pt-BR",
) {
  const canonical = catalogById.get(questionId);
  const translated = GUIDED_DISCOVERY_CATALOG_EN_US[questionId];
  const canonicalIndex =
    canonical?.input.options?.indexOf(canonicalValue) ?? -1;
  const translatedIndex =
    translated?.input.options?.indexOf(canonicalValue) ?? -1;
  if (locale === "en-US" && canonicalIndex >= 0)
    return translated?.input.options?.[canonicalIndex] || canonicalValue;
  if (locale === "pt-BR" && translatedIndex >= 0)
    return canonical?.input.options?.[translatedIndex] || canonicalValue;
  return canonicalValue;
}

export function canonicalizeGuidedDiscoveryOption(
  questionId: string,
  value: string,
) {
  const canonical = catalogById.get(questionId);
  const translated = GUIDED_DISCOVERY_CATALOG_EN_US[questionId];
  const translatedIndex = translated?.input.options?.indexOf(value) ?? -1;
  return translatedIndex >= 0
    ? canonical?.input.options?.[translatedIndex] || value
    : value;
}

export function isGuidedDiscoveryPillar(
  value: unknown,
): value is GuidedDiscoveryPillarKey {
  return GUIDED_DISCOVERY_PILLARS.includes(
    String(value) as GuidedDiscoveryPillarKey,
  );
}

export function getQuestionById(id: string) {
  return catalogById.get(id) || null;
}

export function questionsForPillar(pillar: GuidedDiscoveryPillarKey) {
  return GUIDED_DISCOVERY_CATALOG.filter(
    (question) => question.pillar === pillar && question.essential,
  );
}

export function allQuestionsForPillar(pillar: GuidedDiscoveryPillarKey) {
  return GUIDED_DISCOVERY_CATALOG.filter(
    (question) => question.pillar === pillar,
  );
}

export const legacyQuestionId = (legacyKey: string) =>
  ({
    context: "FINOPS_C05",
    landscape: "HYBRID_CLOUD_C01",
    finops: "FINOPS_C01",
    data: "TRUSTED_DATA_C03",
    security: "SECURITY_C02",
    readiness: "IT_OPERATIONS_C01",
  })[legacyKey] || null;

const answerText = (answer: GuidedDiscoveryAnswerLike) =>
  `${answer.answerText || ""} ${JSON.stringify(answer.structured || {})}`.toLowerCase();
const addressed = (answer?: GuidedDiscoveryAnswerLike) =>
  answer?.status === "confirmed" || answer?.status === "unknown";

export function rankPillarsFromAnswers(
  answers: GuidedDiscoveryAnswerLike[],
  scoreHints: Record<string, number> = {},
) {
  const text = answers.map(answerText).join(" ");
  return GUIDED_DISCOVERY_PILLARS.map((pillar) => {
    const questions = questionsForPillar(pillar);
    const keywordHits = new Set(
      questions
        .flatMap((question) => [
          ...question.keywords,
          ...(GUIDED_DISCOVERY_CATALOG_EN_US[question.id]?.keywords || []),
        ])
        .filter((keyword) => text.includes(keyword.toLowerCase())),
    ).size;
    const score = Math.min(
      100,
      Math.round(22 + keywordHits * 10 + Number(scoreHints[pillar] || 0) * 0.5),
    );
    return {
      pillar,
      score,
      rationale: keywordHits
        ? `${keywordHits} sinais encontrados nas respostas.`
        : "Pilar ainda com pouca evidência; a priorização usa a aderência atual da conta.",
    };
  }).sort((a, b) => b.score - a.score);
}

export function calculateDiscoveryMetrics(
  questionIds: string[],
  answers: GuidedDiscoveryAnswerLike[],
  now = new Date(),
): GuidedDiscoveryMetrics {
  const current = new Map(answers.map((answer) => [answer.questionId, answer]));
  const routeAnswers = questionIds
    .map((id) => current.get(id))
    .filter(Boolean) as GuidedDiscoveryAnswerLike[];
  const addressedAnswers = routeAnswers.filter(addressed);
  const confirmed = routeAnswers.filter(
    (answer) =>
      answer.status === "confirmed" &&
      answer.evidenceStatus !== "hypothesis" &&
      Boolean(
        answer.answerText?.trim() ||
          Object.keys(answer.structured || {}).length,
      ),
  );
  const staleCutoff = now.getTime() - 90 * 86400_000;
  const stale = routeAnswers.filter((answer) => {
    const value = answer.sourceDate || answer.updatedAt;
    return Boolean(
      value &&
        Number.isFinite(new Date(value).getTime()) &&
        new Date(value).getTime() < staleCutoff,
    );
  }).length;
  const contradictions = routeAnswers.filter(
    (answer) =>
      answer.evidenceStatus === "hypothesis" &&
      Boolean(answer.structured?.contradiction),
  ).length;
  const total = questionIds.length;
  return {
    addressed: addressedAnswers.length,
    total,
    progressPercent: total
      ? Math.round((addressedAnswers.length / total) * 100)
      : 0,
    confirmedWithEvidence: confirmed.length,
    coveragePercent: total ? Math.round((confirmed.length / total) * 100) : 0,
    gaps: routeAnswers.filter(
      (answer) =>
        answer.status === "unknown" || answer.evidenceStatus === "unknown",
    ).length,
    stale,
    contradictions,
  };
}

export function materializeQuestionRoute(input: {
  mode: GuidedDiscoveryMode;
  selectedPillars?: GuidedDiscoveryPillarKey[];
  answers?: GuidedDiscoveryAnswerLike[];
  scoreHints?: Record<string, number>;
  hasRelevantStakeholder?: boolean;
  hasOwner?: boolean;
  hasContradiction?: boolean;
}) {
  const answers = input.answers || [];
  let pillars = (input.selectedPillars || []).filter(isGuidedDiscoveryPillar);
  if (!pillars.length) {
    pillars = rankPillarsFromAnswers(answers, input.scoreHints)
      .slice(0, input.mode === "adaptive" ? 2 : 1)
      .map((item) => item.pillar);
  }
  if (!pillars.length) pillars = [GUIDED_DISCOVERY_PILLARS[0]];
  const limitedPillars =
    input.mode === "direct" ? pillars.slice(0, 1) : pillars.slice(0, 2);
  const answerByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  return {
    questionIds: limitedPillars.flatMap((pillar) => {
      const essential = questionsForPillar(pillar);
      const followUps = essential.flatMap((question) => {
        const answer = answerByQuestion.get(question.id);
        const response = String(answer?.structured?.value || "").toLowerCase();
        const highImpactGap =
          (response === "no" || response === "não" || response === "nao") &&
          Number(cdiQuestion(question.id)?.businessImpact || 0) >= 95;
        const needsFollowUp =
          Boolean(answer) &&
          (answer?.status === "unknown" ||
            answer?.evidenceStatus === "unknown" ||
            answer?.evidenceStatus === "hypothesis" ||
            (Number(answer?.confidence || 0) > 0 &&
              Number(answer?.confidence) < 70) ||
            highImpactGap ||
            Boolean(answer?.structured?.contradiction) ||
            !answer?.answerText?.trim());
        const deepQuestionId = question.id.replace("_C", "_D");
        return needsFollowUp && getQuestionById(deepQuestionId)
          ? [deepQuestionId]
          : [];
      });
      return [...essential.map((question) => question.id), ...followUps].slice(
        0,
        10,
      );
    }),
    selectedPillars: limitedPillars,
  };
}

export function rankNextQuestion(input: {
  questions: GuidedDiscoveryCatalogQuestion[];
  answers: GuidedDiscoveryAnswerLike[];
  hypothesisImpactByPillar?: Partial<Record<GuidedDiscoveryPillarKey, number>>;
  stakeholderCoverageByPillar?: Partial<
    Record<GuidedDiscoveryPillarKey, number>
  >;
  now?: Date;
}) {
  const current = new Map(
    input.answers.map((answer) => [answer.questionId, answer]),
  );
  const now = input.now || new Date();
  return input.questions
    .map((question, sequence) => {
      const answer = current.get(question.id);
      const informationGap = addressed(answer)
        ? answer?.status === "unknown"
          ? 72
          : 0
        : 100;
      const hypothesisImpact = Math.max(
        0,
        Math.min(
          100,
          Number(input.hypothesisImpactByPillar?.[question.pillar] ?? 70),
        ),
      );
      const sourceTime = answer?.sourceDate || answer?.updatedAt;
      const staleness =
        sourceTime &&
        new Date(sourceTime).getTime() < now.getTime() - 90 * 86400_000
          ? 100
          : answer
            ? 0
            : 35;
      const stakeholderCoverage =
        100 -
        Math.max(
          0,
          Math.min(
            100,
            Number(
              input.stakeholderCoverageByPillar?.[question.pillar] ??
                (answer?.stakeholderId ? 100 : 30),
            ),
          ),
        );
      const rankingScore = Math.round(
        informationGap * 0.45 +
          hypothesisImpact * 0.3 +
          staleness * 0.15 +
          stakeholderCoverage * 0.1,
      );
      return {
        question,
        rankingScore,
        sequence,
        factors: {
          informationGap,
          hypothesisImpact,
          staleness,
          stakeholderCoverage,
        },
      };
    })
    .filter((item) => !addressed(current.get(item.question.id)))
    .sort((a, b) => b.rankingScore - a.rankingScore || a.sequence - b.sequence);
}

export function calculateDeterministicDeltas(
  before: Array<Record<string, unknown>>,
  after: Array<Record<string, unknown>>,
): GuidedDiscoveryQuestionDelta[] {
  const labels: Record<string, string> = {
    alignment: "Alinhamento",
    value: "Valor",
    readiness: "Prontidão",
    confidence: "Confiança",
  };
  const previous = new Map(
    before.map((score) => [String(score.short || score.name), score]),
  );
  return after
    .flatMap((score) => {
      const key = String(score.short || score.name);
      const old = previous.get(key) || {};
      return ["alignment", "value", "readiness", "confidence"].map((metric) => {
        const beforeValue = Number(old[metric] || 0);
        const afterValue = Number(score[metric] || 0);
        return {
          key: `${key}:${metric}`,
          label: `${key} · ${labels[metric]}`,
          before: beforeValue,
          after: afterValue,
          delta: afterValue - beforeValue,
        };
      });
    })
    .filter((item) => item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8);
}

export function checkpointForRoute(
  questionIds: string[],
  answers: GuidedDiscoveryAnswerLike[],
) {
  const current = new Map(answers.map((answer) => [answer.questionId, answer]));
  for (const pillar of GUIDED_DISCOVERY_PILLARS) {
    const pillarIds = questionIds.filter(
      (id) => getQuestionById(id)?.pillar === pillar,
    );
    if (
      pillarIds.length >= 4 &&
      pillarIds.every((id) => addressed(current.get(id)))
    )
      return { kind: "pillar" as const, pillar };
  }
  return null;
}

export const GuidedDiscoveryAnswerPayloadSchema = z.object({
  sessionId: z.string().trim().min(1),
  questionId: z.string().trim().min(1),
  status: z.enum(["draft", "confirmed", "unknown"]),
  structured: z.record(z.string(), z.unknown()).default({}),
  answerText: z.string().trim().max(8_000).default(""),
  evidenceStatus: z
    .enum(["confirmed", "reported", "hypothesis", "unknown"])
    .default("reported"),
  stakeholderId: z.string().trim().nullable().optional(),
  sourceType: z.string().trim().max(80).nullable().optional(),
  sourceId: z.string().trim().max(240).nullable().optional(),
  sourceDate: z.string().trim().nullable().optional(),
  confidence: z.number().int().min(0).max(100).default(70),
});

export const GuidedDiscoveryStartPayloadSchema = z.object({
  mode: z.enum(["adaptive", "direct"]).default("direct"),
  pillarKey: z.enum(GUIDED_DISCOVERY_PILLARS).optional(),
  selectedPillars: z
    .array(z.enum(GUIDED_DISCOVERY_PILLARS))
    .min(1)
    .max(1)
    .optional()
    .default([]),
});

export function humanizeStructuredAnswer(value: Record<string, unknown>) {
  return Object.values(value)
    .flatMap((item) =>
      Array.isArray(item)
        ? item.map(String)
        : item === undefined || item === null || item === ""
          ? []
          : [String(item)],
    )
    .join(" · ");
}

export function pillarQuestionCount(pillar: GuidedDiscoveryPillarKey) {
  return questionsForPillar(pillar).length;
}
