"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, InlineNotification, ProgressBar, Select, SelectItem, Tag, TextArea, TextInput } from "@carbon/react";
import { ArrowRight, Checkmark, Close, Renew, WatsonHealthTextAnnotationToggle } from "@carbon/icons-react";
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

const pillarLabels: Record<string, string> = { base: "Diagnóstico-base", finops: "FinOps", "trusted-data": "Trusted Data", "ai-governance": "AI Governance", "hybrid-cloud": "Hybrid Cloud", automation: "Automation", "app-modernization": "App Modernization" };
const evidenceOptions = [
  ["confirmed", "Documento ou dado confirmado"],
  ["reported", "Relato de stakeholder"],
  ["hypothesis", "Hipótese a validar"],
  ["unknown", "Ainda desconhecido"],
] as const;

export default function GuidedDiscoveryWorkspace({ open, accountName, discovery, stakeholders, saving, onClose, onStart, onAnswer, onPatch }: Props) {
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

  const virtualSession = Boolean(discovery?.session?.id.startsWith("virtual-"));
  const hasSession = Boolean(discovery?.session && !virtualSession);
  const readOnly = Boolean(discovery?.readonly);
  const currentQuestion = useMemo(() => discovery?.questions.find((question) => question.id === activeQuestionId) || discovery?.nextQuestion || discovery?.currentQuestion || null, [activeQuestionId, discovery]);
  const currentAnswer = useMemo(() => discovery?.answers.find((answer) => answer.questionId === currentQuestion?.id) || null, [currentQuestion?.id, discovery?.answers]);
  const sessionId = discovery?.session?.id || "";

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('[aria-label="Fechar descoberta guiada"]')?.focus(), 0);
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setActiveQuestionId(discovery?.nextQuestion?.id || discovery?.currentQuestion?.id || ""), 0);
    return () => window.clearTimeout(timer);
  }, [open, discovery?.currentQuestion?.id, discovery?.nextQuestion?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStructured(currentAnswer?.structured || {});
      setContext(currentAnswer?.answerText || "");
      setEvidenceStatus(currentAnswer?.evidenceStatus || "reported");
      setStakeholderId(currentAnswer?.stakeholderId || "");
      setSourceType(currentAnswer?.sourceType || "meeting");
      setSourceId(currentAnswer?.sourceId || "");
      setSourceDate(currentAnswer?.sourceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setConfidence(currentAnswer?.confidence || 70);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentAnswer, currentQuestion?.id]);

  if (!open || !discovery) return null;

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
    const result = await onAnswer({ sessionId, questionId: currentQuestion.id, status, structured: status === "unknown" ? {} : structured, answerText: status === "unknown" ? "" : context, evidenceStatus: status === "unknown" ? "unknown" : evidenceStatus, stakeholderId: stakeholderId || null, sourceType: sourceType || null, sourceId: sourceId || null, sourceDate: sourceDate || null, confidence: status === "unknown" ? 0 : confidence });
    if (result?.scoreDeltas) setScoreDeltas(result.scoreDeltas);
  };
  const questionsByPillar = discovery.pillars.filter((pillar) => pillar.selected || discovery.questions.some((question) => question.pillar === pillar.key));

  return <div ref={dialogRef} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`Descoberta guiada de ${accountName}`} tabIndex={-1}>
    <section className={styles.workspace}>
      <header className={styles.header}>
        <div><span>Inteligência de contas · Estratégia</span><h1>Descoberta guiada</h1><p>{accountName} · catálogo {discovery.catalogVersion}</p></div>
        <div className={styles.headerMetrics}><Metric value={`${discovery.metrics.progressPercent}%`} label="Progresso" /><Metric value={`${discovery.metrics.coveragePercent}%`} label="Cobertura" /><button onClick={onClose} aria-label="Fechar descoberta guiada"><Close size={24} /></button></div>
      </header>

      {(readOnly || virtualSession) && <InlineNotification className={styles.demoNotice} kind="info" lowContrast hideCloseButton title="Demonstração preenchida" subtitle={readOnly ? "Explore respostas e lógica de priorização. Para salvar uma sessão própria, entre no workspace privado." : "As respostas legadas aparecem no histórico e serão materializadas ao iniciar a sessão."} />}

      {!hasSession && !readOnly ? <StartPanel mode={mode} setMode={setMode} pillars={discovery.pillars.filter((pillar) => pillar.key !== "base")} selected={selectedPillars} onToggle={togglePillar} saving={saving} onStart={() => onStart(mode, selectedPillars)} /> : <div className={styles.body}>
        <aside className={styles.rail}>
          <div className={styles.railIntro}><span>Roteiro dinâmico</span><strong>{discovery.metrics.addressed} de {discovery.metrics.total} abordadas</strong><ProgressBar label="Progresso da sessão" hideLabel value={discovery.metrics.progressPercent} /><small>Progresso mede perguntas abordadas; cobertura exige evidência confirmada.</small></div>
          <nav aria-label="Pilares da descoberta">{questionsByPillar.map((pillar) => <div className={styles.pillarGroup} key={pillar.key}><button className={currentQuestion?.pillar === pillar.key ? styles.activePillar : ""} onClick={() => { const next = discovery.questions.find((question) => question.pillar === pillar.key && question.status !== "answered") || discovery.questions.find((question) => question.pillar === pillar.key); if (next) setActiveQuestionId(next.id); }}><span><strong>{pillar.label}</strong><small>{pillar.relevance}% relevância</small></span><em>{pillar.progressPercent}%</em></button><div className={styles.questionDots}>{discovery.questions.filter((question) => question.pillar === pillar.key && question.status !== "dismissed").map((question) => <button key={question.id} title={question.prompt} aria-label={question.prompt} className={`${question.status === "answered" ? styles.done : ""} ${question.id === currentQuestion?.id ? styles.current : ""}`} onClick={() => setActiveQuestionId(question.id)}>{question.status === "answered" ? <Checkmark size={12} /> : question.sequence + 1}</button>)}</div></div>)}</nav>
          <button className={styles.historyToggle} onClick={() => setShowHistory((current) => !current)}>{showHistory ? "Ocultar histórico" : `Histórico e revisões (${discovery.history.length})`} <ArrowRight size={16} /></button>
        </aside>

        <main className={styles.questionArea}>
          {showHistory ? <History questions={discovery.questions} answers={discovery.history} onEdit={(id) => { setActiveQuestionId(id); setShowHistory(false); }} readOnly={readOnly} /> : currentQuestion ? <>
            <div className={styles.questionTop}><div><Tag type={currentQuestion.source === "ai" ? "purple" : currentQuestion.pillar === "base" ? "blue" : "cyan"}>{currentQuestion.source === "ai" ? "Proposta de IA" : pillarLabels[currentQuestion.pillar] || currentQuestion.pillar}</Tag><span>Pergunta {currentQuestion.sequence + 1} · valor de informação {currentQuestion.rankingScore || "—"}</span></div>{currentAnswer && <Tag type={currentAnswer.status === "confirmed" ? "green" : currentAnswer.status === "unknown" ? "red" : "gray"}>{currentAnswer.status === "confirmed" ? "Confirmada" : currentAnswer.status === "unknown" ? "Lacuna" : "Rascunho"}</Tag>}</div>
            <h2>{currentQuestion.prompt}</h2><p className={styles.hint}>{currentQuestion.hint}</p>
            <StructuredInput question={currentQuestion} structured={structured} onChoose={chooseStructured} selected={isSelected} disabled={readOnly || saving} />
            <TextArea id="guided-context" labelText="Contexto e evidência" helperText="Registre o que foi dito, exemplos, métricas e o que ainda precisa ser validado." rows={7} value={context} onChange={(event) => setContext(event.target.value)} disabled={readOnly || saving} />
            <div className={styles.evidenceGrid}>
              <Select id="guided-evidence" labelText="Natureza da evidência" value={evidenceStatus} onChange={(event) => setEvidenceStatus(event.target.value)} disabled={readOnly || saving}>{evidenceOptions.map(([value, label]) => <SelectItem key={value} value={value} text={label} />)}</Select>
              <Select id="guided-stakeholder" labelText="Stakeholder relacionado" value={stakeholderId} onChange={(event) => setStakeholderId(event.target.value)} disabled={readOnly || saving}><SelectItem value="" text="Ainda não relacionado" />{stakeholders.map((person) => <SelectItem key={person.id} value={person.id} text={`${person.name} · ${person.role}`} />)}</Select>
              <Select id="guided-source-type" labelText="Origem" value={sourceType} onChange={(event) => setSourceType(event.target.value)} disabled={readOnly || saving}><SelectItem value="meeting" text="Reunião" /><SelectItem value="document" text="Documento" /><SelectItem value="customer" text="Relato do cliente" /><SelectItem value="research" text="Pesquisa aprovada" /><SelectItem value="other" text="Outra" /></Select>
              <TextInput id="guided-source" labelText="Fonte / referência" value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="Ex.: QBR 2026, página 4" disabled={readOnly || saving} />
              <TextInput id="guided-date" type="date" labelText="Data da evidência" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} disabled={readOnly || saving} />
              <label className={styles.confidence}><span>Confiança <strong>{confidence}%</strong></span><input type="range" min="0" max="100" step="1" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} disabled={readOnly || saving} /></label>
            </div>
            <div className={styles.actions}>{!readOnly && <><Button kind="ghost" disabled={saving} onClick={() => onPatch({ sessionId, operation: "pause" })}>Pausar</Button><Button kind="secondary" disabled={saving} onClick={() => save("draft")}>Salvar rascunho</Button><Button kind="tertiary" disabled={saving} onClick={() => save("unknown")}>Não sei ainda</Button><Button renderIcon={ArrowRight} disabled={saving} onClick={() => save("confirmed")}>Confirmar e continuar</Button></>}</div>
          </> : <div className={styles.complete}><Checkmark size={40} /><h2>Roteiro abordado</h2><p>Revise lacunas, solicite um checkpoint ou conclua a sessão quando fizer sentido.</p></div>}
        </main>

        <aside className={styles.insightRail}>
          <section><span>Por que estamos perguntando isso?</span><p>{currentQuestion?.rationale || "A próxima pergunta é ordenada pelo valor que pode acrescentar às hipóteses e à cobertura da conta."}</p>{currentQuestion?.factors && <dl>{Object.entries(currentQuestion.factors).map(([key, value]) => <div key={key}><dt>{factorLabel(key)}</dt><dd>{value}</dd></div>)}</dl>}</section>
          <section><span>Qualidade da descoberta</span><div className={styles.quality}><Quality value={discovery.metrics.confirmedWithEvidence} label="com evidência" tone="known" /><Quality value={discovery.metrics.gaps} label="lacunas" tone="gap" /><Quality value={discovery.metrics.stale} label="desatualizadas" tone="stale" /><Quality value={discovery.metrics.contradictions} label="contradições" tone="risk" /></div></section>
          {scoreDeltas.length > 0 && <section><span>Impacto desta resposta</span><div className={styles.deltas}>{scoreDeltas.map((delta) => <div key={delta.label}><span>{delta.label}</span><strong className={delta.delta > 0 ? styles.positive : styles.negative}>{delta.delta > 0 ? "+" : ""}{delta.delta}</strong><small>{delta.before} → {delta.after}</small></div>)}</div></section>}
          {discovery.proposedFollowUp && <section className={styles.aiProposal}><span><WatsonHealthTextAnnotationToggle size={18} /> Follow-up proposto</span><p>{discovery.proposedFollowUp.prompt}</p><small>{discovery.proposedFollowUp.rationale}</small>{!readOnly && <div><Button size="sm" kind="secondary" disabled={saving} onClick={() => onPatch({ sessionId, operation: "dismiss_follow_up", questionId: discovery.proposedFollowUp!.id })}>Descartar</Button><Button size="sm" disabled={saving} onClick={() => onPatch({ sessionId, operation: "accept_follow_up", questionId: discovery.proposedFollowUp!.id })}>Aceitar</Button></div>}</section>}
          {discovery.checkpoint?.available && !discovery.proposedFollowUp && <section className={styles.checkpoint}><span>Checkpoint disponível</span><p>O catálogo já recalculou o roteiro. A IA pode propor uma pergunta complementar, sem alterar scores.</p>{!readOnly && <Button size="sm" kind="tertiary" renderIcon={Renew} disabled={saving} onClick={() => onPatch({ sessionId, operation: "checkpoint" })}>Solicitar follow-up</Button>}</section>}
          {!readOnly && <Button className={styles.finish} kind="danger--tertiary" size="sm" disabled={saving || discovery.metrics.addressed === 0} onClick={() => onPatch({ sessionId, operation: "complete" })}>Concluir sessão</Button>}
        </aside>
      </div>}
    </section>
  </div>;
}

function StartPanel({ mode, setMode, pillars, selected, onToggle, saving, onStart }: { mode: "adaptive" | "direct"; setMode: (mode: "adaptive" | "direct") => void; pillars: GuidedDiscoveryView["pillars"]; selected: string[]; onToggle: (key: string) => void; saving: boolean; onStart: () => void }) {
  return <div className={styles.start}>
    <div><span>Novo diagnóstico</span><h2>Escolha como quer começar</h2><p>O roteiro permanece editável e recalcula a próxima pergunta conforme as evidências avançam.</p></div>
    <div className={styles.modeCards}><button className={mode === "adaptive" ? styles.selectedMode : ""} onClick={() => setMode("adaptive")}><Tag type="blue">Recomendado</Tag><h3>Adaptativo</h3><p>Começa pelas seis perguntas-base, identifica os dois pilares mais relevantes e monta o roteiro.</p></button><button className={mode === "direct" ? styles.selectedMode : ""} onClick={() => setMode("direct")}><Tag type="cyan">Atalho</Tag><h3>Direto por pilar</h3><p>Entre imediatamente em um ou mais temas tecnológicos que já fazem parte da conversa.</p></button></div>
    {mode === "direct" && <div className={styles.pillarChoices}><span>Selecione os pilares</span>{pillars.map((pillar) => <button key={pillar.key} className={selected.includes(pillar.key) ? styles.selectedPillar : ""} onClick={() => onToggle(pillar.key)}><strong>{pillar.label}</strong><p>{pillar.description}</p><small>{pillar.relevance}% relevância atual</small></button>)}</div>}
    <Button renderIcon={ArrowRight} disabled={saving || (mode === "direct" && selected.length === 0)} onClick={onStart}>{saving ? "Preparando roteiro…" : mode === "adaptive" ? "Iniciar diagnóstico adaptativo" : "Entrar nos pilares selecionados"}</Button>
  </div>;
}

function StructuredInput({ question, structured, onChoose, selected, disabled }: { question: GuidedQuestion; structured: Record<string, unknown>; onChoose: (value: string | number) => void; selected: (value: string | number) => boolean; disabled: boolean }) {
  const input = question.inputSchema;
  const values = input.kind === "scale" ? Array.from({ length: (input.max || 5) - (input.min || 1) + 1 }, (_, index) => index + (input.min || 1)) : input.options || [];
  return <fieldset className={styles.structured} disabled={disabled}><legend>{input.label || "Resposta estruturada"}</legend><div className={input.kind === "scale" ? styles.scale : styles.options}>{values.map((value) => <button type="button" key={value} className={selected(value) ? styles.chosen : ""} onClick={() => onChoose(value)} aria-pressed={selected(value)}><strong>{value}</strong>{input.kind === "scale" && <small>{Number(value) === 1 ? "Inicial" : Number(value) === 5 ? "Avançado" : ""}</small>}</button>)}</div>{input.kind === "multi" && <small>{Array.isArray(structured.value) ? structured.value.length : 0} selecionado(s)</small>}</fieldset>;
}

function History({ questions, answers, onEdit, readOnly }: { questions: GuidedQuestion[]; answers: GuidedAnswer[]; onEdit: (questionId: string) => void; readOnly: boolean }) {
  return <section className={styles.history}><header><span>Memória da sessão</span><h2>Respostas e revisões</h2><p>Cada edição cria uma versão nova; a fonte original permanece auditável.</p></header>{answers.map((answer) => { const question = questions.find((item) => item.id === answer.questionId); return <article key={answer.id}><div><Tag type={answer.status === "confirmed" ? "green" : answer.status === "unknown" ? "red" : "gray"}>{answer.status}</Tag><span>{new Date(answer.updatedAt).toLocaleDateString("pt-BR")}</span></div><h3>{question?.prompt || "Pergunta anterior"}</h3><p>{answer.answerText || answer.status === "unknown" ? answer.answerText || "Marcada como ainda desconhecida." : Object.values(answer.structured).join(" · ")}</p>{!readOnly && <Button size="sm" kind="ghost" onClick={() => onEdit(answer.questionId)}>Revisar resposta</Button>}</article>; })}{!answers.length && <InlineNotification kind="info" lowContrast hideCloseButton title="Histórico vazio" subtitle="As respostas aparecerão aqui com suas revisões e fontes." />}</section>;
}

function Metric({ value, label }: { value: string; label: string }) { return <span><strong>{value}</strong><small>{label}</small></span>; }
function Quality({ value, label, tone }: { value: number; label: string; tone: string }) { return <div className={styles[tone]}><strong>{value}</strong><span>{label}</span></div>; }
function factorLabel(value: string) { return ({ informationGap: "Lacuna de informação · 45%", hypothesisImpact: "Impacto nas hipóteses · 30%", staleness: "Desatualização · 15%", stakeholderCoverage: "Cobertura política · 10%" } as Record<string, string>)[value] || value; }
