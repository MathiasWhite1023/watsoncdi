import { localizedText, type ResponseLocale } from "./api-locale";

export type CommercialScore = {
  name: string;
  short: string;
  alignment: number;
  value: number;
  readiness: number;
  confidence: number;
};

export type CommercialEntity = {
  id: string;
  type: string;
  name: string;
  status?: string;
  confidence?: number;
};

export type CommercialStakeholder = {
  id: string;
  name: string;
  role: string;
  influence: string;
  source?: string;
};

export type CommercialHypothesis = {
  id: string;
  capabilityKey: string;
  title: string;
  problem: string;
  products: string[];
  stakeholderIds: string[];
  evidence: Array<{ sourceId: string; title?: string; excerpt?: string }>;
  gaps: string[];
  confidence: number;
  stage: string;
  nextStep: string;
};

export type CommercialAction = {
  id: string;
  type: string;
  title: string;
  status: string;
  priorityScore: number;
  nextStep: string;
};

export type CommercialState = {
  progress: number;
  stage: string;
  scores: CommercialScore[];
  entities: CommercialEntity[];
  stakeholders: CommercialStakeholder[];
  hypotheses: CommercialHypothesis[];
  actions: CommercialAction[];
  evidenceCount: number;
  memoryVersion: number;
  updatedAt: string;
};

export type ChangeSetSuggestions = {
  stakeholders: string[];
  systems: string[];
  painPoints: string[];
  themes: string[];
  risks: string[];
  nextActions: string[];
};

const byId = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]));

const numberDelta = (before: number, after: number) => after - before;

export function buildAccountChangeSet(
  before: CommercialState,
  after: CommercialState,
  suggestions: ChangeSetSuggestions,
) {
  const previousScores = new Map(
    before.scores.map((score) => [score.short, score]),
  );
  const capabilities = after.scores.map((score) => {
    const previous = previousScores.get(score.short) || {
      alignment: 0,
      value: 0,
      readiness: 0,
      confidence: 0,
    };
    return {
      key: score.short,
      name: score.name,
      before: {
        alignment: previous.alignment,
        value: previous.value,
        readiness: previous.readiness,
        confidence: previous.confidence,
      },
      after: {
        alignment: score.alignment,
        value: score.value,
        readiness: score.readiness,
        confidence: score.confidence,
      },
      delta: {
        alignment: numberDelta(previous.alignment, score.alignment),
        value: numberDelta(previous.value, score.value),
        readiness: numberDelta(previous.readiness, score.readiness),
        confidence: numberDelta(previous.confidence, score.confidence),
      },
    };
  });
  const beforeEntities = byId(before.entities);
  const beforeStakeholders = byId(before.stakeholders);
  const beforeHypotheses = byId(before.hypotheses);
  const beforeActions = byId(before.actions);
  const affectedHypotheses = after.hypotheses
    .filter((item) => {
      const previous = beforeHypotheses.get(item.id);
      return (
        !previous ||
        previous.confidence !== item.confidence ||
        previous.stage !== item.stage ||
        previous.nextStep !== item.nextStep
      );
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      capabilityKey: item.capabilityKey,
      before: beforeHypotheses.get(item.id)
        ? {
            confidence: beforeHypotheses.get(item.id)!.confidence,
            stage: beforeHypotheses.get(item.id)!.stage,
          }
        : null,
      after: { confidence: item.confidence, stage: item.stage },
      nextStep: item.nextStep,
    }));
  const affectedActions = after.actions
    .filter((item) => {
      const previous = beforeActions.get(item.id);
      return (
        !previous ||
        previous.priorityScore !== item.priorityScore ||
        previous.status !== item.status ||
        previous.nextStep !== item.nextStep
      );
    })
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      priorityScore: item.priorityScore,
      nextStep: item.nextStep,
    }));
  return {
    progress: {
      before: before.progress,
      after: after.progress,
      delta: numberDelta(before.progress, after.progress),
    },
    stage: { before: before.stage, after: after.stage },
    capabilities,
    entities: {
      added: after.entities.filter((item) => !beforeEntities.has(item.id)),
      suggested: [
        ...suggestions.systems.map((name) => ({ type: "system", name })),
        ...suggestions.painPoints.map((name) => ({ type: "pain", name })),
        ...suggestions.risks.map((name) => ({ type: "risk", name })),
      ],
    },
    stakeholders: {
      added: after.stakeholders.filter(
        (item) => !beforeStakeholders.has(item.id),
      ),
      suggested: suggestions.stakeholders.map((name) => ({
        name,
        source: "meeting_extraction",
      })),
    },
    hypotheses: affectedHypotheses,
    actions: affectedActions,
    evidence: {
      before: before.evidenceCount,
      after: after.evidenceCount,
      delta: numberDelta(before.evidenceCount, after.evidenceCount),
    },
    memoryVersion: {
      before: before.memoryVersion,
      after: after.memoryVersion,
    },
    suggestedThemes: suggestions.themes,
    suggestedNextActions: suggestions.nextActions,
  };
}

export type LogicalAgentRun = {
  agent: string;
  engineKind: "deterministic" | "model";
  provider: string;
  model: string;
  status: "completed" | "fallback" | "error";
  conclusion: string;
  confidence: number;
  sourceIds: string[];
  output: Record<string, unknown>;
  humanValidationStatus: "pending";
};

export function buildLogicalPipeline(input: {
  provider: string;
  model?: string | null;
  usedModel: boolean;
  sourceIds: string[];
  changeSet: ReturnType<typeof buildAccountChangeSet>;
  locale: ResponseLocale;
}): LogicalAgentRun[] {
  const engineKind: LogicalAgentRun["engineKind"] = input.usedModel
    ? "model"
    : "deterministic";
  const provider = input.usedModel ? input.provider : "deterministic-rules";
  const model = input.usedModel ? input.model || "" : "";
  const status: LogicalAgentRun["status"] = input.usedModel
    ? "completed"
    : "fallback";
  const changedCapabilities = input.changeSet.capabilities.filter((item) =>
    Object.values(item.delta).some((value) => value !== 0),
  );
  const common: Pick<
    LogicalAgentRun,
    | "engineKind"
    | "provider"
    | "model"
    | "status"
    | "sourceIds"
    | "humanValidationStatus"
  > = {
    engineKind,
    provider,
    model,
    status,
    sourceIds: input.sourceIds,
    humanValidationStatus: "pending" as const,
  };
  return [
    {
      ...common,
      agent: "source-normalizer",
      confidence: 100,
      conclusion: localizedText(
        input.locale,
        "The original meeting was stored and normalized as account evidence.",
        "A reunião original foi armazenada e normalizada como evidência da conta.",
      ),
      output: { sourceCount: input.sourceIds.length },
    },
    {
      ...common,
      agent: "account-memory",
      confidence: 82,
      conclusion: localizedText(
        input.locale,
        "Account memory was recalculated from recorded sources.",
        "A memória da conta foi recalculada a partir das fontes registradas.",
      ),
      output: input.changeSet.memoryVersion,
    },
    {
      ...common,
      agent: "stakeholder-intelligence",
      confidence: input.changeSet.stakeholders.suggested.length ? 72 : 55,
      conclusion: localizedText(
        input.locale,
        `${input.changeSet.stakeholders.suggested.length} stakeholder suggestion(s) await human review.`,
        `${input.changeSet.stakeholders.suggested.length} sugestão(ões) de stakeholder aguardam revisão humana.`,
      ),
      output: input.changeSet.stakeholders,
    },
    {
      ...common,
      agent: "capability-fit",
      confidence: 78,
      conclusion: localizedText(
        input.locale,
        `${changedCapabilities.length} capability assessment(s) changed.`,
        `${changedCapabilities.length} avaliação(ões) de capacidade foram alteradas.`,
      ),
      output: { capabilities: changedCapabilities },
    },
    {
      ...common,
      agent: "opportunity-hypothesis",
      confidence: 76,
      conclusion: localizedText(
        input.locale,
        `${input.changeSet.hypotheses.length} opportunity hypothesis/hypotheses were affected.`,
        `${input.changeSet.hypotheses.length} hipótese(s) de oportunidade foram afetadas.`,
      ),
      output: { hypotheses: input.changeSet.hypotheses },
    },
    {
      ...common,
      agent: "next-best-action",
      confidence: 78,
      conclusion: localizedText(
        input.locale,
        `${input.changeSet.actions.length} next action(s) were recalculated.`,
        `${input.changeSet.actions.length} próxima(s) ação(ões) foram recalculadas.`,
      ),
      output: { actions: input.changeSet.actions },
    },
    {
      ...common,
      agent: "governance",
      confidence: 100,
      conclusion: localizedText(
        input.locale,
        "Derived changes remain proposals until a person approves or rejects them.",
        "As mudanças derivadas permanecem propostas até aprovação ou rejeição humana.",
      ),
      output: { status: "pending_review", externalWrite: false },
    },
  ];
}

export type ImpactInput = {
  discoveryStartedAt: string;
  qualifiedAt: string | null;
  computedAt: string;
  questionsAddressed: number;
  questionsConfirmed: number;
  discoveryCoverage: number;
  openGaps: number;
  evidenceCount: number;
  confirmedEvidenceCount: number;
  meetingCount: number;
  qualifiedHypothesisCount: number;
};

export function buildImpactMetrics(input: ImpactInput) {
  const end = input.qualifiedAt || input.computedAt;
  const elapsedMinutes = Math.max(
    0,
    Math.round(
      (new Date(end).getTime() - new Date(input.discoveryStartedAt).getTime()) /
        60_000,
    ),
  );
  return {
    ...input,
    elapsedMinutes,
    methodology: {
      elapsedMinutes:
        "Wall-clock time from the first recorded discovery source to the first qualified hypothesis, or to the current calculation while unqualified.",
      discoveryCoverage:
        "Confirmed guided-discovery coverage reported by the latest session.",
      evidence:
        "Counts recorded account events; confirmedEvidenceCount excludes assumptions, gaps, and stale evidence.",
      claims:
        "No percentage of time saved is inferred. A reduction claim requires a measured manual baseline and comparable assisted sessions.",
    },
  };
}

export function buildCrmHandoff(input: {
  account: {
    id: string;
    name: string;
    industry: string;
    owner: string;
    stage: string;
    progress: number;
    summary: string;
  };
  hypothesis: CommercialHypothesis | null;
  score: CommercialScore | null;
  stakeholders: CommercialStakeholder[];
  objectives: string[];
  sourceIds: string[];
  locale: ResponseLocale;
}) {
  const hypothesis = input.hypothesis;
  const score = input.score;
  const relevantStakeholders = input.stakeholders.filter(
    (person) =>
      hypothesis?.stakeholderIds.includes(person.id) ||
      (person.influence === "Alta" && person.source !== "suggested"),
  );
  const gates = {
    alignment: {
      passed: Number(score?.alignment || 0) >= 75,
      value: Number(score?.alignment || 0),
      threshold: 75,
    },
    readiness: {
      passed: Number(score?.readiness || 0) >= 60,
      value: Number(score?.readiness || 0),
      threshold: 60,
    },
    confidence: {
      passed: Number(hypothesis?.confidence || 0) >= 70,
      value: Number(hypothesis?.confidence || 0),
      threshold: 70,
    },
    confirmedPain: {
      passed: Boolean(
        hypothesis?.evidence.length || hypothesis?.stage === "qualified",
      ),
    },
    relevantStakeholder: { passed: relevantStakeholders.length > 0 },
    validatedNextStep: { passed: Boolean(hypothesis?.nextStep.trim()) },
  };
  const eligible =
    Boolean(hypothesis) &&
    hypothesis?.stage === "qualified" &&
    Object.values(gates).every((gate) => gate.passed);
  const payload = {
    account: input.account,
    opportunity: {
      title:
        hypothesis?.title ||
        localizedText(
          input.locale,
          "Opportunity hypothesis still under discovery",
          "Hipótese de oportunidade ainda em descoberta",
        ),
      problem: hypothesis?.problem || input.account.summary,
      businessObjectives: input.objectives,
      capability: hypothesis?.capabilityKey || score?.short || null,
      products: hypothesis?.products || [],
      confidence: hypothesis?.confidence || 0,
      stage: hypothesis?.stage || "draft",
      nextStep: hypothesis?.nextStep || "",
      gaps: hypothesis?.gaps || [],
    },
    stakeholders: relevantStakeholders,
    evidence: hypothesis?.evidence || [],
    governance: {
      qualificationGates: gates,
      eligible,
      requiresHumanApproval: true,
      externalWritePerformed: false,
    },
    sourceIds: input.sourceIds,
  };
  const copyText = [
    `${input.account.name} — ${payload.opportunity.title}`,
    `${localizedText(input.locale, "Business problem", "Problema de negócio")}: ${payload.opportunity.problem}`,
    `${localizedText(input.locale, "IBM capability", "Capacidade IBM")}: ${payload.opportunity.capability || "—"}`,
    `${localizedText(input.locale, "Products", "Produtos")}: ${payload.opportunity.products.join(", ") || "—"}`,
    `${localizedText(input.locale, "Stakeholders", "Stakeholders")}: ${relevantStakeholders.map((person) => `${person.name} (${person.role})`).join(", ") || "—"}`,
    `${localizedText(input.locale, "Confidence", "Confiança")}: ${payload.opportunity.confidence}%`,
    `${localizedText(input.locale, "Next step", "Próximo passo")}: ${payload.opportunity.nextStep || "—"}`,
    `${localizedText(input.locale, "Human approval required", "Aprovação humana obrigatória")}: ${eligible ? localizedText(input.locale, "eligible for review", "elegível para revisão") : localizedText(input.locale, "qualification gates still open", "critérios de qualificação ainda abertos")}`,
  ].join("\n");
  return { payload, qualification: { eligible, gates }, copyText };
}
