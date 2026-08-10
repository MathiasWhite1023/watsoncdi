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
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Theme,
} from "@carbon/react";
import {
  Add,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Chat,
  Checkmark,
  Close,
  Dashboard,
  Document,
  Watsonx,
  Logout,
  Menu,
  Search,
  Settings,
  UserAvatar,
} from "@carbon/icons-react";
import type {
  AccountRelationship as GraphRelationship,
  GraphPosition,
  RelationshipGraphMode,
} from "./RelationshipGraph";
import {
  KyndrylV4GovernancePanel,
  KyndrylV4RelationshipsPanel,
  KyndrylV4StrategyPanel,
  type AnswerScoreDelta,
  type CapabilityRelationshipCoverage,
  type GovernanceActivityView,
  type GovernanceEvidenceView,
  type GovernanceLedgerItem,
  type OpportunitySnapshot,
  type OpportunityTechnology,
} from "./KyndrylV4AccountPanels";
import {
  KyndrylV4Accounts,
  KyndrylV4Home,
  type KyndrylV4Account,
  type KyndrylV4CapabilityStatus,
} from "./KyndrylV4Home";
import GuidedDiscoveryWorkspace, {
  type GuidedDiscoveryView,
} from "./GuidedDiscoveryWorkspace";
import {
  CrmHandoffModal,
  type CrmHandoffData,
} from "./CommercialProofPanels";
import { LanguageSwitcher, useI18n } from "./I18nProvider";
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
import { type KyndrylAssessment } from "@/lib/kyndryl-discovery";
import {
  CDI_CAPABILITIES,
  CDI_CAPABILITY_CATALOG_VERSION,
  localizeCdi,
} from "@/lib/cdi/capability-driven";

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
type StakeholderCapabilityAssignmentRecord = {
  id: string;
  discoveryId: string;
  stakeholderId: string;
  capabilityKey: string;
  role: "owner" | "decision_maker" | "influencer" | "technical_contact";
  status: "confirmed" | "suggested" | "dismissed";
  confidence: number;
  sourceType: string;
  sourceId: string | null;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
};
type CapabilityPortfolioCoverage = {
  catalogVersion: string;
  totalAccounts: number;
  capabilities: Array<{
    key: string;
    label: string;
    description: string;
    totalAccounts: number;
    reviewedAccounts: number;
    coveragePercent: number;
    inProgress: number;
    reviewedSufficient: number;
    reviewedWithGaps: number;
    notRelevant: number;
    notStarted: number;
    needsReview: number;
    accounts: Array<{
      accountId: string;
      accountName: string;
      status:
        | "not_started"
        | "in_progress"
        | "reviewed_sufficient"
        | "reviewed_gaps"
        | "not_relevant"
        | "needs_review";
      technologyFit: number | null;
      confidence: number | null;
      reviewedAt: string | null;
      leadingTechnology: string | null;
    }>;
  }>;
};
type RelationshipCapabilityCoverageRecord = {
  discoveryId: string;
  catalogVersion: string;
  capabilities: Array<{
    key: string;
    label: string;
    assignments: StakeholderCapabilityAssignmentRecord[];
    stakeholderIds: string[];
    roles: string[];
    coveragePercent: number;
    gaps: string[];
  }>;
};
type AnswerImpactRecord = {
  id: string;
  discoveryId: string;
  answerId: string;
  questionId: string;
  catalogVersion: string;
  capabilityKey: string;
  dimension: string;
  response: string;
  evidenceId: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  delta: {
    maturity?: number;
    technologyFit?: number;
    confidence?: number;
    evidenceCount?: number;
    conflictChanged?: boolean;
    penalties?: { before: number; after: number; delta: number };
    penaltyChanges?: Array<Record<string, unknown>>;
  };
  journeyIds: string[];
  technologyIds: string[];
  gateChanges: Array<Record<string, unknown>>;
  recommendationChanges: Array<Record<string, unknown>>;
  ruleTrace: Record<string, unknown>;
  source: Record<string, unknown>;
  createdAt: string;
};
type CdiEvidenceRecord = {
  id: string;
  discoveryId: string;
  answerId: string | null;
  questionId: string;
  capabilityKey: string;
  dimension: string;
  response: string;
  polarity: string | null;
  strength: number;
  source: Record<string, unknown>;
  createdAt: string;
};
type CdiCapabilitySnapshotRecord = {
  id: string;
  discoveryId: string;
  catalogVersion: string;
  capabilityKey: string;
  maturity: Record<string, unknown>;
  confidence: number;
  status: string;
  evidenceFingerprint: string;
  computedAt: string;
};
type CdiConflictRecord = {
  id: string;
  discoveryId: string;
  capabilityKey: string;
  dimension: string;
  evidenceIds: string[];
  status: string;
  resolution: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
type CdiTechnologyReviewRecord = {
  id: string;
  discoveryId: string;
  technologyId: string;
  catalogVersion: string;
  fitScore: number;
  confidence: number;
  decisionBand: string;
  gateStatus: string;
  components: Record<string, unknown>;
  trace: Array<Record<string, unknown>>;
  humanDecision: string | null;
  reviewedAt: string | null;
  computedAt: string;
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
  capabilityPortfolioCoverage: CapabilityPortfolioCoverage | null;
  stakeholderCapabilityAssignments: StakeholderCapabilityAssignmentRecord[];
  relationshipCapabilityCoverage: RelationshipCapabilityCoverageRecord[];
  answerImpacts: AnswerImpactRecord[];
  cdiEvidence: CdiEvidenceRecord[];
  cdiCapabilitySnapshots: CdiCapabilitySnapshotRecord[];
  cdiConflicts: CdiConflictRecord[];
  cdiTechnologyReviews: CdiTechnologyReviewRecord[];
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
  overallReview: {
    reviewedPillars: number;
    totalPillars: number;
    percent: number;
    coveragePercent: number;
    confidencePercent: number;
  };
  pillarAssessments: Array<{
    key: string;
    label: string;
    description: string;
    status:
      | "not_started"
      | "in_progress"
      | "reviewed_sufficient"
      | "reviewed_gaps"
      | "not_relevant";
    sessionId: string | null;
    progressPercent: number;
    coveragePercent: number;
    confidencePercent: number;
    answeredCount: number;
    requiredCount: number;
    notRelevantReason: string | null;
    reviewedAt: string | null;
    leadingTechnology: string | null;
    propensity: number;
  }>;
  activePillar: string | null;
  recommendedNextPillar: {
    key: string;
    label: string;
    relevance: number;
    rationale: string;
  } | null;
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
  technologyAssessment: KyndrylAssessment;
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
  capabilityPortfolioCoverage: null,
  stakeholderCapabilityAssignments: [],
  relationshipCapabilityCoverage: [],
  answerImpacts: [],
  cdiEvidence: [],
  cdiCapabilitySnapshots: [],
  cdiConflicts: [],
  cdiTechnologyReviews: [],
};
const navItems = [
  { id: "home", key: "home", icon: Dashboard },
  { id: "accounts", key: "accounts", icon: Document },
  { id: "settings", key: "settings", icon: Settings },
] as const;
const accountModeItems = [
  { id: "discovery", key: "discovery" },
  { id: "relationships", key: "relationships" },
  { id: "strategy", key: "strategy" },
  { id: "governance", key: "governance" },
] as const;
type CurrentAccountMode = (typeof accountModeItems)[number]["id"];
type AccountMode = CurrentAccountMode;
type ActiveView = (typeof navItems)[number]["id"];
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
  const { locale, dictionary, copy, text } = usePageCopy();
  const privateMode = mode === "private";
  const [active, setActive] = useState<ActiveView>("home");
  const [portfolioMode, setPortfolioMode] = useState<"accounts" | "account">(
    "accounts",
  );
  const [accountMode, setAccountMode] = useState<AccountMode>("discovery");
  const [entryCapabilityKey, setEntryCapabilityKey] = useState<string | null>(
    null,
  );
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
    | "new-account"
    | "information"
    | "stakeholder"
    | "capability-assignment"
    | "plan"
    | null
  >(null);
  const [editingStakeholder, setEditingStakeholder] =
    useState<Stakeholder | null>(null);
  const [pendingCapabilityAssignmentKey, setPendingCapabilityAssignmentKey] =
    useState<string | null>(null);
  const [informationDraft, setInformationDraft] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [informationPreview, setInformationPreview] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [handoffRecord, setHandoffRecord] = useState<CrmHandoffRecord | null>(
    null,
  );
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [referenceNow] = useState(() => Date.now());

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
  useEffect(() => {
    const applyLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view");
      const accountId = params.get("account");
      const tab = params.get("tab");
      const capability = params.get("capability");
      if ((!view || view === "home") && !accountId) {
        setActive("home");
        setPortfolioMode("accounts");
        setAccountMode("discovery");
        setEntryCapabilityKey(null);
        return;
      }
      if (view === "settings") {
        setActive("settings");
        setEntryCapabilityKey(null);
        return;
      }
      if (view === "accounts" || accountId) {
        setActive("accounts");
        setPortfolioMode(accountId ? "account" : "accounts");
        if (!accountId) setEntryCapabilityKey(null);
      }
      if (accountId) setSelectedId(accountId);
      if (
        tab &&
        accountModeItems.some((item) => item.id === tab)
      )
        setAccountMode(tab as CurrentAccountMode);
      setEntryCapabilityKey(capability || null);
    };
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, []);

  const writeLocation = useCallback(
    (input: {
      view: "home" | "accounts" | "settings";
      accountId?: string | null;
      tab?: CurrentAccountMode | null;
      capability?: string | null;
    }) => {
      const url = new URL(window.location.href);
      url.search = "";
      if (input.view !== "home") url.searchParams.set("view", input.view);
      if (input.accountId) url.searchParams.set("account", input.accountId);
      if (input.tab) url.searchParams.set("tab", input.tab);
      if (input.capability)
        url.searchParams.set("capability", input.capability);
      window.history.pushState({}, "", `${url.pathname}${url.search}`);
    },
    [],
  );

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
  const guidedDiscovery =
    data.guidedDiscoveries.find((item) => item.discoveryId === selected?.id) ||
    null;
  const commercialProof =
    data.commercialProof.find((item) => item.discoveryId === selected?.id) ||
    null;
  const activeHandoff =
    handoffRecord?.discoveryId === selected?.id
      ? handoffRecord
      : commercialProof?.latestHandoff || null;
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
  const v4Accounts = useMemo<KyndrylV4Account[]>(() => {
    const capabilityCoverage = data.capabilityPortfolioCoverage?.capabilities || [];
    const latestActivity = (accountId: string, fallback: string) => {
      const timestamps = [
        fallback,
        ...data.accountEvents
          .filter((item) => item.discoveryId === accountId)
          .map((item) => item.occurredAt),
        ...data.meetings
          .filter((item) => item.discoveryId === accountId)
          .map((item) => item.createdAt),
      ].filter(Boolean);
      return timestamps.sort((left, right) => right.localeCompare(left))[0] || null;
    };
    return data.discoveries.map((account) => {
      const guided = data.guidedDiscoveries.find(
        (item) => item.discoveryId === account.id,
      );
      const capabilities = CDI_CAPABILITIES.map((capability) => {
        const portfolioSignal = capabilityCoverage
          .find((item) => item.key === capability.key)
          ?.accounts.find((item) => item.accountId === account.id);
        const assessment = guided?.pillarAssessments.find(
          (item) => item.key === capability.key,
        );
        const status = (portfolioSignal?.status ||
          assessment?.status ||
          "not_started") as KyndrylV4CapabilityStatus;
        const hasCurrentAssessment =
          status === "in_progress" ||
          status === "reviewed_sufficient" ||
          status === "reviewed_gaps";
        return {
          capabilityKey: capability.key,
          catalogVersion:
            status === "needs_review"
              ? "legacy"
              : guided?.catalogVersion || CDI_CAPABILITY_CATALOG_VERSION,
          status,
          technologyFit: hasCurrentAssessment
            ? portfolioSignal
              ? portfolioSignal.technologyFit
              : assessment?.propensity ?? null
            : null,
          confidence: hasCurrentAssessment
            ? portfolioSignal
              ? portfolioSignal.confidence
              : assessment?.confidencePercent ?? null
            : null,
          updatedAt: portfolioSignal?.reviewedAt || assessment?.reviewedAt || null,
        };
      });
      const leading = [...capabilities]
        .filter(
          (item) =>
            item.technologyFit != null &&
            (item.status === "in_progress" ||
              item.status === "reviewed_sufficient" ||
              item.status === "reviewed_gaps"),
        )
        .sort(
          (left, right) =>
            Number(right.technologyFit || 0) - Number(left.technologyFit || 0),
        )[0];
      return {
        id: account.id,
        name: account.customerName,
        industry: account.industry,
        owner: account.owner,
        maturity: account.progress,
        lastActivityAt: latestActivity(account.id, account.updatedAt),
        nextStep:
          guided?.recommendedNextPillar?.label || account.nextEngagement || null,
        leadingCapabilityKey: leading?.capabilityKey || null,
        capabilities,
      };
    });
  }, [
    data.accountEvents,
    data.capabilityPortfolioCoverage,
    data.discoveries,
    data.guidedDiscoveries,
    data.meetings,
  ]);
  const relationshipCapabilities = CDI_CAPABILITIES.map((capability) => ({
    key: capability.key,
    label: localizeCdi(capability.label, locale),
    description: localizeCdi(capability.description, locale),
  }));
  const selectedCapabilityAssignments = data.stakeholderCapabilityAssignments
    .filter((item) => item.discoveryId === selected?.id)
    .filter((item) => item.status !== "dismissed");
  const selectedRelationshipCoverage = data.relationshipCapabilityCoverage.find(
    (item) => item.discoveryId === selected?.id,
  );
  const technologyAssessment = guidedDiscovery?.technologyAssessment;
  const opportunityTechnologies: OpportunityTechnology[] = (
    technologyAssessment?.technologies || []
  ).map((item) => {
    const ownerAssignment = selectedCapabilityAssignments.find(
      (assignment) =>
        assignment.capabilityKey === String(item.pillarKey) &&
        assignment.status === "confirmed" &&
        (assignment.role === "owner" ||
          assignment.role === "decision_maker"),
    );
    const owner = stakeholders.find(
      (person) => person.id === ownerAssignment?.stakeholderId,
    );
    const relationshipGaps =
      selectedRelationshipCoverage?.capabilities.find(
        (capability) => capability.key === String(item.pillarKey),
      )?.gaps || [];
    return {
      id: item.id,
      name: item.name,
      capabilityKeys: item.capabilities,
      fit: item.propensity,
      confidence: item.confidence,
      impact: item.components.businessImpact,
      action: item.action,
      gateStatus: item.gateStatus,
      evidenceCount: item.evidence.length,
      evidence: item.evidence.map((evidence) => ({
        id: evidence.id,
        label: evidence.label,
      })),
      explanation: item.explanation,
      nextStep: item.nextQuestion || undefined,
      ownerName: owner?.name,
      gaps: relationshipGaps,
    };
  });
  const stakeholderCoverage: CapabilityRelationshipCoverage[] =
    (selectedRelationshipCoverage?.capabilities || []).map((item) => {
      const requiredRoles = [
        "owner",
        "decision_maker",
        "technical_contact",
      ];
      return {
        capabilityKey: item.key,
        capabilityLabel: item.label,
        confirmedRoles: requiredRoles.filter((role) =>
          item.roles.includes(role),
        ).length,
        requiredRoles: requiredRoles.length,
        ownerCount: item.assignments.filter(
          (assignment) => assignment.role === "owner",
        ).length,
        decisionMakerCount: item.assignments.filter(
          (assignment) => assignment.role === "decision_maker",
        ).length,
        technicalContactCount: item.assignments.filter(
          (assignment) => assignment.role === "technical_contact",
        ).length,
      };
    });
  const opportunitySnapshots: OpportunitySnapshot[] = data.cdiCapabilitySnapshots
    .filter(
      (item) =>
        item.discoveryId === selected?.id &&
        item.catalogVersion === guidedDiscovery?.catalogVersion,
    )
    .flatMap((item) => {
      const leading = String(item.maturity.leadingTechnology || "");
      const fit = Number(item.maturity.propensity);
      if (!leading || !Number.isFinite(fit)) return [];
      const knownTechnology = technologyAssessment?.technologies.find(
        (technology) => technology.name === leading,
      );
      return [
        {
          id: item.id,
          technologyId:
            knownTechnology?.id || `${item.capabilityKey}:${leading}`,
          technologyName: leading,
          createdAt: item.computedAt,
          fit,
          confidence: item.confidence,
        },
      ];
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const governanceEvidence: GovernanceEvidenceView[] = data.cdiEvidence
    .filter((item) => item.discoveryId === selected?.id)
    .map((item) => {
      const sourceDate = String(item.source.sourceDate || item.createdAt);
      const sourceTimestamp = new Date(sourceDate).getTime();
      const isStale =
        Number.isFinite(sourceTimestamp) &&
        referenceNow - sourceTimestamp > 90 * 24 * 60 * 60 * 1000;
      const isContradicted = data.cdiConflicts.some(
        (conflict) =>
          conflict.discoveryId === item.discoveryId &&
          (conflict.evidenceIds.includes(item.id) ||
            conflict.capabilityKey === item.capabilityKey) &&
          conflict.status !== "resolved",
      );
      return {
        id: item.id,
        label: item.response || item.id,
        source: String(item.source.sourceType || item.source.sourceId || ""),
        status: isContradicted
          ? "contradicted"
          : isStale
            ? "stale"
            : item.polarity === "GAP"
              ? "hypothesis"
              : "confirmed",
        confidence: Number(item.source.confidence || item.strength || 0),
        updatedAt: sourceDate,
      } satisfies GovernanceEvidenceView;
    });
  const governanceLedger: GovernanceLedgerItem[] = data.answerImpacts
    .filter((impact) => impact.discoveryId === selected?.id)
    .map((impact) => {
      const question = guidedDiscovery?.questions.find(
        (item) =>
          item.id === impact.questionId ||
          item.catalogQuestionId === impact.questionId,
      );
      const answer = guidedDiscovery?.history.find(
        (item) => item.id === impact.answerId,
      );
      const capability = CDI_CAPABILITIES.find(
        (item) => item.key === impact.capabilityKey,
      );
      const beforeCapability = objectValue(impact.before.capability);
      const afterCapability = objectValue(impact.after.capability);
      const beforeReview = objectValue(impact.before.review);
      const afterReview = objectValue(impact.after.review);
      const metricRows: Array<{
        metric: AnswerScoreDelta["metric"];
        before: number;
        after: number;
      }> = [
        {
          metric: "maturity",
          before: numberValue(beforeCapability.maturity),
          after: numberValue(afterCapability.maturity),
        },
        {
          metric: "technologyFit",
          before: numberValue(impact.before.propensity),
          after: numberValue(impact.after.propensity),
        },
        {
          metric: "confidence",
          before: numberValue(beforeReview.confidence),
          after: numberValue(afterReview.confidence),
        },
      ];
      const scoreDeltas = metricRows
        .map((metric) => ({
          ...metric,
          delta: metric.after - metric.before,
        }))
        .filter((metric) => metric.delta !== 0);
      const source = impact.source;
      const stakeholder = stakeholders.find(
        (person) => person.id === String(source.stakeholderId || ""),
      );
      const technologyNames = impact.technologyIds.map((technologyId) => ({
        id: technologyId,
        name:
          technologyAssessment?.technologies.find(
            (technology) => technology.id === technologyId,
          )?.name || technologyId,
      }));
      const formula = objectValue(impact.ruleTrace.formula);
      const appliedRules = Object.entries(formula).map(
        ([key, value]) => `${key}: ${String(value)}%`,
      );
      const describeChanges = (items: Array<Record<string, unknown>>) =>
        items.map(
          (item) =>
            `${String(item.technologyName || item.technologyId || "Technology")}: ${String(item.before ?? "—")} → ${String(item.after ?? "—")}`,
        );
      const penaltyTrace = objectValue(impact.ruleTrace.penalties);
      const penaltyChanges = impact.delta.penaltyChanges?.length
        ? impact.delta.penaltyChanges
        : listValue(penaltyTrace.changes).map(objectValue);
      return {
        answerId: impact.answerId,
        question: question?.prompt || impact.questionId,
        response: impact.response,
        answeredAt: answer?.answeredAt || impact.createdAt,
        capabilityKey: impact.capabilityKey,
        capabilityLabel: capability
          ? localizeCdi(capability.label, locale)
          : impact.capabilityKey,
        dimension: impact.dimension,
        journey: impact.journeyIds.join(" · ") || undefined,
        evidence: governanceEvidence.filter((item) =>
          data.cdiEvidence.some(
            (record) =>
              record.id === item.id &&
              (record.answerId === impact.answerId ||
                record.questionId === impact.questionId),
          ),
        ),
        scoreDeltas,
        gates: describeChanges(impact.gateChanges),
        penalties: describeChanges(penaltyChanges),
        technologies: technologyNames,
        recommendation: describeChanges(impact.recommendationChanges).join(
          " · ",
        ),
        appliedRules,
        stakeholderId: stakeholder?.id,
        stakeholderName: stakeholder?.name,
        source: [source.sourceType, source.sourceId]
          .filter(Boolean)
          .map(String)
          .join(" · "),
        confidence: Number(source.confidence || 0),
        revisions: guidedDiscovery?.history.filter(
          (item) => item.questionId === answer?.questionId,
        ).length || 1,
        conflict: data.cdiConflicts.some(
          (item) =>
            item.discoveryId === selected?.id &&
            item.capabilityKey === impact.capabilityKey &&
            item.status !== "resolved",
        ),
      };
    });
  const governanceMeetings: GovernanceActivityView[] = meetings.map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.summary || item.notes,
    occurredAt: item.scheduledAt || item.createdAt,
    type: "meeting",
    status: item.meetingStatus,
  }));
  const governanceDocuments: GovernanceActivityView[] = documents.map((item) => ({
    id: item.id,
    title: item.name,
    detail: item.summary,
    occurredAt: item.createdAt,
    type: "document",
    status: item.status,
  }));
  const governanceAuditEvents: GovernanceActivityView[] = accountEvents.map(
    (item) => ({
      id: item.id,
      title: item.title,
      detail: item.content,
      occurredAt: item.occurredAt,
      type: "audit",
      status: item.evidenceStatus,
    }),
  );

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
      answerImpact?: AnswerImpactRecord | null;
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
    (
      accountId: string,
      nextMode: CurrentAccountMode = "discovery",
      capabilityKey: string | null = null,
    ) => {
      setSelectedId(accountId);
      setActive("accounts");
      setPortfolioMode("account");
      setAccountMode(nextMode);
      setEntryCapabilityKey(capabilityKey);
      writeLocation({
        view: "accounts",
        accountId,
        tab: nextMode,
        capability: capabilityKey,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [writeLocation],
  );
  const startCapabilityForAccount = async (
    accountId: string,
    capabilityKey: string,
  ) => {
    openAccount(accountId, "discovery", capabilityKey);
    if (!privateMode) return;
    setSaving(true);
    try {
      const response = await apiFetch(
        `/api/accounts/${accountId}/guided-discovery/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "direct",
            selectedPillars: [capabilityKey],
            pillarKey: capabilityKey,
            responseLocale: locale,
          }),
        },
      );
      const payload = (await response.json()) as {
        guidedDiscovery?: GuidedDiscovery;
        error?: string;
      };
      if (!response.ok || !payload.guidedDiscovery) {
        notify(payload.error || copy.notifications.discoveryError);
        return;
      }
      setData((current) => ({
        ...current,
        guidedDiscoveries: [
          ...current.guidedDiscoveries.filter(
            (item) => item.discoveryId !== accountId,
          ),
          payload.guidedDiscovery!,
        ],
      }));
    } catch {
      notify(copy.notifications.discoveryError);
    } finally {
      setSaving(false);
    }
  };
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
      setPortfolioMode("account");
      setAccountMode("governance");
      writeLocation({
        view: "accounts",
        accountId,
        tab: "governance",
      });
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
    [data.accountEvents, data.documents, data.meetings, locale, writeLocation],
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

  const commands = (() => {
    const base = [
      {
        label: copy.command.goHome,
        hint: copy.command.navigation,
        run: () => {
          setActive("home");
          setPortfolioMode("accounts");
          writeLocation({ view: "home" });
        },
      },
      {
        label: locale === "pt-BR" ? "Abrir contas" : "Open accounts",
        hint: copy.command.navigation,
        run: () => {
          setActive("accounts");
          setPortfolioMode("accounts");
          writeLocation({ view: "accounts" });
        },
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
            setPortfolioMode("account");
            setAccountMode("discovery");
            setEntryCapabilityKey(null);
            writeLocation({
              view: "accounts",
              accountId: selected.id,
              tab: "discovery",
            });
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
  })();

  if (loading)
    return (
      <main className="v5-loading">
        <div>
          <Watsonx size={32} />
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
              setPortfolioMode("accounts");
              setEntryCapabilityKey(null);
              writeLocation({ view: "home" });
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
            <HeaderGlobalAction
              aria-label={
                privateMode ? userName || copy.shell.visitor : copy.shell.signIn
              }
              onClick={() => {
                if (!privateMode) {
                  window.location.assign(
                    "/signin-with-chatgpt?return_to=%2Fworkspace",
                  );
                }
              }}
            >
              <UserAvatar />
            </HeaderGlobalAction>
            {privateMode && (
              <HeaderGlobalAction
                aria-label={copy.shell.signOut}
                onClick={() =>
                  window.location.assign(
                    "/signout-with-chatgpt?return_to=%2F",
                  )
                }
              >
                <Logout />
              </HeaderGlobalAction>
            )}
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
                  if (item.id === "accounts") setPortfolioMode("accounts");
                  writeLocation({ view: item.id });
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
                ? locale === "pt-BR"
                  ? "Descoberta por capability"
                  : "Capability discovery"
                : dictionary.navigation[
                    navItems.find((item) => item.id === active)?.key || "home"
                  ]}
            </strong>
          </div>
          <div>
            {selected &&
              active === "accounts" &&
              portfolioMode === "account" && (
              <label className="v5-account-switch">
                <span>{copy.shell.activeAccount}</span>
                <select
                  value={selected.id}
                  onChange={(event) =>
                    openAccount(
                      event.target.value,
                      accountModeItems.some((item) => item.id === accountMode)
                        ? (accountMode as CurrentAccountMode)
                        : "discovery",
                    )
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
              onClick={() => {
                if (!privateMode) {
                  window.location.assign(
                    "/signin-with-chatgpt?return_to=%2Fworkspace",
                  );
                  return;
                }
                if (!selected) {
                  setModal("new-account");
                  return;
                }
                if (active === "accounts" && portfolioMode === "account") {
                  setModal("information");
                  return;
                }
                setActive("accounts");
                setPortfolioMode("accounts");
                writeLocation({ view: "accounts" });
                notify(
                  locale === "pt-BR"
                    ? "Escolha a conta antes de adicionar informação."
                    : "Choose an account before adding information.",
                );
              }}
            >
              {copy.shell.addInformation}
            </Button>
          </div>
        </div>

        {active === "home" && (
          <KyndrylV4Home
            accounts={v4Accounts}
            locale={locale}
            onOpenAccount={(accountId) => openAccount(accountId, "discovery")}
            onStartDiscovery={(accountId, capabilityKey) =>
              void startCapabilityForAccount(accountId, capabilityKey)
            }
          />
        )}

        {active === "accounts" && portfolioMode === "accounts" && (
          <KyndrylV4Accounts
            accounts={v4Accounts}
            locale={locale}
            onOpenAccount={(accountId) => openAccount(accountId, "discovery")}
            onCreateAccount={privateMode ? () => setModal("new-account") : undefined}
          />
        )}


        {active === "accounts" &&
          portfolioMode === "account" &&
          selected && (
            <section className="v5-page v4-account-page">
              <nav className="v5-breadcrumb" aria-label="Breadcrumb">
                <button
                  onClick={() => {
                    setPortfolioMode("accounts");
                    setEntryCapabilityKey(null);
                    writeLocation({ view: "accounts" });
                  }}
                >
                  {locale === "pt-BR" ? "Contas" : "Accounts"}
                </button>
                <span>/</span>
                <strong>{selected.customerName}</strong>
              </nav>
              <header className="v5-account-hero v4-account-hero">
                <div>
                  <span>
                    {selected.industry} · {selected.companySize} · {selected.owner}
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
                      {selected.priority === "Alta"
                        ? copy.priority.high
                        : selected.priority === "Média"
                          ? copy.priority.medium
                          : copy.priority.low}
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
                className="v5-account-tabs v4-account-tabs"
                aria-label={copy.modes.accountWorkspace}
              >
                {accountModeItems.map((item) => (
                  <button
                    key={item.id}
                    className={accountMode === item.id ? "active" : ""}
                    aria-current={accountMode === item.id ? "page" : undefined}
                    onClick={() => {
                      setAccountMode(item.id);
                      if (item.id !== "discovery") setEntryCapabilityKey(null);
                      writeLocation({
                        view: "accounts",
                        accountId: selected.id,
                        tab: item.id,
                        capability:
                          item.id === "discovery" ? entryCapabilityKey : null,
                      });
                    }}
                  >
                    {copy.modes[item.key]}
                  </button>
                ))}
              </nav>

              {accountMode === "discovery" && (
                <GuidedDiscoveryWorkspace
                  open
                  variant="embedded"
                  initialPillarKey={entryCapabilityKey}
                  accountName={selected.customerName}
                  discovery={
                    guidedDiscovery as unknown as GuidedDiscoveryView | null
                  }
                  stakeholders={stakeholders.map((person) => ({
                    id: person.id,
                    name: person.name,
                    role: person.role,
                  }))}
                  saving={saving}
                  onClose={() => setEntryCapabilityKey(null)}
                  onStart={async (guidedMode, pillars) => {
                    const capabilityKey =
                      guidedMode === "direct" ? pillars[0] || null : null;
                    setEntryCapabilityKey(capabilityKey);
                    writeLocation({
                      view: "accounts",
                      accountId: selected.id,
                      tab: "discovery",
                      capability: capabilityKey,
                    });
                    return guidedMutation(
                      "/sessions",
                      "POST",
                      {
                        mode: guidedMode,
                        selectedPillars: pillars,
                        pillarKey: capabilityKey,
                      },
                      copy.notifications.discoveryStarted,
                    );
                  }}
                  onAnswer={async (payload) => {
                    const result = await guidedMutation(
                      "/answers",
                      "POST",
                      payload,
                      String(payload.status) === "draft"
                        ? copy.notifications.draftSaved
                        : String(payload.status) === "unknown"
                          ? copy.notifications.gapSaved
                          : copy.notifications.answerSaved,
                    );
                    return result
                      ? {
                          ...result,
                          answerImpact: result.answerImpact,
                        }
                      : result;
                  }}
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
              )}

              {accountMode === "relationships" && (
                <KyndrylV4RelationshipsPanel
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
                  capabilities={relationshipCapabilities}
                  capabilityAssignments={selectedCapabilityAssignments.map(
                    (assignment) => ({
                      id: assignment.id,
                      stakeholderId: assignment.stakeholderId,
                      capabilityKey: assignment.capabilityKey,
                      role: assignment.role,
                      status: assignment.status,
                      evidence: assignment.evidence.map((evidence, index) => ({
                        id: `${assignment.id}:evidence:${index}`,
                        title: evidence.title,
                        excerpt: evidence.excerpt,
                        sourceType: evidence.sourceType,
                        updatedAt: evidence.occurredAt,
                      })),
                    }),
                  )}
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
                      stakeholders.find((item) => item.id === person.id) || null,
                    );
                    setModal("stakeholder");
                  }}
                  onRequestAddStakeholder={() => {
                    setEditingStakeholder(null);
                    setModal("stakeholder");
                  }}
                  onRequestAssignment={(stakeholderId, capabilityKey) => {
                    const person = stakeholders.find(
                      (item) => item.id === stakeholderId,
                    );
                    if (!person) {
                      if (capabilityKey) {
                        setPendingCapabilityAssignmentKey(capabilityKey);
                        setModal("capability-assignment");
                      } else {
                        notify(
                          locale === "pt-BR"
                            ? "Selecione uma pessoa para atribuir a capability."
                            : "Select a person to assign the capability.",
                        );
                      }
                      return;
                    }
                    setPendingCapabilityAssignmentKey(capabilityKey || null);
                    setEditingStakeholder(person);
                    setModal("stakeholder");
                  }}
                  onConfirmAssignment={async (assignment) => {
                    const person = stakeholders.find(
                      (item) => item.id === assignment.stakeholderId,
                    );
                    if (!person) return;
                    const currentAssignments = selectedCapabilityAssignments
                      .filter((item) => item.stakeholderId === person.id)
                      .map((item) => ({
                        capabilityKey: item.capabilityKey,
                        role: item.role,
                        status:
                          item.id === assignment.id ? "confirmed" : item.status,
                        confidence: item.confidence,
                        sourceType: item.sourceType,
                        sourceId: item.sourceId,
                        evidence: item.evidence,
                      }));
                    await mutate(
                      {
                        action: "stakeholder_upsert",
                        id: selected.id,
                        stakeholderId: person.id,
                        name: person.name,
                        role: person.role,
                        area: person.area,
                        reportsToId: person.reportsToId,
                        influence: person.influence,
                        stance: person.stance,
                        priorities: person.priorities,
                        notes: person.notes,
                        capabilityAssignments: currentAssignments,
                      },
                      copy.notifications.stakeholderSaved,
                    );
                  }}
                />
              )}

              {accountMode === "strategy" && (
                <KyndrylV4StrategyPanel
                  technologies={opportunityTechnologies}
                  stakeholderCoverage={stakeholderCoverage}
                  snapshots={opportunitySnapshots}
                  hypotheses={hypotheses.map((item) => ({
                    id: item.id,
                    title: item.title,
                    status: item.stage,
                    confidence: item.confidence,
                    evidenceCount: item.evidence.length,
                    gaps: item.gaps,
                    nextStep: item.nextStep,
                  }))}
                  accountPlan={
                    plan
                      ? {
                          priorities: plan.priorities,
                          days30: plan.plan30,
                          days60: plan.plan60,
                          days90: plan.plan90,
                          updatedAt: plan.updatedAt,
                        }
                      : null
                  }
                  intelligenceStatus={
                    isWatsonxProvider(aiStatus?.provider)
                      ? "watsonx"
                      : "deterministic"
                  }
                  readOnly={!privateMode}
                  onEditAccountPlan={
                    privateMode ? () => setModal("plan") : undefined
                  }
                  onReviewTechnology={(technologyId) => {
                    const technologyName =
                      opportunityTechnologies.find(
                        (technology) => technology.id === technologyId,
                      )?.name || technologyId;
                    setAccountMode("governance");
                    setEntryCapabilityKey(null);
                    writeLocation({
                      view: "accounts",
                      accountId: selected.id,
                      tab: "governance",
                    });
                    notify(
                      locale === "pt-BR"
                        ? `Governança aberta para revisar ${technologyName}. Use o filtro de tecnologia para isolar o impacto.`
                        : `Governance opened for ${technologyName}. Use the technology filter to isolate its impact.`,
                    );
                  }}
                  onReviewHypothesis={(hypothesisId) =>
                    void previewCrmHandoff(hypothesisId)
                  }
                />
              )}

              {accountMode === "governance" && (
                <KyndrylV4GovernancePanel
                  ledger={governanceLedger}
                  evidence={governanceEvidence}
                  meetings={governanceMeetings}
                  documents={governanceDocuments}
                  auditEvents={governanceAuditEvents}
                  onSelectAnswer={(answerId) => {
                    const target = document.getElementById(
                      `answer-impact-${answerId}`,
                    );
                    target?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              )}
            </section>
          )}


        {active === "settings" && (
          <SettingsView
            key={selected?.id || "none"}
            data={data}
            selected={selected}
            aiStatus={aiStatus}
            privateMode={privateMode}
            saving={saving}
            onSettings={(accountId, payload) =>
              mutate(
                { action: "account_settings", id: accountId, ...payload },
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
        capabilities={relationshipCapabilities}
        assignments={selectedCapabilityAssignments.filter(
          (item) => item.stakeholderId === editingStakeholder?.id,
        )}
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
      <CapabilityAssignmentModal
        open={modal === "capability-assignment"}
        account={selected}
        capability={relationshipCapabilities.find(
          (item) => item.key === pendingCapabilityAssignmentKey,
        )}
        people={stakeholders}
        saving={saving}
        onClose={() => {
          setModal(null);
          setPendingCapabilityAssignmentKey(null);
        }}
        onSave={async ({ stakeholderId, role }) => {
          if (!selected || !pendingCapabilityAssignmentKey) return;
          const person = stakeholders.find((item) => item.id === stakeholderId);
          if (!person) return;
          const capabilityAssignments = data.stakeholderCapabilityAssignments
            .filter(
              (item) =>
                item.discoveryId === selected.id &&
                item.stakeholderId === stakeholderId &&
                item.status !== "dismissed" &&
                item.capabilityKey !== pendingCapabilityAssignmentKey,
            )
            .map((item) => ({
              capabilityKey: item.capabilityKey,
              role: item.role,
              status: item.status,
              confidence: item.confidence,
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              evidence: item.evidence,
            }));
          capabilityAssignments.push({
            capabilityKey: pendingCapabilityAssignmentKey,
            role,
            status: "confirmed",
            confidence: 100,
            sourceType: "manual",
            sourceId: null,
            evidence: [],
          });
          const result = await mutate(
            {
              action: "stakeholder_upsert",
              id: selected.id,
              stakeholderId: person.id,
              name: person.name,
              role: person.role,
              area: person.area,
              reportsToId: person.reportsToId,
              influence: person.influence,
              stance: person.stance,
              priorities: person.priorities,
              notes: person.notes,
              capabilityAssignments,
            },
            copy.notifications.stakeholderSaved,
          );
          if (result) {
            setModal(null);
            setPendingCapabilityAssignmentKey(null);
          }
        }}
      />
      <AccountPlanModal
        open={modal === "plan"}
        account={selected}
        plan={plan}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={async (payload) => {
          if (!selected) return;
          const result = await mutate(
            { action: "plan_save", id: selected.id, ...payload },
            copy.notifications.planSaved,
          );
          if (result) setModal(null);
        }}
      />
    </div>
  );
}

function SettingsView({
  data,
  selected,
  aiStatus,
  privateMode,
  saving,
  onSettings,
}: {
  data: ApiData;
  selected?: Discovery;
  aiStatus: AIStatus | null;
  privateMode: boolean;
  saving: boolean;
  onSettings: (
    accountId: string,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
}) {
  const { locale, copy } = usePageCopy();
  const [settingsSection, setSettingsSection] = useState<
    "overview" | "account-policies"
  >("overview");
  const controls = [
    copy.settings.controlAuthorization,
    copy.settings.controlDemo,
    copy.settings.controlSources,
    copy.settings.controlApproval,
    copy.settings.controlQuota,
    copy.settings.controlRollback,
  ];

  if (settingsSection === "account-policies") {
    return (
      <AccountPoliciesView
        data={data}
        selectedId={selected?.id}
        privateMode={privateMode}
        saving={saving}
        onBack={() => setSettingsSection("overview")}
        onSettings={onSettings}
      />
    );
  }

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
        <button
          type="button"
          className="v5-card v5-settings-entry"
          onClick={() => setSettingsSection("account-policies")}
        >
          <span>
            <small>{copy.settings.accountPolicies}</small>
            <strong>{copy.settings.policyAssignments}</strong>
            <p>{copy.settings.accountPoliciesDescription}</p>
          </span>
          <span className="v5-settings-entry-metrics">
            <Tag type="blue">
              {data.discoveries.length} {copy.settings.accounts}
            </Tag>
            <Tag type="red">
              {
                data.discoveries.filter(
                  (account) => account.dataClassification === "confidential",
                ).length
              }{" "}
              {copy.settings.confidentialAccounts}
            </Tag>
          </span>
          <span className="v5-settings-entry-action">
            {copy.settings.managePolicies}
            <ArrowRight size={20} />
          </span>
        </button>
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

function AccountPoliciesView({
  data,
  selectedId,
  privateMode,
  saving,
  onBack,
  onSettings,
}: {
  data: ApiData;
  selectedId?: string;
  privateMode: boolean;
  saving: boolean;
  onBack: () => void;
  onSettings: (
    accountId: string,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
}) {
  const { copy, formatDate } = usePageCopy();
  const [policyAccountId, setPolicyAccountId] = useState(
    selectedId || data.discoveries[0]?.id || "",
  );
  const policyAccount =
    data.discoveries.find((account) => account.id === policyAccountId) ||
    data.discoveries[0];
  const [classification, setClassification] = useState<
    Discovery["dataClassification"]
  >(policyAccount?.dataClassification || "test");
  const [domain, setDomain] = useState(policyAccount?.companyDomain || "");
  const confidentialCount = data.discoveries.filter(
    (account) => account.dataClassification === "confidential",
  ).length;
  const confirmedDomainCount = data.discoveries.filter((account) =>
    Boolean(account.companyDomain),
  ).length;

  useEffect(() => {
    if (!policyAccount) return;
    const timer = window.setTimeout(() => {
      setClassification(policyAccount.dataClassification);
      setDomain(policyAccount.companyDomain || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [policyAccount]);

  const resetEditor = () => {
    setClassification(policyAccount?.dataClassification || "test");
    setDomain(policyAccount?.companyDomain || "");
  };

  return (
    <section className="v5-page">
      <Button
        className="v5-settings-back"
        kind="ghost"
        size="sm"
        renderIcon={ArrowLeft}
        onClick={onBack}
      >
        {copy.settings.backSettings}
      </Button>
      <PageHeading
        eyebrow={`${copy.settings.eyebrow} · ${copy.settings.accountPolicies}`}
        title={copy.settings.policyAssignments}
        description={copy.settings.policyAssignmentsDescription}
      />

      <div className="v5-policy-summary" aria-label={copy.settings.policySummary}>
        <article>
          <span>{copy.settings.accounts}</span>
          <strong>{data.discoveries.length}</strong>
        </article>
        <article>
          <span>{copy.settings.testAccounts}</span>
          <strong>{data.discoveries.length - confidentialCount}</strong>
        </article>
        <article>
          <span>{copy.settings.confidentialAccounts}</span>
          <strong>{confidentialCount}</strong>
        </article>
        <article>
          <span>{copy.settings.domainsConfirmed}</span>
          <strong>
            {confirmedDomainCount}/{data.discoveries.length}
          </strong>
        </article>
      </div>

      <div className="v5-policy-layout">
        <section className="v5-card v5-policy-table-card">
          <TableContainer
            title={copy.settings.assignedPolicies}
            description={copy.settings.selectPolicyHelp}
          >
            <Table size="lg" useZebraStyles={false}>
              <TableHead>
                <TableRow>
                  <TableHeader>{copy.settings.account}</TableHeader>
                  <TableHeader>{copy.settings.assignedPolicy}</TableHeader>
                  <TableHeader>{copy.settings.externalProcessing}</TableHeader>
                  <TableHeader>{copy.settings.confirmedDomain}</TableHeader>
                  <TableHeader>{copy.settings.lastUpdated}</TableHeader>
                  <TableHeader>{copy.settings.action}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.discoveries.map((account) => {
                  const confidential =
                    account.dataClassification === "confidential";
                  const active = account.id === policyAccount?.id;
                  return (
                    <TableRow
                      key={account.id}
                      className={active ? "v5-policy-row-active" : ""}
                    >
                      <TableCell>
                        <span className="v5-policy-account-cell">
                          <strong>{account.customerName}</strong>
                          <small>{account.industry}</small>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Tag type={confidential ? "red" : "blue"}>
                          {confidential
                            ? copy.settings.confidentialPolicy
                            : copy.settings.testPolicy}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <Tag type={confidential ? "red" : "green"}>
                          {confidential
                            ? copy.settings.blocked
                            : copy.settings.allowed}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {account.companyDomain ? (
                          account.companyDomain
                        ) : (
                          <Tag type="warm-gray">
                            {copy.settings.domainMissing}
                          </Tag>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(account.updatedAt)}</TableCell>
                      <TableCell>
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => setPolicyAccountId(account.id)}
                        >
                          {copy.settings.editPolicy}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </section>

        <aside className="v5-card v5-policy-editor">
          <CardHeader
            eyebrow={copy.settings.editPolicy}
            title={policyAccount?.customerName || copy.settings.selectAccount}
          />
          {policyAccount ? (
            <div className="v5-settings-form">
              <InlineNotification
                kind={classification === "confidential" ? "warning" : "info"}
                lowContrast
                hideCloseButton
                title={
                  classification === "confidential"
                    ? copy.settings.confidentialImpact
                    : copy.settings.testImpact
                }
                subtitle={copy.settings.policyImpactHelp}
              />
              <Select
                id={`account-classification-${policyAccount.id}`}
                labelText={copy.settings.classification}
                value={classification}
                onChange={(event) =>
                  setClassification(
                    event.target.value as Discovery["dataClassification"],
                  )
                }
                disabled={!privateMode || saving}
              >
                <SelectItem value="test" text={copy.settings.testAllowed} />
                <SelectItem
                  value="confidential"
                  text={copy.settings.confidentialBlocked}
                />
              </Select>
              <TextInput
                id={`company-domain-setting-${policyAccount.id}`}
                labelText={copy.settings.confirmedDomain}
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder={copy.settings.domainPlaceholder}
                disabled={!privateMode || saving}
              />
              <small className="v5-policy-scope-note">
                {copy.settings.changesAccountOnly}
              </small>
              <div className="v5-policy-editor-actions">
                <Button
                  kind="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={resetEditor}
                >
                  {copy.settings.cancel}
                </Button>
                <Button
                  size="sm"
                  disabled={!privateMode || saving}
                  onClick={() =>
                    onSettings(policyAccount.id, {
                      dataClassification: classification,
                      companyDomain: domain,
                    })
                  }
                >
                  {copy.settings.savePolicy}
                </Button>
              </div>
            </div>
          ) : (
            <p>{copy.settings.noAccounts}</p>
          )}
        </aside>
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
  capabilities,
  assignments,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  account?: Discovery;
  stakeholder: Stakeholder | null;
  people: Stakeholder[];
  capabilities: Array<{ key: string; label: string; description?: string }>;
  assignments: StakeholderCapabilityAssignmentRecord[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { locale, dictionary, copy, text } = usePageCopy();
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
            const formData = new FormData(event.currentTarget);
            const base = Object.fromEntries(
              [...formData.entries()].filter(
                ([key]) =>
                  !key.startsWith("capability:") &&
                  !key.startsWith("capabilityRole:"),
              ),
            );
            onSave({
              ...base,
              capabilityAssignments: capabilities
                .filter((capability) =>
                  formData.has(`capability:${capability.key}`),
                )
                .map((capability) => {
                  const existing = assignments.find(
                    (item) => item.capabilityKey === capability.key,
                  );
                  return {
                    capabilityKey: capability.key,
                    role: String(
                      formData.get(`capabilityRole:${capability.key}`) ||
                        existing?.role ||
                        "influencer",
                    ),
                    status: "confirmed",
                    confidence: existing?.confidence || 100,
                    sourceType: existing?.sourceType || "manual",
                    sourceId: existing?.sourceId || null,
                    evidence: existing?.evidence || [],
                  };
                }),
            });
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
          <fieldset className="v4-capability-assignments">
            <legend>
              {copy.modes.relationships} · {copy.modes.discovery}
            </legend>
            <p>
              {locale === "pt-BR"
                ? "Selecione as capabilities pelas quais esta pessoa é responsável e defina seu papel."
                : "Select the capabilities this person is responsible for and define their role."}
            </p>
            <div>
              {capabilities.map((capability) => {
                const assignment = assignments.find(
                  (item) => item.capabilityKey === capability.key,
                );
                return (
                  <div className="v4-capability-assignment-row" key={capability.key}>
                    <Checkbox
                      id={`stakeholder-capability-${capability.key}`}
                      name={`capability:${capability.key}`}
                      labelText={capability.label}
                      defaultChecked={Boolean(assignment)}
                    />
                    <Select
                      id={`stakeholder-capability-role-${capability.key}`}
                      name={`capabilityRole:${capability.key}`}
                      labelText={
                        locale === "pt-BR" ? "Papel" : "Role"
                      }
                      hideLabel
                      size="sm"
                      defaultValue={assignment?.role || "influencer"}
                    >
                      <SelectItem value="owner" text="Owner" />
                      <SelectItem
                        value="decision_maker"
                        text={
                          locale === "pt-BR"
                            ? "Decisor"
                            : "Decision maker"
                        }
                      />
                      <SelectItem
                        value="influencer"
                        text={
                          locale === "pt-BR"
                            ? "Influenciador"
                            : "Influencer"
                        }
                      />
                      <SelectItem
                        value="technical_contact"
                        text={
                          locale === "pt-BR"
                            ? "Contato técnico"
                            : "Technical contact"
                        }
                      />
                    </Select>
                  </div>
                );
              })}
            </div>
          </fieldset>
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

function CapabilityAssignmentModal({
  open,
  account,
  capability,
  people,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  account?: Discovery;
  capability?: { key: string; label: string; description?: string };
  people: Stakeholder[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    stakeholderId: string;
    role: "owner" | "decision_maker" | "influencer" | "technical_contact";
  }) => void;
}) {
  const { locale, copy, dictionary } = usePageCopy();
  return (
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalHeader
        title={locale === "pt-BR" ? "Atribuir capability" : "Assign capability"}
        label={`${account?.customerName || dictionary.common.account} · ${capability?.label || ""}`}
      />
      <ModalBody>
        <form
          id="capability-assignment-form"
          className="v5-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onSave({
              stakeholderId: String(formData.get("stakeholderId") || ""),
              role: String(formData.get("role") || "owner") as
                | "owner"
                | "decision_maker"
                | "influencer"
                | "technical_contact",
            });
          }}
        >
          {capability?.description && <p>{capability.description}</p>}
          {people.length ? (
            <>
              <Select
                id="capability-assignment-person"
                name="stakeholderId"
                labelText={locale === "pt-BR" ? "Pessoa" : "Person"}
                defaultValue={people[0]?.id}
              >
                {people.map((person) => (
                  <SelectItem
                    key={person.id}
                    value={person.id}
                    text={`${person.name} · ${person.role}`}
                  />
                ))}
              </Select>
              <Select
                id="capability-assignment-role"
                name="role"
                labelText={locale === "pt-BR" ? "Responsabilidade" : "Responsibility"}
                defaultValue="owner"
              >
                <SelectItem value="owner" text="Owner" />
                <SelectItem
                  value="decision_maker"
                  text={locale === "pt-BR" ? "Decisor" : "Decision maker"}
                />
                <SelectItem
                  value="influencer"
                  text={locale === "pt-BR" ? "Influenciador" : "Influencer"}
                />
                <SelectItem
                  value="technical_contact"
                  text={locale === "pt-BR" ? "Contato técnico" : "Technical contact"}
                />
              </Select>
            </>
          ) : (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title={locale === "pt-BR" ? "Adicione uma pessoa primeiro" : "Add a person first"}
              subtitle={
                locale === "pt-BR"
                  ? "O organograma precisa de pelo menos uma pessoa antes de atribuir responsabilidades."
                  : "The relationship map needs at least one person before responsibilities can be assigned."
              }
            />
          )}
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button
          type="submit"
          form="capability-assignment-form"
          disabled={saving || !people.length || !capability}
        >
          {saving
            ? locale === "pt-BR"
              ? "Salvando…"
              : "Saving…"
            : locale === "pt-BR"
              ? "Atribuir"
              : "Assign"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function AccountPlanModal({
  open,
  account,
  plan,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  account?: Discovery;
  plan?: Plan;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const { locale, copy, dictionary } = usePageCopy();
  const fields = [
    ["priorities", copy.strategy.priorities],
    ["objectives", copy.strategy.objectives],
    ["initiatives", copy.strategy.initiatives],
    ["risks", copy.strategy.risks],
    ["relationship", copy.strategy.relationshipPlan],
    ["ecosystem", copy.strategy.ecosystem],
    ["plan30", copy.strategy.days30],
    ["plan60", copy.strategy.days60],
    ["plan90", copy.strategy.days90],
  ] as const;
  return (
    <ComposedModal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title={copy.strategy.humanPlan}
        label={account?.customerName || dictionary.common.account}
      />
      <ModalBody hasScrollingContent>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={
            locale === "pt-BR"
              ? "O conteúdo humano sempre prevalece"
              : "Human-authored content always takes precedence"
          }
          subtitle={
            locale === "pt-BR"
              ? "Uma linha por item. Nenhuma recomendação será aplicada sem sua confirmação."
              : "Use one line per item. No recommendation is applied without your confirmation."
          }
        />
        <form id="v4-account-plan-form" className="v5-form two">
          {fields.map(([key, label]) => (
            <TextArea
              key={key}
              id={`v4-plan-${key}`}
              name={key}
              labelText={label}
              rows={4}
              defaultValue={
                ((plan as unknown as Record<string, string[]> | undefined)?.[
                  key
                ] || []).join("\n")
              }
            />
          ))}
        </form>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {copy.modal.cancel}
        </Button>
        <Button
          disabled={saving}
          onClick={() => {
            const form = document.getElementById(
              "v4-account-plan-form",
            ) as HTMLFormElement | null;
            if (!form) return;
            onSave(Object.fromEntries(new FormData(form).entries()));
          }}
        >
          {saving ? copy.modal.applying : copy.strategy.savePlan}
        </Button>
      </ModalFooter>
    </ComposedModal>
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
