"use client";

import {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  ReactFlowInstance,
  Handle,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./CustomerContextMap.module.css";

export type CustomerContextLocale = "en-US" | "pt-BR";

export type CustomerContextNodeType =
  | "objective"
  | "initiative"
  | "pain"
  | "system"
  | "risk"
  | "capability"
  | "person"
  | "area";

export type CustomerContextEvidence = {
  id?: string;
  sourceId?: string;
  sourceType?: string;
  title: string;
  excerpt?: string;
  confidence?: number;
  occurredAt?: string;
  updatedAt?: string;
  href?: string;
};

export type CustomerContextMapNode = {
  id: string;
  type: CustomerContextNodeType | string;
  label: string;
  detail?: string;
  strength?: number;
  evidence?: CustomerContextEvidence[];
  sourceCount?: number;
  updatedAt?: string;
};

export type CustomerContextMapEdge = {
  id?: string;
  source: string;
  target: string;
  label?: string;
  evidence?: CustomerContextEvidence[];
  confirmed?: boolean;
};

export type CustomerContextAccountMap = {
  nodes?: CustomerContextMapNode[];
  edges?: CustomerContextMapEdge[];
  updatedAt?: string;
} | null;

export type CustomerContextStakeholder = {
  id: string;
  name: string;
  role: string;
  area?: string;
  reportsToId?: string | null;
  influence?: string;
  stance?: string;
  priorities?: string[];
  notes?: string;
  evidence?: CustomerContextEvidence[];
  isSponsor?: boolean;
  updatedAt?: string;
};

export type CustomerContextEvidenceActivation = {
  node: CustomerContextMapNode;
  edge?: CustomerContextMapEdge;
};

export type CustomerContextMapProps = {
  locale?: CustomerContextLocale;
  accountMap?: CustomerContextAccountMap;
  stakeholders?: CustomerContextStakeholder[];
  className?: string;
  loading?: boolean;
  onEvidenceActivate?: (
    evidence: CustomerContextEvidence,
    context: CustomerContextEvidenceActivation,
  ) => void;
  onNodeSelect?: (node: CustomerContextMapNode | null) => void;
};

type Copy = {
  title: string;
  description: string;
  filters: string;
  all: string;
  fit: string;
  resetFilters: string;
  legend: string;
  selected: string;
  close: string;
  strength: string;
  confidence: string;
  sources: string;
  source: string;
  connections: string;
  noSources: string;
  noDetails: string;
  updated: string;
  notAvailable: string;
  inferredNotice: string;
  emptyTitle: string;
  emptyBody: string;
  canvasLabel: string;
  filterOn: string;
  filterOff: string;
  relationEvidence: string;
  connectedTo: string;
  nodeSelected: string;
  context: string;
  types: Record<CustomerContextNodeType, string>;
};

const COPY: Record<CustomerContextLocale, Copy> = {
  "en-US": {
    title: "Customer context map",
    description:
      "Explore how goals, initiatives, people, systems, pains, risks, and IBM capabilities connect.",
    filters: "Filter node types",
    all: "All",
    fit: "Fit view",
    resetFilters: "Show all types",
    legend: "Legend",
    selected: "Selected context",
    close: "Close details",
    strength: "Signal strength",
    confidence: "confidence",
    sources: "Sources",
    source: "source",
    connections: "Connections",
    noSources: "No source is linked to this item yet.",
    noDetails: "No additional context has been recorded.",
    updated: "Last updated",
    notAvailable: "Not available",
    inferredNotice:
      "This initial view uses only mapped stakeholder fields. Add account evidence to expand the context map.",
    emptyTitle: "Build the customer context",
    emptyBody:
      "Add a stakeholder, meeting, discovery answer, or account evidence to create the first verified connections.",
    canvasLabel: "Interactive customer context map",
    filterOn: "shown",
    filterOff: "hidden",
    relationEvidence: "Relationship evidence",
    connectedTo: "connected to",
    nodeSelected: "selected",
    context: "Recorded context",
    types: {
      objective: "Objectives",
      initiative: "Initiatives",
      pain: "Pains",
      system: "Systems",
      risk: "Risks",
      capability: "IBM capabilities",
      person: "People",
      area: "Areas",
    },
  },
  "pt-BR": {
    title: "Mapa de contexto do cliente",
    description:
      "Explore como objetivos, iniciativas, pessoas, sistemas, dores, riscos e capacidades IBM se conectam.",
    filters: "Filtrar tipos de nó",
    all: "Todos",
    fit: "Ajustar visualização",
    resetFilters: "Mostrar todos os tipos",
    legend: "Legenda",
    selected: "Contexto selecionado",
    close: "Fechar detalhes",
    strength: "Força do sinal",
    confidence: "confiança",
    sources: "Fontes",
    source: "fonte",
    connections: "Conexões",
    noSources: "Nenhuma fonte está vinculada a este item.",
    noDetails: "Nenhum contexto adicional foi registrado.",
    updated: "Última atualização",
    notAvailable: "Não disponível",
    inferredNotice:
      "Esta visão inicial usa somente os campos dos stakeholders mapeados. Adicione evidências da conta para expandir o mapa.",
    emptyTitle: "Construa o contexto do cliente",
    emptyBody:
      "Adicione um stakeholder, reunião, resposta de descoberta ou evidência da conta para criar as primeiras conexões verificadas.",
    canvasLabel: "Mapa interativo de contexto do cliente",
    filterOn: "visível",
    filterOff: "oculto",
    relationEvidence: "Evidências da relação",
    connectedTo: "conectado a",
    nodeSelected: "selecionado",
    context: "Contexto registrado",
    types: {
      objective: "Objetivos",
      initiative: "Iniciativas",
      pain: "Dores",
      system: "Sistemas",
      risk: "Riscos",
      capability: "Capacidades IBM",
      person: "Pessoas",
      area: "Áreas",
    },
  },
};

const NODE_TYPES: CustomerContextNodeType[] = [
  "objective",
  "initiative",
  "pain",
  "system",
  "risk",
  "capability",
  "person",
  "area",
];

const TYPE_COLORS: Record<CustomerContextNodeType, string> = {
  objective: "#6929c4",
  initiative: "#1192e8",
  pain: "#da1e28",
  system: "#005d5d",
  risk: "#f1c21b",
  capability: "#0f62fe",
  person: "#198038",
  area: "#8a3ffc",
};

const TYPE_ALIASES: Record<string, CustomerContextNodeType> = {
  objective: "objective",
  objetivo: "objective",
  goal: "objective",
  initiative: "initiative",
  iniciativa: "initiative",
  pain: "pain",
  dor: "pain",
  painpoint: "pain",
  system: "system",
  sistema: "system",
  platform: "system",
  plataforma: "system",
  risk: "risk",
  risco: "risk",
  capability: "capability",
  capacidade: "capability",
  person: "person",
  pessoa: "person",
  stakeholder: "person",
  area: "area",
  department: "area",
  departamento: "area",
};

type ContextNodeData = {
  source: CustomerContextMapNode;
  stakeholder?: CustomerContextStakeholder;
  type: CustomerContextNodeType;
  typeLabel: string;
  detailLabel: string;
  selected: boolean;
  evidenceCount: number;
  selectedLabel: string;
  onSelect: (id: string) => void;
} & Record<string, unknown>;

type ContextFlowNode = Node<ContextNodeData, "context">;

type NormalizedGraph = {
  nodes: Array<
    CustomerContextMapNode & {
      type: CustomerContextNodeType;
      stakeholder?: CustomerContextStakeholder;
    }
  >;
  edges: CustomerContextMapEdge[];
  stakeholderOnly: boolean;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeType(type: string): CustomerContextNodeType {
  const key = normalizeText(type).replace(/[\s_-]+/g, "");
  return TYPE_ALIASES[key] || "area";
}

function safeIdPart(value: string) {
  return (
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

function clampPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueEvidence(items: CustomerContextEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key =
      item.id ||
      item.sourceId ||
      `${normalizeText(item.title)}:${normalizeText(item.excerpt || "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGraph(
  accountMap: CustomerContextAccountMap | undefined,
  stakeholders: CustomerContextStakeholder[],
): NormalizedGraph {
  const sourceNodes = accountMap?.nodes || [];
  const nodes: NormalizedGraph["nodes"] = [];
  const nodeIds = new Set<string>();

  sourceNodes.forEach((node) => {
    if (!node.id || nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push({ ...node, type: normalizeType(node.type) });
  });

  const stakeholderNodeById = new Map<string, string>();
  stakeholders.forEach((stakeholder) => {
    const existing = nodes.find(
      (node) =>
        node.type === "person" &&
        (node.id === stakeholder.id ||
          normalizeText(node.label) === normalizeText(stakeholder.name)),
    );
    if (existing) {
      stakeholderNodeById.set(stakeholder.id, existing.id);
      existing.stakeholder = stakeholder;
      existing.detail =
        existing.detail ||
        [stakeholder.role, stakeholder.area].filter(Boolean).join(" · ");
      existing.updatedAt = existing.updatedAt || stakeholder.updatedAt;
      existing.evidence = uniqueEvidence([
        ...(existing.evidence || []),
        ...(stakeholder.evidence || []),
      ]);
      return;
    }

    const baseId = `person:${stakeholder.id || safeIdPart(stakeholder.name)}`;
    let id = baseId;
    let sequence = 2;
    while (nodeIds.has(id)) {
      id = `${baseId}:${sequence}`;
      sequence += 1;
    }
    nodeIds.add(id);
    stakeholderNodeById.set(stakeholder.id, id);
    nodes.push({
      id,
      type: "person",
      label: stakeholder.name,
      detail: [stakeholder.role, stakeholder.area].filter(Boolean).join(" · "),
      strength: /^(alta|high)$/i.test(stakeholder.influence || "")
        ? 85
        : /^(m[eé]dia|medium)$/i.test(stakeholder.influence || "")
          ? 60
          : undefined,
      evidence: stakeholder.evidence || [],
      updatedAt: stakeholder.updatedAt,
      stakeholder,
    });
  });

  const areaNodeByName = new Map<string, string>();
  nodes
    .filter((node) => node.type === "area")
    .forEach((node) => areaNodeByName.set(normalizeText(node.label), node.id));

  stakeholders.forEach((stakeholder) => {
    if (!stakeholder.area?.trim()) return;
    const key = normalizeText(stakeholder.area);
    if (areaNodeByName.has(key)) return;
    const baseId = `area:${safeIdPart(stakeholder.area)}`;
    let id = baseId;
    let sequence = 2;
    while (nodeIds.has(id)) {
      id = `${baseId}:${sequence}`;
      sequence += 1;
    }
    nodeIds.add(id);
    areaNodeByName.set(key, id);
    nodes.push({
      id,
      type: "area",
      label: stakeholder.area,
      detail: "",
    });
  });

  const edges: CustomerContextMapEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (edge: CustomerContextMapEdge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    const key = `${edge.source}:${edge.target}:${normalizeText(edge.label || "")}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(edge);
  };

  (accountMap?.edges || []).forEach(addEdge);

  stakeholders.forEach((stakeholder) => {
    const personId = stakeholderNodeById.get(stakeholder.id);
    if (!personId) return;
    if (stakeholder.area?.trim()) {
      const areaId = areaNodeByName.get(normalizeText(stakeholder.area));
      if (areaId) {
        addEdge({
          id: `area-membership:${personId}:${areaId}`,
          source: personId,
          target: areaId,
          label: "belongs to",
          confirmed: true,
        });
      }
    }
    if (stakeholder.reportsToId) {
      const managerId = stakeholderNodeById.get(stakeholder.reportsToId);
      if (managerId) {
        addEdge({
          id: `reports-to:${personId}:${managerId}`,
          source: personId,
          target: managerId,
          label: "reports to",
          confirmed: true,
        });
      }
    }
  });

  return {
    nodes,
    edges,
    stakeholderOnly: sourceNodes.length === 0 && stakeholders.length > 0,
  };
}

function layoutNodes(
  nodes: NormalizedGraph["nodes"],
  edges: CustomerContextMapEdge[],
) {
  const rank: Record<CustomerContextNodeType, number> = {
    objective: 0,
    initiative: 1,
    area: 2,
    person: 2,
    system: 2,
    pain: 3,
    capability: 4,
    risk: 4,
  };
  const grouped = new Map<number, NormalizedGraph["nodes"]>();
  nodes.forEach((node) => {
    const row = rank[node.type];
    grouped.set(row, [...(grouped.get(row) || []), node]);
  });

  const connected = new Map<string, number>();
  edges.forEach((edge) => {
    connected.set(edge.source, (connected.get(edge.source) || 0) + 1);
    connected.set(edge.target, (connected.get(edge.target) || 0) + 1);
  });

  const positions = new Map<string, { x: number; y: number }>();
  let yCursor = 0;
  [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([, items]) => {
      const ordered = [...items].sort(
        (a, b) =>
          (connected.get(b.id) || 0) - (connected.get(a.id) || 0) ||
          a.label.localeCompare(b.label),
      );
      const columns = Math.min(5, Math.max(1, ordered.length));
      const width = (columns - 1) * 286;
      const visualRows = Math.ceil(ordered.length / columns);
      ordered.forEach((node, index) => {
        const wrappedRow = Math.floor(index / columns);
        const column = index % columns;
        positions.set(node.id, {
          x: column * 286 - width / 2,
          y: yCursor + wrappedRow * 164,
        });
      });
      yCursor += visualRows * 164 + 52;
    });
  return positions;
}

function localizeRelation(
  label: string | undefined,
  locale: CustomerContextLocale,
) {
  if (!label) return locale === "pt-BR" ? "relacionado a" : "related to";
  const key = normalizeText(label).replace(/_/g, " ");
  const relations: Record<string, [string, string]> = {
    impacta: ["impacts", "impacta"],
    "depende de": ["depends on", "depende de"],
    "decisor de": ["decision-maker for", "decisor de"],
    "possivel aderencia": ["potential fit", "possível aderência"],
    "risco associado": ["associated risk", "risco associado"],
    "reports to": ["reports to", "reporta para"],
    "reporta para": ["reports to", "reporta para"],
    "belongs to": ["belongs to", "pertence à área"],
    influencia: ["influences", "influencia"],
    aliado: ["ally of", "aliado de"],
    bloqueia: ["blocks", "bloqueia"],
    decide: ["decides", "decide"],
    "possui iniciativa": ["owns initiative", "possui iniciativa"],
  };
  const pair = relations[key];
  return pair ? pair[locale === "pt-BR" ? 1 : 0] : label;
}

function localizeKnownDetail(
  value: string | undefined,
  locale: CustomerContextLocale,
) {
  if (!value) return "";
  const known: Record<string, [string, string]> = {
    "stakeholder identificado em reuniao": [
      "Stakeholder identified in a meeting",
      "Stakeholder identificado em reunião",
    ],
    "stakeholder identified in a meeting": [
      "Stakeholder identified in a meeting",
      "Stakeholder identificado em reunião",
    ],
    "sistema/plataforma citado": [
      "Mentioned system or platform",
      "Sistema ou plataforma citado",
    ],
    "mentioned system or platform": [
      "Mentioned system or platform",
      "Sistema ou plataforma citado",
    ],
    "dor de negocio ou tecnologia": [
      "Business or technology pain",
      "Dor de negócio ou tecnologia",
    ],
    "business or technology pain": [
      "Business or technology pain",
      "Dor de negócio ou tecnologia",
    ],
    "lacuna para validar antes do crm": [
      "Gap to validate before CRM",
      "Lacuna para validar antes do CRM",
    ],
    "gap to validate before crm": [
      "Gap to validate before CRM",
      "Lacuna para validar antes do CRM",
    ],
  };
  const pair = known[normalizeText(value)];
  return pair ? pair[locale === "pt-BR" ? 1 : 0] : value;
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ContextNode({ data }: NodeProps<ContextFlowNode>) {
  const select = () => data.onSelect(data.source.id);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select();
  };
  const strength = clampPercent(data.source.strength);

  return (
    <div
      className={`${styles.node} ${styles[data.type]} ${data.selected ? styles.nodeSelected : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${data.typeLabel}: ${data.source.label}${data.selected ? `, ${data.selectedLabel}` : ""}`}
      aria-pressed={data.selected}
      onClick={select}
      onKeyDown={onKeyDown}
    >
      <Handle
        className={styles.handle}
        type="target"
        position={Position.Top}
        isConnectable={false}
      />
      <span className={styles.nodeAccent} aria-hidden="true" />
      <div className={styles.nodeHeader}>
        <span className={styles.nodeType}>{data.typeLabel}</span>
        {data.evidenceCount > 0 && (
          <span className={styles.sourceCount}>{data.evidenceCount}</span>
        )}
      </div>
      <div className={styles.nodeBody}>
        {data.type === "person" && (
          <span className={styles.avatar} aria-hidden="true">
            {initials(data.source.label)}
          </span>
        )}
        <div>
          <strong>{data.source.label}</strong>
          {data.detailLabel && <p>{data.detailLabel}</p>}
        </div>
      </div>
      {strength !== null && (
        <div className={styles.strengthBar} aria-hidden="true">
          <span style={{ width: `${strength}%` }} />
        </div>
      )}
      <Handle
        className={styles.handle}
        type="source"
        position={Position.Bottom}
        isConnectable={false}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { context: ContextNode };

function formatDate(value: string | undefined, locale: CustomerContextLocale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CustomerContextMap({
  locale = "en-US",
  accountMap,
  stakeholders = [],
  className = "",
  loading = false,
  onEvidenceActivate,
  onNodeSelect,
}: CustomerContextMapProps) {
  const copy = COPY[locale];
  const graph = useMemo(
    () => buildGraph(accountMap, stakeholders),
    [accountMap, stakeholders],
  );
  const [enabledTypes, setEnabledTypes] = useState<
    Set<CustomerContextNodeType>
  >(() => new Set(NODE_TYPES));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<
    ContextFlowNode,
    Edge
  > | null>(null);
  const positions = useMemo(
    () => layoutNodes(graph.nodes, graph.edges),
    [graph.edges, graph.nodes],
  );

  const selectNode = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      onNodeSelect?.(graph.nodes.find((node) => node.id === id) || null);
    },
    [graph.nodes, onNodeSelect],
  );

  const sourceNodes = useMemo<ContextFlowNode[]>(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        type: "context",
        position: positions.get(node.id) || { x: 0, y: 0 },
        hidden: !enabledTypes.has(node.type),
        draggable: true,
        focusable: true,
        ariaLabel: `${copy.types[node.type]}: ${node.label}`,
        data: {
          source: node,
          stakeholder: node.stakeholder,
          type: node.type,
          typeLabel: copy.types[node.type],
          detailLabel: localizeKnownDetail(node.detail, locale),
          selected: node.id === selectedId,
          evidenceCount:
            node.evidence?.length || Math.max(0, node.sourceCount || 0),
          selectedLabel: copy.nodeSelected,
          onSelect: selectNode,
        },
      })),
    [
      copy.nodeSelected,
      copy.types,
      enabledTypes,
      graph.nodes,
      locale,
      positions,
      selectNode,
      selectedId,
    ],
  );

  const sourceEdges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge, index) => {
        const source = graph.nodes.find((node) => node.id === edge.source);
        const target = graph.nodes.find((node) => node.id === edge.target);
        const hidden =
          !source ||
          !target ||
          !enabledTypes.has(source.type) ||
          !enabledTypes.has(target.type);
        const color = target ? TYPE_COLORS[target.type] : "#8d8d8d";
        return {
          id: edge.id || `${edge.source}:${edge.target}:${index}`,
          source: edge.source,
          target: edge.target,
          hidden,
          type: "smoothstep",
          label: localizeRelation(edge.label, locale),
          ariaLabel: `${source?.label || edge.source} ${localizeRelation(edge.label, locale)} ${target?.label || edge.target}`,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          style: {
            stroke: color,
            strokeWidth: 1.75,
            strokeDasharray: edge.confirmed === false ? "6 5" : undefined,
          },
          labelStyle: { fill: "#393939", fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
          labelBgPadding: [5, 3] as [number, number],
          data: { sourceEdge: edge },
        };
      }),
    [enabledTypes, graph.edges, graph.nodes, locale],
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<ContextFlowNode>(sourceNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(sourceEdges);

  useEffect(() => {
    setNodes((current) =>
      sourceNodes.map((node) => ({
        ...node,
        position:
          current.find((existing) => existing.id === node.id)?.position ||
          node.position,
      })),
    );
  }, [setNodes, sourceNodes]);

  useEffect(() => setEdges(sourceEdges), [setEdges, sourceEdges]);

  useEffect(() => {
    if (!flow || graph.nodes.length === 0) return;
    const timer = window.setTimeout(
      () => flow.fitView({ padding: 0.18, duration: 220, maxZoom: 1.1 }),
      40,
    );
    return () => window.clearTimeout(timer);
  }, [enabledTypes, flow, graph.nodes.length]);

  const selected = graph.nodes.find((node) => node.id === selectedId) || null;
  const selectedConnections = selected
    ? graph.edges
        .filter(
          (edge) => edge.source === selected.id || edge.target === selected.id,
        )
        .map((edge) => ({
          edge,
          other: graph.nodes.find(
            (node) =>
              node.id ===
              (edge.source === selected.id ? edge.target : edge.source),
          ),
        }))
    : [];
  const selectedEvidence = selected?.evidence || [];
  const lastUpdated = formatDate(
    selected?.updatedAt || accountMap?.updatedAt,
    locale,
  );

  const toggleType = (type: CustomerContextNodeType) => {
    if (enabledTypes.has(type) && selected?.type === type) selectNode(null);
    setEnabledTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const showAll = () => setEnabledTypes(new Set(NODE_TYPES));

  if (loading) {
    return (
      <section className={`${styles.shell} ${styles.loading} ${className}`}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonCanvas} aria-label={copy.title}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.shell} ${className}`}
      aria-labelledby="customer-context-map-title"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Watson CDI</p>
          <h2 id="customer-context-map-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <button
          className={styles.fitButton}
          type="button"
          onClick={() =>
            flow?.fitView({ padding: 0.18, duration: 220, maxZoom: 1.1 })
          }
          disabled={!graph.nodes.length}
        >
          {copy.fit}
        </button>
      </header>

      {graph.stakeholderOnly && (
        <div className={styles.notice} role="status">
          <span aria-hidden="true">i</span>
          <p>{copy.inferredNotice}</p>
        </div>
      )}

      <div className={styles.filters} aria-label={copy.filters}>
        <strong>{copy.filters}</strong>
        <button
          type="button"
          className={
            enabledTypes.size === NODE_TYPES.length ? styles.filterActive : ""
          }
          aria-pressed={enabledTypes.size === NODE_TYPES.length}
          onClick={showAll}
        >
          {copy.all}
        </button>
        {NODE_TYPES.map((type) => {
          const active = enabledTypes.has(type);
          const count = graph.nodes.filter((node) => node.type === type).length;
          return (
            <button
              key={type}
              type="button"
              className={active ? styles.filterActive : ""}
              aria-pressed={active}
              aria-label={`${copy.types[type]}: ${active ? copy.filterOn : copy.filterOff}`}
              onClick={() => toggleType(type)}
              disabled={count === 0}
            >
              <i
                style={{ backgroundColor: TYPE_COLORS[type] }}
                aria-hidden="true"
              />
              {copy.types[type]}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={`${styles.workspace} ${selected ? styles.hasPanel : ""}`}>
        <div className={styles.canvas} aria-label={copy.canvasLabel}>
          {graph.nodes.length ? (
            <ReactFlow<ContextFlowNode, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={setFlow}
              onPaneClick={() => selectNode(null)}
              minZoom={0.25}
              maxZoom={1.8}
              fitView
              fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
              nodesConnectable={false}
              nodesFocusable
              edgesFocusable
              panOnScroll
              selectionOnDrag={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#c6c6c6" gap={24} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                className={styles.minimap}
                pannable
                zoomable
                nodeColor={(node) =>
                  TYPE_COLORS[
                    (node.data?.type as CustomerContextNodeType) || "area"
                  ]
                }
                maskColor="rgba(244, 244, 244, 0.72)"
              />
            </ReactFlow>
          ) : (
            <div className={styles.empty} role="status">
              <span aria-hidden="true">＋</span>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyBody}</p>
            </div>
          )}

          {graph.nodes.length > 0 && (
            <div className={styles.legend} aria-label={copy.legend}>
              <strong>{copy.legend}</strong>
              {NODE_TYPES.filter((type) =>
                graph.nodes.some((node) => node.type === type),
              ).map((type) => (
                <span key={type}>
                  <i style={{ backgroundColor: TYPE_COLORS[type] }} />
                  {copy.types[type]}
                </span>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <aside
            className={styles.detailPanel}
            aria-labelledby="customer-context-detail-title"
          >
            <div
              className={styles.detailAccent}
              style={{ backgroundColor: TYPE_COLORS[selected.type] }}
            />
            <div className={styles.detailHeader}>
              <p>{copy.selected}</p>
              <h3 id="customer-context-detail-title">{selected.label}</h3>
              <span>{copy.types[selected.type]}</span>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => selectNode(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.detailBody}>
              <section>
                <h4>{copy.context}</h4>
                <p>
                  {localizeKnownDetail(selected.detail, locale) ||
                    copy.noDetails}
                </p>
                {selected.stakeholder?.priorities?.length ? (
                  <div className={styles.tags}>
                    {selected.stakeholder.priorities.map((priority) => (
                      <span key={priority}>{priority}</span>
                    ))}
                  </div>
                ) : null}
              </section>

              {clampPercent(selected.strength) !== null && (
                <section>
                  <div className={styles.metricHeader}>
                    <h4>{copy.strength}</h4>
                    <strong>{clampPercent(selected.strength)}%</strong>
                  </div>
                  <div
                    className={styles.metricBar}
                    role="progressbar"
                    aria-label={copy.strength}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={clampPercent(selected.strength) || 0}
                  >
                    <span
                      style={{ width: `${clampPercent(selected.strength)}%` }}
                    />
                  </div>
                </section>
              )}

              <section>
                <h4>{copy.connections}</h4>
                {selectedConnections.length ? (
                  <ul className={styles.connectionList}>
                    {selectedConnections.map(({ edge, other }, index) => (
                      <li
                        key={
                          edge.id || `${edge.source}:${edge.target}:${index}`
                        }
                      >
                        <button
                          type="button"
                          onClick={() => other && selectNode(other.id)}
                          disabled={!other}
                        >
                          <span>{localizeRelation(edge.label, locale)}</span>
                          <strong>{other?.label || copy.notAvailable}</strong>
                        </button>
                        {edge.evidence?.length ? (
                          <div className={styles.edgeEvidence}>
                            <small>{copy.relationEvidence}</small>
                            {edge.evidence.map((evidence, evidenceIndex) => (
                              <button
                                key={
                                  evidence.id ||
                                  `${evidence.title}:${evidenceIndex}`
                                }
                                type="button"
                                onClick={() =>
                                  onEvidenceActivate?.(evidence, {
                                    node: selected,
                                    edge,
                                  })
                                }
                                disabled={!onEvidenceActivate}
                              >
                                {evidence.title}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>{copy.noDetails}</p>
                )}
              </section>

              <section>
                <div className={styles.metricHeader}>
                  <h4>{copy.sources}</h4>
                  <span>
                    {selectedEvidence.length || selected.sourceCount || 0}{" "}
                    {copy.source}
                  </span>
                </div>
                {selectedEvidence.length ? (
                  <ul className={styles.evidenceList}>
                    {selectedEvidence.map((evidence, index) => (
                      <li key={evidence.id || `${evidence.title}:${index}`}>
                        <button
                          type="button"
                          onClick={() =>
                            onEvidenceActivate?.(evidence, { node: selected })
                          }
                          disabled={!onEvidenceActivate}
                        >
                          <strong>{evidence.title}</strong>
                          {evidence.excerpt && <p>{evidence.excerpt}</p>}
                          <span>
                            {evidence.sourceType || copy.source}
                            {typeof evidence.confidence === "number"
                              ? ` · ${clampPercent(evidence.confidence)}% ${copy.confidence}`
                              : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.muted}>{copy.noSources}</p>
                )}
              </section>

              <footer>
                <span>{copy.updated}</span>
                <strong>{lastUpdated || copy.notAvailable}</strong>
              </footer>
            </div>
          </aside>
        )}
      </div>

      <span className={styles.srOnly} aria-live="polite">
        {selected
          ? `${copy.types[selected.type]} ${selected.label}, ${copy.nodeSelected}`
          : ""}
      </span>
    </section>
  );
}
