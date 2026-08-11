import type { Locale } from "../i18n";
import type {
  AssessmentAnswer,
  AssessmentEvidence,
  KyndrylAssessment,
  KyndrylTechnologyScore,
} from "../kyndryl-discovery";
import {
  CDI_CAPABILITIES,
  CDI_CAPABILITY_CATALOG_VERSION,
  CDI_CAPABILITY_KEYS,
  CDI_JOURNEYS,
  CDI_PRACTICES,
  CDI_QUESTIONS,
  CDI_TECHNOLOGIES,
  cdiCapability,
  cdiQuestion,
  coreQuestionsForCapability,
  deepQuestionsForCapability,
  localizeCdi,
  type CdiCapabilityKey,
  type CdiResponse,
  type CdiTechnologyProfile,
  type MaturityDimension,
} from "./capability-driven";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[], fallback = 0) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

const RESPONSE_ALIASES: Record<string, CdiResponse> = {
  yes: "YES", sim: "YES", true: "YES", "1": "YES",
  no: "NO", não: "NO", nao: "NO", false: "NO", "0": "NO",
  "not applicable": "NOT_APPLICABLE", not_applicable: "NOT_APPLICABLE", "não se aplica": "NOT_APPLICABLE", "nao se aplica": "NOT_APPLICABLE", "n/a": "NOT_APPLICABLE",
  "don't know": "DONT_KNOW", "dont know": "DONT_KNOW", dont_know: "DONT_KNOW", "não sei": "DONT_KNOW", "nao sei": "DONT_KNOW", unknown: "DONT_KNOW",
};

export function normalizeCdiResponse(answer: AssessmentAnswer): CdiResponse {
  if (answer.status === "unknown") return "DONT_KNOW";
  const raw = String(answer.structured?.value ?? answer.structured?.response ?? "").trim().toLowerCase();
  return RESPONSE_ALIASES[raw] || "DONT_KNOW";
}

export type CapabilityConflict = {
  capabilityKey: CdiCapabilityKey;
  dimension: MaturityDimension;
  evidenceIds: string[];
  reason: string;
};

export type CapabilityDrivenAssessment = KyndrylAssessment & {
  engine: "deterministic";
  context: { total: number; answered: number };
  conflicts: CapabilityConflict[];
  capabilityReviews: Array<{
    key: CdiCapabilityKey;
    status: "NOT_STARTED" | "CORE_IN_PROGRESS" | "DEEP_REQUIRED" | "REVIEW_READY";
    coreAnswered: number;
    coreTotal: number;
    deepAnswered: number;
    deepTotal: number;
    confidence: number;
    conflict: boolean;
    nextQuestionId: string | null;
    reason: string;
  }>;
  practices: Array<{
    id: string;
    name: string;
    score: number;
    capabilityKeys: CdiCapabilityKey[];
    evidenceCount: number;
  }>;
  trace: Array<{
    questionId: string;
    response: CdiResponse;
    evidenceId: string | null;
    capabilityKey: CdiCapabilityKey;
    journeyIds: string[];
    technologyIds: string[];
    technologyNames: string[];
    practiceIds: string[];
  }>;
};

function evidenceFromAnswers(answers: AssessmentAnswer[], locale: Locale) {
  const evidence: AssessmentEvidence[] = [];
  let dontKnowAnswers = 0;
  let notApplicableAnswers = 0;
  let knownAnswers = 0;
  const responseByQuestion = new Map<string, CdiResponse>();
  const confidenceByQuestion = new Map<string, number>();
  for (const answer of answers.filter((item) => item.status !== "draft")) {
    const question = cdiQuestion(answer.questionId);
    if (!question) continue;
    const response = normalizeCdiResponse(answer);
    responseByQuestion.set(question.id, response);
    confidenceByQuestion.set(question.id, clamp(Number(answer.confidence ?? 70)));
    if (response === "DONT_KNOW") {
      dontKnowAnswers += 1;
      continue;
    }
    if (response === "NOT_APPLICABLE") {
      notApplicableAnswers += 1;
      continue;
    }
    knownAnswers += 1;
    const mapping = question.mappings[response];
    const capability = cdiCapability(question.capabilityKey)!;
    const technologyIds = CDI_TECHNOLOGIES.filter(
      (profile) =>
        profile.requiredEvidence.includes(mapping.evidenceId) ||
        profile.supportingEvidence.includes(mapping.evidenceId) ||
        profile.contradictoryEvidence.includes(mapping.evidenceId),
    ).map((profile) => profile.id);
    evidence.push({
      id: mapping.evidenceId,
      questionId: question.id,
      question: localizeCdi(question.prompt, locale),
      response,
      label: localizeCdi(mapping.label, locale),
      polarity: mapping.polarity,
      strength: mapping.strength,
      technologyFit: mapping.polarity === "GAP" ? mapping.strength : Math.max(10, 100 - mapping.strength),
      capabilityIds: [question.capabilityKey],
      journeyIds: capability.journeyIds,
      technologyIds,
    });
  }
  return { evidence, responseByQuestion, confidenceByQuestion, dontKnowAnswers, notApplicableAnswers, knownAnswers };
}

function findConflicts(evidence: AssessmentEvidence[]): CapabilityConflict[] {
  return CDI_CAPABILITY_KEYS.flatMap((capabilityKey) => {
    const byDimension = new Map<MaturityDimension, AssessmentEvidence[]>();
    for (const item of evidence.filter((ref) => ref.capabilityIds.includes(capabilityKey))) {
      const dimension = cdiQuestion(item.questionId)?.dimension;
      if (!dimension) continue;
      byDimension.set(dimension, [...(byDimension.get(dimension) || []), item]);
    }
    return [...byDimension.entries()].flatMap(([dimension, refs]) => {
      const hasPositive = refs.some((item) => item.polarity === "POSITIVE" && item.strength >= 75);
      const hasGap = refs.some((item) => item.polarity === "GAP" && item.strength >= 75);
      return hasPositive && hasGap
        ? [{ capabilityKey, dimension, evidenceIds: refs.map((item) => item.id), reason: `Conflicting ${dimension} evidence requires validation.` }]
        : [];
    });
  });
}

function actionFor(
  propensity: number,
  confidence: number,
  gateStatus: KyndrylTechnologyScore["gateStatus"],
  profile: Pick<CdiTechnologyProfile, "minimumFit" | "minimumConfidence">,
  supportingEvidenceCount: number,
  contradictionOnly: boolean,
): KyndrylTechnologyScore["action"] {
  const recommendNowFit = Math.max(80, profile.minimumFit);
  const recommendNowConfidence = Math.max(70, profile.minimumConfidence);
  const validateFit = Math.max(65, profile.minimumFit);
  if (gateStatus === "FAILED") return "GATE_FAILED";
  if (gateStatus === "PENDING") return "GATE_PENDING";
  if (contradictionOnly) return "DO_NOT_RECOMMEND";
  if (
    propensity >= recommendNowFit &&
    confidence >= recommendNowConfidence &&
    supportingEvidenceCount >= 2
  )
    return "RECOMMEND_NOW";
  if (propensity >= validateFit) return "VALIDATE";
  if (propensity >= Math.max(45, validateFit - 20)) return "WATCHLIST";
  if (propensity >= 25) return "LOW_PRIORITY";
  return "DO_NOT_RECOMMEND";
}

export function scoreCapabilityDrivenAssessment(input: {
  answers: AssessmentAnswer[];
  capabilityKeys?: string[];
  locale?: Locale;
}): CapabilityDrivenAssessment {
  const locale = input.locale || "en-US";
  const selected = (input.capabilityKeys?.length ? input.capabilityKeys : CDI_CAPABILITY_KEYS).filter(
    (key): key is CdiCapabilityKey => CDI_CAPABILITY_KEYS.includes(key as CdiCapabilityKey),
  );
  const effective = selected.length ? selected : [...CDI_CAPABILITY_KEYS];
  const answerMap = new Map(input.answers.map((item) => [item.questionId, item]));
  const mapped = evidenceFromAnswers(input.answers, locale);
  const conflicts = findConflicts(mapped.evidence);
  const dimensions: MaturityDimension[] = ["strategy", "process", "technology", "data", "governance"];

  const capabilities = effective.map((key) => {
    const capability = cdiCapability(key)!;
    const relevant = mapped.evidence.filter((item) => item.capabilityIds.includes(key));
    const dimensionScores = dimensions.flatMap((dimension) => {
      const refs = relevant.filter((item) => cdiQuestion(item.questionId)?.dimension === dimension);
      if (!refs.length) return [];
      const positive = refs.filter((item) => item.polarity === "POSITIVE").map((item) => item.strength);
      const gaps = refs.filter((item) => item.polarity === "GAP").map((item) => item.strength);
      return [clamp(50 + average(positive, 0) * 0.5 - average(gaps, 0) * 0.5)];
    });
    const maturity = dimensionScores.length ? clamp(average(dimensionScores)) : 0;
    return {
      pillarKey: key as never,
      id: key,
      label: localizeCdi(capability.label, locale),
      journeyId: capability.journeyIds[0],
      maturity,
      heatmapStatus: maturity >= 70 ? "GREEN" as const : maturity >= 40 ? "AMBER" as const : "RED" as const,
      evidence: relevant,
    };
  });

  const capabilityReviews = effective.map((key) => {
    const core = coreQuestionsForCapability(key);
    const deep = deepQuestionsForCapability(key);
    const known = (questionId: string) => {
      const answer = answerMap.get(questionId);
      return answer && normalizeCdiResponse(answer) !== "DONT_KNOW" && normalizeCdiResponse(answer) !== "NOT_APPLICABLE";
    };
    const coreAnswered = core.filter((item) => answerMap.has(item.id)).length;
    const deepAnswered = deep.filter((item) => answerMap.has(item.id)).length;
    const knownIds = [...core, ...deep].filter((item) => known(item.id)).map((item) => item.id);
    const confidence = knownIds.length
      ? clamp(average(knownIds.map((id) => mapped.confidenceByQuestion.get(id) || 70)) * (knownIds.length / Math.max(4, core.length)))
      : 0;
    const conflict = conflicts.some((item) => item.capabilityKey === key);
    const capabilityTechnology = CDI_TECHNOLOGIES.filter((item) => item.capabilityKeys.includes(key));
    const hasCandidateBand = capabilityTechnology.some((profile) => {
      const relevant = mapped.evidence.filter((item) => profile.supportingEvidence.includes(item.id));
      return relevant.length > 0 && average(relevant.map((item) => item.strength)) >= 45;
    });
    const highImpact = core.some((item) => item.businessImpact >= 95 && mapped.responseByQuestion.get(item.id) === "NO");
    const deepRequired = coreAnswered >= 4 && (confidence < 70 || conflict || hasCandidateBand || highImpact);
    const status = coreAnswered === 0 ? "NOT_STARTED" as const
      : coreAnswered < 4 ? "CORE_IN_PROGRESS" as const
      : deepRequired && deepAnswered === 0 ? "DEEP_REQUIRED" as const
      : "REVIEW_READY" as const;
    const next = core.find((item) => !answerMap.has(item.id)) || (deepRequired ? deep.find((item) => !answerMap.has(item.id)) : null);
    return {
      key,
      status,
      coreAnswered,
      coreTotal: core.length,
      deepAnswered,
      deepTotal: deep.length,
      confidence,
      conflict,
      nextQuestionId: next?.id || null,
      reason: conflict
        ? "Conflicting evidence must be validated."
        : confidence < 70 && coreAnswered >= 4
          ? "Additional evidence is needed to raise confidence."
          : highImpact
            ? "A high-impact gap triggered deeper discovery."
            : "Core evidence determines the next step.",
    };
  });

  const journeys = CDI_JOURNEYS.flatMap((journey) => {
    const relevant = capabilities.filter((item) => cdiCapability(String(item.id))?.journeyIds.includes(journey.id));
    if (!relevant.length) return [];
    const score = clamp(average(relevant.map((item) => 100 - item.maturity)));
    return [{ pillarKey: (relevant[0].pillarKey || effective[0]) as never, id: journey.id, label: localizeCdi(journey.label, locale), score, priority: score }];
  }).sort((a, b) => b.score - a.score);

  const technologies = CDI_TECHNOLOGIES.flatMap((profile) => {
    if (!profile.capabilityKeys.some((key) => effective.includes(key))) return [];
    const requiredKnown = profile.requiredEvidence.filter((id) => mapped.evidence.some((item) => item.id === id));
    const requiredContradicted = profile.requiredEvidence.some((id) => {
      const [code, topic] = id.split(".");
      return mapped.evidence.some((item) => item.id === `${code}.${topic}.no`);
    });
    const gateStatus: KyndrylTechnologyScore["gateStatus"] = !profile.requiredEvidence.length
      ? "NOT_REQUIRED"
      : requiredContradicted
        ? "FAILED"
        : requiredKnown.length === profile.requiredEvidence.length
          ? "SATISFIED"
          : "PENDING";
    const distinctEvidence = (items: AssessmentEvidence[]) =>
      Array.from(
        items.reduce((byId, item) => {
          const current = byId.get(item.id);
          if (!current || item.strength > current.strength) byId.set(item.id, item);
          return byId;
        }, new Map<string, AssessmentEvidence>()).values(),
      );
    const selectedEvidence = mapped.evidence.filter((item) =>
      item.capabilityIds.some((key) =>
        effective.includes(key as CdiCapabilityKey),
      ),
    );
    const supporting = distinctEvidence(
      selectedEvidence.filter((item) =>
        profile.supportingEvidence.includes(item.id),
      ),
    );
    const contradictory = distinctEvidence(
      selectedEvidence.filter((item) =>
        profile.contradictoryEvidence.includes(item.id),
      ),
    );
    if (!supporting.length && !contradictory.length) return [];
    const required = distinctEvidence(
      mapped.evidence.filter((item) =>
        profile.requiredEvidence.includes(item.id),
      ),
    );
    const influencingEvidence = distinctEvidence([
      ...supporting,
      ...contradictory,
      ...required,
    ]);
    const relevantCapabilities = capabilities.filter((item) => profile.capabilityKeys.includes(item.id as CdiCapabilityKey));
    const evidenceFit = clamp(average(supporting.map((item) => item.technologyFit), 0));
    const capabilityGap = clamp(average(relevantCapabilities.map((item) => 100 - item.maturity), 0));
    const impactQuestions = supporting.map((item) => cdiQuestion(item.questionId)?.businessImpact || 70);
    const businessImpact = clamp(average(impactQuestions, 55));
    const journeyFit = journeys.find((item) => item.id === profile.journeyId)?.score || 0;
    const attachPriority = profile.attach === "LEAD_ATTACH" ? 100 : profile.attach === "OPPORTUNITY_ATTACH" ? 78 : 64;
    const penalties = contradictory.length * 18 + (gateStatus === "FAILED" ? 100 : 0);
    const propensity = clamp(evidenceFit * 0.45 + capabilityGap * 0.25 + businessImpact * 0.15 + journeyFit * 0.1 + attachPriority * 0.05 - penalties);
    const profileEvidenceIds = new Set([
      ...profile.requiredEvidence,
      ...profile.supportingEvidence,
      ...profile.contradictoryEvidence,
    ]);
    const linkedQuestions = CDI_QUESTIONS.filter(
      (question) =>
        question.level === "core" &&
        effective.includes(question.capabilityKey) &&
        profile.capabilityKeys.includes(question.capabilityKey) &&
        (profileEvidenceIds.has(question.mappings.YES.evidenceId) ||
          profileEvidenceIds.has(question.mappings.NO.evidenceId)),
    );
    const applicableQuestions = linkedQuestions.filter((question) => {
      const answer = answerMap.get(question.id);
      return !answer || normalizeCdiResponse(answer) !== "NOT_APPLICABLE";
    });
    const knownQuestions = applicableQuestions.filter((question) => {
      const response = mapped.responseByQuestion.get(question.id);
      return response === "YES" || response === "NO";
    });
    const knownEvidenceConfidence = knownQuestions.map(
      (question) => mapped.confidenceByQuestion.get(question.id) || 70,
    );
    const confidence = applicableQuestions.length
      ? clamp(
          average(knownEvidenceConfidence, 0) *
            (knownQuestions.length / applicableQuestions.length),
        )
      : 0;
    const independentEvidenceCount = new Set(
      supporting.map((item) => item.id),
    ).size;
    const action = actionFor(
      propensity,
      confidence,
      gateStatus,
      profile,
      independentEvidenceCount,
      supporting.length === 0 && contradictory.length > 0,
    );
    const journey = CDI_JOURNEYS.find((item) => item.id === profile.journeyId);
    const reasonEvidence = (supporting[0] || contradictory[0])!;
    const nextQuestion = linkedQuestions.find((item) => {
      const answer = answerMap.get(item.id);
      if (!answer) return true;
      const response = normalizeCdiResponse(answer);
      return response === "DONT_KNOW";
    });
    return [{
      id: profile.id,
      name: profile.name,
      pillarKey: profile.capabilityKeys[0] as never,
      journeyId: profile.journeyId,
      journey: journey ? localizeCdi(journey.label, locale) : profile.journeyId,
      attach: profile.attach,
      propensity,
      confidence,
      action,
      gateStatus,
      components: { evidenceFit, capabilityGap, businessImpact, journeyFit, attachPriority, penalties },
      evidence: influencingEvidence,
      capabilities: profile.capabilityKeys,
      explanation: locale === "pt-BR"
        ? supporting.length
          ? `${profile.name} aparece porque ${reasonEvidence.label.toLowerCase()} foi vinculada diretamente à solução. O percentual representa aderência determinística, não probabilidade de venda, e requer validação humana.`
          : `${profile.name} permanece visível porque a evidência atual contradiz a necessidade da solução. Não recomendar sem nova evidência.`
        : supporting.length
          ? `${profile.name} appears because ${reasonEvidence.label.toLowerCase()} was linked directly to the solution. The percentage is deterministic fit, not probability of sale, and requires human validation.`
          : `${profile.name} remains visible because current evidence contradicts the need for the solution. Do not recommend without new evidence.`,
      nextQuestion: nextQuestion ? localizeCdi(nextQuestion.prompt, locale) : null,
    } satisfies KyndrylTechnologyScore];
  }).sort((a, b) => b.propensity - a.propensity);

  const practices = CDI_PRACTICES.map((practice) => {
    const capabilityKeys = effective.filter((key) => cdiCapability(key)?.practiceIds.includes(practice.id));
    const relevant = capabilities.filter((item) => capabilityKeys.includes(item.id as CdiCapabilityKey));
    const refs = mapped.evidence.filter((item) => item.capabilityIds.some((key) => capabilityKeys.includes(key as CdiCapabilityKey)));
    return { id: practice.id, name: practice.name, score: clamp(average(relevant.map((item) => 100 - item.maturity), 0)), capabilityKeys, evidenceCount: refs.length };
  }).filter((item) => item.evidenceCount > 0).sort((a, b) => b.score - a.score);

  const applicableQuestions = CDI_QUESTIONS.filter((item) => effective.includes(item.capabilityKey) && item.level === "core").length - mapped.notApplicableAnswers;
  const overallConfidence = applicableQuestions ? clamp((mapped.knownAnswers / applicableQuestions) * 100) : 0;
  const pillarRows = effective.map((key) => {
    const capability = cdiCapability(key)!;
    const scored = capabilities.find((item) => item.id === key)!;
    const review = capabilityReviews.find((item) => item.key === key)!;
    const leading = technologies.find((item) => item.capabilities.includes(key));
    return {
      key: key as never,
      label: localizeCdi(capability.label, locale),
      objective: localizeCdi(capability.outcome, locale),
      workshop: locale === "pt-BR" ? `Workshop de ${localizeCdi(capability.label, locale)}` : `${localizeCdi(capability.label, locale)} workshop`,
      propensity: leading?.propensity || 0,
      confidence: review.confidence,
      maturity: scored.maturity,
      answered: review.coreAnswered + review.deepAnswered,
      total: review.coreTotal + (review.status === "DEEP_REQUIRED" ? review.deepTotal : 0),
      leadingTechnology: leading?.name || null,
    };
  });

  const trace = input.answers.flatMap((answer) => {
    const question = cdiQuestion(answer.questionId);
    if (!question) return [];
    const response = normalizeCdiResponse(answer);
    const evidenceId = response === "YES" || response === "NO" ? question.mappings[response].evidenceId : null;
    const capability = cdiCapability(question.capabilityKey)!;
    const technologyIds = evidenceId
      ? CDI_TECHNOLOGIES.filter((item) =>
          [
            ...item.requiredEvidence,
            ...item.supportingEvidence,
            ...item.contradictoryEvidence,
          ].includes(evidenceId),
        ).map((item) => item.id)
      : [];
    return [{
      questionId: question.id,
      response,
      evidenceId,
      capabilityKey: question.capabilityKey,
      journeyIds: capability.journeyIds,
      technologyIds,
      technologyNames: technologyIds.flatMap((technologyId) => {
        const profile = CDI_TECHNOLOGIES.find(
          (item) => item.id === technologyId,
        );
        return profile ? [profile.name] : [];
      }),
      practiceIds: capability.practiceIds,
    }];
  });

  return {
    version: CDI_CAPABILITY_CATALOG_VERSION,
    engine: "deterministic",
    selectedPillars: effective as never,
    context: { total: 10, answered: 0 },
    summary: { applicableQuestions, knownAnswers: mapped.knownAnswers, dontKnowAnswers: mapped.dontKnowAnswers, notApplicableAnswers: mapped.notApplicableAnswers, overallConfidence },
    pillars: pillarRows,
    journeys,
    capabilities,
    technologies,
    evidence: mapped.evidence,
    additionalDiscovery: capabilityReviews.flatMap((review) => {
      const question = review.nextQuestionId ? cdiQuestion(review.nextQuestionId) : null;
      return question ? [{ questionId: question.id, question: localizeCdi(question.prompt, locale), reason: review.reason }] : [];
    }).slice(0, 10),
    conflicts,
    capabilityReviews,
    practices,
    trace,
  };
}

export function recommendedCapabilityKeys(answers: AssessmentAnswer[], limit = 6): CdiCapabilityKey[] {
  const text = answers.map((answer) => `${answer.answerText || ""} ${JSON.stringify(answer.structured || {})}`.toLowerCase()).join(" ");
  return CDI_CAPABILITIES.map((capability) => ({
    key: capability.key,
    score: capability.topics.reduce((sum, item) => sum + item.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length * 12, 20),
  })).sort((a, b) => b.score - a.score).slice(0, limit).map((item) => item.key);
}
