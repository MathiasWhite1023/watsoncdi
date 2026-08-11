"use client";

import { useId, useMemo, useState } from "react";
import {
  Button,
  ComposedModal,
  ContentSwitcher,
  DataTable,
  ModalBody,
  ModalHeader,
  ProgressBar,
  Search,
  Select,
  SelectItem,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { Add, ArrowRight, Checkmark, Renew, WarningAlt } from "@carbon/icons-react";
import {
  CDI_CAPABILITIES,
  CDI_CAPABILITY_CATALOG_VERSION,
  CDI_TECHNOLOGIES,
  localizeCdi,
  type CdiCapability,
  type CdiCapabilityKey,
} from "@/lib/cdi/capability-driven";
import type { Locale } from "@/lib/i18n";
import styles from "./KyndrylV4Home.module.css";

export type KyndrylV4CapabilityStatus =
  | "not_started"
  | "in_progress"
  | "reviewed_gaps"
  | "reviewed_sufficient"
  | "not_relevant"
  | "needs_review";

/**
 * One current capability signal per account and capability. A non-current
 * catalog version is rendered as `needs_review` and never counts as reviewed.
 */
export type KyndrylV4CapabilitySignal = {
  capabilityKey: CdiCapabilityKey;
  catalogVersion: string | null;
  status: KyndrylV4CapabilityStatus;
  technologyFit: number | null;
  confidence: number | null;
  updatedAt?: string | null;
};

export type KyndrylV4TechnologySignal = {
  technologyId: string;
  catalogVersion?: string | null;
  fitScore: number | null;
  confidence: number | null;
  decisionBand?: string | null;
  gateStatus?: string | null;
  computedAt?: string | null;
};

export type KyndrylV4Account = {
  id: string;
  name: string;
  industry?: string | null;
  owner?: string | null;
  maturity?: number | null;
  lastActivityAt?: string | null;
  nextStep?: string | null;
  leadingCapabilityKey?: CdiCapabilityKey | null;
  capabilities: KyndrylV4CapabilitySignal[];
  technologySignals?: KyndrylV4TechnologySignal[];
};

export type KyndrylV4HomeProps = {
  accounts: KyndrylV4Account[];
  locale?: Locale;
  onStartDiscovery: (
    accountId: string,
    capabilityKey: CdiCapabilityKey,
  ) => void;
  onOpenAccount?: (accountId: string) => void;
  onOpenStrategy?: (accountId: string, technologyId: string) => void;
  className?: string;
};

export type KyndrylV4AccountsProps = {
  accounts: KyndrylV4Account[];
  locale?: Locale;
  onOpenAccount: (accountId: string) => void;
  onCreateAccount?: () => void;
  className?: string;
};

export type KyndrylV4CapabilityCoverage = {
  capabilityKey: CdiCapabilityKey;
  reviewed: number;
  total: number;
  percent: number;
  inProgress: number;
  reviewedWithGaps: number;
  reviewedSufficient: number;
  notRelevant: number;
  needsReview: number;
};

type AccountFilter = "all" | "needs_discovery" | "in_progress" | "reviewed";

const COPY = {
  "en-US": {
    eyebrow: "Portfolio intelligence",
    homeTitle: "Account opportunities at a glance",
    homeDescription:
      "Compare solution fit across the IBM and strategic ecosystem portfolio, then continue directly into the capability discovery that will strengthen the evidence.",
    accountsReviewed: "accounts reviewed",
    reviewed: "reviewed",
    inProgress: "In progress",
    gaps: "Open gaps",
    notRelevant: "Not relevant",
    needsReview: "Needs review",
    sufficient: "Evidence sufficient",
    notStarted: "Not started",
    chooseAccount: "Choose an account",
    chooseAccountHelp:
      "Accounts are ordered by active work first, followed by discoveries that have not started and reviews with open gaps.",
    noAccounts: "No accounts are available yet.",
    openAccount: "Open account",
    continueDiscovery: "Continue discovery",
    startDiscovery: "Start discovery",
    reviewDiscovery: "Review discovery",
    portfolioEyebrow: "Portfolio heatmap",
    portfolioTitle: "Opportunity heatmap across all accounts",
    portfolioDescription:
      "Review IBM and ecosystem solution fit or capability coverage. Unassessed items remain explicitly not assessed and never receive an artificial score.",
    heatmapLabel: "Account capability heatmap",
    capabilityHeatmapTitle: "Technology fit across all accounts",
    solutionHeatmapLabel: "IBM and ecosystem solution fit by account",
    viewBy: "View heatmap by",
    solutions: "IBM & ecosystem solutions",
    capabilities: "Capabilities",
    filterSolutions: "Filter solutions by capability",
    allSolutions: "All solutions",
    lowFit: "0–39 · Low fit",
    mediumFit: "40–69 · Validate",
    highFit: "70–100 · Strong fit",
    solutionNotAssessed: "Not assessed",
    decision: "Decision",
    gate: "Gate",
    gateSatisfied: "Gate satisfied",
    gatePending: "Gate pending",
    gateFailed: "Gate failed",
    gateNotRequired: "No gate required",
    recommendNow: "Recommend now",
    validate: "Validate",
    watch: "Watch",
    lowPriority: "Low priority",
    doNotRecommend: "Do not recommend",
    explorerEyebrow: "Capability coverage",
    explorerTitle: "Choose the next discovery",
    explorerDescription:
      "Capabilities with the largest portfolio coverage gap appear first. Search by capability or related IBM and ecosystem solution.",
    searchCapabilities: "Search capabilities or IBM and ecosystem solutions",
    relatedSolutions: "Related IBM & ecosystem solutions",
    activity: "Discovery activity",
    noCapabilities: "No capabilities match this search.",
    account: "Account",
    confidenceShort: "Conf.",
    fitShort: "Fit",
    fit: "Technology fit",
    confidence: "Confidence",
    legend: "Status legend",
    accountListEyebrow: "Accounts",
    accountListTitle: "Account workspace",
    accountListDescription:
      "Find an account and continue discovery, relationship mapping, strategy, or governance.",
    search: "Search accounts",
    filter: "Discovery status",
    all: "All accounts",
    needsDiscovery: "Needs discovery",
    reviewedAccounts: "Fully reviewed",
    results: "accounts shown",
    industry: "Industry",
    owner: "Owner",
    coverage: "Coverage",
    leadingCapability: "Leading capability",
    lastActivity: "Last activity",
    nextStep: "Next step",
    unavailable: "Not available",
    notAssessed: "Not assessed",
    open: "Open",
    createAccount: "Create account",
  },
  "pt-BR": {
    eyebrow: "Inteligência da carteira",
    homeTitle: "Oportunidades das contas em uma única visão",
    homeDescription:
      "Compare a aderência das soluções do portfólio IBM e do ecossistema estratégico entre as contas e continue diretamente na descoberta que fortalecerá as evidências.",
    accountsReviewed: "contas revisadas",
    reviewed: "revisadas",
    inProgress: "Em andamento",
    gaps: "Lacunas abertas",
    notRelevant: "Não relevante",
    needsReview: "Precisa de revisão",
    sufficient: "Evidência suficiente",
    notStarted: "Não iniciado",
    chooseAccount: "Escolha uma conta",
    chooseAccountHelp:
      "As contas são ordenadas primeiro pelo trabalho ativo, depois pelas descobertas não iniciadas e pelas revisões com lacunas abertas.",
    noAccounts: "Ainda não há contas disponíveis.",
    openAccount: "Abrir conta",
    continueDiscovery: "Continuar descoberta",
    startDiscovery: "Iniciar descoberta",
    reviewDiscovery: "Revisar descoberta",
    portfolioEyebrow: "Heatmap da carteira",
    portfolioTitle: "Heatmap de oportunidades em todas as contas",
    portfolioDescription:
      "Analise a aderência das soluções IBM e do ecossistema ou a cobertura das capabilities. Itens não avaliados nunca recebem score artificial.",
    heatmapLabel: "Heatmap de capabilities por conta",
    capabilityHeatmapTitle: "Aderência tecnológica em todas as contas",
    solutionHeatmapLabel: "Aderência de soluções IBM e do ecossistema por conta",
    viewBy: "Visualizar heatmap por",
    solutions: "Soluções IBM e ecossistema",
    capabilities: "Capabilities",
    filterSolutions: "Filtrar soluções por capability",
    allSolutions: "Todas as soluções",
    lowFit: "0–39 · Baixa aderência",
    mediumFit: "40–69 · Validar",
    highFit: "70–100 · Alta aderência",
    solutionNotAssessed: "Não avaliado",
    decision: "Decisão",
    gate: "Gate",
    gateSatisfied: "Gate atendido",
    gatePending: "Gate pendente",
    gateFailed: "Gate não atendido",
    gateNotRequired: "Sem gate obrigatório",
    recommendNow: "Recomendar agora",
    validate: "Validar",
    watch: "Acompanhar",
    lowPriority: "Baixa prioridade",
    doNotRecommend: "Não recomendar",
    explorerEyebrow: "Cobertura das capabilities",
    explorerTitle: "Escolha a próxima descoberta",
    explorerDescription:
      "Capabilities com maior lacuna de cobertura na carteira aparecem primeiro. Busque por capability ou solução IBM e do ecossistema relacionada.",
    searchCapabilities: "Buscar capabilities ou soluções IBM e do ecossistema",
    relatedSolutions: "Soluções IBM e do ecossistema relacionadas",
    activity: "Atividade de descoberta",
    noCapabilities: "Nenhuma capability corresponde à busca.",
    account: "Conta",
    confidenceShort: "Conf.",
    fitShort: "Fit",
    fit: "Technology fit",
    confidence: "Confiança",
    legend: "Legenda de status",
    accountListEyebrow: "Contas",
    accountListTitle: "Workspace de contas",
    accountListDescription:
      "Encontre uma conta e continue a descoberta, o relacionamento, a estratégia ou a governança.",
    search: "Buscar contas",
    filter: "Status da descoberta",
    all: "Todas as contas",
    needsDiscovery: "Precisa de descoberta",
    reviewedAccounts: "Totalmente revisadas",
    results: "contas exibidas",
    industry: "Indústria",
    owner: "Responsável",
    coverage: "Cobertura",
    leadingCapability: "Principal capability",
    lastActivity: "Última atividade",
    nextStep: "Próximo passo",
    unavailable: "Não disponível",
    notAssessed: "Não avaliada",
    open: "Abrir",
    createAccount: "Criar conta",
  },
} as const;

const STATUS_ORDER: Record<KyndrylV4CapabilityStatus, number> = {
  in_progress: 0,
  not_started: 1,
  needs_review: 2,
  reviewed_gaps: 3,
  reviewed_sufficient: 4,
  not_relevant: 5,
};

const clampPercent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? null
    : Math.max(0, Math.min(100, Math.round(value)));

export function getKyndrylV4CapabilitySignal(
  account: KyndrylV4Account,
  capabilityKey: CdiCapabilityKey,
) {
  return (
    account.capabilities.find(
      (signal) => signal.capabilityKey === capabilityKey,
    ) || null
  );
}

export function getKyndrylV4EffectiveStatus(
  signal: KyndrylV4CapabilitySignal | null,
): KyndrylV4CapabilityStatus {
  if (!signal) return "not_started";
  if (signal.status === "not_started") return "not_started";
  if (signal.status === "needs_review") return "needs_review";
  if (signal.catalogVersion !== CDI_CAPABILITY_CATALOG_VERSION) {
    return "needs_review";
  }
  return signal.status;
}

const isReviewedStatus = (status: KyndrylV4CapabilityStatus) =>
  status === "reviewed_gaps" ||
  status === "reviewed_sufficient" ||
  status === "not_relevant";

export function summarizeKyndrylV4CapabilityCoverage(
  accounts: KyndrylV4Account[],
  capabilityKey: CdiCapabilityKey,
): KyndrylV4CapabilityCoverage {
  const statuses = accounts.map((account) =>
    getKyndrylV4EffectiveStatus(
      getKyndrylV4CapabilitySignal(account, capabilityKey),
    ),
  );
  const count = (status: KyndrylV4CapabilityStatus) =>
    statuses.filter((item) => item === status).length;
  const reviewed = statuses.filter(isReviewedStatus).length;
  return {
    capabilityKey,
    reviewed,
    total: accounts.length,
    percent: accounts.length ? Math.round((reviewed / accounts.length) * 100) : 0,
    inProgress: count("in_progress"),
    reviewedWithGaps: count("reviewed_gaps"),
    reviewedSufficient: count("reviewed_sufficient"),
    notRelevant: count("not_relevant"),
    needsReview: count("needs_review"),
  };
}

export function calculateKyndrylV4AccountCoverage(account: KyndrylV4Account) {
  const reviewedCapabilities = CDI_CAPABILITIES.filter((capability) =>
    isReviewedStatus(
      getKyndrylV4EffectiveStatus(
        getKyndrylV4CapabilitySignal(account, capability.key),
      ),
    ),
  ).length;
  return Math.round(
    (reviewedCapabilities / CDI_CAPABILITIES.length) * 100,
  );
}

export function sortKyndrylV4AccountsForCapability(
  accounts: KyndrylV4Account[],
  capabilityKey: CdiCapabilityKey,
  locale: Locale = "en-US",
) {
  return [...accounts].sort((left, right) => {
    const leftStatus = getKyndrylV4EffectiveStatus(
      getKyndrylV4CapabilitySignal(left, capabilityKey),
    );
    const rightStatus = getKyndrylV4EffectiveStatus(
      getKyndrylV4CapabilitySignal(right, capabilityKey),
    );
    return (
      STATUS_ORDER[leftStatus] - STATUS_ORDER[rightStatus] ||
      left.name.localeCompare(right.name, locale)
    );
  });
}

function statusLabel(
  status: KyndrylV4CapabilityStatus,
  locale: Locale,
) {
  const copy = COPY[locale];
  return {
    not_started: copy.notStarted,
    in_progress: copy.inProgress,
    reviewed_gaps: copy.gaps,
    reviewed_sufficient: copy.sufficient,
    not_relevant: copy.notRelevant,
    needs_review: copy.needsReview,
  }[status];
}

function statusTagType(status: KyndrylV4CapabilityStatus) {
  if (status === "reviewed_sufficient") return "green" as const;
  if (status === "in_progress") return "blue" as const;
  if (status === "reviewed_gaps") return "purple" as const;
  if (status === "needs_review") return "warm-gray" as const;
  return "gray" as const;
}

function actionLabel(status: KyndrylV4CapabilityStatus, locale: Locale) {
  const copy = COPY[locale];
  if (status === "in_progress") return copy.continueDiscovery;
  if (status === "not_started") return copy.startDiscovery;
  return copy.reviewDiscovery;
}

function bandForFit(value: number | null) {
  if (value == null) return "none";
  if (value >= 70) return "high";
  if (value >= 40) return "medium";
  return "low";
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function leadingCapability(account: KyndrylV4Account) {
  if (account.leadingCapabilityKey) {
    return CDI_CAPABILITIES.find(
      (capability) => capability.key === account.leadingCapabilityKey,
    );
  }
  const ranked = account.capabilities
    .filter(
      (signal) =>
        getKyndrylV4EffectiveStatus(signal) !== "needs_review" &&
        clampPercent(signal.technologyFit) != null,
    )
    .sort(
      (left, right) =>
        (clampPercent(right.technologyFit) || 0) -
        (clampPercent(left.technologyFit) || 0),
    );
  return CDI_CAPABILITIES.find(
    (capability) => capability.key === ranked[0]?.capabilityKey,
  );
}

function technologySignal(
  account: KyndrylV4Account,
  technologyId: string,
) {
  const signal = account.technologySignals?.find(
    (item) => item.technologyId === technologyId,
  );
  if (
    signal?.catalogVersion &&
    signal.catalogVersion !== CDI_CAPABILITY_CATALOG_VERSION
  )
    return null;
  return signal || null;
}

function decisionLabel(value: string | null | undefined, locale: Locale) {
  const copy = COPY[locale];
  return {
    RECOMMEND_NOW: copy.recommendNow,
    VALIDATE: copy.validate,
    WATCHLIST: copy.watch,
    LOW_PRIORITY: copy.lowPriority,
    DO_NOT_RECOMMEND: copy.doNotRecommend,
    GATE_PENDING: copy.gatePending,
    GATE_FAILED: copy.gateFailed,
  }[String(value || "").toUpperCase()] || copy.solutionNotAssessed;
}

function gateLabel(value: string | null | undefined, locale: Locale) {
  const copy = COPY[locale];
  return {
    SATISFIED: copy.gateSatisfied,
    PENDING: copy.gatePending,
    FAILED: copy.gateFailed,
    NOT_REQUIRED: copy.gateNotRequired,
  }[String(value || "").toUpperCase()] || copy.gateNotRequired;
}

function CapabilityExplorer({
  accounts,
  locale,
  coverage,
  onActivate,
}: {
  accounts: KyndrylV4Account[];
  locale: Locale;
  coverage: Map<CdiCapabilityKey, KyndrylV4CapabilityCoverage>;
  onActivate: (capabilityKey: CdiCapabilityKey) => void;
}) {
  const copy = COPY[locale];
  const searchId = useId().replaceAll(":", "");
  const [query, setQuery] = useState("");
  const capabilities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return CDI_CAPABILITIES.map((capability) => {
      const relatedSolutions = CDI_TECHNOLOGIES.filter((technology) =>
        technology.capabilityKeys.includes(capability.key),
      );
      return {
        capability,
        relatedSolutions,
        coverage: coverage.get(capability.key)!,
      };
    })
      .filter(({ capability, relatedSolutions }) => {
        if (!normalizedQuery) return true;
        return [
          localizeCdi(capability.label, locale),
          localizeCdi(capability.description, locale),
          ...relatedSolutions.map((technology) => technology.name),
        ].some((value) =>
          value.toLocaleLowerCase(locale).includes(normalizedQuery),
        );
      })
      .sort(
        (left, right) =>
          right.coverage.total - right.coverage.reviewed -
            (left.coverage.total - left.coverage.reviewed) ||
          right.coverage.inProgress - left.coverage.inProgress ||
          localizeCdi(left.capability.label, locale).localeCompare(
            localizeCdi(right.capability.label, locale),
            locale,
          ),
      );
  }, [coverage, locale, query]);

  return (
    <section
      className={styles.capabilitySurface}
      aria-labelledby="v4-capability-explorer-title"
    >
      <header className={styles.sectionHeader}>
        <div>
          <span>{copy.explorerEyebrow}</span>
          <h2 id="v4-capability-explorer-title">{copy.explorerTitle}</h2>
          <p>{copy.explorerDescription}</p>
        </div>
        <Tag type="cyan">
          {CDI_CAPABILITIES.length} {copy.capabilities.toLocaleLowerCase(locale)}
        </Tag>
      </header>
      <div className={styles.explorerToolbar}>
        <Search
          id={`${searchId}-capability-search`}
          size="lg"
          labelText={copy.searchCapabilities}
          placeholder={copy.searchCapabilities}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span aria-live="polite">
          {capabilities.length}/{CDI_CAPABILITIES.length}
        </span>
      </div>
      {capabilities.length > 0 ? (
        <div className={styles.explorerRegion}>
          <StructuredListWrapper
            className={styles.capabilityList}
            aria-label={copy.explorerTitle}
          >
            <StructuredListHead>
              <StructuredListRow head className={styles.capabilityListHead}>
                <StructuredListCell head>{copy.capabilities}</StructuredListCell>
                <StructuredListCell head>{copy.relatedSolutions}</StructuredListCell>
                <StructuredListCell head>{copy.coverage}</StructuredListCell>
                <StructuredListCell head>{copy.activity}</StructuredListCell>
                <StructuredListCell head aria-label={copy.chooseAccount} />
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {capabilities.map(({ capability, relatedSolutions, coverage: item }) => (
                <StructuredListRow
                  className={styles.capabilityListRow}
                  key={capability.key}
                >
                  <StructuredListCell className={styles.capabilityIdentity}>
                    <small>{capability.code.replaceAll("_", " ")}</small>
                    <strong>{localizeCdi(capability.label, locale)}</strong>
                    <span>{localizeCdi(capability.description, locale)}</span>
                  </StructuredListCell>
                  <StructuredListCell className={styles.relatedSolutions}>
                    {relatedSolutions.map((technology) => (
                      <Tag key={technology.id} size="sm" type="gray">
                        {technology.name}
                      </Tag>
                    ))}
                  </StructuredListCell>
                  <StructuredListCell className={styles.explorerCoverage}>
                    <div>
                      <strong>{item.percent}%</strong>
                      <span>
                        {item.reviewed}/{item.total} {copy.reviewed}
                      </span>
                    </div>
                    <ProgressBar
                      label={`${item.percent}% ${copy.accountsReviewed}`}
                      hideLabel
                      value={item.percent}
                    />
                  </StructuredListCell>
                  <StructuredListCell className={styles.explorerActivity}>
                    <span>{item.inProgress} {copy.inProgress.toLocaleLowerCase(locale)}</span>
                    <span>{item.reviewedWithGaps} {copy.gaps.toLocaleLowerCase(locale)}</span>
                    {item.needsReview > 0 && (
                      <span className={styles.needsReview}>
                        <Renew size={14} aria-hidden="true" />
                        {item.needsReview} {copy.needsReview.toLocaleLowerCase(locale)}
                      </span>
                    )}
                  </StructuredListCell>
                  <StructuredListCell className={styles.explorerAction}>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={ArrowRight}
                      aria-haspopup="dialog"
                      onClick={() => onActivate(capability.key)}
                    >
                      {copy.chooseAccount}
                    </Button>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      ) : (
        <div className={styles.emptyState}>{copy.noCapabilities}</div>
      )}
      {accounts.length === 0 && (
        <div className={styles.explorerAccountHint}>{copy.noAccounts}</div>
      )}
    </section>
  );
}

function AccountCapabilitySelector({
  capability,
  accounts,
  locale,
  onClose,
  onStartDiscovery,
  onOpenAccount,
}: {
  capability: CdiCapability | null;
  accounts: KyndrylV4Account[];
  locale: Locale;
  onClose: () => void;
  onStartDiscovery: KyndrylV4HomeProps["onStartDiscovery"];
  onOpenAccount?: KyndrylV4HomeProps["onOpenAccount"];
}) {
  const copy = COPY[locale];
  const sorted = useMemo(
    () =>
      capability
        ? sortKyndrylV4AccountsForCapability(accounts, capability.key, locale)
        : [],
    [accounts, capability, locale],
  );
  return (
    <ComposedModal open={Boolean(capability)} onClose={onClose} size="lg">
      <ModalHeader
        label={copy.eyebrow}
        title={
          capability
            ? `${copy.chooseAccount} · ${localizeCdi(capability.label, locale)}`
            : copy.chooseAccount
        }
      />
      <ModalBody hasScrollingContent>
        <p className={styles.modalHelp}>{copy.chooseAccountHelp}</p>
        {capability && sorted.length > 0 ? (
          <div className={styles.accountChoices} role="list">
            {sorted.map((account) => {
              const signal = getKyndrylV4CapabilitySignal(
                account,
                capability.key,
              );
              const status = getKyndrylV4EffectiveStatus(signal);
              const fit =
                status === "needs_review"
                  ? null
                  : clampPercent(signal?.technologyFit);
              const confidence =
                status === "needs_review"
                  ? null
                  : clampPercent(signal?.confidence);
              return (
                <div className={styles.accountChoice} role="listitem" key={account.id}>
                  <div>
                    <strong>{account.name}</strong>
                    <span>
                      {[account.industry, account.owner].filter(Boolean).join(" · ") ||
                        copy.unavailable}
                    </span>
                  </div>
                  <div className={styles.accountChoiceStatus}>
                    <Tag size="sm" type={statusTagType(status)}>
                      {statusLabel(status, locale)}
                    </Tag>
                    {(fit != null || confidence != null) && (
                      <small>
                        {fit != null ? `${copy.fitShort} ${fit}%` : ""}
                        {fit != null && confidence != null ? " · " : ""}
                        {confidence != null
                          ? `${copy.confidenceShort} ${confidence}%`
                          : ""}
                      </small>
                    )}
                  </div>
                  <div className={styles.accountChoiceActions}>
                    {onOpenAccount && (
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => onOpenAccount(account.id)}
                      >
                        {copy.openAccount}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      renderIcon={ArrowRight}
                      onClick={() => {
                        onStartDiscovery(account.id, capability.key);
                        onClose();
                      }}
                    >
                      {actionLabel(status, locale)}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>{copy.noAccounts}</div>
        )}
      </ModalBody>
    </ComposedModal>
  );
}

function PortfolioCapabilityHeatmap({
  accounts,
  locale,
  onStartDiscovery,
  onOpenAccount,
}: Pick<
  KyndrylV4HomeProps,
  "accounts" | "locale" | "onStartDiscovery" | "onOpenAccount"
> & { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <div
      className={styles.heatmapRegion}
      role="region"
      aria-label={copy.heatmapLabel}
      tabIndex={0}
    >
      <table className={styles.heatmapTable}>
        <caption className={styles.visuallyHidden}>
          {copy.capabilityHeatmapTitle}
        </caption>
        <thead>
          <tr>
            <th scope="col">{copy.account}</th>
            {CDI_CAPABILITIES.map((capability) => (
              <th scope="col" key={capability.key}>
                <span title={localizeCdi(capability.label, locale)}>
                  {capability.code.replaceAll("_", " ")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <th scope="row">
                <button
                  type="button"
                  className={styles.heatmapAccount}
                  onClick={() => onOpenAccount?.(account.id)}
                  disabled={!onOpenAccount}
                >
                  <strong>{account.name}</strong>
                  <small>{calculateKyndrylV4AccountCoverage(account)}%</small>
                </button>
              </th>
              {CDI_CAPABILITIES.map((capability) => {
                const signal = getKyndrylV4CapabilitySignal(
                  account,
                  capability.key,
                );
                const status = getKyndrylV4EffectiveStatus(signal);
                const fit =
                  status === "not_started" ||
                  status === "not_relevant" ||
                  status === "needs_review"
                    ? null
                    : clampPercent(signal?.technologyFit);
                const confidence =
                  status === "not_started" ||
                  status === "not_relevant" ||
                  status === "needs_review"
                    ? null
                    : clampPercent(signal?.confidence);
                const capabilityLabel = localizeCdi(capability.label, locale);
                const accessibleValue = [
                  account.name,
                  capabilityLabel,
                  statusLabel(status, locale),
                  fit == null ? null : `${copy.fit} ${fit}%`,
                  confidence == null
                    ? null
                    : `${copy.confidence} ${confidence}%`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <td key={capability.key}>
                    <button
                      type="button"
                      className={styles.heatmapCell}
                      data-status={status}
                      data-band={bandForFit(fit)}
                      aria-label={accessibleValue}
                      onClick={() =>
                        onStartDiscovery(account.id, capability.key)
                      }
                    >
                      {fit == null ? (
                        <span className={styles.statusMark}>
                          {status === "needs_review" ? (
                            <Renew size={16} aria-hidden="true" />
                          ) : status === "reviewed_gaps" ? (
                            <WarningAlt size={16} aria-hidden="true" />
                          ) : status === "reviewed_sufficient" ? (
                            <Checkmark size={16} aria-hidden="true" />
                          ) : status === "not_relevant" ? (
                            "N/R"
                          ) : (
                            "—"
                          )}
                        </span>
                      ) : (
                        <strong>{fit}%</strong>
                      )}
                      {confidence != null && (
                        <small>
                          {copy.confidenceShort} {confidence}%
                        </small>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {accounts.length === 0 && (
        <div className={styles.emptyState}>{copy.noAccounts}</div>
      )}
    </div>
  );
}

function PortfolioTechnologyHeatmap({
  accounts,
  technologies,
  locale,
  onOpenAccount,
  onOpenStrategy,
}: Pick<
  KyndrylV4HomeProps,
  "accounts" | "locale" | "onOpenAccount" | "onOpenStrategy"
> & { locale: Locale; technologies: typeof CDI_TECHNOLOGIES }) {
  const copy = COPY[locale];
  return (
    <div
      className={styles.heatmapRegion}
      role="region"
      aria-label={copy.solutionHeatmapLabel}
      tabIndex={0}
    >
      <table
        className={`${styles.heatmapTable} ${styles.solutionHeatmapTable}`}
        style={{ minWidth: `${14 + technologies.length * 7}rem` }}
      >
        <caption className={styles.visuallyHidden}>
          {copy.solutionHeatmapLabel}
        </caption>
        <thead>
          <tr>
            <th scope="col">{copy.account}</th>
            {technologies.map((technology) => (
              <th scope="col" key={technology.id}>
                <span>{technology.name.replace(/^IBM\s+/i, "")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <th scope="row">
                <button
                  type="button"
                  className={styles.heatmapAccount}
                  onClick={() => onOpenAccount?.(account.id)}
                  disabled={!onOpenAccount}
                >
                  <strong>{account.name}</strong>
                  <small>{calculateKyndrylV4AccountCoverage(account)}%</small>
                </button>
              </th>
              {technologies.map((technology) => {
                const signal = technologySignal(account, technology.id);
                const fit = clampPercent(signal?.fitScore);
                const confidence = clampPercent(signal?.confidence);
                const assessed = Boolean(signal && fit != null);
                const decision = assessed
                  ? decisionLabel(signal?.decisionBand, locale)
                  : copy.solutionNotAssessed;
                const gate = assessed
                  ? gateLabel(signal?.gateStatus, locale)
                  : null;
                const accessibleValue = [
                  account.name,
                  technology.name,
                  assessed ? `${copy.fit} ${fit}%` : copy.solutionNotAssessed,
                  confidence == null
                    ? null
                    : `${copy.confidence} ${confidence}%`,
                  assessed ? `${copy.decision}: ${decision}` : null,
                  gate ? `${copy.gate}: ${gate}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const canOpen = Boolean(onOpenStrategy || onOpenAccount);
                return (
                  <td key={technology.id}>
                    <button
                      type="button"
                      className={`${styles.heatmapCell} ${styles.technologyCell}`}
                      data-band={bandForFit(fit)}
                      data-decision={signal?.decisionBand || "not_assessed"}
                      aria-label={accessibleValue}
                      disabled={!canOpen}
                      onClick={() => {
                        if (onOpenStrategy)
                          onOpenStrategy(account.id, technology.id);
                        else onOpenAccount?.(account.id);
                      }}
                    >
                      {assessed ? (
                        <strong>{fit}%</strong>
                      ) : (
                        <span className={styles.notAssessed}>{copy.solutionNotAssessed}</span>
                      )}
                      {confidence != null && (
                        <small>
                          {copy.confidenceShort} {confidence}%
                        </small>
                      )}
                      {assessed && (
                        <span className={styles.decisionLabel}>{decision}</span>
                      )}
                      {gate && <span className={styles.gateLabel}>{gate}</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {accounts.length === 0 && (
        <div className={styles.emptyState}>{copy.noAccounts}</div>
      )}
    </div>
  );
}

function PortfolioOpportunityHeatmap({
  accounts,
  locale,
  onStartDiscovery,
  onOpenAccount,
  onOpenStrategy,
}: Pick<
  KyndrylV4HomeProps,
  | "accounts"
  | "locale"
  | "onStartDiscovery"
  | "onOpenAccount"
  | "onOpenStrategy"
> & { locale: Locale }) {
  const copy = COPY[locale];
  const [mode, setMode] = useState<"solutions" | "capabilities">("solutions");
  const [solutionCapability, setSolutionCapability] = useState("all");
  const visibleTechnologies = useMemo(
    () =>
      solutionCapability === "all"
        ? CDI_TECHNOLOGIES
        : CDI_TECHNOLOGIES.filter((technology) =>
            technology.capabilityKeys.includes(
              solutionCapability as CdiCapabilityKey,
            ),
          ),
    [solutionCapability],
  );
  return (
    <section className={styles.heatmapSurface} aria-labelledby="v4-heatmap-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>{copy.portfolioEyebrow}</span>
          <h2 id="v4-heatmap-title">{copy.portfolioTitle}</h2>
          <p>{copy.portfolioDescription}</p>
        </div>
        <Tag type="cyan">
          {accounts.length} {copy.account.toLocaleLowerCase(locale)}
        </Tag>
      </header>
      <div className={styles.heatmapToolbar}>
        <span>{copy.viewBy}</span>
        <div className={styles.heatmapControls}>
          <ContentSwitcher
            aria-label={copy.viewBy}
            selectedIndex={mode === "solutions" ? 0 : 1}
            onChange={({ name }) =>
              setMode(name === "capabilities" ? "capabilities" : "solutions")
            }
          >
            <Switch name="solutions" text={copy.solutions} />
            <Switch name="capabilities" text={copy.capabilities} />
          </ContentSwitcher>
          {mode === "solutions" && (
            <Select
              id="v4-solution-capability-filter"
              hideLabel
              labelText={copy.filterSolutions}
              value={solutionCapability}
              onChange={(event) => setSolutionCapability(event.target.value)}
            >
              <SelectItem value="all" text={copy.allSolutions} />
              {CDI_CAPABILITIES.map((capability) => (
                <SelectItem
                  key={capability.key}
                  value={capability.key}
                  text={localizeCdi(capability.label, locale)}
                />
              ))}
            </Select>
          )}
        </div>
      </div>
      {mode === "solutions" ? (
        <>
          <div className={styles.heatmapLegend} aria-label={copy.legend}>
            <span data-band="none">{copy.solutionNotAssessed}</span>
            <span data-band="low">{copy.lowFit}</span>
            <span data-band="medium">{copy.mediumFit}</span>
            <span data-band="high">{copy.highFit}</span>
          </div>
          <PortfolioTechnologyHeatmap
            accounts={accounts}
            technologies={visibleTechnologies}
            locale={locale}
            onOpenAccount={onOpenAccount}
            onOpenStrategy={onOpenStrategy}
          />
        </>
      ) : (
        <>
          <div className={styles.heatmapLegend} aria-label={copy.legend}>
            <span data-status="not_started">{copy.notStarted}</span>
            <span data-status="in_progress">{copy.inProgress}</span>
            <span data-status="reviewed_gaps">{copy.gaps}</span>
            <span data-status="reviewed_sufficient">{copy.sufficient}</span>
            <span data-status="not_relevant">{copy.notRelevant}</span>
            <span data-status="needs_review">{copy.needsReview}</span>
          </div>
          <PortfolioCapabilityHeatmap
            accounts={accounts}
            locale={locale}
            onStartDiscovery={onStartDiscovery}
            onOpenAccount={onOpenAccount}
          />
        </>
      )}
    </section>
  );
}

export function KyndrylV4Home({
  accounts,
  locale = "en-US",
  onStartDiscovery,
  onOpenAccount,
  onOpenStrategy,
  className,
}: KyndrylV4HomeProps) {
  const copy = COPY[locale];
  const [selectedCapabilityKey, setSelectedCapabilityKey] =
    useState<CdiCapabilityKey | null>(null);
  const selectedCapability =
    CDI_CAPABILITIES.find(
      (capability) => capability.key === selectedCapabilityKey,
    ) || null;
  const coverage = useMemo(
    () =>
      new Map(
        CDI_CAPABILITIES.map((capability) => [
          capability.key,
          summarizeKyndrylV4CapabilityCoverage(accounts, capability.key),
        ]),
      ),
    [accounts],
  );

  return (
    <div className={[styles.workspace, className].filter(Boolean).join(" ")}>
      <header className={styles.homeIntro}>
        <span>{copy.eyebrow}</span>
        <h1 id="v4-home-title">{copy.homeTitle}</h1>
        <p>{copy.homeDescription}</p>
      </header>
      <PortfolioOpportunityHeatmap
        accounts={accounts}
        locale={locale}
        onStartDiscovery={onStartDiscovery}
        onOpenAccount={onOpenAccount}
        onOpenStrategy={onOpenStrategy}
      />
      <CapabilityExplorer
        accounts={accounts}
        locale={locale}
        coverage={coverage}
        onActivate={setSelectedCapabilityKey}
      />
      <AccountCapabilitySelector
        capability={selectedCapability}
        accounts={accounts}
        locale={locale}
        onClose={() => setSelectedCapabilityKey(null)}
        onStartDiscovery={onStartDiscovery}
        onOpenAccount={onOpenAccount}
      />
    </div>
  );
}

export function KyndrylV4Accounts({
  accounts,
  locale = "en-US",
  onOpenAccount,
  onCreateAccount,
  className,
}: KyndrylV4AccountsProps) {
  const copy = COPY[locale];
  const controlId = useId().replaceAll(":", "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("all");
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return accounts
      .filter((account) => {
        const coverage = calculateKyndrylV4AccountCoverage(account);
        const hasInProgress = CDI_CAPABILITIES.some(
          (capability) =>
            getKyndrylV4EffectiveStatus(
              getKyndrylV4CapabilitySignal(account, capability.key),
            ) === "in_progress",
        );
        const matchesQuery =
          !normalizedQuery ||
          [account.name, account.industry, account.owner].some((value) =>
            value?.toLocaleLowerCase(locale).includes(normalizedQuery),
          );
        const matchesFilter =
          filter === "all" ||
          (filter === "needs_discovery" && coverage < 100) ||
          (filter === "in_progress" && hasInProgress) ||
          (filter === "reviewed" && coverage === 100);
        return matchesQuery && matchesFilter;
      })
      .sort((left, right) => left.name.localeCompare(right.name, locale));
  }, [accounts, filter, locale, query]);
  const accountById = useMemo(
    () => new Map(filtered.map((account) => [account.id, account])),
    [filtered],
  );
  const headers = [
    { key: "name", header: copy.account },
    { key: "industry", header: copy.industry },
    { key: "owner", header: copy.owner },
    { key: "coverage", header: copy.coverage },
    { key: "leadingCapability", header: copy.leadingCapability },
    { key: "lastActivity", header: copy.lastActivity },
    { key: "nextStep", header: copy.nextStep },
    { key: "action", header: "" },
  ];
  const rows = filtered.map((account) => ({
    id: account.id,
    name: account.name,
    industry: account.industry || copy.unavailable,
    owner: account.owner || copy.unavailable,
    coverage: `${calculateKyndrylV4AccountCoverage(account)}%`,
    leadingCapability:
      (leadingCapability(account) &&
        localizeCdi(leadingCapability(account)!.label, locale)) ||
      copy.notAssessed,
    lastActivity:
      formatDate(account.lastActivityAt, locale) || copy.unavailable,
    nextStep: account.nextStep || copy.unavailable,
    action: copy.open,
  }));

  return (
    <section
      className={[styles.accountsSurface, className].filter(Boolean).join(" ")}
      aria-labelledby="v4-accounts-title"
    >
      <header className={styles.sectionHeader}>
        <div>
          <span>{copy.accountListEyebrow}</span>
          <h1 id="v4-accounts-title">{copy.accountListTitle}</h1>
          <p>{copy.accountListDescription}</p>
        </div>
        <div className={styles.sectionActions}>
          <Tag type="cyan">{accounts.length}</Tag>
          {onCreateAccount && (
            <Button renderIcon={Add} onClick={onCreateAccount}>
              {copy.createAccount}
            </Button>
          )}
        </div>
      </header>
      <div className={styles.accountFilters}>
        <Search
          id={`${controlId}-account-search`}
          size="lg"
          labelText={copy.search}
          placeholder={copy.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          id={`${controlId}-account-filter`}
          size="sm"
          labelText={copy.filter}
          value={filter}
          onChange={(event) => setFilter(event.target.value as AccountFilter)}
        >
          <SelectItem value="all" text={copy.all} />
          <SelectItem value="needs_discovery" text={copy.needsDiscovery} />
          <SelectItem value="in_progress" text={copy.inProgress} />
          <SelectItem value="reviewed" text={copy.reviewedAccounts} />
        </Select>
      </div>
      <DataTable rows={rows} headers={headers} isSortable>
        {({ rows: tableRows, headers: tableHeaders, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer className={styles.accountTableRegion}>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header) => {
                    const { key, ...headerProps } = getHeaderProps({ header });
                    return (
                      <TableHeader key={key} {...headerProps}>
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => {
                  const account = accountById.get(row.id)!;
                  const coverage = calculateKyndrylV4AccountCoverage(account);
                  const rowProps = getRowProps({ row });
                  return (
                    <TableRow {...rowProps} key={row.id}>
                      {row.cells.map((cell) => {
                        const headerKey = cell.info.header;
                        if (headerKey === "name") {
                          return (
                            <TableCell key={cell.id}>
                              <button
                                type="button"
                                className={styles.accountNameButton}
                                onClick={() => onOpenAccount(account.id)}
                              >
                                {account.name}
                              </button>
                            </TableCell>
                          );
                        }
                        if (headerKey === "coverage") {
                          return (
                            <TableCell key={cell.id}>
                              <div className={styles.tableCoverage}>
                                <span>{coverage}%</span>
                                <ProgressBar
                                  label={copy.coverage}
                                  hideLabel
                                  value={coverage}
                                />
                              </div>
                            </TableCell>
                          );
                        }
                        if (headerKey === "action") {
                          return (
                            <TableCell key={cell.id}>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={ArrowRight}
                                onClick={() => onOpenAccount(account.id)}
                              >
                                {copy.open}
                              </Button>
                            </TableCell>
                          );
                        }
                        return <TableCell key={cell.id}>{cell.value}</TableCell>;
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {filtered.length === 0 && (
        <div className={styles.emptyState}>{copy.noAccounts}</div>
      )}
      <footer className={styles.tableFooter} aria-live="polite">
        {filtered.length} {copy.results}
      </footer>
    </section>
  );
}

export { CDI_CAPABILITY_CATALOG_VERSION as KYNDYRL_V4_CATALOG_VERSION };
