"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  InlineLoading,
  InlineNotification,
  ProgressBar,
  Select,
  SelectItem,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  ArrowRight,
  Checkmark,
  Close,
  Renew,
  WatsonHealthTextAnnotationToggle,
} from "@carbon/icons-react";
import { useI18n } from "./I18nProvider";
import {
  canonicalizeGuidedDiscoveryOption,
  getLocalizedPillarMeta,
  getLocalizedQuestionById,
  isGuidedDiscoveryPillar,
  localizeGuidedDiscoveryOption,
} from "@/lib/guided-discovery";
import type { KyndrylAssessment } from "@/lib/kyndryl-discovery";
import type { Locale, Messages } from "@/lib/i18n";
import KyndrylAssessmentResults from "./KyndrylAssessmentResults";
import { CDI_CONTEXT_QUESTIONS } from "@/lib/cdi/capability-driven";
import styles from "./GuidedDiscoveryWorkspace.module.css";

export type GuidedQuestion = {
  id: string;
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
  citations: Array<{ title: string; excerpt: string; sourceId: string }>;
  sequence: number;
  status: string;
  rankingScore?: number;
  factors?: Record<string, number> | null;
};

export type GuidedAnswer = {
  id: string;
  questionId: string;
  structured: Record<string, unknown>;
  answerText: string;
  evidenceStatus: string;
  stakeholderId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  sourceDate: string | null;
  confidence: number;
  status: "draft" | "confirmed" | "unknown";
  updatedAt: string;
};

export type GuidedDiscoveryView = {
  catalogVersion: string;
  readonly: boolean;
  session: {
    id: string;
    mode: "adaptive" | "direct";
    selectedPillars: string[];
    status: string;
    progressPercent: number;
    coveragePercent: number;
    checkpointCount: number;
    aiStatus: string | null;
  } | null;
  questions: GuidedQuestion[];
  answers: GuidedAnswer[];
  currentQuestion: GuidedQuestion | null;
  nextQuestion: GuidedQuestion | null;
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
    completionMinimum?: number;
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
  proposedFollowUp: GuidedQuestion | null;
  history: GuidedAnswer[];
  scoreHints: Record<string, number>;
  technologyAssessment: KyndrylAssessment;
};

type StakeholderOption = { id: string; name: string; role: string };
type MutationResult = {
  guidedDiscovery?: GuidedDiscoveryView;
  scoreDeltas?: Array<{
    label: string;
    before: number;
    after: number;
    delta: number;
  }>;
} | null | void;

type Props = {
  open: boolean;
  accountName: string;
  discovery: GuidedDiscoveryView | null;
  stakeholders: StakeholderOption[];
  saving: boolean;
  onClose: () => void;
  onStart: (
    mode: "adaptive" | "direct",
    pillars: string[],
  ) => Promise<MutationResult>;
  onAnswer: (payload: Record<string, unknown>) => Promise<MutationResult>;
  onPatch: (payload: Record<string, unknown>) => Promise<MutationResult>;
};

function localizeQuestion(question: GuidedQuestion | null, locale: Locale) {
  if (!question || question.source !== "catalog") return question;
  const catalogId = question.catalogQuestionId || question.id;
  const localized = getLocalizedQuestionById(catalogId, locale);
  if (!localized) return question;
  return {
    ...question,
    prompt: localized.question,
    hint: localized.hint,
    rationale: localized.rationale,
    inputSchema: { ...question.inputSchema, label: localized.input.label },
  };
}

function localizeDiscovery(
  discovery: GuidedDiscoveryView | null,
  locale: Locale,
): GuidedDiscoveryView | null {
  if (!discovery) return null;
  const questions = discovery.questions.map(
    (question) => localizeQuestion(question, locale) as GuidedQuestion,
  );
  const byId = new Map(questions.map((question) => [question.id, question]));
  return {
    ...discovery,
    questions,
    currentQuestion: discovery.currentQuestion
      ? byId.get(discovery.currentQuestion.id) ||
        localizeQuestion(discovery.currentQuestion, locale)
      : null,
    nextQuestion: discovery.nextQuestion
      ? byId.get(discovery.nextQuestion.id) ||
        localizeQuestion(discovery.nextQuestion, locale)
      : null,
    proposedFollowUp: localizeQuestion(discovery.proposedFollowUp, locale),
    pillars: discovery.pillars.map((pillar) => {
      const meta = isGuidedDiscoveryPillar(pillar.key)
        ? getLocalizedPillarMeta(pillar.key, locale)
        : null;
      return meta
        ? { ...pillar, label: meta.label, description: meta.description }
        : pillar;
    }),
    pillarAssessments: discovery.pillarAssessments.map((pillar) => {
      const meta = isGuidedDiscoveryPillar(pillar.key)
        ? getLocalizedPillarMeta(pillar.key, locale)
        : null;
      return meta
        ? { ...pillar, label: meta.label, description: meta.description }
        : pillar;
    }),
    recommendedNextPillar: discovery.recommendedNextPillar
      ? {
          ...discovery.recommendedNextPillar,
          label: isGuidedDiscoveryPillar(
            discovery.recommendedNextPillar.key,
          )
            ? getLocalizedPillarMeta(
                discovery.recommendedNextPillar.key,
                locale,
              ).label
            : discovery.recommendedNextPillar.label,
        }
      : null,
  };
}

export default function GuidedDiscoveryWorkspace({
  open,
  accountName,
  discovery,
  stakeholders,
  saving,
  onClose,
  onStart,
  onAnswer,
  onPatch,
}: Props) {
  const { locale, dictionary: d, t } = useI18n();
  const view = useMemo(
    () => localizeDiscovery(discovery, locale),
    [discovery, locale],
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [structured, setStructured] = useState<Record<string, unknown>>({});
  const [context, setContext] = useState("");
  const [evidenceStatus, setEvidenceStatus] = useState("reported");
  const [stakeholderId, setStakeholderId] = useState("");
  const [sourceType, setSourceType] = useState("meeting");
  const [sourceId, setSourceId] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [confidence, setConfidence] = useState(70);
  const [scoreDeltas, setScoreDeltas] = useState<
    Array<{ label: string; before: number; after: number; delta: number }>
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPillarHub, setShowPillarHub] = useState(true);
  const [openingPillar, setOpeningPillar] = useState("");
  const [referenceTime, setReferenceTime] = useState(0);
  const [markingPillar, setMarkingPillar] = useState("");
  const [notRelevantReason, setNotRelevantReason] = useState("");

  const virtualSession = Boolean(view?.session?.id.startsWith("virtual-"));
  const canViewResults = Boolean(view?.session);
  const readOnly = Boolean(view?.readonly);
  const currentQuestion = useMemo(
    () =>
      view?.questions.find((question) => question.id === activeQuestionId) ||
      view?.nextQuestion ||
      view?.currentQuestion ||
      null,
    [activeQuestionId, view],
  );
  const currentAnswer = useMemo(
    () =>
      view?.answers.find(
        (answer) => answer.questionId === currentQuestion?.id,
      ) || null,
    [currentQuestion?.id, view?.answers],
  );
  const sessionId = view?.session?.id || "";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActive =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(
      () =>
        dialogRef.current
          ?.querySelector<HTMLElement>(`[aria-label="${d.guided.closeLabel}"]`)
          ?.focus(),
      0,
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus();
    };
  }, [d.guided.closeLabel, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setShowPillarHub(true);
      setShowResults(false);
      setShowHistory(false);
      setOpeningPillar("");
      setReferenceTime(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(
      () =>
        setActiveQuestionId(
          view?.nextQuestion?.id || view?.currentQuestion?.id || "",
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [open, view?.currentQuestion?.id, view?.nextQuestion?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStructured(currentAnswer?.structured || {});
      setContext(currentAnswer?.answerText || "");
      setEvidenceStatus(currentAnswer?.evidenceStatus || "reported");
      setStakeholderId(currentAnswer?.stakeholderId || "");
      setSourceType(currentAnswer?.sourceType || "meeting");
      setSourceId(currentAnswer?.sourceId || "");
      setSourceDate(
        currentAnswer?.sourceDate?.slice(0, 10) ||
          new Date().toISOString().slice(0, 10),
      );
      setConfidence(currentAnswer?.confidence ?? 70);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentAnswer, currentQuestion?.id]);

  if (!open || !view) return null;

  const evidenceOptions = [
    ["confirmed", d.guided.evidenceConfirmed],
    ["reported", d.guided.evidenceReported],
    ["hypothesis", d.guided.evidenceHypothesis],
    ["unknown", d.guided.evidenceUnknown],
  ] as const;
  const chooseStructured = (value: string | number) => {
    if (currentQuestion?.inputSchema.kind === "multi") {
      const current = Array.isArray(structured.value)
        ? structured.value.map(String)
        : [];
      setStructured({
        value: current.includes(String(value))
          ? current.filter((item) => item !== String(value))
          : [...current, String(value)],
      });
    } else setStructured({ value });
  };
  const isSelected = (value: string | number) =>
    Array.isArray(structured.value)
      ? structured.value.map(String).includes(String(value))
      : String(structured.value ?? "") === String(value);
  const save = async (status: "draft" | "confirmed" | "unknown") => {
    if (!currentQuestion || !sessionId || virtualSession) return;
    const result = await onAnswer({
      sessionId,
      questionId: currentQuestion.id,
      status,
      structured: status === "unknown" ? {} : structured,
      answerText: status === "unknown" ? "" : context,
      evidenceStatus: status === "unknown" ? "unknown" : evidenceStatus,
      stakeholderId: stakeholderId || null,
      sourceType: sourceType || null,
      sourceId: sourceId || null,
      sourceDate: sourceDate || null,
      confidence: status === "unknown" ? 0 : confidence,
      responseLocale: locale,
    });
    if (!result) return;
    if (result.scoreDeltas) setScoreDeltas(result.scoreDeltas);
    const updatedView = localizeDiscovery(
      result.guidedDiscovery || null,
      locale,
    );
    const nextQuestion =
      updatedView?.nextQuestion || updatedView?.currentQuestion || null;
    if (nextQuestion) setActiveQuestionId(nextQuestion.id);
    setShowPillarHub(false);
    setShowResults(false);
    setShowHistory(false);
  };
  const openPillar = async (
    pillar: GuidedDiscoveryView["pillarAssessments"][number],
  ) => {
    if (readOnly) {
      if (
        pillar.sessionId === view.session?.id ||
        pillar.key === view.activePillar ||
        view.questions.some((question) => question.pillar === pillar.key)
      ) {
        setShowPillarHub(false);
        setShowResults(pillar.status.startsWith("reviewed"));
      }
      return;
    }
    const localQuestion =
      view.questions.find(
        (question) =>
          question.pillar === pillar.key && question.status !== "answered",
      ) ||
      view.questions.find((question) => question.pillar === pillar.key);
    if (localQuestion) setActiveQuestionId(localQuestion.id);
    setShowPillarHub(false);
    setShowResults(false);
    setShowHistory(false);
    setOpeningPillar(pillar.key);
    try {
      const result = pillar.sessionId
        ? await onPatch({
            sessionId: pillar.sessionId,
            operation: "reopen_pillar",
            responseLocale: locale,
          })
        : await onStart("direct", [pillar.key]);
      if (!result) {
        setShowPillarHub(true);
        return;
      }
      const updatedView = localizeDiscovery(
        result.guidedDiscovery || null,
        locale,
      );
      const updatedQuestion =
        updatedView?.questions.find(
          (question) =>
            question.pillar === pillar.key && question.status !== "answered",
        ) ||
        updatedView?.questions.find(
          (question) => question.pillar === pillar.key,
        ) ||
        updatedView?.nextQuestion ||
        updatedView?.currentQuestion ||
        null;
      if (updatedQuestion) setActiveQuestionId(updatedQuestion.id);
    } finally {
      setOpeningPillar("");
    }
  };
  const markNotRelevant = async (pillarKey: string) => {
    if (notRelevantReason.trim().length < 5) return;
    await onPatch({
      operation: "mark_pillar_not_relevant",
      pillarKey,
      reason: notRelevantReason.trim(),
      responseLocale: locale,
    });
    setMarkingPillar("");
    setNotRelevantReason("");
  };
  const activePillarKey =
    currentQuestion?.pillar || view.session?.selectedPillars[0] || null;
  const questionsByPillar = view.pillars.filter(
    (pillar) => pillar.key === activePillarKey,
  );
  const currentPillar =
    view.pillars.find((pillar) => pillar.key === currentQuestion?.pillar)
      ?.label || currentQuestion?.pillar;
  const currentPillarAssessment = view.pillarAssessments.find(
    (pillar) =>
      pillar.key ===
      (currentQuestion?.pillar || view.session?.selectedPillars[0]),
  );
  const currentPillarQuestionIds = new Set(
    view.questions
      .filter((question) => question.pillar === activePillarKey)
      .map((question) => question.id),
  );
  const currentPillarAnswers = view.answers.filter((answer) =>
    currentPillarQuestionIds.has(answer.questionId),
  );
  const currentQuality = {
    confirmedWithEvidence: currentPillarAnswers.filter(
      (answer) =>
        answer.status === "confirmed" &&
        answer.evidenceStatus !== "hypothesis",
    ).length,
    gaps: currentPillarAnswers.filter((answer) => answer.status === "unknown")
      .length,
    stale: currentPillarAnswers.filter(
      (answer) =>
        Boolean(answer.sourceDate) &&
        referenceTime > 0 &&
        referenceTime - new Date(answer.sourceDate!).getTime() > 90 * 86400000,
    ).length,
    contradictions: currentPillarAnswers.filter(
      (answer) => Boolean(answer.structured.contradiction),
    ).length,
  };

  return (
    <div
      ref={dialogRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${d.guided.title}: ${accountName}`}
      tabIndex={-1}
    >
      <section className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <span>{d.guided.accountStrategy}</span>
            <h1>{d.guided.title}</h1>
            <p>
              {accountName} · {d.guided.catalog} {view.catalogVersion}
            </p>
          </div>
          <div className={styles.headerMetrics}>
            {!showPillarHub && (
              <Button
                size="sm"
                kind="ghost"
                onClick={() => {
                  setShowPillarHub(true);
                  setShowResults(false);
                  setShowHistory(false);
                }}
              >
                {locale === "pt-BR" ? "Voltar às capacidades" : "Back to capabilities"}
              </Button>
            )}
            {canViewResults && !showPillarHub && (
              <Button
                size="sm"
                kind="ghost"
                onClick={() => setShowResults((current) => !current)}
              >
                {showResults
                  ? locale === "pt-BR"
                    ? "Voltar às perguntas"
                    : "Back to questions"
                  : locale === "pt-BR"
                    ? "Ver heatmap e recomendações"
                    : "View heatmap and recommendations"}
              </Button>
            )}
            <Metric
              value={`${view.overallReview.reviewedPillars}/${view.overallReview.totalPillars}`}
              label={
                locale === "pt-BR"
                  ? "Capacidades revisadas"
                  : "Capabilities reviewed"
              }
            />
            <Metric
              value={`${view.overallReview.percent}%`}
              label={
                locale === "pt-BR" ? "Revisão geral" : "Overall review"
              }
            />
            <button onClick={onClose} aria-label={d.guided.closeLabel}>
              <Close size={24} />
            </button>
          </div>
        </header>

        {(readOnly || virtualSession) && (
          <InlineNotification
            className={styles.demoNotice}
            kind="info"
            lowContrast
            hideCloseButton
            title={d.guided.demoTitle}
            subtitle={readOnly ? d.guided.demoReadonly : d.guided.demoLegacy}
          />
        )}

        {showPillarHub ? (
          <PillarHub
            accountName={accountName}
            pillars={view.pillarAssessments}
            overallReview={view.overallReview}
            recommended={view.recommendedNextPillar}
            readOnly={readOnly}
            saving={saving}
            markingPillar={markingPillar}
            reason={notRelevantReason}
            onReasonChange={setNotRelevantReason}
            onMarkRequest={setMarkingPillar}
            onMarkCancel={() => {
              setMarkingPillar("");
              setNotRelevantReason("");
            }}
            onMarkConfirm={markNotRelevant}
            onOpen={openPillar}
          />
        ) : openingPillar ? (
          <div
            className={styles.openingPillar}
            role="status"
            aria-live="polite"
          >
            <InlineLoading
              description={
                locale === "pt-BR"
                  ? `Abrindo ${view.pillarAssessments.find((pillar) => pillar.key === openingPillar)?.label || "trilha de descoberta"}…`
                  : `Opening ${view.pillarAssessments.find((pillar) => pillar.key === openingPillar)?.label || "discovery path"}…`
              }
            />
            <p>
              {locale === "pt-BR"
                ? "Preparando a próxima pergunta e preservando o progresso desta conta."
                : "Preparing the next question and preserving this account's progress."}
            </p>
          </div>
        ) : (
          <div className={styles.body}>
            <aside className={styles.rail}>
              <div className={styles.railIntro}>
                <span>{d.guided.dynamicPath}</span>
                <strong>
                  {currentPillarAssessment?.answeredCount || 0}/
                  {currentPillarAssessment?.requiredCount || 5}{" "}
                  {locale === "pt-BR"
                    ? "perguntas essenciais"
                    : "essential questions"}
                </strong>
                <ProgressBar
                  label={d.guided.sessionProgress}
                  hideLabel
                  value={currentPillarAssessment?.progressPercent || 0}
                />
                <small>{d.guided.progressHelp}</small>
              </div>
              <nav aria-label={d.guided.discoveryPillars}>
                {questionsByPillar.map((pillar) => (
                  <div className={styles.pillarGroup} key={pillar.key}>
                    <button
                      className={
                        currentQuestion?.pillar === pillar.key
                          ? styles.activePillar
                          : ""
                      }
                      onClick={() => {
                        const next =
                          view.questions.find(
                            (question) =>
                              question.pillar === pillar.key &&
                              question.status !== "answered",
                          ) ||
                          view.questions.find(
                            (question) => question.pillar === pillar.key,
                          );
                        if (next) setActiveQuestionId(next.id);
                      }}
                    >
                      <span>
                        <strong>{pillar.label}</strong>
                        <small>
                          {pillar.relevance}% {d.guided.relevance}
                        </small>
                      </span>
                      <em>{pillar.progressPercent}%</em>
                    </button>
                    <div className={styles.questionDots}>
                      {view.questions
                        .filter(
                          (question) =>
                            question.pillar === pillar.key &&
                            question.status !== "dismissed",
                        )
                        .map((question) => (
                          <button
                            key={question.id}
                            title={question.prompt}
                            aria-label={question.prompt}
                            className={`${question.status === "answered" ? styles.done : ""} ${question.id === currentQuestion?.id ? styles.current : ""}`}
                            onClick={() => setActiveQuestionId(question.id)}
                          >
                            {question.status === "answered" ? (
                              <Checkmark size={12} />
                            ) : (
                              question.sequence + 1
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </nav>
              <button
                className={styles.historyToggle}
                onClick={() => setShowHistory((current) => !current)}
              >
                {showHistory
                  ? d.guided.hideHistory
                  : t("guided.historyAndRevisions", {
                      count: view.history.length,
                    })}{" "}
                <ArrowRight size={16} />
              </button>
            </aside>

            <main className={styles.questionArea}>
              {showResults || (!currentQuestion && !showHistory) ? (
                <KyndrylAssessmentResults
                  assessment={view.technologyAssessment}
                  locale={locale}
                  onChooseNext={() => {
                    setShowPillarHub(true);
                    setShowResults(false);
                  }}
                  onContinue={
                    currentQuestion ? () => setShowResults(false) : undefined
                  }
                />
              ) : showHistory ? (
                <History
                  questions={view.questions}
                  answers={view.history}
                  onEdit={(id) => {
                    setActiveQuestionId(id);
                    setShowHistory(false);
                    setShowResults(false);
                  }}
                  readOnly={readOnly}
                />
              ) : currentQuestion ? (
                <>
                  <div className={styles.questionTop}>
                    <div>
                      <Tag
                        type={
                          currentQuestion.source === "ai" ? "purple" : "cyan"
                        }
                      >
                        {currentQuestion.source === "ai"
                          ? d.guided.aiProposal
                          : currentPillar}
                      </Tag>
                      <span>
                        {t("guided.questionPosition", {
                          number: currentQuestion.sequence + 1,
                          score: currentQuestion.rankingScore || "—",
                        })}
                      </span>
                    </div>
                    {currentAnswer && (
                      <Tag
                        type={
                          currentAnswer.status === "confirmed"
                            ? "green"
                            : currentAnswer.status === "unknown"
                              ? "red"
                              : "gray"
                        }
                      >
                        {currentAnswer.status === "confirmed"
                          ? d.guided.confirmed
                          : currentAnswer.status === "unknown"
                            ? d.guided.gap
                            : d.guided.draft}
                      </Tag>
                    )}
                  </div>
                  <h2>{currentQuestion.prompt}</h2>
                  <p className={styles.hint}>{currentQuestion.hint}</p>
                  <StructuredInput
                    question={currentQuestion}
                    structured={structured}
                    onChoose={chooseStructured}
                    selected={isSelected}
                    disabled={readOnly || saving}
                  />
                  <details className={styles.contextDetails}>
                    <summary>
                      {locale === "pt-BR"
                        ? "Adicionar contexto e evidência"
                        : "Add context and evidence"}
                    </summary>
                    <TextArea
                      id="guided-context"
                      labelText={d.guided.contextLabel}
                      helperText={d.guided.contextHelp}
                      rows={5}
                      value={context}
                      onChange={(event) => setContext(event.target.value)}
                      disabled={readOnly || saving}
                    />
                    <div className={styles.evidenceGrid}>
                    <Select
                      id="guided-evidence"
                      labelText={d.guided.evidenceNature}
                      value={evidenceStatus}
                      onChange={(event) =>
                        setEvidenceStatus(event.target.value)
                      }
                      disabled={readOnly || saving}
                    >
                      {evidenceOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value} text={label} />
                      ))}
                    </Select>
                    <Select
                      id="guided-stakeholder"
                      labelText={d.guided.relatedStakeholder}
                      value={stakeholderId}
                      onChange={(event) => setStakeholderId(event.target.value)}
                      disabled={readOnly || saving}
                    >
                      <SelectItem
                        value=""
                        text={d.guided.stakeholderUnlinked}
                      />
                      {stakeholders.map((person) => (
                        <SelectItem
                          key={person.id}
                          value={person.id}
                          text={`${person.name} · ${person.role}`}
                        />
                      ))}
                    </Select>
                    <Select
                      id="guided-source-type"
                      labelText={d.guided.sourceType}
                      value={sourceType}
                      onChange={(event) => setSourceType(event.target.value)}
                      disabled={readOnly || saving}
                    >
                      <SelectItem
                        value="meeting"
                        text={d.guided.sourceMeeting}
                      />
                      <SelectItem
                        value="document"
                        text={d.guided.sourceDocument}
                      />
                      <SelectItem
                        value="customer"
                        text={d.guided.sourceCustomer}
                      />
                      <SelectItem
                        value="research"
                        text={d.guided.sourceResearch}
                      />
                      <SelectItem value="other" text={d.guided.sourceOther} />
                    </Select>
                    <TextInput
                      id="guided-source"
                      labelText={d.guided.sourceReference}
                      value={sourceId}
                      onChange={(event) => setSourceId(event.target.value)}
                      placeholder={d.guided.sourcePlaceholder}
                      disabled={readOnly || saving}
                    />
                    <TextInput
                      id="guided-date"
                      type="date"
                      labelText={d.guided.evidenceDate}
                      value={sourceDate}
                      onChange={(event) => setSourceDate(event.target.value)}
                      disabled={readOnly || saving}
                    />
                    <label className={styles.confidence}>
                      <span>
                        {d.common.confidence} <strong>{confidence}%</strong>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={confidence}
                        onChange={(event) =>
                          setConfidence(Number(event.target.value))
                        }
                        disabled={readOnly || saving}
                      />
                    </label>
                    </div>
                  </details>
                  <div className={styles.actions}>
                    {!readOnly && (
                      <>
                        <Button
                          kind="ghost"
                          disabled={saving}
                          onClick={() =>
                            onPatch({
                              sessionId,
                              operation: "pause_pillar",
                              responseLocale: locale,
                            })
                          }
                        >
                          {d.guided.pause}
                        </Button>
                        <Button
                          kind="secondary"
                          disabled={saving}
                          onClick={() => save("draft")}
                        >
                          {d.guided.saveDraft}
                        </Button>
                        <Button
                          kind="tertiary"
                          disabled={saving}
                          onClick={() => save("unknown")}
                        >
                          {d.guided.doNotKnow}
                        </Button>
                        <Button
                          renderIcon={ArrowRight}
                          disabled={saving}
                          onClick={() => save("confirmed")}
                        >
                          {d.guided.confirmContinue}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </main>

            <aside className={styles.insightRail}>
              <section>
                <span>{d.guided.whyAsk}</span>
                <p>{currentQuestion?.rationale || d.guided.defaultRationale}</p>
                {currentQuestion?.factors && (
                  <dl>
                    {Object.entries(currentQuestion.factors).map(
                      ([key, value]) => (
                        <div key={key}>
                          <dt>{factorLabel(key, d)}</dt>
                          <dd>{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                )}
              </section>
              <section>
                <span>{d.guided.discoveryQuality}</span>
                <div className={styles.quality}>
                  <Quality
                    value={currentQuality.confirmedWithEvidence}
                    label={d.guided.withEvidence}
                    tone="known"
                  />
                  <Quality
                    value={currentQuality.gaps}
                    label={d.guided.gaps}
                    tone="gap"
                  />
                  <Quality
                    value={currentQuality.stale}
                    label={d.guided.stale}
                    tone="stale"
                  />
                  <Quality
                    value={currentQuality.contradictions}
                    label={d.guided.contradictions}
                    tone="risk"
                  />
                </div>
              </section>
              {scoreDeltas.length > 0 && (
                <section>
                  <span>{d.guided.answerImpact}</span>
                  <div className={styles.deltas}>
                    {scoreDeltas.map((delta) => (
                      <div key={delta.label}>
                        <span>
                          {localizeDeltaLabel(delta.label, locale, d)}
                        </span>
                        <strong
                          className={
                            delta.delta > 0 ? styles.positive : styles.negative
                          }
                        >
                          {delta.delta > 0 ? "+" : ""}
                          {delta.delta}
                        </strong>
                        <small>
                          {delta.before} → {delta.after}
                        </small>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {view.proposedFollowUp && (
                <section className={styles.aiProposal}>
                  <span>
                    <WatsonHealthTextAnnotationToggle size={18} />{" "}
                    {d.guided.proposedFollowUp}
                  </span>
                  <p>{view.proposedFollowUp.prompt}</p>
                  <small>{view.proposedFollowUp.rationale}</small>
                  {!readOnly && (
                    <div>
                      <Button
                        size="sm"
                        kind="secondary"
                        disabled={saving}
                        onClick={() =>
                          onPatch({
                            sessionId,
                            operation: "dismiss_follow_up",
                            questionId: view.proposedFollowUp!.id,
                            responseLocale: locale,
                          })
                        }
                      >
                        {d.common.dismiss}
                      </Button>
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          onPatch({
                            sessionId,
                            operation: "accept_follow_up",
                            questionId: view.proposedFollowUp!.id,
                            responseLocale: locale,
                          })
                        }
                      >
                        {d.common.accept}
                      </Button>
                    </div>
                  )}
                </section>
              )}
              {view.checkpoint?.available && !view.proposedFollowUp && (
                <section className={styles.checkpoint}>
                  <span>{d.guided.checkpointAvailable}</span>
                  <p>{d.guided.checkpointHelp}</p>
                  {!readOnly && (
                    <Button
                      size="sm"
                      kind="tertiary"
                      renderIcon={Renew}
                      disabled={saving}
                      onClick={() =>
                        onPatch({
                          sessionId,
                          operation: "checkpoint",
                          responseLocale: locale,
                        })
                      }
                    >
                      {d.guided.requestFollowUp}
                    </Button>
                  )}
                </section>
              )}
              {!readOnly && (
                <Button
                  className={styles.finish}
                  kind="danger--tertiary"
                  size="sm"
                  disabled={
                    saving ||
                    (currentPillarAssessment?.answeredCount || 0) <
                      (currentPillarAssessment?.completionMinimum || 4)
                  }
                  onClick={async () => {
                    const result = await onPatch({
                      sessionId,
                      operation: "complete_pillar",
                      responseLocale: locale,
                    });
                    if (result) setShowResults(true);
                  }}
                >
                  {d.guided.completeSession}
                </Button>
              )}
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

function PillarHub({
  accountName,
  pillars,
  overallReview,
  recommended,
  readOnly,
  saving,
  markingPillar,
  reason,
  onReasonChange,
  onMarkRequest,
  onMarkCancel,
  onMarkConfirm,
  onOpen,
}: {
  accountName: string;
  pillars: GuidedDiscoveryView["pillarAssessments"];
  overallReview: GuidedDiscoveryView["overallReview"];
  recommended: GuidedDiscoveryView["recommendedNextPillar"];
  readOnly: boolean;
  saving: boolean;
  markingPillar: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onMarkRequest: (pillar: string) => void;
  onMarkCancel: () => void;
  onMarkConfirm: (pillar: string) => void;
  onOpen: (
    pillar: GuidedDiscoveryView["pillarAssessments"][number],
  ) => Promise<void>;
}) {
  const { locale } = useI18n();
  const c =
    locale === "pt-BR"
      ? {
          eyebrow: "Descoberta orientada por capacidades",
          title: "Escolha a próxima capacidade",
          help: "Revise as 14 capacidades em ciclos curtos. Cinco perguntas essenciais criam evidências; perguntas profundas aparecem apenas quando falta confiança, existe conflito ou uma oportunidade precisa ser diferenciada.",
          reviewed: "capacidades revisadas",
          coverage: "Cobertura das evidências",
          confidence: "Confiança",
          recommended: "Próxima capacidade recomendada",
          why: "Por que agora",
          start: "Iniciar",
          continue: "Continuar",
          review: "Revisar",
          explore: "Explorar exemplo",
          notRelevant: "Não relevante",
          markNotRelevant: "Marcar como não relevante",
          reason: "Justificativa",
          reasonPlaceholder: "Por que esta capacidade não se aplica à conta?",
          cancel: "Cancelar",
          confirm: "Confirmar",
          questions: "perguntas essenciais",
          noTechnology: "Resultado ainda não calculado",
        }
      : {
          eyebrow: "Capability-driven discovery",
          title: "Choose the next capability",
          help: "Review 14 capabilities in short cycles. Five core questions create evidence; deep questions appear only when confidence is low, evidence conflicts, or an opportunity needs differentiation.",
          reviewed: "capabilities reviewed",
          coverage: "Evidence coverage",
          confidence: "Confidence",
          recommended: "Recommended next capability",
          why: "Why now",
          start: "Start",
          continue: "Continue",
          review: "Review",
          explore: "Explore example",
          notRelevant: "Not relevant",
          markNotRelevant: "Mark as not relevant",
          reason: "Reason",
          reasonPlaceholder: "Why does this capability not apply to the account?",
          cancel: "Cancel",
          confirm: "Confirm",
          questions: "essential questions",
          noTechnology: "Result not calculated yet",
        };
  const statusCopy = {
    not_started: locale === "pt-BR" ? "Não iniciado" : "Not started",
    in_progress: locale === "pt-BR" ? "Em andamento" : "In progress",
    reviewed_sufficient:
      locale === "pt-BR"
        ? "Revisado · evidência suficiente"
        : "Reviewed · sufficient evidence",
    reviewed_gaps:
      locale === "pt-BR"
        ? "Revisado · lacunas abertas"
        : "Reviewed · open gaps",
    not_relevant: locale === "pt-BR" ? "Não relevante" : "Not relevant",
  } as const;
  const tagTone = (
    status: GuidedDiscoveryView["pillarAssessments"][number]["status"],
  ) =>
    status === "reviewed_sufficient"
      ? "green"
      : status === "reviewed_gaps"
        ? "magenta"
        : status === "in_progress"
          ? "blue"
          : "gray";
  const demoPillarKey =
    pillars.find((pillar) => pillar.sessionId)?.key || pillars[0]?.key;
  return (
    <div className={styles.pillarHub}>
      <header className={styles.pillarHubIntro}>
        <div>
          <span>{c.eyebrow}</span>
          <h2>{c.title}</h2>
          <p>
            {accountName} · {c.help}
          </p>
        </div>
        <div className={styles.reviewSummary}>
          <strong>{overallReview.percent}%</strong>
          <span>
            {overallReview.reviewedPillars}/{overallReview.totalPillars}{" "}
            {c.reviewed}
          </span>
          <ProgressBar
            label={c.reviewed}
            hideLabel
            value={overallReview.percent}
          />
          <small>
            {c.coverage}: {overallReview.coveragePercent}% · {c.confidence}:{" "}
            {overallReview.confidencePercent}%
          </small>
        </div>
      </header>
      {recommended && (
        <section className={styles.recommendedPillar}>
          <div>
            <span>{c.recommended}</span>
            <strong>{recommended.label}</strong>
            <small>
              {c.why}: {recommended.rationale}
            </small>
          </div>
          <Button
            renderIcon={ArrowRight}
            disabled={
              saving || (readOnly && recommended.key !== demoPillarKey)
            }
            onClick={() => {
              const pillar = pillars.find(
                (item) => item.key === recommended.key,
              );
              if (pillar) void onOpen(pillar);
            }}
          >
            {c.start}
          </Button>
        </section>
      )}
      <details className={styles.contextGate}>
        <summary>
          <span>01</span>
          <div>
            <strong>
              {locale === "pt-BR"
                ? "Contexto e elegibilidade da conta"
                : "Account context and eligibility"}
            </strong>
            <small>
              {locale === "pt-BR"
                ? "10 sinais usados para orientar quais capacidades investigar primeiro"
                : "10 signals used to route the capabilities worth investigating first"}
            </small>
          </div>
        </summary>
        <div>
          {CDI_CONTEXT_QUESTIONS.map(([id, title, prompt]) => (
            <article key={id}>
              <span>{id}</span>
              <div>
                <strong>{locale === "pt-BR" ? title.pt : title.en}</strong>
                <p>{locale === "pt-BR" ? prompt.pt : prompt.en}</p>
              </div>
            </article>
          ))}
        </div>
      </details>
      <div className={styles.pillarTable} role="table">
        <div className={styles.pillarTableHeader} role="row">
          <span role="columnheader">{locale === "pt-BR" ? "Capacidade" : "Capability"}</span>
          <span role="columnheader">{locale === "pt-BR" ? "Estado" : "Status"}</span>
          <span role="columnheader">{locale === "pt-BR" ? "Progresso" : "Progress"}</span>
          <span role="columnheader">{locale === "pt-BR" ? "Resultado" : "Result"}</span>
          <span role="columnheader">{locale === "pt-BR" ? "Ação" : "Action"}</span>
        </div>
        {pillars.map((pillar) => {
          const isRecommended = recommended?.key === pillar.key;
          const action =
            readOnly
              ? c.explore
              : pillar.status === "not_started" ||
                  pillar.status === "not_relevant"
                ? c.start
                : pillar.status === "in_progress"
                  ? c.continue
                  : c.review;
          const accessibleInDemo =
            !readOnly || pillar.key === demoPillarKey;
          return (
            <div className={styles.pillarTableRow} role="row" key={pillar.key}>
              <div role="cell">
                <strong>{pillar.label}</strong>
                <small>{pillar.description}</small>
              </div>
              <div role="cell">
                <Tag type={tagTone(pillar.status)}>
                  {statusCopy[pillar.status]}
                </Tag>
                {isRecommended && (
                  <small className={styles.recommendedLabel}>
                    {c.recommended}
                  </small>
                )}
              </div>
              <div role="cell">
                <strong>
                  {pillar.answeredCount}/{pillar.requiredCount}
                </strong>
                <small>{c.questions}</small>
                <ProgressBar
                  label={`${pillar.label} ${c.questions}`}
                  hideLabel
                  value={pillar.progressPercent}
                />
              </div>
              <div role="cell">
                <strong>{pillar.leadingTechnology || c.noTechnology}</strong>
                <small>
                  {c.coverage}: {pillar.coveragePercent}% · {c.confidence}:{" "}
                  {pillar.confidencePercent}%
                </small>
              </div>
              <div role="cell" className={styles.pillarActions}>
                <Button
                  size="sm"
                  kind={isRecommended ? "primary" : "tertiary"}
                  disabled={saving || !accessibleInDemo}
                  onClick={() => void onOpen(pillar)}
                >
                  {action}
                </Button>
                {!readOnly &&
                  pillar.status !== "not_relevant" &&
                  pillar.status !== "reviewed_sufficient" &&
                  markingPillar !== pillar.key && (
                    <button
                      className={styles.textAction}
                      onClick={() => onMarkRequest(pillar.key)}
                    >
                      {c.markNotRelevant}
                    </button>
                  )}
              </div>
              {markingPillar === pillar.key && (
                <div className={styles.notRelevantEditor}>
                  <TextInput
                    id={`not-relevant-${pillar.key}`}
                    labelText={c.reason}
                    placeholder={c.reasonPlaceholder}
                    value={reason}
                    onChange={(event) => onReasonChange(event.target.value)}
                  />
                  <Button size="sm" kind="ghost" onClick={onMarkCancel}>
                    {c.cancel}
                  </Button>
                  <Button
                    size="sm"
                    disabled={saving || reason.trim().length < 5}
                    onClick={() => onMarkConfirm(pillar.key)}
                  >
                    {c.confirm}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StructuredInput({
  question,
  structured,
  onChoose,
  selected,
  disabled,
}: {
  question: GuidedQuestion;
  structured: Record<string, unknown>;
  onChoose: (value: string | number) => void;
  selected: (value: string | number) => boolean;
  disabled: boolean;
}) {
  const { locale, dictionary: d, t } = useI18n();
  const input = question.inputSchema;
  const values =
    input.kind === "scale"
      ? Array.from(
          { length: (input.max || 5) - (input.min || 1) + 1 },
          (_, index) => index + (input.min || 1),
        )
      : input.options || [];
  const catalogId = question.catalogQuestionId || question.id;
  return (
    <fieldset className={styles.structured} disabled={disabled}>
      <legend>{input.label || d.guided.structuredAnswer}</legend>
      <div className={input.kind === "scale" ? styles.scale : styles.options}>
        {values.map((value) => {
          const answerValue =
            typeof value === "string"
              ? canonicalizeGuidedDiscoveryOption(catalogId, value)
              : value;
          return (
            <button
              type="button"
              key={value}
              className={selected(answerValue) ? styles.chosen : ""}
              onClick={() => onChoose(answerValue)}
              aria-pressed={selected(answerValue)}
            >
              <strong>
                {typeof value === "string"
                  ? localizeGuidedDiscoveryOption(catalogId, value, locale)
                  : value}
              </strong>
              {input.kind === "scale" && (
                <small>
                  {Number(value) === 1
                    ? d.guided.initial
                    : Number(value) === 5
                      ? d.guided.advanced
                      : ""}
                </small>
              )}
            </button>
          );
        })}
      </div>
      {input.kind === "multi" && (
        <small>
          {t("guided.selectedCount", {
            count: Array.isArray(structured.value)
              ? structured.value.length
              : 0,
          })}
        </small>
      )}
    </fieldset>
  );
}

function History({
  questions,
  answers,
  onEdit,
  readOnly,
}: {
  questions: GuidedQuestion[];
  answers: GuidedAnswer[];
  onEdit: (questionId: string) => void;
  readOnly: boolean;
}) {
  const { locale, dictionary: d, formatDate } = useI18n();
  return (
    <section className={styles.history}>
      <header>
        <span>{d.guided.sessionMemory}</span>
        <h2>{d.guided.answersRevisions}</h2>
        <p>{d.guided.revisionsHelp}</p>
      </header>
      {answers.map((answer) => {
        const question = questions.find(
          (item) => item.id === answer.questionId,
        );
        const catalogId = question?.catalogQuestionId || question?.id || "";
        const structuredText = Object.values(answer.structured)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .map((value) =>
            localizeGuidedDiscoveryOption(catalogId, String(value), locale),
          )
          .join(" · ");
        return (
          <article key={answer.id}>
            <div>
              <Tag
                type={
                  answer.status === "confirmed"
                    ? "green"
                    : answer.status === "unknown"
                      ? "red"
                      : "gray"
                }
              >
                {answer.status === "confirmed"
                  ? d.guided.confirmed
                  : answer.status === "unknown"
                    ? d.guided.gap
                    : d.guided.draft}
              </Tag>
              <span>{formatDate(answer.updatedAt)}</span>
            </div>
            <h3>{question?.prompt || d.guided.previousQuestion}</h3>
            <p>
              {answer.answerText ||
                (answer.status === "unknown"
                  ? d.guided.markedUnknown
                  : structuredText)}
            </p>
            {!readOnly && (
              <Button
                size="sm"
                kind="ghost"
                onClick={() => onEdit(answer.questionId)}
              >
                {d.guided.reviseAnswer}
              </Button>
            )}
          </article>
        );
      })}
      {!answers.length && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={d.guided.emptyHistory}
          subtitle={d.guided.emptyHistoryHelp}
        />
      )}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}
function Quality({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className={styles[tone]}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function factorLabel(value: string, d: Messages) {
  return (
    (
      {
        informationGap: d.guided.informationGapFactor,
        hypothesisImpact: d.guided.hypothesisImpactFactor,
        staleness: d.guided.stalenessFactor,
        stakeholderCoverage: d.guided.stakeholderCoverageFactor,
      } as Record<string, string>
    )[value] || value
  );
}
function localizeDeltaLabel(label: string, locale: Locale, d: Messages) {
  const replacements =
    locale === "en-US"
      ? ([
          [/Alinhamento/gi, d.common.alignment],
          [/Valor/gi, d.common.value],
          [/Prontidão/gi, d.common.readiness],
          [/Confiança/gi, d.common.confidence],
        ] as const)
      : ([
          [/Alignment/gi, d.common.alignment],
          [/Business value|Value/gi, d.common.value],
          [/Readiness/gi, d.common.readiness],
          [/Confidence/gi, d.common.confidence],
        ] as const);
  return replacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    label,
  );
}
