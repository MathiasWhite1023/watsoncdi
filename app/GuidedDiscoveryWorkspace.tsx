"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, InlineNotification, ProgressBar, Select, SelectItem, Tag, TextArea, TextInput } from "@carbon/react";
import { ArrowRight, Checkmark, Close, Renew, WatsonHealthTextAnnotationToggle } from "@carbon/icons-react";
import { useI18n } from "./I18nProvider";
import { canonicalizeGuidedDiscoveryOption, getLocalizedPillarMeta, getLocalizedQuestionById, isGuidedDiscoveryPillar, localizeGuidedDiscoveryOption } from "@/lib/guided-discovery";
import type { Locale, Messages } from "@/lib/i18n";
import styles from "./GuidedDiscoveryWorkspace.module.css";

export type GuidedQuestion = {
  id: string;
  catalogQuestionId: string | null;
  pillar: string;
  prompt: string;
  hint: string | null;
  inputSchema: { kind?: "scale" | "single" | "multi"; label?: string; min?: number; max?: number; options?: string[] };
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
  session: { id: string; mode: "adaptive" | "direct"; selectedPillars: string[]; status: string; progressPercent: number; coveragePercent: number; checkpointCount: number; aiStatus: string | null } | null;
  questions: GuidedQuestion[];
  answers: GuidedAnswer[];
  currentQuestion: GuidedQuestion | null;
  nextQuestion: GuidedQuestion | null;
  metrics: { addressed: number; total: number; progressPercent: number; confirmedWithEvidence: number; coveragePercent: number; gaps: number; stale: number; contradictions: number };
  pillars: Array<{ key: string; label: string; description: string; progressPercent: number; coveragePercent: number; gaps: number; stale: number; relevance: number; rationale: string; selected: boolean }>;
  checkpoint: { kind: string; pillar: string; available: boolean } | null;
  proposedFollowUp: GuidedQuestion | null;
  history: GuidedAnswer[];
  scoreHints: Record<string, number>;
};

type StakeholderOption = { id: string; name: string; role: string };
type MutationResult = { scoreDeltas?: Array<{ label: string; before: number; after: number; delta: number }> } | null | void;

type Props = {
  open: boolean;
  accountName: string;
  discovery: GuidedDiscoveryView | null;
  stakeholders: StakeholderOption[];
  saving: boolean;
  onClose: () => void;
  onStart: (mode: "adaptive" | "direct", pillars: string[]) => Promise<unknown>;
  onAnswer: (payload: Record<string, unknown>) => Promise<MutationResult>;
  onPatch: (payload: Record<string, unknown>) => Promise<unknown>;
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

function localizeDiscovery(discovery: GuidedDiscoveryView | null, locale: Locale): GuidedDiscoveryView | null {
  if (!discovery) return null;
  const questions = discovery.questions.map((question) => localizeQuestion(question, locale) as GuidedQuestion);
  const byId = new Map(questions.map((question) => [question.id, question]));
  return {
    ...discovery,
    questions,
    currentQuestion: discovery.currentQuestion ? byId.get(discovery.currentQuestion.id) || localizeQuestion(discovery.currentQuestion, locale) : null,
    nextQuestion: discovery.nextQuestion ? byId.get(discovery.nextQuestion.id) || localizeQuestion(discovery.nextQuestion, locale) : null,
    proposedFollowUp: localizeQuestion(discovery.proposedFollowUp, locale),
    pillars: discovery.pillars.map((pillar) => {
      const meta = isGuidedDiscoveryPillar(pillar.key) ? getLocalizedPillarMeta(pillar.key, locale) : null;
      return meta ? { ...pillar, label: meta.label, description: meta.description } : pillar;
    }),
  };
}

export default function GuidedDiscoveryWorkspace({ open, accountName, discovery, stakeholders, saving, onClose, onStart, onAnswer, onPatch }: Props) {
  const { locale, dictionary: d, t } = useI18n();
  const view = useMemo(() => localizeDiscovery(discovery, locale), [discovery, locale]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [mode, setMode] = useState<"adaptive" | "direct">("adaptive");
  const [selectedPillars, setSelectedPillars] = useState<string[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [structured, setStructured] = useState<Record<string, unknown>>({});
  const [context, setContext] = useState("");
  const [evidenceStatus, setEvidenceStatus] = useState("reported");
  const [stakeholderId, setStakeholderId] = useState("");
  const [sourceType, setSourceType] = useState("meeting");
  const [sourceId, setSourceId] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [confidence, setConfidence] = useState(70);
  const [scoreDeltas, setScoreDeltas] = useState<Array<{ label: string; before: number; after: number; delta: number }>>([]);
  const [showHistory, setShowHistory] = useState(false);

  const virtualSession = Boolean(view?.session?.id.startsWith("virtual-"));
  const hasSession = Boolean(view?.session && !virtualSession);
  const readOnly = Boolean(view?.readonly);
  const currentQuestion = useMemo(() => view?.questions.find((question) => question.id === activeQuestionId) || view?.nextQuestion || view?.currentQuestion || null, [activeQuestionId, view]);
  const currentAnswer = useMemo(() => view?.answers.find((answer) => answer.questionId === currentQuestion?.id) || null, [currentQuestion?.id, view?.answers]);
  const sessionId = view?.session?.id || "";

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>(`[aria-label="${d.guided.closeLabel}"]`)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter((element) => element.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
    const timer = window.setTimeout(() => setActiveQuestionId(view?.nextQuestion?.id || view?.currentQuestion?.id || ""), 0);
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
      setSourceDate(currentAnswer?.sourceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setConfidence(currentAnswer?.confidence ?? 70);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentAnswer, currentQuestion?.id]);

  if (!open || !view) return null;

  const evidenceOptions = [
    ["confirmed", d.guided.evidenceConfirmed], ["reported", d.guided.evidenceReported],
    ["hypothesis", d.guided.evidenceHypothesis], ["unknown", d.guided.evidenceUnknown],
  ] as const;
  const togglePillar = (pillar: string) => setSelectedPillars((current) => current.includes(pillar) ? current.filter((item) => item !== pillar) : [...current, pillar]);
  const chooseStructured = (value: string | number) => {
    if (currentQuestion?.inputSchema.kind === "multi") {
      const current = Array.isArray(structured.value) ? structured.value.map(String) : [];
      setStructured({ value: current.includes(String(value)) ? current.filter((item) => item !== String(value)) : [...current, String(value)] });
    } else setStructured({ value });
  };
  const isSelected = (value: string | number) => Array.isArray(structured.value) ? structured.value.map(String).includes(String(value)) : String(structured.value ?? "") === String(value);
  const save = async (status: "draft" | "confirmed" | "unknown") => {
    if (!currentQuestion || !sessionId || virtualSession) return;
    const result = await onAnswer({ sessionId, questionId: currentQuestion.id, status, structured: status === "unknown" ? {} : structured, answerText: status === "unknown" ? "" : context, evidenceStatus: status === "unknown" ? "unknown" : evidenceStatus, stakeholderId: stakeholderId || null, sourceType: sourceType || null, sourceId: sourceId || null, sourceDate: sourceDate || null, confidence: status === "unknown" ? 0 : confidence, responseLocale: locale });
    if (result?.scoreDeltas) setScoreDeltas(result.scoreDeltas);
  };
  const questionsByPillar = view.pillars.filter((pillar) => pillar.selected || view.questions.some((question) => question.pillar === pillar.key));
  const currentPillar = view.pillars.find((pillar) => pillar.key === currentQuestion?.pillar)?.label || currentQuestion?.pillar;

  return <div ref={dialogRef} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`${d.guided.title}: ${accountName}`} tabIndex={-1}>
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div><span>{d.guided.accountStrategy}</span><h1>{d.guided.title}</h1><p>{accountName} · {d.guided.catalog} {view.catalogVersion}</p></div>
        <div className={styles.headerMetrics}><Metric value={`${view.metrics.progressPercent}%`} label={d.common.progress} /><Metric value={`${view.metrics.coveragePercent}%`} label={d.common.coverage} /><button onClick={onClose} aria-label={d.guided.closeLabel}><Close size={24} /></button></div>
      </header>

      {(readOnly || virtualSession) && <InlineNotification className={styles.demoNotice} kind="info" lowContrast hideCloseButton title={d.guided.demoTitle} subtitle={readOnly ? d.guided.demoReadonly : d.guided.demoLegacy} />}

      {!hasSession && !readOnly ? <StartPanel mode={mode} setMode={setMode} pillars={view.pillars.filter((pillar) => pillar.key !== "base")} selected={selectedPillars} onToggle={togglePillar} saving={saving} onStart={() => onStart(mode, selectedPillars)} /> : <div className={styles.body}>
        <aside className={styles.rail}>
          <div className={styles.railIntro}><span>{d.guided.dynamicPath}</span><strong>{t("guided.addressed", { addressed: view.metrics.addressed, total: view.metrics.total })}</strong><ProgressBar label={d.guided.sessionProgress} hideLabel value={view.metrics.progressPercent} /><small>{d.guided.progressHelp}</small></div>
          <nav aria-label={d.guided.discoveryPillars}>{questionsByPillar.map((pillar) => <div className={styles.pillarGroup} key={pillar.key}><button className={currentQuestion?.pillar === pillar.key ? styles.activePillar : ""} onClick={() => { const next = view.questions.find((question) => question.pillar === pillar.key && question.status !== "answered") || view.questions.find((question) => question.pillar === pillar.key); if (next) setActiveQuestionId(next.id); }}><span><strong>{pillar.label}</strong><small>{pillar.relevance}% {d.guided.relevance}</small></span><em>{pillar.progressPercent}%</em></button><div className={styles.questionDots}>{view.questions.filter((question) => question.pillar === pillar.key && question.status !== "dismissed").map((question) => <button key={question.id} title={question.prompt} aria-label={question.prompt} className={`${question.status === "answered" ? styles.done : ""} ${question.id === currentQuestion?.id ? styles.current : ""}`} onClick={() => setActiveQuestionId(question.id)}>{question.status === "answered" ? <Checkmark size={12} /> : question.sequence + 1}</button>)}</div></div>)}</nav>
          <button className={styles.historyToggle} onClick={() => setShowHistory((current) => !current)}>{showHistory ? d.guided.hideHistory : t("guided.historyAndRevisions", { count: view.history.length })} <ArrowRight size={16} /></button>
        </aside>

        <main className={styles.questionArea}>
          {showHistory ? <History questions={view.questions} answers={view.history} onEdit={(id) => { setActiveQuestionId(id); setShowHistory(false); }} readOnly={readOnly} /> : currentQuestion ? <>
            <div className={styles.questionTop}><div><Tag type={currentQuestion.source === "ai" ? "purple" : currentQuestion.pillar === "base" ? "blue" : "cyan"}>{currentQuestion.source === "ai" ? d.guided.aiProposal : currentPillar}</Tag><span>{t("guided.questionPosition", { number: currentQuestion.sequence + 1, score: currentQuestion.rankingScore || "—" })}</span></div>{currentAnswer && <Tag type={currentAnswer.status === "confirmed" ? "green" : currentAnswer.status === "unknown" ? "red" : "gray"}>{currentAnswer.status === "confirmed" ? d.guided.confirmed : currentAnswer.status === "unknown" ? d.guided.gap : d.guided.draft}</Tag>}</div>
            <h2>{currentQuestion.prompt}</h2><p className={styles.hint}>{currentQuestion.hint}</p>
            <StructuredInput question={currentQuestion} structured={structured} onChoose={chooseStructured} selected={isSelected} disabled={readOnly || saving} />
            <TextArea id="guided-context" labelText={d.guided.contextLabel} helperText={d.guided.contextHelp} rows={7} value={context} onChange={(event) => setContext(event.target.value)} disabled={readOnly || saving} />
            <div className={styles.evidenceGrid}>
              <Select id="guided-evidence" labelText={d.guided.evidenceNature} value={evidenceStatus} onChange={(event) => setEvidenceStatus(event.target.value)} disabled={readOnly || saving}>{evidenceOptions.map(([value, label]) => <SelectItem key={value} value={value} text={label} />)}</Select>
              <Select id="guided-stakeholder" labelText={d.guided.relatedStakeholder} value={stakeholderId} onChange={(event) => setStakeholderId(event.target.value)} disabled={readOnly || saving}><SelectItem value="" text={d.guided.stakeholderUnlinked} />{stakeholders.map((person) => <SelectItem key={person.id} value={person.id} text={`${person.name} · ${person.role}`} />)}</Select>
              <Select id="guided-source-type" labelText={d.guided.sourceType} value={sourceType} onChange={(event) => setSourceType(event.target.value)} disabled={readOnly || saving}><SelectItem value="meeting" text={d.guided.sourceMeeting} /><SelectItem value="document" text={d.guided.sourceDocument} /><SelectItem value="customer" text={d.guided.sourceCustomer} /><SelectItem value="research" text={d.guided.sourceResearch} /><SelectItem value="other" text={d.guided.sourceOther} /></Select>
              <TextInput id="guided-source" labelText={d.guided.sourceReference} value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder={d.guided.sourcePlaceholder} disabled={readOnly || saving} />
              <TextInput id="guided-date" type="date" labelText={d.guided.evidenceDate} value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} disabled={readOnly || saving} />
              <label className={styles.confidence}><span>{d.common.confidence} <strong>{confidence}%</strong></span><input type="range" min="0" max="100" step="1" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} disabled={readOnly || saving} /></label>
            </div>
            <div className={styles.actions}>{!readOnly && <><Button kind="ghost" disabled={saving} onClick={() => onPatch({ sessionId, operation: "pause", responseLocale: locale })}>{d.guided.pause}</Button><Button kind="secondary" disabled={saving} onClick={() => save("draft")}>{d.guided.saveDraft}</Button><Button kind="tertiary" disabled={saving} onClick={() => save("unknown")}>{d.guided.doNotKnow}</Button><Button renderIcon={ArrowRight} disabled={saving} onClick={() => save("confirmed")}>{d.guided.confirmContinue}</Button></>}</div>
          </> : <div className={styles.complete}><Checkmark size={40} /><h2>{d.guided.pathAddressed}</h2><p>{d.guided.pathAddressedHelp}</p></div>}
        </main>

        <aside className={styles.insightRail}>
          <section><span>{d.guided.whyAsk}</span><p>{currentQuestion?.rationale || d.guided.defaultRationale}</p>{currentQuestion?.factors && <dl>{Object.entries(currentQuestion.factors).map(([key, value]) => <div key={key}><dt>{factorLabel(key, d)}</dt><dd>{value}</dd></div>)}</dl>}</section>
          <section><span>{d.guided.discoveryQuality}</span><div className={styles.quality}><Quality value={view.metrics.confirmedWithEvidence} label={d.guided.withEvidence} tone="known" /><Quality value={view.metrics.gaps} label={d.guided.gaps} tone="gap" /><Quality value={view.metrics.stale} label={d.guided.stale} tone="stale" /><Quality value={view.metrics.contradictions} label={d.guided.contradictions} tone="risk" /></div></section>
          {scoreDeltas.length > 0 && <section><span>{d.guided.answerImpact}</span><div className={styles.deltas}>{scoreDeltas.map((delta) => <div key={delta.label}><span>{localizeDeltaLabel(delta.label, locale, d)}</span><strong className={delta.delta > 0 ? styles.positive : styles.negative}>{delta.delta > 0 ? "+" : ""}{delta.delta}</strong><small>{delta.before} → {delta.after}</small></div>)}</div></section>}
          {view.proposedFollowUp && <section className={styles.aiProposal}><span><WatsonHealthTextAnnotationToggle size={18} /> {d.guided.proposedFollowUp}</span><p>{view.proposedFollowUp.prompt}</p><small>{view.proposedFollowUp.rationale}</small>{!readOnly && <div><Button size="sm" kind="secondary" disabled={saving} onClick={() => onPatch({ sessionId, operation: "dismiss_follow_up", questionId: view.proposedFollowUp!.id, responseLocale: locale })}>{d.common.dismiss}</Button><Button size="sm" disabled={saving} onClick={() => onPatch({ sessionId, operation: "accept_follow_up", questionId: view.proposedFollowUp!.id, responseLocale: locale })}>{d.common.accept}</Button></div>}</section>}
          {view.checkpoint?.available && !view.proposedFollowUp && <section className={styles.checkpoint}><span>{d.guided.checkpointAvailable}</span><p>{d.guided.checkpointHelp}</p>{!readOnly && <Button size="sm" kind="tertiary" renderIcon={Renew} disabled={saving} onClick={() => onPatch({ sessionId, operation: "checkpoint", responseLocale: locale })}>{d.guided.requestFollowUp}</Button>}</section>}
          {!readOnly && <Button className={styles.finish} kind="danger--tertiary" size="sm" disabled={saving || view.metrics.addressed === 0} onClick={() => onPatch({ sessionId, operation: "complete", responseLocale: locale })}>{d.guided.completeSession}</Button>}
        </aside>
      </div>}
    </section>
  </div>;
}

function StartPanel({ mode, setMode, pillars, selected, onToggle, saving, onStart }: { mode: "adaptive" | "direct"; setMode: (mode: "adaptive" | "direct") => void; pillars: GuidedDiscoveryView["pillars"]; selected: string[]; onToggle: (key: string) => void; saving: boolean; onStart: () => void }) {
  const { dictionary: d } = useI18n();
  return <div className={styles.start}>
    <div><span>{d.guided.newAssessment}</span><h2>{d.guided.chooseStart}</h2><p>{d.guided.startHelp}</p></div>
    <div className={styles.modeCards}><button className={mode === "adaptive" ? styles.selectedMode : ""} onClick={() => setMode("adaptive")}><Tag type="blue">{d.guided.recommended}</Tag><h3>{d.guided.adaptive}</h3><p>{d.guided.adaptiveHelp}</p></button><button className={mode === "direct" ? styles.selectedMode : ""} onClick={() => setMode("direct")}><Tag type="cyan">{d.guided.shortcut}</Tag><h3>{d.guided.direct}</h3><p>{d.guided.directHelp}</p></button></div>
    {mode === "direct" && <div className={styles.pillarChoices}><span>{d.guided.selectPillars}</span>{pillars.map((pillar) => <button key={pillar.key} className={selected.includes(pillar.key) ? styles.selectedPillar : ""} onClick={() => onToggle(pillar.key)}><strong>{pillar.label}</strong><p>{pillar.description}</p><small>{pillar.relevance}% {d.guided.currentRelevance}</small></button>)}</div>}
    <Button renderIcon={ArrowRight} disabled={saving || (mode === "direct" && selected.length === 0)} onClick={onStart}>{saving ? d.guided.preparingPath : mode === "adaptive" ? d.guided.startAdaptive : d.guided.enterSelected}</Button>
  </div>;
}

function StructuredInput({ question, structured, onChoose, selected, disabled }: { question: GuidedQuestion; structured: Record<string, unknown>; onChoose: (value: string | number) => void; selected: (value: string | number) => boolean; disabled: boolean }) {
  const { locale, dictionary: d, t } = useI18n();
  const input = question.inputSchema;
  const values = input.kind === "scale" ? Array.from({ length: (input.max || 5) - (input.min || 1) + 1 }, (_, index) => index + (input.min || 1)) : input.options || [];
  const catalogId = question.catalogQuestionId || question.id;
  return <fieldset className={styles.structured} disabled={disabled}><legend>{input.label || d.guided.structuredAnswer}</legend><div className={input.kind === "scale" ? styles.scale : styles.options}>{values.map((value) => { const answerValue = typeof value === "string" ? canonicalizeGuidedDiscoveryOption(catalogId, value) : value; return <button type="button" key={value} className={selected(answerValue) ? styles.chosen : ""} onClick={() => onChoose(answerValue)} aria-pressed={selected(answerValue)}><strong>{typeof value === "string" ? localizeGuidedDiscoveryOption(catalogId, value, locale) : value}</strong>{input.kind === "scale" && <small>{Number(value) === 1 ? d.guided.initial : Number(value) === 5 ? d.guided.advanced : ""}</small>}</button>; })}</div>{input.kind === "multi" && <small>{t("guided.selectedCount", { count: Array.isArray(structured.value) ? structured.value.length : 0 })}</small>}</fieldset>;
}

function History({ questions, answers, onEdit, readOnly }: { questions: GuidedQuestion[]; answers: GuidedAnswer[]; onEdit: (questionId: string) => void; readOnly: boolean }) {
  const { locale, dictionary: d, formatDate } = useI18n();
  return <section className={styles.history}><header><span>{d.guided.sessionMemory}</span><h2>{d.guided.answersRevisions}</h2><p>{d.guided.revisionsHelp}</p></header>{answers.map((answer) => { const question = questions.find((item) => item.id === answer.questionId); const catalogId = question?.catalogQuestionId || question?.id || ""; const structuredText = Object.values(answer.structured).flatMap((value) => Array.isArray(value) ? value : [value]).map((value) => localizeGuidedDiscoveryOption(catalogId, String(value), locale)).join(" · "); return <article key={answer.id}><div><Tag type={answer.status === "confirmed" ? "green" : answer.status === "unknown" ? "red" : "gray"}>{answer.status === "confirmed" ? d.guided.confirmed : answer.status === "unknown" ? d.guided.gap : d.guided.draft}</Tag><span>{formatDate(answer.updatedAt)}</span></div><h3>{question?.prompt || d.guided.previousQuestion}</h3><p>{answer.answerText || (answer.status === "unknown" ? d.guided.markedUnknown : structuredText)}</p>{!readOnly && <Button size="sm" kind="ghost" onClick={() => onEdit(answer.questionId)}>{d.guided.reviseAnswer}</Button>}</article>; })}{!answers.length && <InlineNotification kind="info" lowContrast hideCloseButton title={d.guided.emptyHistory} subtitle={d.guided.emptyHistoryHelp} />}</section>;
}

function Metric({ value, label }: { value: string; label: string }) { return <span><strong>{value}</strong><small>{label}</small></span>; }
function Quality({ value, label, tone }: { value: number; label: string; tone: string }) { return <div className={styles[tone]}><strong>{value}</strong><span>{label}</span></div>; }
function factorLabel(value: string, d: Messages) { return ({ informationGap: d.guided.informationGapFactor, hypothesisImpact: d.guided.hypothesisImpactFactor, staleness: d.guided.stalenessFactor, stakeholderCoverage: d.guided.stakeholderCoverageFactor } as Record<string, string>)[value] || value; }
function localizeDeltaLabel(label: string, locale: Locale, d: Messages) {
  const replacements = locale === "en-US"
    ? [[/Alinhamento/gi, d.common.alignment], [/Valor/gi, d.common.value], [/Prontidão/gi, d.common.readiness], [/Confiança/gi, d.common.confidence]] as const
    : [[/Alignment/gi, d.common.alignment], [/Business value|Value/gi, d.common.value], [/Readiness/gi, d.common.readiness], [/Confidence/gi, d.common.confidence]] as const;
  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), label);
}
