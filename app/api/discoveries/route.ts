import { env } from "cloudflare:workers";
import {
  answerFromEvidence,
  buildActions,
  buildHypotheses,
  buildMemory,
  suggestAccountPlan,
  type AccountEvent,
  type AccountMemory,
  type EvidenceRef,
} from "../../../lib/account-intelligence";
import {
  createAIProviderFromEnv,
  type AccountDataClassification,
  type AIResult,
} from "../../../lib/ai-provider";
import {
  finalizeApiResponse,
  localizedApiError,
  localizedJson,
  localizedText,
  parseResponseLocale,
  parseLocalizedJsonObject,
  resolveResponseLocale,
  type ResponseLocale,
} from "../../../lib/api-locale";
import {
  localizeDemoPayload,
  localizeDemoSystemText,
} from "../../../lib/demo-localization";
import {
  collectAccountSources,
  evidenceFingerprint,
  persistEmbeddings,
  retrieveAccountSources,
  type RetrievalSource,
} from "../../../lib/account-retrieval";
import {
  GUIDED_DISCOVERY_CATALOG,
  GUIDED_DISCOVERY_CATALOG_VERSION,
  GUIDED_DISCOVERY_PILLAR_META,
  GUIDED_DISCOVERY_PILLAR_META_EN_US,
  GUIDED_DISCOVERY_PILLARS,
  GuidedDiscoveryAnswerPayloadSchema,
  GuidedDiscoveryStartPayloadSchema,
  calculateDeterministicDeltas,
  calculateDiscoveryMetrics,
  checkpointForRoute,
  getQuestionById,
  humanizeStructuredAnswer,
  isGuidedDiscoveryPillar,
  legacyQuestionId,
  materializeQuestionRoute,
  questionsForPillar,
  rankNextQuestion,
  rankPillarsFromAnswers,
  type GuidedDiscoveryAnswerLike,
  type GuidedDiscoveryPillarKey,
} from "../../../lib/guided-discovery";
import {
  buildAccountChangeSet,
  buildCrmHandoff,
  buildImpactMetrics,
  buildLogicalPipeline,
  type ChangeSetSuggestions,
  type CommercialAction,
  type CommercialEntity,
  type CommercialHypothesis,
  type CommercialScore,
  type CommercialStakeholder,
  type CommercialState,
} from "../../../lib/commercial-proof";
import {
  KYNDYRL_PILLARS,
  getKyndrylPillar,
  kyndrylCapabilityCatalog,
  scoreKyndrylAssessment,
  type KyndrylAssessment,
} from "../../../lib/kyndryl-discovery";
import {
  normalizeCdiResponse,
  scoreCapabilityDrivenAssessment,
  type CapabilityDrivenAssessment,
} from "../../../lib/cdi/engine";
import {
  CDI_CAPABILITIES,
  CDI_CAPABILITY_CATALOG_VERSION,
  CDI_CAPABILITY_KEYS,
  cdiQuestion,
  localizeCdi,
  type CdiCapabilityKey,
} from "../../../lib/cdi/capability-driven";
import { cdiFeatureFlags } from "../../../lib/cdi/feature-flags";

export const dynamic = "force-dynamic";

type Priority = "Alta" | "Média" | "Baixa";
type Answer = { key: string; question: string; answer: string; at: string };
type Recommendation = {
  type: "Capacidade" | "Software" | "Consultoria";
  name: string;
  rationale: string;
};
type Score = {
  name: string;
  short: string;
  alignment: number;
  value: number;
  readiness: number;
  confidence: number;
  level: Priority;
  evidence: string[];
  action: string;
};
type MeetingInsight = {
  summary: string;
  signals: string[];
  ibmThemes: string[];
  nextQuestions: string[];
  nextActions: string[];
  risks: string[];
  stakeholders: string[];
  systems: string[];
  painPoints: string[];
  aiStatus: "watsonx" | "gemini" | "fallback" | "error";
};
type Meeting = {
  id: string;
  discoveryId: string;
  title: string;
  notes: string;
  summary: string;
  insights: MeetingInsight;
  aiStatus: "watsonx" | "gemini" | "fallback" | "error";
  createdAt: string;
};
type AccountNode = {
  id: string;
  type:
    | "area"
    | "person"
    | "system"
    | "pain"
    | "initiative"
    | "capability"
    | "risk";
  label: string;
  detail: string;
  strength: number;
};
type AccountEdge = {
  source: string;
  target: string;
  label:
    | "impacta"
    | "depende de"
    | "decisor de"
    | "possível aderência"
    | "risco associado";
};
type AccountMap = {
  nodes: AccountNode[];
  edges: AccountEdge[];
  updatedAt: string;
};
type Stakeholder = {
  id: string;
  discoveryId: string;
  name: string;
  role: string;
  area: string;
  reportsToId: string | null;
  influence: "Alta" | "Média" | "Baixa";
  stance: "Aliado" | "Neutro" | "Resistente" | "Desconhecido";
  priorities: string[];
  notes: string;
  source: "manual" | "suggested";
  createdAt: string;
  updatedAt: string;
};
type StakeholderCapabilityAssignment = {
  id: string;
  discoveryId: string;
  stakeholderId: string;
  capabilityKey: CdiCapabilityKey;
  role: "owner" | "decision_maker" | "influencer" | "technical_contact";
  status: "confirmed" | "suggested" | "dismissed";
  confidence: number;
  sourceType: string;
  sourceId: string | null;
  evidence: EvidenceRef[];
  createdAt: string;
  updatedAt: string;
};
type CdiAnswerImpact = {
  id: string;
  discoveryId: string;
  answerId: string;
  questionId: string;
  catalogVersion: string;
  capabilityKey: CdiCapabilityKey;
  dimension: string;
  response: string;
  evidenceId: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  delta: Record<string, unknown>;
  journeyIds: string[];
  technologyIds: string[];
  gateChanges: Array<Record<string, unknown>>;
  recommendationChanges: Array<Record<string, unknown>>;
  ruleTrace: Record<string, unknown>;
  source: Record<string, unknown>;
  createdAt: string;
};
type AccountAction = {
  id: string;
  discoveryId: string;
  stakeholderId: string | null;
  type: string;
  title: string;
  rationale: string;
  whyNow: string;
  nextStep: string;
  impact: number;
  urgency: number;
  confidence: number;
  maturity: number;
  effort: number;
  priorityScore: number;
  status: string;
  dueAt: string | null;
  expectedOutcome: string;
  conversation: {
    stakeholder: string;
    theme: string;
    opener: string;
    questions: string[];
    objection: string;
    successCriterion: string;
  };
  snoozedUntil: string | null;
  feedbackReason: string | null;
  rankAdjustment: number;
  evidence: EvidenceRef[];
  dedupeKey: string;
  evidenceFingerprint: string;
  createdAt: string;
  updatedAt: string;
};
type Hypothesis = {
  id: string;
  discoveryId: string;
  capabilityKey: string;
  title: string;
  problem: string;
  products: string[];
  stakeholderIds: string[];
  evidence: EvidenceRef[];
  gaps: string[];
  confidence: number;
  stage: string;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
};
type AccountPlan = {
  discoveryId: string;
  priorities: string[];
  initiatives: string[];
  objectives: string[];
  risks: string[];
  ecosystem: string[];
  relationship: string[];
  plan30: string[];
  plan60: string[];
  plan90: string[];
  approvalStatus: string;
  suggestion: Record<string, string[]>;
  updatedAt: string;
};
type AccountDocument = {
  id: string;
  discoveryId: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  summary: string;
  createdAt: string;
};
type GuidedDiscoverySession = {
  id: string;
  discoveryId: string;
  ownerEmail: string;
  mode: "adaptive" | "direct";
  catalogVersion: string;
  selectedPillars: string[];
  status: "in_progress" | "paused" | "completed";
  progressPercent: number;
  coveragePercent: number;
  currentQuestionId: string | null;
  checkpointCount: number;
  aiStatus: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type GuidedDiscoveryPillarStatus = {
  id: string;
  discoveryId: string;
  ownerEmail: string;
  pillarKey: GuidedDiscoveryPillarKey;
  catalogVersion: string;
  status:
    | "not_started"
    | "in_progress"
    | "reviewed_sufficient"
    | "reviewed_gaps"
    | "not_relevant";
  currentSessionId: string | null;
  progressPercent: number;
  coveragePercent: number;
  confidencePercent: number;
  answeredCount: number;
  requiredCount: number;
  notRelevantReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type GuidedDiscoveryQuestionRow = {
  id: string;
  sessionId: string;
  discoveryId: string;
  catalogQuestionId: string | null;
  pillar: string;
  prompt: string;
  hint: string | null;
  inputSchema: Record<string, unknown>;
  source: "catalog" | "ai";
  rationale: string | null;
  citations: EvidenceRef[];
  sequence: number;
  status: "proposed" | "accepted" | "active" | "answered" | "dismissed";
  createdAt: string;
  updatedAt: string;
};
type GuidedDiscoveryAnswerRow = {
  id: string;
  sessionId: string;
  questionId: string;
  discoveryId: string;
  structured: Record<string, unknown>;
  answerText: string;
  evidenceStatus: "confirmed" | "reported" | "hypothesis" | "unknown";
  stakeholderId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  sourceDate: string | null;
  confidence: number;
  status: "draft" | "confirmed" | "unknown";
  supersedesId: string | null;
  isCurrent: boolean;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const recommendationMap: Record<string, Recommendation[]> = {
  FinOps: [
    {
      type: "Capacidade",
      name: "FinOps & Technology Financial Management",
      rationale:
        "Maior correspondência entre desafios financeiros, maturidade operacional e potencial de valor.",
    },
    {
      type: "Software",
      name: "IBM Cloudability + IBM Turbonomic",
      rationale:
        "Combina transparência financeira com otimização contínua de recursos e performance.",
    },
    {
      type: "Consultoria",
      name: "FinOps Discovery Workshop",
      rationale:
        "Valida baseline, modelo operacional, responsabilidades e prioridades antes de uma decisão comercial.",
    },
  ],
  "Trusted Data": [
    {
      type: "Capacidade",
      name: "Trusted Data & Data Security",
      rationale:
        "Os sinais conectam governança, proteção, integração e consumo confiável de dados.",
    },
    {
      type: "Software",
      name: "watsonx.data + IBM Guardium + HashiCorp Vault",
      rationale:
        "Cria uma fundação governada de dados com controles de segurança e segredos empresariais.",
    },
    {
      type: "Consultoria",
      name: "Trusted Data Workshop",
      rationale:
        "Alinha stakeholders, fontes críticas, riscos e um roadmap de dados confiáveis.",
    },
  ],
  "AI Governance": [
    {
      type: "Capacidade",
      name: "AI Governance",
      rationale:
        "Adoção de IA exige transparência, risco, políticas e supervisão humana coordenados.",
    },
    {
      type: "Software",
      name: "watsonx.governance + watsonx.ai",
      rationale:
        "Conecta ciclo de vida de modelos, controles de risco e evidências operacionais.",
    },
    {
      type: "Consultoria",
      name: "AI Readiness & Governance Workshop",
      rationale:
        "Define casos prioritários, guardrails e modelo operacional responsável.",
    },
  ],
  "Hybrid Cloud": [
    {
      type: "Capacidade",
      name: "Hybrid Infrastructure",
      rationale:
        "O cenário distribuído exige portabilidade, consistência operacional e otimização.",
    },
    {
      type: "Software",
      name: "Red Hat OpenShift + HashiCorp Terraform",
      rationale:
        "Padroniza execução e provisionamento seguro em ambientes híbridos.",
    },
    {
      type: "Consultoria",
      name: "Hybrid Cloud Architecture Review",
      rationale:
        "Cria um roadmap de arquitetura alinhado às prioridades de negócio.",
    },
  ],
  Automation: [
    {
      type: "Capacidade",
      name: "Enterprise Automation",
      rationale:
        "Sinais de processos manuais e ineficiência indicam potencial de produtividade.",
    },
    {
      type: "Software",
      name: "watsonx Orchestrate + IBM Concert",
      rationale:
        "Orquestra trabalho e conecta insights operacionais a ações coordenadas.",
    },
    {
      type: "Consultoria",
      name: "Automation Discovery Workshop",
      rationale: "Prioriza jornadas de automação por impacto, risco e esforço.",
    },
  ],
  "App Modernization": [
    {
      type: "Capacidade",
      name: "Application Modernization",
      rationale:
        "Dependências legadas e velocidade de entrega sugerem modernização incremental.",
    },
    {
      type: "Software",
      name: "Red Hat OpenShift + IBM Instana",
      rationale:
        "Apoia modernização com plataforma consistente e observabilidade ponta a ponta.",
    },
    {
      type: "Consultoria",
      name: "Application Modernization Assessment",
      rationale:
        "Classifica aplicações e define ondas de modernização orientadas a valor.",
    },
  ],
};

const initialScores = (locale: ResponseLocale = "en-US"): Score[] =>
  kyndrylCapabilityCatalog.map((item, index) => ({
    name: item.name,
    short: item.short,
    alignment: Math.max(22, 36 - index * 3),
    value: Math.max(34, 45 - index * 2),
    readiness: Math.max(28, 38 - index * 2),
    confidence: 30,
    level: "Baixa",
    evidence: [
      localizedText(
        locale,
        "The account does not have enough evidence yet. Record a meeting or complete guided discovery.",
        "Conta ainda sem evidência suficiente. Registre uma reunião ou responda o discovery guiado.",
      ),
    ],
    action: locale === "en-US" ? item.actionEn : item.action,
  }));

const clamp = (value: number) => Math.max(12, Math.min(97, Math.round(value)));
const level = (value: number): Priority =>
  value >= 75 ? "Alta" : value >= 50 ? "Média" : "Baixa";
const hitCount = (text: string, words: readonly string[]) =>
  words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
const compact = (items: Array<string | false | null | undefined>) =>
  Array.from(new Set(items.filter(Boolean) as string[])).slice(0, 6);

const aiAdapter = () => {
  const runtime = env as unknown as Record<string, string | undefined>;
  return createAIProviderFromEnv(runtime);
};

const classificationOf = (
  row: Record<string, unknown>,
): AccountDataClassification =>
  String(row.data_classification || "test") === "confidential"
    ? "confidential"
    : "test";

const aiStatusOf = (provider: "watsonx" | "gemini" | "fallback") =>
  provider === "watsonx"
    ? ("watsonx" as const)
    : provider === "gemini"
      ? ("gemini" as const)
      : ("fallback" as const);

function fallbackMeetingInsights(
  notes: string,
  customerName: string,
  locale: ResponseLocale = "pt-BR",
): MeetingInsight {
  const text = notes.toLowerCase();
  const themeHits = kyndrylCapabilityCatalog
    .map((item) => ({ theme: item.short, hits: hitCount(text, item.keywords) }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((item) => item.theme);
  const stakeholders = compact([
    text.includes("cfo") &&
      localizedText(locale, "CFO / Finance", "CFO / Finanças"),
    text.includes("cio") &&
      localizedText(locale, "CIO / Technology", "CIO / Tecnologia"),
    text.includes("cto") &&
      localizedText(locale, "CTO / Architecture", "CTO / Arquitetura"),
    text.includes("ciso") &&
      localizedText(locale, "CISO / Security", "CISO / Segurança"),
    (text.includes("dados") || text.includes("data")) &&
      localizedText(locale, "Data leader", "Líder de dados"),
    (text.includes("operação") || text.includes("operations")) &&
      localizedText(locale, "Operations", "Operações"),
  ]);
  const systems = compact([
    text.includes("aws") && "AWS",
    text.includes("azure") && "Azure",
    text.includes("mainframe") && "Mainframe",
    text.includes("sap") && "SAP",
    text.includes("datacenter") && "Datacenter",
    text.includes("lakehouse") && "Lakehouse",
    text.includes("salesforce") && "Salesforce",
  ]);
  const painPoints = compact([
    hitCount(text, [
      "custo",
      "cost",
      "orçamento",
      "budget",
      "forecast",
      "rateio",
      "allocation",
    ]) > 0 &&
      localizedText(
        locale,
        "Pressure for cost predictability and control",
        "Pressão por previsibilidade e controle de custos",
      ),
    hitCount(text, [
      "silo",
      "qualidade",
      "quality",
      "linhagem",
      "lineage",
      "catálogo",
      "catalog",
    ]) > 0 &&
      localizedText(
        locale,
        "Fragmented or untrusted data",
        "Dados fragmentados ou pouco confiáveis",
      ),
    hitCount(text, [
      "lgpd",
      "risco",
      "risk",
      "compliance",
      "seguran",
      "security",
    ]) > 0 &&
      localizedText(
        locale,
        "Risk, compliance, and data protection",
        "Risco, conformidade e proteção de dados",
      ),
    hitCount(text, [
      "manual",
      "produtividade",
      "productivity",
      "processo",
      "process",
    ]) > 0 &&
      localizedText(
        locale,
        "Manual processes or low productivity",
        "Processos manuais ou baixa produtividade",
      ),
    hitCount(text, ["legado", "legacy", "mainframe", "moderniza", "moderniz"]) >
      0 &&
      localizedText(
        locale,
        "Legacy dependencies or modernization needs",
        "Dependências legadas ou necessidade de modernização",
      ),
  ]);

  const themes = themeHits.length ? themeHits : ["Trusted Data", "FinOps"];
  return {
    summary:
      notes.trim().slice(0, 260) ||
      localizedText(
        locale,
        `${customerName}'s initial context still needs meeting evidence.`,
        `Contexto inicial de ${customerName} ainda precisa de evidências de reunião.`,
      ),
    signals: compact([
      ...painPoints,
      ...systems.map((item) =>
        localizedText(
          locale,
          `System mentioned: ${item}`,
          `Sistema citado: ${item}`,
        ),
      ),
    ]),
    ibmThemes: themes,
    nextQuestions: [
      localizedText(
        locale,
        "Which executive initiative is driving this conversation?",
        "Qual iniciativa executiva está por trás dessa conversa?",
      ),
      localizedText(
        locale,
        "Who decides on budget, risk, and architecture in this account?",
        "Quem decide orçamento, risco e arquitetura nessa conta?",
      ),
      localizedText(
        locale,
        "Which metrics define success over the next 90 days?",
        "Quais métricas definem sucesso nos próximos 90 dias?",
      ),
      localizedText(
        locale,
        "What must be proven before this becomes a CRM opportunity?",
        "O que precisa estar comprovado para virar oportunidade no CRM?",
      ),
    ],
    nextActions: [
      localizedText(
        locale,
        `Update ${customerName}'s account map with the stakeholders and systems mentioned.`,
        `Atualizar o mapa da conta de ${customerName} com stakeholders e sistemas citados.`,
      ),
      localizedText(
        locale,
        `Validate the initial ${themes[0]} fit with the sponsor and technical team.`,
        `Validar aderência inicial em ${themes[0]} com sponsor e time técnico.`,
      ),
      localizedText(
        locale,
        "Prepare a deeper discovery conversation before creating a CRM opportunity.",
        "Preparar conversa de aprofundamento antes de criar oportunidade no CRM.",
      ),
    ],
    risks: compact([
      !stakeholders.length &&
        localizedText(
          locale,
          "Decision-making stakeholders have not been identified",
          "Stakeholders decisores ainda não identificados",
        ),
      !systems.length &&
        localizedText(
          locale,
          "Architecture and systems remain unclear",
          "Arquitetura/sistemas ainda pouco claros",
        ),
      !painPoints.length &&
        localizedText(
          locale,
          "The business pain remains generic",
          "Dor de negócio ainda genérica",
        ),
      localizedText(
        locale,
        "The recommendation requires human validation before commercial handoff",
        "Recomendação precisa de validação humana antes de handoff comercial",
      ),
    ]),
    stakeholders,
    systems,
    painPoints,
    aiStatus: "fallback",
  };
}

async function getAIInsights(
  notes: string,
  customerName: string,
  industry: string,
  classification: AccountDataClassification,
  responseLocale: ResponseLocale = "en-US",
): Promise<{ insights: MeetingInsight | null; result: AIResult<unknown> }> {
  const generated = await aiAdapter().prepareMeeting(
    `Customer: ${customerName}\nIndustry: ${industry}\nMeeting notes:\n${notes}`,
    { classification, responseLocale },
  );
  const parsed = generated.data as Partial<MeetingInsight> | null;
  if (!parsed) return { insights: null, result: generated };
  return {
    result: generated,
    insights: {
      summary: String(parsed.summary || notes.slice(0, 260)),
      signals: compact((parsed.signals || []) as string[]),
      ibmThemes: compact((parsed.ibmThemes || []) as string[]),
      nextQuestions: compact((parsed.nextQuestions || []) as string[]),
      nextActions: compact((parsed.nextActions || []) as string[]),
      risks: compact((parsed.risks || []) as string[]),
      stakeholders: compact((parsed.stakeholders || []) as string[]),
      systems: compact((parsed.systems || []) as string[]),
      painPoints: compact((parsed.painPoints || []) as string[]),
      aiStatus: aiStatusOf(generated.provider),
    },
  };
}

function kyndrylActionLabel(
  action: KyndrylAssessment["technologies"][number]["action"],
  locale: ResponseLocale,
) {
  const labels = {
    RECOMMEND_NOW: localizedText(
      locale,
      "Review the evidence and prepare a qualified recommendation.",
      "Revisar as evidências e preparar uma recomendação qualificada.",
    ),
    VALIDATE: localizedText(
      locale,
      "Validate the strongest evidence and the decision gate with the customer.",
      "Validar com o cliente as evidências mais fortes e o gate de decisão.",
    ),
    WATCHLIST: localizedText(
      locale,
      "Keep on the opportunity watchlist and close the discovery gaps.",
      "Manter no radar de oportunidades e fechar as lacunas da descoberta.",
    ),
    LOW_PRIORITY: localizedText(
      locale,
      "Do not prioritize yet; collect new evidence before advancing.",
      "Ainda não priorizar; coletar novas evidências antes de avançar.",
    ),
    DO_NOT_RECOMMEND: localizedText(
      locale,
      "Do not recommend with the evidence currently available.",
      "Não recomendar com as evidências disponíveis.",
    ),
    GATE_PENDING: localizedText(
      locale,
      "Validate the required gate before making a recommendation.",
      "Validar o gate obrigatório antes de recomendar.",
    ),
    GATE_FAILED: localizedText(
      locale,
      "Required gate not satisfied; no recommendation is allowed.",
      "Gate obrigatório não atendido; nenhuma recomendação é permitida.",
    ),
  } as const;
  return labels[action];
}

function kyndrylAssessmentFromAnswers(
  answers: Answer[],
  locale: ResponseLocale,
) {
  const assessmentAnswers = answers.flatMap((answer) =>
    getQuestionById(answer.key)
      ? [
          {
            questionId: answer.key,
            status: "confirmed" as const,
            structured: { value: answer.answer },
            answerText: answer.answer,
            confidence: 82,
          },
        ]
      : [],
  );
  if (!assessmentAnswers.length) return null;
  return cdiFeatureFlags().capabilityDrivenFlow
    ? scoreCapabilityDrivenAssessment({ answers: assessmentAnswers, locale })
    : scoreKyndrylAssessment({ answers: assessmentAnswers, locale });
}

function scoreActiveDiscoveryAssessment(input: {
  answers: Parameters<typeof scoreCapabilityDrivenAssessment>[0]["answers"];
  capabilityKeys?: string[];
  locale: ResponseLocale;
}) {
  if (cdiFeatureFlags().capabilityDrivenFlow)
    return scoreCapabilityDrivenAssessment(input);
  return scoreKyndrylAssessment({
    answers: input.answers,
    pillarKeys: input.capabilityKeys,
    locale: input.locale,
  });
}

function resultFromKyndrylAssessment(
  assessment: KyndrylAssessment,
  answers: Answer[],
  meetings: Meeting[],
  locale: ResponseLocale,
) {
  const scores: Score[] = assessment.pillars
    .map((pillar) => {
      const technologies = assessment.technologies.filter(
        (item) => item.pillarKey === pillar.key,
      );
      const top = technologies[0];
      const relevantEvidence = assessment.evidence
        .filter(
          (item) =>
            String(getQuestionById(item.questionId)?.pillar || "") ===
            String(pillar.key),
        )
        .slice(0, 6);
      const businessValue = relevantEvidence.length
        ? clamp(
            relevantEvidence.reduce(
              (sum, item) =>
                sum +
                (getKyndrylPillar(pillar.key)?.questions.find(
                  (question) => question.id === item.questionId,
                )?.businessImpact || 0),
              0,
            ) / relevantEvidence.length,
          )
        : 0;
      return {
        name: pillar.label,
        short: getKyndrylPillar(pillar.key)?.shortLabel.en || pillar.label,
        alignment: pillar.propensity,
        value: businessValue,
        readiness: pillar.maturity,
        confidence: pillar.confidence,
        level: level(pillar.propensity),
        evidence: relevantEvidence.map(
          (item) =>
            `${item.question} → ${item.label} → ${top?.name || pillar.label}`,
        ),
        action: top
          ? kyndrylActionLabel(top.action, locale)
          : localizedText(
              locale,
              "Complete the pillar discovery.",
              "Concluir a descoberta do pilar.",
            ),
      } satisfies Score;
    })
    .sort((a, b) => b.alignment - a.alignment);
  const technologyRecommendations: Recommendation[] = assessment.technologies
    .filter(
      (item) =>
        item.action !== "DO_NOT_RECOMMEND" && item.action !== "GATE_FAILED",
    )
    .slice(0, 5)
    .map((item) => ({
      type: "Software",
      name: item.name,
      rationale: `${item.propensity}% ${localizedText(locale, "propensity", "propensão")} · ${item.confidence}% ${localizedText(locale, "confidence", "confiança")}. ${item.explanation}`,
    }));
  const leadingPillar = assessment.pillars[0];
  const recommendations: Recommendation[] = [
    ...technologyRecommendations,
    ...(leadingPillar
      ? [
          {
            type: "Consultoria" as const,
            name: leadingPillar.workshop,
            rationale: localizedText(
              locale,
              "Recommended to validate the evidence, required gates, and the decision path before CRM handoff.",
              "Recomendado para validar evidências, gates obrigatórios e o caminho de decisão antes do handoff ao CRM.",
            ),
          },
        ]
      : []),
  ];
  const topTechnology = assessment.technologies[0];
  const latestMeeting = meetings[0];
  const challengeSummary =
    latestMeeting?.summary ||
    answers.find((item) => getQuestionById(item.key))?.answer?.slice(0, 240) ||
    localizedText(
      locale,
      "Kyndryl opportunity discovery is in progress.",
      "A descoberta de oportunidades Kyndryl está em andamento.",
    );
  const nextEngagement =
    topTechnology?.nextQuestion ||
    (topTechnology
      ? kyndrylActionLabel(topTechnology.action, locale)
      : localizedText(
          locale,
          "Choose a pillar and start discovery.",
          "Escolha um pilar e inicie a descoberta.",
        ));
  const priority =
    topTechnology?.propensity >= 80 && topTechnology.confidence >= 55
      ? "Alta"
      : topTechnology?.propensity >= 45
        ? "Média"
        : "Baixa";
  return {
    scores,
    recommendations,
    challengeSummary,
    nextEngagement,
    priority,
  };
}

function analyze(
  answers: Answer[],
  meetings: Meeting[] = [],
  locale: ResponseLocale = "pt-BR",
) {
  const kyndrylAssessment = kyndrylAssessmentFromAnswers(answers, locale);
  if (kyndrylAssessment)
    return resultFromKyndrylAssessment(
      kyndrylAssessment,
      answers,
      meetings,
      locale,
    );
  const text = [
    answers.map((item) => item.answer).join(" "),
    meetings
      .map(
        (item) =>
          `${item.notes} ${(item.insights.ibmThemes || []).join(" ")} ${(item.insights.painPoints || []).join(" ")}`,
      )
      .join(" "),
  ]
    .join(" ")
    .toLowerCase();
  const completeness = answers.length + meetings.length * 1.5;
  const readinessHits = hitCount(text, [
    "patroc",
    "executiv",
    "urg",
    "prazo",
    "time",
    "orçamento",
    "budget",
    "iniciativa",
    "prioridade",
    "sponsor",
    "decisão",
  ]);
  const confidence = clamp(28 + answers.length * 8 + meetings.length * 13);
  const base = 26 + completeness * 4;
  const quote = (key: string) =>
    answers.find((item) => item.key === key)?.answer;

  const scores = kyndrylCapabilityCatalog
    .map((item) => {
      const hits = hitCount(text, item.keywords);
      const themeMention = meetings.some((meeting) =>
        meeting.insights.ibmThemes.some((theme) =>
          theme.toLowerCase().includes(item.short.toLowerCase().split(" ")[0]),
        ),
      );
      const alignment = clamp(base + hits * 8 + (themeMention ? 10 : 0));
      const value = clamp(
        38 + hits * 7 + meetings.length * 5 + answers.length * 2,
      );
      const readiness = clamp(
        32 + readinessHits * 7 + meetings.length * 4 + answers.length * 2,
      );
      const meetingEvidence = meetings.find((meeting) =>
        meeting.insights.ibmThemes.some((theme) =>
          theme.toLowerCase().includes(item.short.toLowerCase().split(" ")[0]),
        ),
      );
      return {
        name: item.name,
        short: item.short,
        alignment,
        value,
        readiness,
        confidence,
        level: level(alignment),
        evidence: compact([
          quote("context") &&
            `${localizedText(locale, "Context", "Contexto")}: "${quote("context")?.slice(0, 150)}"`,
          quote("data") &&
            item.short === "Trusted Data" &&
            `${localizedText(locale, "Data", "Dados")}: "${quote("data")?.slice(0, 150)}"`,
          quote("finops") &&
            item.short === "FinOps" &&
            `FinOps: "${quote("finops")?.slice(0, 150)}"`,
          meetingEvidence &&
            `${localizedText(locale, "Meeting", "Reunião")}: ${meetingEvidence.summary.slice(0, 150)}`,
          hits > 1 &&
            localizedText(
              locale,
              `${hits} signals related to ${item.short} were found.`,
              `Foram encontrados ${hits} sinais relacionados a ${item.short}.`,
            ),
        ]),
        action: locale === "en-US" ? item.actionEn : item.action,
      } satisfies Score;
    })
    .sort((a, b) => b.alignment - a.alignment);

  const top = scores[0];
  const topPillar = KYNDYRL_PILLARS.find(
    (pillar) => pillar.shortLabel.en === top.short,
  );
  const recommendations = topPillar
    ? [
        {
          type: "Capacidade" as const,
          name: locale === "en-US" ? topPillar.label.en : topPillar.label.pt,
          rationale: localizedText(
            locale,
            "The account signals align with this Kyndryl discovery pillar. Validate them through the guided questions.",
            "Os sinais da conta se alinham a este pilar de descoberta Kyndryl. Valide-os pelas perguntas guiadas.",
          ),
        },
        {
          type: "Software" as const,
          name: topPillar.technologies
            .filter((item) => item.attach === "LEAD_ATTACH")
            .slice(0, 3)
            .map((item) => item.name)
            .join(" + "),
          rationale: localizedText(
            locale,
            "These lead technologies address the highest-priority capabilities in the pillar.",
            "Estas tecnologias principais atendem às capacidades de maior prioridade do pilar.",
          ),
        },
        {
          type: "Consultoria" as const,
          name:
            locale === "en-US"
              ? topPillar.workshop.en
              : topPillar.workshop.pt,
          rationale: localizedText(
            locale,
            "Use the workshop to confirm evidence, decision gates, and the customer journey before a commercial recommendation.",
            "Use o workshop para confirmar evidências, gates de decisão e a jornada do cliente antes de uma recomendação comercial.",
          ),
        },
      ]
    : (recommendationMap[top.short] || recommendationMap["Trusted Data"]).map(
        (item) =>
          locale === "en-US"
            ? {
                ...item,
                type: localizeDemoSystemText(
                  item.type,
                  locale,
                ) as Recommendation["type"],
                rationale: localizeDemoSystemText(item.rationale, locale),
              }
            : item,
      );
  const latestMeeting = meetings[0];
  const challengeSummary =
    latestMeeting?.summary ||
    answers[0]?.answer?.slice(0, 240) ||
    localizedText(
      locale,
      "Initial context is being built; record a meeting to generate account intelligence.",
      "Contexto inicial em construção; registre uma reunião para gerar inteligência da conta.",
    );
  const nextEngagement =
    latestMeeting?.insights.nextActions?.[0] ||
    recommendations[2]?.name ||
    localizedText(locale, "Deepen discovery", "Aprofundar descoberta");
  const priority =
    top.alignment >= 75 && top.readiness >= 60
      ? "Alta"
      : top.alignment >= 50
        ? "Média"
        : "Baixa";
  return {
    scores,
    recommendations,
    challengeSummary,
    nextEngagement,
    priority,
  };
}

function buildAccountMap(
  discovery: { customerName: string; industry: string; scores: Score[] },
  answers: Answer[],
  meetings: Meeting[],
): AccountMap {
  const latest = meetings[0]?.insights;
  const topScores = discovery.scores.slice(0, 4);
  const nodes: AccountNode[] = [
    {
      id: "account",
      type: "area",
      label: discovery.customerName,
      detail: discovery.industry,
      strength: 95,
    },
    ...compact(latest?.stakeholders || []).map((item, index) => ({
      id: `person-${index}`,
      type: "person" as const,
      label: item,
      detail: "Stakeholder identificado em reunião",
      strength: 82 - index * 5,
    })),
    ...compact(latest?.systems || []).map((item, index) => ({
      id: `system-${index}`,
      type: "system" as const,
      label: item,
      detail: "Sistema/plataforma citado",
      strength: 76 - index * 4,
    })),
    ...compact(latest?.painPoints || []).map((item, index) => ({
      id: `pain-${index}`,
      type: "pain" as const,
      label: item,
      detail: "Dor de negócio ou tecnologia",
      strength: 88 - index * 5,
    })),
    ...compact(latest?.risks || [])
      .slice(0, 3)
      .map((item, index) => ({
        id: `risk-${index}`,
        type: "risk" as const,
        label: item,
        detail: "Lacuna para validar antes do CRM",
        strength: 68 - index * 4,
      })),
    ...topScores.map((item, index) => ({
      id: `cap-${index}`,
      type: "capability" as const,
      label: item.short,
      detail: item.name,
      strength: item.alignment,
    })),
  ];
  if (!meetings.length) {
    nodes.push(
      ...answers.slice(0, 3).map((item, index) => ({
        id: `initiative-${index}`,
        type: "initiative" as const,
        label: item.question.slice(0, 48),
        detail: item.answer.slice(0, 120),
        strength: 54 + index * 4,
      })),
    );
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: AccountEdge[] = [
    ...nodes
      .filter(
        (node) =>
          node.id !== "account" &&
          ["person", "system", "pain", "initiative"].includes(node.type),
      )
      .map(
        (node) =>
          ({
            source: "account",
            target: node.id,
            label: node.type === "person" ? "decisor de" : "impacta",
          }) as AccountEdge,
      ),
    ...nodes
      .filter((node) => node.type === "pain")
      .flatMap((pain) =>
        topScores.slice(0, 2).map((_, index) => ({
          source: pain.id,
          target: `cap-${index}`,
          label: "possível aderência" as const,
        })),
      ),
    ...nodes
      .filter((node) => node.type === "risk")
      .map((risk) => ({
        source: risk.id,
        target: "account",
        label: "risco associado" as const,
      })),
  ]
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, 18);
  return { nodes, edges, updatedAt: new Date().toISOString() };
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS discoveries (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, industry TEXT NOT NULL, company_size TEXT NOT NULL, owner TEXT NOT NULL, stage TEXT NOT NULL, progress INTEGER NOT NULL, priority TEXT NOT NULL, challenge_summary TEXT NOT NULL, answers_json TEXT NOT NULL, scores_json TEXT NOT NULL, recommendations_json TEXT NOT NULL, next_engagement TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, discovery_id TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL, summary TEXT NOT NULL, insights_json TEXT NOT NULL, ai_status TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_maps (discovery_id TEXT PRIMARY KEY, nodes_json TEXT NOT NULL, edges_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS stakeholders (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, area TEXT NOT NULL, reports_to_id TEXT, influence TEXT NOT NULL, stance TEXT NOT NULL, priorities_json TEXT NOT NULL, notes TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_events (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, evidence_status TEXT NOT NULL, confidence INTEGER NOT NULL, occurred_at TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_entities (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, confidence INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_memory (discovery_id TEXT PRIMARY KEY, executive_summary TEXT NOT NULL, known_json TEXT NOT NULL, assumptions_json TEXT NOT NULL, gaps_json TEXT NOT NULL, changes_json TEXT NOT NULL, ai_status TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_actions (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, stakeholder_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL, rationale TEXT NOT NULL, next_step TEXT NOT NULL, impact INTEGER NOT NULL, urgency INTEGER NOT NULL, confidence INTEGER NOT NULL, maturity INTEGER NOT NULL, priority_score INTEGER NOT NULL, status TEXT NOT NULL, due_at TEXT, evidence_json TEXT NOT NULL, dedupe_key TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS opportunity_hypotheses (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, capability_key TEXT NOT NULL, title TEXT NOT NULL, problem TEXT NOT NULL, products_json TEXT NOT NULL, stakeholder_ids_json TEXT NOT NULL, evidence_json TEXT NOT NULL, gaps_json TEXT NOT NULL, confidence INTEGER NOT NULL, stage TEXT NOT NULL, next_step TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_plans (discovery_id TEXT PRIMARY KEY, priorities_json TEXT NOT NULL, initiatives_json TEXT NOT NULL, objectives_json TEXT NOT NULL, risks_json TEXT NOT NULL, ecosystem_json TEXT NOT NULL, relationship_json TEXT NOT NULL, plan_30_json TEXT NOT NULL, plan_60_json TEXT NOT NULL, plan_90_json TEXT NOT NULL, approval_status TEXT NOT NULL, suggestion_json TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, r2_key TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS document_chunks (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, discovery_id TEXT NOT NULL, ordinal INTEGER NOT NULL, content TEXT NOT NULL, page INTEGER, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_chat_messages (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, citations_json TEXT NOT NULL, ai_status TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS ai_runs (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, agent TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, confidence INTEGER NOT NULL, source_ids_json TEXT NOT NULL, validated INTEGER NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_embeddings (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, chunk_ordinal INTEGER NOT NULL DEFAULT 0, content_hash TEXT NOT NULL, model TEXT NOT NULL, dimensions INTEGER NOT NULL DEFAULT 768, vector_json TEXT NOT NULL, content_preview TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS ai_cache (id TEXT PRIMARY KEY, cache_key TEXT NOT NULL, discovery_id TEXT, task TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, response_json TEXT NOT NULL, usage_json TEXT NOT NULL DEFAULT '{}', expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS daily_briefings (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, briefing_date TEXT NOT NULL, account_ids_json TEXT NOT NULL DEFAULT '[]', content_json TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, generated_at TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS daily_briefing_variants (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, briefing_date TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'en-US', account_ids_json TEXT NOT NULL DEFAULT '[]', content_json TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, generated_at TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS content_translations (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, source_type TEXT NOT NULL, source_id TEXT NOT NULL, source_fingerprint TEXT NOT NULL, source_locale TEXT, target_locale TEXT NOT NULL, translated_text TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'completed', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_snapshots (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, reason TEXT NOT NULL, snapshot_json TEXT NOT NULL, confidence INTEGER NOT NULL DEFAULT 0, source_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_relationships (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, source_stakeholder_id TEXT NOT NULL, target_stakeholder_id TEXT NOT NULL, relation_type TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', confidence INTEGER NOT NULL DEFAULT 50, evidence_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_graph_layouts (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, mode TEXT NOT NULL, nodes_json TEXT NOT NULL DEFAULT '[]', viewport_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS external_signals (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, query_fingerprint TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, source_url TEXT NOT NULL, publisher TEXT NOT NULL DEFAULT '', published_at TEXT, citation_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'proposed', confidence INTEGER NOT NULL DEFAULT 0, approved_at TEXT, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS action_feedback (id TEXT PRIMARY KEY, action_id TEXT NOT NULL, discovery_id TEXT NOT NULL, feedback_type TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', adjustment INTEGER NOT NULL DEFAULT 0, previous_status TEXT NOT NULL DEFAULT '', new_status TEXT NOT NULL DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS guided_discovery_sessions (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, owner_email TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'adaptive' CHECK(mode IN ('adaptive','direct')), catalog_version TEXT NOT NULL, selected_pillars_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','paused','completed')), progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100), coverage_percent INTEGER NOT NULL DEFAULT 0 CHECK(coverage_percent BETWEEN 0 AND 100), current_question_id TEXT, checkpoint_count INTEGER NOT NULL DEFAULT 0 CHECK(checkpoint_count >= 0), ai_status TEXT, started_at TEXT NOT NULL, completed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS guided_discovery_questions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES guided_discovery_sessions(id) ON DELETE CASCADE, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, catalog_question_id TEXT, pillar TEXT NOT NULL, prompt TEXT NOT NULL, hint TEXT, input_schema_json TEXT NOT NULL DEFAULT '{}', source TEXT NOT NULL DEFAULT 'catalog' CHECK(source IN ('catalog','ai')), rationale TEXT, citations_json TEXT NOT NULL DEFAULT '[]', sequence INTEGER NOT NULL DEFAULT 0 CHECK(sequence >= 0), status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','active','answered','dismissed')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS guided_discovery_answers (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES guided_discovery_sessions(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES guided_discovery_questions(id) ON DELETE CASCADE, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, structured_json TEXT NOT NULL DEFAULT '{}', answer_text TEXT NOT NULL DEFAULT '', evidence_status TEXT NOT NULL DEFAULT 'reported' CHECK(evidence_status IN ('confirmed','reported','hypothesis','unknown')), stakeholder_id TEXT REFERENCES stakeholders(id) ON DELETE SET NULL, source_type TEXT, source_id TEXT, source_date TEXT, confidence INTEGER NOT NULL DEFAULT 0 CHECK(confidence BETWEEN 0 AND 100), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','confirmed','unknown')), supersedes_id TEXT REFERENCES guided_discovery_answers(id) ON DELETE SET NULL, is_current INTEGER NOT NULL DEFAULT 1 CHECK(is_current IN (0,1)), answered_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS guided_discovery_pillar_status (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, owner_email TEXT NOT NULL, pillar_key TEXT NOT NULL, catalog_version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','reviewed_sufficient','reviewed_gaps','not_relevant')), current_session_id TEXT REFERENCES guided_discovery_sessions(id) ON DELETE SET NULL, progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100), coverage_percent INTEGER NOT NULL DEFAULT 0 CHECK(coverage_percent BETWEEN 0 AND 100), confidence_percent INTEGER NOT NULL DEFAULT 0 CHECK(confidence_percent BETWEEN 0 AND 100), answered_count INTEGER NOT NULL DEFAULT 0 CHECK(answered_count >= 0), required_count INTEGER NOT NULL DEFAULT 6 CHECK(required_count >= 0), not_relevant_reason TEXT, reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS cdi_capability_snapshots (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, catalog_version TEXT NOT NULL, capability_key TEXT NOT NULL, maturity_json TEXT NOT NULL DEFAULT '{}', confidence INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_started', evidence_fingerprint TEXT NOT NULL DEFAULT '', computed_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS cdi_evidence (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, answer_id TEXT, question_id TEXT NOT NULL, capability_key TEXT NOT NULL, dimension TEXT NOT NULL, response TEXT NOT NULL, polarity TEXT, strength INTEGER NOT NULL DEFAULT 0, source_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS cdi_conflicts (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, capability_key TEXT NOT NULL, dimension TEXT NOT NULL, evidence_ids_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'open', resolution_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS cdi_technology_reviews (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, technology_id TEXT NOT NULL, catalog_version TEXT NOT NULL, fit_score INTEGER NOT NULL DEFAULT 0, confidence INTEGER NOT NULL DEFAULT 0, decision_band TEXT NOT NULL, gate_status TEXT NOT NULL, components_json TEXT NOT NULL DEFAULT '{}', trace_json TEXT NOT NULL DEFAULT '[]', human_decision TEXT, reviewed_at TEXT, computed_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS stakeholder_capability_assignments (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, stakeholder_id TEXT NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE, capability_key TEXT NOT NULL, assignment_role TEXT NOT NULL CHECK(assignment_role IN ('owner','decision_maker','influencer','technical_contact')), status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','suggested','dismissed')), confidence INTEGER NOT NULL DEFAULT 100 CHECK(confidence BETWEEN 0 AND 100), source_type TEXT NOT NULL DEFAULT 'manual', source_id TEXT, evidence_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS cdi_answer_impacts (id TEXT PRIMARY KEY NOT NULL, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, answer_id TEXT NOT NULL REFERENCES guided_discovery_answers(id) ON DELETE CASCADE, question_id TEXT NOT NULL, catalog_version TEXT NOT NULL, capability_key TEXT NOT NULL, dimension TEXT NOT NULL, response TEXT NOT NULL, evidence_id TEXT, before_json TEXT NOT NULL DEFAULT '{}', after_json TEXT NOT NULL DEFAULT '{}', delta_json TEXT NOT NULL DEFAULT '{}', journey_ids_json TEXT NOT NULL DEFAULT '[]', technology_ids_json TEXT NOT NULL DEFAULT '[]', gate_changes_json TEXT NOT NULL DEFAULT '[]', recommendation_changes_json TEXT NOT NULL DEFAULT '[]', rule_trace_json TEXT NOT NULL DEFAULT '{}', source_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_change_sets (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, source_type TEXT NOT NULL, source_id TEXT NOT NULL, trigger_type TEXT NOT NULL, before_json TEXT NOT NULL DEFAULT '{}', after_json TEXT NOT NULL DEFAULT '{}', delta_json TEXT NOT NULL DEFAULT '{}', suggestions_json TEXT NOT NULL DEFAULT '{}', provider TEXT NOT NULL DEFAULT 'deterministic-rules', engine_kind TEXT NOT NULL DEFAULT 'deterministic' CHECK(engine_kind IN ('deterministic','model')), status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected')), reviewed_by TEXT, reviewed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS commercial_agent_runs (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, workflow_id TEXT NOT NULL, change_set_id TEXT REFERENCES account_change_sets(id) ON DELETE SET NULL, agent TEXT NOT NULL, engine_kind TEXT NOT NULL DEFAULT 'deterministic' CHECK(engine_kind IN ('deterministic','model')), provider TEXT NOT NULL DEFAULT 'deterministic-rules', model TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, conclusion TEXT NOT NULL, confidence INTEGER NOT NULL DEFAULT 0, source_ids_json TEXT NOT NULL DEFAULT '[]', output_json TEXT NOT NULL DEFAULT '{}', human_validation_status TEXT NOT NULL DEFAULT 'pending', started_at TEXT NOT NULL, completed_at TEXT, created_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS crm_handoffs (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, hypothesis_id TEXT REFERENCES opportunity_hypotheses(id) ON DELETE SET NULL, version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'preview' CHECK(status IN ('preview','approved','handed_off','returned')), payload_json TEXT NOT NULL DEFAULT '{}', qualification_json TEXT NOT NULL DEFAULT '{}', copy_text TEXT NOT NULL DEFAULT '', export_json TEXT NOT NULL DEFAULT '{}', source_ids_json TEXT NOT NULL DEFAULT '[]', approved_by TEXT, approved_at TEXT, handed_off_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS account_impact_metrics (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE, discovery_started_at TEXT NOT NULL, qualified_at TEXT, elapsed_minutes INTEGER NOT NULL DEFAULT 0, questions_addressed INTEGER NOT NULL DEFAULT 0, questions_confirmed INTEGER NOT NULL DEFAULT 0, discovery_coverage INTEGER NOT NULL DEFAULT 0, open_gaps INTEGER NOT NULL DEFAULT 0, evidence_count INTEGER NOT NULL DEFAULT 0, confirmed_evidence_count INTEGER NOT NULL DEFAULT 0, meeting_count INTEGER NOT NULL DEFAULT 0, qualified_hypothesis_count INTEGER NOT NULL DEFAULT 0, methodology_json TEXT NOT NULL DEFAULT '{}', computed_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS discoveries_updated_idx ON discoveries(updated_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS meetings_discovery_created_idx ON meetings(discovery_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS stakeholders_discovery_idx ON stakeholders(discovery_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS stakeholders_reports_to_idx ON stakeholders(reports_to_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS account_events_discovery_idx ON account_events(discovery_id, occurred_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS account_actions_discovery_idx ON account_actions(discovery_id, status, priority_score)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS account_actions_dedupe_idx ON account_actions(discovery_id, dedupe_key)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS opportunity_hypotheses_key_idx ON opportunity_hypotheses(discovery_id, capability_key)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS document_chunks_discovery_idx ON document_chunks(discovery_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS account_embeddings_discovery_idx ON account_embeddings(discovery_id)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS account_embeddings_source_idx ON account_embeddings(discovery_id, source_type, source_id, chunk_ordinal, model)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_key_idx ON ai_cache(cache_key)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS daily_briefings_owner_date_idx ON daily_briefings(owner_email, briefing_date)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS daily_briefing_variants_owner_date_locale_idx ON daily_briefing_variants(owner_email, briefing_date, locale)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS daily_briefing_variants_expires_at_idx ON daily_briefing_variants(expires_at)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS content_translations_source_locale_idx ON content_translations(discovery_id, source_type, source_id, source_fingerprint, target_locale)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS content_translations_discovery_idx ON content_translations(discovery_id)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS account_relationships_relation_idx ON account_relationships(discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS account_graph_layouts_account_mode_idx ON account_graph_layouts(discovery_id, mode)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS external_signals_account_status_idx ON external_signals(discovery_id, status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS action_feedback_account_time_idx ON action_feedback(discovery_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_sessions_account_status_idx ON guided_discovery_sessions(discovery_id, status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_sessions_owner_idx ON guided_discovery_sessions(owner_email)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS guided_discovery_questions_catalog_idx ON guided_discovery_questions(session_id, catalog_question_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_questions_session_sequence_idx ON guided_discovery_questions(session_id, sequence)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_questions_account_pillar_idx ON guided_discovery_questions(discovery_id, pillar)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_questions_session_status_idx ON guided_discovery_questions(session_id, status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_answers_session_question_current_idx ON guided_discovery_answers(session_id, question_id, is_current)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_answers_account_idx ON guided_discovery_answers(discovery_id)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS guided_discovery_pillar_status_account_pillar_version_idx ON guided_discovery_pillar_status(discovery_id, owner_email, pillar_key, catalog_version)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS guided_discovery_pillar_status_owner_status_idx ON guided_discovery_pillar_status(owner_email, status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS cdi_capability_snapshots_account_idx ON cdi_capability_snapshots(discovery_id, capability_key, computed_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS cdi_evidence_account_capability_idx ON cdi_evidence(discovery_id, capability_key)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS cdi_evidence_answer_idx ON cdi_evidence(discovery_id, answer_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS cdi_conflicts_account_status_idx ON cdi_conflicts(discovery_id, status)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS cdi_technology_reviews_account_idx ON cdi_technology_reviews(discovery_id, technology_id, catalog_version)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS stakeholder_capability_assignments_unique_idx ON stakeholder_capability_assignments(discovery_id, stakeholder_id, capability_key, assignment_role)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS stakeholder_capability_assignments_account_capability_idx ON stakeholder_capability_assignments(discovery_id, capability_key, status)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS stakeholder_capability_assignments_stakeholder_idx ON stakeholder_capability_assignments(stakeholder_id, status)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS cdi_answer_impacts_answer_idx ON cdi_answer_impacts(discovery_id, answer_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS cdi_answer_impacts_account_time_idx ON cdi_answer_impacts(discovery_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS cdi_answer_impacts_capability_idx ON cdi_answer_impacts(discovery_id, capability_key, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS account_change_sets_account_time_idx ON account_change_sets(discovery_id, created_at)",
    ),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS account_change_sets_source_idx ON account_change_sets(discovery_id, source_type, source_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS commercial_agent_runs_account_time_idx ON commercial_agent_runs(discovery_id, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS commercial_agent_runs_workflow_idx ON commercial_agent_runs(workflow_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS crm_handoffs_account_time_idx ON crm_handoffs(discovery_id, updated_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS account_impact_metrics_account_time_idx ON account_impact_metrics(discovery_id, computed_at)",
    ),
  ]);
  await ensureColumn(db, "discoveries", "owner_email", "TEXT");
  await ensureColumn(
    db,
    "discoveries",
    "visibility",
    "TEXT NOT NULL DEFAULT 'demo'",
  );
  await ensureColumn(db, "discoveries", "last_analyzed_at", "TEXT");
  await ensureColumn(
    db,
    "discoveries",
    "data_classification",
    "TEXT NOT NULL DEFAULT 'test'",
  );
  await ensureColumn(db, "discoveries", "company_domain", "TEXT");
  await ensureColumn(db, "meetings", "scheduled_at", "TEXT");
  await ensureColumn(
    db,
    "meetings",
    "attendees_json",
    "TEXT NOT NULL DEFAULT '[]'",
  );
  await ensureColumn(db, "meetings", "objective", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(
    db,
    "meetings",
    "preparation_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
  await ensureColumn(
    db,
    "meetings",
    "meeting_status",
    "TEXT NOT NULL DEFAULT 'completed'",
  );
  await ensureColumn(
    db,
    "account_actions",
    "why_now",
    "TEXT NOT NULL DEFAULT ''",
  );
  await ensureColumn(
    db,
    "account_actions",
    "effort",
    "INTEGER NOT NULL DEFAULT 50",
  );
  await ensureColumn(
    db,
    "account_actions",
    "expected_outcome",
    "TEXT NOT NULL DEFAULT ''",
  );
  await ensureColumn(
    db,
    "account_actions",
    "conversation_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
  await ensureColumn(db, "account_actions", "snoozed_until", "TEXT");
  await ensureColumn(db, "account_actions", "feedback_reason", "TEXT");
  await ensureColumn(
    db,
    "account_actions",
    "rank_adjustment",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await ensureColumn(db, "ai_runs", "model", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(
    db,
    "ai_runs",
    "prompt_tokens",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await ensureColumn(
    db,
    "ai_runs",
    "output_tokens",
    "INTEGER NOT NULL DEFAULT 0",
  );
  await ensureColumn(db, "ai_runs", "latency_ms", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "cache_hit", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "error_code", "TEXT");
  await ensureColumn(db, "ai_runs", "locale", "TEXT NOT NULL DEFAULT 'en-US'");
}

async function ensureColumn(
  db: D1Database,
  table: string,
  column: string,
  definition: string,
) {
  const info = await db
    .prepare(`PRAGMA table_info(${table})`)
    .all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === column))
    await db
      .prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
      .run();
}

function mapStakeholder(row: Record<string, unknown>): Stakeholder {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    name: String(row.name),
    role: String(row.role),
    area: String(row.area),
    reportsToId: row.reports_to_id ? String(row.reports_to_id) : null,
    influence: String(row.influence) as Stakeholder["influence"],
    stance: String(row.stance) as Stakeholder["stance"],
    priorities: JSON.parse(String(row.priorities_json || "[]")),
    notes: String(row.notes || ""),
    source: String(row.source || "manual") as Stakeholder["source"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function seedStakeholderTrees(db: D1Database, discoveryIds: string[]) {
  if (!discoveryIds.length) return;
  const placeholders = discoveryIds.map(() => "?").join(",");
  const discoveries = await db
    .prepare(
      `SELECT id, industry, created_at FROM discoveries WHERE id IN (${placeholders})`,
    )
    .bind(...discoveryIds)
    .all<Record<string, unknown>>();
  for (const discovery of discoveries.results) {
    const discoveryId = String(discovery.id);
    const existing = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM stakeholders WHERE discovery_id = ?",
      )
      .bind(discoveryId)
      .first<{ count: number }>();
    if ((existing?.count || 0) > 0) continue;
    const createdAt = String(discovery.created_at || new Date().toISOString());
    const industry = String(discovery.industry || "negócio").toLowerCase();
    const people = [
      {
        id: `${discoveryId}-ceo`,
        name: "CEO (a identificar)",
        role: "Chief Executive Officer",
        area: "Diretoria executiva",
        parent: null,
        influence: "Alta",
        stance: "Desconhecido",
        priorities: [
          "Crescimento",
          "Eficiência operacional",
          `Estratégia de ${industry}`,
        ],
        notes:
          "Mapeie prioridades executivas, métricas e patrocinadores da transformação.",
      },
      {
        id: `${discoveryId}-cio`,
        name: "CIO (a identificar)",
        role: "Chief Information Officer",
        area: "Tecnologia",
        parent: `${discoveryId}-ceo`,
        influence: "Alta",
        stance: "Neutro",
        priorities: ["FinOps", "Trusted Data", "Hybrid Cloud"],
        notes:
          "Validar agenda de dados, cloud, governança e investimento tecnológico.",
      },
      {
        id: `${discoveryId}-cto`,
        name: "CTO (a identificar)",
        role: "Chief Technology Officer",
        area: "Arquitetura e engenharia",
        parent: `${discoveryId}-ceo`,
        influence: "Alta",
        stance: "Neutro",
        priorities: ["App Modernization", "Automation", "Arquitetura híbrida"],
        notes:
          "Entender dependências técnicas, plataformas e capacidade de execução.",
      },
    ] as const;
    for (const person of people) {
      await db
        .prepare(
          "INSERT OR IGNORE INTO stakeholders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          person.id,
          discoveryId,
          person.name,
          person.role,
          person.area,
          person.parent,
          person.influence,
          person.stance,
          JSON.stringify(person.priorities),
          person.notes,
          "suggested",
          createdAt,
          createdAt,
        )
        .run();
    }
    await db
      .prepare(
        "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(
        discoveryId,
        "stakeholder",
        "Organograma inicial sugerido para validação humana",
        createdAt,
      )
      .run();
  }
}

async function seed(db: D1Database) {
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM discoveries")
    .first<{ count: number }>();
  const now = new Date();
  const examples = [
    {
      id: "aurora-retail",
      name: "Aurora Retail Group",
      industry: "Varejo",
      size: "Enterprise",
      answers: [
        {
          key: "context",
          question: "Qual evento de negócio abriu essa conversa?",
          answer:
            "Reduzir o custo operacional do e-commerce e recuperar previsibilidade dos investimentos em cloud sem comprometer a experiência do cliente.",
          at: new Date(now.getTime() - 46e5).toISOString(),
        },
        {
          key: "landscape",
          question:
            "Como está organizado o ambiente de tecnologia e nuvem hoje?",
          answer:
            "Operamos em AWS e Azure, além de aplicações legadas no datacenter. O rateio por unidade e produto é pouco confiável.",
          at: new Date(now.getTime() - 42e5).toISOString(),
        },
        {
          key: "finops",
          question:
            "Onde existem sinais de desperdício, risco ou falta de previsibilidade?",
          answer:
            "A fatura cloud cresceu 34%, existem recursos ociosos e não temos forecast nem accountability clara entre finanças e engenharia.",
          at: new Date(now.getTime() - 38e5).toISOString(),
        },
      ] as Answer[],
      meeting:
        "Reunião com CFO e engenharia. O CFO quer previsibilidade trimestral e o time técnico citou AWS, Azure, recursos ociosos e dificuldade de rateio por produto.",
    },
    {
      id: "banco-horizonte",
      name: "Banco Horizonte",
      industry: "Serviços financeiros",
      size: "Enterprise",
      answers: [
        {
          key: "context",
          question: "Qual evento de negócio abriu essa conversa?",
          answer:
            "Acelerar casos de IA generativa com dados confiáveis e controles compatíveis com o ambiente regulado.",
          at: new Date(now.getTime() - 864e5).toISOString(),
        },
        {
          key: "data",
          question: "O que impede o uso confiável de dados?",
          answer:
            "Linhas de negócio não confiam na qualidade, a linhagem é parcial e o catálogo não cobre dados sensíveis.",
          at: new Date(now.getTime() - 720e5).toISOString(),
        },
      ] as Answer[],
      meeting:
        "CIO e líder de dados querem levar GenAI para atendimento, mas a arquitetura tem lakehouse, mainframe e catálogo incompleto. CISO pediu auditoria de modelos e controle LGPD.",
    },
    {
      id: "novalog",
      name: "NovaLog",
      industry: "Logística",
      size: "Large",
      answers: [
        {
          key: "context",
          question: "Qual evento de negócio abriu essa conversa?",
          answer:
            "Melhorar produtividade da operação e reduzir atrasos causados por processos manuais.",
          at: new Date(now.getTime() - 2 * 864e5).toISOString(),
        },
      ] as Answer[],
      meeting:
        "Operações relatou processos manuais entre transporte, armazém e clientes. Há integrações ponto a ponto e baixa visibilidade de custo por rota.",
    },
    {
      id: "solaris-energia",
      name: "Solaris Energia",
      industry: "Energia",
      size: "Enterprise",
      answers: [
        {
          key: "context",
          question: "Qual evento de negócio abriu essa conversa?",
          answer:
            "Criar uma fundação de dados industriais segura para analytics e manutenção preditiva.",
          at: new Date(now.getTime() - 3 * 864e5).toISOString(),
        },
        {
          key: "data",
          question: "O que impede o uso confiável de dados?",
          answer:
            "Falta governança comum, catálogo e qualidade consistente entre dados industriais e corporativos.",
          at: new Date(now.getTime() - 2.4 * 864e5).toISOString(),
        },
      ] as Answer[],
      meeting:
        "Dados OT e IT estão distribuídos entre plantas, cloud e sistemas de fornecedores. O sponsor quer analytics confiável e segurança para dados industriais.",
    },
  ];

  if ((count?.count || 0) > 0) {
    const meetingCount = await db
      .prepare("SELECT COUNT(*) AS count FROM meetings")
      .first<{ count: number }>();
    if ((meetingCount?.count || 0) > 0) return;
    const existing = await db.prepare("SELECT * FROM discoveries").all();
    for (const row of existing.results as Record<string, unknown>[]) {
      const id = String(row.id);
      const customerName = String(row.customer_name);
      const industry = String(row.industry || "Indústria não informada");
      const answers = JSON.parse(String(row.answers_json || "[]")) as Answer[];
      const currentScores = JSON.parse(
        String(row.scores_json || "[]"),
      ) as Score[];
      const notes = [
        `Contexto legado de ${customerName}.`,
        String(row.challenge_summary || ""),
        ...answers.map((item) => `${item.question}: ${item.answer}`),
      ]
        .filter(Boolean)
        .join(" ");
      const insight = fallbackMeetingInsights(notes, customerName);
      const createdAt = String(
        row.updated_at || row.created_at || now.toISOString(),
      );
      const meeting: Meeting = {
        id: `${id}-legacy-intelligence`,
        discoveryId: id,
        title: "Contexto migrado para Account Intelligence",
        notes,
        summary: insight.summary,
        insights: insight,
        aiStatus: "fallback",
        createdAt,
      };
      const result = analyze(answers, [meeting]);
      const accountMap = buildAccountMap(
        {
          customerName,
          industry,
          scores: currentScores.length ? currentScores : result.scores,
        },
        answers,
        [meeting],
      );
      await db
        .prepare(
          "INSERT OR IGNORE INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          meeting.id,
          meeting.discoveryId,
          meeting.title,
          meeting.notes,
          meeting.summary,
          JSON.stringify(meeting.insights),
          meeting.aiStatus,
          meeting.createdAt,
        )
        .run();
      await db
        .prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)")
        .bind(
          id,
          JSON.stringify(accountMap.nodes),
          JSON.stringify(accountMap.edges),
          accountMap.updatedAt,
        )
        .run();
      await db
        .prepare(
          "UPDATE discoveries SET challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?",
        )
        .bind(
          result.challengeSummary,
          JSON.stringify(result.scores),
          JSON.stringify(result.recommendations),
          result.nextEngagement,
          createdAt,
          id,
        )
        .run();
      await db
        .prepare(
          "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(
          id,
          "migration",
          "Registro legado enriquecido para Account Intelligence v2 com fallback determinístico",
          createdAt,
        )
        .run();
    }
    return;
  }

  for (const example of examples) {
    const insight = fallbackMeetingInsights(example.meeting, example.name);
    const meeting: Meeting = {
      id: `${example.id}-meeting-1`,
      discoveryId: example.id,
      title: "Reunião de contexto inicial",
      notes: example.meeting,
      summary: insight.summary,
      insights: insight,
      aiStatus: insight.aiStatus,
      createdAt: example.answers.at(-1)?.at || now.toISOString(),
    };
    const result = analyze(example.answers, [meeting]);
    const updated = meeting.createdAt;
    await db
      .prepare(
        "INSERT INTO discoveries (id, customer_name, industry, company_size, owner, stage, progress, priority, challenge_summary, answers_json, scores_json, recommendations_json, next_engagement, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        example.id,
        example.name,
        example.industry,
        example.size,
        "Mariana Costa",
        example.answers.length >= 5
          ? "Qualificação pré-CRM"
          : "Account intelligence",
        Math.min(100, 20 + example.answers.length * 12 + 22),
        result.priority,
        result.challengeSummary,
        JSON.stringify(example.answers),
        JSON.stringify(result.scores),
        JSON.stringify(result.recommendations),
        result.nextEngagement,
        now.toISOString(),
        updated,
      )
      .run();
    await db
      .prepare(
        "INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        meeting.id,
        meeting.discoveryId,
        meeting.title,
        meeting.notes,
        meeting.summary,
        JSON.stringify(meeting.insights),
        meeting.aiStatus,
        meeting.createdAt,
      )
      .run();
    const accountMap = buildAccountMap(
      {
        customerName: example.name,
        industry: example.industry,
        scores: result.scores,
      },
      example.answers,
      [meeting],
    );
    await db
      .prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(
        example.id,
        JSON.stringify(accountMap.nodes),
        JSON.stringify(accountMap.edges),
        accountMap.updatedAt,
      )
      .run();
    await db
      .prepare(
        "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(
        example.id,
        "meeting",
        `Reunião analisada por ${meeting.aiStatus === "watsonx" ? "watsonx" : "fallback determinístico"}`,
        updated,
      )
      .run();
  }
}

const json = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value ?? "")) as T;
  } catch {
    return fallback;
  }
};

function mapMeeting(row: Record<string, unknown>): Meeting & {
  scheduledAt: string | null;
  attendees: string[];
  objective: string;
  preparation: Record<string, unknown>;
  meetingStatus: string;
} {
  const insights = json<MeetingInsight>(
    row.insights_json,
    fallbackMeetingInsights(String(row.notes || ""), "a conta"),
  );
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    title: String(row.title),
    notes: String(row.notes || ""),
    summary: String(row.summary || ""),
    insights: {
      ...insights,
      aiStatus:
        (row.ai_status as MeetingInsight["aiStatus"]) ||
        insights.aiStatus ||
        "fallback",
    },
    aiStatus: (row.ai_status as Meeting["aiStatus"]) || "fallback",
    createdAt: String(row.created_at),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    attendees: json<string[]>(row.attendees_json, []),
    objective: String(row.objective || ""),
    preparation: json<Record<string, unknown>>(row.preparation_json, {}),
    meetingStatus: String(row.meeting_status || "completed"),
  };
}

function mapAccountEvent(row: Record<string, unknown>): AccountEvent {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    type: String(row.type),
    title: String(row.title),
    content: String(row.content),
    sourceType: String(row.source_type),
    sourceId: row.source_id ? String(row.source_id) : null,
    evidenceStatus: String(
      row.evidence_status,
    ) as AccountEvent["evidenceStatus"],
    confidence: Number(row.confidence),
    occurredAt: String(row.occurred_at),
    createdAt: String(row.created_at),
  };
}

function mapMemory(row?: Record<string, unknown> | null): AccountMemory | null {
  if (!row) return null;
  return {
    executiveSummary: String(row.executive_summary),
    known: json<string[]>(row.known_json, []),
    assumptions: json<string[]>(row.assumptions_json, []),
    gaps: json<string[]>(row.gaps_json, []),
    changes: json<string[]>(row.changes_json, []),
    aiStatus: String(row.ai_status) as AccountMemory["aiStatus"],
    version: Number(row.version),
    updatedAt: String(row.updated_at),
  };
}

function mapAction(row: Record<string, unknown>): AccountAction {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    stakeholderId: row.stakeholder_id ? String(row.stakeholder_id) : null,
    type: String(row.type),
    title: String(row.title),
    rationale: String(row.rationale),
    whyNow: String(row.why_now || row.rationale || ""),
    nextStep: String(row.next_step),
    impact: Number(row.impact),
    urgency: Number(row.urgency),
    confidence: Number(row.confidence),
    maturity: Number(row.maturity),
    effort: Number(row.effort || 50),
    priorityScore: Math.max(
      0,
      Math.min(
        100,
        Number(row.priority_score) + Number(row.rank_adjustment || 0),
      ),
    ),
    status: String(row.status),
    dueAt: row.due_at ? String(row.due_at) : null,
    expectedOutcome: String(row.expected_outcome || ""),
    conversation: json<AccountAction["conversation"]>(row.conversation_json, {
      stakeholder: "Stakeholder a identificar",
      theme: "prioridade estratégica",
      opener: "Validar contexto e prioridade.",
      questions: [],
      objection: "Ainda não há evidência suficiente.",
      successCriterion: "Confirmar um próximo passo com prazo.",
    }),
    snoozedUntil: row.snoozed_until ? String(row.snoozed_until) : null,
    feedbackReason: row.feedback_reason ? String(row.feedback_reason) : null,
    rankAdjustment: Number(row.rank_adjustment || 0),
    evidence: json<EvidenceRef[]>(row.evidence_json, []),
    dedupeKey: String(row.dedupe_key),
    evidenceFingerprint: String(row.evidence_fingerprint),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapHypothesis(row: Record<string, unknown>): Hypothesis {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    capabilityKey: String(row.capability_key),
    title: String(row.title),
    problem: String(row.problem),
    products: json<string[]>(row.products_json, []),
    stakeholderIds: json<string[]>(row.stakeholder_ids_json, []),
    evidence: json<EvidenceRef[]>(row.evidence_json, []),
    gaps: json<string[]>(row.gaps_json, []),
    confidence: Number(row.confidence),
    stage: String(row.stage),
    nextStep: String(row.next_step),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPlan(row?: Record<string, unknown> | null): AccountPlan | null {
  if (!row) return null;
  return {
    discoveryId: String(row.discovery_id),
    priorities: json<string[]>(row.priorities_json, []),
    initiatives: json<string[]>(row.initiatives_json, []),
    objectives: json<string[]>(row.objectives_json, []),
    risks: json<string[]>(row.risks_json, []),
    ecosystem: json<string[]>(row.ecosystem_json, []),
    relationship: json<string[]>(row.relationship_json, []),
    plan30: json<string[]>(row.plan_30_json, []),
    plan60: json<string[]>(row.plan_60_json, []),
    plan90: json<string[]>(row.plan_90_json, []),
    approvalStatus: String(row.approval_status),
    suggestion: json<Record<string, string[]>>(row.suggestion_json, {}),
    updatedAt: String(row.updated_at),
  };
}

function mapChangeSet(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    sourceType: String(row.source_type),
    sourceId: String(row.source_id),
    triggerType: String(row.trigger_type),
    before: json<CommercialState>(row.before_json, {} as CommercialState),
    after: json<CommercialState>(row.after_json, {} as CommercialState),
    delta: json<Record<string, unknown>>(row.delta_json, {}),
    suggestions: json<ChangeSetSuggestions>(row.suggestions_json, {
      stakeholders: [],
      systems: [],
      painPoints: [],
      themes: [],
      risks: [],
      nextActions: [],
    }),
    provider: String(row.provider || "deterministic-rules"),
    engineKind: String(row.engine_kind || "deterministic"),
    status: String(row.status || "pending_review"),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCommercialAgentRun(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    workflowId: String(row.workflow_id),
    changeSetId: row.change_set_id ? String(row.change_set_id) : null,
    agent: String(row.agent),
    engineKind: String(row.engine_kind || "deterministic"),
    provider: String(row.provider || "deterministic-rules"),
    model: String(row.model || ""),
    status: String(row.status),
    conclusion: String(row.conclusion),
    confidence: Number(row.confidence || 0),
    sources: json<string[]>(row.source_ids_json, []),
    output: json<Record<string, unknown>>(row.output_json, {}),
    humanValidationStatus: String(row.human_validation_status || "pending"),
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapCrmHandoff(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    hypothesisId: row.hypothesis_id ? String(row.hypothesis_id) : null,
    version: Number(row.version || 1),
    status: String(row.status || "preview"),
    payload: json<Record<string, unknown>>(row.payload_json, {}),
    qualification: json<Record<string, unknown>>(row.qualification_json, {}),
    copyText: String(row.copy_text || ""),
    exportPayload: json<Record<string, unknown>>(row.export_json, {}),
    sources: json<string[]>(row.source_ids_json, []),
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    handedOffAt: row.handed_off_at ? String(row.handed_off_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapImpactMetric(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    discoveryStartedAt: String(row.discovery_started_at),
    qualifiedAt: row.qualified_at ? String(row.qualified_at) : null,
    elapsedMinutes: Number(row.elapsed_minutes || 0),
    questionsAddressed: Number(row.questions_addressed || 0),
    questionsConfirmed: Number(row.questions_confirmed || 0),
    discoveryCoverage: Number(row.discovery_coverage || 0),
    openGaps: Number(row.open_gaps || 0),
    evidenceCount: Number(row.evidence_count || 0),
    confirmedEvidenceCount: Number(row.confirmed_evidence_count || 0),
    meetingCount: Number(row.meeting_count || 0),
    qualifiedHypothesisCount: Number(row.qualified_hypothesis_count || 0),
    methodology: json<Record<string, string>>(row.methodology_json, {}),
    computedAt: String(row.computed_at),
  };
}

async function captureCommercialState(
  db: D1Database,
  discoveryId: string,
): Promise<CommercialState> {
  const [
    account,
    entityRows,
    stakeholderRows,
    hypothesisRows,
    actionRows,
    evidenceCount,
    memory,
  ] = await Promise.all([
    db
      .prepare("SELECT * FROM discoveries WHERE id = ?")
      .bind(discoveryId)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM account_entities WHERE discovery_id = ? ORDER BY created_at",
      )
      .bind(discoveryId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at",
      )
      .bind(discoveryId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM opportunity_hypotheses WHERE discovery_id = ? ORDER BY confidence DESC",
      )
      .bind(discoveryId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM account_actions WHERE discovery_id = ? ORDER BY priority_score DESC",
      )
      .bind(discoveryId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM account_events WHERE discovery_id = ?",
      )
      .bind(discoveryId)
      .first<{ count: number }>(),
    db
      .prepare("SELECT version FROM account_memory WHERE discovery_id = ?")
      .bind(discoveryId)
      .first<{ version: number }>(),
  ]);
  const row = account || {};
  return {
    progress: Number(row.progress || 0),
    stage: String(row.stage || ""),
    scores: json<Score[]>(row.scores_json, []).map(
      (score) =>
        ({
          name: score.name,
          short: score.short,
          alignment: score.alignment,
          value: score.value,
          readiness: score.readiness,
          confidence: score.confidence,
        }) satisfies CommercialScore,
    ),
    entities: entityRows.results.map(
      (item) =>
        ({
          id: String(item.id),
          type: String(item.type),
          name: String(item.name),
          status: String(item.status || "active"),
          confidence: Number(item.confidence || 0),
        }) satisfies CommercialEntity,
    ),
    stakeholders: stakeholderRows.results.map((item) => {
      const stakeholder = mapStakeholder(item);
      return {
        id: stakeholder.id,
        name: stakeholder.name,
        role: stakeholder.role,
        influence: stakeholder.influence,
        source: stakeholder.source,
      } satisfies CommercialStakeholder;
    }),
    hypotheses: hypothesisRows.results.map((item) => {
      const hypothesis = mapHypothesis(item);
      return {
        id: hypothesis.id,
        capabilityKey: hypothesis.capabilityKey,
        title: hypothesis.title,
        problem: hypothesis.problem,
        products: hypothesis.products,
        stakeholderIds: hypothesis.stakeholderIds,
        evidence: hypothesis.evidence,
        gaps: hypothesis.gaps,
        confidence: hypothesis.confidence,
        stage: hypothesis.stage,
        nextStep: hypothesis.nextStep,
      } satisfies CommercialHypothesis;
    }),
    actions: actionRows.results.map((item) => {
      const action = mapAction(item);
      return {
        id: action.id,
        type: action.type,
        title: action.title,
        status: action.status,
        priorityScore: action.priorityScore,
        nextStep: action.nextStep,
      } satisfies CommercialAction;
    }),
    evidenceCount: Number(evidenceCount?.count || 0),
    memoryVersion: Number(memory?.version || 0),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapGuidedSession(
  row: Record<string, unknown>,
): GuidedDiscoverySession {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    ownerEmail: String(row.owner_email),
    mode: String(row.mode) === "direct" ? "direct" : "adaptive",
    catalogVersion: String(row.catalog_version),
    selectedPillars: json<string[]>(row.selected_pillars_json, []),
    status: String(row.status) as GuidedDiscoverySession["status"],
    progressPercent: Number(row.progress_percent || 0),
    coveragePercent: Number(row.coverage_percent || 0),
    currentQuestionId: row.current_question_id
      ? String(row.current_question_id)
      : null,
    checkpointCount: Number(row.checkpoint_count || 0),
    aiStatus: row.ai_status ? String(row.ai_status) : null,
    startedAt: String(row.started_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGuidedQuestion(
  row: Record<string, unknown>,
): GuidedDiscoveryQuestionRow {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    discoveryId: String(row.discovery_id),
    catalogQuestionId: row.catalog_question_id
      ? String(row.catalog_question_id)
      : null,
    pillar: String(row.pillar),
    prompt: String(row.prompt),
    hint: row.hint ? String(row.hint) : null,
    inputSchema: json<Record<string, unknown>>(row.input_schema_json, {}),
    source: String(row.source) === "ai" ? "ai" : "catalog",
    rationale: row.rationale ? String(row.rationale) : null,
    citations: json<EvidenceRef[]>(row.citations_json, []),
    sequence: Number(row.sequence || 0),
    status: String(row.status) as GuidedDiscoveryQuestionRow["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGuidedAnswer(
  row: Record<string, unknown>,
): GuidedDiscoveryAnswerRow {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    questionId: String(row.question_id),
    discoveryId: String(row.discovery_id),
    structured: json<Record<string, unknown>>(row.structured_json, {}),
    answerText: String(row.answer_text || ""),
    evidenceStatus: String(
      row.evidence_status,
    ) as GuidedDiscoveryAnswerRow["evidenceStatus"],
    stakeholderId: row.stakeholder_id ? String(row.stakeholder_id) : null,
    sourceType: row.source_type ? String(row.source_type) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    sourceDate: row.source_date ? String(row.source_date) : null,
    confidence: Number(row.confidence || 0),
    status: String(row.status) as GuidedDiscoveryAnswerRow["status"],
    supersedesId: row.supersedes_id ? String(row.supersedes_id) : null,
    isCurrent: Boolean(row.is_current),
    answeredAt: row.answered_at ? String(row.answered_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGuidedPillarStatus(
  row: Record<string, unknown>,
): GuidedDiscoveryPillarStatus {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    ownerEmail: String(row.owner_email),
    pillarKey: String(row.pillar_key) as GuidedDiscoveryPillarKey,
    catalogVersion: String(row.catalog_version),
    status: String(row.status) as GuidedDiscoveryPillarStatus["status"],
    currentSessionId: row.current_session_id
      ? String(row.current_session_id)
      : null,
    progressPercent: Number(row.progress_percent || 0),
    coveragePercent: Number(row.coverage_percent || 0),
    confidencePercent: Number(row.confidence_percent || 0),
    answeredCount: Number(row.answered_count || 0),
    requiredCount: Number(row.required_count || 5),
    notRelevantReason: row.not_relevant_reason
      ? String(row.not_relevant_reason)
      : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapStakeholderCapabilityAssignment(
  row: Record<string, unknown>,
): StakeholderCapabilityAssignment {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    stakeholderId: String(row.stakeholder_id),
    capabilityKey: String(row.capability_key) as CdiCapabilityKey,
    role: String(row.assignment_role) as StakeholderCapabilityAssignment["role"],
    status: String(row.status) as StakeholderCapabilityAssignment["status"],
    confidence: Number(row.confidence || 0),
    sourceType: String(row.source_type || "manual"),
    sourceId: row.source_id ? String(row.source_id) : null,
    evidence: json<EvidenceRef[]>(row.evidence_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCdiAnswerImpact(row: Record<string, unknown>): CdiAnswerImpact {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    answerId: String(row.answer_id),
    questionId: String(row.question_id),
    catalogVersion: String(row.catalog_version),
    capabilityKey: String(row.capability_key) as CdiCapabilityKey,
    dimension: String(row.dimension),
    response: String(row.response),
    evidenceId: row.evidence_id ? String(row.evidence_id) : null,
    before: json<Record<string, unknown>>(row.before_json, {}),
    after: json<Record<string, unknown>>(row.after_json, {}),
    delta: json<Record<string, unknown>>(row.delta_json, {}),
    journeyIds: json<string[]>(row.journey_ids_json, []),
    technologyIds: json<string[]>(row.technology_ids_json, []),
    gateChanges: json<Array<Record<string, unknown>>>(
      row.gate_changes_json,
      [],
    ),
    recommendationChanges: json<Array<Record<string, unknown>>>(
      row.recommendation_changes_json,
      [],
    ),
    ruleTrace: json<Record<string, unknown>>(row.rule_trace_json, {}),
    source: json<Record<string, unknown>>(row.source_json, {}),
    createdAt: String(row.created_at),
  };
}

const scoreHintsForGuidedDiscovery = (row: Record<string, unknown>) => {
  const keyByShort = Object.fromEntries(
    GUIDED_DISCOVERY_PILLARS.flatMap((pillarKey) => [
      [pillarKey, pillarKey],
      [GUIDED_DISCOVERY_PILLAR_META[pillarKey].label, pillarKey],
      [GUIDED_DISCOVERY_PILLAR_META_EN_US[pillarKey].label, pillarKey],
    ]),
  ) as Record<string, GuidedDiscoveryPillarKey>;
  return Object.fromEntries(
    json<Score[]>(row.scores_json, [])
      .map((score) => [keyByShort[score.short], score.alignment])
      .filter(([key]) => Boolean(key)),
  ) as Partial<Record<GuidedDiscoveryPillarKey, number>>;
};

function guidedSnapshot(input: {
  row: Record<string, unknown>;
  sessions: GuidedDiscoverySession[];
  questions: GuidedDiscoveryQuestionRow[];
  answers: GuidedDiscoveryAnswerRow[];
  pillarStatuses?: GuidedDiscoveryPillarStatus[];
  stakeholders: Stakeholder[];
  locale?: ResponseLocale;
}) {
  const discoveryId = String(input.row.id);
  const accountSessions = input.sessions
    .filter((item) => item.discoveryId === discoveryId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const session =
    accountSessions.find((item) => item.status === "in_progress") ||
    accountSessions[0] ||
    null;
  const legacy = json<Answer[]>(input.row.answers_json, []);
  let questions = session
    ? input.questions
        .filter((item) => item.sessionId === session.id)
        .sort((a, b) => a.sequence - b.sequence)
    : [];
  let answers = session
    ? input.answers.filter(
        (item) => item.sessionId === session.id && item.isCurrent,
      )
    : [];
  let effectiveSession = session;

  if (!session) {
    const legacyByCatalog = new Map(
      legacy
        .map((item) => [legacyQuestionId(item.key), item])
        .filter(([key]) => Boolean(key)) as Array<[string, Answer]>,
    );
    const catalogIds = Array.from(
      new Set([
        ...questionsForPillar(GUIDED_DISCOVERY_PILLARS[0]).map(
          (item) => item.id,
        ),
        ...legacyByCatalog.keys(),
      ]),
    );
    const virtualSessionId = `virtual-${discoveryId}`;
    questions = catalogIds.map((catalogId, sequence) => {
      const catalog = getQuestionById(catalogId)!;
      const virtualId = `${virtualSessionId}-${catalogId}`;
      return {
        id: virtualId,
        sessionId: virtualSessionId,
        discoveryId,
        catalogQuestionId: catalogId,
        pillar: catalog.pillar,
        prompt: catalog.question,
        hint: catalog.hint,
        inputSchema: catalog.input as unknown as Record<string, unknown>,
        source: "catalog" as const,
        rationale: catalog.rationale,
        citations: [],
        sequence,
        status: legacyByCatalog.has(catalogId)
          ? ("answered" as const)
          : sequence === 0
            ? ("active" as const)
            : ("accepted" as const),
        createdAt: String(input.row.created_at),
        updatedAt: String(input.row.updated_at),
      };
    });
    if (!questions.some((question) => question.status === "active")) {
      const firstUnanswered = questions.find(
        (question) => question.status === "accepted",
      );
      if (firstUnanswered) firstUnanswered.status = "active";
    }
    answers = questions.flatMap((question) => {
      const item = question.catalogQuestionId
        ? legacyByCatalog.get(question.catalogQuestionId)
        : null;
      return item
        ? [
            {
              id: `${virtualSessionId}-answer-${question.catalogQuestionId}`,
              sessionId: virtualSessionId,
              questionId: question.id,
              discoveryId,
              structured: { value: "NO", importedLegacyContext: true },
              answerText: item.answer,
              evidenceStatus: "confirmed" as const,
              stakeholderId: null,
              sourceType: "legacy",
              sourceId: item.key,
              sourceDate: item.at,
              confidence: 82,
              status: "confirmed" as const,
              supersedesId: null,
              isCurrent: true,
              answeredAt: item.at,
              createdAt: item.at,
              updatedAt: item.at,
            },
          ]
        : [];
    });
    const virtualMetrics = calculateDiscoveryMetrics(
      questions.map((item) => item.id),
      answers,
    );
    effectiveSession = {
      id: virtualSessionId,
      discoveryId,
      ownerEmail: "",
      mode: "adaptive",
      catalogVersion: GUIDED_DISCOVERY_CATALOG_VERSION,
      selectedPillars: [],
      status: "paused",
      progressPercent: virtualMetrics.progressPercent,
      coveragePercent: virtualMetrics.coveragePercent,
      currentQuestionId:
        questions.find((item) => item.status === "active")?.id || null,
      checkpointCount: 0,
      aiStatus: "deterministic",
      startedAt: String(input.row.created_at),
      completedAt: null,
      createdAt: String(input.row.created_at),
      updatedAt: String(input.row.updated_at),
    };
  }

  const routeQuestions = questions.filter(
    (item) => item.status !== "dismissed" && item.status !== "proposed",
  );
  const answerLikes: GuidedDiscoveryAnswerLike[] = answers.map((answer) => ({
    ...answer,
    questionId: answer.questionId,
  }));
  const metrics = calculateDiscoveryMetrics(
    routeQuestions.map((item) => item.id),
    answerLikes,
  );
  const scoreHints = scoreHintsForGuidedDiscovery(input.row);
  const pillarRanking = rankPillarsFromAnswers(
    answers.map((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      return {
        ...answer,
        questionId: question?.catalogQuestionId || answer.questionId,
      };
    }),
    scoreHints as Record<string, number>,
  );
  const ranked = rankNextQuestion({
    questions: routeQuestions.flatMap((question) => {
      const catalog = question.catalogQuestionId
        ? getQuestionById(question.catalogQuestionId)
        : null;
      return catalog ? [{ ...catalog, id: question.id }] : [];
    }),
    answers: answerLikes,
    hypothesisImpactByPillar: scoreHints,
    stakeholderCoverageByPillar: Object.fromEntries(
      GUIDED_DISCOVERY_CATALOG.map((question) => [
        question.pillar,
        input.stakeholders.some(
          (person) =>
            person.discoveryId === discoveryId && person.source === "manual",
        )
          ? 75
          : 15,
      ]),
    ),
  });
  const nextRanked = ranked[0];
  const currentQuestion =
    routeQuestions.find(
      (item) => item.id === effectiveSession?.currentQuestionId,
    ) ||
    routeQuestions.find((item) => item.id === nextRanked?.question.id) ||
    routeQuestions.find((item) => item.status === "active") ||
    null;
  const checkpoint = checkpointForRoute(
    routeQuestions.map((item) => item.catalogQuestionId || item.id),
    answers.map((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      return {
        ...answer,
        questionId: question?.catalogQuestionId || answer.questionId,
      };
    }),
  );
  const proposedFollowUp =
    questions.find(
      (item) => item.source === "ai" && item.status === "proposed",
    ) || null;
  const checkpointAlreadyUsed = checkpoint
    ? questions.some(
        (item) => item.source === "ai" && item.pillar === checkpoint.pillar,
      )
    : false;
  const allQuestionById = new Map(
    [...input.questions, ...questions].map((question) => [question.id, question]),
  );
  const assessmentPillars = (
    effectiveSession?.selectedPillars.length
      ? effectiveSession.selectedPillars
      : Array.from(
          new Set(input.questions.map((question) => question.pillar)),
        )
  ).filter(isGuidedDiscoveryPillar);
  const technologyAssessment = scoreActiveDiscoveryAssessment({
    answers: [...input.answers, ...answers]
      .filter((answer, index, collection) =>
        answer.isCurrent &&
        collection.findIndex((candidate) => candidate.id === answer.id) === index,
      )
      .flatMap((answer) => {
        const question = allQuestionById.get(answer.questionId);
        const catalogQuestionId =
          question?.catalogQuestionId || answer.questionId;
        return getQuestionById(catalogQuestionId)
          ? [
              {
                questionId: catalogQuestionId,
                status: answer.status,
                structured: answer.structured,
                answerText: answer.answerText,
                confidence: answer.confidence,
              },
            ]
          : [];
      }),
    capabilityKeys: assessmentPillars,
    locale: input.locale || "en-US",
  });
  const storedStatusByPillar = new Map<
    GuidedDiscoveryPillarKey,
    GuidedDiscoveryPillarStatus
  >();
  for (const item of (input.pillarStatuses || [])
    .filter(
      (candidate) =>
        candidate.discoveryId === discoveryId &&
        candidate.catalogVersion === GUIDED_DISCOVERY_CATALOG_VERSION,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    if (!storedStatusByPillar.has(item.pillarKey))
      storedStatusByPillar.set(item.pillarKey, item);
  const latestSessionByPillar = new Map<
    GuidedDiscoveryPillarKey,
    GuidedDiscoverySession
  >();
  for (const candidate of accountSessions) {
    for (const pillar of candidate.selectedPillars.filter(
      isGuidedDiscoveryPillar,
    ))
      if (!latestSessionByPillar.has(pillar))
        latestSessionByPillar.set(pillar, candidate);
  }
  const pillarAssessments = GUIDED_DISCOVERY_PILLARS.map((pillarKey) => {
    const stored = storedStatusByPillar.get(pillarKey);
    const pillarSession = latestSessionByPillar.get(pillarKey);
    const pillarQuestions = pillarSession
      ? input.questions.filter(
          (item) =>
            item.sessionId === pillarSession.id &&
            item.pillar === pillarKey &&
            item.status !== "dismissed" &&
            item.status !== "proposed" &&
            (!item.catalogQuestionId ||
              getQuestionById(item.catalogQuestionId)?.essential !== false),
        )
      : [];
    const pillarAnswers = pillarSession
      ? input.answers.filter(
          (item) => item.sessionId === pillarSession.id && item.isCurrent,
        )
      : [];
    const pillarMetrics = calculateDiscoveryMetrics(
      pillarQuestions.map((item) => item.id),
      pillarAnswers,
    );
    const confidenceValues = pillarAnswers
      .filter((item) => item.status === "confirmed")
      .map((item) => item.confidence);
    const confidencePercent = confidenceValues.length
      ? Math.round(
          confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length,
        )
      : 0;
    const answeredCount = pillarAnswers.filter(
      (item) => item.status === "confirmed" || item.status === "unknown",
    ).length;
    const derivedStatus: GuidedDiscoveryPillarStatus["status"] = !pillarSession
      ? "not_started"
      : pillarSession.status === "completed"
        ? pillarMetrics.coveragePercent >= 60
          ? "reviewed_sufficient"
          : "reviewed_gaps"
        : "in_progress";
    const assessment = scoreActiveDiscoveryAssessment({
      answers: input.answers
        .filter((answer) => answer.isCurrent)
        .flatMap((answer) => {
          const question = allQuestionById.get(answer.questionId);
          const catalogQuestionId =
            question?.catalogQuestionId || answer.questionId;
          const catalog = getQuestionById(catalogQuestionId);
          return catalog?.pillar === pillarKey
            ? [
                {
                  questionId: catalogQuestionId,
                  status: answer.status,
                  structured: answer.structured,
                  answerText: answer.answerText,
                  confidence: answer.confidence,
                },
              ]
            : [];
        }),
      capabilityKeys: [pillarKey],
      locale: input.locale || "en-US",
    });
    return {
      key: pillarKey,
      ...GUIDED_DISCOVERY_PILLAR_META[pillarKey],
      status: stored?.status || derivedStatus,
      sessionId: stored?.currentSessionId || pillarSession?.id || null,
      progressPercent:
        stored?.progressPercent || pillarMetrics.progressPercent,
      coveragePercent:
        stored?.coveragePercent || pillarMetrics.coveragePercent,
      confidencePercent: stored?.confidencePercent || confidencePercent,
      answeredCount: stored?.answeredCount || answeredCount,
      requiredCount: stored?.requiredCount || 5,
      completionMinimum: 4,
      notRelevantReason: stored?.notRelevantReason || null,
      reviewedAt: stored?.reviewedAt || pillarSession?.completedAt || null,
      leadingTechnology:
        (assessment.pillars[0]?.propensity || 0) > 0
          ? assessment.pillars[0]?.leadingTechnology || null
          : null,
      propensity: assessment.pillars[0]?.propensity || 0,
    };
  });
  const reviewedStatuses = new Set([
    "reviewed_sufficient",
    "reviewed_gaps",
    "not_relevant",
  ]);
  const reviewedPillars = pillarAssessments.filter((item) =>
    reviewedStatuses.has(item.status),
  );
  const activePillar =
    pillarAssessments.find((item) => item.status === "in_progress")?.key ||
    null;
  const nextCandidates = pillarAssessments
    .filter(
      (item) =>
        !reviewedStatuses.has(item.status) && item.key !== activePillar,
    )
    .sort(
      (a, b) =>
        Number(scoreHints[b.key] || 0) - Number(scoreHints[a.key] || 0),
    );
  const recommendedNextPillar = nextCandidates[0]
    ? {
        key: nextCandidates[0].key,
        label: nextCandidates[0].label,
        relevance: Number(scoreHints[nextCandidates[0].key] || 0),
        rationale:
          pillarRanking.find(
            (item) => item.pillar === nextCandidates[0].key,
          )?.rationale ||
          localizedText(
            input.locale || "en-US",
            "Recommended to broaden account coverage and validate adjacent opportunities.",
            "Recomendado para ampliar a cobertura da conta e validar oportunidades adjacentes.",
          ),
      }
    : null;
  const averageMetric = (key: "coveragePercent" | "confidencePercent") =>
    reviewedPillars.length
      ? Math.round(
          reviewedPillars.reduce((sum, item) => sum + item[key], 0) /
            reviewedPillars.length,
        )
      : 0;

  return {
    discoveryId,
    catalogVersion: GUIDED_DISCOVERY_CATALOG_VERSION,
    readonly: String(input.row.visibility || "demo") !== "private",
    session: effectiveSession,
    questions,
    answers,
    currentQuestion,
    nextQuestion: currentQuestion
      ? {
          ...currentQuestion,
          rankingScore: nextRanked?.rankingScore || 0,
          factors: nextRanked?.factors || null,
        }
      : null,
    metrics,
    overallReview: {
      reviewedPillars: reviewedPillars.length,
      totalPillars: GUIDED_DISCOVERY_PILLARS.length,
      percent: Math.round(
        (reviewedPillars.length / GUIDED_DISCOVERY_PILLARS.length) * 100,
      ),
      coveragePercent: averageMetric("coveragePercent"),
      confidencePercent: averageMetric("confidencePercent"),
    },
    pillarAssessments,
    activePillar,
    recommendedNextPillar,
    pillars: Object.entries(GUIDED_DISCOVERY_PILLAR_META).map(([key, meta]) => {
      const pillarQuestions = routeQuestions.filter(
        (item) => item.pillar === key,
      );
      const pillarMetrics = calculateDiscoveryMetrics(
        pillarQuestions.map((item) => item.id),
        answerLikes,
      );
      const ranking = pillarRanking.find((item) => item.pillar === key);
      return {
        key,
        ...meta,
        ...pillarMetrics,
        relevance:
          ranking?.score ||
          Number(scoreHints[key as GuidedDiscoveryPillarKey] || 0),
        rationale: ranking?.rationale || "Ainda sem evidência suficiente.",
        selected:
          effectiveSession?.selectedPillars.includes(key) ||
          pillarQuestions.length > 0,
      };
    }),
    checkpoint:
      checkpoint && (effectiveSession?.checkpointCount || 0) < 3
        ? {
            ...checkpoint,
            available: !proposedFollowUp && !checkpointAlreadyUsed,
          }
        : null,
    proposedFollowUp,
    history: input.answers
      .filter(
        (item) =>
          item.discoveryId === discoveryId &&
          (!session || item.sessionId === session.id),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    scoreHints,
    technologyAssessment,
  };
}

function mapDiscovery(
  row: Record<string, unknown>,
  meetings: Meeting[],
  accountMap?: AccountMap,
) {
  const answers = json<Answer[]>(row.answers_json, []);
  const scores = json<Score[]>(row.scores_json, []);
  return {
    id: String(row.id),
    customerName: String(row.customer_name),
    industry: String(row.industry),
    companySize: String(row.company_size),
    owner: String(row.owner),
    ownerEmail: row.owner_email ? String(row.owner_email) : null,
    visibility: String(row.visibility || "demo"),
    dataClassification: String(row.data_classification || "test"),
    companyDomain: row.company_domain ? String(row.company_domain) : null,
    stage: String(row.stage),
    progress: Number(row.progress),
    priority: String(row.priority),
    challengeSummary: String(row.challenge_summary),
    answers,
    meetings,
    accountMap:
      accountMap ||
      buildAccountMap(
        {
          customerName: String(row.customer_name),
          industry: String(row.industry),
          scores,
        },
        answers,
        meetings,
      ),
    aiMode: meetings[0]?.aiStatus || "fallback",
    scores,
    recommendations: json<Recommendation[]>(row.recommendations_json, []),
    nextEngagement: String(row.next_engagement),
    lastAnalyzedAt: row.last_analyzed_at ? String(row.last_analyzed_at) : null,
    updatedAt: String(row.updated_at),
  };
}

function requestIdentity(request: Request) {
  const email =
    request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() ||
    "";
  return { email };
}

function scopeFor(request: Request, body?: Record<string, unknown>) {
  return String(
    body?.scope || new URL(request.url).searchParams.get("scope") || "demo",
  ) === "private"
    ? "private"
    : "demo";
}

function normalizeCompanyDomain(value: unknown): string | null {
  const input = String(value || "")
    .trim()
    .toLowerCase();
  if (!input) return null;
  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`,
    );
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return null;
    const hostname = parsed.hostname.replace(/\.$/, "").replace(/^www\./, "");
    if (!hostname.includes(".") || hostname.length > 253) return null;
    const labels = hostname.split(".");
    if (
      labels.some(
        (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
      )
    )
      return null;
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels.at(-1) || ""))
      return null;
    return hostname;
  } catch {
    return null;
  }
}

function privateGate(request: Request) {
  const identity = requestIdentity(request);
  const locale = resolveResponseLocale(request);
  if (!identity.email)
    return localizedApiError(locale, "AUTH_REQUIRED", 401, {
      en: "Sign in with ChatGPT to access the private workspace.",
      pt: "Faça login com ChatGPT para acessar o workspace privado.",
    });
  return null;
}

async function accountForMutation(
  db: D1Database,
  id: string,
  request: Request,
) {
  const identity = requestIdentity(request);
  const row = await db
    .prepare(
      "SELECT * FROM discoveries WHERE id = ? AND visibility = 'private' AND owner_email = ?",
    )
    .bind(id, identity.email)
    .first<Record<string, unknown>>();
  return row || null;
}

const translatableSourceTypes = [
  "account_event",
  "meeting",
  "document_chunk",
  "guided_discovery_answer",
  "stakeholder",
] as const;
type TranslatableSourceType = (typeof translatableSourceTypes)[number];
type TranslatableSource = {
  type: TranslatableSourceType;
  id: string;
  title: string;
  text: string;
  page: number | null;
};

async function translatableSourceForAccount(
  db: D1Database,
  discoveryId: string,
  sourceType: TranslatableSourceType,
  sourceId: string,
): Promise<TranslatableSource | null> {
  if (sourceType === "account_event") {
    const row = await db
      .prepare(
        "SELECT id, title, content FROM account_events WHERE id = ? AND discovery_id = ?",
      )
      .bind(sourceId, discoveryId)
      .first<Record<string, unknown>>();
    return row
      ? {
          type: sourceType,
          id: sourceId,
          title: String(row.title),
          text: String(row.content || ""),
          page: null,
        }
      : null;
  }
  if (sourceType === "meeting") {
    const row = await db
      .prepare(
        "SELECT id, title, notes FROM meetings WHERE id = ? AND discovery_id = ?",
      )
      .bind(sourceId, discoveryId)
      .first<Record<string, unknown>>();
    return row
      ? {
          type: sourceType,
          id: sourceId,
          title: String(row.title),
          text: String(row.notes || ""),
          page: null,
        }
      : null;
  }
  if (sourceType === "document_chunk") {
    const row = await db
      .prepare(
        "SELECT c.id, c.content, c.page, d.name FROM document_chunks c JOIN documents d ON d.id = c.document_id AND d.discovery_id = c.discovery_id WHERE c.id = ? AND c.discovery_id = ?",
      )
      .bind(sourceId, discoveryId)
      .first<Record<string, unknown>>();
    return row
      ? {
          type: sourceType,
          id: sourceId,
          title: String(row.name),
          text: String(row.content || ""),
          page:
            row.page === null || row.page === undefined
              ? null
              : Number(row.page),
        }
      : null;
  }
  if (sourceType === "guided_discovery_answer") {
    const row = await db
      .prepare(
        "SELECT a.id, a.answer_text, a.structured_json, q.prompt FROM guided_discovery_answers a JOIN guided_discovery_questions q ON q.id = a.question_id AND q.discovery_id = a.discovery_id WHERE a.id = ? AND a.discovery_id = ?",
      )
      .bind(sourceId, discoveryId)
      .first<Record<string, unknown>>();
    if (!row) return null;
    const structured = json<Record<string, unknown>>(row.structured_json, {});
    return {
      type: sourceType,
      id: sourceId,
      title: String(row.prompt),
      text:
        String(row.answer_text || "").trim() ||
        humanizeStructuredAnswer(structured),
      page: null,
    };
  }
  const row = await db
    .prepare(
      "SELECT id, name, role, notes FROM stakeholders WHERE id = ? AND discovery_id = ?",
    )
    .bind(sourceId, discoveryId)
    .first<Record<string, unknown>>();
  return row
    ? {
        type: sourceType,
        id: sourceId,
        title: `${String(row.name)} · ${String(row.role)}`,
        text: String(row.notes || ""),
        page: null,
      }
    : null;
}

async function addEvent(
  db: D1Database,
  input: Omit<AccountEvent, "createdAt"> & { createdAt?: string },
) {
  const createdAt = input.createdAt || new Date().toISOString();
  await db
    .prepare(
      "INSERT OR REPLACE INTO account_events (id, discovery_id, type, title, content, source_type, source_id, evidence_status, confidence, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      input.id,
      input.discoveryId,
      input.type,
      input.title,
      input.content,
      input.sourceType,
      input.sourceId,
      input.evidenceStatus,
      input.confidence,
      input.occurredAt,
      createdAt,
    )
    .run();
}

const dbProviderName = (provider: "watsonx" | "gemini" | "fallback") =>
  provider === "watsonx"
    ? "ibm-watsonx"
    : provider === "gemini"
      ? "google-gemini"
      : "deterministic-fallback";

async function quotaAllows(db: D1Database, kind: "generative" | "embedding") {
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const circuitWindow = new Date(now - 5 * 60_000).toISOString();
  const agentFilter =
    kind === "embedding"
      ? "agent = 'semantic-index'"
      : "agent <> 'semantic-index'";
  const [minute, day, recentErrors] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND ${agentFilter} AND created_at >= ?`,
      )
      .bind(minuteAgo)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND ${agentFilter} AND created_at >= ?`,
      )
      .bind(dayAgo)
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT status FROM ai_runs WHERE provider = 'google-gemini' AND created_at >= ? ORDER BY created_at DESC LIMIT 3",
      )
      .bind(circuitWindow)
      .all<{ status: string }>(),
  ]);
  const rpm = kind === "embedding" ? 80 : 12;
  const daily = kind === "embedding" ? 900 : 450;
  const circuitOpen =
    recentErrors.results.length === 3 &&
    recentErrors.results.every((row) => row.status === "error");
  return {
    allowed:
      Number(minute?.count || 0) < rpm &&
      Number(day?.count || 0) < daily &&
      !circuitOpen,
    minute: Number(minute?.count || 0),
    daily: Number(day?.count || 0),
    rpm,
    dailyLimit: daily,
    circuitOpen,
  };
}

async function recordAIRun<T>(
  db: D1Database,
  accountId: string,
  agent: string,
  result: AIResult<T>,
  sourceIds: string[],
  confidence: number,
  detail: string,
  cached = false,
  locale: ResponseLocale = "en-US",
) {
  const now = new Date().toISOString();
  const attemptedProvider = result.attemptedProviders?.at(-1);
  const recordedProvider = result.ok
    ? result.provider
    : attemptedProvider || result.provider;
  const status = result.ok
    ? "completed"
    : attemptedProvider
      ? "error"
      : "fallback";
  await db
    .prepare(
      "INSERT INTO ai_runs (id, discovery_id, agent, provider, status, confidence, source_ids_json, validated, detail, model, prompt_tokens, output_tokens, latency_ms, cache_hit, error_code, locale, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      accountId,
      agent,
      dbProviderName(recordedProvider),
      status,
      confidence,
      JSON.stringify(sourceIds),
      0,
      detail,
      result.model || "",
      result.usage.inputTokens || 0,
      result.usage.outputTokens || 0,
      result.latencyMs,
      cached ? 1 : 0,
      result.reason || null,
      locale,
      now,
    )
    .run();
}

async function persistImpactMetrics(
  db: D1Database,
  discoveryId: string,
  computedAt: string,
) {
  const [
    account,
    eventCounts,
    meetingCount,
    guidedCounts,
    guidedSession,
    qualifiedCount,
    memory,
    previous,
  ] = await Promise.all([
    db
      .prepare("SELECT created_at, answers_json FROM discoveries WHERE id = ?")
      .bind(discoveryId)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT MIN(occurred_at) AS first_at, COUNT(*) AS total, SUM(CASE WHEN evidence_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed FROM account_events WHERE discovery_id = ?",
      )
      .bind(discoveryId)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM meetings WHERE discovery_id = ? AND meeting_status = 'completed'",
      )
      .bind(discoveryId)
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) AS addressed, SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed, SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) AS unknown_count FROM guided_discovery_answers WHERE discovery_id = ? AND is_current = 1 AND status <> 'draft'",
      )
      .bind(discoveryId)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT coverage_percent FROM guided_discovery_sessions WHERE discovery_id = ? ORDER BY updated_at DESC LIMIT 1",
      )
      .bind(discoveryId)
      .first<{ coverage_percent: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM opportunity_hypotheses WHERE discovery_id = ? AND stage = 'qualified'",
      )
      .bind(discoveryId)
      .first<{ count: number }>(),
    db
      .prepare("SELECT gaps_json FROM account_memory WHERE discovery_id = ?")
      .bind(discoveryId)
      .first<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT qualified_at FROM account_impact_metrics WHERE discovery_id = ? ORDER BY computed_at DESC LIMIT 1",
      )
      .bind(discoveryId)
      .first<{ qualified_at: string | null }>(),
  ]);
  const legacyAnswers = json<Answer[]>(account?.answers_json, []);
  const guidedAddressed = Number(guidedCounts?.addressed || 0);
  const guidedConfirmed = Number(guidedCounts?.confirmed || 0);
  const qualifiedHypothesisCount = Number(qualifiedCount?.count || 0);
  const qualifiedAt = qualifiedHypothesisCount
    ? previous?.qualified_at || computedAt
    : previous?.qualified_at || null;
  const discoveryStartedAt = String(
    eventCounts?.first_at || account?.created_at || computedAt,
  );
  const gaps = json<string[]>(memory?.gaps_json, []);
  const metric = buildImpactMetrics({
    discoveryStartedAt,
    qualifiedAt,
    computedAt,
    questionsAddressed: legacyAnswers.length + guidedAddressed,
    questionsConfirmed: legacyAnswers.length + guidedConfirmed,
    discoveryCoverage: Number(guidedSession?.coverage_percent || 0),
    openGaps: gaps.length + Number(guidedCounts?.unknown_count || 0),
    evidenceCount: Number(eventCounts?.total || 0),
    confirmedEvidenceCount: Number(eventCounts?.confirmed || 0),
    meetingCount: Number(meetingCount?.count || 0),
    qualifiedHypothesisCount,
  });
  await db
    .prepare(
      "INSERT OR REPLACE INTO account_impact_metrics (id, discovery_id, discovery_started_at, qualified_at, elapsed_minutes, questions_addressed, questions_confirmed, discovery_coverage, open_gaps, evidence_count, confirmed_evidence_count, meeting_count, qualified_hypothesis_count, methodology_json, computed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `impact-${discoveryId}`,
      discoveryId,
      metric.discoveryStartedAt,
      metric.qualifiedAt,
      metric.elapsedMinutes,
      metric.questionsAddressed,
      metric.questionsConfirmed,
      metric.discoveryCoverage,
      metric.openGaps,
      metric.evidenceCount,
      metric.confirmedEvidenceCount,
      metric.meetingCount,
      metric.qualifiedHypothesisCount,
      JSON.stringify(metric.methodology),
      metric.computedAt,
    )
    .run();
  return metric;
}

async function persistMeetingCommercialProof(input: {
  db: D1Database;
  discoveryId: string;
  meetingId: string;
  before: CommercialState;
  insights: MeetingInsight;
  meetingRun: AIResult<unknown>;
  locale: ResponseLocale;
  createdAt: string;
}) {
  const after = await captureCommercialState(input.db, input.discoveryId);
  const suggestions: ChangeSetSuggestions = {
    stakeholders: input.insights.stakeholders,
    systems: input.insights.systems,
    painPoints: input.insights.painPoints,
    themes: input.insights.ibmThemes,
    risks: input.insights.risks,
    nextActions: input.insights.nextActions,
  };
  const delta = buildAccountChangeSet(input.before, after, suggestions);
  const usedModel =
    input.meetingRun.ok &&
    (input.insights.aiStatus === "watsonx" ||
      input.insights.aiStatus === "gemini");
  const provider = usedModel
    ? dbProviderName(input.meetingRun.provider)
    : "deterministic-rules";
  const engineKind = usedModel ? "model" : "deterministic";
  const changeSetId = `changeset-${input.meetingId}`;
  await input.db
    .prepare(
      "INSERT OR IGNORE INTO account_change_sets (id, discovery_id, source_type, source_id, trigger_type, before_json, after_json, delta_json, suggestions_json, provider, engine_kind, status, reviewed_by, reviewed_at, created_at, updated_at) VALUES (?, ?, 'meeting', ?, 'meeting_completed', ?, ?, ?, ?, ?, ?, 'pending_review', NULL, NULL, ?, ?)",
    )
    .bind(
      changeSetId,
      input.discoveryId,
      input.meetingId,
      JSON.stringify(input.before),
      JSON.stringify(after),
      JSON.stringify(delta),
      JSON.stringify(suggestions),
      provider,
      engineKind,
      input.createdAt,
      input.createdAt,
    )
    .run();
  const workflowId = `workflow-${input.meetingId}`;
  const sourceIds = [input.meetingId];
  const pipeline = buildLogicalPipeline({
    provider,
    model: input.meetingRun.model,
    usedModel,
    sourceIds,
    changeSet: delta,
    locale: input.locale,
  });
  for (const run of pipeline) {
    await input.db
      .prepare(
        "INSERT OR IGNORE INTO commercial_agent_runs (id, discovery_id, workflow_id, change_set_id, agent, engine_kind, provider, model, status, conclusion, confidence, source_ids_json, output_json, human_validation_status, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `${workflowId}-${run.agent}`,
        input.discoveryId,
        workflowId,
        changeSetId,
        run.agent,
        run.engineKind,
        run.provider,
        run.model,
        run.status,
        run.conclusion,
        run.confidence,
        JSON.stringify(run.sourceIds),
        JSON.stringify(run.output),
        run.humanValidationStatus,
        input.createdAt,
        input.createdAt,
        input.createdAt,
      )
      .run();
  }
  const stored = await input.db
    .prepare("SELECT * FROM account_change_sets WHERE id = ?")
    .bind(changeSetId)
    .first<Record<string, unknown>>();
  return stored ? mapChangeSet(stored) : null;
}

async function cacheKeyFor(parts: string[]) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(parts.join("|")),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function providerCacheSignature(
  provider: ReturnType<typeof aiAdapter>,
  classification: AccountDataClassification,
  locale: ResponseLocale = "en-US",
) {
  const status = provider.status;
  return JSON.stringify({
    classification,
    locale,
    mode: status.mode,
    precedence: status.precedence,
    watsonx: status.watsonx.configured ? status.watsonx.model : "disabled",
    gemini: status.gemini.configured ? status.gemini.model : "disabled",
    embedding: status.gemini.configured
      ? status.gemini.embeddingModel
      : "disabled",
  });
}

async function cachedAI<T>(
  db: D1Database,
  cacheKey: string,
): Promise<{
  data: T;
  provider: string;
  model: string;
  usage: Record<string, unknown>;
} | null> {
  const row = await db
    .prepare(
      "SELECT response_json, provider, model, usage_json FROM ai_cache WHERE cache_key = ? AND expires_at > ? AND provider <> 'deterministic-fallback' AND model <> ''",
    )
    .bind(cacheKey, new Date().toISOString())
    .first<Record<string, unknown>>();
  return row
    ? {
        data: json<T>(row.response_json, null as T),
        provider: String(row.provider),
        model: String(row.model),
        usage: json<Record<string, unknown>>(row.usage_json, {}),
      }
    : null;
}

async function putAICache<T>(
  db: D1Database,
  input: {
    cacheKey: string;
    accountId: string | null;
    task: string;
    provider: string;
    model: string;
    fingerprint: string;
    data: T;
    usage: Record<string, unknown>;
    ttlMs: number;
  },
) {
  if (input.provider === "deterministic-fallback" || !input.model) return;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
  await db
    .prepare(
      "INSERT OR REPLACE INTO ai_cache (id, cache_key, discovery_id, task, provider, model, evidence_fingerprint, response_json, usage_json, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `cache-${input.cacheKey}`,
      input.cacheKey,
      input.accountId,
      input.task,
      input.provider,
      input.model,
      input.fingerprint,
      JSON.stringify(input.data),
      JSON.stringify(input.usage),
      expiresAt,
      now,
      now,
    )
    .run();
}

async function refreshAccountEmbeddings(
  db: D1Database,
  row: Record<string, unknown>,
  sources?: RetrievalSource[],
  responseLocale: ResponseLocale = "en-US",
) {
  if (
    String(row.visibility || "demo") !== "private" ||
    classificationOf(row) === "confidential"
  )
    return;
  const provider = aiAdapter();
  if (
    !provider.status.gemini.configured ||
    provider.status.mode === "fallback" ||
    provider.status.mode === "watsonx"
  )
    return;
  const quota = await quotaAllows(db, "embedding");
  if (!quota.allowed) return;
  const allSources =
    sources || (await collectAccountSources(db, String(row.id)));
  const selected = allSources.slice(0, 300);
  if (!selected.length) return;
  const existing = await db
    .prepare(
      "SELECT source_id, content_hash FROM account_embeddings WHERE discovery_id = ? AND model = ?",
    )
    .bind(String(row.id), provider.status.gemini.embeddingModel)
    .all<{ source_id: string; content_hash: string }>();
  const hashes = new Map(
    existing.results.map((item) => [item.source_id, item.content_hash]),
  );
  const changed = selected.filter(
    (source) =>
      hashes.get(source.id) !== `${source.content.length}:${source.occurredAt}`,
  );
  if (!changed.length) return;
  for (let index = 0; index < changed.length; index += 60) {
    const batch = changed.slice(index, index + 60);
    const batchQuota = index === 0 ? quota : await quotaAllows(db, "embedding");
    if (!batchQuota.allowed) break;
    const result = await provider.embedSources(
      batch.map((source) => ({
        id: source.id,
        text: `${source.title}\n${source.content}`,
      })),
      { classification: "test", embeddingTask: "RETRIEVAL_DOCUMENT" },
    );
    if (result.ok && result.data)
      await persistEmbeddings(
        db,
        String(row.id),
        batch,
        result.data.map((item) => item.values),
        result.model || provider.status.gemini.embeddingModel,
      );
    await recordAIRun(
      db,
      String(row.id),
      "semantic-index",
      result,
      batch.map((source) => source.id),
      result.ok ? 86 : 0,
      result.ok
        ? localizedText(
            responseLocale,
            `${batch.length} sources indexed for selective retrieval.`,
            `${batch.length} fontes indexadas para recuperação seletiva.`,
          )
        : localizedText(
            responseLocale,
            "Semantic indexing is unavailable; hybrid search kept keywords and recency.",
            "Indexação semântica indisponível; busca híbrida manteve palavras-chave e recência.",
          ),
      false,
      responseLocale,
    );
    if (!result.ok) break;
  }
}

export async function recomputeAccount(
  db: D1Database,
  id: string,
  recomputeOptions: {
    skipGenerative?: boolean;
    skipEmbeddings?: boolean;
    responseLocale?: ResponseLocale;
  } = {},
) {
  const row = await db
    .prepare("SELECT * FROM discoveries WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return;
  const [eventRows, stakeholderRows, previousMemory] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM account_events WHERE discovery_id = ? ORDER BY occurred_at DESC",
      )
      .bind(id)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at ASC",
      )
      .bind(id)
      .all<Record<string, unknown>>(),
    db
      .prepare("SELECT * FROM account_memory WHERE discovery_id = ?")
      .bind(id)
      .first<Record<string, unknown>>(),
  ]);
  const responseLocale = recomputeOptions.responseLocale || "en-US";
  const events = eventRows.results.map(mapAccountEvent);
  const stakeholders = stakeholderRows.results.map(mapStakeholder);
  const scores = json<Score[]>(row.scores_json, initialScores(responseLocale));
  let memory = buildMemory(
    String(row.customer_name),
    String(row.challenge_summary),
    events,
    scores,
    Number(previousMemory?.version || 0),
    responseLocale,
  );
  const provider = aiAdapter();
  const quota = await quotaAllows(db, "generative");
  const options = {
    classification: quota.allowed
      ? classificationOf(row)
      : ("confidential" as const),
    publicDemo: String(row.visibility || "demo") !== "private",
    responseLocale,
  };
  const generatedMemory = recomputeOptions.skipGenerative
    ? {
        ok: false,
        data: null,
        provider: "fallback" as const,
        model: null,
        fallback: true,
        reason: "disabled" as const,
        usage: { inputTokens: null, outputTokens: null, totalTokens: null },
        latencyMs: 0,
        attempts: 0,
      }
    : await provider.analyzeAccount(
        JSON.stringify({
          customer: row.customer_name,
          currentSummary: row.challenge_summary,
          sources: events.slice(0, 30),
          scores: scores.slice(0, 6),
          stakeholders,
        }),
        options,
      );
  if (
    generatedMemory.data &&
    typeof generatedMemory.data.executiveSummary === "string"
  )
    memory = {
      ...memory,
      executiveSummary: generatedMemory.data.executiveSummary,
      known: compact(generatedMemory.data.known.map(String)),
      assumptions: compact(generatedMemory.data.assumptions.map(String)),
      gaps: compact(generatedMemory.data.gaps.map(String)),
      changes: compact(generatedMemory.data.changes.map(String)),
      aiStatus: aiStatusOf(generatedMemory.provider),
    };
  const hypotheses = buildHypotheses(
    scores,
    events,
    stakeholders,
    responseLocale,
  );
  const actions = buildActions(
    {
      id,
      customerName: String(row.customer_name),
      progress: Number(row.progress),
      updatedAt: String(row.updated_at),
    },
    events,
    scores,
    stakeholders,
    hypotheses,
    responseLocale,
  );
  await db
    .prepare(
      "INSERT OR REPLACE INTO account_memory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      memory.executiveSummary,
      JSON.stringify(memory.known),
      JSON.stringify(memory.assumptions),
      JSON.stringify(memory.gaps),
      JSON.stringify(memory.changes),
      memory.aiStatus,
      memory.version,
      memory.updatedAt,
    )
    .run();
  for (const item of hypotheses) {
    const existing = await db
      .prepare(
        "SELECT id, created_at FROM opportunity_hypotheses WHERE discovery_id = ? AND capability_key = ?",
      )
      .bind(id, item.capabilityKey)
      .first<Record<string, unknown>>();
    await db
      .prepare(
        "INSERT OR REPLACE INTO opportunity_hypotheses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        String(
          existing?.id ||
            `hyp-${id}-${item.capabilityKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ),
        id,
        item.capabilityKey,
        item.title,
        item.problem,
        JSON.stringify(item.products),
        JSON.stringify(item.stakeholderIds),
        JSON.stringify(item.evidence),
        JSON.stringify(item.gaps),
        item.confidence,
        item.stage,
        item.nextStep,
        String(existing?.created_at || memory.updatedAt),
        memory.updatedAt,
      )
      .run();
  }
  for (const item of actions) {
    const existing = await db
      .prepare(
        "SELECT * FROM account_actions WHERE discovery_id = ? AND dedupe_key = ?",
      )
      .bind(id, item.dedupeKey)
      .first<Record<string, unknown>>();
    const unchangedDiscard =
      String(existing?.status || "") === "discarded" &&
      String(existing?.evidence_fingerprint || "") === item.evidenceFingerprint;
    const status = unchangedDiscard
      ? "discarded"
      : String(existing?.status || "proposal") === "discarded"
        ? "proposal"
        : String(existing?.status || "proposal");
    const snoozedUntil = existing?.snoozed_until
      ? String(existing.snoozed_until)
      : null;
    const currentStatus =
      snoozedUntil && new Date(snoozedUntil).getTime() > Date.now()
        ? "snoozed"
        : status;
    await db
      .prepare(
        "INSERT OR REPLACE INTO account_actions (id, discovery_id, stakeholder_id, type, title, rationale, next_step, impact, urgency, confidence, maturity, priority_score, status, due_at, evidence_json, dedupe_key, evidence_fingerprint, created_at, updated_at, why_now, effort, expected_outcome, conversation_json, snoozed_until, feedback_reason, rank_adjustment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        String(
          existing?.id ||
            `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ),
        id,
        item.stakeholderId,
        item.type,
        item.title,
        item.rationale,
        item.nextStep,
        item.impact,
        item.urgency,
        item.confidence,
        item.maturity,
        item.priorityScore,
        currentStatus,
        item.dueAt,
        JSON.stringify(item.evidence),
        item.dedupeKey,
        item.evidenceFingerprint,
        String(existing?.created_at || memory.updatedAt),
        memory.updatedAt,
        item.whyNow,
        item.effort,
        item.expectedOutcome,
        JSON.stringify(item.conversation),
        snoozedUntil,
        existing?.feedback_reason || null,
        Math.max(-5, Math.min(5, Number(existing?.rank_adjustment || 0))),
      )
      .run();
  }
  const plan = await db
    .prepare("SELECT * FROM account_plans WHERE discovery_id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!plan) {
    const suggestion = suggestAccountPlan(
      memory,
      hypotheses,
      actions,
      stakeholders,
      responseLocale,
    );
    await db
      .prepare(
        "INSERT INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        id,
        "[]",
        "[]",
        "[]",
        "[]",
        "[]",
        "[]",
        "[]",
        "[]",
        "[]",
        "draft",
        JSON.stringify(suggestion),
        memory.updatedAt,
      )
      .run();
  } else if (String(plan.approval_status || "draft") === "draft") {
    const suggestion = suggestAccountPlan(
      memory,
      hypotheses,
      actions,
      stakeholders,
      responseLocale,
    );
    await db
      .prepare(
        "UPDATE account_plans SET suggestion_json = ?, updated_at = ? WHERE discovery_id = ? AND approval_status = 'draft'",
      )
      .bind(JSON.stringify(suggestion), memory.updatedAt, id)
      .run();
  }
  const snapshotFingerprint = await evidenceFingerprint(
    (await collectAccountSources(db, id)).slice(0, 60),
  );
  await db
    .prepare(
      "INSERT OR IGNORE INTO account_snapshots (id, discovery_id, reason, snapshot_json, confidence, source_fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      `snap-${id}-${snapshotFingerprint.slice(0, 14)}`,
      id,
      "analysis",
      JSON.stringify({
        progress: row.progress,
        topScores: scores.slice(0, 3),
        hypothesisConfidence: hypotheses.map((item) => ({
          key: item.capabilityKey,
          confidence: item.confidence,
        })),
        memoryVersion: memory.version,
      }),
      scores[0]?.confidence || 0,
      snapshotFingerprint,
      memory.updatedAt,
    )
    .run();
  await recordAIRun(
    db,
    id,
    "account-orchestrator",
    generatedMemory,
    events.slice(0, 10).map((item) => item.id),
    generatedMemory.ok ? 82 : 72,
    localizedText(
      responseLocale,
      "Memory, hypotheses, and action queue recalculated; human review is required.",
      "Memória, hipóteses e fila recalculadas; revisão humana necessária.",
    ),
    false,
    responseLocale,
  );
  await db
    .prepare("UPDATE discoveries SET last_analyzed_at = ? WHERE id = ?")
    .bind(memory.updatedAt, id)
    .run();
  await persistImpactMetrics(db, id, memory.updatedAt);
  if (!recomputeOptions.skipEmbeddings)
    await refreshAccountEmbeddings(db, row, undefined, responseLocale).catch(
      () => undefined,
    );
}

async function backfillV4(
  db: D1Database,
  discoveryRows: Record<string, unknown>[],
  responseLocale: ResponseLocale,
) {
  for (const row of discoveryRows) {
    const id = String(row.id);
    const existing = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM account_events WHERE discovery_id = ?",
      )
      .bind(id)
      .first<{ count: number }>();
    if ((existing?.count || 0) === 0) {
      for (const answer of json<Answer[]>(row.answers_json, []))
        await addEvent(db, {
          id: `evt-${id}-answer-${answer.key}`,
          discoveryId: id,
          type: answer.key === "pain" ? "pain" : "discovery_answer",
          title: answer.question,
          content: answer.answer,
          sourceType: "answer",
          sourceId: answer.key,
          evidenceStatus: "confirmed",
          confidence: 82,
          occurredAt: answer.at || String(row.updated_at),
        });
      const meetings = await db
        .prepare("SELECT * FROM meetings WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>();
      for (const meeting of meetings.results)
        await addEvent(db, {
          id: `evt-${id}-${String(meeting.id)}`,
          discoveryId: id,
          type:
            String(meeting.meeting_status || "") === "scheduled"
              ? "scheduled_meeting"
              : "meeting",
          title: String(meeting.title),
          content: String(meeting.summary || meeting.notes),
          sourceType: "meeting",
          sourceId: String(meeting.id),
          evidenceStatus: "confirmed",
          confidence: 86,
          occurredAt: String(meeting.scheduled_at || meeting.created_at),
        });
      const stakeholders = await db
        .prepare("SELECT * FROM stakeholders WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>();
      for (const stakeholder of stakeholders.results)
        await addEvent(db, {
          id: `evt-${id}-${String(stakeholder.id)}`,
          discoveryId: id,
          type: "stakeholder",
          title: `${String(stakeholder.name)} · ${String(stakeholder.role)}`,
          content: `${String(stakeholder.notes || "")} Prioridades: ${json<string[]>(stakeholder.priorities_json, []).join(", ")}`,
          sourceType: "stakeholder",
          sourceId: String(stakeholder.id),
          evidenceStatus:
            String(stakeholder.source) === "manual"
              ? "confirmed"
              : "assumption",
          confidence: String(stakeholder.source) === "manual" ? 88 : 52,
          occurredAt: String(stakeholder.updated_at),
        });
    }
    const hierarchy = await db
      .prepare(
        "SELECT id, reports_to_id, created_at, updated_at FROM stakeholders WHERE discovery_id = ? AND reports_to_id IS NOT NULL",
      )
      .bind(id)
      .all<Record<string, unknown>>();
    for (const person of hierarchy.results)
      await db
        .prepare(
          "INSERT OR IGNORE INTO account_relationships (id, discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type, label, confidence, evidence_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `rel-${id}-${String(person.id)}-reports`,
          id,
          String(person.id),
          String(person.reports_to_id),
          "reporta_para",
          "Reporta para",
          88,
          "[]",
          "confirmed",
          String(person.created_at),
          String(person.updated_at),
        )
        .run();
    const memory = await db
      .prepare("SELECT discovery_id FROM account_memory WHERE discovery_id = ?")
      .bind(id)
      .first();
    if (!memory)
      await recomputeAccount(db, id, {
        skipGenerative: true,
        skipEmbeddings: true,
        responseLocale,
      });
  }
}

async function guidedSnapshotForAccount(
  db: D1Database,
  row: Record<string, unknown>,
  responseLocale: ResponseLocale = "en-US",
) {
  const id = String(row.id);
  const [
    sessionRows,
    questionRows,
    answerRows,
    pillarStatusRows,
    stakeholderRows,
  ] =
    await Promise.all([
      db
        .prepare(
          "SELECT * FROM guided_discovery_sessions WHERE discovery_id = ? ORDER BY updated_at DESC",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM guided_discovery_questions WHERE discovery_id = ? ORDER BY session_id, sequence",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM guided_discovery_answers WHERE discovery_id = ? ORDER BY updated_at DESC",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM guided_discovery_pillar_status WHERE discovery_id = ? ORDER BY updated_at DESC",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
    ]);
  return guidedSnapshot({
    row,
    sessions: sessionRows.results.map(mapGuidedSession),
    questions: questionRows.results.map(mapGuidedQuestion),
    answers: answerRows.results.map(mapGuidedAnswer),
    pillarStatuses: pillarStatusRows.results.map(mapGuidedPillarStatus),
    stakeholders: stakeholderRows.results.map(mapStakeholder),
    locale: responseLocale,
  });
}

type CapabilityAssessmentAnswer = Parameters<
  typeof scoreCapabilityDrivenAssessment
>[0]["answers"][number];

function capabilityAssessmentAnswer(
  answer: GuidedDiscoveryAnswerRow,
  questions: Map<string, GuidedDiscoveryQuestionRow>,
): CapabilityAssessmentAnswer | null {
  const question = questions.get(answer.questionId);
  const catalogQuestionId = question?.catalogQuestionId || answer.questionId;
  if (!cdiQuestion(catalogQuestionId)) return null;
  return {
    questionId: catalogQuestionId,
    status: answer.status,
    structured: answer.structured,
    answerText: answer.answerText,
    confidence: answer.confidence,
  };
}

function capabilityImpactState(
  assessment: CapabilityDrivenAssessment,
  capabilityKey: CdiCapabilityKey,
) {
  const capability = assessment.capabilities.find(
    (item) => String(item.id) === capabilityKey,
  );
  const pillar = assessment.pillars.find(
    (item) => String(item.key) === capabilityKey,
  );
  const review = assessment.capabilityReviews.find(
    (item) => item.key === capabilityKey,
  );
  const technologies = assessment.technologies
    .filter((item) => item.capabilities.includes(capabilityKey))
    .map((item) => ({
      id: item.id,
      name: item.name,
      fitScore: item.propensity,
      confidence: item.confidence,
      decisionBand: item.action,
      gateStatus: item.gateStatus,
      components: {
        penalties: Number(item.components.penalties || 0),
      },
    }));
  return {
    capability: capability
      ? {
          maturity: capability.maturity,
          heatmapStatus: capability.heatmapStatus,
        }
      : null,
    review: review
      ? {
          status: review.status,
          confidence: review.confidence,
          coreAnswered: review.coreAnswered,
          coreTotal: review.coreTotal,
          deepAnswered: review.deepAnswered,
          deepTotal: review.deepTotal,
          conflict: review.conflict,
        }
      : null,
    propensity: pillar?.propensity || 0,
    leadingTechnology: pillar?.leadingTechnology || null,
    technologies,
  };
}

function changedTechnologyFields(
  before: CapabilityDrivenAssessment,
  after: CapabilityDrivenAssessment,
  capabilityKey: CdiCapabilityKey,
  field: "gateStatus" | "action",
) {
  const beforeById = new Map(
    before.technologies
      .filter((item) => item.capabilities.includes(capabilityKey))
      .map((item) => [item.id, item]),
  );
  const afterById = new Map(
    after.technologies
      .filter((item) => item.capabilities.includes(capabilityKey))
      .map((item) => [item.id, item]),
  );
  return Array.from(new Set([...beforeById.keys(), ...afterById.keys()]))
    .flatMap((technologyId) => {
      const previous = beforeById.get(technologyId)?.[field] || null;
      const next = afterById.get(technologyId)?.[field] || null;
      return previous === next
        ? []
        : [
            {
              technologyId,
              technologyName:
                afterById.get(technologyId)?.name ||
                beforeById.get(technologyId)?.name ||
                technologyId,
              before: previous,
              after: next,
            },
          ];
    });
}

function changedTechnologyPenalties(
  before: CapabilityDrivenAssessment,
  after: CapabilityDrivenAssessment,
  capabilityKey: CdiCapabilityKey,
) {
  const beforeById = new Map(
    before.technologies
      .filter((item) => item.capabilities.includes(capabilityKey))
      .map((item) => [item.id, item]),
  );
  const afterById = new Map(
    after.technologies
      .filter((item) => item.capabilities.includes(capabilityKey))
      .map((item) => [item.id, item]),
  );
  return Array.from(new Set([...beforeById.keys(), ...afterById.keys()]))
    .flatMap((technologyId) => {
      const previous = Number(
        beforeById.get(technologyId)?.components.penalties || 0,
      );
      const next = Number(
        afterById.get(technologyId)?.components.penalties || 0,
      );
      return previous === next
        ? []
        : [
            {
              technologyId,
              technologyName:
                afterById.get(technologyId)?.name ||
                beforeById.get(technologyId)?.name ||
                technologyId,
              before: previous,
              after: next,
              delta: next - previous,
              triggered: previous === 0 && next > 0,
              cleared: previous > 0 && next === 0,
            },
          ];
    });
}

async function materializeCdiAnswerImpact(
  db: D1Database,
  input: {
    discoveryId: string;
    answerId: string;
    questionRow: Record<string, unknown>;
    previousRow?: Record<string, unknown> | null;
    locale: ResponseLocale;
    now: string;
  },
): Promise<CdiAnswerImpact | null> {
  const catalogQuestionId = String(
    input.questionRow.catalog_question_id || input.questionRow.id,
  );
  const catalogQuestion = cdiQuestion(catalogQuestionId);
  if (!catalogQuestion) return null;
  const [questionRows, answerRows] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM guided_discovery_questions WHERE discovery_id = ?",
      )
      .bind(input.discoveryId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM guided_discovery_answers WHERE discovery_id = ? AND is_current = 1 AND status <> 'draft' ORDER BY updated_at ASC",
      )
      .bind(input.discoveryId)
      .all<Record<string, unknown>>(),
  ]);
  const questions = new Map(
    questionRows.results
      .map(mapGuidedQuestion)
      .map((question) => [question.id, question]),
  );
  const latestAnswersByCatalogQuestion = (
    answers: GuidedDiscoveryAnswerRow[],
  ) => {
    const byQuestion = new Map<string, GuidedDiscoveryAnswerRow>();
    for (const answer of answers) {
      const question = questions.get(answer.questionId);
      const catalogQuestionId = question?.catalogQuestionId || answer.questionId;
      if (cdiQuestion(catalogQuestionId))
        byQuestion.set(catalogQuestionId, answer);
    }
    return Array.from(byQuestion.values());
  };
  const allCurrentAnswers = answerRows.results.map(mapGuidedAnswer);
  const currentAnswers = latestAnswersByCatalogQuestion(allCurrentAnswers);
  const afterAnswers = currentAnswers.flatMap((answer) => {
    const mapped = capabilityAssessmentAnswer(answer, questions);
    return mapped ? [mapped] : [];
  });
  const previousAnswer = input.previousRow
    ? mapGuidedAnswer(input.previousRow)
    : null;
  const beforeCandidates = allCurrentAnswers.filter(
    (answer) => answer.id !== input.answerId,
  );
  if (previousAnswer && previousAnswer.status !== "draft")
    beforeCandidates.push({ ...previousAnswer, isCurrent: true });
  const beforeRows = latestAnswersByCatalogQuestion(beforeCandidates);
  const beforeAnswers = beforeRows.flatMap((answer) => {
    const mapped = capabilityAssessmentAnswer(answer, questions);
    return mapped ? [mapped] : [];
  });
  const beforeAssessment = scoreCapabilityDrivenAssessment({
    answers: beforeAnswers,
    locale: input.locale,
  });
  const afterAssessment = scoreCapabilityDrivenAssessment({
    answers: afterAnswers,
    locale: input.locale,
  });
  const savedAnswer = allCurrentAnswers.find(
    (answer) => answer.id === input.answerId,
  );
  if (!savedAnswer) return null;
  const response = normalizeCdiResponse({
    questionId: catalogQuestionId,
    status: savedAnswer.status,
    structured: savedAnswer.structured,
    answerText: savedAnswer.answerText,
    confidence: savedAnswer.confidence,
  });
  const answerTrace = afterAssessment.trace.find(
    (item) => item.questionId === catalogQuestionId,
  );
  const evidence = answerTrace?.evidenceId
    ? afterAssessment.evidence.find(
        (item) => item.id === answerTrace.evidenceId,
      ) || null
    : null;
  const capabilityKey = catalogQuestion.capabilityKey;
  const before = capabilityImpactState(beforeAssessment, capabilityKey);
  const after = capabilityImpactState(afterAssessment, capabilityKey);
  const gateChanges = changedTechnologyFields(
    beforeAssessment,
    afterAssessment,
    capabilityKey,
    "gateStatus",
  );
  const recommendationChanges = changedTechnologyFields(
    beforeAssessment,
    afterAssessment,
    capabilityKey,
    "action",
  );
  const penaltyChanges = changedTechnologyPenalties(
    beforeAssessment,
    afterAssessment,
    capabilityKey,
  );
  const beforePenaltyTotal = before.technologies.reduce(
    (total, technology) => total + technology.components.penalties,
    0,
  );
  const afterPenaltyTotal = after.technologies.reduce(
    (total, technology) => total + technology.components.penalties,
    0,
  );
  const penaltyTotals = {
    before: beforePenaltyTotal,
    after: afterPenaltyTotal,
    delta: afterPenaltyTotal - beforePenaltyTotal,
  };
  const delta = {
    maturity:
      Number(after.capability?.maturity || 0) -
      Number(before.capability?.maturity || 0),
    technologyFit: Number(after.propensity || 0) - Number(before.propensity || 0),
    confidence:
      Number(after.review?.confidence || 0) -
      Number(before.review?.confidence || 0),
    evidenceCount: evidence ? 1 : 0,
    conflictChanged:
      Boolean(before.review?.conflict) !== Boolean(after.review?.conflict),
    penalties: penaltyTotals,
    penaltyChanges,
  };
  const source = {
    evidenceStatus: savedAnswer.evidenceStatus,
    stakeholderId: savedAnswer.stakeholderId,
    sourceType: savedAnswer.sourceType,
    sourceId: savedAnswer.sourceId,
    sourceDate: savedAnswer.sourceDate,
    confidence: savedAnswer.confidence,
    supersedesId: savedAnswer.supersedesId,
  };
  const impactId = `cdi-impact-${input.answerId}`;
  const statements = [
    db
      .prepare(
        "INSERT OR IGNORE INTO cdi_answer_impacts (id, discovery_id, answer_id, question_id, catalog_version, capability_key, dimension, response, evidence_id, before_json, after_json, delta_json, journey_ids_json, technology_ids_json, gate_changes_json, recommendation_changes_json, rule_trace_json, source_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        impactId,
        input.discoveryId,
        input.answerId,
        catalogQuestionId,
        CDI_CAPABILITY_CATALOG_VERSION,
        capabilityKey,
        catalogQuestion.dimension,
        response,
        answerTrace?.evidenceId || null,
        JSON.stringify(before),
        JSON.stringify(after),
        JSON.stringify(delta),
        JSON.stringify(answerTrace?.journeyIds || []),
        JSON.stringify(answerTrace?.technologyIds || []),
        JSON.stringify(gateChanges),
        JSON.stringify(recommendationChanges),
        JSON.stringify({
          engine: "deterministic",
          formula: {
            evidenceFit: 45,
            capabilityGap: 25,
            businessImpact: 15,
            journeyFit: 10,
            attachPriority: 5,
          },
          questionRationale: localizeCdi(
            catalogQuestion.rationale,
            input.locale,
          ),
          polarity: evidence?.polarity || null,
          strength: evidence?.strength || 0,
          penalties: {
            ...penaltyTotals,
            changes: penaltyChanges,
            application: "subtracted_after_weighted_components",
          },
          humanValidationRequired: true,
        }),
        JSON.stringify(source),
        input.now,
      ),
    db
      .prepare(
        "UPDATE cdi_conflicts SET status = 'resolved', resolution_json = ?, updated_at = ? WHERE discovery_id = ? AND status = 'open'",
      )
      .bind(
        JSON.stringify({ reason: "Recomputed after a new answer revision" }),
        input.now,
        input.discoveryId,
      ),
  ];
  for (const answer of currentAnswers) {
    const mappedAnswer = capabilityAssessmentAnswer(answer, questions);
    if (!mappedAnswer) continue;
    const trace = afterAssessment.trace.find(
      (item) => item.questionId === mappedAnswer.questionId,
    );
    const mappedEvidence = trace?.evidenceId
      ? afterAssessment.evidence.find((item) => item.id === trace.evidenceId)
      : null;
    const question = cdiQuestion(mappedAnswer.questionId);
    if (!trace?.evidenceId || !mappedEvidence || !question) continue;
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO cdi_evidence (id, discovery_id, answer_id, question_id, capability_key, dimension, response, polarity, strength, source_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `cdi-evidence-${answer.id}`,
          input.discoveryId,
          answer.id,
          mappedAnswer.questionId,
          question.capabilityKey,
          question.dimension,
          trace.response,
          mappedEvidence.polarity,
          mappedEvidence.strength,
          JSON.stringify({
            evidenceStatus: answer.evidenceStatus,
            stakeholderId: answer.stakeholderId,
            sourceType: answer.sourceType,
            sourceId: answer.sourceId,
            sourceDate: answer.sourceDate,
            confidence: answer.confidence,
            supersedesId: answer.supersedesId,
          }),
          answer.answeredAt || input.now,
        ),
    );
  }
  for (const capability of afterAssessment.capabilities) {
    const key = String(capability.id) as CdiCapabilityKey;
    const review = afterAssessment.capabilityReviews.find(
      (item) => item.key === key,
    );
    const pillar = afterAssessment.pillars.find(
      (item) => String(item.key) === key,
    );
    const evidenceIds = capability.evidence.map((item) => item.id).sort();
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO cdi_capability_snapshots (id, discovery_id, catalog_version, capability_key, maturity_json, confidence, status, evidence_fingerprint, computed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `cdi-snapshot-${input.answerId}-${key}`,
          input.discoveryId,
          CDI_CAPABILITY_CATALOG_VERSION,
          key,
          JSON.stringify({
            maturity: capability.maturity,
            heatmapStatus: capability.heatmapStatus,
            propensity: pillar?.propensity || 0,
            leadingTechnology: pillar?.leadingTechnology || null,
            review: review || null,
          }),
          review?.confidence || 0,
          review?.status || "NOT_STARTED",
          evidenceIds.join("|"),
          input.now,
        ),
    );
  }
  for (const conflict of afterAssessment.conflicts)
    statements.push(
      db
        .prepare(
          "INSERT INTO cdi_conflicts (id, discovery_id, capability_key, dimension, evidence_ids_json, status, resolution_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', '{}', ?, ?) ON CONFLICT(id) DO UPDATE SET evidence_ids_json = excluded.evidence_ids_json, status = 'open', resolution_json = '{}', updated_at = excluded.updated_at",
        )
        .bind(
          `cdi-conflict-${input.discoveryId}-${conflict.capabilityKey}-${conflict.dimension}`,
          input.discoveryId,
          conflict.capabilityKey,
          conflict.dimension,
          JSON.stringify(conflict.evidenceIds),
          input.now,
          input.now,
        ),
    );
  for (const technology of afterAssessment.technologies)
    statements.push(
      db
        .prepare(
          "INSERT INTO cdi_technology_reviews (id, discovery_id, technology_id, catalog_version, fit_score, confidence, decision_band, gate_status, components_json, trace_json, human_decision, reviewed_at, computed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?) ON CONFLICT(discovery_id, technology_id, catalog_version) DO UPDATE SET fit_score = excluded.fit_score, confidence = excluded.confidence, decision_band = excluded.decision_band, gate_status = excluded.gate_status, components_json = excluded.components_json, trace_json = excluded.trace_json, computed_at = excluded.computed_at",
        )
        .bind(
          `cdi-tech-${input.discoveryId}-${technology.id}-${CDI_CAPABILITY_CATALOG_VERSION}`,
          input.discoveryId,
          technology.id,
          CDI_CAPABILITY_CATALOG_VERSION,
          technology.propensity,
          technology.confidence,
          technology.action,
          technology.gateStatus,
          JSON.stringify(technology.components),
          JSON.stringify(
            afterAssessment.trace.filter((item) =>
              item.technologyIds.includes(technology.id),
            ),
          ),
          input.now,
        ),
    );
  await db.batch(statements);
  const row = await db
    .prepare("SELECT * FROM cdi_answer_impacts WHERE id = ?")
    .bind(impactId)
    .first<Record<string, unknown>>();
  return row ? mapCdiAnswerImpact(row) : null;
}

async function insertCatalogQuestion(
  db: D1Database,
  input: {
    sessionId: string;
    discoveryId: string;
    catalogQuestionId: string;
    sequence: number;
    now: string;
    status?: GuidedDiscoveryQuestionRow["status"];
  },
) {
  const catalog = getQuestionById(input.catalogQuestionId);
  if (!catalog) return null;
  const id = `gdq-${input.sessionId}-${catalog.id}`;
  await db
    .prepare(
      "INSERT OR IGNORE INTO guided_discovery_questions (id, session_id, discovery_id, catalog_question_id, pillar, prompt, hint, input_schema_json, source, rationale, citations_json, sequence, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'catalog', ?, '[]', ?, ?, ?, ?)",
    )
    .bind(
      id,
      input.sessionId,
      input.discoveryId,
      catalog.id,
      catalog.pillar,
      catalog.question,
      catalog.hint,
      JSON.stringify(catalog.input),
      catalog.rationale,
      input.sequence,
      input.status || "accepted",
      input.now,
      input.now,
    )
    .run();
  return id;
}

async function upsertGuidedPillarStatus(
  db: D1Database,
  input: {
    discoveryId: string;
    ownerEmail: string;
    pillarKey: GuidedDiscoveryPillarKey;
    status: GuidedDiscoveryPillarStatus["status"];
    sessionId?: string | null;
    progressPercent?: number;
    coveragePercent?: number;
    confidencePercent?: number;
    answeredCount?: number;
    requiredCount?: number;
    notRelevantReason?: string | null;
    reviewedAt?: string | null;
    now: string;
  },
) {
  const id = `gdps-${input.discoveryId}-${input.pillarKey}-${GUIDED_DISCOVERY_CATALOG_VERSION}`;
  await db
    .prepare(
      "INSERT INTO guided_discovery_pillar_status (id, discovery_id, owner_email, pillar_key, catalog_version, status, current_session_id, progress_percent, coverage_percent, confidence_percent, answered_count, required_count, not_relevant_reason, reviewed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(discovery_id, owner_email, pillar_key, catalog_version) DO UPDATE SET status = excluded.status, current_session_id = excluded.current_session_id, progress_percent = excluded.progress_percent, coverage_percent = excluded.coverage_percent, confidence_percent = excluded.confidence_percent, answered_count = excluded.answered_count, required_count = excluded.required_count, not_relevant_reason = excluded.not_relevant_reason, reviewed_at = excluded.reviewed_at, updated_at = excluded.updated_at",
    )
    .bind(
      id,
      input.discoveryId,
      input.ownerEmail,
      input.pillarKey,
      GUIDED_DISCOVERY_CATALOG_VERSION,
      input.status,
      input.sessionId || null,
      input.progressPercent || 0,
      input.coveragePercent || 0,
      input.confidencePercent || 0,
      input.answeredCount || 0,
      input.requiredCount || 5,
      input.notRelevantReason || null,
      input.reviewedAt || null,
      input.now,
      input.now,
    )
    .run();
}

async function refreshGuidedSession(
  db: D1Database,
  row: Record<string, unknown>,
  sessionId: string,
  now = new Date().toISOString(),
) {
  const discoveryId = String(row.id);
  const sessionRow = await db
    .prepare(
      "SELECT * FROM guided_discovery_sessions WHERE id = ? AND discovery_id = ?",
    )
    .bind(sessionId, discoveryId)
    .first<Record<string, unknown>>();
  if (!sessionRow) return null;
  const session = mapGuidedSession(sessionRow);
  const [questionRows, answerRows, stakeholderRows] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM guided_discovery_questions WHERE session_id = ? ORDER BY sequence",
      )
      .bind(sessionId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM guided_discovery_answers WHERE session_id = ? AND is_current = 1 ORDER BY updated_at DESC",
      )
      .bind(sessionId)
      .all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT * FROM stakeholders WHERE discovery_id = ? AND source = 'manual'",
      )
      .bind(discoveryId)
      .all<Record<string, unknown>>(),
  ]);
  const questions = questionRows.results.map(mapGuidedQuestion);
  const answers = answerRows.results.map(mapGuidedAnswer);
  const catalogAnswers: GuidedDiscoveryAnswerLike[] = answers.map((answer) => ({
    ...answer,
    questionId:
      questions.find((question) => question.id === answer.questionId)
        ?.catalogQuestionId || answer.questionId,
  }));
  const route = materializeQuestionRoute({
    mode: session.mode,
    selectedPillars: session.selectedPillars.filter(isGuidedDiscoveryPillar),
    answers: catalogAnswers,
    scoreHints: scoreHintsForGuidedDiscovery(row) as Record<string, number>,
    hasRelevantStakeholder: stakeholderRows.results.length > 0,
    hasOwner: stakeholderRows.results.some(
      (person) => String(person.influence) === "Alta",
    ),
    hasContradiction: answers.some(
      (answer) =>
        answer.evidenceStatus === "hypothesis" &&
        Boolean(answer.structured.contradiction),
    ),
  });
  const existingByCatalog = new Map(
    questions
      .filter((question) => question.catalogQuestionId)
      .map((question) => [question.catalogQuestionId!, question]),
  );
  for (let sequence = 0; sequence < route.questionIds.length; sequence += 1) {
    const catalogId = route.questionIds[sequence];
    const existing = existingByCatalog.get(catalogId);
    if (!existing)
      await insertCatalogQuestion(db, {
        sessionId,
        discoveryId,
        catalogQuestionId: catalogId,
        sequence,
        now,
      });
    else if (existing.sequence !== sequence)
      await db
        .prepare(
          "UPDATE guided_discovery_questions SET sequence = ?, updated_at = ? WHERE id = ?",
        )
        .bind(sequence, now, existing.id)
        .run();
  }
  const refreshedQuestions = (
    await db
      .prepare(
        "SELECT * FROM guided_discovery_questions WHERE session_id = ? ORDER BY sequence",
      )
      .bind(sessionId)
      .all<Record<string, unknown>>()
  ).results.map(mapGuidedQuestion);
  const refreshedAnswers = (
    await db
      .prepare(
        "SELECT * FROM guided_discovery_answers WHERE session_id = ? AND is_current = 1",
      )
      .bind(sessionId)
      .all<Record<string, unknown>>()
  ).results.map(mapGuidedAnswer);
  const activeRoute = refreshedQuestions.filter(
    (question) =>
      question.status !== "dismissed" && question.status !== "proposed",
  );
  const metrics = calculateDiscoveryMetrics(
    activeRoute.map((question) => question.id),
    refreshedAnswers,
  );
  const answerByQuestion = new Map(
    refreshedAnswers.map((answer) => [answer.questionId, answer]),
  );
  const ranked = rankNextQuestion({
    questions: activeRoute.flatMap((question) => {
      const catalog = question.catalogQuestionId
        ? getQuestionById(question.catalogQuestionId)
        : null;
      return catalog ? [{ ...catalog, id: question.id }] : [];
    }),
    answers: refreshedAnswers,
    hypothesisImpactByPillar: scoreHintsForGuidedDiscovery(row),
    stakeholderCoverageByPillar: Object.fromEntries(
      GUIDED_DISCOVERY_CATALOG.map((question) => [
        question.pillar,
        stakeholderRows.results.length ? 72 : 12,
      ]),
    ),
  });
  const rankedId = ranked[0]?.question.id;
  const acceptedAI = activeRoute.find(
    (question) =>
      question.source === "ai" &&
      question.status === "accepted" &&
      !answerByQuestion.has(question.id),
  );
  const nextQuestionId =
    session.status === "completed" ? null : rankedId || acceptedAI?.id || null;
  const updates = activeRoute
    .filter(
      (question) =>
        question.status === "active" && question.id !== nextQuestionId,
    )
    .map((question) =>
      db
        .prepare(
          "UPDATE guided_discovery_questions SET status = 'accepted', updated_at = ? WHERE id = ?",
        )
        .bind(now, question.id),
    );
  if (nextQuestionId)
    updates.push(
      db
        .prepare(
          "UPDATE guided_discovery_questions SET status = 'active', updated_at = ? WHERE id = ?",
        )
        .bind(now, nextQuestionId),
    );
  if (updates.length) await db.batch(updates);
  await db
    .prepare(
      "UPDATE guided_discovery_sessions SET selected_pillars_json = ?, progress_percent = ?, coverage_percent = ?, current_question_id = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
    )
    .bind(
      JSON.stringify(route.selectedPillars),
      metrics.progressPercent,
      metrics.coveragePercent,
      nextQuestionId,
      now,
      sessionId,
      discoveryId,
    )
    .run();
  const pillarKey = route.selectedPillars.find(isGuidedDiscoveryPillar);
  if (pillarKey) {
    const essentialQuestions = activeRoute.filter((question) => {
      const catalog = question.catalogQuestionId
        ? getQuestionById(question.catalogQuestionId)
        : null;
      return catalog?.essential !== false && question.pillar === pillarKey;
    });
    const essentialQuestionIds = new Set(
      essentialQuestions.map((question) => question.id),
    );
    const essentialAnswers = refreshedAnswers.filter((answer) =>
      essentialQuestionIds.has(answer.questionId),
    );
    const essentialMetrics = calculateDiscoveryMetrics(
      essentialQuestions.map((question) => question.id),
      essentialAnswers,
    );
    const knownConfidence = essentialAnswers
      .filter((answer) => answer.status === "confirmed")
      .map((answer) => answer.confidence);
    const confidencePercent = knownConfidence.length
      ? Math.round(
          knownConfidence.reduce((sum, value) => sum + value, 0) /
            knownConfidence.length,
        )
      : 0;
    await upsertGuidedPillarStatus(db, {
      discoveryId,
      ownerEmail: session.ownerEmail,
      pillarKey,
      status: "in_progress",
      sessionId,
      progressPercent: essentialMetrics.progressPercent,
      coveragePercent: essentialMetrics.coveragePercent,
      confidencePercent,
      answeredCount: essentialAnswers.filter(
        (answer) =>
          answer.status === "confirmed" || answer.status === "unknown",
      ).length,
      requiredCount: essentialQuestions.length || 5,
      now,
    });
  }
  return {
    sessionId,
    metrics,
    currentQuestionId: nextQuestionId,
    selectedPillars: route.selectedPillars,
  };
}

async function materializeLegacyGuidedAnswers(
  db: D1Database,
  row: Record<string, unknown>,
  sessionId: string,
  now: string,
  selectedPillars: GuidedDiscoveryPillarKey[] = [],
) {
  const discoveryId = String(row.id);
  const legacy = json<Answer[]>(row.answers_json, []);
  let sequence =
    Number(
      (
        await db
          .prepare(
            "SELECT MAX(sequence) AS sequence FROM guided_discovery_questions WHERE session_id = ?",
          )
          .bind(sessionId)
          .first<{ sequence: number | null }>()
      )?.sequence ?? -1,
    ) + 1;
  for (const item of legacy) {
    const catalogId = legacyQuestionId(item.key);
    if (!catalogId) continue;
    const catalogQuestion = getQuestionById(catalogId);
    if (
      selectedPillars.length &&
      (!catalogQuestion ||
        !selectedPillars.includes(catalogQuestion.pillar))
    )
      continue;
    let question = await db
      .prepare(
        "SELECT * FROM guided_discovery_questions WHERE session_id = ? AND catalog_question_id = ?",
      )
      .bind(sessionId, catalogId)
      .first<Record<string, unknown>>();
    if (!question) {
      const questionId = await insertCatalogQuestion(db, {
        sessionId,
        discoveryId,
        catalogQuestionId: catalogId,
        sequence,
        now,
        status: "answered",
      });
      sequence += 1;
      question = questionId
        ? await db
            .prepare("SELECT * FROM guided_discovery_questions WHERE id = ?")
            .bind(questionId)
            .first<Record<string, unknown>>()
        : null;
    }
    if (!question) continue;
    const answerId = `gda-${sessionId}-${catalogId}-legacy`;
    await db
      .prepare(
        "INSERT OR IGNORE INTO guided_discovery_answers (id, session_id, question_id, discovery_id, structured_json, answer_text, evidence_status, stakeholder_id, source_type, source_id, source_date, confidence, status, supersedes_id, is_current, answered_at, created_at, updated_at) VALUES (?, ?, ?, ?, '{}', ?, 'confirmed', NULL, 'legacy', ?, ?, 82, 'confirmed', NULL, 1, ?, ?, ?)",
      )
      .bind(
        answerId,
        sessionId,
        String(question.id),
        discoveryId,
        item.answer,
        item.key,
        item.at || now,
        item.at || now,
        item.at || now,
        item.at || now,
      )
      .run();
    await db
      .prepare(
        "UPDATE guided_discovery_questions SET status = 'answered', updated_at = ? WHERE id = ?",
      )
      .bind(now, String(question.id))
      .run();
  }
}

async function accountPayload(
  db: D1Database,
  discoveryRows: Record<string, unknown>[],
  responseLocale: ResponseLocale = "en-US",
) {
  const ids = discoveryRows.map((row) => String(row.id));
  if (!ids.length)
    return {
      discoveries: [],
      meetings: [],
      stakeholders: [],
      events: [],
      accountEvents: [],
      actions: [],
      hypotheses: [],
      memories: [],
      plans: [],
      documents: [],
      chats: [],
      aiRuns: [],
      relationships: [],
      graphLayouts: [],
      externalSignals: [],
      snapshots: [],
      actionFeedback: [],
      guidedDiscoveries: [],
      changeSets: [],
      crmHandoffs: [],
      impactMetrics: [],
      agentPipelineRuns: [],
      commercialProof: [],
      stakeholderCapabilityAssignments: [],
      relationshipCapabilityCoverage: [],
      answerImpacts: [],
      cdiEvidence: [],
      cdiCapabilitySnapshots: [],
      cdiConflicts: [],
      cdiTechnologyReviews: [],
      capabilityPortfolioCoverage: {
        catalogVersion: CDI_CAPABILITY_CATALOG_VERSION,
        totalAccounts: 0,
        capabilities: [],
      },
    };
  const placeholders = ids.map(() => "?").join(",");
  const queries = [
    db
      .prepare(
        `SELECT * FROM meetings WHERE discovery_id IN (${placeholders}) ORDER BY COALESCE(scheduled_at, created_at) DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_maps WHERE discovery_id IN (${placeholders})`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM stakeholders WHERE discovery_id IN (${placeholders}) ORDER BY created_at`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM audit_events WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_events WHERE discovery_id IN (${placeholders}) ORDER BY occurred_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_actions WHERE discovery_id IN (${placeholders}) ORDER BY priority_score DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM opportunity_hypotheses WHERE discovery_id IN (${placeholders}) ORDER BY confidence DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_memory WHERE discovery_id IN (${placeholders})`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_plans WHERE discovery_id IN (${placeholders})`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM documents WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_chat_messages WHERE discovery_id IN (${placeholders}) ORDER BY created_at`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM ai_runs WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_relationships WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_graph_layouts WHERE discovery_id IN (${placeholders})`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM external_signals WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_snapshots WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 120`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM action_feedback WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 120`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM guided_discovery_sessions WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM guided_discovery_questions WHERE discovery_id IN (${placeholders}) ORDER BY session_id, sequence`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM guided_discovery_answers WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM guided_discovery_pillar_status WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_change_sets WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 120`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM crm_handoffs WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC LIMIT 120`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM account_impact_metrics WHERE discovery_id IN (${placeholders}) ORDER BY computed_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM commercial_agent_runs WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 280`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM stakeholder_capability_assignments WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM cdi_answer_impacts WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM cdi_evidence WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM cdi_capability_snapshots WHERE discovery_id IN (${placeholders}) ORDER BY computed_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM cdi_conflicts WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`,
      )
      .bind(...ids),
    db
      .prepare(
        `SELECT * FROM cdi_technology_reviews WHERE discovery_id IN (${placeholders}) ORDER BY fit_score DESC`,
      )
      .bind(...ids),
  ];
  const [
    meetingRows,
    mapRows,
    stakeholderRows,
    auditRows,
    eventRows,
    actionRows,
    hypothesisRows,
    memoryRows,
    planRows,
    documentRows,
    chatRows,
    aiRunRows,
    relationshipRows,
    layoutRows,
    signalRows,
    snapshotRows,
    feedbackRows,
    guidedSessionRows,
    guidedQuestionRows,
    guidedAnswerRows,
    guidedPillarStatusRows,
    changeSetRows,
    handoffRows,
    impactRows,
    commercialAgentRows,
    assignmentRows,
    answerImpactRows,
    cdiEvidenceRows,
    cdiCapabilitySnapshotRows,
    cdiConflictRows,
    cdiTechnologyReviewRows,
  ] = await Promise.all(
    queries.map((query) => query.all<Record<string, unknown>>()),
  );
  const meetings = meetingRows.results.map(mapMeeting);
  const maps = new Map(
    mapRows.results.map((row) => [
      String(row.discovery_id),
      {
        nodes: json<AccountNode[]>(row.nodes_json, []),
        edges: json<AccountEdge[]>(row.edges_json, []),
        updatedAt: String(row.updated_at),
      } as AccountMap,
    ]),
  );
  const mappedStakeholders = stakeholderRows.results.map(mapStakeholder);
  const guidedSessions = guidedSessionRows.results.map(mapGuidedSession);
  const guidedQuestions = guidedQuestionRows.results.map(mapGuidedQuestion);
  const guidedAnswers = guidedAnswerRows.results.map(mapGuidedAnswer);
  const guidedPillarStatuses =
    guidedPillarStatusRows.results.map(mapGuidedPillarStatus);
  const changeSets = changeSetRows.results.map(mapChangeSet);
  const crmHandoffs = handoffRows.results.map(mapCrmHandoff);
  const impactMetrics = impactRows.results.map(mapImpactMetric);
  const agentPipelineRuns = commercialAgentRows.results.map(
    mapCommercialAgentRun,
  );
  const stakeholderCapabilityAssignments =
    assignmentRows.results.map(mapStakeholderCapabilityAssignment);
  const answerImpacts = answerImpactRows.results.map(mapCdiAnswerImpact);
  const guidedDiscoveries = discoveryRows.map((row) =>
    guidedSnapshot({
      row,
      sessions: guidedSessions,
      questions: guidedQuestions,
      answers: guidedAnswers,
      pillarStatuses: guidedPillarStatuses,
      stakeholders: mappedStakeholders,
      locale: responseLocale,
    }),
  );
  const assignmentRoles: StakeholderCapabilityAssignment["role"][] = [
    "owner",
    "decision_maker",
    "technical_contact",
  ];
  const relationshipCapabilityCoverage = discoveryRows.map((row) => {
    const discoveryId = String(row.id);
    const accountAssignments = stakeholderCapabilityAssignments.filter(
      (item) =>
        item.discoveryId === discoveryId && item.status === "confirmed",
    );
    return {
      discoveryId,
      catalogVersion: CDI_CAPABILITY_CATALOG_VERSION,
      capabilities: CDI_CAPABILITIES.map((capability) => {
        const assignments = accountAssignments.filter(
          (item) => item.capabilityKey === capability.key,
        );
        const roles = Array.from(new Set(assignments.map((item) => item.role)));
        return {
          key: capability.key,
          label: localizeCdi(capability.label, responseLocale),
          assignments,
          stakeholderIds: Array.from(
            new Set(assignments.map((item) => item.stakeholderId)),
          ),
          roles,
          coveragePercent: Math.round(
            (roles.length / assignmentRoles.length) * 100,
          ),
          gaps: assignmentRoles.filter((role) => !roles.includes(role)),
        };
      }),
    };
  });
  const reviewedStatuses = new Set([
    "reviewed_sufficient",
    "reviewed_gaps",
    "not_relevant",
  ]);
  const capabilityPortfolioCoverage = {
    catalogVersion: CDI_CAPABILITY_CATALOG_VERSION,
    totalAccounts: discoveryRows.length,
    capabilities: CDI_CAPABILITIES.map((capability) => {
      const accounts = discoveryRows.map((row) => {
        const accountId = String(row.id);
        const currentStatuses = guidedPillarStatuses
          .filter(
            (item) =>
              item.discoveryId === accountId &&
              item.pillarKey === capability.key &&
              item.catalogVersion === CDI_CAPABILITY_CATALOG_VERSION,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const current = currentStatuses[0] || null;
        const hasLegacyReview = guidedPillarStatuses.some(
          (item) =>
            item.discoveryId === accountId &&
            item.pillarKey === capability.key &&
            item.catalogVersion !== CDI_CAPABILITY_CATALOG_VERSION &&
            reviewedStatuses.has(item.status),
        );
        const state =
          current && current.status !== "not_started"
            ? current.status
            : hasLegacyReview
              ? "needs_review"
              : "not_started";
        const guided = guidedDiscoveries.find(
          (item) => item.discoveryId === accountId,
        );
        const assessment = guided?.pillarAssessments.find(
          (item) => item.key === capability.key,
        );
        const hasCurrentEvidence = Boolean(
          current && current.status !== "not_started",
        );
        return {
          accountId,
          accountName: String(row.customer_name),
          status: state,
          technologyFit: hasCurrentEvidence
            ? Number(assessment?.propensity || 0)
            : null,
          confidence: hasCurrentEvidence
            ? Number(current?.confidencePercent || 0)
            : null,
          reviewedAt: current?.reviewedAt || null,
          leadingTechnology: hasCurrentEvidence
            ? assessment?.leadingTechnology || null
            : null,
        };
      });
      const count = (status: string) =>
        accounts.filter((account) => account.status === status).length;
      const reviewedAccounts = accounts.filter((account) =>
        reviewedStatuses.has(account.status),
      ).length;
      return {
        key: capability.key,
        label: localizeCdi(capability.label, responseLocale),
        description: localizeCdi(capability.description, responseLocale),
        totalAccounts: discoveryRows.length,
        reviewedAccounts,
        coveragePercent: discoveryRows.length
          ? Math.round((reviewedAccounts / discoveryRows.length) * 100)
          : 0,
        inProgress: count("in_progress"),
        reviewedSufficient: count("reviewed_sufficient"),
        reviewedWithGaps: count("reviewed_gaps"),
        notRelevant: count("not_relevant"),
        notStarted: count("not_started"),
        needsReview: count("needs_review"),
        accounts,
      };
    }),
  };
  return {
    discoveries: discoveryRows.map((row) =>
      mapDiscovery(
        row,
        meetings.filter((item) => item.discoveryId === String(row.id)),
        maps.get(String(row.id)),
      ),
    ),
    meetings,
    stakeholders: mappedStakeholders,
    events: auditRows.results.map((row) => ({
      id: row.id,
      discoveryId: row.discovery_id,
      type: row.type,
      detail: row.detail,
      createdAt: row.created_at,
    })),
    accountEvents: eventRows.results.map(mapAccountEvent),
    actions: actionRows.results.map(mapAction),
    hypotheses: hypothesisRows.results.map(mapHypothesis),
    memories: memoryRows.results.map((row) => ({
      discoveryId: String(row.discovery_id),
      ...mapMemory(row)!,
    })),
    plans: planRows.results.map((row) => mapPlan(row)!),
    documents: documentRows.results.map(
      (row) =>
        ({
          id: String(row.id),
          discoveryId: String(row.discovery_id),
          name: String(row.name),
          contentType: String(row.content_type),
          sizeBytes: Number(row.size_bytes),
          status: String(row.status),
          summary: String(row.summary),
          createdAt: String(row.created_at),
        }) satisfies AccountDocument,
    ),
    chats: chatRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      role: String(row.role),
      content: String(row.content),
      citations: json<EvidenceRef[]>(row.citations_json, []),
      aiStatus: String(row.ai_status),
      createdAt: String(row.created_at),
    })),
    aiRuns: aiRunRows.results.map((row) => ({
      id: row.id,
      discoveryId: row.discovery_id,
      agent: row.agent,
      provider: row.provider,
      model: row.model,
      status: row.status,
      confidence: row.confidence,
      sources: json<string[]>(row.source_ids_json, []),
      validated: Boolean(row.validated),
      detail: row.detail,
      promptTokens: Number(row.prompt_tokens || 0),
      outputTokens: Number(row.output_tokens || 0),
      latencyMs: Number(row.latency_ms || 0),
      cached: Boolean(row.cache_hit),
      errorCode: row.error_code || null,
      locale: String(row.locale || "en-US"),
      createdAt: row.created_at,
    })),
    relationships: relationshipRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      sourceStakeholderId: String(row.source_stakeholder_id),
      targetStakeholderId: String(row.target_stakeholder_id),
      relationType: String(row.relation_type),
      label: String(row.label || ""),
      confidence: Number(row.confidence),
      evidence: json<EvidenceRef[]>(row.evidence_json, []),
      status: String(row.status),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
    graphLayouts: layoutRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      mode: String(row.mode),
      nodes: json<Array<{ id: string; x: number; y: number }>>(
        row.nodes_json,
        [],
      ),
      viewport: json<Record<string, number>>(row.viewport_json, {}),
      updatedAt: String(row.updated_at),
    })),
    externalSignals: signalRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      title: String(row.title),
      summary: String(row.summary),
      sourceUrl: String(row.source_url),
      publisher: String(row.publisher || ""),
      publishedAt: row.published_at ? String(row.published_at) : null,
      status: String(row.status),
      confidence: Number(row.confidence),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
    })),
    snapshots: snapshotRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      reason: String(row.reason),
      snapshot: json<Record<string, unknown>>(row.snapshot_json, {}),
      confidence: Number(row.confidence),
      createdAt: String(row.created_at),
    })),
    actionFeedback: feedbackRows.results.map((row) => ({
      id: String(row.id),
      actionId: String(row.action_id),
      discoveryId: String(row.discovery_id),
      feedbackType: String(row.feedback_type),
      reason: String(row.reason || ""),
      adjustment: Number(row.adjustment || 0),
      previousStatus: String(row.previous_status || ""),
      newStatus: String(row.new_status || ""),
      createdAt: String(row.created_at),
    })),
    guidedDiscoveries,
    stakeholderCapabilityAssignments,
    relationshipCapabilityCoverage,
    answerImpacts,
    cdiEvidence: cdiEvidenceRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      answerId: row.answer_id ? String(row.answer_id) : null,
      questionId: String(row.question_id),
      capabilityKey: String(row.capability_key),
      dimension: String(row.dimension),
      response: String(row.response),
      polarity: row.polarity ? String(row.polarity) : null,
      strength: Number(row.strength || 0),
      source: json<Record<string, unknown>>(row.source_json, {}),
      createdAt: String(row.created_at),
    })),
    cdiCapabilitySnapshots: cdiCapabilitySnapshotRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      catalogVersion: String(row.catalog_version),
      capabilityKey: String(row.capability_key),
      maturity: json<Record<string, unknown>>(row.maturity_json, {}),
      confidence: Number(row.confidence || 0),
      status: String(row.status),
      evidenceFingerprint: String(row.evidence_fingerprint || ""),
      computedAt: String(row.computed_at),
    })),
    cdiConflicts: cdiConflictRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      capabilityKey: String(row.capability_key),
      dimension: String(row.dimension),
      evidenceIds: json<string[]>(row.evidence_ids_json, []),
      status: String(row.status),
      resolution: json<Record<string, unknown>>(row.resolution_json, {}),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    })),
    cdiTechnologyReviews: cdiTechnologyReviewRows.results.map((row) => ({
      id: String(row.id),
      discoveryId: String(row.discovery_id),
      technologyId: String(row.technology_id),
      catalogVersion: String(row.catalog_version),
      fitScore: Number(row.fit_score || 0),
      confidence: Number(row.confidence || 0),
      decisionBand: String(row.decision_band),
      gateStatus: String(row.gate_status),
      components: json<Record<string, unknown>>(row.components_json, {}),
      trace: json<Array<Record<string, unknown>>>(row.trace_json, []),
      humanDecision: row.human_decision
        ? String(row.human_decision)
        : null,
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
      computedAt: String(row.computed_at),
    })),
    capabilityPortfolioCoverage,
    changeSets,
    crmHandoffs,
    impactMetrics,
    agentPipelineRuns,
    commercialProof: discoveryRows.map((row) => {
      const discoveryId = String(row.id);
      const accountChangeSets = changeSets.filter(
        (item) => item.discoveryId === discoveryId,
      );
      const accountHandoffs = crmHandoffs.filter(
        (item) => item.discoveryId === discoveryId,
      );
      const pipeline = agentPipelineRuns.filter(
        (item) => item.discoveryId === discoveryId,
      );
      return {
        discoveryId,
        latestChangeSet: accountChangeSets[0] || null,
        changeSets: accountChangeSets,
        handoffs: accountHandoffs,
        latestHandoff: accountHandoffs[0] || null,
        impact:
          impactMetrics.find((item) => item.discoveryId === discoveryId) ||
          null,
        agentPipeline: pipeline,
        latestWorkflowId: pipeline[0]?.workflowId || null,
        requiresHumanApproval: true,
        externalWritePerformed: false,
        handoffRecorded: accountHandoffs.some(
          (handoff) => handoff.status === "handed_off",
        ),
      };
    }),
  };
}

async function handleGET(request: Request) {
  const db = (env as unknown as { DB: D1Database }).DB;
  await ensureSchema(db);
  await seed(db);
  const scope = scopeFor(request);
  const responseLocale = resolveResponseLocale(request);
  let rows;
  if (scope === "private") {
    const denied = privateGate(request);
    if (denied) return denied;
    const { email } = requestIdentity(request);
    rows = await db
      .prepare(
        "SELECT * FROM discoveries WHERE visibility = 'private' AND owner_email = ? ORDER BY updated_at DESC",
      )
      .bind(email)
      .all<Record<string, unknown>>();
    const accountIds = rows.results.map((row) => String(row.id));
    await seedStakeholderTrees(db, accountIds);
    await backfillV4(db, rows.results, responseLocale);
    for (const row of rows.results) {
      const last = row.last_analyzed_at
        ? new Date(String(row.last_analyzed_at)).getTime()
        : 0;
      const latestRun = await db
        .prepare(
          "SELECT locale, created_at FROM ai_runs WHERE discovery_id = ? AND agent = 'account-orchestrator' ORDER BY created_at DESC LIMIT 1",
        )
        .bind(String(row.id))
        .first<{ locale: string | null; created_at: string }>();
      const latestLocale = parseResponseLocale(latestRun?.locale);
      const latestAnalysis = Math.max(
        last,
        latestRun?.created_at ? new Date(latestRun.created_at).getTime() : 0,
      );
      if (
        Date.now() - latestAnalysis > 12 * 3600000 ||
        latestLocale !== responseLocale
      ) {
        await recomputeAccount(db, String(row.id), {
          skipGenerative: true,
          skipEmbeddings: true,
          responseLocale,
        });
      }
    }
  } else {
    rows = await db
      .prepare(
        "SELECT * FROM discoveries WHERE visibility = 'demo' OR visibility IS NULL ORDER BY updated_at DESC",
      )
      .all<Record<string, unknown>>();
    const accountIds = rows.results.map((row) => String(row.id));
    await seedStakeholderTrees(db, accountIds);
    await backfillV4(db, rows.results, "pt-BR");
  }
  const accountId = new URL(request.url).searchParams.get("accountId");
  const payload = await accountPayload(
    db,
    accountId
      ? rows.results.filter((row) => String(row.id) === accountId)
      : rows.results,
    responseLocale,
  );
  return Response.json(
    scope === "demo" ? localizeDemoPayload(payload, responseLocale) : payload,
  );
}

const list = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
    : String(value || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

async function handlePOST(request: Request) {
  const locale = resolveResponseLocale(request);
  const db = (env as unknown as { DB: D1Database }).DB;
  await ensureSchema(db);
  const parsedBody = await parseLocalizedJsonObject(request, locale);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.value;
  const scope = scopeFor(request, body);
  if (scope !== "private")
    return Response.json(
      {
        error:
          "A demonstração pública é somente leitura. Entre no workspace para salvar dados reais.",
      },
      { status: 403 },
    );
  const denied = privateGate(request);
  if (denied) return denied;
  const identity = requestIdentity(request);
  const now = new Date().toISOString();
  if (body.action === "create") {
    const name = String(body.customerName || "").trim();
    if (!name)
      return Response.json(
        { error: "Informe o nome da conta." },
        { status: 400 },
      );
    const defaultIndustry = localizedText(
      locale,
      "Not provided",
      "Não informado",
    );
    const id = `cdi-${Date.now()}`;
    const scores = initialScores(locale);
    const accountMap = buildAccountMap(
      {
        customerName: name,
        industry: String(body.industry || defaultIndustry),
        scores,
      },
      [],
      [],
    );
    const classification =
      String(body.dataClassification) === "confidential"
        ? "confidential"
        : "test";
    const rawDomain = String(body.companyDomain || "").trim();
    const domain = normalizeCompanyDomain(rawDomain);
    if (rawDomain && !domain)
      return Response.json(
        {
          error: "Informe um domínio corporativo válido, como empresa.com.br.",
        },
        { status: 400 },
      );
    await db
      .prepare(
        "INSERT INTO discoveries (id, customer_name, industry, company_size, owner, stage, progress, priority, challenge_summary, answers_json, scores_json, recommendations_json, next_engagement, created_at, updated_at, owner_email, visibility, data_classification, company_domain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        id,
        name,
        String(body.industry || defaultIndustry),
        String(body.companySize || "Enterprise"),
        identity.email.split("@")[0],
        "Account intelligence",
        8,
        "Baixa",
        localizedText(
          locale,
          "Account created. Add information to start building its memory.",
          "Conta criada. Adicione uma informação para iniciar a memória.",
        ),
        "[]",
        JSON.stringify(scores),
        "[]",
        localizedText(
          locale,
          "Record the first piece of information",
          "Registrar primeira informação",
        ),
        now,
        now,
        identity.email,
        "private",
        classification,
        domain,
      )
      .run();
    await db
      .prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(
        id,
        JSON.stringify(accountMap.nodes),
        JSON.stringify(accountMap.edges),
        now,
      )
      .run();
    await addEvent(db, {
      id: `evt-${id}-created`,
      discoveryId: id,
      type: "account_created",
      title: localizedText(
        locale,
        "Account added to the workspace",
        "Conta adicionada ao workspace",
      ),
      content: localizedText(
        locale,
        `${name} was added for pre-CRM account intelligence.`,
        `Conta ${name} criada para inteligência antes do CRM.`,
      ),
      sourceType: "system",
      sourceId: id,
      evidenceStatus: "confirmed",
      confidence: 100,
      occurredAt: now,
    });
    await seedStakeholderTrees(db, [id]);
    await recomputeAccount(db, id, { responseLocale: locale });
    return Response.json({ ok: true, id }, { status: 201 });
  }
  if (body.action === "briefing") {
    const briefingDate = now.slice(0, 10);
    const briefingProvider = aiAdapter();
    const briefingConfig = await cacheKeyFor([
      "daily-briefing",
      providerCacheSignature(briefingProvider, "test", locale),
    ]);
    const existing = await db
      .prepare(
        "SELECT * FROM daily_briefing_variants WHERE owner_email = ? AND briefing_date = ? AND locale = ? AND expires_at > ? AND provider <> 'deterministic-fallback' AND model <> '' AND evidence_fingerprint LIKE ?",
      )
      .bind(identity.email, briefingDate, locale, now, `${briefingConfig}:%`)
      .first<Record<string, unknown>>();
    if (existing && !body.force)
      return Response.json({
        briefing: json<Record<string, unknown>>(existing.content_json, {}),
        provider: String(existing.provider),
        model: String(existing.model || ""),
        cached: true,
        generatedAt: String(existing.generated_at),
      });
    const rows = await db
      .prepare(
        "SELECT * FROM discoveries WHERE visibility = 'private' AND owner_email = ? ORDER BY progress DESC, updated_at DESC LIMIT 5",
      )
      .bind(identity.email)
      .all<Record<string, unknown>>();
    const accountIds = rows.results.map((item) => String(item.id));
    if (!accountIds.length)
      return Response.json({
        briefing: {
          headline: localizedText(
            locale,
            "Start building account intelligence",
            "Comece sua inteligência de contas",
          ),
          summary: localizedText(
            locale,
            "Add an account and record the first piece of information to receive proactive recommendations.",
            "Adicione uma conta e registre a primeira informação para receber recomendações proativas.",
          ),
          focusAccounts: [],
          changes: [],
          meetingsToPrepare: [],
          overdueCommitments: [],
        },
        provider: "deterministic-fallback",
        model: null,
        cached: false,
        generatedAt: now,
      });
    const placeholders = accountIds.map(() => "?").join(",");
    const [actionRows, eventRows, meetingRows] = await Promise.all([
      db
        .prepare(
          `SELECT * FROM account_actions WHERE discovery_id IN (${placeholders}) AND status NOT IN ('completed', 'discarded') AND (snoozed_until IS NULL OR snoozed_until <= ?) ORDER BY (priority_score + rank_adjustment) DESC LIMIT 12`,
        )
        .bind(...accountIds, now)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT * FROM account_events WHERE discovery_id IN (${placeholders}) ORDER BY occurred_at DESC LIMIT 20`,
        )
        .bind(...accountIds)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          `SELECT * FROM meetings WHERE discovery_id IN (${placeholders}) AND meeting_status = 'scheduled' ORDER BY scheduled_at ASC LIMIT 8`,
        )
        .bind(...accountIds)
        .all<Record<string, unknown>>(),
    ]);
    const actions = actionRows.results.map(mapAction);
    const accountName = new Map(
      rows.results.map((item) => [String(item.id), String(item.customer_name)]),
    );
    const deterministicBrief = {
      headline: actions.length
        ? localizedText(
            locale,
            "What deserves your attention today",
            "O que merece sua atenção hoje",
          )
        : localizedText(
            locale,
            "Your portfolio has no critical pending items",
            "Sua carteira não tem pendências críticas",
          ),
      summary: actions.length
        ? localizedText(
            locale,
            `${actions.length} actions are open. The first three combine the highest impact, urgency, confidence, and maturity.`,
            `${actions.length} ações estão abertas. As três primeiras combinam maior impacto, urgência, confiança e maturidade.`,
          )
        : localizedText(
            locale,
            "Record new interactions to keep memory and recommendations current.",
            "Registre novas interações para manter a memória e as recomendações atualizadas.",
          ),
      focusAccounts: actions.slice(0, 5).map((action) => ({
        accountId: action.discoveryId,
        accountName:
          accountName.get(action.discoveryId) ||
          localizedText(locale, "Account", "Conta"),
        headline: action.title,
        whyNow: action.whyNow || action.rationale,
        priority: action.priorityScore,
        suggestedAction: action.nextStep,
        citationIds: action.evidence
          .map((source) => source.sourceId)
          .slice(0, 8),
      })),
      changes: eventRows.results
        .slice(0, 8)
        .map(
          (event) =>
            `${accountName.get(String(event.discovery_id)) || localizedText(locale, "Account", "Conta")}: ${String(event.title)}`,
        ),
      meetingsToPrepare: meetingRows.results.map(
        (meeting) =>
          `${accountName.get(String(meeting.discovery_id)) || localizedText(locale, "Account", "Conta")}: ${String(meeting.title)} · ${String(meeting.scheduled_at || localizedText(locale, "no date", "sem data"))}`,
      ),
      overdueCommitments: eventRows.results
        .filter(
          (event) =>
            String(event.type) === "commitment" &&
            new Date(String(event.occurred_at)).getTime() < Date.now(),
        )
        .map(
          (event) =>
            `${accountName.get(String(event.discovery_id)) || localizedText(locale, "Account", "Conta")}: ${String(event.title)}`,
        )
        .slice(0, 8),
    };
    const sources = eventRows.results.map(
      (event) =>
        ({
          id: String(event.id),
          accountId: String(event.discovery_id),
          kind: String(event.type),
          title: String(event.title),
          content: String(event.content),
          sourceId: String(event.source_id || event.id),
          page: null,
          occurredAt: String(event.occurred_at),
          confidence: Number(event.confidence || 70),
        }) satisfies RetrievalSource,
    );
    const fingerprint = await evidenceFingerprint(sources);
    const quota = await quotaAllows(db, "generative");
    const testAccountIds = new Set(
      rows.results
        .filter((item) => classificationOf(item) === "test")
        .map((item) => String(item.id)),
    );
    const safeContext = {
      accounts: rows.results
        .filter((item) => testAccountIds.has(String(item.id)))
        .map((item) => ({
          id: item.id,
          name: item.customer_name,
          progress: item.progress,
          priority: item.priority,
          stage: item.stage,
        })),
      actions: actions.filter((action) =>
        testAccountIds.has(action.discoveryId),
      ),
      events: sources.filter((source) => testAccountIds.has(source.accountId)),
      scheduledMeetings: meetingRows.results.filter((meeting) =>
        testAccountIds.has(String(meeting.discovery_id)),
      ),
    };
    const generated =
      quota.allowed && testAccountIds.size
        ? await briefingProvider.generateDailyBrief(
            JSON.stringify(safeContext),
            { classification: "test", responseLocale: locale },
          )
        : {
            ok: false,
            data: null,
            provider: "fallback" as const,
            model: null,
            fallback: true,
            reason: "quota" as const,
            usage: { inputTokens: null, outputTokens: null, totalTokens: null },
            latencyMs: 0,
            attempts: 0,
          };
    const briefing = generated.data || deterministicBrief;
    const providerName = dbProviderName(generated.provider);
    if (generated.ok && generated.model)
      await db
        .prepare(
          "INSERT OR REPLACE INTO daily_briefing_variants (id, owner_email, briefing_date, locale, account_ids_json, content_json, provider, model, status, evidence_fingerprint, generated_at, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `brief-${identity.email}-${briefingDate}-${locale}`,
          identity.email,
          briefingDate,
          locale,
          JSON.stringify(accountIds),
          JSON.stringify(briefing),
          providerName,
          generated.model,
          "generated",
          `${briefingConfig}:${fingerprint}`,
          now,
          new Date(Date.now() + 24 * 3600_000).toISOString(),
          String(existing?.created_at || now),
          now,
        )
        .run();
    await recordAIRun(
      db,
      accountIds[0],
      "daily-briefing",
      generated,
      sources.slice(0, 20).map((source) => source.id),
      generated.ok ? 82 : 70,
      localizedText(
        locale,
        "Daily briefing for up to five accounts; recommendations require human approval.",
        "Briefing diário para até cinco contas; recomendações exigem aprovação humana.",
      ),
      false,
      locale,
    );
    return Response.json({
      briefing,
      provider: providerName,
      model: generated.model,
      cached: false,
      usage: generated.usage,
      quota: { generative: quota },
      generatedAt: now,
    });
  }
  const id = String(body.id || "");
  const row = await accountForMutation(db, id, request);
  if (!row)
    return Response.json(
      { error: "Conta não encontrada ou acesso não autorizado." },
      { status: 404 },
    );
  if (body.action === "commercial_proof") {
    await persistImpactMetrics(db, id, now);
    const [changeSets, handoffs, impact, pipeline] = await Promise.all([
      db
        .prepare(
          "SELECT * FROM account_change_sets WHERE discovery_id = ? ORDER BY created_at DESC LIMIT 20",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM crm_handoffs WHERE discovery_id = ? ORDER BY updated_at DESC LIMIT 20",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM account_impact_metrics WHERE discovery_id = ? ORDER BY computed_at DESC LIMIT 1",
        )
        .bind(id)
        .first<Record<string, unknown>>(),
      db
        .prepare(
          "SELECT * FROM commercial_agent_runs WHERE discovery_id = ? ORDER BY created_at DESC LIMIT 70",
        )
        .bind(id)
        .all<Record<string, unknown>>(),
    ]);
    const mappedChangeSets = changeSets.results.map(mapChangeSet);
    const mappedHandoffs = handoffs.results.map(mapCrmHandoff);
    const agentPipeline = pipeline.results.map(mapCommercialAgentRun);
    return Response.json({
      commercialProof: {
        discoveryId: id,
        latestChangeSet: mappedChangeSets[0] || null,
        changeSets: mappedChangeSets,
        latestHandoff: mappedHandoffs[0] || null,
        handoffs: mappedHandoffs,
        impact: impact ? mapImpactMetric(impact) : null,
        agentPipeline,
        latestWorkflowId: agentPipeline[0]?.workflowId || null,
        requiresHumanApproval: true,
        externalWritePerformed: false,
      },
    });
  }
  if (body.action === "change_set_status") {
    const changeSetId = String(body.changeSetId || "");
    const status =
      String(body.status) === "approved"
        ? "approved"
        : String(body.status) === "rejected"
          ? "rejected"
          : null;
    if (!changeSetId || !status)
      return localizedApiError(locale, "INVALID_CHANGE_SET_REVIEW", 400, {
        en: "Choose a change set and approve or reject it.",
        pt: "Selecione um conjunto de mudanças e aprove ou rejeite.",
      });
    const existing = await db
      .prepare(
        "SELECT * FROM account_change_sets WHERE id = ? AND discovery_id = ?",
      )
      .bind(changeSetId, id)
      .first<Record<string, unknown>>();
    if (!existing)
      return localizedApiError(locale, "CHANGE_SET_NOT_FOUND", 404, {
        en: "Change set not found for this account.",
        pt: "Conjunto de mudanças não encontrado nesta conta.",
      });
    await db.batch([
      db
        .prepare(
          "UPDATE account_change_sets SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(status, identity.email, now, now, changeSetId, id),
      db
        .prepare(
          "UPDATE commercial_agent_runs SET human_validation_status = ? WHERE change_set_id = ? AND discovery_id = ?",
        )
        .bind(status, changeSetId, id),
      db
        .prepare(
          "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, 'commercial_change_review', ?, ?)",
        )
        .bind(
          id,
          localizedText(
            locale,
            status === "approved"
              ? "Derived changes approved by the account owner"
              : "Derived changes rejected by the account owner",
            status === "approved"
              ? "Mudanças derivadas aprovadas pelo responsável da conta"
              : "Mudanças derivadas rejeitadas pelo responsável da conta",
          ),
          now,
        ),
    ]);
    const updated = await db
      .prepare("SELECT * FROM account_change_sets WHERE id = ?")
      .bind(changeSetId)
      .first<Record<string, unknown>>();
    return Response.json({
      ok: true,
      changeSet: updated ? mapChangeSet(updated) : null,
      appliedToHumanAuthoredContent: false,
    });
  }
  if (body.action === "handoff_preview") {
    const [hypothesisRows, stakeholderRows, planRow, eventRows, versionRow] =
      await Promise.all([
        db
          .prepare(
            "SELECT * FROM opportunity_hypotheses WHERE discovery_id = ? ORDER BY CASE WHEN stage = 'qualified' THEN 0 ELSE 1 END, confidence DESC",
          )
          .bind(id)
          .all<Record<string, unknown>>(),
        db
          .prepare(
            "SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at",
          )
          .bind(id)
          .all<Record<string, unknown>>(),
        db
          .prepare("SELECT * FROM account_plans WHERE discovery_id = ?")
          .bind(id)
          .first<Record<string, unknown>>(),
        db
          .prepare(
            "SELECT * FROM account_events WHERE discovery_id = ? AND evidence_status = 'confirmed' ORDER BY occurred_at DESC LIMIT 12",
          )
          .bind(id)
          .all<Record<string, unknown>>(),
        db
          .prepare(
            "SELECT COALESCE(MAX(version), 0) + 1 AS version FROM crm_handoffs WHERE discovery_id = ?",
          )
          .bind(id)
          .first<{ version: number }>(),
      ]);
    const hypotheses = hypothesisRows.results.map(mapHypothesis);
    const requestedHypothesisId = String(body.hypothesisId || "");
    const selected =
      hypotheses.find((item) => item.id === requestedHypothesisId) ||
      hypotheses[0] ||
      null;
    const hypothesis: CommercialHypothesis | null = selected
      ? {
          id: selected.id,
          capabilityKey: selected.capabilityKey,
          title: selected.title,
          problem: selected.problem,
          products: selected.products,
          stakeholderIds: selected.stakeholderIds,
          evidence: selected.evidence,
          gaps: selected.gaps,
          confidence: selected.confidence,
          stage: selected.stage,
          nextStep: selected.nextStep,
        }
      : null;
    const scores = json<Score[]>(row.scores_json, []);
    const matchingScore =
      scores.find((item) => item.short === hypothesis?.capabilityKey) ||
      scores[0] ||
      null;
    const score: CommercialScore | null = matchingScore
      ? {
          name: matchingScore.name,
          short: matchingScore.short,
          alignment: matchingScore.alignment,
          value: matchingScore.value,
          readiness: matchingScore.readiness,
          confidence: matchingScore.confidence,
        }
      : null;
    const stakeholders: CommercialStakeholder[] = stakeholderRows.results.map(
      (item) => {
        const person = mapStakeholder(item);
        return {
          id: person.id,
          name: person.name,
          role: person.role,
          influence: person.influence,
          source: person.source,
        };
      },
    );
    const plan = mapPlan(planRow);
    const sourceIds = hypothesis?.evidence.length
      ? hypothesis.evidence.map((evidence) => evidence.sourceId)
      : eventRows.results.map((event) => String(event.source_id || event.id));
    const built = buildCrmHandoff({
      account: {
        id,
        name: String(row.customer_name),
        industry: String(row.industry),
        owner: String(row.owner),
        stage: String(row.stage),
        progress: Number(row.progress),
        summary: String(row.challenge_summary),
      },
      hypothesis,
      score,
      stakeholders,
      objectives: [
        ...(plan?.priorities || []),
        ...(plan?.objectives || []),
      ].slice(0, 8),
      sourceIds,
      locale,
    });
    const handoffId = `handoff-${id}-${Number(versionRow?.version || 1)}`;
    const exportPayload = {
      schema: "watson-cdi/pre-crm-handoff@2026.1",
      generatedAt: now,
      locale,
      data: built.payload,
    };
    await db
      .prepare(
        "INSERT INTO crm_handoffs (id, discovery_id, hypothesis_id, version, status, payload_json, qualification_json, copy_text, export_json, source_ids_json, approved_by, approved_at, handed_off_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'preview', ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)",
      )
      .bind(
        handoffId,
        id,
        hypothesis?.id || null,
        Number(versionRow?.version || 1),
        JSON.stringify(built.payload),
        JSON.stringify(built.qualification),
        built.copyText,
        JSON.stringify(exportPayload),
        JSON.stringify(sourceIds),
        now,
        now,
      )
      .run();
    const saved = await db
      .prepare("SELECT * FROM crm_handoffs WHERE id = ?")
      .bind(handoffId)
      .first<Record<string, unknown>>();
    return Response.json(
      {
        ok: true,
        handoff: saved ? mapCrmHandoff(saved) : null,
        eligibleForHandoff: built.qualification.eligible,
        requiresHumanApproval: true,
        externalWritePerformed: false,
      },
      { status: 201 },
    );
  }
  if (body.action === "handoff_mark") {
    const handoffId = String(body.handoffId || "");
    const operation = String(body.operation || "mark_handed_off");
    const handoff = await db
      .prepare("SELECT * FROM crm_handoffs WHERE id = ? AND discovery_id = ?")
      .bind(handoffId, id)
      .first<Record<string, unknown>>();
    if (!handoff)
      return localizedApiError(locale, "HANDOFF_NOT_FOUND", 404, {
        en: "Handoff preview not found for this account.",
        pt: "Prévia de handoff não encontrada nesta conta.",
      });
    const qualification = json<{ eligible?: boolean }>(
      handoff.qualification_json,
      {},
    );
    if (
      (operation === "approve" || operation === "mark_handed_off") &&
      !qualification.eligible
    )
      return localizedApiError(locale, "HANDOFF_GATES_NOT_MET", 409, {
        en: "The hypothesis has not met every pre-CRM qualification gate.",
        pt: "A hipótese ainda não atingiu todos os critérios de qualificação pré-CRM.",
      });
    let status: "approved" | "handed_off" | "returned";
    if (operation === "return") status = "returned";
    else if (operation === "approve") status = "approved";
    else {
      const explicitlyConfirmed = body.confirmHumanApproval === true;
      if (String(handoff.status) !== "approved" && !explicitlyConfirmed)
        return localizedApiError(locale, "HANDOFF_APPROVAL_REQUIRED", 409, {
          en: "Approve the handoff or explicitly confirm human approval before marking it handed off.",
          pt: "Aprove o handoff ou confirme explicitamente a aprovação humana antes de marcá-lo como enviado.",
        });
      status = "handed_off";
    }
    const approvedAt =
      status === "approved" || status === "handed_off"
        ? String(handoff.approved_at || now)
        : null;
    await db.batch([
      db
        .prepare(
          "UPDATE crm_handoffs SET status = ?, approved_by = ?, approved_at = ?, handed_off_at = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(
          status,
          status === "returned" ? null : identity.email,
          approvedAt,
          status === "handed_off" ? now : null,
          now,
          handoffId,
          id,
        ),
      db
        .prepare(
          "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, 'crm_handoff_status', ?, ?)",
        )
        .bind(
          id,
          localizedText(
            locale,
            `Pre-CRM handoff marked as ${status}; no external CRM write was performed.`,
            `Handoff pré-CRM marcado como ${status}; nenhuma gravação externa no CRM foi realizada.`,
          ),
          now,
        ),
    ]);
    const updated = await db
      .prepare("SELECT * FROM crm_handoffs WHERE id = ?")
      .bind(handoffId)
      .first<Record<string, unknown>>();
    return Response.json({
      ok: true,
      handoff: updated ? mapCrmHandoff(updated) : null,
      externalWritePerformed: false,
    });
  }
  if (body.action === "translate") {
    if ("text" in body || "content" in body || "rawText" in body) {
      return localizedApiError(locale, "RAW_TRANSLATION_TEXT_REJECTED", 400, {
        en: "Send a source reference from this account instead of raw text.",
        pt: "Envie uma referência de fonte desta conta em vez de texto livre.",
      });
    }
    const rawRef =
      body.sourceRef &&
      typeof body.sourceRef === "object" &&
      !Array.isArray(body.sourceRef)
        ? (body.sourceRef as Record<string, unknown>)
        : null;
    const sourceRefHasUnexpectedFields = rawRef
      ? Object.keys(rawRef).some((key) => key !== "type" && key !== "id")
      : false;
    const sourceType = String(rawRef?.type || "") as TranslatableSourceType;
    const sourceId = String(rawRef?.id || "").trim();
    const targetLocale =
      parseResponseLocale(body.targetLocale) ||
      (!body.targetLocale ? locale : null);
    if (
      !rawRef ||
      sourceRefHasUnexpectedFields ||
      !translatableSourceTypes.includes(sourceType) ||
      !sourceId ||
      sourceId.length > 240 ||
      !targetLocale
    ) {
      return localizedApiError(locale, "INVALID_TRANSLATION_SOURCE", 400, {
        en: "Select a valid account source and either English or Portuguese as the target language.",
        pt: "Selecione uma fonte válida da conta e inglês ou português como idioma de destino.",
      });
    }
    const source = await translatableSourceForAccount(
      db,
      id,
      sourceType,
      sourceId,
    );
    if (!source) {
      return localizedApiError(locale, "TRANSLATION_SOURCE_NOT_FOUND", 404, {
        en: "The source was not found in this account or you are not authorized to access it.",
        pt: "A fonte não foi encontrada nesta conta ou você não está autorizado a acessá-la.",
      });
    }
    if (!source.text.trim()) {
      return localizedApiError(locale, "TRANSLATION_SOURCE_EMPTY", 409, {
        en: "This source does not contain text that can be translated.",
        pt: "Esta fonte não contém texto que possa ser traduzido.",
      });
    }
    const fingerprint = await cacheKeyFor([source.text]);
    const cached = await db
      .prepare(
        "SELECT * FROM content_translations WHERE discovery_id = ? AND source_type = ? AND source_id = ? AND source_fingerprint = ? AND target_locale = ? AND status = 'completed'",
      )
      .bind(id, source.type, source.id, fingerprint, targetLocale)
      .first<Record<string, unknown>>();
    if (cached) {
      return localizedJson(locale, {
        sourceRef: {
          type: source.type,
          id: source.id,
          title: source.title,
          page: source.page,
        },
        sourceLocale: cached.source_locale
          ? String(cached.source_locale)
          : "unknown",
        targetLocale,
        translatedText: String(cached.translated_text),
        provider: String(cached.provider),
        model: String(cached.model || ""),
        cached: true,
      });
    }
    const quota = await quotaAllows(db, "generative");
    if (!quota.allowed) {
      return localizedApiError(locale, "AI_QUOTA_EXCEEDED", 429, undefined, {
        quota,
      });
    }
    const provider = aiAdapter();
    const generated = await provider.translateContent(
      JSON.stringify({
        source: {
          type: source.type,
          id: source.id,
          title: source.title,
          page: source.page,
        },
        content: source.text,
      }),
      targetLocale,
      {
        classification: classificationOf(row),
        publicDemo: false,
        responseLocale: targetLocale,
      },
    );
    await recordAIRun(
      db,
      id,
      "content-translation",
      generated,
      [source.id],
      generated.ok ? 95 : 0,
      localizedText(
        locale,
        "User-requested translation of an authorized account source; the original was preserved.",
        "Tradução solicitada pelo usuário de uma fonte autorizada da conta; o original foi preservado.",
      ),
      false,
      targetLocale,
    );
    if (!generated.ok || !generated.data || !generated.model) {
      if (generated.reason === "policy_blocked") {
        return localizedApiError(
          locale,
          "TRANSLATION_PROVIDER_POLICY_BLOCKED",
          403,
          {
            en: "The configured external model cannot process confidential accounts. Configure watsonx or keep the original content.",
            pt: "O modelo externo configurado não pode processar contas confidenciais. Configure o watsonx ou mantenha o conteúdo original.",
          },
          {
            provider: dbProviderName(generated.provider),
            reason: generated.reason,
          },
        );
      }
      if (generated.reason === "quota")
        return localizedApiError(locale, "AI_QUOTA_EXCEEDED", 429);
      return localizedApiError(
        locale,
        "TRANSLATION_PROVIDER_UNAVAILABLE",
        503,
        {
          en: "No eligible AI provider is available for translation. The original content was preserved.",
          pt: "Nenhum provedor de IA elegível está disponível para tradução. O conteúdo original foi preservado.",
        },
        {
          provider: dbProviderName(generated.provider),
          reason: generated.reason || "provider_error",
        },
      );
    }
    const providerName = dbProviderName(generated.provider);
    const translatedAt = new Date().toISOString();
    const translationId = `translation-${await cacheKeyFor([id, source.type, source.id, fingerprint, targetLocale])}`;
    await db
      .prepare(
        "INSERT OR REPLACE INTO content_translations (id, discovery_id, source_type, source_id, source_fingerprint, source_locale, target_locale, translated_text, provider, model, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)",
      )
      .bind(
        translationId,
        id,
        source.type,
        source.id,
        fingerprint,
        generated.data.detectedSourceLocale,
        targetLocale,
        generated.data.translatedText,
        providerName,
        generated.model,
        translatedAt,
        translatedAt,
      )
      .run();
    return localizedJson(locale, {
      sourceRef: {
        type: source.type,
        id: source.id,
        title: source.title,
        page: source.page,
      },
      sourceLocale: generated.data.detectedSourceLocale,
      targetLocale,
      translatedText: generated.data.translatedText,
      provider: providerName,
      model: generated.model,
      cached: false,
      usage: generated.usage,
    });
  }
  if (body.action === "guided_discovery_start") {
    const parsed = GuidedDiscoveryStartPayloadSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        { error: "Escolha um modo e pilares válidos." },
        { status: 400 },
      );
    const requestedPillar =
      parsed.data.pillarKey ||
      parsed.data.selectedPillars[0] ||
      (Object.entries(scoreHintsForGuidedDiscovery(row)).sort(
        (a, b) => Number(b[1]) - Number(a[1]),
      )[0]?.[0] as GuidedDiscoveryPillarKey | undefined) ||
      GUIDED_DISCOVERY_PILLARS[0];
    const selectedPillars = [requestedPillar];
    if (!isGuidedDiscoveryPillar(requestedPillar))
      return Response.json(
        { error: "Escolha um pilar válido para iniciar." },
        { status: 400 },
      );
    await db
      .prepare(
        "UPDATE guided_discovery_sessions SET status = 'paused', updated_at = ? WHERE discovery_id = ? AND owner_email = ? AND status = 'in_progress' AND selected_pillars_json <> ?",
      )
      .bind(now, id, identity.email, JSON.stringify(selectedPillars))
      .run();
    const existing = await db
      .prepare(
        "SELECT * FROM guided_discovery_sessions WHERE discovery_id = ? AND owner_email = ? AND selected_pillars_json = ? AND status IN ('in_progress','paused') ORDER BY updated_at DESC LIMIT 1",
      )
      .bind(id, identity.email, JSON.stringify(selectedPillars))
      .first<Record<string, unknown>>();
    if (existing) {
      await db
        .prepare(
          "UPDATE guided_discovery_sessions SET status = 'in_progress', completed_at = NULL, updated_at = ? WHERE id = ?",
        )
        .bind(now, String(existing.id))
        .run();
      await refreshGuidedSession(db, row, String(existing.id), now);
      return Response.json({
        ok: true,
        resumed: true,
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      });
    }
    const sessionId = `gds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db
      .prepare(
        "INSERT INTO guided_discovery_sessions (id, discovery_id, owner_email, mode, catalog_version, selected_pillars_json, status, progress_percent, coverage_percent, current_question_id, checkpoint_count, ai_status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'in_progress', 0, 0, NULL, 0, 'deterministic', ?, NULL, ?, ?)",
      )
      .bind(
        sessionId,
        id,
        identity.email,
        parsed.data.mode,
        GUIDED_DISCOVERY_CATALOG_VERSION,
        JSON.stringify(selectedPillars),
        now,
        now,
        now,
      )
      .run();
    const initialRoute = materializeQuestionRoute({
      mode: parsed.data.mode,
      selectedPillars,
      answers: [],
      scoreHints: scoreHintsForGuidedDiscovery(row) as Record<string, number>,
      hasRelevantStakeholder: false,
      hasOwner: false,
    });
    for (
      let sequence = 0;
      sequence < initialRoute.questionIds.length;
      sequence += 1
    )
      await insertCatalogQuestion(db, {
        sessionId,
        discoveryId: id,
        catalogQuestionId: initialRoute.questionIds[sequence],
        sequence,
        now,
      });
    await materializeLegacyGuidedAnswers(
      db,
      row,
      sessionId,
      now,
      selectedPillars,
    );
    await refreshGuidedSession(db, row, sessionId, now);
    await db
      .prepare(
        "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, 'guided_discovery_started', ?, ?)",
      )
      .bind(
        id,
        `Sessão ${parsed.data.mode} iniciada com catálogo ${GUIDED_DISCOVERY_CATALOG_VERSION}.`,
        now,
      )
      .run();
    return Response.json(
      {
        ok: true,
        sessionId,
        resumed: false,
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      },
      { status: 201 },
    );
  }
  if (body.action === "guided_discovery_answer") {
    const parsed = GuidedDiscoveryAnswerPayloadSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        {
          error: "Revise a resposta, evidência e confiança informadas.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    const input = parsed.data;
    const sessionRow = await db
      .prepare(
        "SELECT * FROM guided_discovery_sessions WHERE id = ? AND discovery_id = ? AND owner_email = ?",
      )
      .bind(input.sessionId, id, identity.email)
      .first<Record<string, unknown>>();
    if (!sessionRow)
      return Response.json(
        { error: "Sessão não encontrada ou acesso não autorizado." },
        { status: 404 },
      );
    if (String(sessionRow.status) === "completed")
      return Response.json(
        {
          error:
            "Retome ou inicie uma sessão antes de revisar respostas concluídas.",
        },
        { status: 409 },
      );
    const questionRow = await db
      .prepare(
        "SELECT * FROM guided_discovery_questions WHERE id = ? AND session_id = ? AND discovery_id = ? AND status <> 'dismissed'",
      )
      .bind(input.questionId, input.sessionId, id)
      .first<Record<string, unknown>>();
    if (!questionRow)
      return Response.json(
        { error: "Pergunta não encontrada nesta sessão." },
        { status: 404 },
      );
    if (
      input.status === "confirmed" &&
      !input.answerText &&
      !Object.keys(input.structured).length
    )
      return Response.json(
        {
          error:
            "Inclua uma seleção estruturada ou contexto antes de confirmar.",
        },
        { status: 400 },
      );
    if (input.stakeholderId) {
      const stakeholder = await db
        .prepare(
          "SELECT id FROM stakeholders WHERE id = ? AND discovery_id = ?",
        )
        .bind(input.stakeholderId, id)
        .first();
      if (!stakeholder)
        return Response.json(
          { error: "O stakeholder selecionado não pertence a esta conta." },
          { status: 400 },
        );
    }
    const previous = await db
      .prepare(
        "SELECT * FROM guided_discovery_answers WHERE session_id = ? AND question_id = ? AND is_current = 1 ORDER BY updated_at DESC LIMIT 1",
      )
      .bind(input.sessionId, input.questionId)
      .first<Record<string, unknown>>();
    const answerId = `gda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const answerStatus = input.status;
    const evidenceStatus =
      answerStatus === "unknown" ? "unknown" : input.evidenceStatus;
    const confidence = answerStatus === "unknown" ? 0 : input.confidence;
    const sourceDate =
      input.sourceDate && Number.isFinite(new Date(input.sourceDate).getTime())
        ? new Date(input.sourceDate).toISOString()
        : null;
    const statements = [];
    if (previous)
      statements.push(
        db
          .prepare(
            "UPDATE guided_discovery_answers SET is_current = 0, updated_at = ? WHERE id = ? AND discovery_id = ?",
          )
          .bind(now, String(previous.id), id),
      );
    statements.push(
      db
        .prepare(
          "INSERT INTO guided_discovery_answers (id, session_id, question_id, discovery_id, structured_json, answer_text, evidence_status, stakeholder_id, source_type, source_id, source_date, confidence, status, supersedes_id, is_current, answered_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
        )
        .bind(
          answerId,
          input.sessionId,
          input.questionId,
          id,
          JSON.stringify(input.structured),
          input.answerText,
          evidenceStatus,
          input.stakeholderId || null,
          input.sourceType || null,
          input.sourceId || null,
          sourceDate,
          confidence,
          answerStatus,
          previous ? String(previous.id) : null,
          answerStatus === "draft" ? null : now,
          now,
          now,
        ),
    );
    statements.push(
      db
        .prepare(
          "UPDATE guided_discovery_sessions SET status = 'in_progress', completed_at = NULL, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(now, input.sessionId, id),
    );
    if (answerStatus !== "draft")
      statements.push(
        db
          .prepare(
            "UPDATE guided_discovery_questions SET status = 'answered', updated_at = ? WHERE id = ? AND session_id = ?",
          )
          .bind(now, input.questionId, input.sessionId),
      );
    await db.batch(statements);

    const beforeScores = json<Score[]>(row.scores_json, []);
    const answerImpact =
      answerStatus === "draft"
        ? null
        : await materializeCdiAnswerImpact(db, {
            discoveryId: id,
            answerId,
            questionRow,
            previousRow: previous,
            locale,
            now,
          });
    if (answerStatus !== "draft") {
      const eventStatus: AccountEvent["evidenceStatus"] =
        answerStatus === "unknown"
          ? "gap"
          : evidenceStatus === "hypothesis"
            ? "assumption"
            : "confirmed";
      const content =
        input.answerText ||
        humanizeStructuredAnswer(input.structured) ||
        localizedText(
          locale,
          "Information is still unknown.",
          "Informação ainda desconhecida.",
        );
      await addEvent(db, {
        id: `evt-${id}-guided-${answerId}`,
        discoveryId: id,
        type: "guided_discovery_answer",
        title: String(questionRow.prompt),
        content,
        sourceType: "guided_discovery",
        sourceId: answerId,
        evidenceStatus: eventStatus,
        confidence,
        occurredAt: sourceDate || now,
      });
      const legacyAnswers = json<Answer[]>(row.answers_json, []);
      if (answerStatus === "confirmed" || answerStatus === "unknown") {
        const key = String(questionRow.catalog_question_id || questionRow.id);
        const next = {
          key,
          question: String(questionRow.prompt),
          answer:
            answerStatus === "unknown"
              ? localizedText(locale, "Don't know", "Não sei")
              : content,
          at: now,
        };
        const index = legacyAnswers.findIndex((item) => item.key === key);
        if (index >= 0) legacyAnswers[index] = next;
        else legacyAnswers.push(next);
      }
      const meetingRows = await db
        .prepare(
          "SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC",
        )
        .bind(id)
        .all<Record<string, unknown>>();
      const result = analyze(
        legacyAnswers,
        meetingRows.results.map(mapMeeting),
        locale,
      );
      await db
        .prepare(
          "UPDATE discoveries SET priority = ?, challenge_summary = ?, answers_json = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?",
        )
        .bind(
          result.priority,
          result.challengeSummary,
          JSON.stringify(legacyAnswers),
          JSON.stringify(result.scores),
          JSON.stringify(result.recommendations),
          result.nextEngagement,
          now,
          id,
        )
        .run();
      await recomputeAccount(db, id, {
        skipGenerative: true,
        skipEmbeddings: true,
        responseLocale: locale,
      });
    }
    const updatedRow =
      (await db
        .prepare("SELECT * FROM discoveries WHERE id = ?")
        .bind(id)
        .first<Record<string, unknown>>()) || row;
    const sessionUpdate = await refreshGuidedSession(
      db,
      updatedRow,
      input.sessionId,
      now,
    );
    if (sessionUpdate && answerStatus !== "draft") {
      const accountProgress = Math.max(
        Number(updatedRow.progress || 0),
        Math.min(
          100,
          Math.round(
            12 +
              sessionUpdate.metrics.coveragePercent * 0.58 +
              sessionUpdate.metrics.progressPercent * 0.18,
          ),
        ),
      );
      await db
        .prepare(
          "UPDATE discoveries SET progress = ?, updated_at = ? WHERE id = ?",
        )
        .bind(accountProgress, now, id)
        .run();
      updatedRow.progress = accountProgress;
    }
    const afterScores = json<Score[]>(updatedRow.scores_json, []);
    const snapshot = await guidedSnapshotForAccount(db, updatedRow, locale);
    if (answerStatus !== "draft") await persistImpactMetrics(db, id, now);
    return Response.json({
      ok: true,
      answerId,
      savedAs: answerStatus,
      aiCalled: false,
      scoreDeltas: calculateDeterministicDeltas(
        beforeScores as unknown as Array<Record<string, unknown>>,
        afterScores as unknown as Array<Record<string, unknown>>,
      ),
      affectedInsights:
        answerStatus === "draft"
          ? []
          : locale === "pt-BR"
            ? [
                "Memória da conta",
                "Heatmap e temas IBM",
                "Hipóteses",
                "Próximas melhores ações",
              ]
            : [
                "Account memory",
                "IBM heatmap and themes",
                "Hypotheses",
                "Next Best Actions",
              ],
      guidedDiscovery: snapshot,
      checkpointAvailable: Boolean(snapshot.checkpoint?.available),
      answerImpact,
    });
  }
  if (body.action === "guided_discovery_patch") {
    const operation = String(body.operation || "");
    if (operation === "mark_pillar_not_relevant") {
      const pillarKey = String(body.pillarKey || "");
      const reason = String(body.reason || "").trim();
      if (!isGuidedDiscoveryPillar(pillarKey) || reason.length < 5)
        return Response.json(
          {
            error:
              "Escolha um pilar e registre uma justificativa antes de marcá-lo como não relevante.",
          },
          { status: 400 },
        );
      await db
        .prepare(
          "UPDATE guided_discovery_sessions SET status = 'paused', updated_at = ? WHERE discovery_id = ? AND owner_email = ? AND selected_pillars_json = ? AND status = 'in_progress'",
        )
        .bind(now, id, identity.email, JSON.stringify([pillarKey]))
        .run();
      await upsertGuidedPillarStatus(db, {
        discoveryId: id,
        ownerEmail: identity.email,
        pillarKey,
        status: "not_relevant",
        notRelevantReason: reason,
        reviewedAt: now,
        progressPercent: 100,
        requiredCount: 5,
        now,
      });
      return Response.json({
        ok: true,
        status: "not_relevant",
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      });
    }
    const sessionId = String(body.sessionId || "");
    const sessionRow = await db
      .prepare(
        "SELECT * FROM guided_discovery_sessions WHERE id = ? AND discovery_id = ? AND owner_email = ?",
      )
      .bind(sessionId, id, identity.email)
      .first<Record<string, unknown>>();
    if (!sessionRow)
      return Response.json(
        { error: "Sessão não encontrada ou acesso não autorizado." },
        { status: 404 },
      );
    const session = mapGuidedSession(sessionRow);
    const pillarKey = session.selectedPillars.find(isGuidedDiscoveryPillar);
    if (
      operation === "pause" ||
      operation === "pause_pillar" ||
      operation === "resume" ||
      operation === "reopen_pillar" ||
      operation === "complete" ||
      operation === "complete_pillar"
    ) {
      const isComplete =
        operation === "complete" || operation === "complete_pillar";
      const isPause = operation === "pause" || operation === "pause_pillar";
      let completion:
        | {
            progressPercent: number;
            coveragePercent: number;
            confidencePercent: number;
            answeredCount: number;
            requiredCount: number;
            unknownCount: number;
            conflictCount: number;
          }
        | undefined;
      if (isComplete) {
        const [questionRows, answerRows] = await Promise.all([
          db
            .prepare(
              "SELECT * FROM guided_discovery_questions WHERE session_id = ? AND discovery_id = ? AND status <> 'dismissed'",
            )
            .bind(sessionId, id)
            .all<Record<string, unknown>>(),
          db
            .prepare(
              "SELECT * FROM guided_discovery_answers WHERE session_id = ? AND discovery_id = ? AND is_current = 1",
            )
            .bind(sessionId, id)
            .all<Record<string, unknown>>(),
        ]);
        const essentialQuestions = questionRows.results
          .map(mapGuidedQuestion)
          .filter((question) => {
            const catalog = question.catalogQuestionId
              ? getQuestionById(question.catalogQuestionId)
              : null;
            return (
              catalog?.essential !== false &&
              (!pillarKey || catalog?.pillar === pillarKey)
            );
          });
        const essentialIds = new Set(
          essentialQuestions.map((question) => question.id),
        );
        const essentialAnswers = answerRows.results
          .map(mapGuidedAnswer)
          .filter((answer) => essentialIds.has(answer.questionId));
        const answered = essentialAnswers.filter(
          (answer) =>
            answer.status === "confirmed" || answer.status === "unknown",
        );
        const completionMinimum = Math.min(4, essentialQuestions.length || 5);
        if (answered.length < completionMinimum)
          return Response.json(
            {
              error: `Responda pelo menos ${completionMinimum} das ${essentialQuestions.length || 5} perguntas essenciais antes de revisar esta capacidade.`,
            },
            { status: 400 },
          );
        const metrics = calculateDiscoveryMetrics(
          essentialQuestions.map((question) => question.id),
          essentialAnswers,
        );
        const confidences = essentialAnswers
          .filter((answer) => answer.status === "confirmed")
          .map((answer) => answer.confidence);
        completion = {
          progressPercent: metrics.progressPercent,
          coveragePercent: metrics.coveragePercent,
          confidencePercent: confidences.length
            ? Math.round(
                confidences.reduce((sum, value) => sum + value, 0) /
                  confidences.length,
              )
            : 0,
          answeredCount: answered.length,
          requiredCount: essentialQuestions.length || 5,
          unknownCount: essentialAnswers.filter(
            (answer) => answer.status === "unknown",
          ).length,
          conflictCount: essentialAnswers.filter((answer) =>
            Boolean(answer.structured.contradiction),
          ).length,
        };
      }
      if (!isPause && !isComplete)
        await db
          .prepare(
            "UPDATE guided_discovery_sessions SET status = 'paused', updated_at = ? WHERE discovery_id = ? AND owner_email = ? AND id <> ? AND status = 'in_progress'",
          )
          .bind(now, id, identity.email, sessionId)
          .run();
      const status = isPause
        ? "paused"
        : isComplete
          ? "completed"
          : "in_progress";
      await db
        .prepare(
          "UPDATE guided_discovery_sessions SET status = ?, current_question_id = CASE WHEN ? = 'completed' THEN NULL ELSE current_question_id END, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(status, status, status, now, now, sessionId, id)
        .run();
      if (pillarKey && completion) {
        const reviewedStatus =
          completion.coveragePercent >= 70 &&
          completion.confidencePercent >= 70 &&
          completion.unknownCount === 0 &&
          completion.conflictCount === 0
            ? "reviewed_sufficient"
            : "reviewed_gaps";
        await upsertGuidedPillarStatus(db, {
          discoveryId: id,
          ownerEmail: identity.email,
          pillarKey,
          status: reviewedStatus,
          sessionId,
          progressPercent: completion.progressPercent,
          coveragePercent: completion.coveragePercent,
          confidencePercent: completion.confidencePercent,
          answeredCount: completion.answeredCount,
          requiredCount: completion.requiredCount,
          reviewedAt: now,
          now,
        });
      } else if (status !== "completed")
        await refreshGuidedSession(db, row, sessionId, now);
      return Response.json({
        ok: true,
        status,
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      });
    }
    if (operation === "accept_follow_up" || operation === "dismiss_follow_up") {
      const questionId = String(body.questionId || "");
      const nextStatus =
        operation === "accept_follow_up" ? "accepted" : "dismissed";
      const result = await db
        .prepare(
          "UPDATE guided_discovery_questions SET status = ?, updated_at = ? WHERE id = ? AND session_id = ? AND discovery_id = ? AND source = 'ai' AND status = 'proposed'",
        )
        .bind(nextStatus, now, questionId, sessionId, id)
        .run();
      if (!result.meta.changes)
        return Response.json(
          { error: "Follow-up não encontrado ou já revisado." },
          { status: 404 },
        );
      await refreshGuidedSession(db, row, sessionId, now);
      return Response.json({
        ok: true,
        decision: nextStatus,
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      });
    }
    if (operation === "checkpoint") {
      const session = mapGuidedSession(sessionRow);
      if (session.checkpointCount >= 3)
        return Response.json(
          {
            error:
              "Esta sessão já utilizou os três checkpoints de IA permitidos.",
          },
          { status: 429 },
        );
      const current = await guidedSnapshotForAccount(db, row, locale);
      if (!current.checkpoint?.available)
        return Response.json(
          {
            error:
              "Conclua o diagnóstico ou um pilar antes de solicitar um follow-up.",
          },
          { status: 409 },
        );
      const existing = await db
        .prepare(
          "SELECT * FROM guided_discovery_questions WHERE session_id = ? AND source = 'ai' AND status IN ('proposed','accepted','active') ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(sessionId)
        .first<Record<string, unknown>>();
      if (existing)
        return Response.json({
          ok: true,
          cached: true,
          followUp: mapGuidedQuestion(existing),
          guidedDiscovery: current,
        });
      await db
        .prepare(
          "UPDATE guided_discovery_sessions SET checkpoint_count = checkpoint_count + 1, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(now, sessionId, id)
        .run();
      const sources = await collectAccountSources(db, id);
      const fingerprint = await evidenceFingerprint(sources.slice(0, 50));
      const provider = aiAdapter();
      const pillar = String(current.checkpoint.pillar);
      const cacheKey = await cacheKeyFor([
        id,
        "guided-discovery-follow-up",
        sessionId,
        pillar,
        providerCacheSignature(provider, classificationOf(row), locale),
        fingerprint,
      ]);
      const cached = await cachedAI<Record<string, unknown>>(db, cacheKey);
      const quota = await quotaAllows(db, "generative");
      const generated = cached
        ? null
        : await provider.suggestDiscoveryFollowUp(
            JSON.stringify({
              customer: row.customer_name,
              pillar,
              catalogVersion: GUIDED_DISCOVERY_CATALOG_VERSION,
              answers: current.answers,
              hypotheses: (
                await db
                  .prepare(
                    "SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?",
                  )
                  .bind(id)
                  .all<Record<string, unknown>>()
              ).results.map(mapHypothesis),
              sources: sources.slice(0, 30).map((source) => ({
                id: source.id,
                title: source.title,
                content: source.content,
                occurredAt: source.occurredAt,
              })),
            }),
            pillar,
            {
              classification: quota.allowed
                ? classificationOf(row)
                : "confidential",
              responseLocale: locale,
            },
          );
      const followUp = cached?.data || generated?.data;
      if (!followUp || typeof followUp.question !== "string") {
        if (generated)
          await recordAIRun(
            db,
            id,
            "guided-discovery-follow-up",
            generated,
            sources.slice(0, 20).map((source) => source.id),
            0,
            localizedText(
              locale,
              "The checkpoint did not generate a valid question; the deterministic flow was preserved.",
              "Checkpoint não gerou pergunta válida; fluxo determinístico preservado.",
            ),
            false,
            locale,
          );
        await db
          .prepare(
            "UPDATE guided_discovery_sessions SET ai_status = 'deterministic-fallback', updated_at = ? WHERE id = ? AND discovery_id = ?",
          )
          .bind(now, sessionId, id)
          .run();
        return Response.json({
          ok: true,
          followUp: null,
          provider: "deterministic-fallback",
          message: localizedText(
            locale,
            "The deterministic catalog remains available; no AI follow-up was saved.",
            "O catálogo determinístico continua disponível; nenhum follow-up de IA foi salvo.",
          ),
          guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
        });
      }
      const citationIds = Array.isArray(followUp.citationIds)
        ? followUp.citationIds.map(String)
        : [];
      const sourceMap = new Map(sources.map((source) => [source.id, source]));
      const citations = citationIds.flatMap((sourceId) => {
        const source = sourceMap.get(sourceId);
        return source
          ? [
              {
                sourceType: source.kind,
                sourceId: source.sourceId,
                title: source.title,
                excerpt: source.content.slice(0, 220),
                occurredAt: source.occurredAt,
              },
            ]
          : [];
      });
      const resolvedPillar = isGuidedDiscoveryPillar(followUp.pillar)
        ? followUp.pillar
        : pillar;
      const questionId = `gdq-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const maxSequence =
        Number(
          (
            await db
              .prepare(
                "SELECT MAX(sequence) AS sequence FROM guided_discovery_questions WHERE session_id = ?",
              )
              .bind(sessionId)
              .first<{ sequence: number | null }>()
          )?.sequence ?? -1,
        ) + 1;
      await db.batch([
        db
          .prepare(
            "INSERT INTO guided_discovery_questions (id, session_id, discovery_id, catalog_question_id, pillar, prompt, hint, input_schema_json, source, rationale, citations_json, sequence, status, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'ai', ?, ?, ?, 'proposed', ?, ?)",
          )
          .bind(
            questionId,
            sessionId,
            id,
            resolvedPillar,
            String(followUp.question),
            localizedText(
              locale,
              "Complementary question proposed from account evidence.",
              "Pergunta complementar proposta a partir das evidências da conta.",
            ),
            JSON.stringify({
              kind: "scale",
              label: localizedText(
                locale,
                "Perceived maturity",
                "Maturidade percebida",
              ),
              min: 1,
              max: 5,
            }),
            String(
              followUp.rationale ||
                localizedText(
                  locale,
                  "Close the gap with the highest information value.",
                  "Preencher a lacuna de maior valor de informação.",
                ),
            ),
            JSON.stringify(citations),
            maxSequence,
            now,
            now,
          ),
        db
          .prepare(
            "UPDATE guided_discovery_sessions SET ai_status = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
          )
          .bind(
            cached?.provider ||
              (generated
                ? dbProviderName(generated.provider)
                : "deterministic-fallback"),
            now,
            sessionId,
            id,
          ),
      ]);
      if (generated) {
        await recordAIRun(
          db,
          id,
          "guided-discovery-follow-up",
          generated,
          citationIds,
          Number(followUp.informationValue || 70),
          localizedText(
            locale,
            "Follow-up question proposed; human approval is required.",
            "Pergunta complementar proposta; aprovação humana obrigatória.",
          ),
          false,
          locale,
        );
        if (generated.ok)
          await putAICache(db, {
            cacheKey,
            accountId: id,
            task: "guided-discovery-follow-up",
            provider: dbProviderName(generated.provider),
            model: generated.model || "",
            fingerprint,
            data: followUp,
            usage: generated.usage,
            ttlMs: 24 * 3600_000,
          });
      }
      return Response.json({
        ok: true,
        followUp: { id: questionId, ...followUp, citations },
        provider:
          cached?.provider ||
          (generated
            ? dbProviderName(generated.provider)
            : "deterministic-fallback"),
        model: cached?.model || generated?.model || null,
        cached: Boolean(cached),
        requiresHumanApproval: true,
        guidedDiscovery: await guidedSnapshotForAccount(db, row, locale),
      });
    }
    return Response.json(
      { error: "Operação de descoberta guiada inválida." },
      { status: 400 },
    );
  }
  if (body.action === "answer") {
    const answers = json<Answer[]>(row.answers_json, []);
    const next = {
      key: String(body.key),
      question: String(body.question),
      answer: String(body.answer),
      at: now,
    };
    const index = answers.findIndex((item) => item.key === next.key);
    if (index >= 0) answers[index] = next;
    else answers.push(next);
    const meetingRows = await db
      .prepare(
        "SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC",
      )
      .bind(id)
      .all<Record<string, unknown>>();
    const meetings = meetingRows.results.map(mapMeeting);
    const result = analyze(answers, meetings, locale);
    const progress = Math.min(
      100,
      16 + answers.length * 10 + meetings.length * 18,
    );
    await db
      .prepare(
        "UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, answers_json = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?",
      )
      .bind(
        meetings.length ? "Qualificação pré-CRM" : "Account intelligence",
        progress,
        result.priority,
        result.challengeSummary,
        JSON.stringify(answers),
        JSON.stringify(result.scores),
        JSON.stringify(result.recommendations),
        result.nextEngagement,
        now,
        id,
      )
      .run();
    await addEvent(db, {
      id: `evt-${id}-answer-${next.key}`,
      discoveryId: id,
      type: next.key === "pain" ? "pain" : "discovery_answer",
      title: next.question,
      content: next.answer,
      sourceType: "answer",
      sourceId: next.key,
      evidenceStatus: "confirmed",
      confidence: 86,
      occurredAt: now,
    });
    await recomputeAccount(db, id, { responseLocale: locale });
    return Response.json({ ok: true });
  }
  if (body.action === "meeting" || body.action === "meeting_create") {
    const notes = String(body.notes || "").trim();
    if (!notes)
      return Response.json(
        { error: "As notas da reunião são obrigatórias." },
        { status: 400 },
      );
    const commercialBefore = await captureCommercialState(db, id);
    let insights: MeetingInsight;
    const meetingQuota = await quotaAllows(db, "generative");
    let meetingRun: AIResult<unknown> = {
      ok: false,
      data: null,
      provider: "fallback",
      model: null,
      fallback: true,
      reason: meetingQuota.allowed ? "provider_error" : "quota",
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      latencyMs: 0,
      attempts: 0,
    };
    try {
      const generated = await getAIInsights(
        notes,
        String(row.customer_name),
        String(row.industry),
        meetingQuota.allowed ? classificationOf(row) : "confidential",
        locale,
      );
      meetingRun = generated.result;
      insights =
        generated.insights ||
        fallbackMeetingInsights(notes, String(row.customer_name), locale);
    } catch {
      insights = {
        ...fallbackMeetingInsights(notes, String(row.customer_name), locale),
        aiStatus: "error",
      };
    }
    const meetingId = `mtg-${Date.now()}`;
    const title = String(
      body.title ||
        localizedText(locale, "Recorded meeting", "Reunião registrada"),
    );
    await db
      .prepare(
        "INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        meetingId,
        id,
        title,
        notes,
        insights.summary,
        JSON.stringify(insights),
        insights.aiStatus,
        now,
        null,
        JSON.stringify(list(body.attendees)),
        String(body.objective || ""),
        JSON.stringify({
          questions: insights.nextQuestions,
          risks: insights.risks,
          themes: insights.ibmThemes,
        }),
        "completed",
      )
      .run();
    await recordAIRun(
      db,
      id,
      "meeting-intelligence",
      meetingRun,
      [meetingId],
      meetingRun.ok ? 86 : 70,
      meetingRun.ok
        ? localizedText(
            locale,
            "Notes analyzed by the active provider; extractions require human validation.",
            "Notas analisadas pelo provedor ativo; extrações exigem validação humana.",
          )
        : localizedText(
            locale,
            "Notes analyzed by the deterministic engine after provider unavailability, policy, or quota limits.",
            "Notas analisadas pelo motor determinístico após indisponibilidade, política ou cota do provedor.",
          ),
      false,
      locale,
    );
    await addEvent(db, {
      id: `evt-${id}-${meetingId}`,
      discoveryId: id,
      type: "meeting",
      title,
      content: `${insights.summary} ${insights.signals.join(" ")}`,
      sourceType: "meeting",
      sourceId: meetingId,
      evidenceStatus: "confirmed",
      confidence:
        insights.aiStatus === "watsonx" || insights.aiStatus === "gemini"
          ? 90
          : 78,
      occurredAt: now,
    });
    const answers = json<Answer[]>(row.answers_json, []);
    const allMeetings = (
      await db
        .prepare(
          "SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC",
        )
        .bind(id)
        .all<Record<string, unknown>>()
    ).results.map(mapMeeting);
    const result = analyze(answers, allMeetings, locale);
    const progress = Math.min(
      100,
      20 + answers.length * 10 + allMeetings.length * 18,
    );
    const map = buildAccountMap(
      {
        customerName: String(row.customer_name),
        industry: String(row.industry),
        scores: result.scores,
      },
      answers,
      allMeetings,
    );
    await db
      .prepare(
        "UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?",
      )
      .bind(
        allMeetings.length >= 2 && result.priority !== "Baixa"
          ? "Pronto para handoff"
          : "Qualificação pré-CRM",
        progress,
        result.priority,
        result.challengeSummary,
        JSON.stringify(result.scores),
        JSON.stringify(result.recommendations),
        result.nextEngagement,
        now,
        id,
      )
      .run();
    await db
      .prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(id, JSON.stringify(map.nodes), JSON.stringify(map.edges), now)
      .run();
    await recomputeAccount(db, id, {
      skipGenerative: true,
      responseLocale: locale,
    });
    const changeSet = await persistMeetingCommercialProof({
      db,
      discoveryId: id,
      meetingId,
      before: commercialBefore,
      insights,
      meetingRun,
      locale,
      createdAt: now,
    });
    await persistImpactMetrics(db, id, now);
    const impactRow = await db
      .prepare(
        "SELECT * FROM account_impact_metrics WHERE discovery_id = ? ORDER BY computed_at DESC LIMIT 1",
      )
      .bind(id)
      .first<Record<string, unknown>>();
    return Response.json({
      ok: true,
      meetingId,
      aiStatus: insights.aiStatus,
      provider:
        meetingRun.ok && insights.aiStatus !== "fallback"
          ? dbProviderName(meetingRun.provider)
          : "deterministic-rules",
      engineKind:
        meetingRun.ok && insights.aiStatus !== "fallback"
          ? "model"
          : "deterministic",
      requiresHumanApproval: true,
      changeSet,
      impact: impactRow ? mapImpactMetric(impactRow) : null,
    });
  }
  if (body.action === "information") {
    const kind = String(body.kind || "note");
    const title = String(
      body.title || localizedText(locale, "New information", "Nova informação"),
    ).trim();
    const content = String(body.content || "").trim();
    if (!content)
      return Response.json(
        { error: "Descreva a informação." },
        { status: 400 },
      );
    const occurredAt = String(body.occurredAt || now);
    const eventId = `evt-${id}-${Date.now()}`;
    const status = ["confirmed", "assumption", "gap", "stale"].includes(
      String(body.evidenceStatus),
    )
      ? (String(body.evidenceStatus) as AccountEvent["evidenceStatus"])
      : "confirmed";
    await addEvent(db, {
      id: eventId,
      discoveryId: id,
      type: kind,
      title,
      content,
      sourceType: "manual",
      sourceId: eventId,
      evidenceStatus: status,
      confidence:
        status === "confirmed" ? 88 : status === "assumption" ? 55 : 70,
      occurredAt,
    });
    if (
      [
        "initiative",
        "system",
        "pain",
        "risk",
        "objective",
        "partner",
        "competitor",
      ].includes(kind)
    )
      await db
        .prepare(
          "INSERT INTO account_entities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `ent-${Date.now()}`,
          id,
          kind,
          title,
          content,
          "active",
          "manual",
          eventId,
          status === "confirmed" ? 88 : 55,
          now,
          now,
        )
        .run();
    if (kind === "scheduled_meeting") {
      const meetingId = `mtg-${Date.now()}`;
      const fallback = fallbackMeetingInsights(
        content,
        String(row.customer_name),
        locale,
      );
      await db
        .prepare(
          "INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          meetingId,
          id,
          title,
          "",
          content,
          JSON.stringify(fallback),
          "fallback",
          now,
          occurredAt,
          JSON.stringify(list(body.attendees)),
          content,
          JSON.stringify({
            questions: fallback.nextQuestions,
            risks: fallback.risks,
            themes: fallback.ibmThemes,
          }),
          "scheduled",
        )
        .run();
    }
    await db
      .prepare("UPDATE discoveries SET updated_at = ? WHERE id = ?")
      .bind(now, id)
      .run();
    await recomputeAccount(db, id, { responseLocale: locale });
    await persistImpactMetrics(db, id, now);
    return Response.json({ ok: true, eventId });
  }
  if (body.action === "information_preview") {
    const content = String(body.content || "").trim();
    if (!content)
      return Response.json(
        { error: "Descreva a informação antes de revisar." },
        { status: 400 },
      );
    const lower = content.toLowerCase();
    const detectedKinds = compact([
      /ceo|cio|cto|cfo|ciso|diretor|gerente|stakeholder|\bdirector\b|\bmanager\b|\bexecutive\b|\bsponsor\b/.test(
        lower,
      ) && "stakeholder",
      /aws|azure|cloud|sap|mainframe|sistema|plataforma|\bsystem\b|\bplatform\b|\bapplication\b/.test(
        lower,
      ) && "system",
      /dor|problema|custo|risco|atraso|desperd|\bpain\b|\bissue\b|\bproblem\b|\bcost\b|\brisk\b|\bdelay\b|\bwaste\b/.test(
        lower,
      ) && "pain",
      /iniciativa|programa|projeto|roadmap|\binitiative\b|\bprogram\b|\bproject\b/.test(
        lower,
      ) && "initiative",
      /compromisso|prazo|até |responsável|\bcommitment\b|\bdeadline\b|\bdue date\b|\bowner\b/.test(
        lower,
      ) && "commitment",
    ]);
    const affectedThemes = kyndrylCapabilityCatalog
      .filter((item) => hitCount(lower, item.keywords) > 0)
      .map((item) => item.short);
    return Response.json({
      preview: {
        title: String(
          body.title ||
            localizedText(locale, "New information", "Nova informação"),
        ).trim(),
        content,
        kind: String(body.kind || detectedKinds[0] || "note"),
        evidenceStatus: String(body.evidenceStatus || "confirmed"),
        detectedKinds,
        affectedThemes,
        willUpdate:
          locale === "pt-BR"
            ? [
                "Memória da conta",
                detectedKinds.includes("stakeholder")
                  ? "Relacionamentos"
                  : "Entidades da conta",
                affectedThemes.length
                  ? "Hipóteses e próximas melhores ações"
                  : "Fila proativa",
              ]
            : [
                "Account memory",
                detectedKinds.includes("stakeholder")
                  ? "Relationships"
                  : "Account entities",
                affectedThemes.length
                  ? "Hypotheses and Next Best Actions"
                  : "Proactive queue",
              ],
        requiresHumanConfirmation: true,
      },
    });
  }
  if (body.action === "prepare_conversation") {
    const focus = String(
      body.focus ||
        localizedText(locale, "next conversation", "próxima conversa"),
    ).trim();
    const sources = await retrieveAccountSources(db, id, focus, null, 16);
    const fingerprint = await evidenceFingerprint(sources);
    const provider = aiAdapter();
    const cacheKey = await cacheKeyFor([
      id,
      "prepare-conversation",
      providerCacheSignature(provider, classificationOf(row), locale),
      fingerprint,
      focus.toLowerCase(),
    ]);
    const cached = await cachedAI<Record<string, unknown>>(db, cacheKey);
    if (cached)
      return Response.json({
        preparation: cached.data,
        provider: cached.provider,
        model: cached.model,
        cached: true,
        usage: cached.usage,
        citations: sources.slice(0, 8),
      });
    const quota = await quotaAllows(db, "generative");
    const generated = await provider.prepareMeeting(
      JSON.stringify({
        customer: row.customer_name,
        focus,
        sources: sources.map((source) => ({
          id: source.id,
          title: source.title,
          content: source.content,
          occurredAt: source.occurredAt,
        })),
        stakeholders: (
          await db
            .prepare("SELECT * FROM stakeholders WHERE discovery_id = ?")
            .bind(id)
            .all<Record<string, unknown>>()
        ).results.map(mapStakeholder),
        hypotheses: (
          await db
            .prepare(
              "SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?",
            )
            .bind(id)
            .all<Record<string, unknown>>()
        ).results.map(mapHypothesis),
      }),
      {
        classification: quota.allowed ? classificationOf(row) : "confidential",
        responseLocale: locale,
      },
    );
    const fallback = fallbackMeetingInsights(
      sources.map((source) => `${source.title}: ${source.content}`).join("\n"),
      String(row.customer_name),
      locale,
    );
    const preparation = generated.data || { ...fallback, objective: focus };
    await recordAIRun(
      db,
      id,
      "meeting-preparation",
      generated,
      sources.slice(0, 12).map((source) => source.id),
      generated.ok ? 84 : 70,
      localizedText(
        locale,
        "Conversation preparation was generated without changing account memory.",
        "Preparação de conversa gerada sem alterar a memória da conta.",
      ),
      false,
      locale,
    );
    if (generated.ok)
      await putAICache(db, {
        cacheKey,
        accountId: id,
        task: "prepare-conversation",
        provider: dbProviderName(generated.provider),
        model: generated.model || "",
        fingerprint,
        data: preparation,
        usage: generated.usage,
        ttlMs: 12 * 3600_000,
      });
    return Response.json({
      preparation,
      provider: dbProviderName(generated.provider),
      model: generated.model,
      cached: false,
      usage: generated.usage,
      citations: sources.slice(0, 8).map((source) => ({
        sourceType: source.kind,
        sourceId: source.sourceId,
        title: source.title,
        excerpt: source.content.slice(0, 220),
        occurredAt: source.occurredAt,
      })),
    });
  }
  if (body.action === "ask") {
    const question = String(body.question || "").trim();
    if (!question)
      return Response.json({ error: "Digite uma pergunta." }, { status: 400 });
    const provider = aiAdapter();
    const allSources = await collectAccountSources(db, id);
    const fingerprint = await evidenceFingerprint(allSources.slice(0, 90));
    const cacheKey = await cacheKeyFor([
      id,
      "ask",
      providerCacheSignature(provider, classificationOf(row), locale),
      fingerprint,
      question.toLowerCase(),
    ]);
    const cached = await cachedAI<Record<string, unknown>>(db, cacheKey);
    if (cached) {
      const cachedResponse = {
        ...cached.data,
        provider: cached.provider,
        model: cached.model,
        cached: true,
        usage: cached.usage,
      };
      await db.batch([
        db
          .prepare(
            "INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            `chat-${Date.now()}-u`,
            id,
            "user",
            question,
            "[]",
            "human",
            now,
          ),
        db
          .prepare(
            "INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            `chat-${Date.now()}-a`,
            id,
            "assistant",
            String(cached.data.answer || ""),
            JSON.stringify(cached.data.citations || []),
            String(cached.data.aiStatus || "fallback"),
            now,
          ),
      ]);
      return Response.json(cachedResponse);
    }
    const embeddingQuota = await quotaAllows(db, "embedding");
    let queryVector: number[] | null = null;
    if (
      embeddingQuota.allowed &&
      classificationOf(row) === "test" &&
      provider.status.gemini.configured
    ) {
      const embedded = await provider.embedSources(
        [{ id: "query", text: question }],
        { classification: "test", embeddingTask: "RETRIEVAL_QUERY" },
      );
      queryVector = embedded.data?.[0]?.values || null;
      await recordAIRun(
        db,
        id,
        "semantic-index",
        embedded,
        ["query"],
        embedded.ok ? 80 : 0,
        embedded.ok
          ? localizedText(
              locale,
              "Query embedded for hybrid retrieval.",
              "Consulta vetorizada para recuperação híbrida.",
            )
          : localizedText(
              locale,
              "Query without embeddings; keyword and recency retrieval remained available.",
              "Consulta sem embedding; busca por palavras-chave e recência.",
            ),
        false,
        locale,
      );
    }
    const ranked = await retrieveAccountSources(
      db,
      id,
      question,
      queryVector,
      14,
    );
    const evidenceEvents: AccountEvent[] = ranked.map((source) => ({
      id: source.id,
      discoveryId: id,
      type: source.kind,
      title: source.title,
      content: source.content,
      sourceType: source.kind,
      sourceId: source.sourceId,
      evidenceStatus: "confirmed",
      confidence: source.confidence,
      occurredAt: source.occurredAt,
      createdAt: source.occurredAt,
    }));
    const stakeholders = (
      await db
        .prepare("SELECT * FROM stakeholders WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>()
    ).results.map(mapStakeholder);
    const deterministic = answerFromEvidence(
      question,
      String(row.customer_name),
      evidenceEvents,
      json<Score[]>(row.scores_json, []),
      stakeholders,
      locale,
    );
    const generativeQuota = await quotaAllows(db, "generative");
    const generated = await provider.answerQuestion(
      JSON.stringify({
        customer: row.customer_name,
        sources: ranked.map((source) => ({
          id: source.id,
          title: source.title,
          content: source.content,
          sourceType: source.kind,
          sourceId: source.sourceId,
          page: source.page,
          occurredAt: source.occurredAt,
        })),
        stakeholders,
        scores: json<Score[]>(row.scores_json, []).slice(0, 4),
      }),
      question,
      {
        classification: generativeQuota.allowed
          ? classificationOf(row)
          : "confidential",
        responseLocale: locale,
      },
    );
    const citationLookup = new Map(ranked.map((source) => [source.id, source]));
    const generatedCitations =
      generated.data?.citationIds
        .map((citationId) => citationLookup.get(citationId))
        .filter(Boolean)
        .map((source) => ({
          sourceType: source!.kind,
          sourceId: source!.sourceId,
          title: source!.title,
          excerpt: source!.content.slice(0, 220),
          occurredAt: source!.occurredAt,
        })) || [];
    const citations = generatedCitations.length
      ? generatedCitations
      : deterministic.citations;
    const result = {
      answer: generated.data?.answer || deterministic.answer,
      citations,
      confidence: generated.data?.confidence ?? deterministic.confidence,
      aiStatus: generated.ok ? aiStatusOf(generated.provider) : "fallback",
      suggestedActions:
        generated.data?.suggestedActions || deterministic.suggestedActions,
      facts: generated.data?.facts || [],
      hypotheses: generated.data?.hypotheses || [],
      inferences: generated.data?.inferences || [],
      provider: dbProviderName(generated.provider),
      model: generated.model,
      cached: false,
      usage: generated.usage,
    };
    await db.batch([
      db
        .prepare(
          "INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(`chat-${Date.now()}-u`, id, "user", question, "[]", "human", now),
      db
        .prepare(
          "INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `chat-${Date.now()}-a`,
          id,
          "assistant",
          result.answer,
          JSON.stringify(result.citations),
          result.aiStatus,
          now,
        ),
    ]);
    await recordAIRun(
      db,
      id,
      "account-copilot",
      generated,
      result.citations.map((item) => item.sourceId),
      result.confidence,
      localizedText(
        locale,
        "Grounded answer; does not change data.",
        "Resposta fundamentada; não altera dados.",
      ),
      false,
      locale,
    );
    if (generated.ok)
      await putAICache(db, {
        cacheKey,
        accountId: id,
        task: "ask",
        provider: result.provider,
        model: result.model || "",
        fingerprint,
        data: result,
        usage: generated.usage,
        ttlMs: 12 * 3600_000,
      });
    return Response.json(result);
  }
  if (body.action === "action_status") {
    const allowed = [
      "proposal",
      "accepted",
      "in_progress",
      "completed",
      "discarded",
      "snoozed",
    ];
    const status = String(body.status);
    if (!allowed.includes(status))
      return Response.json({ error: "Status inválido." }, { status: 400 });
    const actionId = String(body.actionId || "");
    const existing = await db
      .prepare(
        "SELECT * FROM account_actions WHERE id = ? AND discovery_id = ?",
      )
      .bind(actionId, id)
      .first<Record<string, unknown>>();
    if (!existing)
      return Response.json({ error: "Ação não encontrada." }, { status: 404 });
    const reason = String(body.reason || "").trim();
    if (status === "discarded" && !reason)
      return Response.json(
        {
          error:
            "Informe o motivo do descarte para melhorar as próximas recomendações.",
        },
        { status: 400 },
      );
    const snoozedUntil =
      status === "snoozed"
        ? String(
            body.snoozedUntil ||
              new Date(Date.now() + 7 * 86400000).toISOString(),
          )
        : null;
    const feedbackType = String(
      body.feedbackType ||
        (status === "accepted"
          ? "accepted"
          : status === "completed"
            ? "completed"
            : status === "discarded"
              ? "discarded"
              : status === "snoozed"
                ? "snoozed"
                : body.edited
                  ? "edited"
                  : "status_changed"),
    );
    const adjustmentDelta =
      feedbackType === "completed"
        ? 3
        : feedbackType === "accepted"
          ? 2
          : feedbackType === "edited"
            ? 1
            : feedbackType === "discarded"
              ? -3
              : feedbackType === "snoozed"
                ? -1
                : 0;
    const adjustment = Math.max(
      -5,
      Math.min(5, Number(existing.rank_adjustment || 0) + adjustmentDelta),
    );
    await db.batch([
      db
        .prepare(
          "UPDATE account_actions SET status = ?, title = ?, next_step = ?, due_at = ?, snoozed_until = ?, feedback_reason = ?, rank_adjustment = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(
          status,
          String(body.title || existing.title),
          String(body.nextStep || existing.next_step),
          body.dueAt ? String(body.dueAt) : existing.due_at,
          snoozedUntil,
          reason || existing.feedback_reason || null,
          adjustment,
          now,
          actionId,
          id,
        ),
      db
        .prepare(
          "INSERT INTO action_feedback (id, action_id, discovery_id, feedback_type, reason, adjustment, previous_status, new_status, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          `afb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          actionId,
          id,
          feedbackType,
          reason,
          adjustmentDelta,
          String(existing.status),
          status,
          JSON.stringify({
            dueAt: body.dueAt || null,
            snoozedUntil,
            edited: Boolean(body.edited),
          }),
          now,
        ),
    ]);
    return Response.json({
      ok: true,
      status,
      snoozedUntil,
      rankAdjustment: adjustment,
    });
  }
  if (
    ["plan_save", "plan_apply", "plan_suggest"].includes(String(body.action))
  ) {
    const memory =
      mapMemory(
        await db
          .prepare("SELECT * FROM account_memory WHERE discovery_id = ?")
          .bind(id)
          .first<Record<string, unknown>>(),
      ) ||
      buildMemory(
        String(row.customer_name),
        String(row.challenge_summary),
        [],
        json<Score[]>(row.scores_json, []),
        0,
        locale,
      );
    const hypotheses = (
      await db
        .prepare("SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>()
    ).results.map(mapHypothesis);
    const actions = (
      await db
        .prepare("SELECT * FROM account_actions WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>()
    ).results.map(mapAction);
    const stakeholders = (
      await db
        .prepare("SELECT * FROM stakeholders WHERE discovery_id = ?")
        .bind(id)
        .all<Record<string, unknown>>()
    ).results.map(mapStakeholder);
    const current = mapPlan(
      await db
        .prepare("SELECT * FROM account_plans WHERE discovery_id = ?")
        .bind(id)
        .first<Record<string, unknown>>(),
    );
    let suggestion =
      body.action === "plan_suggest"
        ? suggestAccountPlan(
            memory,
            hypotheses.map((item) => ({
              ...item,
              stage: item.stage as
                | "draft"
                | "validating"
                | "qualified"
                | "rejected",
            })),
            actions,
            stakeholders,
            locale,
          )
        : current?.suggestion || {};
    if (body.action === "plan_suggest") {
      const quota = await quotaAllows(db, "generative");
      const generated = await aiAdapter().suggestAccountPlan(
        JSON.stringify({
          customer: row.customer_name,
          memory,
          hypotheses,
          actions,
          stakeholders,
          humanPlan: current,
        }),
        {
          classification: quota.allowed
            ? classificationOf(row)
            : "confidential",
          responseLocale: locale,
        },
      );
      if (generated.data)
        suggestion = Object.fromEntries(
          [
            "priorities",
            "initiatives",
            "objectives",
            "risks",
            "ecosystem",
            "relationship",
            "plan30",
            "plan60",
            "plan90",
          ].map((key) => [
            key,
            Array.isArray(generated.data?.[key as keyof typeof generated.data])
              ? (
                  generated.data?.[
                    key as keyof typeof generated.data
                  ] as unknown[]
                )
                  .map(String)
                  .slice(0, 8)
              : suggestion[key as keyof typeof suggestion] || [],
          ]),
        );
      await recordAIRun(
        db,
        id,
        "account-plan",
        generated,
        [],
        generated.ok ? 80 : 65,
        localizedText(
          locale,
          "Account Plan suggestion created for comparison and human approval.",
          "Sugestão de Account Plan criada para comparação e aprovação humana.",
        ),
        false,
        locale,
      );
    }
    const source = body.action === "plan_apply" ? suggestion : body;
    const values = [
      "priorities",
      "initiatives",
      "objectives",
      "risks",
      "ecosystem",
      "relationship",
      "plan30",
      "plan60",
      "plan90",
    ].map((key) =>
      list(
        (source as Record<string, unknown>)[key] ??
          (current as unknown as Record<string, unknown> | null)?.[key],
      ),
    );
    await db
      .prepare(
        "INSERT OR REPLACE INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        id,
        ...values.map((value) => JSON.stringify(value)),
        body.action === "plan_apply"
          ? "human-approved"
          : body.action === "plan_save"
            ? "human-edited"
            : String(current?.approvalStatus || "draft"),
        JSON.stringify(suggestion),
        now,
      )
      .run();
    return Response.json({ ok: true, suggestion });
  }
  if (body.action === "analyze") {
    const last = row.last_analyzed_at
      ? new Date(String(row.last_analyzed_at)).getTime()
      : 0;
    if (body.force || Date.now() - last > 12 * 3600000)
      await recomputeAccount(db, id, { responseLocale: locale });
    return Response.json({ ok: true });
  }
  if (body.action === "relationship") {
    const allowedRelations = [
      "reporta_para",
      "influencia",
      "aliado",
      "bloqueia",
      "decide",
      "possui_iniciativa",
    ];
    const relationshipId = String(
      body.relationshipId ||
        `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    );
    if (String(body.operation) === "delete") {
      await db
        .prepare(
          "DELETE FROM account_relationships WHERE id = ? AND discovery_id = ?",
        )
        .bind(relationshipId, id)
        .run();
      return Response.json({ ok: true });
    }
    const sourceId = String(body.sourceStakeholderId || body.source || "");
    const targetId = String(body.targetStakeholderId || body.target || "");
    const relationType = String(
      body.relationType || body.type || "reporta_para",
    );
    if (
      !sourceId ||
      !targetId ||
      sourceId === targetId ||
      !allowedRelations.includes(relationType)
    )
      return Response.json(
        {
          error: "Origem, destino e tipo de relação válidos são obrigatórios.",
        },
        { status: 400 },
      );
    const people = await db
      .prepare(
        "SELECT id FROM stakeholders WHERE discovery_id = ? AND id IN (?, ?)",
      )
      .bind(id, sourceId, targetId)
      .all<{ id: string }>();
    if (people.results.length !== 2)
      return Response.json(
        { error: "Os dois stakeholders precisam pertencer à conta." },
        { status: 400 },
      );
    const existing = await db
      .prepare(
        "SELECT id, created_at FROM account_relationships WHERE discovery_id = ? AND source_stakeholder_id = ? AND target_stakeholder_id = ? AND relation_type = ?",
      )
      .bind(id, sourceId, targetId, relationType)
      .first<Record<string, unknown>>();
    const savedId = String(existing?.id || relationshipId);
    const relationshipIdentity = await db
      .prepare("SELECT discovery_id FROM account_relationships WHERE id = ?")
      .bind(savedId)
      .first<Record<string, unknown>>();
    if (
      relationshipIdentity &&
      String(relationshipIdentity.discovery_id) !== id
    )
      return Response.json(
        { error: "Relação não encontrada nesta conta." },
        { status: 404 },
      );
    await db
      .prepare(
        "INSERT INTO account_relationships (id, discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type, label, confidence, evidence_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET source_stakeholder_id = excluded.source_stakeholder_id, target_stakeholder_id = excluded.target_stakeholder_id, relation_type = excluded.relation_type, label = excluded.label, confidence = excluded.confidence, evidence_json = excluded.evidence_json, status = excluded.status, updated_at = excluded.updated_at",
      )
      .bind(
        savedId,
        id,
        sourceId,
        targetId,
        relationType,
        String(body.label || ""),
        Math.max(0, Math.min(100, Number(body.confidence || 85))),
        JSON.stringify(Array.isArray(body.evidence) ? body.evidence : []),
        "confirmed",
        String(existing?.created_at || now),
        now,
      )
      .run();
    if (relationType === "reporta_para")
      await db
        .prepare(
          "UPDATE stakeholders SET reports_to_id = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
        )
        .bind(targetId, now, sourceId, id)
        .run();
    return Response.json({ ok: true, relationshipId: savedId });
  }
  if (body.action === "graph_layout") {
    const requestedMode = String(body.mode || "hierarchy");
    const mode = ["hierarchy", "influence", "capability"].includes(
      requestedMode,
    )
      ? requestedMode
      : "hierarchy";
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 250) : [];
    const viewport =
      body.viewport && typeof body.viewport === "object" ? body.viewport : {};
    await db
      .prepare(
        "INSERT OR REPLACE INTO account_graph_layouts (id, discovery_id, mode, nodes_json, viewport_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(
        `layout-${id}-${mode}`,
        id,
        mode,
        JSON.stringify(nodes),
        JSON.stringify(viewport),
        now,
      )
      .run();
    return Response.json({ ok: true, mode });
  }
  if (body.action === "research") {
    const companyName = String(body.companyName || row.customer_name).trim();
    const domain = normalizeCompanyDomain(body.domain || row.company_domain);
    if (
      !body.confirmed ||
      companyName.toLowerCase() !==
        String(row.customer_name).trim().toLowerCase() ||
      !domain
    )
      return Response.json(
        {
          error:
            "Confirme o nome da empresa e um domínio corporativo válido antes da pesquisa pública.",
        },
        { status: 400 },
      );
    if (classificationOf(row) === "confidential")
      return Response.json(
        {
          error:
            "A pesquisa com o modelo externo está bloqueada para contas confidenciais. Use watsonx ou registre fontes aprovadas manualmente.",
        },
        { status: 403 },
      );
    const query = String(
      body.question ||
        localizedText(
          locale,
          "recent strategic, technology, investment, and risk signals",
          "sinais estratégicos, tecnologia, investimentos e riscos recentes",
        ),
    ).trim();
    const provider = aiAdapter();
    const queryKey = await cacheKeyFor([
      id,
      "public-research",
      providerCacheSignature(provider, "test", locale),
      companyName.toLowerCase(),
      domain,
      query.toLowerCase(),
    ]);
    const saved = await db
      .prepare(
        "SELECT * FROM external_signals WHERE discovery_id = ? AND query_fingerprint = ? AND expires_at > ? ORDER BY created_at DESC",
      )
      .bind(id, queryKey, now)
      .all<Record<string, unknown>>();
    if (saved.results.length && !body.force)
      return Response.json({
        signals: saved.results.map((signal) => ({
          id: signal.id,
          title: signal.title,
          summary: signal.summary,
          sourceUrl: signal.source_url,
          publisher: signal.publisher,
          publishedAt: signal.published_at,
          status: signal.status,
          confidence: signal.confidence,
        })),
        cached: true,
        provider: "google-gemini",
      });
    const quota = await quotaAllows(db, "generative");
    if (!quota.allowed)
      return Response.json(
        {
          error:
            "A cota experimental de IA foi atingida. Tente novamente mais tarde; nenhuma informação foi alterada.",
          quota,
        },
        { status: 429 },
      );
    const context = await collectAccountSources(db, id);
    const generated = await provider.researchAccount(
      JSON.stringify({
        existingAccountMemory: context.slice(0, 20).map((source) => ({
          id: source.id,
          title: source.title,
          content: source.content,
        })),
      }),
      { companyName, domain, question: query },
      { classification: "test", responseLocale: locale },
    );
    await recordAIRun(
      db,
      id,
      "public-research",
      generated,
      context.slice(0, 10).map((source) => source.id),
      generated.ok ? 78 : 0,
      localizedText(
        locale,
        "On-demand public research; findings remain proposals until human approval.",
        "Pesquisa pública sob demanda; achados permanecem propostas até aprovação humana.",
      ),
      false,
      locale,
    );
    if (!generated.data || !generated.data.citations.length)
      return Response.json(
        {
          error:
            "A pesquisa fundamentada não retornou fontes verificáveis. Nenhuma informação foi salva.",
          provider: dbProviderName(generated.provider),
          model: generated.model,
          reason: generated.reason,
        },
        { status: 503 },
      );
    await db
      .prepare(
        "UPDATE discoveries SET company_domain = ?, updated_at = ? WHERE id = ?",
      )
      .bind(domain, now, id)
      .run();
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const savedSignals = [];
    for (let index = 0; index < generated.data.signals.length; index += 1) {
      const signal = generated.data.signals[index];
      const citation =
        generated.data.citations[index % generated.data.citations.length];
      const signalId = `signal-${Date.now()}-${index}`;
      await db
        .prepare(
          "INSERT INTO external_signals (id, discovery_id, query_fingerprint, title, summary, source_url, publisher, published_at, citation_json, status, confidence, approved_at, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          signalId,
          id,
          queryKey,
          signal.title,
          `${signal.description} ${localizedText(locale, "Relevance", "Relevância")}: ${signal.relevance}`,
          citation.uri,
          citation.title,
          signal.publishedAt,
          JSON.stringify(citation),
          "proposed",
          72,
          null,
          expiresAt,
          now,
          now,
        )
        .run();
      savedSignals.push({
        id: signalId,
        title: signal.title,
        summary: signal.description,
        relevance: signal.relevance,
        sourceUrl: citation.uri,
        publisher: citation.title,
        publishedAt: signal.publishedAt,
        status: "proposed",
        confidence: 72,
      });
    }
    return Response.json({
      summary: generated.data.summary,
      signals: savedSignals,
      provider: dbProviderName(generated.provider),
      model: generated.model,
      cached: false,
      usage: generated.usage,
      requiresHumanApproval: true,
    });
  }
  if (body.action === "external_signal_status") {
    const signalId = String(body.signalId || "");
    const status =
      String(body.status) === "approved" ? "approved" : "discarded";
    const signal = await db
      .prepare(
        "SELECT * FROM external_signals WHERE id = ? AND discovery_id = ?",
      )
      .bind(signalId, id)
      .first<Record<string, unknown>>();
    if (!signal)
      return Response.json(
        { error: "Sinal público não encontrado." },
        { status: 404 },
      );
    await db
      .prepare(
        "UPDATE external_signals SET status = ?, approved_at = ?, updated_at = ? WHERE id = ? AND discovery_id = ?",
      )
      .bind(status, status === "approved" ? now : null, now, signalId, id)
      .run();
    if (status === "approved") {
      await addEvent(db, {
        id: `evt-${id}-${signalId}`,
        discoveryId: id,
        type: "public_signal",
        title: String(signal.title),
        content: `${String(signal.summary)} Fonte: ${String(signal.source_url)}`,
        sourceType: "public_research",
        sourceId: signalId,
        evidenceStatus: "confirmed",
        confidence: Number(signal.confidence || 72),
        occurredAt: String(signal.published_at || now),
      });
      await recomputeAccount(db, id, { responseLocale: locale });
    }
    return Response.json({ ok: true, status });
  }
  if (body.action === "account_settings") {
    const classification =
      String(body.dataClassification) === "confidential"
        ? "confidential"
        : "test";
    const rawDomain = String(body.companyDomain || "").trim();
    const domain = normalizeCompanyDomain(rawDomain);
    if (rawDomain && !domain)
      return Response.json(
        {
          error: "Informe um domínio corporativo válido, como empresa.com.br.",
        },
        { status: 400 },
      );
    const previousPolicy = await db
      .prepare(
        "SELECT data_classification, company_domain FROM discoveries WHERE id = ?",
      )
      .bind(id)
      .first<Record<string, unknown>>();
    await db
      .prepare(
        "UPDATE discoveries SET data_classification = ?, company_domain = ?, updated_at = ? WHERE id = ?",
      )
      .bind(classification, domain, now, id)
      .run();
    await db.batch([
      db
        .prepare(
          "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, 'account_policy_updated', ?, ?)",
        )
        .bind(
          id,
          JSON.stringify({
            previous: {
              dataClassification: String(
                previousPolicy?.data_classification || "test",
              ),
              companyDomain: previousPolicy?.company_domain || null,
            },
            next: {
              dataClassification: classification,
              companyDomain: domain,
            },
          }),
          now,
        ),
      db.prepare("DELETE FROM ai_cache WHERE discovery_id = ?").bind(id),
      db
        .prepare("DELETE FROM daily_briefings WHERE owner_email = ?")
        .bind(identity.email),
      db
        .prepare("DELETE FROM daily_briefing_variants WHERE owner_email = ?")
        .bind(identity.email),
      ...(classification === "confidential"
        ? [
            db
              .prepare("DELETE FROM account_embeddings WHERE discovery_id = ?")
              .bind(id),
          ]
        : []),
    ]);
    return Response.json({
      ok: true,
      dataClassification: classification,
      companyDomain: domain,
    });
  }
  if (body.action === "stakeholder_upsert") {
    const stakeholderId = String(body.stakeholderId || `stk-${Date.now()}`);
    const name = String(body.name || "").trim();
    const role = String(body.role || "").trim();
    if (!name || !role)
      return Response.json(
        { error: "Nome e cargo são obrigatórios." },
        { status: 400 },
      );
    const reportsToId = body.reportsToId ? String(body.reportsToId) : null;
    if (reportsToId === stakeholderId)
      return Response.json(
        { error: "Uma pessoa não pode reportar a si mesma." },
        { status: 400 },
      );
    if (reportsToId) {
      const manager = await db
        .prepare(
          "SELECT id FROM stakeholders WHERE id = ? AND discovery_id = ?",
        )
        .bind(reportsToId, id)
        .first();
      if (!manager)
        return Response.json(
          { error: "O gestor selecionado não pertence a esta conta." },
          { status: 400 },
        );
    }
    const rawAssignments = body.capabilityAssignments;
    const validRoles = new Set([
      "owner",
      "decision_maker",
      "influencer",
      "technical_contact",
    ]);
    const validStatuses = new Set(["confirmed", "suggested", "dismissed"]);
    const capabilityAssignments =
      rawAssignments === undefined
        ? null
        : Array.isArray(rawAssignments)
          ? rawAssignments.flatMap((item) => {
              if (!item || typeof item !== "object") return [];
              const assignment = item as Record<string, unknown>;
              const capabilityKey = String(assignment.capabilityKey || "");
              const role = String(assignment.role || "");
              const status = String(assignment.status || "confirmed");
              if (
                !CDI_CAPABILITY_KEYS.includes(
                  capabilityKey as CdiCapabilityKey,
                ) ||
                !validRoles.has(role) ||
                !validStatuses.has(status)
              )
                return [];
              return [
                {
                  capabilityKey: capabilityKey as CdiCapabilityKey,
                  role: role as StakeholderCapabilityAssignment["role"],
                  status:
                    status as StakeholderCapabilityAssignment["status"],
                  confidence: Math.max(
                    0,
                    Math.min(100, Number(assignment.confidence ?? 100)),
                  ),
                  sourceType: String(
                    assignment.sourceType ||
                      (status === "suggested" ? "intelligence" : "manual"),
                  ),
                  sourceId: assignment.sourceId
                    ? String(assignment.sourceId)
                    : null,
                  evidence: Array.isArray(assignment.evidence)
                    ? assignment.evidence.slice(0, 12)
                    : [],
                },
              ];
            })
          : [];
    if (
      rawAssignments !== undefined &&
      (!Array.isArray(rawAssignments) ||
        rawAssignments.length > CDI_CAPABILITY_KEYS.length * 4 ||
        capabilityAssignments?.length !== rawAssignments.length)
    )
      return Response.json(
        {
          error:
            "Revise as capabilities, os papéis e os status atribuídos ao stakeholder.",
        },
        { status: 400 },
      );
    const dedupedAssignments = capabilityAssignments
      ? Array.from(
          new Map(
            capabilityAssignments.map((assignment) => [
              `${assignment.capabilityKey}:${assignment.role}`,
              assignment,
            ]),
          ).values(),
        )
      : null;
    const stakeholderIdentity = await db
      .prepare(
        "SELECT discovery_id, created_at FROM stakeholders WHERE id = ?",
      )
      .bind(stakeholderId)
      .first<Record<string, unknown>>();
    if (
      stakeholderIdentity &&
      String(stakeholderIdentity.discovery_id) !== id
    )
      return Response.json(
        { error: "Stakeholder não encontrado nesta conta." },
        { status: 404 },
      );
    const stakeholderStatements = [
      db
        .prepare(
          "INSERT INTO stakeholders (id, discovery_id, name, role, area, reports_to_id, influence, stance, priorities_json, notes, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role, area = excluded.area, reports_to_id = excluded.reports_to_id, influence = excluded.influence, stance = excluded.stance, priorities_json = excluded.priorities_json, notes = excluded.notes, source = 'manual', updated_at = excluded.updated_at",
        )
        .bind(
          stakeholderId,
          id,
          name,
          role,
          String(
            body.area ||
              localizedText(locale, "Not provided", "Não informada"),
          ),
          reportsToId,
          String(body.influence || "Média"),
          String(body.stance || "Desconhecido"),
          JSON.stringify(list(body.priorities).slice(0, 8)),
          String(body.notes || ""),
          String(stakeholderIdentity?.created_at || now),
          now,
        ),
    ];
    if (dedupedAssignments) {
      stakeholderStatements.push(
        db
          .prepare(
            "DELETE FROM stakeholder_capability_assignments WHERE discovery_id = ? AND stakeholder_id = ?",
          )
          .bind(id, stakeholderId),
      );
      for (const assignment of dedupedAssignments)
        stakeholderStatements.push(
          db
            .prepare(
              "INSERT INTO stakeholder_capability_assignments (id, discovery_id, stakeholder_id, capability_key, assignment_role, status, confidence, source_type, source_id, evidence_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(
              `sca-${stakeholderId}-${assignment.capabilityKey}-${assignment.role}`,
              id,
              stakeholderId,
              assignment.capabilityKey,
              assignment.role,
              assignment.status,
              assignment.confidence,
              assignment.sourceType,
              assignment.sourceId,
              JSON.stringify(assignment.evidence),
              now,
              now,
            ),
        );
    }
    await db.batch(stakeholderStatements);
    await addEvent(db, {
      id: `evt-${id}-${stakeholderId}`,
      discoveryId: id,
      type: "stakeholder",
      title: `${name} · ${role}`,
      content: `${String(body.notes || "")} ${localizedText(locale, "Priorities", "Prioridades")}: ${list(body.priorities).join(", ")}`,
      sourceType: "stakeholder",
      sourceId: stakeholderId,
      evidenceStatus: "confirmed",
      confidence: 90,
      occurredAt: now,
    });
    await recomputeAccount(db, id, { responseLocale: locale });
    const savedAssignments = await db
      .prepare(
        "SELECT * FROM stakeholder_capability_assignments WHERE discovery_id = ? AND stakeholder_id = ? ORDER BY capability_key, assignment_role",
      )
      .bind(id, stakeholderId)
      .all<Record<string, unknown>>();
    return Response.json({
      ok: true,
      stakeholderId,
      capabilityAssignments: savedAssignments.results.map(
        mapStakeholderCapabilityAssignment,
      ),
    });
  }
  if (body.action === "stakeholder_delete") {
    const stakeholderId = String(body.stakeholderId || "");
    await db.batch([
      db
        .prepare(
          "UPDATE stakeholders SET reports_to_id = NULL WHERE reports_to_id = ? AND discovery_id = ?",
        )
        .bind(stakeholderId, id),
      db
        .prepare(
          "DELETE FROM account_relationships WHERE discovery_id = ? AND (source_stakeholder_id = ? OR target_stakeholder_id = ?)",
        )
        .bind(id, stakeholderId, stakeholderId),
      db
        .prepare(
          "DELETE FROM stakeholder_capability_assignments WHERE discovery_id = ? AND stakeholder_id = ?",
        )
        .bind(id, stakeholderId),
      db
        .prepare("DELETE FROM stakeholders WHERE id = ? AND discovery_id = ?")
        .bind(stakeholderId, id),
      db
        .prepare(
          "DELETE FROM account_events WHERE source_type = 'stakeholder' AND source_id = ? AND discovery_id = ?",
        )
        .bind(stakeholderId, id),
    ]);
    await recomputeAccount(db, id, { responseLocale: locale });
    return Response.json({ ok: true });
  }
  if (body.action === "feedback") {
    await db
      .prepare(
        "INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(
        id,
        "feedback",
        body.accepted
          ? localizedText(
              locale,
              "Handoff validated by the user",
              "Handoff validado pelo usuário",
            )
          : localizedText(
              locale,
              "Handoff returned for review",
              "Handoff devolvido para revisão",
            ),
        now,
      )
      .run();
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Ação desconhecida." }, { status: 400 });
}

export async function GET(request: Request) {
  const locale = resolveResponseLocale(request);
  return finalizeApiResponse(await handleGET(request), locale);
}

export async function POST(request: Request) {
  const locale = resolveResponseLocale(request);
  return finalizeApiResponse(await handlePOST(request), locale);
}
