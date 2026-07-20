"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Button,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ProgressBar,
  Tag,
} from "@carbon/react";
import {
  Analytics,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Checkmark,
  Close,
  Copy,
  Document,
  Download,
  Flow,
  Information,
  Time,
  WarningAlt,
  Watson,
} from "@carbon/icons-react";
import styles from "./CommercialProofPanels.module.css";

export type CommercialProofLocale = "en-US" | "pt-BR";
export type AsyncAction = void | Promise<void>;

export type ConversationScoreDelta = {
  id: string;
  label: string;
  before: number;
  after: number;
  max?: number;
};

export type ConversationFindingKind =
  | "fact"
  | "stakeholder"
  | "pain"
  | "initiative"
  | "system"
  | "risk";

export type ConversationFinding = {
  id: string;
  kind: ConversationFindingKind;
  title: string;
  detail?: string;
  sourceLabel?: string;
  confidence?: number;
};

export type ConversationChangeKind = "hypothesis" | "action";
export type ConversationChangeState =
  | "new"
  | "updated"
  | "strengthened"
  | "weakened";

export type ConversationChange = {
  id: string;
  kind: ConversationChangeKind;
  state: ConversationChangeState;
  title: string;
  previous?: string;
  proposed: string;
  confidence?: number;
  sourceCount?: number;
};

export type ConversationImpactDecision = {
  reviewId?: string;
  scoreDeltas: ConversationScoreDelta[];
  addedFindings: ConversationFinding[];
  changes: ConversationChange[];
};

export type ConversationImpactPanelProps = {
  locale: CommercialProofLocale;
  reviewId?: string;
  accountName?: string;
  sourceLabel?: string;
  analyzedAt?: string | Date;
  scoreDeltas?: ConversationScoreDelta[];
  addedFindings?: ConversationFinding[];
  changes?: ConversationChange[];
  readOnly?: boolean;
  busy?: boolean;
  className?: string;
  onApprove?: (decision: ConversationImpactDecision) => AsyncAction;
  onReject?: (decision: ConversationImpactDecision) => AsyncAction;
};

export type AnalysisProvider =
  | "watsonx"
  | "deterministic"
  | "unavailable"
  | (string & {});

export type LogicalAgentStatus =
  | "pending"
  | "running"
  | "completed"
  | "fallback"
  | "needs-review"
  | "error"
  | "failed";

export type AnalysisSource = {
  id: string;
  label: string;
  sourceType?: string;
  excerpt?: string;
};

export type LogicalAgentRun = {
  id: string;
  name: string;
  purpose?: string;
  status: LogicalAgentStatus;
  provider: AnalysisProvider;
  model?: string;
  sources?: AnalysisSource[];
  conclusion?: string;
  confidence?: number;
  durationMs?: number;
};

export type AnalysisPipelinePanelProps = {
  locale: CommercialProofLocale;
  runs: LogicalAgentRun[];
  generatedAt?: string | Date;
  fallbackReason?: string;
  className?: string;
  onSourceSelect?: (source: AnalysisSource, run: LogicalAgentRun) => void;
};

export type CrmHandoffStakeholder = {
  id: string;
  name: string;
  role?: string;
  relationship?: string;
  isSponsor?: boolean;
};

export type CrmHandoffEvidence = {
  id: string;
  title: string;
  source: string;
  excerpt?: string;
  confidence?: number;
};

export type CrmQualification = {
  qualified: boolean;
  alignment: number;
  readiness: number;
  confidence: number;
  confirmedPain: boolean;
  relevantStakeholder: boolean;
  validatedNextStep: boolean;
  missingCriteria?: string[];
};

export type CrmHandoffData = {
  accountId: string;
  accountName: string;
  opportunityName?: string;
  problem: string;
  businessObjective: string;
  capabilities: string[];
  products: string[];
  stakeholders: CrmHandoffStakeholder[];
  evidence: CrmHandoffEvidence[];
  gaps: string[];
  successCriteria: string[];
  nextStep: string;
  qualification: CrmQualification;
  generatedAt?: string;
  approvedBy?: string;
};

export type CrmHandoffModalProps = {
  locale: CommercialProofLocale;
  open: boolean;
  data: CrmHandoffData;
  busy?: boolean;
  handedOff?: boolean;
  onClose: () => void;
  onCopyJson?: (json: string, data: CrmHandoffData) => AsyncAction;
  onDownloadJson?: (json: string, data: CrmHandoffData) => AsyncAction;
  onMarkHandedOff?: (data: CrmHandoffData) => AsyncAction;
};

export type ImpactMetricBaseline = {
  discoveryMinutes: number;
  sampleSize?: number;
  recordedAt?: string | Date;
};

export type ImpactMetricsData = {
  baseline?: ImpactMetricBaseline | null;
  observedDiscoveryMinutes?: number | null;
  discoveryCoverage: number;
  previousDiscoveryCoverage?: number | null;
  openGaps: number;
  resolvedGaps: number;
  confirmedEvidence: number;
  totalEvidence: number;
  timeToQualificationDays?: number | null;
  qualifiedAccounts?: number;
  observedAccounts?: number;
  lastUpdated?: string | Date;
};

export type ImpactMetricsPanelProps = {
  locale: CommercialProofLocale;
  metrics: ImpactMetricsData;
  className?: string;
};

type Feedback = {
  kind: "success" | "error" | "info";
  title: string;
  subtitle?: string;
};

const copy = {
  "en-US": {
    common: {
      notAvailable: "Not available",
      sources: "sources",
      source: "source",
      confidence: "Confidence",
      deterministic: "Deterministic",
      aiAndRules: "AI + rules",
      close: "Close",
      days: "days",
      min: "min",
      total: "total",
    },
    impact: {
      eyebrow: "Conversation impact",
      title: "What changed after this conversation",
      description:
        "Review proposed account updates before they become part of the customer memory.",
      source: "Analyzed source",
      before: "Before",
      after: "After",
      noChangeTitle: "No material change detected",
      noChangeBody:
        "The conversation was retained as evidence, but it did not change scores, entities, hypotheses or actions.",
      scoreChanges: "Score changes",
      addedKnowledge: "Knowledge proposed for the account",
      hypothesisActions: "Hypotheses and next actions",
      previous: "Previous",
      proposed: "Proposed",
      approve: "Approve proposed changes",
      reject: "Reject changes",
      approved: "Changes approved",
      approvedBody:
        "The approved proposals can now be applied to account memory.",
      rejected: "Changes rejected",
      rejectedBody: "The original conversation remains available as evidence.",
      decisionError: "The review could not be completed",
      readOnly: "This analysis is available for review only.",
      findingKinds: {
        fact: "Fact",
        stakeholder: "Stakeholder",
        pain: "Pain point",
        initiative: "Initiative",
        system: "System",
        risk: "Risk",
      },
      states: {
        new: "New",
        updated: "Updated",
        strengthened: "Strengthened",
        weakened: "Weakened",
      },
      kinds: { hypothesis: "Hypothesis", action: "Next action" },
    },
    pipeline: {
      eyebrow: "Explainable analysis",
      title: "How the account was analyzed",
      description:
        "Logical agents share the same provider layer and expose the evidence behind each conclusion.",
      deterministicTitle: "Deterministic analysis — no AI model connected",
      deterministicBody:
        "Account rules and curated playbooks are active. No generative model was called and no external data was sent.",
      fallbackPrefix: "Reason",
      provider: "Provider",
      model: "Model",
      duration: "Duration",
      conclusion: "Conclusion",
      evidenceUsed: "Evidence used",
      noSources: "No sources attached to this run.",
      noRunsTitle: "No analysis executions yet",
      noRunsBody:
        "Add account information to run deterministic rules and populate this audit trail.",
      statuses: {
        pending: "Pending",
        running: "Running",
        completed: "Completed",
        fallback: "Rules fallback",
        "needs-review": "Needs review",
        error: "Error",
        failed: "Failed",
      },
    },
    handoff: {
      label: "Qualified pre-CRM handoff",
      title: "CRM handoff preview",
      description:
        "Validate the commercial context and evidence before marking this hypothesis ready for CRM.",
      businessContext: "Business context",
      problem: "Confirmed problem",
      objective: "Customer objective",
      solutionFit: "IBM fit",
      capabilities: "Capabilities",
      products: "Related products",
      stakeholders: "Stakeholders",
      sponsor: "Sponsor",
      evidence: "Evidence",
      gaps: "Open gaps",
      success: "Success criteria",
      nextStep: "Validated next step",
      qualification: "Qualification checks",
      alignment: "Alignment",
      readiness: "Readiness",
      qualified: "Ready for CRM",
      notQualified: "Not ready for CRM",
      confirmedPain: "Pain confirmed",
      relevantStakeholder: "Relevant stakeholder",
      validatedNextStep: "Next step validated",
      passed: "Passed",
      missing: "Missing",
      copyJson: "Copy JSON",
      downloadJson: "Download JSON",
      markHandoff: "Mark as handed off",
      handedOff: "Handed off",
      copied: "CRM payload copied",
      copiedBody:
        "The structured JSON is ready to paste into an approved system.",
      downloaded: "CRM payload downloaded",
      downloadedBody: "A local JSON file was created for this account.",
      marked: "Handoff recorded",
      markedBody:
        "The account remains available in Watson CDI with its evidence trail.",
      actionError: "The handoff action could not be completed",
      clipboardUnavailable: "Clipboard access is unavailable in this browser.",
      blockedTitle: "Complete the qualification before handoff",
      blockedBody:
        "Resolve the missing criteria below. Export remains available for review.",
      noItems: "None recorded",
    },
    metrics: {
      eyebrow: "Observed impact",
      title: "Value measured inside the workflow",
      description:
        "Operational evidence from completed discovery work — not a forecast or an industry benchmark.",
      noticeTitle: "Observed metrics, not a 65–70% claim",
      noticeBody:
        "Results describe the current sample only. A larger validated baseline is required before publishing an efficiency claim.",
      discoveryTime: "Time per discovery",
      currentObserved: "Current observed",
      baseline: "Recorded baseline",
      noBaseline: "Baseline not recorded",
      baselineSample: "baseline records",
      observedChange: "observed change",
      coverage: "Discovery coverage",
      priorCoverage: "Previous coverage",
      gaps: "Information gaps",
      open: "Open",
      resolved: "Resolved",
      evidence: "Evidence confirmation",
      confirmed: "confirmed",
      qualificationTime: "Time to qualification",
      qualifiedAccounts: "qualified accounts",
      insufficient: "Not enough observed data",
      updated: "Last updated",
    },
  },
  "pt-BR": {
    common: {
      notAvailable: "Não disponível",
      sources: "fontes",
      source: "fonte",
      confidence: "Confiança",
      deterministic: "Determinístico",
      aiAndRules: "IA + regras",
      close: "Fechar",
      days: "dias",
      min: "min",
      total: "total",
    },
    impact: {
      eyebrow: "Impacto da conversa",
      title: "O que mudou após esta conversa",
      description:
        "Revise as atualizações propostas antes que elas façam parte da memória do cliente.",
      source: "Fonte analisada",
      before: "Antes",
      after: "Depois",
      noChangeTitle: "Nenhuma mudança relevante detectada",
      noChangeBody:
        "A conversa foi mantida como evidência, mas não alterou pontuações, entidades, hipóteses ou ações.",
      scoreChanges: "Mudanças nas pontuações",
      addedKnowledge: "Conhecimento proposto para a conta",
      hypothesisActions: "Hipóteses e próximas ações",
      previous: "Anterior",
      proposed: "Proposto",
      approve: "Aprovar mudanças propostas",
      reject: "Rejeitar mudanças",
      approved: "Mudanças aprovadas",
      approvedBody:
        "As propostas aprovadas já podem ser aplicadas à memória da conta.",
      rejected: "Mudanças rejeitadas",
      rejectedBody: "A conversa original permanece disponível como evidência.",
      decisionError: "Não foi possível concluir a revisão",
      readOnly: "Esta análise está disponível apenas para revisão.",
      findingKinds: {
        fact: "Fato",
        stakeholder: "Stakeholder",
        pain: "Dor",
        initiative: "Iniciativa",
        system: "Sistema",
        risk: "Risco",
      },
      states: {
        new: "Nova",
        updated: "Atualizada",
        strengthened: "Fortalecida",
        weakened: "Enfraquecida",
      },
      kinds: { hypothesis: "Hipótese", action: "Próxima ação" },
    },
    pipeline: {
      eyebrow: "Análise explicável",
      title: "Como a conta foi analisada",
      description:
        "Agentes lógicos compartilham a mesma camada de provedor e expõem as evidências de cada conclusão.",
      deterministicTitle:
        "Análise determinística — nenhum modelo de IA conectado",
      deterministicBody:
        "As regras da conta e os playbooks curados estão ativos. Nenhum modelo generativo foi chamado e nenhum dado externo foi enviado.",
      fallbackPrefix: "Motivo",
      provider: "Provedor",
      model: "Modelo",
      duration: "Duração",
      conclusion: "Conclusão",
      evidenceUsed: "Evidências utilizadas",
      noSources: "Nenhuma fonte vinculada a esta execução.",
      noRunsTitle: "Nenhuma execução de análise ainda",
      noRunsBody:
        "Adicione informações à conta para executar as regras determinísticas e preencher esta auditoria.",
      statuses: {
        pending: "Pendente",
        running: "Em execução",
        completed: "Concluída",
        fallback: "Fallback por regras",
        "needs-review": "Requer revisão",
        error: "Erro",
        failed: "Falhou",
      },
    },
    handoff: {
      label: "Handoff pré-CRM qualificado",
      title: "Prévia do handoff para o CRM",
      description:
        "Valide o contexto comercial e as evidências antes de marcar esta hipótese como pronta para o CRM.",
      businessContext: "Contexto de negócio",
      problem: "Problema confirmado",
      objective: "Objetivo do cliente",
      solutionFit: "Aderência IBM",
      capabilities: "Capacidades",
      products: "Produtos relacionados",
      stakeholders: "Stakeholders",
      sponsor: "Sponsor",
      evidence: "Evidências",
      gaps: "Lacunas abertas",
      success: "Critérios de sucesso",
      nextStep: "Próximo passo validado",
      qualification: "Critérios de qualificação",
      alignment: "Alinhamento",
      readiness: "Prontidão",
      qualified: "Pronta para o CRM",
      notQualified: "Ainda não pronta para o CRM",
      confirmedPain: "Dor confirmada",
      relevantStakeholder: "Stakeholder relevante",
      validatedNextStep: "Próximo passo validado",
      passed: "Atendido",
      missing: "Pendente",
      copyJson: "Copiar JSON",
      downloadJson: "Baixar JSON",
      markHandoff: "Marcar handoff",
      handedOff: "Handoff realizado",
      copied: "Payload do CRM copiado",
      copiedBody:
        "O JSON estruturado está pronto para ser colado em um sistema aprovado.",
      downloaded: "Payload do CRM baixado",
      downloadedBody: "Um arquivo JSON local foi criado para esta conta.",
      marked: "Handoff registrado",
      markedBody:
        "A conta continua disponível no Watson CDI com sua trilha de evidências.",
      actionError: "Não foi possível concluir a ação de handoff",
      clipboardUnavailable:
        "O acesso à área de transferência não está disponível neste navegador.",
      blockedTitle: "Conclua a qualificação antes do handoff",
      blockedBody:
        "Resolva os critérios pendentes abaixo. A exportação continua disponível para revisão.",
      noItems: "Nenhum registro",
    },
    metrics: {
      eyebrow: "Impacto observado",
      title: "Valor medido dentro do fluxo",
      description:
        "Evidências operacionais de descobertas concluídas — não é uma projeção nem um benchmark de mercado.",
      noticeTitle: "Métricas observadas, não uma afirmação de 65–70%",
      noticeBody:
        "Os resultados descrevem apenas a amostra atual. É necessário validar uma base maior antes de publicar uma afirmação de eficiência.",
      discoveryTime: "Tempo por discovery",
      currentObserved: "Observado atual",
      baseline: "Baseline registrado",
      noBaseline: "Baseline não registrado",
      baselineSample: "registros no baseline",
      observedChange: "mudança observada",
      coverage: "Cobertura da descoberta",
      priorCoverage: "Cobertura anterior",
      gaps: "Lacunas de informação",
      open: "Abertas",
      resolved: "Resolvidas",
      evidence: "Confirmação de evidências",
      confirmed: "confirmadas",
      qualificationTime: "Tempo até qualificação",
      qualifiedAccounts: "contas qualificadas",
      insufficient: "Dados observados insuficientes",
      updated: "Última atualização",
    },
  },
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function toPercent(value: number, max = 100) {
  const safeMax = max > 0 ? max : 100;
  return clamp((value / safeMax) * 100);
}

function formatDate(locale: CommercialProofLocale, value?: string | Date) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(
  locale: CommercialProofLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

function SectionHeading({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className={styles.sectionHeader}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {aside && <div className={styles.headerAside}>{aside}</div>}
    </header>
  );
}

function Confidence({
  locale,
  value,
}: {
  locale: CommercialProofLocale;
  value?: number;
}) {
  if (value === undefined) return null;
  const d = copy[locale];
  const normalized = clamp(value);
  return (
    <span className={styles.confidence}>
      {d.common.confidence} {formatNumber(locale, normalized)}%
    </span>
  );
}

function ScoreDelta({
  locale,
  score,
}: {
  locale: CommercialProofLocale;
  score: ConversationScoreDelta;
}) {
  const d = copy[locale];
  const max = score.max ?? 100;
  const delta = score.after - score.before;
  const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : ArrowRight;
  const deltaText = `${delta > 0 ? "+" : ""}${formatNumber(locale, delta)}`;

  return (
    <article className={styles.scoreCard}>
      <div className={styles.scoreCardTitle}>
        <h4>{score.label}</h4>
        <Tag type={delta > 0 ? "green" : delta < 0 ? "red" : "gray"}>
          <DeltaIcon size={12} aria-hidden="true" /> {deltaText}
        </Tag>
      </div>
      <div
        className={styles.scoreComparison}
        role="img"
        aria-label={`${score.label}: ${d.impact.before} ${score.before}, ${d.impact.after} ${score.after}`}
      >
        <div className={styles.scoreLine}>
          <span>{d.impact.before}</span>
          <div className={styles.track} aria-hidden="true">
            <i
              className={styles.beforeBar}
              style={{ width: `${toPercent(score.before, max)}%` }}
            />
          </div>
          <strong>{formatNumber(locale, score.before)}</strong>
        </div>
        <div className={styles.scoreLine}>
          <span>{d.impact.after}</span>
          <div className={styles.track} aria-hidden="true">
            <i
              className={styles.afterBar}
              style={{ width: `${toPercent(score.after, max)}%` }}
            />
          </div>
          <strong>{formatNumber(locale, score.after)}</strong>
        </div>
      </div>
    </article>
  );
}

export function ConversationImpactPanel({
  locale,
  reviewId,
  accountName,
  sourceLabel,
  analyzedAt,
  scoreDeltas = [],
  addedFindings = [],
  changes = [],
  readOnly = false,
  busy = false,
  className,
  onApprove,
  onReject,
}: ConversationImpactPanelProps) {
  const headingId = useId();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const d = copy[locale];
  const meaningfulScores = scoreDeltas.filter(
    (score) => score.before !== score.after,
  );
  const hasChanges =
    meaningfulScores.length > 0 ||
    addedFindings.length > 0 ||
    changes.length > 0;
  const decision: ConversationImpactDecision = {
    reviewId,
    scoreDeltas: meaningfulScores,
    addedFindings,
    changes,
  };
  const dateLabel = formatDate(locale, analyzedAt);

  async function decide(kind: "approve" | "reject") {
    const callback = kind === "approve" ? onApprove : onReject;
    if (!callback) return;
    setDeciding(kind);
    setFeedback(null);
    try {
      await callback(decision);
      setFeedback({
        kind: "success",
        title: kind === "approve" ? d.impact.approved : d.impact.rejected,
        subtitle:
          kind === "approve" ? d.impact.approvedBody : d.impact.rejectedBody,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        title: d.impact.decisionError,
        subtitle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeciding(null);
    }
  }

  return (
    <section
      className={cx(styles.surface, className)}
      aria-labelledby={headingId}
    >
      <div className={styles.hiddenHeading} id={headingId}>
        {d.impact.title}
      </div>
      <SectionHeading
        eyebrow={d.impact.eyebrow}
        title={d.impact.title}
        description={d.impact.description}
        aside={
          (accountName || sourceLabel || dateLabel) && (
            <div className={styles.contextMeta}>
              {accountName && <strong>{accountName}</strong>}
              {sourceLabel && (
                <span>
                  {d.impact.source}: {sourceLabel}
                </span>
              )}
              {dateLabel && <time>{dateLabel}</time>}
            </div>
          )
        }
      />

      {!hasChanges ? (
        <div className={styles.emptyState}>
          <Checkmark size={24} aria-hidden="true" />
          <div>
            <h3>{d.impact.noChangeTitle}</h3>
            <p>{d.impact.noChangeBody}</p>
          </div>
        </div>
      ) : (
        <div className={styles.panelBody}>
          {meaningfulScores.length > 0 && (
            <section className={styles.contentGroup}>
              <h3>{d.impact.scoreChanges}</h3>
              <div className={styles.scoreGrid}>
                {meaningfulScores.map((score) => (
                  <ScoreDelta key={score.id} locale={locale} score={score} />
                ))}
              </div>
            </section>
          )}

          {addedFindings.length > 0 && (
            <section className={styles.contentGroup}>
              <h3>{d.impact.addedKnowledge}</h3>
              <ul className={styles.findingGrid}>
                {addedFindings.map((finding) => (
                  <li key={finding.id}>
                    <div className={styles.itemHeading}>
                      <Tag type={finding.kind === "risk" ? "red" : "cyan"}>
                        {d.impact.findingKinds[finding.kind]}
                      </Tag>
                      <Confidence locale={locale} value={finding.confidence} />
                    </div>
                    <strong>{finding.title}</strong>
                    {finding.detail && <p>{finding.detail}</p>}
                    {finding.sourceLabel && (
                      <span className={styles.sourceLine}>
                        <Document size={14} aria-hidden="true" />
                        {finding.sourceLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {changes.length > 0 && (
            <section className={styles.contentGroup}>
              <h3>{d.impact.hypothesisActions}</h3>
              <div className={styles.changeList}>
                {changes.map((change) => (
                  <article key={change.id} className={styles.changeCard}>
                    <div className={styles.itemHeading}>
                      <span>
                        <Tag
                          type={
                            change.kind === "hypothesis" ? "purple" : "blue"
                          }
                        >
                          {d.impact.kinds[change.kind]}
                        </Tag>
                        <Tag type="gray">{d.impact.states[change.state]}</Tag>
                      </span>
                      <Confidence locale={locale} value={change.confidence} />
                    </div>
                    <h4>{change.title}</h4>
                    <dl className={styles.beforeAfterText}>
                      {change.previous && (
                        <div>
                          <dt>{d.impact.previous}</dt>
                          <dd>{change.previous}</dd>
                        </div>
                      )}
                      <div>
                        <dt>{d.impact.proposed}</dt>
                        <dd>{change.proposed}</dd>
                      </div>
                    </dl>
                    {change.sourceCount !== undefined && (
                      <span className={styles.sourceLine}>
                        <Document size={14} aria-hidden="true" />
                        {formatNumber(locale, change.sourceCount)}{" "}
                        {change.sourceCount === 1
                          ? d.common.source
                          : d.common.sources}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {feedback && (
        <div className={styles.feedbackRegion} aria-live="polite">
          <InlineNotification
            kind={feedback.kind}
            lowContrast
            hideCloseButton
            title={feedback.title}
            subtitle={feedback.subtitle}
          />
        </div>
      )}

      {hasChanges && (
        <footer className={styles.reviewActions}>
          {readOnly ? (
            <p>
              <Information size={16} aria-hidden="true" /> {d.impact.readOnly}
            </p>
          ) : (
            <>
              <Button
                kind="danger--tertiary"
                size="sm"
                renderIcon={Close}
                disabled={busy || deciding !== null || !onReject}
                onClick={() => void decide("reject")}
              >
                {d.impact.reject}
              </Button>
              <Button
                size="sm"
                renderIcon={Checkmark}
                disabled={busy || deciding !== null || !onApprove}
                onClick={() => void decide("approve")}
              >
                {d.impact.approve}
              </Button>
            </>
          )}
        </footer>
      )}
    </section>
  );
}

function isDeterministicProvider(provider: AnalysisProvider) {
  const normalized = provider.toLocaleLowerCase();
  return (
    normalized === "unavailable" ||
    normalized.includes("deterministic") ||
    normalized.includes("fallback") ||
    normalized.includes("rules")
  );
}

function providerLabel(provider: AnalysisProvider) {
  if (provider === "watsonx" || provider.includes("watsonx"))
    return "IBM watsonx";
  if (provider === "unavailable") return "—";
  if (isDeterministicProvider(provider)) return "Watson CDI rules";
  return "Configured model";
}

function statusTone(status: LogicalAgentStatus) {
  if (status === "completed") return "green" as const;
  if (status === "running") return "blue" as const;
  if (status === "needs-review") return "purple" as const;
  if (status === "error" || status === "failed") return "red" as const;
  return "gray" as const;
}

export function AnalysisPipelinePanel({
  locale,
  runs,
  generatedAt,
  fallbackReason,
  className,
  onSourceSelect,
}: AnalysisPipelinePanelProps) {
  const headingId = useId();
  const d = copy[locale];
  const hasGenerativeProvider = runs.some(
    (run) => !isDeterministicProvider(run.provider),
  );
  const generatedLabel = formatDate(locale, generatedAt);

  return (
    <section
      className={cx(styles.surface, className)}
      aria-labelledby={headingId}
    >
      <div className={styles.hiddenHeading} id={headingId}>
        {d.pipeline.title}
      </div>
      <SectionHeading
        eyebrow={d.pipeline.eyebrow}
        title={d.pipeline.title}
        description={d.pipeline.description}
        aside={
          <div className={styles.pipelineAside}>
            <Tag type={hasGenerativeProvider ? "purple" : "gray"}>
              {hasGenerativeProvider
                ? d.common.aiAndRules
                : d.common.deterministic}
            </Tag>
            {generatedLabel && <time>{generatedLabel}</time>}
          </div>
        }
      />

      {!hasGenerativeProvider && (
        <div className={styles.notificationWrap}>
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={d.pipeline.deterministicTitle}
            subtitle={`${d.pipeline.deterministicBody}${fallbackReason ? ` ${d.pipeline.fallbackPrefix}: ${fallbackReason}` : ""}`}
          />
        </div>
      )}

      {runs.length === 0 ? (
        <div className={styles.emptyState}>
          <Flow size={24} aria-hidden="true" />
          <div>
            <h3>{d.pipeline.noRunsTitle}</h3>
            <p>{d.pipeline.noRunsBody}</p>
          </div>
        </div>
      ) : (
        <ol className={styles.pipelineList}>
          {runs.map((run, index) => (
            <li key={run.id} className={styles.pipelineRun}>
              <div className={styles.runMarker} aria-hidden="true">
                <span>{index + 1}</span>
              </div>
              <article>
                <header className={styles.runHeader}>
                  <div>
                    <Watson size={18} aria-hidden="true" />
                    <div>
                      <h3>{run.name}</h3>
                      {run.purpose && <p>{run.purpose}</p>}
                    </div>
                  </div>
                  <Tag type={statusTone(run.status)}>
                    {d.pipeline.statuses[run.status]}
                  </Tag>
                </header>

                <dl className={styles.runMeta}>
                  <div>
                    <dt>{d.pipeline.provider}</dt>
                    <dd>{providerLabel(run.provider)}</dd>
                  </div>
                  <div>
                    <dt>{d.pipeline.model}</dt>
                    <dd>
                      {run.model ||
                        (run.provider === "deterministic"
                          ? d.common.deterministic
                          : d.common.notAvailable)}
                    </dd>
                  </div>
                  {run.durationMs !== undefined && (
                    <div>
                      <dt>{d.pipeline.duration}</dt>
                      <dd>{formatNumber(locale, run.durationMs)} ms</dd>
                    </div>
                  )}
                  {run.confidence !== undefined && (
                    <div>
                      <dt>{d.common.confidence}</dt>
                      <dd>{formatNumber(locale, clamp(run.confidence))}%</dd>
                    </div>
                  )}
                </dl>

                {run.conclusion && (
                  <div className={styles.conclusion}>
                    <strong>{d.pipeline.conclusion}</strong>
                    <p>{run.conclusion}</p>
                  </div>
                )}

                <div className={styles.runSources}>
                  <strong>{d.pipeline.evidenceUsed}</strong>
                  {run.sources?.length ? (
                    <ul>
                      {run.sources.map((source) => (
                        <li key={source.id}>
                          <button
                            type="button"
                            disabled={!onSourceSelect}
                            onClick={() => onSourceSelect?.(source, run)}
                            title={source.excerpt}
                          >
                            <Document size={14} aria-hidden="true" />
                            <span>{source.label}</span>
                            {source.sourceType && (
                              <small>{source.sourceType}</small>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{d.pipeline.noSources}</p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function HandoffList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <section className={styles.handoffList}>
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

function QualificationCheck({
  passed,
  label,
  passedLabel,
  missingLabel,
}: {
  passed: boolean;
  label: string;
  passedLabel: string;
  missingLabel: string;
}) {
  return (
    <li data-passed={passed}>
      {passed ? (
        <Checkmark size={16} aria-hidden="true" />
      ) : (
        <WarningAlt size={16} aria-hidden="true" />
      )}
      <span>{label}</span>
      <small>{passed ? passedLabel : missingLabel}</small>
    </li>
  );
}

export function CrmHandoffModal({
  locale,
  open,
  data,
  busy = false,
  handedOff = false,
  onClose,
  onCopyJson,
  onDownloadJson,
  onMarkHandedOff,
}: CrmHandoffModalProps) {
  const d = copy[locale];
  const [working, setWorking] = useState<
    "copy" | "download" | "handoff" | null
  >(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const payload = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const filename = `${data.accountName || "account"}-crm-handoff`
    .toLocaleLowerCase(locale)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  async function perform(action: "copy" | "download" | "handoff") {
    setWorking(action);
    setFeedback(null);
    try {
      if (action === "copy") {
        if (!navigator.clipboard?.writeText) {
          throw new Error(d.handoff.clipboardUnavailable);
        }
        await navigator.clipboard.writeText(payload);
        await onCopyJson?.(payload, data);
        setFeedback({
          kind: "success",
          title: d.handoff.copied,
          subtitle: d.handoff.copiedBody,
        });
      }

      if (action === "download") {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${filename || "crm-handoff"}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        await onDownloadJson?.(payload, data);
        setFeedback({
          kind: "success",
          title: d.handoff.downloaded,
          subtitle: d.handoff.downloadedBody,
        });
      }

      if (action === "handoff") {
        if (!data.qualification.qualified) return;
        await onMarkHandedOff?.(data);
        setFeedback({
          kind: "success",
          title: d.handoff.marked,
          subtitle: d.handoff.markedBody,
        });
      }
    } catch (error) {
      setFeedback({
        kind: "error",
        title: d.handoff.actionError,
        subtitle: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setWorking(null);
    }
  }

  const qualificationChecks = [
    [data.qualification.confirmedPain, d.handoff.confirmedPain],
    [data.qualification.relevantStakeholder, d.handoff.relevantStakeholder],
    [data.qualification.validatedNextStep, d.handoff.validatedNextStep],
  ] as const;

  return (
    <ComposedModal
      className={styles.handoffModal}
      open={open}
      onClose={onClose}
      size="lg"
    >
      <ModalHeader
        label={`${d.handoff.label} · ${data.accountName}`}
        title={data.opportunityName || d.handoff.title}
      />
      <ModalBody hasScrollingContent>
        <p className={styles.modalDescription}>{d.handoff.description}</p>

        {!data.qualification.qualified && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title={d.handoff.blockedTitle}
            subtitle={d.handoff.blockedBody}
          />
        )}

        {feedback && (
          <div aria-live="polite">
            <InlineNotification
              kind={feedback.kind}
              lowContrast
              hideCloseButton
              title={feedback.title}
              subtitle={feedback.subtitle}
            />
          </div>
        )}

        <div className={styles.handoffLayout}>
          <div className={styles.handoffMain}>
            <section className={styles.handoffSummary}>
              <h3>{d.handoff.businessContext}</h3>
              <dl>
                <div>
                  <dt>{d.handoff.problem}</dt>
                  <dd>{data.problem || d.handoff.noItems}</dd>
                </div>
                <div>
                  <dt>{d.handoff.objective}</dt>
                  <dd>{data.businessObjective || d.handoff.noItems}</dd>
                </div>
                <div>
                  <dt>{d.handoff.nextStep}</dt>
                  <dd>{data.nextStep || d.handoff.noItems}</dd>
                </div>
              </dl>
            </section>

            <div className={styles.handoffColumns}>
              <HandoffList
                title={d.handoff.capabilities}
                items={data.capabilities}
                emptyLabel={d.handoff.noItems}
              />
              <HandoffList
                title={d.handoff.products}
                items={data.products}
                emptyLabel={d.handoff.noItems}
              />
            </div>

            <section className={styles.handoffList}>
              <h3>{d.handoff.stakeholders}</h3>
              {data.stakeholders.length ? (
                <ul className={styles.stakeholderList}>
                  {data.stakeholders.map((stakeholder) => (
                    <li key={stakeholder.id}>
                      <span>
                        <strong>{stakeholder.name}</strong>
                        {stakeholder.role && <small>{stakeholder.role}</small>}
                      </span>
                      {stakeholder.isSponsor && (
                        <Tag type="green">{d.handoff.sponsor}</Tag>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{d.handoff.noItems}</p>
              )}
            </section>

            <section className={styles.evidenceSection}>
              <h3>{d.handoff.evidence}</h3>
              {data.evidence.length ? (
                <ul>
                  {data.evidence.map((evidence) => (
                    <li key={evidence.id}>
                      <Document size={16} aria-hidden="true" />
                      <div>
                        <strong>{evidence.title}</strong>
                        {evidence.excerpt && <p>{evidence.excerpt}</p>}
                        <span>
                          {evidence.source}
                          {evidence.confidence !== undefined && (
                            <>
                              {" · "}
                              {d.common.confidence}{" "}
                              {formatNumber(locale, clamp(evidence.confidence))}
                              %
                            </>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{d.handoff.noItems}</p>
              )}
            </section>

            <div className={styles.handoffColumns}>
              <HandoffList
                title={d.handoff.gaps}
                items={data.gaps}
                emptyLabel={d.handoff.noItems}
              />
              <HandoffList
                title={d.handoff.success}
                items={data.successCriteria}
                emptyLabel={d.handoff.noItems}
              />
            </div>
          </div>

          <aside className={styles.qualificationPanel}>
            <div className={styles.qualificationStatus}>
              {data.qualification.qualified ? (
                <Checkmark size={24} aria-hidden="true" />
              ) : (
                <WarningAlt size={24} aria-hidden="true" />
              )}
              <div>
                <span>{d.handoff.qualification}</span>
                <strong>
                  {data.qualification.qualified
                    ? d.handoff.qualified
                    : d.handoff.notQualified}
                </strong>
              </div>
            </div>

            <div className={styles.qualificationScores}>
              <ProgressBar
                label={d.handoff.alignment}
                value={clamp(data.qualification.alignment)}
                max={100}
                helperText={`${formatNumber(locale, clamp(data.qualification.alignment))}%`}
              />
              <ProgressBar
                label={d.handoff.readiness}
                value={clamp(data.qualification.readiness)}
                max={100}
                helperText={`${formatNumber(locale, clamp(data.qualification.readiness))}%`}
              />
              <ProgressBar
                label={d.common.confidence}
                value={clamp(data.qualification.confidence)}
                max={100}
                helperText={`${formatNumber(locale, clamp(data.qualification.confidence))}%`}
              />
            </div>

            <ul className={styles.qualificationChecks}>
              {qualificationChecks.map(([passed, label]) => (
                <QualificationCheck
                  key={label}
                  passed={passed}
                  label={label}
                  passedLabel={d.handoff.passed}
                  missingLabel={d.handoff.missing}
                />
              ))}
            </ul>

            {!!data.qualification.missingCriteria?.length && (
              <div className={styles.missingCriteria}>
                <strong>{d.handoff.gaps}</strong>
                <ul>
                  {data.qualification.missingCriteria.map(
                    (criterion, index) => (
                      <li key={`${criterion}-${index}`}>{criterion}</li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} disabled={working !== null}>
          {d.common.close}
        </Button>
        <Button
          kind="tertiary"
          renderIcon={Copy}
          disabled={busy || working !== null}
          onClick={() => void perform("copy")}
        >
          {d.handoff.copyJson}
        </Button>
        <Button
          kind="tertiary"
          renderIcon={Download}
          disabled={busy || working !== null}
          onClick={() => void perform("download")}
        >
          {d.handoff.downloadJson}
        </Button>
        <Button
          renderIcon={Checkmark}
          disabled={
            busy ||
            working !== null ||
            handedOff ||
            !data.qualification.qualified ||
            !onMarkHandedOff
          }
          onClick={() => void perform("handoff")}
        >
          {handedOff ? d.handoff.handedOff : d.handoff.markHandoff}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function MetricCard({
  icon,
  title,
  value,
  detail,
  children,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricContent}>
        <span>{title}</span>
        <strong>{value}</strong>
        {detail && <p>{detail}</p>}
        {children}
      </div>
    </article>
  );
}

export function ImpactMetricsPanel({
  locale,
  metrics,
  className,
}: ImpactMetricsPanelProps) {
  const headingId = useId();
  const d = copy[locale];
  const coverage = clamp(metrics.discoveryCoverage);
  const previousCoverage =
    metrics.previousDiscoveryCoverage === null ||
    metrics.previousDiscoveryCoverage === undefined
      ? null
      : clamp(metrics.previousDiscoveryCoverage);
  const evidenceRate = metrics.totalEvidence
    ? clamp((metrics.confirmedEvidence / metrics.totalEvidence) * 100)
    : 0;
  const timeDelta =
    metrics.baseline &&
    metrics.observedDiscoveryMinutes !== null &&
    metrics.observedDiscoveryMinutes !== undefined
      ? metrics.observedDiscoveryMinutes - metrics.baseline.discoveryMinutes
      : null;
  const dateLabel = formatDate(locale, metrics.lastUpdated);

  return (
    <section
      className={cx(styles.surface, className)}
      aria-labelledby={headingId}
    >
      <div className={styles.hiddenHeading} id={headingId}>
        {d.metrics.title}
      </div>
      <SectionHeading
        eyebrow={d.metrics.eyebrow}
        title={d.metrics.title}
        description={d.metrics.description}
        aside={
          dateLabel && (
            <div className={styles.contextMeta}>
              <span>{d.metrics.updated}</span>
              <time>{dateLabel}</time>
            </div>
          )
        }
      />

      <div className={styles.notificationWrap}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={d.metrics.noticeTitle}
          subtitle={d.metrics.noticeBody}
        />
      </div>

      <div className={styles.metricGrid}>
        <MetricCard
          icon={<Time size={20} aria-hidden="true" />}
          title={d.metrics.discoveryTime}
          value={
            metrics.observedDiscoveryMinutes === null ||
            metrics.observedDiscoveryMinutes === undefined
              ? d.metrics.insufficient
              : `${formatNumber(locale, metrics.observedDiscoveryMinutes)} ${d.common.min}`
          }
          detail={
            metrics.baseline
              ? `${d.metrics.baseline}: ${formatNumber(locale, metrics.baseline.discoveryMinutes)} ${d.common.min}${metrics.baseline.sampleSize ? ` · ${formatNumber(locale, metrics.baseline.sampleSize)} ${d.metrics.baselineSample}` : ""}`
              : d.metrics.noBaseline
          }
        >
          {timeDelta !== null && (
            <Tag type={timeDelta <= 0 ? "green" : "magenta"}>
              {timeDelta > 0 ? "+" : ""}
              {formatNumber(locale, timeDelta)} {d.common.min}{" "}
              {d.metrics.observedChange}
            </Tag>
          )}
        </MetricCard>

        <MetricCard
          icon={<Analytics size={20} aria-hidden="true" />}
          title={d.metrics.coverage}
          value={`${formatNumber(locale, coverage)}%`}
          detail={
            previousCoverage === null
              ? undefined
              : `${d.metrics.priorCoverage}: ${formatNumber(locale, previousCoverage)}%`
          }
        >
          <ProgressBar
            label={d.metrics.coverage}
            hideLabel
            value={coverage}
            max={100}
          />
        </MetricCard>

        <MetricCard
          icon={<WarningAlt size={20} aria-hidden="true" />}
          title={d.metrics.gaps}
          value={`${formatNumber(locale, metrics.openGaps)} ${d.metrics.open.toLocaleLowerCase(locale)}`}
          detail={`${formatNumber(locale, metrics.resolvedGaps)} ${d.metrics.resolved.toLocaleLowerCase(locale)}`}
        />

        <MetricCard
          icon={<Document size={20} aria-hidden="true" />}
          title={d.metrics.evidence}
          value={`${formatNumber(locale, evidenceRate, { maximumFractionDigits: 0 })}%`}
          detail={`${formatNumber(locale, metrics.confirmedEvidence)}/${formatNumber(locale, metrics.totalEvidence)} ${d.metrics.confirmed}`}
        >
          <ProgressBar
            label={d.metrics.evidence}
            hideLabel
            value={evidenceRate}
            max={100}
          />
        </MetricCard>

        <MetricCard
          icon={<Flow size={20} aria-hidden="true" />}
          title={d.metrics.qualificationTime}
          value={
            metrics.timeToQualificationDays === null ||
            metrics.timeToQualificationDays === undefined
              ? d.metrics.insufficient
              : `${formatNumber(locale, metrics.timeToQualificationDays, { maximumFractionDigits: 1 })} ${d.common.days}`
          }
          detail={
            metrics.qualifiedAccounts !== undefined
              ? `${formatNumber(locale, metrics.qualifiedAccounts)} ${d.metrics.qualifiedAccounts}${metrics.observedAccounts !== undefined ? ` · ${formatNumber(locale, metrics.observedAccounts)} ${d.common.total}` : ""}`
              : undefined
          }
        />
      </div>
    </section>
  );
}
