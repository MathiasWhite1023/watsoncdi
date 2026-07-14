"use client";

import { BubbleChart, GroupedBarChart, LineChart } from "@carbon/charts-react";
import type { BarChartOptions, BubbleChartOptions, ChartTabularData, LineChartOptions } from "@carbon/charts-react";
import { ScaleTypes } from "@carbon/charts";

type PortfolioAccount = {
  id: string;
  customerName: string;
  progress: number;
  priority: "Alta" | "Média" | "Baixa";
  scores: Array<{ alignment: number; value: number; confidence: number }>;
};

type Stakeholder = { discoveryId: string; role: string; influence: string; source: string };
type Snapshot = { discoveryId: string; createdAt: string; snapshot: { hypothesisConfidence?: Array<{ key: string; confidence: number }> } };

export function PortfolioBubbleChart({ accounts }: { accounts: PortfolioAccount[] }) {
  const data: ChartTabularData = accounts.map((account) => ({
    group: account.priority,
    account: account.customerName,
    maturity: account.progress,
    potential: account.scores[0]?.alignment || 0,
    impact: account.scores[0]?.value || 30,
  }));
  const options: BubbleChartOptions = {
    title: "Potencial × maturidade",
    resizable: true,
    height: "430px",
    axes: {
      bottom: { mapsTo: "maturity", scaleType: ScaleTypes.LINEAR, title: "Maturidade pré-CRM", domain: [0, 100] },
      left: { mapsTo: "potential", scaleType: ScaleTypes.LINEAR, title: "Potencial de aderência", domain: [0, 100] },
    },
    bubble: { radiusMapsTo: "impact", radiusLabel: "Impacto", radiusRange: () => [12, 34] },
    color: { scale: { Alta: "#da1e28", Média: "#f1c21b", Baixa: "#198038" } },
    legend: { alignment: "center" },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: "Gráfico de bolhas comparando potencial e maturidade das contas" },
  };
  return <BubbleChart data={data} options={options} />;
}

export function StakeholderCoverageChart({ accounts, stakeholders }: { accounts: PortfolioAccount[]; stakeholders: Stakeholder[] }) {
  const data: ChartTabularData = accounts.flatMap((account) => {
    const people = stakeholders.filter((person) => person.discoveryId === account.id);
    const executives = people.filter((person) => /chief|ceo|cio|cto|cfo|ciso|diretor|vp/i.test(person.role) && person.source === "manual").length;
    const influential = people.filter((person) => person.influence === "Alta" && person.source === "manual").length;
    return [
      { group: "Executivos confirmados", key: account.customerName, value: executives },
      { group: "Alta influência", key: account.customerName, value: influential },
      { group: "Total mapeado", key: account.customerName, value: people.length },
    ];
  });
  const options: BarChartOptions = {
    title: "Cobertura de stakeholders",
    resizable: true,
    height: "390px",
    axes: {
      left: { mapsTo: "value", scaleType: ScaleTypes.LINEAR, title: "Pessoas" },
      bottom: { mapsTo: "key", scaleType: ScaleTypes.LABELS, title: "Conta", truncation: { type: "end_line", threshold: 18 } },
    },
    color: { scale: { "Executivos confirmados": "#0f62fe", "Alta influência": "#009d9a", "Total mapeado": "#8a3ffc" } },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: "Cobertura de stakeholders por conta" },
  };
  return <GroupedBarChart data={data} options={options} />;
}

export function HypothesisConfidenceChart({ accounts, snapshots }: { accounts: PortfolioAccount[]; snapshots: Snapshot[] }) {
  const names = new Map(accounts.map((account) => [account.id, account.customerName]));
  const data: ChartTabularData = snapshots.flatMap((snapshot) => {
    const confidence = snapshot.snapshot.hypothesisConfidence?.[0]?.confidence;
    return confidence == null ? [] : [{ group: names.get(snapshot.discoveryId) || snapshot.discoveryId, date: new Date(snapshot.createdAt), confidence }];
  });
  const fallback = accounts.map((account) => ({ group: account.customerName, date: new Date(), confidence: account.scores[0]?.confidence || 0 }));
  const options: LineChartOptions = {
    title: "Evolução da confiança",
    resizable: true,
    height: "390px",
    axes: {
      bottom: { mapsTo: "date", scaleType: ScaleTypes.TIME, title: "Análises" },
      left: { mapsTo: "confidence", scaleType: ScaleTypes.LINEAR, title: "Confiança", domain: [0, 100] },
    },
    points: { enabled: true, radius: 4 },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: "Evolução histórica da confiança das hipóteses" },
  };
  return <LineChart data={data.length ? data : fallback} options={options} />;
}
