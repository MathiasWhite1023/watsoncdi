"use client";

import { BubbleChart, GroupedBarChart, LineChart } from "@carbon/charts-react";
import type {
  BarChartOptions,
  BubbleChartOptions,
  ChartTabularData,
  LineChartOptions,
} from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";
import { useI18n } from "./I18nProvider";
import type { Locale, Messages } from "@/lib/i18n";
import { localizeSystemValue } from "@/lib/i18n";

type PortfolioAccount = {
  id: string;
  customerName: string;
  progress: number;
  priority: "Alta" | "Média" | "Baixa" | "High" | "Medium" | "Low";
  scores: Array<{ alignment: number; value: number; confidence: number }>;
};

type Stakeholder = {
  discoveryId: string;
  role: string;
  influence: string;
  source: string;
};
type Snapshot = {
  discoveryId: string;
  createdAt: string;
  snapshot: {
    hypothesisConfidence?: Array<{ key: string; confidence: number }>;
  };
};

function carbonLocale(locale: Locale, d: Messages) {
  return {
    code: locale,
    number: (value: number, language: string) =>
      new Intl.NumberFormat(language).format(value),
    date: (
      value: Date,
      language: string,
      options: Intl.DateTimeFormatOptions,
    ) => new Intl.DateTimeFormat(language, options).format(value),
    time: (
      value: Date,
      language: string,
      options: Intl.DateTimeFormatOptions,
    ) => new Intl.DateTimeFormat(language, options).format(value),
    translations: {
      group: d.charts.group,
      total: d.charts.total,
      tabularRep: {
        title: d.charts.tableTitle,
        downloadAsCSV: d.charts.downloadCsv,
      },
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

export function PortfolioBubbleChart({
  accounts,
}: {
  accounts: PortfolioAccount[];
}) {
  const { locale, dictionary: d } = useI18n();
  const data: ChartTabularData = accounts.map((account) => ({
    group: localizeSystemValue(locale, account.priority),
    account: account.customerName,
    maturity: account.progress,
    potential: account.scores[0]?.alignment || 0,
    impact: account.scores[0]?.value || 30,
  }));
  const high = d.systemValues.high;
  const medium = d.systemValues.medium;
  const low = d.systemValues.low;
  const presentGroups = new Set(data.map((item) => String(item.group)));
  const priorityColors = Object.fromEntries(
    [
      [high, "#da1e28"],
      [medium, "#f1c21b"],
      [low, "#198038"],
    ].filter(([group]) => presentGroups.has(group)),
  );
  const options: BubbleChartOptions = {
    title: d.charts.potentialMaturity,
    resizable: true,
    height: "430px",
    locale: carbonLocale(locale, d),
    axes: {
      bottom: {
        mapsTo: "maturity",
        scaleType: ScaleTypes.LINEAR,
        title: d.charts.preCrmMaturity,
        domain: [0, 100],
      },
      left: {
        mapsTo: "potential",
        scaleType: ScaleTypes.LINEAR,
        title: d.charts.fitPotential,
        domain: [0, 100],
      },
    },
    bubble: {
      radiusMapsTo: "impact",
      radiusLabel: d.charts.impact,
      radiusRange: () => [12, 34],
    },
    color: { scale: priorityColors },
    legend: { alignment: "center" },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: d.charts.bubbleAria },
  };
  return <BubbleChart data={data} options={options} />;
}

export function StakeholderCoverageChart({
  accounts,
  stakeholders,
}: {
  accounts: PortfolioAccount[];
  stakeholders: Stakeholder[];
}) {
  const { locale, dictionary: d } = useI18n();
  const data: ChartTabularData = accounts.flatMap((account) => {
    const people = stakeholders.filter(
      (person) => person.discoveryId === account.id,
    );
    const executives = people.filter(
      (person) =>
        /chief|ceo|cio|cto|cfo|ciso|diretor|vp/i.test(person.role) &&
        person.source === "manual",
    ).length;
    const influential = people.filter(
      (person) =>
        /^(alta|high)$/i.test(person.influence) && person.source === "manual",
    ).length;
    return [
      {
        group: d.charts.confirmedExecutives,
        key: account.customerName,
        value: executives,
      },
      {
        group: d.charts.highInfluence,
        key: account.customerName,
        value: influential,
      },
      {
        group: d.charts.totalMapped,
        key: account.customerName,
        value: people.length,
      },
    ];
  });
  const options: BarChartOptions = {
    title: d.charts.stakeholderCoverage,
    resizable: true,
    height: "390px",
    locale: carbonLocale(locale, d),
    axes: {
      left: {
        mapsTo: "value",
        scaleType: ScaleTypes.LINEAR,
        title: d.charts.people,
      },
      bottom: {
        mapsTo: "key",
        scaleType: ScaleTypes.LABELS,
        title: d.charts.account,
        truncation: { type: "end_line", threshold: 18 },
      },
    },
    color: {
      scale: {
        [d.charts.confirmedExecutives]: "#0f62fe",
        [d.charts.highInfluence]: "#009d9a",
        [d.charts.totalMapped]: "#8a3ffc",
      },
    },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: d.charts.stakeholderAria },
  };
  return <GroupedBarChart data={data} options={options} />;
}

export function HypothesisConfidenceChart({
  accounts,
  snapshots,
}: {
  accounts: PortfolioAccount[];
  snapshots: Snapshot[];
}) {
  const { locale, dictionary: d } = useI18n();
  const names = new Map(
    accounts.map((account) => [account.id, account.customerName]),
  );
  const data: ChartTabularData = snapshots.flatMap((snapshot) => {
    const confidence = snapshot.snapshot.hypothesisConfidence?.[0]?.confidence;
    return confidence == null
      ? []
      : [
          {
            group: names.get(snapshot.discoveryId) || snapshot.discoveryId,
            date: new Date(snapshot.createdAt),
            confidence,
          },
        ];
  });
  const fallback = accounts.map((account) => ({
    group: account.customerName,
    date: new Date(),
    confidence: account.scores[0]?.confidence || 0,
  }));
  const options: LineChartOptions = {
    title: d.charts.confidenceEvolution,
    resizable: true,
    height: "390px",
    locale: carbonLocale(locale, d),
    axes: {
      bottom: {
        mapsTo: "date",
        scaleType: ScaleTypes.TIME,
        title: d.charts.analyses,
      },
      left: {
        mapsTo: "confidence",
        scaleType: ScaleTypes.LINEAR,
        title: d.charts.confidence,
        domain: [0, 100],
      },
    },
    points: { enabled: true, radius: 4 },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: d.charts.confidenceAria },
  };
  return <LineChart data={data.length ? data : fallback} options={options} />;
}
