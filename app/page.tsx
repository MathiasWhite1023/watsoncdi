"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  ComposedModal,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ProgressBar,
  Select,
  SelectItem,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkeletonText,
  SkipToContent,
  Tag,
  TextArea,
  TextInput,
  Theme,
} from "@carbon/react";
import {
  Add,
  Analytics,
  ArrowRight,
  Asleep,
  Calendar,
  Chat,
  Checkmark,
  Close,
  Dashboard,
  Document,
  Watson,
  Launch,
  Menu,
  Renew,
  Search,
  Settings,
  UserAvatar,
  WatsonHealthTextAnnotationToggle,
} from "@carbon/icons-react";
import RelationshipGraph, {
  type AccountRelationship as GraphRelationship,
  type GraphPosition,
  type RelationshipGraphMode,
} from "./RelationshipGraph";
import {
  HypothesisConfidenceChart,
  PortfolioBubbleChart,
  StakeholderCoverageChart,
} from "./V5Charts";
import GuidedDiscoveryWorkspace, {
  type GuidedDiscoveryView,
} from "./GuidedDiscoveryWorkspace";
import {
  AccountHealthHeatmap,
  CapabilityHealthHeatmap,
  PortfolioFitHeatmap,
} from "./HealthHeatmaps";
import CustomerContextMap from "./CustomerContextMap";
import {
  AnalysisPipelinePanel,
  ConversationImpactPanel,
  CrmHandoffModal,
  ImpactMetricsPanel,
  type CrmHandoffData,
  type LogicalAgentRun,
} from "./CommercialProofPanels";
import { LanguageSwitcher, useI18n } from "./I18nProvider";
import {
  buildAccountHealthPortfolio,
  buildCapabilityHealth,
  buildPortfolioFit,
  type AccountHealthRow,
  type CapabilityHealthRow,
} from "@/lib/account-health";
import {
  appInterpolate,
  appMessages,
  type AppMessages,
} from "@/lib/app-messages";
import {
  localizeSystemValue,
  localeRequestHeaders,
  type Locale,
} from "@/lib/i18n";

type Priority = "Alta" | "Média" | "Baixa";
type Evidence = {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt: string;
  occurredAt: string;
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
type Insight = {
  summary: string;
  signals: string[];
  ibmThemes: string[];
  nextQuestions: string[];
  nextActions: string[];
  risks: string[];
  stakeholders: string[];
  systems: string[];
  painPoints: string[];
  aiStatus: string;
};
type Meeting = {
  id: string;
  discoveryId: string;
  title: string;
  notes: string;
  summary: string;
  insights: Insight;
  aiStatus: string;
  createdAt: string;
  scheduledAt?: string | null;
  attendees?: string[];
  objective?: string;
  preparation?: Record<string, unknown>;
  meetingStatus?: string;
};
type Stakeholder = {
  id: string;
  discoveryId: string;
  name: string;
  role: string;
  area: string;
  reportsToId: string | null;
  influence: string;
  stance: string;
  priorities: string[];
  notes: string;
  source: "manual" | "suggested";
  createdAt: string;
  updatedAt: string;
};
type Discovery = {
  id: string;
  customerName: string;
  industry: string;
  companySize: string;
  owner: string;
  visibility: string;
  dataClassification: "test" | "confidential";
  companyDomain: string | null;
  stage: string;
  progress: number;
  priority: Priority;
  challengeSummary: string;
  answers: Array<{ key: string; question: string; answer: string; at: string }>;
  meetings: Meeting[];
  accountMap?: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      detail?: string;
      strength?: number;
      evidence?: Evidence[];
      sourceCount?: number;
      updatedAt?: string;
    }>;
    edges: Array<{
      id?: string;
      source: string;
      target: string;
      label?: string;
      evidence?: Evidence[];
      confirmed?: boolean;
    }>;
    updatedAt?: string;
  };
  scores: Score[];
  recommendations: Array<{ type: string; name: string; rationale: string }>;
  nextEngagement: string;
  updatedAt: string;
};
type AccountEvent = {
  id: string;
  discoveryId: string;
  type: string;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string | null;
  evidenceStatus: "confirmed" | "assumption" | "gap" | "stale";
  confidence: number;
  occurredAt: string;
};
type Memory = {
  discoveryId: string;
  executiveSummary: string;
  known: string[];
  assumptions: string[];
  gaps: string[];
  changes: string[];
  aiStatus: string;
  version: number;
  updatedAt: string;
};
type Conversation = {
  stakeholder?: string;
  theme?: string;
  opener?: string;
  questions?: string[];
  objection?: string;
  successCriterion?: string;
};
type Action = {
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
  conversation: Conversation;
  snoozedUntil: string | null;
  feedbackReason: string | null;
  rankAdjustment: number;
  evidence: Evidence[];
};
type Hypothesis = {
  id: string;
  discoveryId: string;
  capabilityKey: string;
  title: string;
  problem: string;
  products: string[];
  stakeholderIds: string[];
  evidence: Evidence[];
  gaps: string[];
  confidence: number;
  stage: string;
  nextStep: string;
};
type Plan = {
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
type Relationship = {
  id: string;
  discoveryId: string;
  sourceStakeholderId: string;
  targetStakeholderId: string;
  relationType: string;
  label: string;
  confidence: number;
  evidence: Evidence[];
  status: string;
};
type GraphLayout = {
  id: string;
  discoveryId: string;
  mode: RelationshipGraphMode;
  nodes: Array<{ id: string; x: number; y: number }>;
  viewport: Record<string, number>;
};
type ExternalSignal = {
  id: string;
  discoveryId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publisher: string;
  publishedAt: string | null;
  status: string;
  confidence: number;
  createdAt: string;
};
type Snapshot = {
  id: string;
  discoveryId: string;
  reason: string;
  snapshot: {
    hypothesisConfidence?: Array<{ key: string; confidence: number }>;
  };
  confidence: number;
  createdAt: string;
};
type AIRun = {
  id: string;
  discoveryId: string;
  agent: string;
  provider: string;
  model?: string;
  status: string;
  confidence: number;
  detail: string;
  promptTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  cached?: boolean;
  errorCode?: string | null;
  createdAt: string;
};
type CommercialChangeSet = {
  id: string;
  discoveryId: string;
  sourceType: string;
  sourceId: string;
  triggerType: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  delta: Record<string, unknown>;
  suggestions: {
    stakeholders?: string[];
    systems?: string[];
    painPoints?: string[];
    themes?: string[];
    risks?: string[];
    nextActions?: string[];
  };
  provider: string;
  engineKind: "deterministic" | "model" | string;
  status: "pending_review" | "approved" | "rejected" | string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
type CommercialAgentRun = {
  id: string;
  discoveryId: string;
  workflowId: string;
  changeSetId?: string | null;
  agent: string;
  engineKind: "deterministic" | "model" | string;
  provider: string;
  model?: string;
  status: string;
  conclusion: string;
  confidence: number;
  sources: string[];
  output: Record<string, unknown>;
  humanValidationStatus: string;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
};
type CrmHandoffRecord = {
  id: string;
  discoveryId: string;
  hypothesisId?: string | null;
  version: number;
  status: string;
  payload: Record<string, unknown>;
  qualification: Record<string, unknown>;
  copyText: string;
  exportPayload: Record<string, unknown>;
  sources: string[];
  approvedBy?: string | null;
  approvedAt?: string | null;
  handedOffAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
type AccountImpactMetric = {
  id: string;
  discoveryId: string;
  discoveryStartedAt: string;
  qualifiedAt?: string | null;
  elapsedMinutes: number;
  questionsAddressed: number;
  questionsConfirmed: number;
  discoveryCoverage: number;
  openGaps: number;
  evidenceCount: number;
  confirmedEvidenceCount: number;
  meetingCount: number;
  qualifiedHypothesisCount: number;
  methodology: Record<string, string>;
  computedAt: string;
};
type CommercialProof = {
  discoveryId: string;
  latestChangeSet?: CommercialChangeSet | null;
  changeSets: CommercialChangeSet[];
  latestHandoff?: CrmHandoffRecord | null;
  handoffs: CrmHandoffRecord[];
  impact?: AccountImpactMetric | null;
  agentPipeline: CommercialAgentRun[];
  latestWorkflowId?: string | null;
  requiresHumanApproval: boolean;
  externalWritePerformed: boolean;
  handoffRecorded?: boolean;
};
type ApiData = {
  discoveries: Discovery[];
  meetings: Meeting[];
  stakeholders: Stakeholder[];
  events: Array<{
    id: string;
    discoveryId: string;
    type: string;
    detail: string;
    createdAt: string;
  }>;
  accountEvents: AccountEvent[];
  memories: Memory[];
  actions: Action[];
  hypotheses: Hypothesis[];
  plans: Plan[];
  documents: AccountDocument[];
  chats: unknown[];
  aiRuns: AIRun[];
  relationships: Relationship[];
  graphLayouts: GraphLayout[];
  externalSignals: ExternalSignal[];
  snapshots: Snapshot[];
  actionFeedback: unknown[];
  guidedDiscoveries: GuidedDiscovery[];
  changeSets: CommercialChangeSet[];
  crmHandoffs: CrmHandoffRecord[];
  impactMetrics: AccountImpactMetric[];
  agentPipelineRuns: CommercialAgentRun[];
  commercialProof: CommercialProof[];
};
type Briefing = {
  headline: string;
  summary: string;
  focusAccounts: Array<{
    accountId: string;
    accountName: string;
    headline: string;
    whyNow: string;
    priority: number;
    suggestedAction: string;
    citationIds: string[];
  }>;
  changes: string[];
  meetingsToPrepare: string[];
  overdueCommitments: string[];
};
type AIStatus = {
  mode: string;
  provider: string;
  watsonx: { configured: boolean; model: string | null };
  gemini: {
    configured: boolean;
    model: string;
    embeddingModel: string;
    limits: Record<string, number>;
    usage?: Record<string, number | boolean>;
    remaining?: Record<string, number>;
  };
  fallback: { available: boolean };
};
type ChatResult = {
  answer: string;
  citations: Evidence[];
  confidence: number;
  aiStatus: string;
  suggestedActions: string[];
  provider?: string;
  model?: string | null;
  cached?: boolean;
  facts?: string[];
  hypotheses?: string[];
  inferences?: string[];
};
type BriefingResponse = {
  briefing?: Briefing;
  provider?: string;
  model?: string | null;
  cached?: boolean;
  error?: string;
};
type GuidedDiscoveryQuestion = {
  id: string;
  sessionId: string;
  discoveryId: string;
  catalogQuestionId: string | null;
  pillar: string;
  prompt: string;
  hint: string | null;
  inputSchema: {
    kind?: "scale" | "single" | "multi";
    label?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
  source: "catalog" | "ai";
  rationale: string | null;
  citations: Evidence[];
  sequence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  rankingScore?: number;
  factors?: Record<string, number> | null;
};
type GuidedDiscoveryAnswer = {
  id: string;
  sessionId: string;
  questionId: string;
  discoveryId: string;
  structured: Record<string, unknown>;
  answerText: string;
  evidenceStatus: string;
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
type GuidedDiscovery = {
  discoveryId: string;
  catalogVersion: string;
  readonly: boolean;
  session: {
    id: string;
    mode: "adaptive" | "direct";
    selectedPillars: string[];
    status: string;
    progressPercent: number;
    coveragePercent: number;
    currentQuestionId: string | null;
    checkpointCount: number;
    aiStatus: string | null;
    updatedAt: string;
  } | null;
  questions: GuidedDiscoveryQuestion[];
  answers: GuidedDiscoveryAnswer[];
  currentQuestion: GuidedDiscoveryQuestion | null;
  nextQuestion: GuidedDiscoveryQuestion | null;
  metrics: {
    addressed: number;
    total: number;
    progressPercent: number;
    confirmedWithEvidence: number;
    coveragePercent: number;
    gaps: number;
    stale: number;
    contradictions: number;
  };
  pillars: Array<{
    key: string;
    label: string;
    description: string;
    progressPercent: number;
    coveragePercent: number;
    gaps: number;
    stale: number;
    relevance: number;
    rationale: string;
    selected: boolean;
  }>;
  checkpoint: { kind: string; pillar: string; available: boolean } | null;
  proposedFollowUp: GuidedDiscoveryQuestion | null;
  history: GuidedDiscoveryAnswer[];
  scoreHints: Record<string, number>;
};

const emptyData: ApiData = {
  discoveries: [],
  meetings: [],
  stakeholders: [],
  events: [],
  accountEvents: [],
  memories: [],
  actions: [],
  hypotheses: [],
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
};
const navItems = [
  { id: "home", key: "home", icon: Dashboard },
  { id: "accounts", key: "accounts", icon: Document },
  { id: "radar", key: "radar", icon: Analytics },
  { id: "settings", key: "settings", icon: Settings },
] as const;
const accountModeItems = [
  { id: "overview", key: "overview" },
  { id: "activity", key: "activity" },
  { id: "relationships", key: "relationships" },
  { id: "strategy", key: "strategy" },
] as const;
const statusTone = (status: string) =>
  status === "qualified" || status === "completed"
    ? "green"
    : status === "discarded"
      ? "gray"
      : status === "in_progress"
        ? "cyan"
        : status === "accepted"
          ? "blue"
          : status === "snoozed"
            ? "warm-gray"
            : "purple";
const isWatsonxProvider = (provider?: string | null) =>
  Boolean(provider && provider.toLowerCase().includes("watsonx"));
const isDeterministicProvider = (provider?: string | null) =>
  !provider ||
  provider === "fallback" ||
  provider === "deterministic" ||
  provider === "deterministic-rules";
const visibleProviderLabel = (
  provider: string | null | undefined,
  copy: AppMessages,
) =>
  isWatsonxProvider(provider)
    ? "IBM watsonx"
    : isDeterministicProvider(provider)
      ? copy.shell.deterministicFallback
      : copy.shell.geminiExperimental;
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const listValue = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const stringsValue = (value: unknown): string[] =>
  listValue(value).map(String).filter(Boolean);
const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function conversationImpactFromChangeSet(
  changeSet: CommercialChangeSet | null | undefined,
  locale: Locale,
) {
  if (!changeSet) return { scoreDeltas: [], addedFindings: [], changes: [] };
  const delta = objectValue(changeSet.delta);
  const progress = objectValue(delta.progress);
  const scoreDeltas = [] as Array<{
    id: string;
    label: string;
    before: number;
    after: number;
  }>;
  if ("before" in progress || "after" in progress)
    scoreDeltas.push({
      id: "pre-crm-maturity",
      label: locale === "pt-BR" ? "Maturidade pré-CRM" : "Pre-CRM maturity",
      before: numberValue(progress.before),
      after: numberValue(progress.after),
    });
  for (const capabilityValue of listValue(delta.capabilities)) {
    const capability = objectValue(capabilityValue);
    const before = objectValue(capability.before);
    const after = objectValue(capability.after);
    for (const metric of [
      "alignment",
      "value",
      "readiness",
      "confidence",
    ] as const) {
      const previous = numberValue(before[metric]);
      const next = numberValue(after[metric]);
      if (previous === next) continue;
      const metricLabel =
        locale === "pt-BR"
          ? {
              alignment: "alinhamento",
              value: "valor",
              readiness: "prontidão",
              confidence: "confiança",
            }[metric]
          : metric;
      scoreDeltas.push({
        id: `${String(capability.key || capability.name)}-${metric}`,
        label: `${String(capability.name || capability.key || "Capability")} · ${metricLabel}`,
        before: previous,
        after: next,
      });
    }
  }
  const entityDelta = objectValue(delta.entities);
  const stakeholderDelta = objectValue(delta.stakeholders);
  const rawFindings = [
    ...listValue(entityDelta.added),
    ...listValue(entityDelta.suggested),
    ...listValue(stakeholderDelta.added).map((item) => ({
      ...objectValue(item),
      type: "stakeholder",
    })),
    ...listValue(stakeholderDelta.suggested).map((item) => ({
      ...objectValue(item),
      type: "stakeholder",
    })),
  ];
  const allowedFindingKinds = new Set([
    "fact",
    "stakeholder",
    "pain",
    "initiative",
    "system",
    "risk",
  ]);
  const addedFindings = rawFindings.map((item, index) => {
    const finding = objectValue(item);
    const rawKind = String(finding.type || "fact").toLowerCase();
    const kind = (allowedFindingKinds.has(rawKind) ? rawKind : "fact") as
      | "fact"
      | "stakeholder"
      | "pain"
      | "initiative"
      | "system"
      | "risk";
    return {
      id: String(finding.id || `${kind}-${index}`),
      kind,
      title: String(finding.name || finding.title || finding.label || "—"),
      detail: String(finding.detail || finding.status || ""),
      confidence:
        finding.confidence === undefined
          ? undefined
          : numberValue(finding.confidence),
    };
  });
  const changes = [
    ...listValue(delta.hypotheses).map((item, index) => {
      const hypothesis = objectValue(item);
      const before = objectValue(hypothesis.before);
      const after = objectValue(hypothesis.after);
      const previousConfidence = numberValue(before.confidence);
      const nextConfidence = numberValue(after.confidence);
      return {
        id: String(hypothesis.id || `hypothesis-${index}`),
        kind: "hypothesis" as const,
        state: (!hypothesis.before
          ? "new"
          : nextConfidence > previousConfidence
            ? "strengthened"
            : nextConfidence < previousConfidence
              ? "weakened"
              : "updated") as "new" | "strengthened" | "weakened" | "updated",
        title: String(hypothesis.title || hypothesis.capabilityKey || "—"),
        previous: hypothesis.before
          ? `${String(before.stage || "draft")} · ${previousConfidence}%`
          : undefined,
        proposed: `${String(after.stage || "draft")} · ${nextConfidence}% · ${String(hypothesis.nextStep || "")}`,
        confidence: nextConfidence,
      };
    }),
    ...listValue(delta.actions).map((item, index) => {
      const action = objectValue(item);
      return {
        id: String(action.id || `action-${index}`),
        kind: "action" as const,
        state: "updated" as const,
        title: String(action.title || action.type || "—"),
        proposed: String(action.nextStep || action.status || "—"),
        confidence: numberValue(action.priorityScore),
      };
    }),
  ];
  return {
    scoreDeltas: scoreDeltas
      .sort(
        (a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before),
      )
      .slice(0, 8),
    addedFindings,
    changes,
  };
}

function crmHandoffDataFromRecord(
  record: CrmHandoffRecord | null | undefined,
  account?: Discovery,
): CrmHandoffData {
  const payload = objectValue(record?.payload);
  const payloadAccount = objectValue(payload.account);
  const opportunity = objectValue(payload.opportunity);
  const qualification = objectValue(record?.qualification);
  const gates = objectValue(qualification.gates);
  const gate = (key: string) => objectValue(gates[key]);
  const missingCriteria = Object.entries(gates)
    .filter(([, value]) => !Boolean(objectValue(value).passed))
    .map(([key]) => key);
  return {
    accountId: String(payloadAccount.id || account?.id || ""),
    accountName: String(
      payloadAccount.name || account?.customerName || "Watson CDI",
    ),
    opportunityName: String(opportunity.title || ""),
    problem: String(opportunity.problem || account?.challengeSummary || ""),
    businessObjective: stringsValue(opportunity.businessObjectives).join(" · "),
    capabilities: opportunity.capability
      ? [String(opportunity.capability)]
      : [],
    products: stringsValue(opportunity.products),
    stakeholders: listValue(payload.stakeholders).map((value, index) => {
      const person = objectValue(value);
      return {
        id: String(person.id || `stakeholder-${index}`),
        name: String(person.name || "—"),
        role: String(person.role || ""),
        relationship: String(person.influence || ""),
        isSponsor:
          String(person.influence || "").toLowerCase() === "alta" ||
          /chief|c-level|diretor|director|vp/i.test(String(person.role || "")),
      };
    }),
    evidence: listValue(opportunity.evidence || payload.evidence).map(
      (value, index) => {
        const evidence = objectValue(value);
        return {
          id: String(evidence.sourceId || evidence.id || `source-${index}`),
          title: String(evidence.title || evidence.sourceId || "Evidence"),
          source: String(evidence.sourceId || evidence.source || "account"),
          excerpt: String(evidence.excerpt || ""),
          confidence:
            evidence.confidence === undefined
              ? undefined
              : numberValue(evidence.confidence),
        };
      },
    ),
    gaps: stringsValue(opportunity.gaps),
    successCriteria: stringsValue(opportunity.businessObjectives),
    nextStep: String(opportunity.nextStep || ""),
    qualification: {
      qualified: Boolean(qualification.eligible),
      alignment: numberValue(gate("alignment").value),
      readiness: numberValue(gate("readiness").value),
      confidence: numberValue(gate("confidence").value),
      confirmedPain: Boolean(gate("confirmedPain").passed),
      relevantStakeholder: Boolean(gate("relevantStakeholder").passed),
      validatedNextStep: Boolean(gate("validatedNextStep").passed),
      missingCriteria,
    },
    generatedAt: record?.createdAt,
    approvedBy: record?.approvedBy || undefined,
  };
}

function logicalPipelineForProof(
  proof: CommercialProof | null | undefined,
  data: ApiData,
  locale: Locale,
): LogicalAgentRun[] {
  if (!proof) return [];
  const latestWorkflowId = proof.latestWorkflowId;
  const runs = latestWorkflowId
    ? proof.agentPipeline.filter((item) => item.workflowId === latestWorkflowId)
    : proof.agentPipeline;
  const labels: Record<string, [string, string]> = {
    "source-normalizer": ["Source intake", "Entrada de fontes"],
    "account-memory": ["Account memory", "Memória da conta"],
    "stakeholder-intelligence": [
      "Stakeholder intelligence",
      "Inteligência de stakeholders",
    ],
    "capability-fit": ["IBM capability fit", "Aderência às capacidades IBM"],
    "opportunity-hypothesis": [
      "Opportunity hypotheses",
      "Hipóteses de oportunidade",
    ],
    "next-best-action": ["Next best action", "Próxima melhor ação"],
    governance: ["Governance review", "Revisão de governança"],
  };
  const sourceFor = (sourceId: string) => {
    const event = data.accountEvents.find(
      (item) => item.id === sourceId || item.sourceId === sourceId,
    );
    const meeting = data.meetings.find((item) => item.id === sourceId);
    const accountDocument = data.documents.find((item) => item.id === sourceId);
    return {
      id: sourceId,
      label:
        event?.title || meeting?.title || accountDocument?.name || sourceId,
      sourceType:
        event?.sourceType ||
        (meeting ? "meeting" : accountDocument ? "document" : "source"),
      excerpt:
        event?.content ||
        meeting?.summary ||
        meeting?.notes ||
        accountDocument?.summary ||
        "",
    };
  };
  return runs.map((run) => ({
    id: run.id,
    name: labels[run.agent]?.[locale === "pt-BR" ? 1 : 0] || run.agent,
    status: ([
      "pending",
      "running",
      "completed",
      "fallback",
      "needs-review",
      "error",
      "failed",
    ].includes(run.status)
      ? run.status
      : "completed") as LogicalAgentRun["status"],
    provider:
      run.engineKind === "deterministic"
        ? "deterministic"
        : isWatsonxProvider(run.provider)
          ? "watsonx"
          : "configured-model",
    model: isWatsonxProvider(run.provider) ? run.model : undefined,
    sources: run.sources.map(sourceFor),
    conclusion: run.conclusion,
    confidence: run.confidence,
    durationMs:
      run.completedAt && run.startedAt
        ? Math.max(
            0,
            new Date(run.completedAt).getTime() -
              new Date(run.startedAt).getTime(),
          )
        : undefined,
  }));
}

function deterministicPipelinePreview(
  account: Discovery | undefined,
  events: AccountEvent[],
  locale: Locale,
): LogicalAgentRun[] {
  if (!account) return [];
  const source = events[0]
    ? [
        {
          id: events[0].sourceId || events[0].id,
          label: events[0].title,
          sourceType: events[0].sourceType,
          excerpt: events[0].content,
        },
      ]
    : [];
  const entries: Array<[string, string, string, string, number]> = [
    [
      "source-normalizer",
      "Source intake",
      "Entrada de fontes",
      "Recorded sources were normalized without changing the original content.",
      100,
    ],
    [
      "account-memory",
      "Account memory",
      "Memória da conta",
      "Known facts, assumptions, gaps, and stale signals were recomputed.",
      82,
    ],
    [
      "stakeholder-intelligence",
      "Stakeholder intelligence",
      "Inteligência de stakeholders",
      "Relationship coverage and missing executive roles were checked.",
      76,
    ],
    [
      "capability-fit",
      "IBM capability fit",
      "Aderência às capacidades IBM",
      "Capability alignment, value, readiness, and confidence were recalculated.",
      78,
    ],
    [
      "opportunity-hypothesis",
      "Opportunity hypotheses",
      "Hipóteses de oportunidade",
      "Opportunity hypotheses were checked against deterministic qualification gates.",
      74,
    ],
    [
      "next-best-action",
      "Next best action",
      "Próxima melhor ação",
      "The action queue was reordered by impact, urgency, confidence, and maturity.",
      79,
    ],
    [
      "governance",
      "Governance review",
      "Revisão de governança",
      "All derived changes remain subject to human approval and no external write occurred.",
      100,
    ],
  ];
  const ptConclusions: Record<string, string> = {
    "source-normalizer":
      "As fontes registradas foram normalizadas sem alterar o conteúdo original.",
    "account-memory":
      "Fatos, suposições, lacunas e sinais desatualizados foram recalculados.",
    "stakeholder-intelligence":
      "A cobertura de relacionamento e os papéis executivos ausentes foram verificados.",
    "capability-fit":
      "Alinhamento, valor, prontidão e confiança das capacidades foram recalculados.",
    "opportunity-hypothesis":
      "As hipóteses foram verificadas pelos critérios determinísticos de qualificação.",
    "next-best-action":
      "A fila foi reordenada por impacto, urgência, confiança e maturidade.",
    governance:
      "Toda mudança derivada exige aprovação humana e nenhuma escrita externa ocorreu.",
  };
  return entries.map(([id, enName, ptName, conclusion, confidence]) => ({
    id: `demo-${account.id}-${id}`,
    name: locale === "pt-BR" ? ptName : enName,
    status: "completed",
    provider: "deterministic",
    sources: source,
    conclusion: locale === "pt-BR" ? ptConclusions[id] : conclusion,
    confidence,
  }));
}

function impactDataForPanel(metric: AccountImpactMetric | null | undefined) {
  if (!metric)
    return {
      discoveryCoverage: 0,
      openGaps: 0,
      resolvedGaps: 0,
      confirmedEvidence: 0,
      totalEvidence: 0,
      qualifiedAccounts: 0,
      observedAccounts: 0,
    };
  return {
    baseline: null,
    observedDiscoveryMinutes: metric.elapsedMinutes || null,
    discoveryCoverage: metric.discoveryCoverage,
    openGaps: metric.openGaps,
    resolvedGaps: metric.questionsConfirmed,
    confirmedEvidence: metric.confirmedEvidenceCount,
    totalEvidence: metric.evidenceCount,
    timeToQualificationDays: metric.qualifiedAt
      ? Math.max(0, Math.round((metric.elapsedMinutes / 1440) * 10) / 10)
      : null,
    qualifiedAccounts: metric.qualifiedHypothesisCount > 0 ? 1 : 0,
    observedAccounts: 1,
    lastUpdated: metric.computedAt,
  };
}
const pageLoadedAt = Date.now();
const desktopNavMedia = "(min-width: 901px)";
const subscribeDesktopNav = (onStoreChange: () => void) => {
  const query = window.matchMedia(desktopNavMedia);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};
const getDesktopNavSnapshot = () =>
  typeof window !== "undefined" && window.matchMedia(desktopNavMedia).matches;
const getServerDesktopNavSnapshot = () => false;

function usePageCopy() {
  const i18n = useI18n();
  const copy = appMessages[i18n.locale];
  const text = (template: string, values?: Record<string, string | number>) =>
    appInterpolate(template, values);
  const statusLabels: Record<string, string> = {
    proposal: copy.status.proposal,
    accepted: copy.status.accepted,
    in_progress: copy.status.inProgress,
    completed: copy.status.completed,
    discarded: copy.status.discarded,
    snoozed: copy.status.snoozed,
    draft: copy.status.draft,
    validating: copy.status.validating,
    qualified: copy.status.qualified,
  };
  const questions = [
    copy.copilot.q1,
    copy.copilot.q2,
    copy.copilot.q3,
    copy.copilot.q4,
  ];
  const playbooks = [
    {
      key: "FinOps",
      product: "IBM Cloudability + Turbonomic",
      question: copy.playbooks.finopsQuestion,
      workshop: "FinOps Discovery Workshop",
    },
    {
      key: "Trusted Data",
      product: "watsonx.data + IBM Guardium",
      question: copy.playbooks.trustedDataQuestion,
      workshop: "Trusted Data Workshop",
    },
    {
      key: "AI Governance",
      product: "watsonx.governance + watsonx.ai",
      question: copy.playbooks.aiGovernanceQuestion,
      workshop: "AI Governance Workshop",
    },
    {
      key: "Hybrid Cloud",
      product: "Red Hat OpenShift + Terraform",
      question: copy.playbooks.hybridCloudQuestion,
      workshop: "Hybrid Cloud Architecture Review",
    },
    {
      key: "Automation",
      product: "watsonx Orchestrate + IBM Concert",
      question: copy.playbooks.automationQuestion,
      workshop: "Automation Discovery Workshop",
    },
    {
      key: "App Modernization",
      product: "OpenShift + Instana",
      question: copy.playbooks.modernizationQuestion,
      workshop: "Modernization Assessment",
    },
  ];
  const formatDate = (value?: string | null) =>
    value
      ? i18n.formatDate(value, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : copy.activity.noDueDate;
  return {
    ...i18n,
    copy,
    text,
    statusLabels,
    questions,
    playbooks,
    formatDate,
  };
}

export default function Home({
  mode = "demo",
  userName = "",
}: {
  mode?: "demo" | "private";
  userName?: string;
}) {
  const { locale, dictionary, copy, text, playbooks } = usePageCopy();
  const privateMode = mode === "private";
  const [active, setActive] = useState<(typeof navItems)[number]["id"]>("home");
  const [accountMode, setAccountMode] =
    useState<(typeof accountModeItems)[number]["id"]>("overview");
  const [data, setData] = useState<ApiData>(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const desktopNav = useSyncExternalStore(
    subscribeDesktopNav,
    getDesktopNavSnapshot,
    getServerDesktopNavSnapshot,
  );
  const [notice, setNotice] = useState("");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefMeta, setBriefMeta] = useState<{
    provider: string;
    model?: string | null;
    cached: boolean;
  } | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [copilot, setCopilot] = useState(false);
  const [copilotMode, setCopilotMode] = useState<"ask" | "prepare" | "next">(
    "ask",
  );
  const [question, setQuestion] = useState("");
  const [chatResult, setChatResult] = useState<ChatResult | null>(null);
  const [preparation, setPreparation] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [modal, setModal] = useState<
    "new-account" | "information" | "stakeholder" | "action" | "research" | null
  >(null);
  const [editingStakeholder, setEditingStakeholder] =
    useState<Stakeholder | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [informationDraft, setInformationDraft] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [informationPreview, setInformationPreview] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [radarFilter, setRadarFilter] = useState<"all" | Priority>("all");
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [latestConversationReview, setLatestConversationReview] =
    useState<CommercialChangeSet | null>(null);
  const [handoffRecord, setHandoffRecord] = useState<CrmHandoffRecord | null>(
    null,
  );
  const [handoffOpen, setHandoffOpen] = useState(false);

  const endpoint = `/api/accounts?scope=${mode}`;
  const apiFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      fetch(input, {
        ...init,
        headers: localeRequestHeaders(locale, init.headers),
      }),
    [locale],
  );
  const load = useCallback(async () => {
    const response = await apiFetch(endpoint, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as ApiData;
      setData({ ...emptyData, ...payload });
      setSelectedId((current) =>
        current && payload.discoveries.some((item) => item.id === current)
          ? current
          : payload.discoveries[0]?.id || "",
      );
    }
    setLoading(false);
  }, [apiFetch, endpoint]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!privateMode) return;
    void apiFetch("/api/briefing", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<BriefingResponse>) : null,
      )
      .then((payload) => {
        if (payload?.briefing) {
          setBriefing(payload.briefing);
          setBriefMeta({
            provider: payload.provider || "fallback",
            model: payload.model,
            cached: Boolean(payload.cached),
          });
        }
      });
    void apiFetch("/api/ai/status", { cache: "no-store" })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<AIStatus>) : null,
      )
      .then((payload) => payload && setAIStatus(payload));
  }, [apiFetch, privateMode]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setModal(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selected =
    data.discoveries.find((item) => item.id === selectedId) ||
    data.discoveries[0];
  const accountEvents = data.accountEvents.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const memory = data.memories.find(
    (item) => item.discoveryId === selected?.id,
  );
  const actions = data.actions
    .filter((item) => item.discoveryId === selected?.id)
    .filter((item) => item.status !== "discarded");
  const hypotheses = data.hypotheses.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const stakeholders = data.stakeholders.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const meetings = data.meetings.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const plan = data.plans.find((item) => item.discoveryId === selected?.id);
  const documents = data.documents.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const relationships = data.relationships.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const graphLayouts = data.graphLayouts.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const signals = data.externalSignals.filter(
    (item) => item.discoveryId === selected?.id,
  );
  const guidedDiscovery =
    data.guidedDiscoveries.find((item) => item.discoveryId === selected?.id) ||
    null;
  const commercialProof =
    data.commercialProof.find((item) => item.discoveryId === selected?.id) ||
    null;
  const conversationReview =
    latestConversationReview?.discoveryId === selected?.id
      ? latestConversationReview
      : commercialProof?.latestChangeSet || null;
  const activeHandoff =
    handoffRecord?.discoveryId === selected?.id
      ? handoffRecord
      : commercialProof?.latestHandoff || null;
  const conversationImpact = conversationImpactFromChangeSet(
    conversationReview,
    locale,
  );
  const recordedLogicalPipeline = logicalPipelineForProof(
    commercialProof,
    data,
    locale,
  );
  const logicalPipeline = recordedLogicalPipeline.length
    ? recordedLogicalPipeline
    : !privateMode
      ? deterministicPipelinePreview(selected, accountEvents, locale)
      : [];
  const portfolioActions = [...data.actions]
    .filter(
      (item) => !["completed", "discarded", "snoozed"].includes(item.status),
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const filteredAccounts =
    radarFilter === "all"
      ? data.discoveries
      : data.discoveries.filter((item) => item.priority === radarFilter);
  const sponsor =
    stakeholders.find(
      (person) =>
        person.source === "manual" &&
        person.influence === "Alta" &&
        person.stance === "Aliado",
    ) ||
    stakeholders.find(
      (person) =>
        person.source === "manual" && /chief|diretor|vp/i.test(person.role),
    );
  const accountHealthRows = buildAccountHealthPortfolio(data.discoveries, {
    stakeholders: data.stakeholders,
    events: data.accountEvents,
    actions: data.actions,
    guidedDiscoveries: data.guidedDiscoveries,
  });
  const capabilityHealthRows = selected
    ? buildCapabilityHealth({ account: selected, guidedDiscovery, playbooks })
    : [];
  const portfolioFitRows = buildPortfolioFit(data.discoveries);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  };
  const post = async (body: Record<string, unknown>) =>
    apiFetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, scope: mode, responseLocale: locale }),
    });
  const mutate = async (body: Record<string, unknown>, success: string) => {
    if (!privateMode) {
      window.location.assign("/signin-with-chatgpt?return_to=%2Fworkspace");
      return null;
    }
    setSaving(true);
    const response = await post(body);
    const payload = (await response.json()) as Record<string, unknown>;
    if (response.ok) {
      await load();
      notify(success);
    } else notify(String(payload.error || copy.notifications.genericError));
    setSaving(false);
    return response.ok ? payload : null;
  };
  const guidedMutation = async (
    path: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    success: string,
  ) => {
    if (!selected) return null;
    if (!privateMode) {
      window.location.assign("/signin-with-chatgpt?return_to=%2Fworkspace");
      return null;
    }
    setSaving(true);
    const response = await apiFetch(
      `/api/accounts/${selected.id}/guided-discovery${path}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, responseLocale: locale }),
      },
    );
    const payload = (await response.json()) as {
      guidedDiscovery?: GuidedDiscovery;
      error?: string;
      message?: string;
      scoreDeltas?: Array<{
        label: string;
        before: number;
        after: number;
        delta: number;
      }>;
      checkpointAvailable?: boolean;
    };
    if (response.ok && payload.guidedDiscovery) {
      setData((current) => ({
        ...current,
        guidedDiscoveries: [
          ...current.guidedDiscoveries.filter(
            (item) => item.discoveryId !== selected.id,
          ),
          payload.guidedDiscovery!,
        ],
      }));
      notify(payload.message || success);
    } else notify(payload.error || copy.notifications.discoveryError);
    setSaving(false);
    return response.ok ? payload : null;
  };
  const openAccount = useCallback(
    (accountId: string, nextMode: typeof accountMode = "overview") => {
      setSelectedId(accountId);
      setActive("accounts");
      setAccountMode(nextMode);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );
  const openEvidence = useCallback(
    (accountId: string, sourceReference: string) => {
      const normalized = sourceReference.trim().toLocaleLowerCase(locale);
      const includesReference = (...values: Array<string | null | undefined>) =>
        values.some((value) => {
          const candidate = String(value || "").toLocaleLowerCase(locale);
          return (
            Boolean(candidate) &&
            (candidate === normalized ||
              (normalized.length > 3 &&
                (candidate.includes(normalized) ||
                  normalized.includes(candidate))))
          );
        });
      const event = data.accountEvents.find(
        (item) =>
          item.discoveryId === accountId &&
          includesReference(item.id, item.sourceId, item.title, item.content),
      );
      const meeting = data.meetings.find(
        (item) =>
          item.discoveryId === accountId &&
          includesReference(item.id, item.title, item.summary, item.notes),
      );
      const accountDocument = data.documents.find(
        (item) =>
          item.discoveryId === accountId &&
          includesReference(item.id, item.name, item.summary),
      );
      const targetId = event
        ? `source-${event.sourceId || event.id}`
        : meeting
          ? `meeting-${meeting.id}`
          : accountDocument
            ? `document-${accountDocument.id}`
            : "account-evidence-timeline";
      setSelectedId(accountId);
      setActive("accounts");
      setAccountMode("activity");
      window.setTimeout(() => {
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.classList.add("v5-evidence-focus");
        if (target)
          window.setTimeout(
            () => target.classList.remove("v5-evidence-focus"),
            2400,
          );
      }, 120);
    },
    [data.accountEvents, data.documents, data.meetings, locale],
  );
  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!selected || !question.trim()) return;
    if (!privateMode) {
      setChatResult({
        answer: copy.copilot.demoAnswer,
        citations: accountEvents.slice(0, 3).map((event) => ({
          sourceType: event.sourceType,
          sourceId: event.sourceId || event.id,
          title: event.title,
          excerpt: event.content,
          occurredAt: event.occurredAt,
        })),
        confidence: accountEvents.length ? 72 : 40,
        aiStatus: "deterministic",
        suggestedActions: [],
      });
      return;
    }
    setSaving(true);
    const response = await post({ action: "ask", id: selected.id, question });
    const payload = (await response.json()) as ChatResult & { error?: string };
    if (response.ok) setChatResult(payload);
    else notify(payload.error || copy.notifications.answerError);
    setSaving(false);
  };
  const prepareConversation = async () => {
    if (!selected || !privateMode) return;
    setSaving(true);
    const response = await post({
      action: "prepare_conversation",
      id: selected.id,
      focus: question || actions[0]?.conversation.theme || copy.copilot.next,
    });
    const payload = (await response.json()) as {
      preparation?: Record<string, unknown>;
      provider?: string;
      model?: string | null;
      citations?: Evidence[];
      error?: string;
    };
    if (response.ok)
      setPreparation({
        ...(payload.preparation || {}),
        provider: payload.provider,
        model: payload.model,
        citations: payload.citations,
      });
    else notify(payload.error || copy.notifications.preparationError);
    setSaving(false);
  };
  const actionStatus = async (
    action: Action,
    status: string,
    extras: Record<string, unknown> = {},
  ) => {
    await mutate(
      {
        action: "action_status",
        id: action.discoveryId,
        actionId: action.id,
        status,
        ...extras,
      },
      copy.notifications.actionDecision,
    );
  };
  const saveMeeting = async (payload: Record<string, unknown>) => {
    if (!selected) return;
    const result = await mutate(
      { action: "meeting", id: selected.id, ...payload },
      copy.notifications.meetingSaved,
    );
    const changeSet = result?.changeSet as CommercialChangeSet | undefined;
    if (changeSet) setLatestConversationReview(changeSet);
  };
  const reviewChangeSet = async (
    changeSet: CommercialChangeSet,
    status: "approved" | "rejected",
  ) => {
    const result = await mutate(
      {
        action: "change_set_status",
        id: changeSet.discoveryId,
        changeSetId: changeSet.id,
        status,
      },
      locale === "pt-BR"
        ? status === "approved"
          ? "Mudanças propostas aprovadas."
          : "Mudanças propostas rejeitadas; a fonte original foi preservada."
        : status === "approved"
          ? "Proposed changes approved."
          : "Proposed changes rejected; the original source was preserved.",
    );
    if (!result) throw new Error(copy.notifications.genericError);
    if (result.changeSet)
      setLatestConversationReview(result.changeSet as CommercialChangeSet);
  };
  const previewCrmHandoff = async (hypothesisId?: string) => {
    if (!selected) return;
    if (!privateMode) {
      const hypothesis =
        hypotheses.find((item) => item.id === hypothesisId) ||
        hypotheses[0] ||
        null;
      const score =
        selected.scores.find(
          (item) => item.short === hypothesis?.capabilityKey,
        ) || selected.scores[0];
      const relevantStakeholders = stakeholders.filter(
        (person) =>
          hypothesis?.stakeholderIds.includes(person.id) ||
          person.influence === "Alta",
      );
      const gates = {
        alignment: {
          passed: Number(score?.alignment || 0) >= 75,
          value: Number(score?.alignment || 0),
        },
        readiness: {
          passed: Number(score?.readiness || 0) >= 60,
          value: Number(score?.readiness || 0),
        },
        confidence: {
          passed: Number(hypothesis?.confidence || 0) >= 70,
          value: Number(hypothesis?.confidence || 0),
        },
        confirmedPain: { passed: Boolean(hypothesis?.evidence.length) },
        relevantStakeholder: { passed: relevantStakeholders.length > 0 },
        validatedNextStep: { passed: Boolean(hypothesis?.nextStep) },
      };
      const eligible =
        hypothesis?.stage === "qualified" &&
        Object.values(gates).every((gate) => gate.passed);
      const createdAt = new Date().toISOString();
      setHandoffRecord({
        id: `demo-handoff-${selected.id}`,
        discoveryId: selected.id,
        hypothesisId: hypothesis?.id || null,
        version: 1,
        status: "preview",
        payload: {
          account: { id: selected.id, name: selected.customerName },
          opportunity: {
            title:
              hypothesis?.title ||
              (locale === "pt-BR"
                ? "Hipótese ainda em descoberta"
                : "Hypothesis still under discovery"),
            problem: hypothesis?.problem || selected.challengeSummary,
            businessObjectives: plan?.objectives || [],
            capability: hypothesis?.capabilityKey || score?.short || null,
            products: hypothesis?.products || [],
            nextStep: hypothesis?.nextStep || "",
            gaps: hypothesis?.gaps || [],
            evidence: hypothesis?.evidence || [],
          },
          stakeholders: relevantStakeholders,
        },
        qualification: { eligible, gates },
        copyText: "",
        exportPayload: {},
        sources: hypothesis?.evidence.map((item) => item.sourceId) || [],
        createdAt,
        updatedAt: createdAt,
      });
      setHandoffOpen(true);
      return;
    }
    const result = await mutate(
      {
        action: "handoff_preview",
        id: selected.id,
        hypothesisId,
      },
      locale === "pt-BR"
        ? "Prévia pré-CRM preparada para revisão."
        : "Pre-CRM preview prepared for review.",
    );
    if (result?.handoff) {
      setHandoffRecord(result.handoff as CrmHandoffRecord);
      setHandoffOpen(true);
    }
  };
  const markCrmHandoff = async () => {
    if (!selected || !activeHandoff) return;
    const result = await mutate(
      {
        action: "handoff_mark",
        id: selected.id,
        handoffId: activeHandoff.id,
        operation: "mark_handed_off",
        confirmHumanApproval: true,
      },
      locale === "pt-BR"
        ? "Handoff humano registrado; nenhuma escrita externa foi realizada."
        : "Human handoff recorded; no external write was performed.",
    );
    if (!result) throw new Error(copy.notifications.genericError);
    if (result.handoff) setHandoffRecord(result.handoff as CrmHandoffRecord);
  };

  const hierarchyRelationships: GraphRelationship[] = relationships.length
    ? relationships.map((item) => ({
        id: item.id,
        source: item.sourceStakeholderId,
        target: item.targetStakeholderId,
        type: item.relationType as GraphRelationship["type"],
        label: item.label,
        confirmed: item.status === "confirmed",
        evidence: item.evidence.map((source, index) => ({
          id: `${item.id}-${index}`,
          title: source.title,
          excerpt: source.excerpt,
          sourceType: source.sourceType,
          updatedAt: source.occurredAt,
        })),
      }))
    : stakeholders
        .filter((person) => person.reportsToId)
        .map((person) => ({
          id: `local-${person.id}`,
          source: person.id,
          target: person.reportsToId!,
          type: "reporta_para",
          confirmed: true,
        }));
  const savedPositions = graphLayouts.reduce<
    Partial<Record<RelationshipGraphMode, Record<string, GraphPosition>>>
  >((result, layout) => {
    result[layout.mode] = Object.fromEntries(
      layout.nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
    );
    return result;
  }, {});

  const commands = useMemo(() => {
    const base = [
      {
        label: copy.command.goHome,
        hint: copy.command.navigation,
        run: () => setActive("home"),
      },
      {
        label: copy.command.openRadar,
        hint: copy.command.navigation,
        run: () => setActive("radar"),
      },
      {
        label: copy.command.addInformation,
        hint: copy.command.action,
        run: () => selected && setModal("information"),
      },
      {
        label: copy.command.openDiscovery,
        hint: copy.command.strategy,
        run: () => {
          if (selected) {
            setActive("accounts");
            setAccountMode("strategy");
            setGuidedOpen(true);
          }
        },
      },
      {
        label: copy.command.addStakeholder,
        hint: copy.command.action,
        run: () => {
          setEditingStakeholder(null);
          setModal("stakeholder");
        },
      },
      {
        label: copy.command.prepareConversation,
        hint: copy.command.copilot,
        run: () => {
          setCopilot(true);
          setCopilotMode("prepare");
        },
      },
      {
        label: copy.command.askAccount,
        hint: copy.command.copilot,
        run: () => {
          setCopilot(true);
          setCopilotMode("ask");
        },
      },
    ];
    return [
      ...base,
      ...data.discoveries.map((account) => ({
        label: account.customerName,
        hint: copy.command.account,
        run: () => openAccount(account.id),
      })),
    ].filter((item) =>
      item.label
        .toLocaleLowerCase(locale)
        .includes(commandQuery.toLocaleLowerCase(locale)),
    );
  }, [commandQuery, copy, data.discoveries, locale, selected, openAccount]);

  if (loading)
    return (
      <main className="v5-loading">
        <div>
          <Watson size={32} />
        </div>
        <SkeletonText heading width="14rem" />
        <SkeletonText paragraph lineCount={3} width="22rem" />
      </main>
    );

  return (
    <div className={`v5-shell ${copilot ? "has-copilot" : ""}`}>
      <Theme theme="g100">
        <Header aria-label={dictionary.brand.name} className="v5-header">
          <SkipToContent />
          <HeaderMenuButton
            aria-label="Menu"
            isActive={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
            renderMenuIcon={<Menu />}
            renderCloseIcon={<Close />}
          />
          <HeaderName
            prefix="Watson"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setActive("home");
            }}
          >
            CDI
          </HeaderName>
          <div className="v5-header-state">
            <i /> {copy.shell.proactive}
          </div>
          <button
            className="v5-command-trigger"
            onClick={() => setCommandOpen(true)}
          >
            <Search size={16} />
            <span>{copy.shell.search}</span>
            <kbd>⌘ K</kbd>
          </button>
          <LanguageSwitcher className="v5-language-switcher" />
          <HeaderGlobalBar>
            <HeaderGlobalAction
              aria-label={copy.shell.openCopilot}
              onClick={() => setCopilot(!copilot)}
            >
              <Chat />
            </HeaderGlobalAction>
            <HeaderGlobalAction aria-label={userName || copy.shell.visitor}>
              <UserAvatar />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
        </Header>
        <SideNav
          aria-label={copy.shell.mainNavigation}
          expanded={desktopNav || mobileNav}
          isPersistent={desktopNav}
          isFixedNav
          onOverlayClick={() => setMobileNav(false)}
          className="v5-sidenav"
        >
          <SideNavItems>
            <p className="v5-nav-label">{copy.shell.workspace}</p>
            {navItems.map((item) => (
              <SideNavLink
                key={item.id}
                href="#"
                renderIcon={item.icon}
                isActive={active === item.id}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(item.id);
                  setMobileNav(false);
                }}
              >
                {dictionary.navigation[item.key]}
              </SideNavLink>
            ))}
          </SideNavItems>
          <div className="v5-side-foot">
            <strong>{copy.shell.version}</strong>
            <span>
              <i
                className={
                  isWatsonxProvider(aiStatus?.provider)
                    ? "watsonx"
                    : isDeterministicProvider(aiStatus?.provider)
                      ? "fallback"
                      : "configured"
                }
              />
              {isWatsonxProvider(aiStatus?.provider)
                ? copy.shell.watsonxActive
                : visibleProviderLabel(aiStatus?.provider, copy)}
            </span>
            <small>
              {privateMode
                ? copy.shell.privateWorkspace
                : copy.shell.publicDemo}
            </small>
          </div>
        </SideNav>
      </Theme>

      <main className="v5-main" id="main-content">
        {notice && (
          <div className="v5-toast" role="status">
            {notice}
          </div>
        )}
        <div className="v5-topbar">
          <div>
            <span>
              {privateMode
                ? text(copy.shell.hello, { name: userName.split(" ")[0] })
                : copy.shell.publicDemo}
            </span>
            <strong>
              {active === "home"
                ? copy.shell.operationalBriefing
                : dictionary.navigation[
                    navItems.find((item) => item.id === active)?.key || "home"
                  ]}
            </strong>
          </div>
          <div>
            {selected && active !== "home" && (
              <label className="v5-account-switch">
                <span>{copy.shell.activeAccount}</span>
                <select
                  value={selected.id}
                  onChange={(event) =>
                    openAccount(event.target.value, accountMode)
                  }
                >
                  {data.discoveries.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.customerName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              kind="secondary"
              renderIcon={Add}
              onClick={() =>
                privateMode
                  ? selected
                    ? setModal("information")
                    : setModal("new-account")
                  : window.location.assign(
                      "/signin-with-chatgpt?return_to=%2Fworkspace",
                    )
              }
            >
              {copy.shell.addInformation}
            </Button>
          </div>
        </div>

        {active === "home" && (
          <HomeView
            data={data}
            briefing={briefing}
            briefMeta={briefMeta}
            privateMode={privateMode}
            actions={portfolioActions}
            accountHealthRows={accountHealthRows}
            onOpen={openAccount}
            onOpenGuided={(accountId) => {
              openAccount(accountId, "strategy");
              setGuidedOpen(true);
            }}
            onDecision={actionStatus}
            onRefresh={async () => {
              if (!privateMode) return;
              setSaving(true);
              const response = await apiFetch("/api/briefing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: true, responseLocale: locale }),
              });
              const payload = (await response.json()) as BriefingResponse;
              if (response.ok && payload.briefing) {
                setBriefing(payload.briefing);
                setBriefMeta({
                  provider: payload.provider || "fallback",
                  model: payload.model,
                  cached: false,
                });
                notify(copy.home.refreshed);
              } else notify(copy.notifications.genericError);
              setSaving(false);
            }}
            saving={saving}
          />
        )}

        {active === "accounts" && selected && (
          <section className="v5-page">
            <header className="v5-account-hero">
              <div>
                <span>
                  {selected.industry} · {selected.companySize}
                </span>
                <h1>{selected.customerName}</h1>
                <p>{memory?.executiveSummary || selected.challengeSummary}</p>
                <div className="v5-hero-tags">
                  <Tag
                    type={
                      selected.dataClassification === "confidential"
                        ? "red"
                        : "cyan"
                    }
                  >
                    {selected.dataClassification === "confidential"
                      ? copy.account.confidentialBlocked
                      : copy.account.testEnvironment}
                  </Tag>
                  <Tag type="gray">
                    {visibleProviderLabel(memory?.aiStatus, copy)}
                  </Tag>
                  <Tag
                    type={
                      selected.priority === "Alta"
                        ? "red"
                        : selected.priority === "Média"
                          ? "purple"
                          : "green"
                    }
                  >
                    {localizeSystemValue(locale, selected.priority)}{" "}
                    {copy.priority.suffix}
                  </Tag>
                </div>
              </div>
              <div className="v5-maturity">
                <strong>{selected.progress}%</strong>
                <span>{copy.account.maturity}</span>
                <ProgressBar
                  label={copy.account.maturity}
                  hideLabel
                  value={selected.progress}
                />
              </div>
            </header>
            <nav
              className="v5-account-tabs"
              aria-label={copy.modes.accountWorkspace}
            >
              {accountModeItems.map((item) => (
                <button
                  key={item.id}
                  className={accountMode === item.id ? "active" : ""}
                  onClick={() => setAccountMode(item.id)}
                >
                  {copy.modes[item.key]}
                </button>
              ))}
            </nav>
            {accountMode === "overview" && (
              <AccountOverview
                account={selected}
                memory={memory}
                actions={actions}
                hypotheses={hypotheses}
                stakeholders={stakeholders}
                events={accountEvents}
                guidedDiscovery={guidedDiscovery}
                privateMode={privateMode}
                onMode={setAccountMode}
                onGuided={() => setGuidedOpen(true)}
                onDecision={actionStatus}
                onEditAction={(action) => {
                  setEditingAction(action);
                  setModal("action");
                }}
              />
            )}
            {accountMode === "activity" && (
              <AccountActivity
                account={selected}
                memory={memory}
                events={accountEvents}
                meetings={meetings}
                documents={documents}
                privateMode={privateMode}
                saving={saving}
                onMeeting={saveMeeting}
                conversationReview={conversationReview}
                conversationImpact={conversationImpact}
                logicalPipeline={logicalPipeline}
                impactMetric={commercialProof?.impact || null}
                onReview={(status) => {
                  if (conversationReview)
                    return reviewChangeSet(conversationReview, status);
                }}
                onEvidence={(sourceId) => openEvidence(selected.id, sourceId)}
                onUpload={(file) =>
                  uploadDocument(
                    file,
                    selected.id,
                    mode,
                    locale,
                    copy.notifications,
                    notify,
                    load,
                    setSaving,
                  )
                }
              />
            )}
            {accountMode === "relationships" && (
              <div className="v5-relationship-layout">
                <section className="v5-section-head">
                  <div>
                    <span>{copy.account.relationshipEyebrow}</span>
                    <h2>{copy.account.relationshipTitle}</h2>
                    <p>{copy.account.relationshipDescription}</p>
                  </div>
                  <Button
                    size="sm"
                    renderIcon={Add}
                    disabled={!privateMode}
                    onClick={() => {
                      setEditingStakeholder(null);
                      setModal("stakeholder");
                    }}
                  >
                    {copy.account.addPerson}
                  </Button>
                </section>
                <RelationshipGraph
                  stakeholders={stakeholders.map((person) => ({
                    ...person,
                    isSponsor: person.id === sponsor?.id,
                    evidence: accountEvents
                      .filter((event) => event.sourceId === person.id)
                      .map((event) => ({
                        id: event.id,
                        title: event.title,
                        excerpt: event.content,
                        sourceType: event.sourceType,
                        confidence: event.confidence,
                        updatedAt: event.occurredAt,
                      })),
                    recommendedApproach: text(
                      copy.account.recommendedApproach,
                      { theme: person.priorities[0] || person.area },
                    ),
                  }))}
                  relationships={hierarchyRelationships}
                  savedPositions={savedPositions}
                  sponsorId={sponsor?.id}
                  readOnly={!privateMode}
                  missingRelationshipNodeIds={stakeholders
                    .filter(
                      (person) =>
                        !hierarchyRelationships.some(
                          (relation) =>
                            relation.source === person.id ||
                            relation.target === person.id,
                        ),
                    )
                    .map((person) => person.id)}
                  onLayoutChange={(graphMode, positions) => {
                    if (!privateMode) return;
                    const nodes = Object.entries(positions).map(
                      ([nodeId, position]) => ({ id: nodeId, ...position }),
                    );
                    void apiFetch(`/api/accounts/${selected.id}/graph-layout`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        mode: graphMode,
                        nodes,
                        responseLocale: locale,
                      }),
                    });
                  }}
                  onCreateRelationship={async (relationship) => {
                    await mutate(
                      {
                        action: "relationship",
                        id: selected.id,
                        source: relationship.source,
                        target: relationship.target,
                        type: relationship.type,
                        label: relationship.label,
                      },
                      copy.notifications.relationshipSaved,
                    );
                  }}
                  onRequestEdit={(person) => {
                    setEditingStakeholder(
                      stakeholders.find((item) => item.id === person.id) ||
                        null,
                    );
                    setModal("stakeholder");
                  }}
                  onRequestAddStakeholder={() => {
                    setEditingStakeholder(null);
                    setModal("stakeholder");
                  }}
                />
                <CustomerContextMap
                  locale={locale}
                  accountMap={
                    selected.accountMap
                      ? {
                          ...selected.accountMap,
                          nodes: selected.accountMap.nodes.map((node) => {
                            const evidence = accountEvents
                              .filter((event) => {
                                const label = node.label.toLowerCase();
                                return (
                                  event.title.toLowerCase().includes(label) ||
                                  event.content.toLowerCase().includes(label) ||
                                  label.includes(event.title.toLowerCase())
                                );
                              })
                              .map((event) => ({
                                id: event.id,
                                sourceId: event.sourceId || event.id,
                                sourceType: event.sourceType,
                                title: event.title,
                                excerpt: event.content,
                                confidence: event.confidence,
                                occurredAt: event.occurredAt,
                              }));
                            return {
                              ...node,
                              evidence,
                              sourceCount: evidence.length,
                            };
                          }),
                        }
                      : null
                  }
                  stakeholders={stakeholders.map((person) => ({
                    ...person,
                    isSponsor: person.id === sponsor?.id,
                    evidence: accountEvents
                      .filter(
                        (event) =>
                          event.sourceId === person.id ||
                          event.content.includes(person.name),
                      )
                      .map((event) => ({
                        id: event.id,
                        sourceId: event.sourceId || event.id,
                        sourceType: event.sourceType,
                        title: event.title,
                        excerpt: event.content,
                        confidence: event.confidence,
                        occurredAt: event.occurredAt,
                      })),
                  }))}
                  onEvidenceActivate={(evidence) =>
                    openEvidence(
                      selected.id,
                      evidence.sourceId || evidence.id || evidence.title,
                    )
                  }
                />
              </div>
            )}
            {accountMode === "strategy" && (
              <>
                <GuidedDiscoverySummary
                  discovery={guidedDiscovery}
                  onOpen={() => setGuidedOpen(true)}
                />
                <AccountStrategy
                  key={selected.id}
                  account={selected}
                  capabilityRows={capabilityHealthRows}
                  hypotheses={hypotheses}
                  actions={actions}
                  plan={plan}
                  signals={signals}
                  privateMode={privateMode}
                  saving={saving}
                  onDecision={actionStatus}
                  onSavePlan={(payload) =>
                    mutate(
                      { action: "plan_save", id: selected.id, ...payload },
                      copy.notifications.planSaved,
                    )
                  }
                  onSuggest={() =>
                    mutate(
                      { action: "plan_suggest", id: selected.id },
                      copy.notifications.suggestionCreated,
                    )
                  }
                  onApply={() =>
                    mutate(
                      { action: "plan_apply", id: selected.id },
                      copy.notifications.suggestionApplied,
                    )
                  }
                  onResearch={() => setModal("research")}
                  onEvidence={(source) => openEvidence(selected.id, source)}
                  onHandoff={(hypothesisId) => previewCrmHandoff(hypothesisId)}
                />
              </>
            )}
          </section>
        )}

        {active === "radar" && (
          <section className="v5-page">
            <PageHeading
              eyebrow={copy.radar.eyebrow}
              title={copy.radar.title}
              description={copy.radar.description}
            />
            <div className="v5-filterbar">
              <span>{copy.radar.filterRisk}</span>
              {(["all", "Alta", "Média", "Baixa"] as const).map((filter) => (
                <button
                  key={filter}
                  className={radarFilter === filter ? "active" : ""}
                  onClick={() => setRadarFilter(filter)}
                >
                  {filter === "all"
                    ? copy.radar.all
                    : localizeSystemValue(locale, filter)}
                </button>
              ))}
            </div>
            <PortfolioFitHeatmap
              rows={portfolioFitRows.filter((row) =>
                filteredAccounts.some(
                  (account) => account.id === row.accountId,
                ),
              )}
              locale={locale}
              onAccountActivate={(row) => openAccount(row.accountId)}
              onCellActivate={(row) => openAccount(row.accountId, "strategy")}
              onEvidenceActivate={(source, row) =>
                openEvidence(row.accountId, source)
              }
            />
            <div className="v5-chart-grid">
              <section className="v5-card v5-span-2">
                <PortfolioBubbleChart accounts={filteredAccounts} />
              </section>
              <section className="v5-card">
                <CardHeader
                  eyebrow={copy.radar.priority}
                  title={copy.radar.exploreAccounts}
                />
                <div className="v5-account-rank">
                  {[...filteredAccounts]
                    .sort(
                      (a, b) =>
                        (b.scores[0]?.alignment || 0) -
                        (a.scores[0]?.alignment || 0),
                    )
                    .map((account) => (
                      <button
                        key={account.id}
                        onClick={() => openAccount(account.id)}
                      >
                        <span>
                          <strong>{account.customerName}</strong>
                          <small>
                            {account.scores[0]?.short ||
                              copy.radar.noLeadingTheme}
                          </small>
                        </span>
                        <em>{account.scores[0]?.alignment || 0}%</em>
                        <ArrowRight />
                      </button>
                    ))}
                </div>
              </section>
              <section className="v5-card">
                <StakeholderCoverageChart
                  accounts={filteredAccounts}
                  stakeholders={data.stakeholders}
                />
              </section>
              <section className="v5-card v5-span-2">
                <HypothesisConfidenceChart
                  accounts={filteredAccounts}
                  snapshots={data.snapshots}
                />
              </section>
            </div>
          </section>
        )}

        {active === "settings" && (
          <SettingsView
            key={selected?.id || "none"}
            data={data}
            selected={selected}
            aiStatus={aiStatus}
            privateMode={privateMode}
            onSettings={(payload) =>
              selected &&
              mutate(
                { action: "account_settings", id: selected.id, ...payload },
                copy.notifications.actionDecision,
              )
            }
          />
        )}
      </main>

      <CopilotPanel
        open={copilot}
        mode={copilotMode}
        setMode={setCopilotMode}
        selected={selected}
        action={actions[0]}
        question={question}
        setQuestion={setQuestion}
        result={chatResult}
        preparation={preparation}
        saving={saving}
        onClose={() => setCopilot(false)}
        onAsk={ask}
        onPrepare={prepareConversation}
        onNavigate={(sourceId) => {
          setCopilot(false);
          if (selected) openEvidence(selected.id, sourceId);
        }}
        onDecision={actionStatus}
      />

      {activeHandoff && (
        <CrmHandoffModal
          locale={locale}
          open={handoffOpen}
          data={crmHandoffDataFromRecord(activeHandoff, selected)}
          busy={saving}
          handedOff={activeHandoff.status === "handed_off"}
          onClose={() => setHandoffOpen(false)}
          onMarkHandedOff={privateMode ? markCrmHandoff : undefined}
        />
      )}

      {commandOpen && (
        <div
          className="v5-command-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setCommandOpen(false)
          }
        >
          <div
            className="v5-command"
            role="dialog"
            aria-modal="true"
            aria-label={copy.command.dialog}
          >
            <header>
              <Search />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder={copy.command.placeholder}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && commands[0]) {
                    commands[0].run();
                    setCommandOpen(false);
                    setCommandQuery("");
                  }
                }}
              />
              <kbd>esc</kbd>
            </header>
            <div>
              {commands.slice(0, 9).map((command) => (
                <button
                  key={`${command.hint}-${command.label}`}
                  onClick={() => {
                    command.run();
                    setCommandOpen(false);
                    setCommandQuery("");
                  }}
                >
                  <span>{command.label}</span>
                  <small>{command.hint}</small>
                </button>
              ))}
            </div>
            <footer>{copy.command.footer}</footer>
          </div>
        </div>
      )}

      <GuidedDiscoveryWorkspace
        open={guidedOpen}
        accountName={selected?.customerName || dictionary.common.account}
        discovery={guidedDiscovery as unknown as GuidedDiscoveryView | null}
        stakeholders={stakeholders.map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role,
        }))}
        saving={saving}
        onClose={() => setGuidedOpen(false)}
        onStart={async (guidedMode, pillars) => {
          await guidedMutation(
            "/sessions",
            "POST",
            { mode: guidedMode, selectedPillars: pillars },
            copy.notifications.discoveryStarted,
          );
        }}
        onAnswer={async (payload) =>
          guidedMutation(
            "/answers",
            "POST",
            payload,
            String(payload.status) === "draft"
              ? copy.notifications.draftSaved
              : String(payload.status) === "unknown"
                ? copy.notifications.gapSaved
                : copy.notifications.answerSaved,
          )
        }
        onPatch={async (payload) =>
          guidedMutation(
            "",
            "PATCH",
            payload,
            String(payload.operation) === "checkpoint"
              ? copy.notifications.checkpoint
              : copy.notifications.sessionUpdated,
          )
        }
      />

      <NewAccountModal
        open={modal === "new-account"}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={async (payload) => {
          const result = await mutate(
            { action: "create", ...payload },
            copy.notifications.accountCreated,
          );
          if (result) setModal(null);
        }}
      />
      <InformationModal
        open={modal === "information"}
        saving={saving}
        account={selected}
        preview={informationPreview}
        onClose={() => {
          setModal(null);
          setInformationDraft(null);
          setInformationPreview(null);
        }}
        onBack={() => setInformationPreview(null)}
        onPreview={async (payload) => {
          if (!selected) return;
          setSaving(true);
          const response = await apiFetch(
            `/api/accounts/${selected.id}/information/preview`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, responseLocale: locale }),
            },
          );
          const result = (await response.json()) as {
            preview?: Record<string, unknown>;
            error?: string;
          };
          if (response.ok && result.preview) {
            setInformationDraft(payload);
            setInformationPreview(result.preview);
          } else notify(result.error || copy.notifications.previewError);
          setSaving(false);
        }}
        onConfirm={async () => {
          if (!selected || !informationDraft) return;
          const result = await mutate(
            {
              action: "information",
              id: selected.id,
              ...informationDraft,
              confirmed: true,
            },
            copy.notifications.informationSaved,
          );
          if (result) {
            setModal(null);
            setInformationDraft(null);
            setInformationPreview(null);
          }
        }}
      />
      <StakeholderModal
        open={modal === "stakeholder"}
        account={selected}
        stakeholder={editingStakeholder}
        people={stakeholders}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={async (payload) => {
          if (!selected) return;
          const result = await mutate(
            {
              action: "stakeholder_upsert",
              id: selected.id,
              stakeholderId: editingStakeholder?.id,
              ...payload,
            },
            copy.notifications.stakeholderSaved,
          );
          if (result) setModal(null);
        }}
      />
      <ActionModal
        open={modal === "action"}
        action={editingAction}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={async (payload) => {
          if (!editingAction) return;
          await actionStatus(editingAction, String(payload.status), payload);
          setModal(null);
        }}
      />
      <ResearchModal
        open={modal === "research"}
        account={selected}
        saving={saving}
        onClose={() => setModal(null)}
        onResearch={async (payload) => {
          if (!selected) return;
          setSaving(true);
          const response = await apiFetch(
            `/api/accounts/${selected.id}/research`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, responseLocale: locale }),
            },
          );
          const result = (await response.json()) as { error?: string };
          if (response.ok) {
            await load();
            notify(copy.notifications.researchDone);
            setModal(null);
          } else notify(result.error || copy.notifications.researchUnavailable);
          setSaving(false);
        }}
      />
    </div>
  );
}

function HomeView({
  data,
  briefing,
  briefMeta,
  privateMode,
  actions,
  accountHealthRows,
  onOpen,
  onOpenGuided,
  onDecision,
  onRefresh,
  saving,
}: {
  data: ApiData;
  briefing: Briefing | null;
  briefMeta: {
    provider: string;
    model?: string | null;
    cached: boolean;
  } | null;
  privateMode: boolean;
  actions: Action[];
  accountHealthRows: AccountHealthRow[];
  onOpen: (
    id: string,
    mode?: "overview" | "activity" | "relationships" | "strategy",
  ) => void;
  onOpenGuided: (id: string) => void;
  onDecision: (
    action: Action,
    status: string,
    extras?: Record<string, unknown>,
  ) => void;
  onRefresh: () => void;
  saving: boolean;
}) {
  const { locale, copy, formatDate } = usePageCopy();
  const changes =
    briefing?.changes ||
    data.accountEvents
      .slice(0, 6)
      .map(
        (event) =>
          `${data.discoveries.find((account) => account.id === event.discoveryId)?.customerName}: ${event.title}`,
      );
  const meetings = data.meetings.filter(
    (meeting) => meeting.meetingStatus === "scheduled",
  );
  const stale = data.accountEvents.filter(
    (event) =>
      event.evidenceStatus === "stale" ||
      pageLoadedAt - new Date(event.occurredAt).getTime() > 90 * 86400000,
  );
  return (
    <section className="v5-page">
      <PageHeading
        eyebrow={copy.home.eyebrow}
        title={briefing?.headline || copy.home.title}
        description={briefing?.summary || copy.home.description}
        action={
          <div className="v5-heading-actions">
            <Tag
              type={
                isWatsonxProvider(briefMeta?.provider)
                  ? "blue"
                  : isDeterministicProvider(briefMeta?.provider)
                    ? "gray"
                    : "purple"
              }
            >
              {visibleProviderLabel(briefMeta?.provider, copy)}
              {briefMeta?.cached ? ` · ${copy.settings.cache}` : ""}
            </Tag>
            {privateMode && (
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Renew}
                disabled={saving}
                onClick={onRefresh}
              >
                {copy.home.refresh}
              </Button>
            )}
          </div>
        }
      />
      <AccountHealthHeatmap
        rows={accountHealthRows}
        locale={locale}
        onAccountActivate={(row) => onOpen(row.accountId)}
        onCellActivate={(row, cell) =>
          cell.destination === "guided-discovery"
            ? onOpenGuided(row.accountId)
            : onOpen(row.accountId, cell.destination)
        }
      />
      <div className="v5-attention-grid">
        {actions.slice(0, 3).map((action, index) => (
          <article
            key={action.id}
            className={`v5-attention-card rank-${index + 1}`}
          >
            <header>
              <span>0{index + 1}</span>
              <Tag type={statusTone(action.status)}>
                {action.priorityScore} {copy.home.priority}
              </Tag>
            </header>
            <small>
              {
                data.discoveries.find(
                  (account) => account.id === action.discoveryId,
                )?.customerName
              }{" "}
              · {copy.home.nextBestAction}
            </small>
            <h2>{action.title}</h2>
            <p>{action.whyNow || action.rationale}</p>
            <dl>
              <div>
                <dt>{copy.home.impact}</dt>
                <dd>{action.impact}</dd>
              </div>
              <div>
                <dt>{copy.home.confidence}</dt>
                <dd>{action.confidence}%</dd>
              </div>
              <div>
                <dt>{copy.home.effort}</dt>
                <dd>{action.effort}/100</dd>
              </div>
            </dl>
            <footer>
              <button onClick={() => onOpen(action.discoveryId)}>
                {copy.home.viewEvidence} <ArrowRight />
              </button>
              {privateMode && action.status === "proposal" && (
                <Button
                  size="sm"
                  onClick={() => onDecision(action, "accepted")}
                >
                  {copy.home.accept}
                </Button>
              )}
            </footer>
          </article>
        ))}
        {!actions.length && (
          <article className="v5-attention-card empty">
            <Checkmark size={32} />
            <h2>{copy.home.noCritical}</h2>
            <p>{copy.home.noCriticalHelp}</p>
          </article>
        )}
      </div>
      <div className="v5-home-grid">
        <section className="v5-card v5-span-2">
          <CardHeader
            eyebrow={copy.home.changesEyebrow}
            title={copy.home.changesTitle}
            side={
              <span className="v5-live">
                <i /> {copy.home.progressive}
              </span>
            }
          />
          <div className="v5-change-feed">
            {changes.slice(0, 8).map((change, index) => (
              <article key={`${change}-${index}`}>
                <i />
                <span>
                  <strong>{change}</strong>
                  <small>
                    {index < 3
                      ? copy.home.recentEvidence
                      : copy.home.inBriefing}
                  </small>
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.home.conversationEyebrow}
            title={actions[0]?.conversation.stakeholder || copy.home.mapSponsor}
          />
          <div className="v5-conversation-card">
            <span>
              {actions[0]?.conversation.theme || copy.home.executiveCoverage}
            </span>
            <p>
              {actions[0]?.conversation.opener ||
                copy.home.executiveCoverageHelp}
            </p>
            {actions[0]?.conversation.questions
              ?.slice(0, 3)
              .map((item, index) => (
                <button key={`${index}-${item}`}>{item}</button>
              ))}
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.home.meetingsEyebrow}
            title={copy.home.meetingsTitle}
          />
          <div className="v5-mini-list">
            {meetings.slice(0, 5).map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => onOpen(meeting.discoveryId, "activity")}
              >
                <Calendar />
                <span>
                  <strong>{meeting.title}</strong>
                  <small>
                    {
                      data.discoveries.find(
                        (account) => account.id === meeting.discoveryId,
                      )?.customerName
                    }{" "}
                    · {formatDate(meeting.scheduledAt)}
                  </small>
                </span>
              </button>
            ))}
            {!meetings.length && <Empty text={copy.home.noMeetings} />}
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.home.memoryQuality}
            title={copy.home.staleEvidence}
          />
          <div className="v5-mini-list">
            {stale.slice(0, 5).map((event) => (
              <button
                key={event.id}
                onClick={() => onOpen(event.discoveryId, "activity")}
              >
                <Asleep />
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {
                      data.discoveries.find(
                        (account) => account.id === event.discoveryId,
                      )?.customerName
                    }{" "}
                    · {formatDate(event.occurredAt)}
                  </small>
                </span>
              </button>
            ))}
            {!stale.length && <Empty text={copy.home.noStale} />}
          </div>
        </section>
        <section className="v5-card v5-span-2">
          <CardHeader
            eyebrow={copy.home.portfolio}
            title={copy.home.maturityDecision}
          />
          <div className="v5-portfolio-table">
            {data.discoveries.map((account) => (
              <button key={account.id} onClick={() => onOpen(account.id)}>
                <span>
                  <strong>{account.customerName}</strong>
                  <small>{localizeSystemValue(locale, account.stage)}</small>
                </span>
                <i>
                  <b style={{ width: `${account.progress}%` }} />
                </i>
                <em>{account.progress}%</em>
                <Tag
                  type={
                    account.priority === "Alta"
                      ? "red"
                      : account.priority === "Média"
                        ? "purple"
                        : "green"
                  }
                >
                  {localizeSystemValue(locale, account.priority)}
                </Tag>
                <ArrowRight />
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function AccountOverview({
  account,
  memory,
  actions,
  hypotheses,
  stakeholders,
  events,
  guidedDiscovery,
  privateMode,
  onMode,
  onGuided,
  onDecision,
  onEditAction,
}: {
  account: Discovery;
  memory?: Memory;
  actions: Action[];
  hypotheses: Hypothesis[];
  stakeholders: Stakeholder[];
  events: AccountEvent[];
  guidedDiscovery: GuidedDiscovery | null;
  privateMode: boolean;
  onMode: (
    mode: "overview" | "activity" | "relationships" | "strategy",
  ) => void;
  onGuided: () => void;
  onDecision: (
    action: Action,
    status: string,
    extras?: Record<string, unknown>,
  ) => void;
  onEditAction: (action: Action) => void;
}) {
  const { locale, copy, text, statusLabels } = usePageCopy();
  const action = actions[0];
  const conversation = action?.conversation;
  return (
    <div className="v5-account-grid">
      <GuidedDiscoverySummary
        discovery={guidedDiscovery}
        onOpen={onGuided}
        compact
      />
      <section className="v5-card v5-span-2">
        <CardHeader
          eyebrow={copy.overview.executiveMemory}
          title={copy.overview.whatMatters}
          side={
            <Tag type="gray">
              {text(copy.overview.version, { version: memory?.version || 1 })}
            </Tag>
          }
        />
        <h2 className="v5-executive-summary">
          {memory?.executiveSummary || account.challengeSummary}
        </h2>
        <div className="v5-change-chips">
          {memory?.changes
            .slice(0, 4)
            .map((item, index) => <span key={`${index}-${item}`}>{item}</span>)}
        </div>
      </section>
      <section className="v5-card v5-nba">
        <CardHeader
          eyebrow={copy.home.nextBestAction}
          title={action?.title || account.nextEngagement}
          side={action && <strong>{action.priorityScore}</strong>}
        />
        <p>{action?.rationale || copy.overview.deepenContext}</p>
        {action && (
          <>
            <dl>
              <div>
                <dt>{copy.overview.whyNow}</dt>
                <dd>{action.whyNow}</dd>
              </div>
              <div>
                <dt>{copy.overview.expectedOutcome}</dt>
                <dd>{action.expectedOutcome}</dd>
              </div>
              <div>
                <dt>{copy.overview.stakeholder}</dt>
                <dd>{conversation?.stakeholder || copy.overview.identify}</dd>
              </div>
            </dl>
            <div className="v5-action-buttons">
              {privateMode && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onDecision(action, "accepted")}
                  >
                    {copy.home.accept}
                  </Button>
                  <Button
                    size="sm"
                    kind="tertiary"
                    onClick={() => onEditAction(action)}
                  >
                    {copy.overview.editSnooze}
                  </Button>
                </>
              )}
              <button onClick={() => onMode("strategy")}>
                {copy.overview.viewStrategy} <ArrowRight />
              </button>
            </div>
          </>
        )}
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.overview.trustedMemory}
          title={copy.overview.knownAssumedMissing}
        />
        <div className="v5-memory-summary">
          <MemoryMini
            title={copy.overview.known}
            count={memory?.known.length || 0}
            tone="known"
            items={memory?.known || []}
          />
          <MemoryMini
            title={copy.overview.assumed}
            count={memory?.assumptions.length || 0}
            tone="assumption"
            items={memory?.assumptions || []}
          />
          <MemoryMini
            title={copy.overview.missing}
            count={memory?.gaps.length || 0}
            tone="gap"
            items={memory?.gaps || []}
          />
          <MemoryMini
            title={copy.overview.stale}
            count={
              events.filter((item) => item.evidenceStatus === "stale").length
            }
            tone="stale"
            items={events
              .filter((item) => item.evidenceStatus === "stale")
              .map((item) => item.title)}
          />
        </div>
        <button className="v5-text-action" onClick={() => onMode("activity")}>
          {copy.overview.exploreSources} <ArrowRight />
        </button>
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.overview.nextConversation}
          title={conversation?.stakeholder || copy.overview.stakeholderUnknown}
        />
        <div className="v5-conversation-detail">
          <Tag type="cyan">
            {conversation?.theme ||
              hypotheses[0]?.capabilityKey ||
              copy.overview.discovery}
          </Tag>
          <p>{conversation?.opener || copy.overview.validateProblem}</p>
          <ol>
            {conversation?.questions?.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ol>
          <div>
            <strong>{copy.overview.possibleObjection}</strong>
            <span>
              {conversation?.objection || copy.overview.objectionUnknown}
            </span>
          </div>
          <div>
            <strong>{copy.overview.successCriterion}</strong>
            <span>
              {conversation?.successCriterion || copy.overview.successUnknown}
            </span>
          </div>
        </div>
      </section>
      <section className="v5-card v5-span-2">
        <CardHeader
          eyebrow={copy.overview.hypotheses}
          title={copy.overview.gainingStrength}
          side={
            <button
              className="v5-text-action"
              onClick={() => onMode("strategy")}
            >
              {copy.overview.openStrategy}
            </button>
          }
        />
        <div className="v5-hypothesis-grid">
          {hypotheses.slice(0, 3).map((hypothesis) => (
            <article key={hypothesis.id}>
              <header>
                <Tag type={statusTone(hypothesis.stage)}>
                  {statusLabels[hypothesis.stage] ||
                    localizeSystemValue(locale, hypothesis.stage)}
                </Tag>
                <strong>{hypothesis.confidence}%</strong>
              </header>
              <h3>{hypothesis.title}</h3>
              <p>{hypothesis.problem}</p>
              <small>{hypothesis.gaps[0] || hypothesis.nextStep}</small>
            </article>
          ))}
          {!hypotheses.length && <Empty text={copy.overview.noHypotheses} />}
        </div>
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.overview.politicalMap}
          title={copy.overview.keyStakeholders}
          side={
            <button
              className="v5-text-action"
              onClick={() => onMode("relationships")}
            >
              {copy.overview.explore}
            </button>
          }
        />
        <div className="v5-people-list">
          {stakeholders.slice(0, 5).map((person) => (
            <button key={person.id} onClick={() => onMode("relationships")}>
              <span>
                {person.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)}
              </span>
              <div>
                <strong>{person.name}</strong>
                <small>
                  {person.role} ·{" "}
                  {localizeSystemValue(locale, person.influence)}
                </small>
              </div>
              <Tag
                type={
                  person.stance === "Aliado"
                    ? "green"
                    : person.stance === "Resistente"
                      ? "red"
                      : "gray"
                }
              >
                {localizeSystemValue(locale, person.stance)}
              </Tag>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AccountActivity({
  account,
  memory,
  events,
  meetings,
  documents,
  privateMode,
  saving,
  onMeeting,
  onUpload,
  conversationReview,
  conversationImpact,
  logicalPipeline,
  impactMetric,
  onReview,
  onEvidence,
}: {
  account: Discovery;
  memory?: Memory;
  events: AccountEvent[];
  meetings: Meeting[];
  documents: AccountDocument[];
  privateMode: boolean;
  saving: boolean;
  onMeeting: (payload: Record<string, unknown>) => void | Promise<void>;
  onUpload: (file: File) => void;
  conversationReview: CommercialChangeSet | null;
  conversationImpact: ReturnType<typeof conversationImpactFromChangeSet>;
  logicalPipeline: LogicalAgentRun[];
  impactMetric: AccountImpactMetric | null;
  onReview: (status: "approved" | "rejected") => void | Promise<void>;
  onEvidence: (sourceId: string) => void;
}) {
  const { locale, copy, text, formatDate } = usePageCopy();
  return (
    <div className="v5-activity-grid">
      <section className="v5-card v5-span-2">
        <CardHeader
          eyebrow={copy.activity.accountMemory}
          title={copy.activity.memoryTitle}
          side={
            <Tag type="gray">
              {visibleProviderLabel(memory?.aiStatus, copy)}
            </Tag>
          }
        />
        <div className="v5-memory-board">
          <MemoryColumn
            title={copy.overview.known}
            tone="known"
            items={memory?.known || []}
          />
          <MemoryColumn
            title={copy.overview.assumed}
            tone="assumption"
            items={memory?.assumptions || []}
          />
          <MemoryColumn
            title={copy.overview.missing}
            tone="gap"
            items={memory?.gaps || []}
          />
          <MemoryColumn
            title={copy.overview.stale}
            tone="stale"
            items={events
              .filter((item) => item.evidenceStatus === "stale")
              .map((item) => item.title)}
          />
        </div>
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.activity.meetings}
          title={text(copy.activity.recordAt, {
            account: account.customerName,
          })}
        />
        <div className="v5-meeting-list">
          {meetings.slice(0, 3).map((meeting) => (
            <article id={`meeting-${meeting.id}`} key={meeting.id}>
              <Calendar />
              <span>
                <strong>{meeting.title}</strong>
                <small>
                  {meeting.meetingStatus
                    ? localizeSystemValue(locale, meeting.meetingStatus)
                    : copy.activity.concluded}{" "}
                  · {formatDate(meeting.scheduledAt || meeting.createdAt)}
                </small>
                {(meeting.summary || meeting.notes) && (
                  <TranslatableText
                    key={`${meeting.id}-${locale}`}
                    accountId={account.id}
                    sourceType="meeting"
                    sourceId={meeting.id}
                    text={meeting.summary || meeting.notes}
                    privateMode={privateMode}
                  />
                )}
              </span>
            </article>
          ))}
        </div>
        <MeetingForm
          onSave={onMeeting}
          saving={saving}
          readonly={!privateMode}
        />
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.activity.documents}
          title={copy.activity.retrievableSources}
          side={
            privateMode ? (
              <label className="v5-upload">
                {copy.activity.add}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(event) =>
                    event.target.files?.[0] && onUpload(event.target.files[0])
                  }
                />
              </label>
            ) : undefined
          }
        />
        <div className="v5-document-list">
          {documents.map((document) => (
            <article id={`document-${document.id}`} key={document.id}>
              <Document />
              <span>
                <strong>{document.name}</strong>
                <small>
                  {localizeSystemValue(locale, document.status)} ·{" "}
                  {(document.sizeBytes / 1024).toFixed(0)} KB
                </small>
                <p>{document.summary}</p>
              </span>
            </article>
          ))}
          {!documents.length && (
            <Empty
              text={
                privateMode
                  ? copy.activity.documentTypes
                  : copy.activity.privateDocuments
              }
            />
          )}
        </div>
      </section>
      {conversationReview && (
        <ConversationImpactPanel
          key={`${conversationReview.id}-${conversationReview.status}`}
          className="v5-span-2"
          locale={locale}
          reviewId={conversationReview.id}
          accountName={account.customerName}
          sourceLabel={
            meetings.find(
              (meeting) => meeting.id === conversationReview.sourceId,
            )?.title || conversationReview.sourceType
          }
          analyzedAt={conversationReview.createdAt}
          scoreDeltas={conversationImpact.scoreDeltas}
          addedFindings={conversationImpact.addedFindings}
          changes={conversationImpact.changes}
          readOnly={
            !privateMode || conversationReview.status !== "pending_review"
          }
          busy={saving}
          onApprove={() => onReview("approved")}
          onReject={() => onReview("rejected")}
        />
      )}
      <AnalysisPipelinePanel
        className="v5-span-2"
        locale={locale}
        runs={logicalPipeline}
        generatedAt={
          logicalPipeline[0] ? conversationReview?.createdAt : undefined
        }
        fallbackReason={
          locale === "pt-BR"
            ? "Nenhuma credencial de modelo está configurada; os módulos executaram regras transparentes."
            : "No model credential is configured; the modules ran transparent rules."
        }
        onSourceSelect={(source) => onEvidence(source.id)}
      />
      {impactMetric && (
        <ImpactMetricsPanel
          className="v5-span-2"
          locale={locale}
          metrics={impactDataForPanel(impactMetric)}
        />
      )}
      <section className="v5-card v5-span-2" id="account-evidence-timeline">
        <CardHeader
          eyebrow={copy.activity.timeline}
          title={copy.activity.timelineTitle}
        />
        <div className="v5-timeline">
          {events.map((event) => (
            <article id={`source-${event.sourceId || event.id}`} key={event.id}>
              <i className={event.evidenceStatus} />
              <div>
                <span>
                  {localizeSystemValue(locale, event.sourceType)} ·{" "}
                  {event.confidence}% {copy.copilot.trust}
                </span>
                <h3>{event.title}</h3>
                <TranslatableText
                  key={`${event.id}-${locale}`}
                  accountId={account.id}
                  sourceType="account_event"
                  sourceId={event.id}
                  text={event.content}
                  privateMode={privateMode}
                />
                <small>{formatDate(event.occurredAt)}</small>
              </div>
              <Tag
                type={
                  event.evidenceStatus === "confirmed"
                    ? "green"
                    : event.evidenceStatus === "assumption"
                      ? "purple"
                      : event.evidenceStatus === "stale"
                        ? "warm-gray"
                        : "red"
                }
              >
                {localizeSystemValue(locale, event.evidenceStatus)}
              </Tag>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function detectedContentLocale(value: string): Locale | null {
  if (
    /[ãõçáéíóúâêôà]/i.test(value) ||
    /\b(não|reunião|conta|dados|evidência|risco|prazo|próximo)\b/i.test(value)
  )
    return "pt-BR";
  if (
    /\b(the|and|account|meeting|evidence|risk|next|customer|cloud)\b/i.test(
      value,
    )
  )
    return "en-US";
  return null;
}

function localizeCitationSystemText(value: string, locale: Locale) {
  if (locale === "pt-BR") return value;
  return value
    .replace(/^Documento\b/, "Document")
    .replace(/ · pág\. /g, " · p. ")
    .replace(/(^| )Prioridades:/g, "$1Priorities:")
    .replace(/(^| )Área:/g, "$1Area:")
    .replace(/(^| )Influência:/g, "$1Influence:")
    .replace(/(^| )Postura:/g, "$1Stance:")
    .replace(/(^| )Próximo passo:/g, "$1Next step:")
    .replace(/(^| )Lacunas:/g, "$1Gaps:");
}

function TranslatableText({
  accountId,
  sourceType,
  sourceId,
  text: originalText,
  privateMode,
}: {
  accountId: string;
  sourceType: "account_event" | "meeting";
  sourceId: string;
  text: string;
  privateMode: boolean;
}) {
  const { locale, copy, text } = usePageCopy();
  const sourceLocale = detectedContentLocale(originalText);
  const [translatedText, setTranslatedText] = useState("");
  const [provider, setProvider] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [translationError, setTranslationError] = useState("");

  const translate = async () => {
    if (translatedText) {
      setExpanded((current) => !current);
      return;
    }
    setLoadingTranslation(true);
    setTranslationError("");
    const response = await fetch(`/api/accounts/${accountId}/translations`, {
      method: "POST",
      headers: localeRequestHeaders(locale, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        sourceRef: { type: sourceType, id: sourceId },
        targetLocale: locale,
        responseLocale: locale,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      translatedText?: string;
      provider?: string;
      error?: string;
    };
    if (response.ok && payload.translatedText) {
      setTranslatedText(payload.translatedText);
      setProvider(visibleProviderLabel(payload.provider || "AI", copy));
      setExpanded(true);
    } else setTranslationError(payload.error || copy.translation.unavailable);
    setLoadingTranslation(false);
  };

  const originalLabel =
    sourceLocale === "pt-BR"
      ? copy.translation.originalPortuguese
      : sourceLocale === "en-US"
        ? copy.translation.originalEnglish
        : copy.translation.originalUnknown;
  const canTranslate = privateMode && sourceLocale !== locale;
  return (
    <div className="v5-translatable">
      <p>{originalText}</p>
      <div className="v5-translation-controls">
        <span>{originalLabel}</span>
        {canTranslate && (
          <button
            type="button"
            disabled={loadingTranslation}
            onClick={() => void translate()}
          >
            {loadingTranslation
              ? copy.translation.loading
              : expanded
                ? copy.translation.hide
                : copy.translation.view}
          </button>
        )}
      </div>
      {expanded && translatedText && (
        <blockquote>
          <small>{text(copy.translation.translatedBy, { provider })}</small>
          {translatedText}
        </blockquote>
      )}
      {translationError && (
        <small role="status" className="v5-translation-error">
          {translationError}
        </small>
      )}
    </div>
  );
}

function AccountStrategy({
  account,
  capabilityRows,
  hypotheses,
  actions,
  plan,
  signals,
  privateMode,
  saving,
  onDecision,
  onSavePlan,
  onSuggest,
  onApply,
  onResearch,
  onEvidence,
  onHandoff,
}: {
  account: Discovery;
  capabilityRows: CapabilityHealthRow[];
  hypotheses: Hypothesis[];
  actions: Action[];
  plan?: Plan;
  signals: ExternalSignal[];
  privateMode: boolean;
  saving: boolean;
  onDecision: (
    action: Action,
    status: string,
    extras?: Record<string, unknown>,
  ) => void;
  onSavePlan: (payload: Record<string, unknown>) => void;
  onSuggest: () => void;
  onApply: () => void;
  onResearch: () => void;
  onEvidence: (source: string) => void;
  onHandoff: (hypothesisId?: string) => void | Promise<void>;
}) {
  const { locale, copy, statusLabels, playbooks } = usePageCopy();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    plan
      ? Object.fromEntries(
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
            ((plan as unknown as Record<string, string[]>)[key] || []).join(
              "\n",
            ),
          ]),
        )
      : {},
  );
  const changeSignalStatus = (
    signalId: string,
    status: "approved" | "discarded",
  ) =>
    void fetch("/api/accounts", {
      method: "POST",
      headers: localeRequestHeaders(locale, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        action: "external_signal_status",
        id: account.id,
        signalId,
        status,
        scope: "private",
        responseLocale: locale,
      }),
    }).then(() => window.location.reload());
  const planFields = [
    ["priorities", copy.strategy.priorities],
    ["initiatives", copy.strategy.initiatives],
    ["objectives", copy.strategy.objectives],
    ["risks", copy.strategy.risks],
    ["ecosystem", copy.strategy.ecosystem],
    ["relationship", copy.strategy.relationshipPlan],
  ];
  const horizons = [
    ["plan30", copy.strategy.days30],
    ["plan60", copy.strategy.days60],
    ["plan90", copy.strategy.days90],
  ];
  return (
    <div className="v5-strategy-layout">
      <div className="v5-span-3">
        <CapabilityHealthHeatmap
          rows={capabilityRows}
          locale={locale}
          onCellActivate={() =>
            document
              .querySelector(".v5-playbooks")
              ?.scrollIntoView({ behavior: "smooth", block: "center" })
          }
          onEvidenceActivate={(source) => onEvidence(source)}
        />
      </div>
      <section className="v5-card v5-span-2">
        <CardHeader
          eyebrow={copy.strategy.ibmThemes}
          title={copy.strategy.capabilityTitle}
          side={<Tag type="cyan">{copy.strategy.carbonPattern}</Tag>}
        />
        <div className="v5-playbooks">
          {account.scores.slice(0, 3).map((score) => {
            const book = playbooks.find((item) => item.key === score.short);
            return (
              <article key={score.short}>
                <header>
                  <Tag
                    type={
                      score.alignment >= 70
                        ? "red"
                        : score.alignment >= 40
                          ? "purple"
                          : "gray"
                    }
                  >
                    {score.alignment}% {copy.strategy.alignment}
                  </Tag>
                  <strong>{score.short}</strong>
                </header>
                <p>{book?.product || score.name}</p>
                <small>{copy.strategy.recommendedQuestion}</small>
                <blockquote>{book?.question || score.action}</blockquote>
                <footer>
                  {book?.workshop || copy.playbooks.defaultWorkshop}
                </footer>
              </article>
            );
          })}
        </div>
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.strategy.hypotheses}
          title={copy.strategy.preCrmMaturity}
        />
        <div className="v5-hypothesis-stack">
          {hypotheses.map((hypothesis) => (
            <article key={hypothesis.id}>
              <header>
                <Tag type={statusTone(hypothesis.stage)}>
                  {statusLabels[hypothesis.stage] ||
                    localizeSystemValue(locale, hypothesis.stage)}
                </Tag>
                <strong>{hypothesis.confidence}%</strong>
              </header>
              <h3>{hypothesis.capabilityKey}</h3>
              <p>{hypothesis.problem}</p>
              <div>
                <small>{copy.strategy.pendingCriteria}</small>
                {hypothesis.gaps.map((gap, index) => (
                  <span key={`${index}-${gap}`}>○ {gap}</span>
                ))}
              </div>
              <footer>{hypothesis.nextStep}</footer>
            </article>
          ))}
        </div>
      </section>
      <section className="v5-card">
        <CardHeader
          eyebrow={copy.strategy.publicResearch}
          title={copy.strategy.proposedSignals}
          side={
            privateMode && account.dataClassification === "test" ? (
              <Button
                size="sm"
                kind="tertiary"
                renderIcon={Search}
                onClick={onResearch}
              >
                {copy.strategy.research}
              </Button>
            ) : undefined
          }
        />
        {account.dataClassification === "confidential" && (
          <InlineNotification
            kind="warning"
            lowContrast
            title={copy.strategy.geminiBlocked}
            subtitle={copy.strategy.confidentialFallback}
            hideCloseButton
          />
        )}
        {signals.map((signal) => (
          <article className="v5-signal" key={signal.id}>
            <Tag
              type={
                signal.status === "approved"
                  ? "green"
                  : signal.status === "discarded"
                    ? "gray"
                    : "purple"
              }
            >
              {localizeSystemValue(locale, signal.status)}
            </Tag>
            <h3>{signal.title}</h3>
            <p>{signal.summary}</p>
            <a href={signal.sourceUrl} target="_blank" rel="noreferrer">
              {signal.publisher || copy.strategy.openSource} <Launch />
            </a>
            {privateMode && signal.status === "proposed" && (
              <div>
                <button
                  onClick={() => changeSignalStatus(signal.id, "approved")}
                >
                  {copy.strategy.approve}
                </button>
                <button
                  onClick={() => changeSignalStatus(signal.id, "discarded")}
                >
                  {copy.strategy.discard}
                </button>
              </div>
            )}
          </article>
        ))}
        {!signals.length && <Empty text={copy.strategy.noSignals} />}
      </section>
      <section className="v5-card v5-span-3">
        <CardHeader
          eyebrow={copy.strategy.accountPlan}
          title={copy.strategy.humanPlan}
          side={
            <div className="v5-inline-actions">
              <Button
                size="sm"
                kind="tertiary"
                disabled={!privateMode || saving}
                onClick={onSuggest}
              >
                {copy.strategy.generateSuggestion}
              </Button>
              <Button
                size="sm"
                disabled={!privateMode || saving}
                onClick={() => onSavePlan(draft)}
              >
                {copy.strategy.savePlan}
              </Button>
            </div>
          }
        />
        <div className="v5-plan-grid">
          {planFields.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <textarea
                value={draft[key] || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                rows={4}
                disabled={!privateMode}
              />
            </label>
          ))}
        </div>
        <div className="v5-horizons">
          {horizons.map(([key, label]) => (
            <label key={key}>
              <strong>{label}</strong>
              <textarea
                value={draft[key] || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                rows={6}
                disabled={!privateMode}
              />
            </label>
          ))}
        </div>
        {plan?.suggestion && Object.keys(plan.suggestion).length > 0 && (
          <div className="v5-plan-suggestion">
            <header>
              <span>
                <WatsonHealthTextAnnotationToggle /> {copy.strategy.aiProposal}
              </span>
              <Tag type="purple">{copy.strategy.compareBeforeApply}</Tag>
            </header>
            <div>
              {Object.entries(plan.suggestion)
                .slice(0, 5)
                .map(([key, items]) => (
                  <article key={key}>
                    <strong>{key}</strong>
                    {items.map((item, index) => (
                      <p key={`${index}-${item}`}>+ {item}</p>
                    ))}
                  </article>
                ))}
            </div>
            <Button size="sm" disabled={!privateMode} onClick={onApply}>
              {copy.strategy.approveApply}
            </Button>
          </div>
        )}
      </section>
      <section className="v5-card v5-span-3">
        <CardHeader
          eyebrow={copy.strategy.decisions}
          title={copy.strategy.actionsHandoff}
          side={
            <Button
              size="sm"
              kind="tertiary"
              disabled={saving}
              onClick={() =>
                onHandoff(
                  hypotheses.find(
                    (hypothesis) => hypothesis.stage === "qualified",
                  )?.id || hypotheses[0]?.id,
                )
              }
            >
              {copy.strategy.copyCrm}
            </Button>
          }
        />
        <div className="v5-action-table">
          {actions.map((action) => (
            <article key={action.id}>
              <span>
                <Tag type={statusTone(action.status)}>
                  {statusLabels[action.status] ||
                    localizeSystemValue(locale, action.status)}
                </Tag>
                <strong>{action.title}</strong>
                <small>{action.nextStep}</small>
              </span>
              <em>{action.priorityScore}</em>
              {privateMode && action.status === "proposal" && (
                <Button
                  size="sm"
                  onClick={() => onDecision(action, "accepted")}
                >
                  {copy.home.accept}
                </Button>
              )}
              {action.type === "crm_handoff" && (
                <Button
                  size="sm"
                  kind="tertiary"
                  disabled={saving}
                  onClick={() =>
                    onHandoff(
                      hypotheses.find(
                        (hypothesis) => hypothesis.stage === "qualified",
                      )?.id || hypotheses[0]?.id,
                    )
                  }
                >
                  {copy.strategy.copyCrm}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsView({
  data,
  selected,
  aiStatus,
  privateMode,
  onSettings,
}: {
  data: ApiData;
  selected?: Discovery;
  aiStatus: AIStatus | null;
  privateMode: boolean;
  onSettings: (payload: Record<string, unknown>) => void;
}) {
  const { locale, copy } = usePageCopy();
  const [classification, setClassification] = useState<
    Discovery["dataClassification"]
  >(selected?.dataClassification || "test");
  const [domain, setDomain] = useState(selected?.companyDomain || "");
  const controls = [
    copy.settings.controlAuthorization,
    copy.settings.controlDemo,
    copy.settings.controlSources,
    copy.settings.controlApproval,
    copy.settings.controlQuota,
    copy.settings.controlRollback,
  ];
  return (
    <section className="v5-page">
      <PageHeading
        eyebrow={copy.settings.eyebrow}
        title={copy.settings.title}
        description={copy.settings.description}
      />
      <InlineNotification
        kind="warning"
        lowContrast
        title={copy.settings.geminiEnvironment}
        subtitle={copy.settings.geminiWarning}
        hideCloseButton
      />
      <div className="v5-settings-grid">
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.settings.aiStatus}
            title={copy.settings.precedence}
          />
          <div className="v5-provider-stack">
            <ProviderRow
              name="IBM watsonx.ai"
              detail={aiStatus?.watsonx.model || copy.settings.primaryEngine}
              active={Boolean(aiStatus?.watsonx.configured)}
            />
            <ProviderRow
              name={copy.shell.geminiExperimental}
              detail={copy.settings.primaryEngine}
              active={Boolean(aiStatus?.gemini.configured)}
              experimental
            />
            <ProviderRow
              name="Deterministic fallback"
              detail={copy.settings.transparentFallback}
              active
            />
          </div>
          <div className="v5-quota">
            <span>
              {copy.settings.generativeToday}
              <strong>
                {String(aiStatus?.gemini.usage?.generativeToday || 0)} / 450
              </strong>
            </span>
            <ProgressBar
              label={copy.settings.generativeUsage}
              hideLabel
              value={Number(aiStatus?.gemini.usage?.generativeToday || 0) / 4.5}
            />
            <span>
              {copy.settings.embeddingsToday}
              <strong>
                {String(aiStatus?.gemini.usage?.embeddingsToday || 0)} / 900
              </strong>
            </span>
            <ProgressBar
              label={copy.settings.embeddingsUsage}
              hideLabel
              value={Number(aiStatus?.gemini.usage?.embeddingsToday || 0) / 9}
            />
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.settings.accountPolicy}
            title={selected?.customerName || copy.settings.selectAccount}
          />
          <div className="v5-settings-form">
            <Select
              id="account-classification"
              labelText={copy.settings.classification}
              value={classification}
              onChange={(event) =>
                setClassification(
                  event.target.value as Discovery["dataClassification"],
                )
              }
              disabled={!privateMode}
            >
              <SelectItem value="test" text={copy.settings.testAllowed} />
              <SelectItem
                value="confidential"
                text={copy.settings.confidentialBlocked}
              />
            </Select>
            <TextInput
              id="company-domain-setting"
              labelText={copy.settings.confirmedDomain}
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder={copy.settings.domainPlaceholder}
              disabled={!privateMode}
            />
            <Button
              size="sm"
              disabled={!privateMode || !selected}
              onClick={() =>
                onSettings({
                  dataClassification: classification,
                  companyDomain: domain,
                })
              }
            >
              {copy.settings.savePolicy}
            </Button>
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.settings.activeControls}
            title={copy.settings.governanceDefault}
          />
          <div className="v5-control-list">
            {controls.map((item) => (
              <div key={item}>
                <Checkmark />
                {item}
              </div>
            ))}
          </div>
        </section>
        <section className="v5-card">
          <CardHeader
            eyebrow={copy.settings.integrations}
            title={copy.settings.beforeCrm}
          />
          <div className="v5-provider-stack">
            <ProviderRow
              name="OpenAI Sites + D1 + R2"
              detail={copy.settings.appState}
              active
            />
            <ProviderRow
              name="Sign in with ChatGPT"
              detail={copy.settings.signIn}
              active
            />
            <ProviderRow name="CRM" detail={copy.settings.crm} active={false} />
            <ProviderRow
              name="Calendar, Teams, and Slack"
              detail={copy.settings.external}
              active={false}
            />
          </div>
        </section>
        <section className="v5-card v5-span-2">
          <CardHeader
            eyebrow={copy.settings.audit}
            title={copy.settings.recentRuns}
          />
          <div className="v5-audit-table">
            {data.aiRuns.slice(0, 12).map((run) => (
              <article key={run.id}>
                <span>
                  <strong>{run.agent}</strong>
                  <small>{run.detail}</small>
                </span>
                <em>
                  {visibleProviderLabel(run.provider, copy)}
                  {isWatsonxProvider(run.provider) && run.model
                    ? ` · ${run.model}`
                    : ""}
                </em>
                <span>
                  <strong>{run.latencyMs || 0} ms</strong>
                  <small>
                    {run.cached
                      ? copy.settings.cache
                      : `${run.promptTokens || 0} → ${run.outputTokens || 0} ${copy.settings.tokens}`}
                  </small>
                </span>
                <Tag type={run.status === "completed" ? "green" : "gray"}>
                  {localizeSystemValue(locale, run.status)}
                </Tag>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function CopilotPanel({
  open,
  mode,
  setMode,
  selected,
  action,
  question,
  setQuestion,
  result,
  preparation,
  saving,
  onClose,
  onAsk,
  onPrepare,
  onNavigate,
  onDecision,
}: {
  open: boolean;
  mode: "ask" | "prepare" | "next";
  setMode: (mode: "ask" | "prepare" | "next") => void;
  selected?: Discovery;
  action?: Action;
  question: string;
  setQuestion: (value: string) => void;
  result: ChatResult | null;
  preparation: Record<string, unknown> | null;
  saving: boolean;
  onClose: () => void;
  onAsk: (event?: FormEvent) => void;
  onPrepare: () => void;
  onNavigate: (sourceId: string) => void;
  onDecision: (
    action: Action,
    status: string,
    extras?: Record<string, unknown>,
  ) => void;
}) {
  const { locale, copy, questions, statusLabels, formatDate } = usePageCopy();
  const tabs: Array<["ask" | "prepare" | "next", string]> = [
    ["ask", copy.copilot.ask],
    ["prepare", copy.copilot.prepare],
    ["next", copy.copilot.next],
  ];
  return (
    <aside className={`v5-copilot ${open ? "open" : ""}`} aria-hidden={!open}>
      <header>
        <div>
          <span>{copy.copilot.title}</span>
          <strong>
            {selected?.customerName || copy.copilot.selectAccount}
          </strong>
        </div>
        <button onClick={onClose} aria-label={copy.copilot.close}>
          <Close />
        </button>
      </header>
      <nav>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={mode === id ? "active" : ""}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="v5-copilot-body">
        <InlineNotification
          kind="info"
          lowContrast
          title={copy.copilot.grounded}
          subtitle={copy.copilot.groundedHelp}
          hideCloseButton
        />
        {mode === "ask" && (
          <>
            {result ? (
              <div className="v5-answer">
                <header>
                  <Tag
                    type={
                      isWatsonxProvider(result.provider || result.aiStatus)
                        ? "blue"
                        : isDeterministicProvider(
                              result.provider || result.aiStatus,
                            )
                          ? "gray"
                          : "purple"
                    }
                  >
                    {visibleProviderLabel(
                      result.provider || result.aiStatus,
                      copy,
                    )}
                    {result.cached ? ` · ${copy.settings.cache}` : ""}
                  </Tag>
                  <strong>
                    {result.confidence}% {copy.copilot.trust}
                  </strong>
                </header>
                <p>{result.answer}</p>
                {Boolean(
                  result.facts?.length ||
                    result.hypotheses?.length ||
                    result.inferences?.length,
                ) && (
                  <Accordion align="start">
                    <AccordionItem title={copy.copilot.facts}>
                      {result.facts?.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </AccordionItem>
                    <AccordionItem title={copy.copilot.hypotheses}>
                      {result.hypotheses?.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </AccordionItem>
                    <AccordionItem title={copy.copilot.inferences}>
                      {result.inferences?.map((item, index) => (
                        <p key={`${index}-${item}`}>{item}</p>
                      ))}
                    </AccordionItem>
                  </Accordion>
                )}
                <div className="v5-citations">
                  {result.citations.map((source, index) => (
                    <button
                      key={`${source.sourceId}-${index}`}
                      onClick={() => onNavigate(source.sourceId)}
                    >
                      <span>{index + 1}</span>
                      <div>
                        <strong>
                          {localizeCitationSystemText(source.title, locale)}
                        </strong>
                        <small>
                          {localizeCitationSystemText(source.excerpt, locale)}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="v5-suggested">
                {questions.map((item) => (
                  <button key={item} onClick={() => setQuestion(item)}>
                    {item}
                    <ArrowRight />
                  </button>
                ))}
              </div>
            )}
            <form className="v5-copilot-input" onSubmit={onAsk}>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={copy.copilot.askPlaceholder}
                rows={3}
              />
              <button
                disabled={saving || !selected || !question.trim()}
                aria-label={copy.copilot.send}
              >
                <ArrowRight />
              </button>
            </form>
          </>
        )}
        {mode === "prepare" && (
          <div className="v5-prepare">
            <label>
              {copy.copilot.focus}
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={
                  action?.conversation.theme || copy.copilot.focusPlaceholder
                }
                rows={3}
              />
            </label>
            <Button
              renderIcon={Calendar}
              disabled={saving || !selected}
              onClick={onPrepare}
            >
              {saving ? copy.copilot.preparing : copy.copilot.generateBriefing}
            </Button>
            {preparation && (
              <div className="v5-preparation">
                <Tag
                  type={
                    isWatsonxProvider(String(preparation.provider || ""))
                      ? "blue"
                      : isDeterministicProvider(
                            String(preparation.provider || ""),
                          )
                        ? "gray"
                        : "purple"
                  }
                >
                  {visibleProviderLabel(
                    String(preparation.provider || "fallback"),
                    copy,
                  )}
                </Tag>
                <h3>
                  {String(
                    preparation.summary ||
                      preparation.objective ||
                      copy.copilot.conversationBriefing,
                  )}
                </h3>
                <List
                  title={copy.copilot.questions}
                  items={(preparation.nextQuestions || []) as string[]}
                />
                <List
                  title={copy.copilot.risksObjections}
                  items={(preparation.risks || []) as string[]}
                />
                <List
                  title={copy.copilot.nextSteps}
                  items={(preparation.nextActions || []) as string[]}
                />
              </div>
            )}
          </div>
        )}
        {mode === "next" && (
          <div className="v5-next-step">
            {action ? (
              <>
                <div className="v5-score-orb">{action.priorityScore}</div>
                <Tag type={statusTone(action.status)}>
                  {statusLabels[action.status] || action.status}
                </Tag>
                <h2>{action.title}</h2>
                <p>{action.rationale}</p>
                <dl>
                  <div>
                    <dt>{copy.overview.whyNow}</dt>
                    <dd>{action.whyNow}</dd>
                  </div>
                  <div>
                    <dt>{copy.overview.expectedOutcome}</dt>
                    <dd>{action.expectedOutcome}</dd>
                  </div>
                  <div>
                    <dt>{copy.copilot.due}</dt>
                    <dd>{formatDate(action.dueAt)}</dd>
                  </div>
                </dl>
                <blockquote>{action.nextStep}</blockquote>
                <div>
                  {action.evidence.slice(0, 4).map((source) => (
                    <button
                      key={source.sourceId}
                      onClick={() => onNavigate(source.sourceId)}
                    >
                      {source.title}
                    </button>
                  ))}
                </div>
                {action.status === "proposal" && (
                  <Button onClick={() => onDecision(action, "accepted")}>
                    {copy.copilot.acceptRecommendation}
                  </Button>
                )}
              </>
            ) : (
              <Empty text={copy.copilot.noRecommendation} />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function NewAccountModal({
  open,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { copy } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title={copy.modal.newAccount}
        label={copy.shell.privateWorkspace}
      />
      <ModalBody>
        <form
          id="new-account-form"
          className="v5-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(
              Object.fromEntries(new FormData(event.currentTarget).entries()),
            );
          }}
        >
          <TextInput
            id="new-company"
            name="customerName"
            labelText={copy.modal.company}
            required
          />
          <TextInput
            id="new-industry"
            name="industry"
            labelText={copy.modal.industry}
            required
          />
          <TextInput
            id="new-domain"
            name="companyDomain"
            labelText={copy.modal.domainOptional}
            placeholder={copy.settings.domainPlaceholder}
          />
          <Select
            id="new-size"
            name="companySize"
            labelText={copy.modal.size}
            defaultValue="Enterprise"
          >
            <SelectItem value="Enterprise" text="Enterprise" />
            <SelectItem value="Large" text="Large" />
            <SelectItem value="Mid-market" text="Mid-market" />
          </Select>
          <Select
            id="new-classification"
            name="dataClassification"
            labelText={copy.modal.classification}
            defaultValue="test"
          >
            <SelectItem value="test" text={copy.settings.testAllowed} />
            <SelectItem
              value="confidential"
              text={copy.settings.confidentialBlocked}
            />
          </Select>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button type="submit" form="new-account-form" disabled={saving}>
          {saving ? copy.modal.creating : copy.modal.createAccount}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function InformationModal({
  open,
  saving,
  account,
  preview,
  onClose,
  onBack,
  onPreview,
  onConfirm,
}: {
  open: boolean;
  saving: boolean;
  account?: Discovery;
  preview: Record<string, unknown> | null;
  onClose: () => void;
  onBack: () => void;
  onPreview: (payload: Record<string, unknown>) => void;
  onConfirm: () => void;
}) {
  const { dictionary, copy } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="md">
      <ModalHeader
        title={
          preview ? copy.modal.reviewBeforeApply : copy.modal.addInformation
        }
        label={account?.customerName || dictionary.common.account}
      />
      <ModalBody>
        {preview ? (
          <div className="v5-preview">
            <InlineNotification
              kind="info"
              lowContrast
              title={copy.modal.noChanges}
              subtitle={copy.modal.confirmRecalculate}
              hideCloseButton
            />
            <dl>
              {Object.entries(preview)
                .filter(([key]) => !["requiresHumanConfirmation"].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt>
                    <dd>
                      {Array.isArray(value)
                        ? value.join(" · ")
                        : String(value || "—")}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ) : (
          <form
            id="information-form"
            className="v5-form"
            onSubmit={(event) => {
              event.preventDefault();
              onPreview(
                Object.fromEntries(new FormData(event.currentTarget).entries()),
              );
            }}
          >
            <Select
              id="info-kind"
              name="kind"
              labelText={copy.modal.type}
              defaultValue="note"
            >
              <SelectItem value="note" text={copy.modal.note} />
              <SelectItem
                value="discovery_answer"
                text={copy.modal.discoveryAnswer}
              />
              <SelectItem
                value="scheduled_meeting"
                text={copy.modal.futureMeeting}
              />
              <SelectItem value="initiative" text={copy.modal.initiative} />
              <SelectItem value="system" text={copy.modal.system} />
              <SelectItem value="pain" text={copy.modal.pain} />
              <SelectItem value="risk" text={copy.modal.risk} />
              <SelectItem value="objective" text={copy.modal.objective} />
              <SelectItem value="commitment" text={copy.modal.commitment} />
              <SelectItem
                value="contradiction"
                text={copy.modal.contradiction}
              />
            </Select>
            <TextInput
              id="info-title"
              name="title"
              labelText={copy.activity.title}
              required
              placeholder={copy.modal.shortSummary}
            />
            <TextArea
              id="info-content"
              name="content"
              labelText={copy.modal.informationSource}
              rows={7}
              required
              placeholder={copy.modal.informationPlaceholder}
            />
            <TextInput
              id="info-date"
              name="occurredAt"
              type="datetime-local"
              labelText={copy.modal.dateOptional}
            />
            <Select
              id="info-status"
              name="evidenceStatus"
              labelText={copy.modal.evidenceNature}
              defaultValue="confirmed"
            >
              <SelectItem
                value="confirmed"
                text={copy.modal.confirmedEvidence}
              />
              <SelectItem
                value="assumption"
                text={copy.modal.hypothesisValidate}
              />
              <SelectItem value="gap" text={copy.modal.gap} />
              <SelectItem value="stale" text={copy.modal.stale} />
            </Select>
          </form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        {preview ? (
          <>
            <Button kind="tertiary" onClick={onBack}>
              {copy.modal.reviewAgain}
            </Button>
            <Button disabled={saving} onClick={onConfirm}>
              {saving
                ? copy.modal.applying
                : copy.modal.confirmRecalculateButton}
            </Button>
          </>
        ) : (
          <Button type="submit" form="information-form" disabled={saving}>
            {saving ? copy.modal.analyzing : copy.modal.previewImpact}
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}

function StakeholderModal({
  open,
  account,
  stakeholder,
  people,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  account?: Discovery;
  stakeholder: Stakeholder | null;
  people: Stakeholder[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { dictionary, copy, text } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="md">
      <ModalHeader
        title={
          stakeholder ? copy.modal.editStakeholder : copy.modal.addStakeholder
        }
        label={text(copy.modal.relationships, {
          account: account?.customerName || dictionary.common.account,
        })}
      />
      <ModalBody>
        <form
          id="stakeholder-form"
          className="v5-form two"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(
              Object.fromEntries(new FormData(event.currentTarget).entries()),
            );
          }}
        >
          <TextInput
            id="stakeholder-name"
            name="name"
            labelText={copy.modal.name}
            defaultValue={stakeholder?.name}
            required
          />
          <TextInput
            id="stakeholder-role"
            name="role"
            labelText={copy.modal.role}
            defaultValue={stakeholder?.role}
            required
          />
          <TextInput
            id="stakeholder-area"
            name="area"
            labelText={copy.modal.area}
            defaultValue={stakeholder?.area}
          />
          <Select
            id="stakeholder-manager"
            name="reportsToId"
            labelText={copy.modal.reportsTo}
            defaultValue={stakeholder?.reportsToId || ""}
          >
            <SelectItem value="" text={copy.modal.topUnmapped} />
            {people
              .filter((person) => person.id !== stakeholder?.id)
              .map((person) => (
                <SelectItem
                  key={person.id}
                  value={person.id}
                  text={person.name}
                />
              ))}
          </Select>
          <Select
            id="stakeholder-influence"
            name="influence"
            labelText={copy.modal.influence}
            defaultValue={stakeholder?.influence || "Média"}
          >
            <SelectItem value="Alta" text={copy.priority.high} />
            <SelectItem value="Média" text={copy.priority.medium} />
            <SelectItem value="Baixa" text={copy.priority.low} />
          </Select>
          <Select
            id="stakeholder-stance"
            name="stance"
            labelText={copy.modal.stance}
            defaultValue={stakeholder?.stance || "Desconhecido"}
          >
            <SelectItem value="Aliado" text={copy.modal.ally} />
            <SelectItem value="Neutro" text={copy.modal.neutral} />
            <SelectItem value="Resistente" text={copy.modal.resistant} />
            <SelectItem value="Desconhecido" text={copy.modal.unknown} />
          </Select>
          <TextInput
            id="stakeholder-priorities"
            name="priorities"
            labelText={copy.modal.priorities}
            defaultValue={stakeholder?.priorities.join(", ")}
          />
          <TextArea
            id="stakeholder-notes"
            name="notes"
            labelText={copy.modal.contextApproach}
            rows={5}
            defaultValue={stakeholder?.notes}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button type="submit" form="stakeholder-form" disabled={saving}>
          {copy.modal.saveStakeholder}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function ActionModal({
  open,
  action,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  action: Action | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { copy } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title={copy.modal.editDecision}
        label={action?.title || copy.home.nextBestAction}
      />
      <ModalBody>
        <form
          id="action-form"
          className="v5-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              ...Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              ),
              edited: true,
            });
          }}
        >
          <TextInput
            id="action-title"
            name="title"
            labelText={copy.modal.action}
            defaultValue={action?.title}
          />
          <TextArea
            id="action-next-step"
            name="nextStep"
            labelText={copy.modal.nextStep}
            defaultValue={action?.nextStep}
            rows={4}
          />
          <Select
            id="action-status"
            name="status"
            labelText={copy.modal.decision}
            defaultValue={action?.status || "proposal"}
          >
            <SelectItem value="accepted" text={copy.modal.accept} />
            <SelectItem value="in_progress" text={copy.status.inProgress} />
            <SelectItem value="snoozed" text={copy.modal.snooze} />
            <SelectItem value="completed" text={copy.modal.complete} />
            <SelectItem value="discarded" text={copy.modal.discard} />
          </Select>
          <TextInput
            id="action-date"
            name="snoozedUntil"
            type="date"
            labelText={copy.modal.snoozeUntil}
          />
          <TextArea
            id="action-reason"
            name="reason"
            labelText={copy.modal.reasonFeedback}
            rows={3}
            helperText={copy.modal.reasonHelp}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button type="submit" form="action-form" disabled={saving}>
          {copy.modal.registerDecision}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function ResearchModal({
  open,
  account,
  saving,
  onClose,
  onResearch,
}: {
  open: boolean;
  account?: Discovery;
  saving: boolean;
  onClose: () => void;
  onResearch: (payload: Record<string, unknown>) => void;
}) {
  const { copy } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title={copy.modal.researchSignals}
        label={copy.modal.researchLabel}
      />
      <ModalBody>
        <InlineNotification
          kind="warning"
          lowContrast
          title={copy.modal.confirmCompany}
          subtitle={copy.modal.confirmCompanyHelp}
          hideCloseButton
        />
        <form
          id="research-form"
          className="v5-form"
          onSubmit={(event) => {
            event.preventDefault();
            onResearch({
              ...Object.fromEntries(
                new FormData(event.currentTarget).entries(),
              ),
              confirmed: true,
            });
          }}
        >
          <TextInput
            id="research-name"
            name="companyName"
            labelText={copy.modal.exactName}
            defaultValue={account?.customerName}
            required
          />
          <TextInput
            id="research-domain"
            name="domain"
            labelText={copy.modal.officialDomain}
            defaultValue={account?.companyDomain || ""}
            required
            placeholder={copy.settings.domainPlaceholder}
          />
          <TextArea
            id="research-question"
            name="question"
            labelText={copy.modal.researchFocus}
            rows={4}
            defaultValue={copy.modal.researchDefault}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button type="submit" form="research-form" disabled={saving}>
          {saving ? copy.modal.researching : copy.modal.confirmResearch}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function GuidedDiscoverySummary({
  discovery,
  onOpen,
  compact = false,
}: {
  discovery: GuidedDiscovery | null;
  onOpen: () => void;
  compact?: boolean;
}) {
  const { copy, text } = usePageCopy();
  const metrics = discovery?.metrics || {
    addressed: 0,
    total: 6,
    progressPercent: 0,
    confirmedWithEvidence: 0,
    coveragePercent: 0,
    gaps: 0,
    stale: 0,
    contradictions: 0,
  };
  const relevant =
    discovery?.pillars
      .filter((pillar) => pillar.key !== "base")
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 2) || [];
  const active =
    discovery?.session && !discovery.session.id.startsWith("virtual-");
  return (
    <section
      id="guided-discovery-summary"
      className={`v5-guided-summary ${compact ? "compact" : ""}`}
    >
      <div className="v5-guided-copy">
        <span>
          {text(copy.guidedSummary.eyebrow, {
            version: discovery?.catalogVersion || "2026.1",
          })}
        </span>
        <h2>
          {active ? copy.guidedSummary.continue : copy.guidedSummary.title}
        </h2>
        <p>{copy.guidedSummary.description}</p>
        <div>
          {relevant.map((pillar) => (
            <Tag key={pillar.key} type="cyan">
              {pillar.label} · {pillar.relevance}%
            </Tag>
          ))}
        </div>
      </div>
      <div className="v5-guided-stats">
        <div>
          <strong>{metrics.progressPercent}%</strong>
          <span>{copy.guidedSummary.progress}</span>
        </div>
        <div>
          <strong>{metrics.coveragePercent}%</strong>
          <span>{copy.guidedSummary.coverage}</span>
        </div>
        <div>
          <strong>{metrics.gaps}</strong>
          <span>{copy.guidedSummary.gaps}</span>
        </div>
        <ProgressBar
          label={copy.guidedSummary.progressLabel}
          hideLabel
          value={metrics.progressPercent}
        />
      </div>
      <Button renderIcon={ArrowRight} onClick={onOpen}>
        {active
          ? copy.guidedSummary.resume
          : discovery?.readonly
            ? copy.guidedSummary.exploreExample
            : copy.guidedSummary.start}
      </Button>
    </section>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="v5-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
function CardHeader({
  eyebrow,
  title,
  side,
}: {
  eyebrow: string;
  title: string;
  side?: ReactNode;
}) {
  return (
    <header className="v5-card-head">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {side}
    </header>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="v5-empty">
      <span>◇</span>
      <p>{text}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  const { dictionary } = usePageCopy();
  return (
    <div className="v5-list">
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <small>{dictionary.common.noData}</small>
      )}
    </div>
  );
}
function MemoryColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: string[];
}) {
  const { copy } = usePageCopy();
  return (
    <section className={tone}>
      <header>
        <i />
        {title}
        <em>{items.length}</em>
      </header>
      {items.map((item, index) => (
        <p key={`${index}-${item}`}>{item}</p>
      ))}
      {!items.length && <small>{copy.activity.noCategoryItems}</small>}
    </section>
  );
}
function MemoryMini({
  title,
  count,
  tone,
  items,
}: {
  title: string;
  count: number;
  tone: string;
  items: string[];
}) {
  const { copy } = usePageCopy();
  return (
    <article className={tone}>
      <header>
        <span>{title}</span>
        <strong>{count}</strong>
      </header>
      <p>{items[0] || copy.activity.noCategoryItems}</p>
    </article>
  );
}
function ProviderRow({
  name,
  detail,
  active,
  experimental,
}: {
  name: string;
  detail: string;
  active: boolean;
  experimental?: boolean;
}) {
  const { copy } = usePageCopy();
  return (
    <article>
      <i className={active ? "active" : "inactive"} />
      <span>
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <Tag type={active ? (experimental ? "purple" : "green") : "gray"}>
        {active
          ? experimental
            ? copy.status.experimental
            : copy.status.active
          : copy.status.planned}
      </Tag>
    </article>
  );
}
function MeetingForm({
  onSave,
  saving,
  readonly,
}: {
  onSave: (payload: Record<string, unknown>) => void;
  saving: boolean;
  readonly: boolean;
}) {
  const { copy } = usePageCopy();
  return (
    <form
      className="v5-form compact"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave({
          title: form.get("title"),
          notes: form.get("notes"),
          attendees: form.get("attendees"),
        });
      }}
    >
      <TextInput
        id="meeting-title"
        name="title"
        labelText={copy.activity.title}
        defaultValue={copy.activity.defaultMeeting}
        disabled={readonly}
      />
      <TextInput
        id="meeting-attendees"
        name="attendees"
        labelText={copy.activity.attendees}
        placeholder={copy.activity.attendeesPlaceholder}
        disabled={readonly}
      />
      <TextArea
        id="meeting-notes"
        name="notes"
        labelText={copy.activity.freeNotes}
        required
        rows={7}
        placeholder={copy.activity.notesPlaceholder}
        disabled={readonly}
      />
      <Button type="submit" disabled={saving || readonly}>
        {saving ? copy.activity.analyzing : copy.activity.saveAnalyze}
      </Button>
    </form>
  );
}

async function uploadDocument(
  file: File,
  accountId: string,
  mode: string,
  locale: Locale,
  messages: AppMessages["notifications"],
  notify: (value: string) => void,
  reload: () => Promise<void>,
  setSaving: (value: boolean) => void,
) {
  if (file.size > 15 * 1024 * 1024) {
    notify(messages.fileTooLarge);
    return;
  }
  setSaving(true);
  try {
    const extracted = await extractText(file, messages.unsupportedFile);
    const form = new FormData();
    form.append("file", file);
    form.append("extractedText", extracted.text);
    form.append("pagesJson", JSON.stringify(extracted.pages));
    form.append("scope", mode);
    form.append("responseLocale", locale);
    const response = await fetch(`/api/accounts/${accountId}/documents`, {
      method: "POST",
      headers: localeRequestHeaders(locale),
      body: form,
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || messages.uploadFailed);
    await reload();
    notify(extracted.text ? messages.documentAdded : messages.manualSummary);
  } catch (error) {
    notify(error instanceof Error ? error.message : messages.documentError);
  } finally {
    setSaving(false);
  }
}
async function extractText(
  file: File,
  unsupportedMessage: string,
): Promise<{ text: string; pages: Array<{ page: number; text: string }> }> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "md" || extension === "markdown") {
    const text = await file.text();
    return { text, pages: [{ page: 1, text }] };
  }
  if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return { text: result.value, pages: [{ page: 1, text: result.value }] };
  }
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: Array<{ page: number; text: string }> = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push({ page: index, text });
    }
    return { text: pages.map((page) => page.text).join("\n\n"), pages };
  }
  throw new Error(unsupportedMessage);
}
