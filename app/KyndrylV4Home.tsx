"use client";

import { useId, useMemo, useState } from "react";
import {
  Button,
  ClickableTile,
  ComposedModal,
  DataTable,
  ModalBody,
  ModalHeader,
  ProgressBar,
  Search,
  Select,
  SelectItem,
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
};

export type KyndrylV4HomeProps = {
  accounts: KyndrylV4Account[];
  locale?: Locale;
  onStartDiscovery: (
    accountId: string,
    capabilityKey: CdiCapabilityKey,
  ) => void;
  onOpenAccount?: (accountId: string) => void;
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
    eyebrow: "Capability discovery",
    homeTitle: "Start with the capability that matters",
    homeDescription:
      "Select a capability, choose an account, and continue directly into its evidence-led discovery.",
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
    portfolioTitle: "Technology fit across all accounts",
    portfolioDescription:
      "Compare the 14 capabilities. Unassessed accounts remain explicitly not started and never receive an artificial score.",
    heatmapLabel: "Account capability heatmap",
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
    eyebrow: "Descoberta por capability",
    homeTitle: "Comece pela capability que importa",
    homeDescription:
      "Selecione uma capability, escolha uma conta e siga diretamente para a descoberta orientada por evidências.",
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
    portfolioTitle: "Technology fit em todas as contas",
    portfolioDescription:
      "Compare as 14 capabilities. Contas não avaliadas continuam explicitamente não iniciadas e nunca recebem score artificial.",
    heatmapLabel: "Heatmap de capabilities por conta",
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

function CapabilityCard({
  capability,
  coverage,
  locale,
  onActivate,
}: {
  capability: CdiCapability;
  coverage: KyndrylV4CapabilityCoverage;
  locale: Locale;
  onActivate: () => void;
}) {
  const copy = COPY[locale];
  const label = localizeCdi(capability.label, locale);
  return (
    <ClickableTile
      href={`#capability-${capability.key}`}
      className={styles.capabilityCard}
      onClick={(event) => {
        event.preventDefault();
        onActivate();
      }}
      aria-label={`${label}: ${coverage.percent}% ${copy.accountsReviewed}`}
    >
      <div className={styles.cardHeading}>
        <span>{capability.code.replaceAll("_", " ")}</span>
        <strong>{coverage.percent}%</strong>
      </div>
      <h3>{label}</h3>
      <p>{localizeCdi(capability.description, locale)}</p>
      <ProgressBar
        label={`${coverage.reviewed}/${coverage.total} ${copy.reviewed}`}
        hideLabel
        value={coverage.percent}
      />
      <div className={styles.coverageLine}>
        <strong>
          {coverage.reviewed}/{coverage.total}
        </strong>
        <span>{copy.accountsReviewed}</span>
      </div>
      <dl className={styles.cardStatuses}>
        <div>
          <dt>{copy.inProgress}</dt>
          <dd>{coverage.inProgress}</dd>
        </div>
        <div>
          <dt>{copy.gaps}</dt>
          <dd>{coverage.reviewedWithGaps}</dd>
        </div>
        <div>
          <dt>{copy.notRelevant}</dt>
          <dd>{coverage.notRelevant}</dd>
        </div>
      </dl>
      {coverage.needsReview > 0 && (
        <div className={styles.needsReview}>
          <Renew size={16} aria-hidden="true" />
          {coverage.needsReview} {copy.needsReview.toLocaleLowerCase(locale)}
        </div>
      )}
      <span className={styles.cardAction} aria-hidden="true">
        {copy.chooseAccount} <ArrowRight size={16} />
      </span>
    </ClickableTile>
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
    <section className={styles.heatmapSurface} aria-labelledby="v4-heatmap-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>{copy.portfolioEyebrow}</span>
          <h2 id="v4-heatmap-title">{copy.portfolioTitle}</h2>
          <p>{copy.portfolioDescription}</p>
        </div>
        <Tag type="cyan">{accounts.length}</Tag>
      </header>
      <div className={styles.heatmapLegend} aria-label={copy.legend}>
        <span data-status="not_started">{copy.notStarted}</span>
        <span data-status="in_progress">{copy.inProgress}</span>
        <span data-status="reviewed_gaps">{copy.gaps}</span>
        <span data-status="reviewed_sufficient">{copy.sufficient}</span>
        <span data-status="not_relevant">{copy.notRelevant}</span>
        <span data-status="needs_review">{copy.needsReview}</span>
      </div>
      <div
        className={styles.heatmapRegion}
        role="region"
        aria-label={copy.heatmapLabel}
        tabIndex={0}
      >
        <table className={styles.heatmapTable}>
          <caption className={styles.visuallyHidden}>{copy.heatmapLabel}</caption>
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
                        title={accessibleValue}
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
                          <strong>{fit}</strong>
                        )}
                        {confidence != null && (
                          <small>
                            {copy.confidenceShort} {confidence}
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
    </section>
  );
}

export function KyndrylV4Home({
  accounts,
  locale = "en-US",
  onStartDiscovery,
  onOpenAccount,
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
      <section className={styles.capabilitySurface} aria-labelledby="v4-home-title">
        <header className={styles.hero}>
          <span>{copy.eyebrow}</span>
          <h1 id="v4-home-title">{copy.homeTitle}</h1>
          <p>{copy.homeDescription}</p>
        </header>
        <div className={styles.capabilityGrid}>
          {CDI_CAPABILITIES.map((capability) => (
            <CapabilityCard
              key={capability.key}
              capability={capability}
              coverage={coverage.get(capability.key)!}
              locale={locale}
              onActivate={() => setSelectedCapabilityKey(capability.key)}
            />
          ))}
        </div>
      </section>
      <PortfolioCapabilityHeatmap
        accounts={accounts}
        locale={locale}
        onStartDiscovery={onStartDiscovery}
        onOpenAccount={onOpenAccount}
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
