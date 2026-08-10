"use client";

import {
  Accordion,
  AccordionItem,
  Button,
  ProgressBar,
  Select,
  SelectItem,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
} from "@carbon/react";
import { BubbleChart, GroupedBarChart, LineChart } from "@carbon/charts-react";
import type {
  BarChartOptions,
  BubbleChartOptions,
  ChartTabularData,
  LineChartOptions,
} from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import { ArrowRight, ChartBubble, Document, Education, Network_4 } from "@carbon/icons-react";
import { useState } from "react";
import type { Locale, Messages } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";
import RelationshipGraph, {
  type RelationshipGraphProps,
  type StakeholderCapabilityRole,
} from "./RelationshipGraph";
import styles from "./KyndrylV4AccountPanels.module.css";

export type OpportunityAction =
  | "RECOMMEND_NOW"
  | "VALIDATE"
  | "WATCHLIST"
  | "LOW_PRIORITY"
  | "DO_NOT_RECOMMEND"
  | "GATE_PENDING"
  | "GATE_FAILED";

export type OpportunityTechnology = {
  id: string;
  name: string;
  capabilityKeys: string[];
  fit: number;
  confidence: number;
  impact: number;
  action: OpportunityAction;
  gateStatus: "SATISFIED" | "PENDING" | "FAILED" | "NOT_REQUIRED";
  evidenceCount: number;
  evidence?: Array<{ id: string; label: string }>;
  explanation?: string;
  nextStep?: string;
  ownerName?: string;
  gaps?: string[];
};

export type CapabilityRelationshipCoverage = {
  capabilityKey: string;
  capabilityLabel: string;
  confirmedRoles: number;
  requiredRoles: number;
  ownerCount: number;
  decisionMakerCount: number;
  technicalContactCount: number;
};

export type OpportunitySnapshot = {
  id: string;
  technologyId: string;
  technologyName: string;
  createdAt: string;
  fit: number;
  confidence: number;
};

export type OpportunityHypothesisView = {
  id: string;
  title: string;
  status: string;
  confidence: number;
  evidenceCount: number;
  gaps: string[];
  nextStep?: string;
};

export type CompactAccountPlan = {
  priorities: string[];
  days30: string[];
  days60: string[];
  days90: string[];
  updatedAt?: string;
};

export type KyndrylV4StrategyPanelProps = {
  technologies: OpportunityTechnology[];
  stakeholderCoverage: CapabilityRelationshipCoverage[];
  snapshots?: OpportunitySnapshot[];
  hypotheses?: OpportunityHypothesisView[];
  accountPlan?: CompactAccountPlan | null;
  intelligenceStatus?: "watsonx" | "deterministic" | "unavailable";
  readOnly?: boolean;
  onReviewTechnology?: (technologyId: string) => void;
  onReviewHypothesis?: (hypothesisId: string) => void;
  onEditAccountPlan?: () => void;
};

export type GovernanceEvidenceView = {
  id: string;
  label: string;
  source?: string;
  status: "confirmed" | "hypothesis" | "stale" | "contradicted";
  confidence?: number;
  updatedAt?: string;
};

export type AnswerScoreDelta = {
  metric: "maturity" | "technologyFit" | "confidence" | string;
  before: number;
  after: number;
  delta: number;
};

export type GovernanceLedgerItem = {
  answerId: string;
  question: string;
  response: string;
  answeredAt: string;
  capabilityKey: string;
  capabilityLabel: string;
  dimension: string;
  journey?: string;
  evidence: GovernanceEvidenceView[];
  scoreDeltas: AnswerScoreDelta[];
  gates: string[];
  penalties: string[];
  technologies: Array<{ id: string; name: string }>;
  recommendation?: string;
  appliedRules: string[];
  stakeholderId?: string;
  stakeholderName?: string;
  source?: string;
  confidence?: number;
  revisions: number;
  conflict?: boolean;
};

export type GovernanceActivityView = {
  id: string;
  title: string;
  detail?: string;
  occurredAt: string;
  type: "meeting" | "document" | "audit" | "handoff";
  status?: string;
};

export type KyndrylV4GovernancePanelProps = {
  ledger: GovernanceLedgerItem[];
  evidence?: GovernanceEvidenceView[];
  meetings?: GovernanceActivityView[];
  documents?: GovernanceActivityView[];
  auditEvents?: GovernanceActivityView[];
  onSelectAnswer?: (answerId: string) => void;
};

export type KyndrylV4RelationshipsPanelProps = RelationshipGraphProps;

const copy = {
  "en-US": {
    relationshipsEyebrow: "Account relationships",
    relationshipsTitle: "Organization and capability responsibility",
    relationshipsHelp: "Map decision paths and confirm who owns each capability conversation.",
    confirmedAssignments: "confirmed assignments",
    proposedAssignments: "proposed assignments",
    openRoleGaps: "open role gaps",
    strategyEyebrow: "Pre-CRM strategy",
    strategyTitle: "Opportunity Cockpit",
    strategyHelp: "Compare fit and confidence, validate gates, and turn evidence into human-approved next steps.",
    intelligence: "Intelligence status",
    deterministic: "Deterministic rules active",
    watsonx: "IBM watsonx connected",
    unavailable: "Analysis unavailable",
    opportunityMap: "IBM technology opportunity map",
    fit: "Technology Fit",
    confidence: "Confidence",
    impact: "Business impact",
    coverage: "Stakeholder coverage by capability",
    confirmed: "Confirmed roles",
    gaps: "Open gaps",
    history: "Opportunity confidence over time",
    noHistory: "History appears after at least two account snapshots.",
    recommendations: "Explainable recommendations",
    noRecommendations: "Complete discovery to activate technology recommendations.",
    review: "Review",
    evidence: "evidence",
    nextStep: "Next step",
    owner: "Suggested owner",
    journey: "Journey",
    accountPlan: "Account Plan · 30 / 60 / 90",
    priorities: "Priorities",
    days30: "30 days",
    days60: "60 days",
    days90: "90 days",
    editPlan: "Edit plan",
    noPlan: "No human-approved Account Plan has been saved.",
    hypotheses: "Opportunity hypotheses",
    noHypotheses: "No opportunity hypothesis has enough evidence yet.",
    governanceEyebrow: "Explainability and control",
    governanceTitle: "Answer impact ledger",
    governanceHelp: "Trace every answer from source evidence to score, gate, technology, and recommendation.",
    allCapabilities: "All capabilities",
    allPeople: "All people",
    allTechnologies: "All technologies",
    allStatuses: "All evidence statuses",
    allConflicts: "All conflict states",
    conflictsOnly: "Conflicts only",
    noConflicts: "No conflict",
    capability: "Capability",
    person: "Person",
    technology: "Technology",
    status: "Status",
    answer: "Answer",
    source: "Source",
    revisions: "revisions",
    conflict: "Conflict",
    trace: "Decision trace",
    scoreImpact: "Score impact",
    rules: "Rules applied",
    gates: "Gates and penalties",
    noImpact: "This answer did not change a scored metric.",
    noLedger: "No confirmed answer matches these filters.",
    evidenceSection: "Evidence health",
    meetings: "Meetings",
    documents: "Documents",
    audit: "Audit and human decisions",
    noRecords: "No records available.",
  },
  "pt-BR": {
    relationshipsEyebrow: "Relacionamentos da conta",
    relationshipsTitle: "Organização e responsabilidade por capability",
    relationshipsHelp: "Mapeie os caminhos de decisão e confirme quem conduz cada conversa de capability.",
    confirmedAssignments: "responsabilidades confirmadas",
    proposedAssignments: "responsabilidades propostas",
    openRoleGaps: "lacunas de papel abertas",
    strategyEyebrow: "Estratégia pré-CRM",
    strategyTitle: "Cockpit de oportunidades",
    strategyHelp: "Compare fit e confiança, valide gates e transforme evidências em próximos passos aprovados por pessoas.",
    intelligence: "Status da inteligência",
    deterministic: "Regras determinísticas ativas",
    watsonx: "IBM watsonx conectado",
    unavailable: "Análise indisponível",
    opportunityMap: "Mapa de oportunidades de tecnologias IBM",
    fit: "Technology Fit",
    confidence: "Confiança",
    impact: "Impacto de negócio",
    coverage: "Cobertura de stakeholders por capability",
    confirmed: "Papéis confirmados",
    gaps: "Lacunas abertas",
    history: "Evolução da confiança nas oportunidades",
    noHistory: "O histórico aparece após pelo menos dois snapshots da conta.",
    recommendations: "Recomendações explicáveis",
    noRecommendations: "Conclua a descoberta para ativar recomendações de tecnologias.",
    review: "Revisar",
    evidence: "evidências",
    nextStep: "Próximo passo",
    owner: "Responsável sugerido",
    journey: "Jornada",
    accountPlan: "Account Plan · 30 / 60 / 90",
    priorities: "Prioridades",
    days30: "30 dias",
    days60: "60 dias",
    days90: "90 dias",
    editPlan: "Editar plano",
    noPlan: "Nenhum Account Plan aprovado por uma pessoa foi salvo.",
    hypotheses: "Hipóteses de oportunidade",
    noHypotheses: "Nenhuma hipótese possui evidência suficiente ainda.",
    governanceEyebrow: "Explicabilidade e controle",
    governanceTitle: "Ledger de impacto das respostas",
    governanceHelp: "Rastreie cada resposta da fonte até score, gate, tecnologia e recomendação.",
    allCapabilities: "Todas as capabilities",
    allPeople: "Todas as pessoas",
    allTechnologies: "Todas as tecnologias",
    allStatuses: "Todos os status de evidência",
    allConflicts: "Todos os estados de conflito",
    conflictsOnly: "Somente conflitos",
    noConflicts: "Sem conflito",
    capability: "Capability",
    person: "Pessoa",
    technology: "Tecnologia",
    status: "Status",
    answer: "Resposta",
    source: "Fonte",
    revisions: "revisões",
    conflict: "Conflito",
    trace: "Trilha de decisão",
    scoreImpact: "Impacto nos scores",
    rules: "Regras aplicadas",
    gates: "Gates e penalidades",
    noImpact: "Esta resposta não alterou uma métrica pontuada.",
    noLedger: "Nenhuma resposta confirmada corresponde aos filtros.",
    evidenceSection: "Saúde das evidências",
    meetings: "Reuniões",
    documents: "Documentos",
    audit: "Auditoria e decisões humanas",
    noRecords: "Nenhum registro disponível.",
  },
} as const;

const recommendationBuckets: Array<{
  labelAction: OpportunityAction;
  actions: OpportunityAction[];
}> = [
  { labelAction: "RECOMMEND_NOW", actions: ["RECOMMEND_NOW"] },
  { labelAction: "VALIDATE", actions: ["VALIDATE", "GATE_PENDING"] },
  { labelAction: "WATCHLIST", actions: ["WATCHLIST", "LOW_PRIORITY"] },
  {
    labelAction: "DO_NOT_RECOMMEND",
    actions: ["DO_NOT_RECOMMEND", "GATE_FAILED"],
  },
];

function actionCopy(action: OpportunityAction, locale: Locale) {
  const labels: Record<Locale, Record<OpportunityAction, string>> = {
    "en-US": {
      RECOMMEND_NOW: "Recommend now",
      VALIDATE: "Validate",
      WATCHLIST: "Watch",
      LOW_PRIORITY: "Watch",
      DO_NOT_RECOMMEND: "Do not recommend",
      GATE_PENDING: "Validate gate",
      GATE_FAILED: "Do not recommend",
    },
    "pt-BR": {
      RECOMMEND_NOW: "Recomendar agora",
      VALIDATE: "Validar",
      WATCHLIST: "Acompanhar",
      LOW_PRIORITY: "Acompanhar",
      DO_NOT_RECOMMEND: "Não recomendar",
      GATE_PENDING: "Validar gate",
      GATE_FAILED: "Não recomendar",
    },
  };
  return labels[locale][action];
}

function actionTone(action: OpportunityAction) {
  if (action === "RECOMMEND_NOW") return "green";
  if (action === "VALIDATE") return "cyan";
  if (action === "GATE_PENDING") return "purple";
  if (action === "WATCHLIST" || action === "LOW_PRIORITY") return "warm-gray";
  return "red";
}

function gateCopy(
  status: OpportunityTechnology["gateStatus"],
  locale: Locale,
) {
  const labels = {
    "en-US": {
      SATISFIED: "Gate satisfied",
      PENDING: "Gate pending",
      FAILED: "Gate failed",
      NOT_REQUIRED: "No required gate",
    },
    "pt-BR": {
      SATISFIED: "Gate atendido",
      PENDING: "Gate pendente",
      FAILED: "Gate não atendido",
      NOT_REQUIRED: "Sem gate obrigatório",
    },
  } as const;
  return labels[locale][status];
}

function metricCopy(metric: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    maturity: ["Maturity", "Maturidade"],
    technologyFit: ["Technology Fit", "Technology Fit"],
    confidence: ["Confidence", "Confiança"],
  };
  const label = labels[metric];
  return label ? label[locale === "pt-BR" ? 1 : 0] : metric;
}

function evidenceStatusCopy(
  status: GovernanceEvidenceView["status"],
  locale: Locale,
) {
  const labels = {
    "en-US": {
      confirmed: "Confirmed",
      hypothesis: "Hypothesis",
      stale: "Stale",
      contradicted: "Contradicted",
    },
    "pt-BR": {
      confirmed: "Confirmada",
      hypothesis: "Hipótese",
      stale: "Desatualizada",
      contradicted: "Contraditória",
    },
  } as const;
  return labels[locale][status];
}

function carbonLocale(locale: Locale, d: Messages) {
  return {
    code: locale,
    number: (value: number, language: string) =>
      new Intl.NumberFormat(language).format(value),
    date: (value: Date, language: string, options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(language, options).format(value),
    time: (value: Date, language: string, options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(language, options).format(value),
    translations: {
      group: d.charts.group,
      total: d.charts.total,
      tabularRep: { title: d.charts.tableTitle, downloadAsCSV: d.charts.downloadCsv },
      toolbar: {
        exportAsCSV: d.charts.exportCsv,
        exportAsJPG: d.charts.exportJpg,
        exportAsPNG: d.charts.exportPng,
        zoomIn: d.charts.zoomIn,
        zoomOut: d.charts.zoomOut,
        resetZoom: d.charts.resetZoom,
        moreOptions: d.charts.moreOptions,
        makeFullScreen: d.charts.fullscreen,
        exitFullScreen: d.charts.exitFullscreen,
        showAsTable: d.charts.showTable,
      },
    },
  };
}

export function KyndrylV4RelationshipsPanel(
  props: KyndrylV4RelationshipsPanelProps,
) {
  const { locale } = useI18n();
  const c = copy[locale];
  const confirmed = (props.capabilityAssignments || []).filter(
    (item) => item.status === "confirmed",
  ).length;
  const proposed = (props.capabilityAssignments || []).filter(
    (item) => item.status === "proposed" || item.status === "suggested",
  ).length;
  const requiredRoles: StakeholderCapabilityRole[] = [
    "owner",
    "decision_maker",
    "technical_contact",
  ];
  const gaps = (props.capabilities || []).reduce((total, capability) => {
    const roles = new Set(
      (props.capabilityAssignments || [])
        .filter(
          (item) =>
            item.capabilityKey === capability.key && item.status === "confirmed",
        )
        .map((item) => item.role),
    );
    return total + requiredRoles.filter((role) => !roles.has(role)).length;
  }, 0);

  return (
    <section className={styles.panel} aria-labelledby="v4-relationships-title">
      <header className={styles.panelHeading}>
        <div>
          <span>{c.relationshipsEyebrow}</span>
          <h2 id="v4-relationships-title">{c.relationshipsTitle}</h2>
          <p>{c.relationshipsHelp}</p>
        </div>
        <dl className={styles.compactMetrics}>
          <div><dt>{c.confirmedAssignments}</dt><dd>{confirmed}</dd></div>
          <div><dt>{c.proposedAssignments}</dt><dd>{proposed}</dd></div>
          <div><dt>{c.openRoleGaps}</dt><dd>{gaps}</dd></div>
        </dl>
      </header>
      <RelationshipGraph {...props} />
    </section>
  );
}

export function KyndrylV4StrategyPanel({
  technologies,
  stakeholderCoverage,
  snapshots = [],
  hypotheses = [],
  accountPlan,
  intelligenceStatus = "deterministic",
  readOnly = false,
  onReviewTechnology,
  onReviewHypothesis,
  onEditAccountPlan,
}: KyndrylV4StrategyPanelProps) {
  const { locale, dictionary: d, formatDate } = useI18n();
  const c = copy[locale];
  const bubbleData: ChartTabularData = technologies.map((item) => ({
    group: actionCopy(item.action, locale),
    technology: item.name,
    confidence: item.confidence,
    fit: item.fit,
    impact: item.impact,
  }));
  const presentGroups = new Set(bubbleData.map((item) => String(item.group)));
  const bubbleColors = Object.fromEntries(
    technologies
      .map((item) => [
        actionCopy(item.action, locale),
        item.action === "RECOMMEND_NOW"
          ? "#198038"
          : item.action === "VALIDATE"
            ? "#1192e8"
            : item.action === "WATCHLIST" || item.action === "LOW_PRIORITY"
              ? "#f1c21b"
              : item.action === "GATE_PENDING"
                ? "#8a3ffc"
                : "#da1e28",
      ])
      .filter(([label]) => presentGroups.has(label)),
  );
  const bubbleOptions: BubbleChartOptions = {
    resizable: true,
    height: "410px",
    locale: carbonLocale(locale, d),
    axes: {
      bottom: { mapsTo: "confidence", scaleType: ScaleTypes.LINEAR, title: c.confidence, domain: [0, 100] },
      left: { mapsTo: "fit", scaleType: ScaleTypes.LINEAR, title: c.fit, domain: [0, 100] },
    },
    bubble: { radiusMapsTo: "impact", radiusLabel: c.impact, radiusRange: () => [10, 32] },
    color: { scale: bubbleColors },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: c.opportunityMap },
  };
  const coverageData: ChartTabularData = stakeholderCoverage.flatMap((item) => [
    { group: c.confirmed, key: item.capabilityLabel, value: item.confirmedRoles },
    { group: c.gaps, key: item.capabilityLabel, value: Math.max(0, item.requiredRoles - item.confirmedRoles) },
  ]);
  const coverageOptions: BarChartOptions = {
    resizable: true,
    height: "390px",
    locale: carbonLocale(locale, d),
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, truncation: { type: "end_line", threshold: 18 } },
    },
    color: { scale: { [c.confirmed]: "#0f62fe", [c.gaps]: "#da1e28" } },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: c.coverage },
  };
  const validSnapshots = snapshots.filter((item) => !Number.isNaN(Date.parse(item.createdAt)));
  const historyData: ChartTabularData = validSnapshots.map((item) => ({
    group: item.technologyName,
    date: new Date(item.createdAt),
    confidence: item.confidence,
  }));
  const historyOptions: LineChartOptions = {
    resizable: true,
    height: "360px",
    locale: carbonLocale(locale, d),
    axes: {
      bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME },
      left: { mapsTo: "confidence", scaleType: ScaleTypes.LINEAR, title: c.confidence, domain: [0, 100] },
    },
    points: { enabled: true, radius: 4 },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: c.history },
  };
  const groupedRecommendations = recommendationBuckets.flatMap((bucket) => {
    const items = technologies.filter((item) =>
      bucket.actions.includes(item.action),
    );
    return items.length ? [{ action: bucket.labelAction, items }] : [];
  });

  return (
    <section className={styles.panel} aria-labelledby="v4-strategy-title">
      <header className={styles.panelHeading}>
        <div>
          <span>{c.strategyEyebrow}</span>
          <h2 id="v4-strategy-title">{c.strategyTitle}</h2>
          <p>{c.strategyHelp}</p>
        </div>
        <Tag type={intelligenceStatus === "watsonx" ? "blue" : intelligenceStatus === "deterministic" ? "green" : "red"}>
          {c.intelligence}: {c[intelligenceStatus]}
        </Tag>
      </header>

      <div className={styles.chartGrid}>
        <article className={styles.chartSurface}>
          <div className={styles.surfaceHeading}><ChartBubble size={20} /><h3>{c.opportunityMap}</h3></div>
          {technologies.length ? <BubbleChart data={bubbleData} options={bubbleOptions} /> : <EmptyState text={c.noRecommendations} />}
          {technologies.length > 0 && (
            <div className={styles.bandLegend} aria-label={c.recommendations}>
              {(["RECOMMEND_NOW", "VALIDATE", "WATCHLIST", "DO_NOT_RECOMMEND"] as OpportunityAction[]).map((action) => (
                <Tag key={action} type={actionTone(action)}>{actionCopy(action, locale)}</Tag>
              ))}
            </div>
          )}
        </article>
        <article className={styles.chartSurface}>
          <div className={styles.surfaceHeading}><Network_4 size={20} /><h3>{c.coverage}</h3></div>
          {stakeholderCoverage.length ? <GroupedBarChart data={coverageData} options={coverageOptions} /> : <EmptyState text={c.noRecords} />}
        </article>
      </div>

      <div className={styles.chartSurface}>
        <div className={styles.surfaceHeading}><Education size={20} /><h3>{c.history}</h3></div>
        {validSnapshots.length >= 2 ? <LineChart data={historyData} options={historyOptions} /> : <EmptyState text={c.noHistory} />}
      </div>

      <div className={styles.strategyColumns}>
        <section className={styles.operationalSection} aria-labelledby="v4-recommendations-title">
          <div className={styles.sectionHeading}><h3 id="v4-recommendations-title">{c.recommendations}</h3></div>
          {groupedRecommendations.length ? (
            <Accordion align="start">
              {groupedRecommendations.map(({ action, items }) => (
                <AccordionItem key={action} title={`${actionCopy(action, locale)} · ${items.length}`}>
                  <ul className={styles.recommendationList}>
                    {items.map((item) => (
                      <li key={item.id}>
                        <div className={styles.recommendationTitle}>
                          <strong>{item.name}</strong>
                          <Tag type={actionTone(item.action)}>{item.fit}% {c.fit}</Tag>
                        </div>
                        <p>{item.explanation || c.noRecords}</p>
                        <div className={styles.recommendationMeta}>
                          <span>{item.confidence}% {c.confidence}</span>
                          <span>{item.evidenceCount} {c.evidence}</span>
                          <span>{gateCopy(item.gateStatus, locale)}</span>
                        </div>
                        {item.evidence?.length ? (
                          <div className={styles.recommendationDetail}>
                            <strong>{c.evidence}</strong>
                            <ul>
                              {item.evidence.slice(0, 4).map((evidence) => (
                                <li key={evidence.id}>{evidence.label}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.gaps?.length ? (
                          <div className={styles.recommendationDetail}>
                            <strong>{c.gaps}</strong>
                            <ul>
                              {item.gaps.map((gap) => (
                                <li key={gap}>{gap.replaceAll("_", " ")}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {item.ownerName && <p><strong>{c.owner}:</strong> {item.ownerName}</p>}
                        {item.nextStep && <p><strong>{c.nextStep}:</strong> {item.nextStep}</p>}
                        {onReviewTechnology && (
                          <Button kind="ghost" size="sm" renderIcon={ArrowRight} onClick={() => onReviewTechnology(item.id)}>
                            {c.review}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </AccordionItem>
              ))}
            </Accordion>
          ) : <EmptyState text={c.noRecommendations} />}
        </section>

        <section className={styles.operationalSection} aria-labelledby="v4-hypotheses-title">
          <div className={styles.sectionHeading}><h3 id="v4-hypotheses-title">{c.hypotheses}</h3></div>
          {hypotheses.length ? (
            <StructuredListWrapper aria-label={c.hypotheses}>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>{c.hypotheses}</StructuredListCell>
                  <StructuredListCell head>{c.confidence}</StructuredListCell>
                  <StructuredListCell head>{c.nextStep}</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {hypotheses.map((item) => (
                  <StructuredListRow
                    key={item.id}
                    onClick={() => onReviewHypothesis?.(item.id)}
                    onKeyDown={(event) => {
                      if (
                        onReviewHypothesis &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onReviewHypothesis(item.id);
                      }
                    }}
                    tabIndex={onReviewHypothesis ? 0 : undefined}
                  >
                    <StructuredListCell><strong>{item.title}</strong><small>{item.status} · {item.evidenceCount} {c.evidence}</small></StructuredListCell>
                    <StructuredListCell><ProgressBar label={`${item.confidence}%`} value={item.confidence} /></StructuredListCell>
                    <StructuredListCell>{item.nextStep || c.noRecords}</StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          ) : <EmptyState text={c.noHypotheses} />}
        </section>
      </div>

      <section className={styles.accountPlan} aria-labelledby="v4-plan-title">
        <div className={styles.sectionHeading}>
          <div><h3 id="v4-plan-title">{c.accountPlan}</h3>{accountPlan?.updatedAt && <small>{formatDate(accountPlan.updatedAt)}</small>}</div>
          {onEditAccountPlan && !readOnly && <Button kind="tertiary" size="sm" onClick={onEditAccountPlan}>{c.editPlan}</Button>}
        </div>
        {accountPlan ? (
          <div className={styles.planGrid}>
            <PlanColumn title={c.priorities} items={accountPlan.priorities} empty={c.noRecords} />
            <PlanColumn title={c.days30} items={accountPlan.days30} empty={c.noRecords} />
            <PlanColumn title={c.days60} items={accountPlan.days60} empty={c.noRecords} />
            <PlanColumn title={c.days90} items={accountPlan.days90} empty={c.noRecords} />
          </div>
        ) : <EmptyState text={c.noPlan} />}
      </section>
    </section>
  );
}

export function KyndrylV4GovernancePanel({
  ledger,
  evidence = [],
  meetings = [],
  documents = [],
  auditEvents = [],
  onSelectAnswer,
}: KyndrylV4GovernancePanelProps) {
  const { locale, formatDate } = useI18n();
  const c = copy[locale];
  const [capability, setCapability] = useState("all");
  const [person, setPerson] = useState("all");
  const [technology, setTechnology] = useState("all");
  const [status, setStatus] = useState("all");
  const [conflict, setConflict] = useState("all");
  const capabilities = uniqueOptions(ledger.map((item) => [item.capabilityKey, item.capabilityLabel]));
  const people = uniqueOptions(ledger.flatMap((item) => item.stakeholderId && item.stakeholderName ? [[item.stakeholderId, item.stakeholderName] as [string, string]] : []));
  const technologies = uniqueOptions(ledger.flatMap((item) => item.technologies.map((tech) => [tech.id, tech.name] as [string, string])));
  const filtered = ledger.filter((item) =>
    (capability === "all" || item.capabilityKey === capability) &&
    (person === "all" || item.stakeholderId === person) &&
    (technology === "all" || item.technologies.some((tech) => tech.id === technology)) &&
    (status === "all" || item.evidence.some((entry) => entry.status === status)) &&
    (conflict === "all" || (conflict === "conflict" ? item.conflict : !item.conflict)),
  );

  return (
    <section className={styles.panel} aria-labelledby="v4-governance-title">
      <header className={styles.panelHeading}>
        <div>
          <span>{c.governanceEyebrow}</span>
          <h2 id="v4-governance-title">{c.governanceTitle}</h2>
          <p>{c.governanceHelp}</p>
        </div>
        <Tag type="blue">{ledger.length} {c.answer.toLowerCase()}</Tag>
      </header>
      <div className={styles.filters}>
        <FilterSelect id="governance-capability" label={c.capability} allLabel={c.allCapabilities} value={capability} options={capabilities} onChange={setCapability} />
        <FilterSelect id="governance-person" label={c.person} allLabel={c.allPeople} value={person} options={people} onChange={setPerson} />
        <FilterSelect id="governance-technology" label={c.technology} allLabel={c.allTechnologies} value={technology} options={technologies} onChange={setTechnology} />
        <FilterSelect id="governance-status" label={c.status} allLabel={c.allStatuses} value={status} options={[["confirmed", locale === "pt-BR" ? "Confirmada" : "Confirmed"], ["hypothesis", locale === "pt-BR" ? "Hipótese" : "Hypothesis"], ["stale", locale === "pt-BR" ? "Desatualizada" : "Stale"], ["contradicted", locale === "pt-BR" ? "Contraditória" : "Contradicted"]]} onChange={setStatus} />
        <FilterSelect id="governance-conflict" label={c.conflict} allLabel={c.allConflicts} value={conflict} options={[["conflict", c.conflictsOnly], ["clear", c.noConflicts]]} onChange={setConflict} />
      </div>

      <section className={styles.ledger} aria-label={c.governanceTitle}>
        {filtered.length ? (
          <Accordion align="start">
            {filtered.map((item) => (
              <AccordionItem
                key={item.answerId}
                title={
                  <span id={`answer-impact-${item.answerId}`}>
                    <LedgerTitle item={item} locale={locale} />
                  </span>
                }
                onHeadingClick={() => onSelectAnswer?.(item.answerId)}
              >
                <div className={styles.ledgerBody}>
                  <div className={styles.traceSection}>
                    <h4>{c.trace}</h4>
                    <ol className={styles.trace}>
                      <TraceStep label={c.answer} value={item.response} />
                      <TraceStep label={c.evidenceSection} value={item.evidence.map((entry) => entry.label).join(", ") || c.noRecords} />
                      <TraceStep label={c.capability} value={`${item.capabilityLabel} · ${item.dimension}`} />
                      {item.journey && <TraceStep label={c.journey} value={item.journey} />}
                      <TraceStep label={c.technology} value={item.technologies.map((tech) => tech.name).join(", ") || c.noRecords} />
                      {item.recommendation && <TraceStep label={c.recommendations} value={item.recommendation} />}
                    </ol>
                  </div>
                  <div className={styles.impactSection}>
                    <h4>{c.scoreImpact}</h4>
                    {item.scoreDeltas.length ? (
                      <div className={styles.deltaGrid}>
                        {item.scoreDeltas.map((delta) => (
                          <div key={delta.metric}>
                            <span>{metricCopy(delta.metric, locale)}</span>
                            <strong>{delta.before} → {delta.after}</strong>
                            <Tag type={delta.delta > 0 ? "green" : delta.delta < 0 ? "red" : "gray"}>{delta.delta > 0 ? "+" : ""}{delta.delta}</Tag>
                          </div>
                        ))}
                      </div>
                    ) : <p>{c.noImpact}</p>}
                  </div>
                  <div className={styles.ruleGrid}>
                    <LedgerList title={c.rules} items={item.appliedRules} empty={c.noRecords} />
                    <LedgerList title={c.gates} items={[...item.gates, ...item.penalties]} empty={c.noRecords} />
                  </div>
                  <footer className={styles.ledgerMeta}>
                    <span>{formatDate(item.answeredAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                    {item.source && <span>{c.source}: {item.source}</span>}
                    {item.stakeholderName && <span>{c.person}: {item.stakeholderName}</span>}
                    {item.confidence !== undefined && <span>{item.confidence}% {c.confidence.toLowerCase()}</span>}
                    <span>{item.revisions} {c.revisions}</span>
                  </footer>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        ) : <EmptyState text={c.noLedger} />}
      </section>

      <div className={styles.governanceSections}>
        <EvidenceHealth title={c.evidenceSection} evidence={evidence} empty={c.noRecords} locale={locale} />
        <ActivityList title={c.meetings} icon={<Education size={20} />} items={meetings} empty={c.noRecords} formatDate={formatDate} />
        <ActivityList title={c.documents} icon={<Document size={20} />} items={documents} empty={c.noRecords} formatDate={formatDate} />
        <ActivityList title={c.audit} icon={<Network_4 size={20} />} items={auditEvents} empty={c.noRecords} formatDate={formatDate} />
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.emptyState}>{text}</div>;
}

function PlanColumn({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

function uniqueOptions(items: Array<[string, string]>) {
  return [...new Map(items).entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function FilterSelect({ id, label, allLabel, value, options, onChange }: { id: string; label: string; allLabel: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <Select id={id} labelText={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <SelectItem value="all" text={allLabel} />
      {options.map(([key, text]) => <SelectItem key={key} value={key} text={text} />)}
    </Select>
  );
}

function LedgerTitle({ item, locale }: { item: GovernanceLedgerItem; locale: Locale }) {
  return (
    <span className={styles.ledgerTitle}>
      <span><strong>{item.question}</strong><small>{item.capabilityLabel} · {item.dimension}</small></span>
      <span><Tag type={item.conflict ? "red" : "blue"}>{item.response}</Tag>{item.conflict && <Tag type="red">{locale === "pt-BR" ? "Conflito" : "Conflict"}</Tag>}</span>
    </span>
  );
}

function TraceStep({ label, value }: { label: string; value: string }) {
  return <li><span>{label}</span><strong>{value}</strong></li>;
}

function LedgerList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section><h4>{title}</h4>{items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

function EvidenceHealth({ title, evidence, empty, locale }: { title: string; evidence: GovernanceEvidenceView[]; empty: string; locale: Locale }) {
  return (
    <section className={styles.supportSection}>
      <div className={styles.surfaceHeading}><Document size={20} /><h3>{title}</h3></div>
      {evidence.length ? <ul className={styles.supportList}>{evidence.map((item) => <li key={item.id}><div><strong>{item.label}</strong><span>{item.source}</span></div><Tag type={item.status === "confirmed" ? "green" : item.status === "hypothesis" ? "purple" : "red"}>{evidenceStatusCopy(item.status, locale)}</Tag></li>)}</ul> : <p>{empty}</p>}
    </section>
  );
}

function ActivityList({ title, icon, items, empty, formatDate }: { title: string; icon: React.ReactNode; items: GovernanceActivityView[]; empty: string; formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string }) {
  return (
    <section className={styles.supportSection}>
      <div className={styles.surfaceHeading}>{icon}<h3>{title}</h3></div>
      {items.length ? <ul className={styles.supportList}>{items.map((item) => <li key={item.id}><div><strong>{item.title}</strong><span>{item.detail || formatDate(item.occurredAt)}</span></div>{item.status && <Tag type="gray">{item.status}</Tag>}</li>)}</ul> : <p>{empty}</p>}
    </section>
  );
}
