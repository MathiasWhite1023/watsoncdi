"use client";

import { DonutChart, GroupedBarChart } from "@carbon/charts-react";
import type { ChartTabularData, DonutChartOptions, BarChartOptions } from "@carbon/charts-react";

type Score = {
  name: string;
  short: string;
  alignment: number;
  value: number;
  readiness: number;
  confidence: number;
};

type DiscoverySummary = { priority: "Alta" | "Média" | "Baixa"; progress: number };

export function CarbonPortfolioCharts({ discoveries }: { discoveries: DiscoverySummary[] }) {
  const priorityData: ChartTabularData = [
    { group: "Alta", value: discoveries.filter((item) => item.priority === "Alta").length },
    { group: "Média", value: discoveries.filter((item) => item.priority === "Média").length },
    { group: "Baixa", value: discoveries.filter((item) => item.priority === "Baixa").length },
  ];

  const options: DonutChartOptions = {
    title: "Prioridade das descobertas",
    resizable: true,
    height: "290px",
    donut: {
      center: {
        label: "descobertas",
        number: discoveries.length,
      },
      alignment: "center",
    },
    legend: { alignment: "center" },
    color: { scale: { Alta: "#da1e28", Média: "#f1c21b", Baixa: "#24a148" } },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: "Distribuição das descobertas por prioridade" },
  };

  return <DonutChart data={priorityData} options={options} />;
}

export function CarbonCapabilityChart({ scores }: { scores: Score[] }) {
  const data: ChartTabularData = scores.slice(0, 6).flatMap((score) => [
    { group: "Alinhamento", key: score.short, value: score.alignment },
    { group: "Valor", key: score.short, value: score.value },
    { group: "Prontidão", key: score.short, value: score.readiness },
  ]);

  const options: BarChartOptions = {
    title: "Comparativo de capacidades",
    resizable: true,
    height: "380px",
    axes: {
      left: { mapsTo: "value", scaleType: "linear", title: "Score", domain: [0, 100] },
      bottom: { mapsTo: "key", scaleType: "labels", title: "Capacidade", truncation: { type: "end_line", threshold: 14 } },
    },
    color: { scale: { Alinhamento: "#0f62fe", Valor: "#009d9a", Prontidão: "#8a3ffc" } },
    legend: { alignment: "center" },
    toolbar: { enabled: true },
    accessibility: { svgAriaLabel: "Comparativo de alinhamento, valor e prontidão por capacidade" },
  };

  return <GroupedBarChart data={data} options={options} />;
}
