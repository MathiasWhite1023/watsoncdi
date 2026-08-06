export const HEALTH_SCORE_THRESHOLDS = {
  medium: 40,
  high: 70,
} as const;

export const DEFAULT_CAPABILITY_KEYS = [
  "IBM Z",
  "Infrastructure",
  "Applications",
  "SAP",
  "Operations",
  "Data & AI",
  "Workplace",
  "Cyber Security",
] as const;

export type HealthBand = "low" | "medium" | "high";
export type AccountHealthMetricKey =
  | "opportunityPotential"
  | "preCrmMaturity"
  | "relationshipCoverage"
  | "evidenceConfidence"
  | "discoveryCoverage";

export type CapabilityHealthMetricKey =
  | "alignment"
  | "businessValue"
  | "readiness"
  | "confidence"
  | "discoveryCoverage";

export type HealthPriority = "high" | "medium" | "low";

export type HealthScoreInput = {
  name?: string;
  short?: string;
  alignment?: number;
  value?: number;
  readiness?: number;
  confidence?: number;
  evidence?: string[];
  action?: string;
};

export type HealthAccountInput = {
  id: string;
  customerName: string;
  progress?: number;
  priority?: string;
  updatedAt?: string | null;
  answers?: Array<unknown>;
  scores?: HealthScoreInput[];
};

export type HealthStakeholderInput = {
  id?: string;
  discoveryId: string;
  role?: string;
  area?: string;
  influence?: string;
  stance?: string;
  source?: string;
  status?: string;
  updatedAt?: string | null;
};

export type HealthEvidenceInput = {
  id?: string;
  discoveryId: string;
  evidenceStatus?: string;
  confidence?: number;
  occurredAt?: string | null;
};

export type HealthActionInput = {
  discoveryId: string;
  priorityScore?: number;
  status?: string;
};

export type GuidedDiscoveryHealthInput = {
  discoveryId: string;
  metrics?: {
    confirmedWithEvidence?: number;
    coveragePercent?: number;
  };
  session?: {
    updatedAt?: string | null;
  } | null;
  pillars?: Array<{
    key: string;
    label?: string;
    coveragePercent?: number;
    gaps?: number;
    stale?: number;
  }>;
};

export type HealthCell<TMetric extends string> = {
  metric: TMetric;
  value: number;
  band: HealthBand;
  sourceCount: number;
  lastUpdated: string | null;
};

export type HealthDriver<TMetric extends string> = {
  metric: TMetric;
  value: number;
  direction: "strength" | "gap";
};

export type AccountHealthCell = HealthCell<AccountHealthMetricKey> & {
  destination: "overview" | "activity" | "relationships" | "strategy" | "guided-discovery";
};

export type AccountHealthRow = {
  accountId: string;
  accountName: string;
  priority: HealthPriority;
  actionPriority: number;
  hasSponsor: boolean;
  gapAverage: number;
  principalGap: AccountHealthMetricKey;
  drivers: HealthDriver<AccountHealthMetricKey>[];
  sourceCount: number;
  lastUpdated: string | null;
  cells: Record<AccountHealthMetricKey, AccountHealthCell>;
};

export type CapabilityPlaybookInput = {
  key: string;
  label?: string;
  product?: string;
  question?: string;
  workshop?: string;
  nextStep?: string;
};

export type CapabilityHealthCell = HealthCell<CapabilityHealthMetricKey>;

export type CapabilityHealthRow = {
  capabilityKey: string;
  capabilityLabel: string;
  pillarKey: string;
  principalGap: CapabilityHealthMetricKey;
  drivers: HealthDriver<CapabilityHealthMetricKey>[];
  sourceCount: number;
  lastUpdated: string | null;
  sources: string[];
  gap: string;
  suggestedQuestion: string;
  product: string;
  workshop: string;
  nextStep: string;
  cells: Record<CapabilityHealthMetricKey, CapabilityHealthCell>;
};

export type PortfolioFitCell = {
  capabilityKey: string;
  capabilityLabel: string;
  value: number;
  band: HealthBand;
  sourceCount: number;
  sources: string[];
  nextStep: string;
};

export type PortfolioFitRow = {
  accountId: string;
  accountName: string;
  priority: HealthPriority;
  maturity: number;
  leadingCapability: string;
  leadingFit: number;
  gapAverage: number;
  cells: PortfolioFitCell[];
};

export const ACCOUNT_HEALTH_METRICS: AccountHealthMetricKey[] = [
  "opportunityPotential",
  "preCrmMaturity",
  "relationshipCoverage",
  "evidenceConfidence",
  "discoveryCoverage",
];

export const CAPABILITY_HEALTH_METRICS: CapabilityHealthMetricKey[] = [
  "alignment",
  "businessValue",
  "readiness",
  "confidence",
  "discoveryCoverage",
];

export function clampHealthScore(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, Number(value))));
}

export function healthBand(value: number | null | undefined): HealthBand {
  const score = clampHealthScore(value);
  if (score >= HEALTH_SCORE_THRESHOLDS.high) return "high";
  if (score >= HEALTH_SCORE_THRESHOLDS.medium) return "medium";
  return "low";
}

export function normalizeHealthPriority(value?: string): HealthPriority {
  const normalized = normalizeText(value || "");
  if (["alta", "high", "critical", "critica"].includes(normalized)) return "high";
  if (["media", "medium", "moderate", "moderada"].includes(normalized)) return "medium";
  return "low";
}

export function normalizeCapabilityKey(value: string) {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const aliases: Record<string, string> = {
    "ibm-z": "ibm-z",
    infrastructure: "infrastructure-modernization",
    "infrastructure-modernization": "infrastructure-modernization",
    applications: "application-modernization",
    "application-modernization": "application-modernization",
    sap: "sap-transformation",
    "sap-transformation": "sap-transformation",
    operations: "modern-operations",
    "modern-operations": "modern-operations",
    "data-ai": "data-ai",
    "data-and-ai": "data-ai",
    workplace: "modern-workplace",
    "modern-workplace": "modern-workplace",
    "cyber-security": "cyber-security",
    cybersecurity: "cyber-security",
    finops: "infrastructure-modernization",
    "trusted-data": "data-ai",
    "dados-confiaveis": "data-ai",
    "ai-governance": "data-ai",
    "governanca-de-ia": "data-ai",
    "hybrid-cloud": "infrastructure-modernization",
    "nuvem-hibrida": "infrastructure-modernization",
    automation: "modern-operations",
    automacao: "modern-operations",
    "app-modernization": "application-modernization",
    "modernizacao-de-aplicacoes": "application-modernization",
  };
  return aliases[normalized] || normalized;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latestDate(values: Array<string | null | undefined>) {
  const valid = values
    .filter((value): value is string => Boolean(value) && !Number.isNaN(new Date(value as string).getTime()))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return valid[0] || null;
}

function isConfirmedStakeholder(stakeholder: HealthStakeholderInput) {
  const source = normalizeText(stakeholder.source || "manual");
  const status = normalizeText(stakeholder.status || "confirmed");
  return source !== "suggested" && !["suggested", "proposal", "draft", "discarded"].includes(status);
}

function isExecutiveRole(role?: string) {
  return /\b(ceo|cfo|cio|cto|ciso|coo|chief|president|presidente|vice[ -]?president|vp|diretor(?:a)?|director|head)\b/i.test(role || "");
}

function isHighInfluence(influence?: string) {
  return ["alta", "high"].includes(normalizeText(influence || ""));
}

function isAllied(stance?: string) {
  return ["aliado", "aliada", "ally", "supporter", "champion"].includes(normalizeText(stance || ""));
}

export function calculateRelationshipCoverage(stakeholders: HealthStakeholderInput[]) {
  const confirmed = stakeholders.filter(isConfirmedStakeholder);
  const confirmedPeople = Math.min(25, (confirmed.length / 4) * 25);
  const executivePresence = confirmed.some((person) => isExecutiveRole(person.role)) ? 30 : 0;
  const highInfluence = Math.min(25, (confirmed.filter((person) => isHighInfluence(person.influence)).length / 2) * 25);
  const distinctAreas = new Set(confirmed.map((person) => normalizeText(person.area || "")).filter(Boolean)).size;
  const areaDiversity = Math.min(20, (distinctAreas / 4) * 20);
  return clampHealthScore(confirmedPeople + executivePresence + highInfluence + areaDiversity);
}

export function hasConfirmedSponsor(stakeholders: HealthStakeholderInput[]) {
  return stakeholders.some((person) => {
    if (!isConfirmedStakeholder(person)) return false;
    const explicitSponsor = /\b(sponsor|champion|patrocinador(?:a)?)\b/i.test(person.role || "");
    return explicitSponsor || (isHighInfluence(person.influence) && (isAllied(person.stance) || isExecutiveRole(person.role)));
  });
}

export function calculateEvidenceConfidence(events: HealthEvidenceInput[], scoreFallback: HealthScoreInput[] = []) {
  if (!events.length) {
    return clampHealthScore(average(scoreFallback.map((score) => clampHealthScore(score.confidence))));
  }
  const meanConfidence = average(events.map((event) => clampHealthScore(event.confidence ?? 50)));
  const staleRatio = events.filter((event) => normalizeText(event.evidenceStatus || "") === "stale").length / events.length;
  return clampHealthScore(meanConfidence - staleRatio * 25);
}

function activeActionPriority(actions: HealthActionInput[]) {
  const inactive = new Set(["completed", "discarded", "snoozed"]);
  return clampHealthScore(Math.max(0, ...actions.filter((action) => !inactive.has(normalizeText(action.status || "proposal"))).map((action) => action.priorityScore || 0)));
}

function accountHealthCell(
  metric: AccountHealthMetricKey,
  value: number,
  sourceCount: number,
  lastUpdated: string | null,
  destination: AccountHealthCell["destination"],
): AccountHealthCell {
  const score = clampHealthScore(value);
  return { metric, value: score, band: healthBand(score), sourceCount, lastUpdated, destination };
}

export function calculateAccountHealth(
  account: HealthAccountInput,
  context: {
    stakeholders?: HealthStakeholderInput[];
    events?: HealthEvidenceInput[];
    actions?: HealthActionInput[];
    guidedDiscovery?: GuidedDiscoveryHealthInput | null;
  } = {},
): AccountHealthRow {
  const scores = account.scores || [];
  const stakeholders = (context.stakeholders || []).filter((item) => item.discoveryId === account.id);
  const events = (context.events || []).filter((item) => item.discoveryId === account.id);
  const actions = (context.actions || []).filter((item) => item.discoveryId === account.id);
  const guided = context.guidedDiscovery?.discoveryId === account.id ? context.guidedDiscovery : null;
  const opportunityPotential = clampHealthScore(Math.max(0, ...scores.map((score) => score.alignment || 0)));
  const evidenceCount = new Set(scores.flatMap((score) => score.evidence || [])).size;
  const confirmedStakeholders = stakeholders.filter(isConfirmedStakeholder);
  const eventUpdatedAt = latestDate(events.map((event) => event.occurredAt));
  const relationshipUpdatedAt = latestDate(stakeholders.map((person) => person.updatedAt));
  const guidedUpdatedAt = guided?.session?.updatedAt || account.updatedAt || null;

  const cells: Record<AccountHealthMetricKey, AccountHealthCell> = {
    opportunityPotential: accountHealthCell("opportunityPotential", opportunityPotential, evidenceCount, account.updatedAt || eventUpdatedAt, "strategy"),
    preCrmMaturity: accountHealthCell("preCrmMaturity", account.progress || 0, account.answers?.length || scores.length, account.updatedAt || eventUpdatedAt, "overview"),
    relationshipCoverage: accountHealthCell("relationshipCoverage", calculateRelationshipCoverage(stakeholders), confirmedStakeholders.length, relationshipUpdatedAt || account.updatedAt || null, "relationships"),
    evidenceConfidence: accountHealthCell("evidenceConfidence", calculateEvidenceConfidence(events, scores), events.length || evidenceCount, eventUpdatedAt || account.updatedAt || null, "activity"),
    discoveryCoverage: accountHealthCell("discoveryCoverage", guided?.metrics?.coveragePercent || 0, guided?.metrics?.confirmedWithEvidence || 0, guidedUpdatedAt, "guided-discovery"),
  };
  const orderedCells = ACCOUNT_HEALTH_METRICS.map((metric) => cells[metric]);
  const principalGap = [...orderedCells].sort((a, b) => a.value - b.value)[0]?.metric || "discoveryCoverage";
  const strongestMetric = [...orderedCells].sort((a, b) => b.value - a.value)[0]?.metric || "opportunityPotential";
  const gapAverage = clampHealthScore(average(orderedCells.map((cell) => 100 - cell.value)));

  return {
    accountId: account.id,
    accountName: account.customerName,
    priority: normalizeHealthPriority(account.priority),
    actionPriority: activeActionPriority(actions),
    hasSponsor: hasConfirmedSponsor(stakeholders),
    gapAverage,
    principalGap,
    drivers: [
      { metric: strongestMetric, value: cells[strongestMetric].value, direction: "strength" },
      { metric: principalGap, value: cells[principalGap].value, direction: "gap" },
    ],
    sourceCount: new Set([
      ...events.map((event, index) => event.id || `event-${index}`),
      ...scores.flatMap((score) => score.evidence || []),
      ...confirmedStakeholders.map((person, index) => person.id || `stakeholder-${index}`),
    ]).size,
    lastUpdated: latestDate([account.updatedAt, eventUpdatedAt, relationshipUpdatedAt, guidedUpdatedAt]),
    cells,
  };
}

export function buildAccountHealthPortfolio(
  accounts: HealthAccountInput[],
  context: {
    stakeholders?: HealthStakeholderInput[];
    events?: HealthEvidenceInput[];
    actions?: HealthActionInput[];
    guidedDiscoveries?: GuidedDiscoveryHealthInput[];
  } = {},
) {
  return accounts
    .map((account) => calculateAccountHealth(account, {
      stakeholders: context.stakeholders,
      events: context.events,
      actions: context.actions,
      guidedDiscovery: context.guidedDiscoveries?.find((item) => item.discoveryId === account.id),
    }))
    .sort((a, b) => b.actionPriority - a.actionPriority || b.gapAverage - a.gapAverage || a.accountName.localeCompare(b.accountName));
}

function capabilityScore(account: HealthAccountInput, capability: string) {
  const key = normalizeCapabilityKey(capability);
  return (account.scores || []).find((score) => normalizeCapabilityKey(score.short || score.name || "") === key);
}

function capabilityCell(
  metric: CapabilityHealthMetricKey,
  value: number | undefined,
  sourceCount: number,
  lastUpdated: string | null,
): CapabilityHealthCell {
  const score = clampHealthScore(value || 0);
  return { metric, value: score, band: healthBand(score), sourceCount, lastUpdated };
}

export function buildCapabilityHealth(input: {
  account: HealthAccountInput;
  guidedDiscovery?: GuidedDiscoveryHealthInput | null;
  playbooks?: CapabilityPlaybookInput[];
  capabilities?: readonly string[];
}) {
  const capabilities = input.capabilities || DEFAULT_CAPABILITY_KEYS;
  return capabilities.map<CapabilityHealthRow>((capability) => {
    const score = capabilityScore(input.account, capability);
    const playbook = input.playbooks?.find((item) => normalizeCapabilityKey(item.key) === normalizeCapabilityKey(capability));
    const pillarKey = normalizeCapabilityKey(capability);
    const pillar = input.guidedDiscovery?.pillars?.find((item) => normalizeCapabilityKey(item.key || item.label || "") === pillarKey);
    const sources = score?.evidence || [];
    const sourceCount = sources.length;
    const updatedAt = input.guidedDiscovery?.session?.updatedAt || input.account.updatedAt || null;
    const cells: Record<CapabilityHealthMetricKey, CapabilityHealthCell> = {
      alignment: capabilityCell("alignment", score?.alignment, sourceCount, input.account.updatedAt || null),
      businessValue: capabilityCell("businessValue", score?.value, sourceCount, input.account.updatedAt || null),
      readiness: capabilityCell("readiness", score?.readiness, sourceCount, input.account.updatedAt || null),
      confidence: capabilityCell("confidence", score?.confidence, sourceCount, input.account.updatedAt || null),
      discoveryCoverage: capabilityCell("discoveryCoverage", pillar?.coveragePercent, input.guidedDiscovery?.metrics?.confirmedWithEvidence || 0, updatedAt),
    };
    const principalGap = [...CAPABILITY_HEALTH_METRICS].sort((a, b) => cells[a].value - cells[b].value)[0] || "discoveryCoverage";
    const strongestMetric = [...CAPABILITY_HEALTH_METRICS].sort((a, b) => cells[b].value - cells[a].value)[0] || "alignment";
    return {
      capabilityKey: playbook?.key || capability,
      capabilityLabel: playbook?.label || playbook?.key || capability,
      pillarKey,
      principalGap,
      drivers: [
        { metric: strongestMetric, value: cells[strongestMetric].value, direction: "strength" },
        { metric: principalGap, value: cells[principalGap].value, direction: "gap" },
      ],
      sourceCount,
      lastUpdated: updatedAt,
      sources,
      gap: score?.action || "",
      suggestedQuestion: playbook?.question || "",
      product: playbook?.product || "",
      workshop: playbook?.workshop || "",
      nextStep: playbook?.nextStep || score?.action || "",
      cells,
    };
  });
}

export function buildPortfolioFit(
  accounts: HealthAccountInput[],
  capabilities: readonly string[] = DEFAULT_CAPABILITY_KEYS,
) {
  return accounts.map<PortfolioFitRow>((account) => {
    const cells = capabilities.map<PortfolioFitCell>((capability) => {
      const score = capabilityScore(account, capability);
      const value = clampHealthScore(score?.alignment || 0);
      return {
        capabilityKey: capability,
        capabilityLabel: capability,
        value,
        band: healthBand(value),
        sourceCount: score?.evidence?.length || 0,
        sources: score?.evidence || [],
        nextStep: score?.action || "",
      };
    });
    const leading = [...cells].sort((a, b) => b.value - a.value)[0];
    return {
      accountId: account.id,
      accountName: account.customerName,
      priority: normalizeHealthPriority(account.priority),
      maturity: clampHealthScore(account.progress || 0),
      leadingCapability: leading?.capabilityLabel || "",
      leadingFit: leading?.value || 0,
      gapAverage: clampHealthScore(average(cells.map((cell) => 100 - cell.value))),
      cells,
    };
  });
}
