"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Search, Select, SelectItem, Tag } from "@carbon/react";
import { ArrowRight, Close, Filter, Information } from "@carbon/icons-react";
import {
  ACCOUNT_HEALTH_METRICS,
  CAPABILITY_HEALTH_METRICS,
  DEFAULT_CAPABILITY_KEYS,
  type AccountHealthCell,
  type AccountHealthMetricKey,
  type AccountHealthRow,
  type CapabilityHealthCell,
  type CapabilityHealthMetricKey,
  type CapabilityHealthRow,
  type HealthBand,
  type HealthPriority,
  type PortfolioFitCell,
  type PortfolioFitRow,
} from "../lib/account-health";
import styles from "./HealthHeatmaps.module.css";

export type HealthHeatmapLocale = "en-US" | "pt-BR";
export type AccountHealthFilter = "all" | "high-priority" | "no-sponsor" | "low-evidence" | "incomplete-discovery";
export type PortfolioRiskFilter = "all" | HealthPriority;
export type PortfolioFitFilter = "all" | HealthBand;
export type PortfolioSort = "attention" | "best-fit" | "name";

export type HealthHeatmapCopy = {
  account: string;
  score: string;
  sources: string;
  source: string;
  lastUpdated: string;
  noDate: string;
  noData: string;
  closeDetails: string;
  openContext: string;
  evidence: string;
  principalGap: string;
  nextStep: string;
  suggestedQuestion: string;
  product: string;
  workshop: string;
  low: string;
  medium: string;
  high: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  opportunityPotential: string;
  preCrmMaturity: string;
  relationshipCoverage: string;
  evidenceConfidence: string;
  discoveryCoverage: string;
  alignment: string;
  businessValue: string;
  readiness: string;
  confidence: string;
  accountHealthEyebrow: string;
  accountHealthTitle: string;
  accountHealthDescription: string;
  filterLabel: string;
  filterAll: string;
  filterHighPriority: string;
  filterNoSponsor: string;
  filterLowEvidence: string;
  filterIncompleteDiscovery: string;
  showAll: string;
  showLess: string;
  accountHealthTableLabel: string;
  accountHealthCellHint: string;
  capabilityHealthEyebrow: string;
  capabilityHealthTitle: string;
  capabilityHealthDescription: string;
  capability: string;
  capabilityHealthTableLabel: string;
  capabilityHealthCellHint: string;
  portfolioFitEyebrow: string;
  portfolioFitTitle: string;
  portfolioFitDescription: string;
  portfolioFitTableLabel: string;
  portfolioFitCellHint: string;
  searchAccounts: string;
  riskFilter: string;
  fitFilter: string;
  sortBy: string;
  allRisks: string;
  allFitLevels: string;
  sortAttention: string;
  sortBestFit: string;
  sortName: string;
  maturity: string;
  leadingFit: string;
  resultCount: string;
};

const COPY: Record<HealthHeatmapLocale, HealthHeatmapCopy> = {
  "en-US": {
    account: "Account",
    score: "Score",
    sources: "sources",
    source: "source",
    lastUpdated: "Last updated",
    noDate: "Not available",
    noData: "No accounts match the selected filters.",
    closeDetails: "Close details",
    openContext: "Open context",
    evidence: "Evidence",
    principalGap: "Leading gap",
    nextStep: "Next step",
    suggestedQuestion: "Suggested question",
    product: "Related IBM products",
    workshop: "Recommended workshop",
    low: "Low",
    medium: "Medium",
    high: "High",
    priorityHigh: "High priority",
    priorityMedium: "Medium priority",
    priorityLow: "Low priority",
    opportunityPotential: "Opportunity potential",
    preCrmMaturity: "Pre-CRM maturity",
    relationshipCoverage: "Relationship coverage",
    evidenceConfidence: "Evidence confidence",
    discoveryCoverage: "Discovery coverage",
    alignment: "Alignment",
    businessValue: "Business value",
    readiness: "Readiness",
    confidence: "Confidence",
    accountHealthEyebrow: "Account health",
    accountHealthTitle: "Accounts that need attention",
    accountHealthDescription: "Potential, maturity, relationships and evidence in one operational view.",
    filterLabel: "Filter accounts",
    filterAll: "All",
    filterHighPriority: "High priority",
    filterNoSponsor: "No sponsor",
    filterLowEvidence: "Low evidence",
    filterIncompleteDiscovery: "Incomplete discovery",
    showAll: "View all accounts",
    showLess: "Show top five",
    accountHealthTableLabel: "Account health heatmap",
    accountHealthCellHint: "Open the related account context",
    capabilityHealthEyebrow: "Capability health",
    capabilityHealthTitle: "IBM capability readiness",
    capabilityHealthDescription: "Compare fit, business value, readiness, confidence and discovery coverage.",
    capability: "IBM capability",
    capabilityHealthTableLabel: "Capability health heatmap",
    capabilityHealthCellHint: "Review the evidence and recommended action",
    portfolioFitEyebrow: "Portfolio fit",
    portfolioFitTitle: "IBM fit across the portfolio",
    portfolioFitDescription: "Find the strongest capability signals and drill down into the evidence behind each score.",
    portfolioFitTableLabel: "Portfolio fit heatmap",
    portfolioFitCellHint: "Open this capability in the selected account",
    searchAccounts: "Search accounts",
    riskFilter: "Priority",
    fitFilter: "Fit level",
    sortBy: "Sort by",
    allRisks: "All priorities",
    allFitLevels: "All fit levels",
    sortAttention: "Needs attention",
    sortBestFit: "Highest fit",
    sortName: "Account name",
    maturity: "mature",
    leadingFit: "Leading fit",
    resultCount: "accounts shown",
  },
  "pt-BR": {
    account: "Conta",
    score: "Pontuação",
    sources: "fontes",
    source: "fonte",
    lastUpdated: "Última atualização",
    noDate: "Não disponível",
    noData: "Nenhuma conta corresponde aos filtros selecionados.",
    closeDetails: "Fechar detalhes",
    openContext: "Abrir contexto",
    evidence: "Evidências",
    principalGap: "Principal lacuna",
    nextStep: "Próximo passo",
    suggestedQuestion: "Pergunta recomendada",
    product: "Produtos IBM relacionados",
    workshop: "Workshop recomendado",
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
    priorityHigh: "Alta prioridade",
    priorityMedium: "Média prioridade",
    priorityLow: "Baixa prioridade",
    opportunityPotential: "Potencial da oportunidade",
    preCrmMaturity: "Maturidade pré-CRM",
    relationshipCoverage: "Cobertura de relacionamento",
    evidenceConfidence: "Confiança das evidências",
    discoveryCoverage: "Cobertura da descoberta",
    alignment: "Alinhamento",
    businessValue: "Valor de negócio",
    readiness: "Prontidão",
    confidence: "Confiança",
    accountHealthEyebrow: "Saúde das contas",
    accountHealthTitle: "Contas que precisam de atenção",
    accountHealthDescription: "Potencial, maturidade, relacionamentos e evidências em uma visão operacional.",
    filterLabel: "Filtrar contas",
    filterAll: "Todas",
    filterHighPriority: "Alta prioridade",
    filterNoSponsor: "Sem sponsor",
    filterLowEvidence: "Baixa evidência",
    filterIncompleteDiscovery: "Descoberta incompleta",
    showAll: "Ver todas as contas",
    showLess: "Mostrar cinco principais",
    accountHealthTableLabel: "Heatmap de saúde das contas",
    accountHealthCellHint: "Abrir o contexto relacionado da conta",
    capabilityHealthEyebrow: "Saúde das capacidades",
    capabilityHealthTitle: "Prontidão por capacidade IBM",
    capabilityHealthDescription: "Compare aderência, valor de negócio, prontidão, confiança e cobertura da descoberta.",
    capability: "Capacidade IBM",
    capabilityHealthTableLabel: "Heatmap de saúde das capacidades",
    capabilityHealthCellHint: "Revisar as evidências e a ação recomendada",
    portfolioFitEyebrow: "Aderência da carteira",
    portfolioFitTitle: "Aderência IBM em toda a carteira",
    portfolioFitDescription: "Encontre os sinais mais fortes e explore as evidências por trás de cada pontuação.",
    portfolioFitTableLabel: "Heatmap de aderência da carteira",
    portfolioFitCellHint: "Abrir esta capacidade na conta selecionada",
    searchAccounts: "Buscar contas",
    riskFilter: "Prioridade",
    fitFilter: "Nível de aderência",
    sortBy: "Ordenar por",
    allRisks: "Todas as prioridades",
    allFitLevels: "Todos os níveis",
    sortAttention: "Precisa de atenção",
    sortBestFit: "Maior aderência",
    sortName: "Nome da conta",
    maturity: "madura",
    leadingFit: "Maior aderência",
    resultCount: "contas exibidas",
  },
};

const accountFilters: AccountHealthFilter[] = ["all", "high-priority", "no-sponsor", "low-evidence", "incomplete-discovery"];

function useCopy(locale: HealthHeatmapLocale, labels?: Partial<HealthHeatmapCopy>) {
  return useMemo(() => ({ ...COPY[locale], ...labels }), [labels, locale]);
}

function metricLabel(metric: AccountHealthMetricKey | CapabilityHealthMetricKey, copy: HealthHeatmapCopy) {
  return copy[metric];
}

function bandLabel(band: HealthBand, copy: HealthHeatmapCopy) {
  return copy[band];
}

function priorityLabel(priority: HealthPriority, copy: HealthHeatmapCopy) {
  if (priority === "high") return copy.priorityHigh;
  if (priority === "medium") return copy.priorityMedium;
  return copy.priorityLow;
}

function tagTone(priority: HealthPriority) {
  return priority === "high" ? "red" as const : priority === "medium" ? "purple" as const : "green" as const;
}

function formatDate(value: string | null, locale: HealthHeatmapLocale, copy: HealthHeatmapCopy) {
  if (!value || Number.isNaN(new Date(value).getTime())) return copy.noDate;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function SectionHeader({ eyebrow, title, description, side }: { eyebrow: string; title: string; description: string; side?: ReactNode }) {
  return <header className={styles.sectionHeader}><div><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{side}</header>;
}

function Legend({ copy }: { copy: HealthHeatmapCopy }) {
  return <div className={styles.legend} aria-label={`${copy.low}, ${copy.medium}, ${copy.high}`}>
    <span><i data-band="low" />0–39 · {copy.low}</span>
    <span><i data-band="medium" />40–69 · {copy.medium}</span>
    <span><i data-band="high" />70–100 · {copy.high}</span>
  </div>;
}

function HeatCellButton({
  value,
  band,
  label,
  sourceCount,
  copy,
  controlsId,
  expanded,
  onClick,
}: {
  value: number;
  band: HealthBand;
  label: string;
  sourceCount: number;
  copy: HealthHeatmapCopy;
  controlsId?: string;
  expanded?: boolean;
  onClick: (trigger: HTMLButtonElement) => void;
}) {
  const tooltipId = useId();
  const sourceLabel = sourceCount === 1 ? copy.source : copy.sources;
  return <div className={styles.cellWrap}>
    <button
      type="button"
      className={styles.heatCell}
      data-band={band}
      aria-describedby={tooltipId}
      aria-controls={controlsId}
      aria-expanded={controlsId ? Boolean(expanded) : undefined}
      aria-label={`${label}: ${value}%, ${bandLabel(band, copy)}. ${sourceCount} ${sourceLabel}.`}
      onClick={(event) => onClick(event.currentTarget)}
    >
      <strong>{value}</strong><span aria-hidden="true">%</span>
      <small>{bandLabel(band, copy)}</small>
    </button>
    <span id={tooltipId} role="tooltip" className={styles.tooltip}>{label}: {value}% · {sourceCount} {sourceLabel}</span>
  </div>;
}

function DetailClose({ copy, onClose }: { copy: HealthHeatmapCopy; onClose: () => void }) {
  return <button type="button" className={styles.closeButton} aria-label={copy.closeDetails} onClick={onClose}><Close size={18} /></button>;
}

export function AccountHealthHeatmap({
  rows,
  locale = "en-US",
  labels,
  maxRows = 5,
  initialFilter = "all",
  onAccountActivate,
  onCellActivate,
}: {
  rows: AccountHealthRow[];
  locale?: HealthHeatmapLocale;
  labels?: Partial<HealthHeatmapCopy>;
  maxRows?: number;
  initialFilter?: AccountHealthFilter;
  onAccountActivate?: (row: AccountHealthRow) => void;
  onCellActivate?: (row: AccountHealthRow, cell: AccountHealthCell) => void;
}) {
  const copy = useCopy(locale, labels);
  const detailId = useId();
  const detailRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<AccountHealthFilter>(initialFilter);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<{ row: AccountHealthRow; cell: AccountHealthCell; trigger: HTMLButtonElement } | null>(null);
  useEffect(() => { if (selected) detailRef.current?.focus(); }, [selected]);
  const filtered = useMemo(() => rows.filter((row) => {
    if (filter === "high-priority") return row.priority === "high" || row.actionPriority >= 70;
    if (filter === "no-sponsor") return !row.hasSponsor;
    if (filter === "low-evidence") return row.cells.evidenceConfidence.value < 40;
    if (filter === "incomplete-discovery") return row.cells.discoveryCoverage.value < 70;
    return true;
  }), [filter, rows]);
  const visible = expanded ? filtered : filtered.slice(0, maxRows);
  const filterLabels: Record<AccountHealthFilter, string> = {
    all: copy.filterAll,
    "high-priority": copy.filterHighPriority,
    "no-sponsor": copy.filterNoSponsor,
    "low-evidence": copy.filterLowEvidence,
    "incomplete-discovery": copy.filterIncompleteDiscovery,
  };

  return <section className={styles.surface} aria-label={copy.accountHealthTitle}>
    <SectionHeader eyebrow={copy.accountHealthEyebrow} title={copy.accountHealthTitle} description={copy.accountHealthDescription} side={<Tag type="cyan">0–100</Tag>} />
    <div className={styles.filterBar} role="group" aria-label={copy.filterLabel}>
      <Filter size={16} aria-hidden="true" />
      {accountFilters.map((item) => <button key={item} type="button" className={filter === item ? styles.activeFilter : ""} aria-pressed={filter === item} onClick={() => { setFilter(item); setExpanded(false); }}>{filterLabels[item]}</button>)}
    </div>
    <Legend copy={copy} />
    <div className={styles.tableRegion} role="region" aria-label={copy.accountHealthTableLabel} tabIndex={0}>
      <table className={styles.heatTable}>
        <caption className={styles.visuallyHidden}>{copy.accountHealthTableLabel}</caption>
        <thead><tr><th scope="col">{copy.account}</th>{ACCOUNT_HEALTH_METRICS.map((metric) => <th scope="col" key={metric}>{metricLabel(metric, copy)}</th>)}</tr></thead>
        <tbody>{visible.map((row) => <tr key={row.accountId}>
          <th scope="row"><button type="button" className={styles.rowButton} onClick={() => onAccountActivate?.(row)}><span><strong>{row.accountName}</strong><small>{priorityLabel(row.priority, copy)}</small></span><ArrowRight size={16} aria-hidden="true" /></button></th>
          {ACCOUNT_HEALTH_METRICS.map((metric) => {
            const cell = row.cells[metric];
            const isSelected = selected?.row.accountId === row.accountId && selected.cell.metric === metric;
            return <td key={metric}><HeatCellButton value={cell.value} band={cell.band} label={metricLabel(metric, copy)} sourceCount={cell.sourceCount} copy={copy} controlsId={detailId} expanded={isSelected} onClick={(trigger) => setSelected({ row, cell, trigger })} /></td>;
          })}
        </tr>)}</tbody>
      </table>
      {!visible.length && <div className={styles.emptyState}>{copy.noData}</div>}
    </div>
    <div className={styles.tableFooter}><span aria-live="polite">{visible.length} / {filtered.length} {copy.resultCount}</span>{filtered.length > maxRows && <Button kind="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>{expanded ? copy.showLess : copy.showAll}</Button>}</div>
    {selected && <aside ref={detailRef} id={detailId} tabIndex={-1} className={styles.detailPanel} aria-live="polite">
      <DetailClose copy={copy} onClose={() => { selected.trigger.focus(); setSelected(null); }} />
      <div><span>{copy.accountHealthEyebrow}</span><h3>{selected.row.accountName} · {metricLabel(selected.cell.metric, copy)}</h3><p>{copy.accountHealthCellHint}</p></div>
      <dl><div><dt>{copy.score}</dt><dd>{selected.cell.value}% · {bandLabel(selected.cell.band, copy)}</dd></div><div><dt>{copy.sources}</dt><dd>{selected.cell.sourceCount}</dd></div><div><dt>{copy.lastUpdated}</dt><dd>{formatDate(selected.cell.lastUpdated, locale, copy)}</dd></div><div><dt>{copy.principalGap}</dt><dd>{metricLabel(selected.row.principalGap, copy)}</dd></div></dl>
      <Button size="sm" renderIcon={ArrowRight} onClick={() => onCellActivate?.(selected.row, selected.cell)}>{copy.openContext}</Button>
    </aside>}
  </section>;
}

export function CapabilityHealthHeatmap({
  rows,
  locale = "en-US",
  labels,
  onCellActivate,
  onEvidenceActivate,
}: {
  rows: CapabilityHealthRow[];
  locale?: HealthHeatmapLocale;
  labels?: Partial<HealthHeatmapCopy>;
  onCellActivate?: (row: CapabilityHealthRow, cell: CapabilityHealthCell) => void;
  onEvidenceActivate?: (source: string, row: CapabilityHealthRow) => void;
}) {
  const copy = useCopy(locale, labels);
  const detailId = useId();
  const detailRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<{ row: CapabilityHealthRow; cell: CapabilityHealthCell; trigger: HTMLButtonElement } | null>(null);
  useEffect(() => { if (selected) detailRef.current?.focus(); }, [selected]);

  return <section className={styles.surface} aria-label={copy.capabilityHealthTitle}>
    <SectionHeader eyebrow={copy.capabilityHealthEyebrow} title={copy.capabilityHealthTitle} description={copy.capabilityHealthDescription} side={<Tag type="blue">IBM</Tag>} />
    <Legend copy={copy} />
    <div className={styles.tableRegion} role="region" aria-label={copy.capabilityHealthTableLabel} tabIndex={0}>
      <table className={styles.heatTable}>
        <caption className={styles.visuallyHidden}>{copy.capabilityHealthTableLabel}</caption>
        <thead><tr><th scope="col">{copy.capability}</th>{CAPABILITY_HEALTH_METRICS.map((metric) => <th scope="col" key={metric}>{metricLabel(metric, copy)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.capabilityKey}>
          <th scope="row"><div className={styles.capabilityName}><strong>{row.capabilityLabel}</strong><small>{row.sourceCount} {row.sourceCount === 1 ? copy.source : copy.sources}</small></div></th>
          {CAPABILITY_HEALTH_METRICS.map((metric) => {
            const cell = row.cells[metric];
            const isSelected = selected?.row.capabilityKey === row.capabilityKey && selected.cell.metric === metric;
            return <td key={metric}><HeatCellButton value={cell.value} band={cell.band} label={`${row.capabilityLabel} · ${metricLabel(metric, copy)}`} sourceCount={cell.sourceCount} copy={copy} controlsId={detailId} expanded={isSelected} onClick={(trigger) => setSelected({ row, cell, trigger })} /></td>;
          })}
        </tr>)}</tbody>
      </table>
      {!rows.length && <div className={styles.emptyState}>{copy.noData}</div>}
    </div>
    {selected && <aside ref={detailRef} id={detailId} tabIndex={-1} className={`${styles.detailPanel} ${styles.capabilityDetail}`} aria-live="polite">
      <DetailClose copy={copy} onClose={() => { selected.trigger.focus(); setSelected(null); }} />
      <div><span>{copy.capabilityHealthEyebrow}</span><h3>{selected.row.capabilityLabel} · {metricLabel(selected.cell.metric, copy)}</h3><p>{copy.capabilityHealthCellHint}</p></div>
      <dl><div><dt>{copy.score}</dt><dd>{selected.cell.value}% · {bandLabel(selected.cell.band, copy)}</dd></div><div><dt>{copy.principalGap}</dt><dd>{metricLabel(selected.row.principalGap, copy)}</dd></div><div><dt>{copy.lastUpdated}</dt><dd>{formatDate(selected.row.lastUpdated, locale, copy)}</dd></div><div><dt>{copy.product}</dt><dd>{selected.row.product || copy.noDate}</dd></div><div><dt>{copy.workshop}</dt><dd>{selected.row.workshop || copy.noDate}</dd></div><div><dt>{copy.suggestedQuestion}</dt><dd>{selected.row.suggestedQuestion || copy.noDate}</dd></div><div><dt>{copy.nextStep}</dt><dd>{selected.row.nextStep || selected.row.gap || copy.noDate}</dd></div></dl>
      {selected.row.sources.length > 0 && <div className={styles.evidenceList}><strong>{copy.evidence}</strong>{selected.row.sources.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => onEvidenceActivate?.(source, selected.row)}><span>{index + 1}</span>{source}</button>)}</div>}
      <Button size="sm" renderIcon={ArrowRight} onClick={() => onCellActivate?.(selected.row, selected.cell)}>{copy.openContext}</Button>
    </aside>}
  </section>;
}

export function PortfolioFitHeatmap({
  rows,
  capabilities,
  locale = "en-US",
  labels,
  onAccountActivate,
  onCellActivate,
  onEvidenceActivate,
}: {
  rows: PortfolioFitRow[];
  capabilities?: Array<{ key: string; label: string }>;
  locale?: HealthHeatmapLocale;
  labels?: Partial<HealthHeatmapCopy>;
  onAccountActivate?: (row: PortfolioFitRow) => void;
  onCellActivate?: (row: PortfolioFitRow, cell: PortfolioFitCell) => void;
  onEvidenceActivate?: (source: string, row: PortfolioFitRow, cell: PortfolioFitCell) => void;
}) {
  const copy = useCopy(locale, labels);
  const controlId = useId().replace(/:/g, "");
  const detailId = useId();
  const detailRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<PortfolioRiskFilter>("all");
  const [fit, setFit] = useState<PortfolioFitFilter>("all");
  const [sort, setSort] = useState<PortfolioSort>("attention");
  const [selected, setSelected] = useState<{ row: PortfolioFitRow; cell: PortfolioFitCell; trigger: HTMLButtonElement } | null>(null);
  useEffect(() => { if (selected) detailRef.current?.focus(); }, [selected]);
  const columns = useMemo(() => capabilities || (rows[0]?.cells.map((cell) => ({ key: cell.capabilityKey, label: cell.capabilityLabel })) ?? DEFAULT_CAPABILITY_KEYS.map((key) => ({ key, label: key }))), [capabilities, rows]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const result = rows.filter((row) => {
      const matchesQuery = !normalizedQuery || row.accountName.toLocaleLowerCase(locale).includes(normalizedQuery) || row.leadingCapability.toLocaleLowerCase(locale).includes(normalizedQuery);
      const matchesRisk = risk === "all" || row.priority === risk;
      const matchesFit = fit === "all" || row.cells.some((cell) => cell.band === fit);
      return matchesQuery && matchesRisk && matchesFit;
    });
    return [...result].sort((a, b) => {
      if (sort === "best-fit") return b.leadingFit - a.leadingFit || a.accountName.localeCompare(b.accountName, locale);
      if (sort === "name") return a.accountName.localeCompare(b.accountName, locale);
      const weight = { high: 3, medium: 2, low: 1 } as const;
      return weight[b.priority] - weight[a.priority] || b.gapAverage - a.gapAverage || a.accountName.localeCompare(b.accountName, locale);
    });
  }, [fit, locale, query, risk, rows, sort]);

  return <section className={styles.surface} aria-label={copy.portfolioFitTitle}>
    <SectionHeader eyebrow={copy.portfolioFitEyebrow} title={copy.portfolioFitTitle} description={copy.portfolioFitDescription} side={<Tag type="cyan">{filtered.length} / {rows.length}</Tag>} />
    <div className={styles.portfolioFilters}>
      <Search id={`${controlId}-search`} size="lg" labelText={copy.searchAccounts} placeholder={copy.searchAccounts} value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select id={`${controlId}-risk`} size="sm" labelText={copy.riskFilter} value={risk} onChange={(event) => setRisk(event.target.value as PortfolioRiskFilter)}><SelectItem value="all" text={copy.allRisks} /><SelectItem value="high" text={copy.priorityHigh} /><SelectItem value="medium" text={copy.priorityMedium} /><SelectItem value="low" text={copy.priorityLow} /></Select>
      <Select id={`${controlId}-fit`} size="sm" labelText={copy.fitFilter} value={fit} onChange={(event) => setFit(event.target.value as PortfolioFitFilter)}><SelectItem value="all" text={copy.allFitLevels} /><SelectItem value="high" text={copy.high} /><SelectItem value="medium" text={copy.medium} /><SelectItem value="low" text={copy.low} /></Select>
      <Select id={`${controlId}-sort`} size="sm" labelText={copy.sortBy} value={sort} onChange={(event) => setSort(event.target.value as PortfolioSort)}><SelectItem value="attention" text={copy.sortAttention} /><SelectItem value="best-fit" text={copy.sortBestFit} /><SelectItem value="name" text={copy.sortName} /></Select>
    </div>
    <Legend copy={copy} />
    <div className={styles.tableRegion} role="region" aria-label={copy.portfolioFitTableLabel} tabIndex={0}>
      <table className={`${styles.heatTable} ${styles.portfolioTable}`}>
        <caption className={styles.visuallyHidden}>{copy.portfolioFitTableLabel}</caption>
        <thead><tr><th scope="col">{copy.account}</th>{columns.map((capability) => <th scope="col" key={capability.key}>{capability.label}</th>)}</tr></thead>
        <tbody>{filtered.map((row) => <tr key={row.accountId}>
          <th scope="row"><button type="button" className={styles.rowButton} onClick={() => onAccountActivate?.(row)}><span><strong>{row.accountName}</strong><small>{row.maturity}% {copy.maturity} · {row.leadingCapability}</small></span><Tag size="sm" type={tagTone(row.priority)}>{priorityLabel(row.priority, copy)}</Tag></button></th>
          {columns.map((capability) => {
            const cell = row.cells.find((item) => item.capabilityKey === capability.key) || { capabilityKey: capability.key, capabilityLabel: capability.label, value: 0, band: "low" as const, sourceCount: 0, sources: [], nextStep: "" };
            const isSelected = selected?.row.accountId === row.accountId && selected.cell.capabilityKey === cell.capabilityKey;
            return <td key={capability.key}><HeatCellButton value={cell.value} band={cell.band} label={`${row.accountName} · ${capability.label}`} sourceCount={cell.sourceCount} copy={copy} controlsId={detailId} expanded={isSelected} onClick={(trigger) => setSelected({ row, cell, trigger })} /></td>;
          })}
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className={styles.emptyState}>{copy.noData}</div>}
    </div>
    <div className={styles.tableFooter}><span aria-live="polite">{filtered.length} {copy.resultCount}</span></div>
    {selected && <aside ref={detailRef} id={detailId} tabIndex={-1} className={styles.detailPanel} aria-live="polite">
      <DetailClose copy={copy} onClose={() => { selected.trigger.focus(); setSelected(null); }} />
      <div><span>{copy.portfolioFitEyebrow}</span><h3>{selected.row.accountName} · {selected.cell.capabilityLabel}</h3><p>{copy.portfolioFitCellHint}</p></div>
      <dl><div><dt>{copy.score}</dt><dd>{selected.cell.value}% · {bandLabel(selected.cell.band, copy)}</dd></div><div><dt>{copy.riskFilter}</dt><dd>{priorityLabel(selected.row.priority, copy)}</dd></div><div><dt>{copy.leadingFit}</dt><dd>{selected.row.leadingCapability} · {selected.row.leadingFit}%</dd></div><div><dt>{copy.sources}</dt><dd>{selected.cell.sourceCount}</dd></div><div><dt>{copy.nextStep}</dt><dd>{selected.cell.nextStep || copy.noDate}</dd></div></dl>
      {selected.cell.sources.length > 0 && <div className={styles.evidenceList}><strong>{copy.evidence}</strong>{selected.cell.sources.map((source, index) => <button type="button" key={`${source}-${index}`} onClick={() => onEvidenceActivate?.(source, selected.row, selected.cell)}><span>{index + 1}</span>{source}</button>)}</div>}
      <Button size="sm" renderIcon={ArrowRight} onClick={() => onCellActivate?.(selected.row, selected.cell)}>{copy.openContext}</Button>
    </aside>}
  </section>;
}

export function HeatmapScaleInfo({ locale = "en-US", labels }: { locale?: HealthHeatmapLocale; labels?: Partial<HealthHeatmapCopy> }) {
  const copy = useCopy(locale, labels);
  return <div className={styles.scaleInfo}><Information size={16} aria-hidden="true" /><Legend copy={copy} /></div>;
}

export { COPY as HEALTH_HEATMAP_COPY };
