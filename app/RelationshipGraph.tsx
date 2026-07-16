"use client";

import {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CSSProperties,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "./I18nProvider";
import { localizeSystemValue } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";
import styles from "./RelationshipGraph.module.css";

export type RelationshipType =
  | "reporta_para"
  | "influencia"
  | "aliado"
  | "bloqueia"
  | "decide"
  | "possui_iniciativa";

export type RelationshipGraphMode = "hierarchy" | "influence";
export type GraphPosition = { x: number; y: number };

export type RelationshipEvidence = {
  id: string;
  title: string;
  excerpt?: string;
  sourceType?: string;
  confidence?: number;
  updatedAt?: string;
  href?: string;
};

export type RelationshipStakeholder = {
  id: string;
  name: string;
  role: string;
  area?: string;
  influence?: "Alta" | "Média" | "Baixa" | string;
  stance?: "Aliado" | "Neutro" | "Resistente" | "Desconhecido" | string;
  priorities?: string[];
  notes?: string;
  evidence?: RelationshipEvidence[];
  recommendedApproach?: string;
  isSponsor?: boolean;
};

export type AccountRelationship = {
  id?: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
  confirmed?: boolean;
  evidence?: RelationshipEvidence[];
};

export type RelationshipGraphProps = {
  stakeholders: RelationshipStakeholder[];
  relationships: AccountRelationship[];
  /** Posições persistidas por modo. Posições arrastadas localmente têm precedência até a próxima montagem. */
  savedPositions?: Partial<
    Record<RelationshipGraphMode, Record<string, GraphPosition>>
  >;
  defaultMode?: RelationshipGraphMode;
  mode?: RelationshipGraphMode;
  sponsorId?: string | null;
  selectedStakeholderId?: string | null;
  missingRelationshipNodeIds?: string[];
  readOnly?: boolean;
  loading?: boolean;
  className?: string;
  onModeChange?: (mode: RelationshipGraphMode) => void;
  onStakeholderSelect?: (stakeholder: RelationshipStakeholder | null) => void;
  onLayoutChange?: (
    mode: RelationshipGraphMode,
    positions: Record<string, GraphPosition>,
    changedNodeId: string,
  ) => void | Promise<void>;
  onCreateRelationship?: (
    relationship: Omit<AccountRelationship, "id">,
  ) => void | Promise<void>;
  onRequestEdit?: (stakeholder: RelationshipStakeholder) => void;
  onRequestAddStakeholder?: () => void;
  onRequestRelationship?: (stakeholderId: string) => void;
};

type RelationshipNodeData = {
  stakeholder: RelationshipStakeholder;
  selected: boolean;
  onSelect: (id: string) => void;
  pathToSponsor: boolean;
  sponsor: boolean;
  missingRelationship: boolean;
  readOnly: boolean;
} & Record<string, unknown>;

type RelationshipFlowNode = Node<RelationshipNodeData, "stakeholder">;

const relationshipColors: Record<RelationshipType, string> = {
  reporta_para: "#0f62fe",
  influencia: "#1192e8",
  aliado: "#198038",
  bloqueia: "#da1e28",
  decide: "#6929c4",
  possui_iniciativa: "#007d79",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function nodeTone(stance?: string) {
  if (/^(aliado|ally)$/i.test(stance || "")) return styles.ally;
  if (/^(resistente|resistant)$/i.test(stance || "")) return styles.blocker;
  return styles.neutral;
}

function StakeholderNode({ data }: NodeProps<RelationshipFlowNode>) {
  const { locale, dictionary: d } = useI18n();
  const select = () => data.onSelect(data.stakeholder.id);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
  };

  return (
    <div
      className={[
        styles.node,
        nodeTone(data.stakeholder.stance),
        data.selected ? styles.nodeSelected : "",
        data.pathToSponsor ? styles.nodePath : "",
        data.sponsor ? styles.nodeSponsor : "",
        data.missingRelationship ? styles.nodeMissing : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-label={`${data.stakeholder.name}, ${data.stakeholder.role}${data.sponsor ? ", sponsor" : ""}`}
      aria-pressed={data.selected}
      onClick={select}
      onKeyDown={onKeyDown}
    >
      <Handle
        className={styles.handle}
        type="target"
        position={Position.Top}
        aria-label={d.relationship.connectTarget}
      />
      <div className={styles.nodeTopline} />
      <div className={styles.nodeBody}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(data.stakeholder.name)}
        </span>
        <div className={styles.nodeCopy}>
          <span className={styles.nodeEyebrow}>
            {data.stakeholder.area || d.relationship.unknownArea}
          </span>
          <strong>{data.stakeholder.name}</strong>
          <span>{data.stakeholder.role}</span>
        </div>
      </div>
      <div className={styles.nodeMeta}>
        <span>
          {data.stakeholder.influence
            ? localizeSystemValue(locale, data.stakeholder.influence)
            : d.relationship.influenceUnknown}
        </span>
        {data.sponsor && (
          <span className={styles.sponsorBadge}>{d.relationship.sponsor}</span>
        )}
        {data.missingRelationship && (
          <span className={styles.missingBadge}>
            {d.relationship.pendingRelationship}
          </span>
        )}
      </div>
      <Handle
        className={styles.handle}
        type="source"
        position={Position.Bottom}
        aria-label={d.relationship.connectSource}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { stakeholder: StakeholderNode };

function hierarchyPositions(
  stakeholders: RelationshipStakeholder[],
  relationships: AccountRelationship[],
) {
  const ids = new Set(stakeholders.map((item) => item.id));
  const reporting = relationships.filter(
    (item) =>
      item.type === "reporta_para" &&
      ids.has(item.source) &&
      ids.has(item.target),
  );
  const managerByPerson = new Map(
    reporting.map((item) => [item.source, item.target]),
  );
  const levels = new Map<string, number>();

  const levelOf = (id: string, trail = new Set<string>()): number => {
    if (levels.has(id)) return levels.get(id) || 0;
    const manager = managerByPerson.get(id);
    if (!manager || trail.has(manager)) return 0;
    const nextTrail = new Set(trail).add(id);
    const level = levelOf(manager, nextTrail) + 1;
    levels.set(id, level);
    return level;
  };

  stakeholders.forEach((item) => levels.set(item.id, levelOf(item.id)));
  const byLevel = new Map<number, RelationshipStakeholder[]>();
  stakeholders.forEach((item) => {
    const level = levels.get(item.id) || 0;
    byLevel.set(level, [...(byLevel.get(level) || []), item]);
  });

  const positions: Record<string, GraphPosition> = {};
  byLevel.forEach((items, level) => {
    const width = Math.max(0, (items.length - 1) * 272);
    items
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item, index) => {
        positions[item.id] = { x: index * 272 - width / 2, y: level * 190 };
      });
  });
  return positions;
}

function influencePositions(
  stakeholders: RelationshipStakeholder[],
  sponsorId?: string | null,
) {
  const ordered = [...stakeholders].sort((a, b) => {
    const score = (value?: string) =>
      /^(alta|high)$/i.test(value || "")
        ? 3
        : /^(média|media|medium)$/i.test(value || "")
          ? 2
          : 1;
    return (
      score(b.influence) - score(a.influence) || a.name.localeCompare(b.name)
    );
  });
  const sponsor =
    ordered.find((item) => item.id === sponsorId) ||
    ordered.find((item) => item.isSponsor);
  const ring = sponsor
    ? ordered.filter((item) => item.id !== sponsor.id)
    : ordered.slice(1);
  const center = sponsor || ordered[0];
  const positions: Record<string, GraphPosition> = {};
  if (center) positions[center.id] = { x: 0, y: 0 };
  ring.forEach((item, index) => {
    const radius = ring.length > 7 && index >= 7 ? 520 : 320;
    const ringStart = radius === 520 ? 7 : 0;
    const ringLength =
      radius === 520 ? Math.max(1, ring.length - 7) : Math.min(7, ring.length);
    const angle =
      ((index - ringStart) / ringLength) * Math.PI * 2 - Math.PI / 2;
    positions[item.id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
  return positions;
}

function shortestPath(
  source: string | null,
  target: string | null,
  relationships: AccountRelationship[],
) {
  if (!source || !target)
    return { nodes: new Set<string>(), edges: new Set<string>() };
  if (source === target)
    return { nodes: new Set([source]), edges: new Set<string>() };
  const adjacency = new Map<string, Array<{ node: string; edge: string }>>();
  relationships.forEach((item, index) => {
    const edge =
      item.id || `${item.source}:${item.target}:${item.type}:${index}`;
    adjacency.set(item.source, [
      ...(adjacency.get(item.source) || []),
      { node: item.target, edge },
    ]);
    adjacency.set(item.target, [
      ...(adjacency.get(item.target) || []),
      { node: item.source, edge },
    ]);
  });
  const queue = [source];
  const seen = new Set([source]);
  const previous = new Map<string, { node: string; edge: string }>();
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) || []) {
      if (seen.has(next.node)) continue;
      seen.add(next.node);
      previous.set(next.node, { node: current, edge: next.edge });
      if (next.node === target) {
        const nodes = new Set<string>([target]);
        const edges = new Set<string>();
        let cursor = target;
        while (cursor !== source) {
          const step = previous.get(cursor);
          if (!step) break;
          nodes.add(step.node);
          edges.add(step.edge);
          cursor = step.node;
        }
        return { nodes, edges };
      }
      queue.push(next.node);
    }
  }
  return { nodes: new Set([source, target]), edges: new Set<string>() };
}

function approachFor(stakeholder: RelationshipStakeholder, d: Messages) {
  if (stakeholder.recommendedApproach) return stakeholder.recommendedApproach;
  const theme =
    stakeholder.priorities?.[0] ||
    stakeholder.area ||
    d.relationship.defaultTheme;
  const posture = /^(resistente|resistant)$/i.test(stakeholder.stance || "")
    ? d.relationship.approachResistant
    : /^(aliado|ally)$/i.test(stakeholder.stance || "")
      ? d.relationship.approachAlly
      : d.relationship.approachNeutral;
  return `${posture}. ${d.relationship.approachSuffix.replace("{theme}", theme)}`;
}

export default function RelationshipGraph({
  stakeholders,
  relationships,
  savedPositions,
  defaultMode = "hierarchy",
  mode,
  sponsorId,
  selectedStakeholderId,
  missingRelationshipNodeIds,
  readOnly = false,
  loading = false,
  className = "",
  onModeChange,
  onStakeholderSelect,
  onLayoutChange,
  onCreateRelationship,
  onRequestEdit,
  onRequestAddStakeholder,
  onRequestRelationship,
}: RelationshipGraphProps) {
  const { locale, dictionary: d, t } = useI18n();
  const [internalMode, setInternalMode] =
    useState<RelationshipGraphMode>(defaultMode);
  const [internalSelected, setInternalSelected] = useState<string | null>(
    selectedStakeholderId || null,
  );
  const [relationType, setRelationType] =
    useState<RelationshipType>("reporta_para");
  const [flow, setFlow] = useState<ReactFlowInstance<
    RelationshipFlowNode,
    Edge
  > | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<RelationshipFlowNode>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const positionsRef = useRef<
    Partial<Record<RelationshipGraphMode, Record<string, GraphPosition>>>
  >({});
  const activeMode = mode || internalMode;
  const currentSelected =
    selectedStakeholderId === undefined
      ? internalSelected
      : selectedStakeholderId;
  const selected =
    stakeholders.find((item) => item.id === currentSelected) || null;
  const sponsor =
    stakeholders.find((item) => item.id === sponsorId) ||
    stakeholders.find((item) => item.isSponsor) ||
    stakeholders.find(
      (item) =>
        /\b(CEO|CIO|CTO|CFO|CISO|presidente|chief)\b/i.test(item.role) &&
        item.influence === "Alta",
    ) ||
    null;
  const relationshipLabels = useMemo<Record<RelationshipType, string>>(
    () => ({
      reporta_para: d.relationship.reporta_para,
      influencia: d.relationship.influencia,
      aliado: d.relationship.aliado,
      bloqueia: d.relationship.bloqueia,
      decide: d.relationship.decide,
      possui_iniciativa: d.relationship.possui_iniciativa,
    }),
    [d.relationship],
  );

  const degree = useMemo(() => {
    const result = new Map<string, number>();
    relationships.forEach((item) => {
      result.set(item.source, (result.get(item.source) || 0) + 1);
      result.set(item.target, (result.get(item.target) || 0) + 1);
    });
    return result;
  }, [relationships]);
  const missingIds = useMemo(
    () =>
      new Set(
        missingRelationshipNodeIds ||
          stakeholders
            .filter((item) => !degree.get(item.id))
            .map((item) => item.id),
      ),
    [degree, missingRelationshipNodeIds, stakeholders],
  );
  const sponsorPath = useMemo(
    () =>
      shortestPath(currentSelected || null, sponsor?.id || null, relationships),
    [currentSelected, relationships, sponsor?.id],
  );

  const selectStakeholder = useCallback(
    (id: string | null) => {
      if (selectedStakeholderId === undefined) setInternalSelected(id);
      onStakeholderSelect?.(
        stakeholders.find((item) => item.id === id) || null,
      );
    },
    [onStakeholderSelect, selectedStakeholderId, stakeholders],
  );

  useEffect(() => {
    const automatic =
      activeMode === "hierarchy"
        ? hierarchyPositions(stakeholders, relationships)
        : influencePositions(stakeholders, sponsor?.id);
    const current = positionsRef.current[activeMode] || {};
    const persisted = savedPositions?.[activeMode] || {};
    const positions = { ...automatic, ...persisted, ...current };
    positionsRef.current[activeMode] = positions;

    setNodes(
      stakeholders.map((stakeholder) => ({
        id: stakeholder.id,
        type: "stakeholder",
        position: positions[stakeholder.id] || { x: 0, y: 0 },
        draggable: !readOnly,
        connectable: !readOnly && Boolean(onCreateRelationship),
        focusable: true,
        ariaLabel: `${stakeholder.name}, ${stakeholder.role}`,
        data: {
          stakeholder,
          selected: stakeholder.id === currentSelected,
          onSelect: selectStakeholder,
          pathToSponsor: sponsorPath.nodes.has(stakeholder.id),
          sponsor: stakeholder.id === sponsor?.id,
          missingRelationship: missingIds.has(stakeholder.id),
          readOnly,
        },
      })),
    );

    setEdges(
      relationships.map((relationship, index) => {
        const id =
          relationship.id ||
          `${relationship.source}:${relationship.target}:${relationship.type}:${index}`;
        const path = sponsorPath.edges.has(id);
        const color = path ? "#f1c21b" : relationshipColors[relationship.type];
        return {
          id,
          source: relationship.source,
          target: relationship.target,
          type: activeMode === "hierarchy" ? "smoothstep" : "default",
          label: relationship.label || relationshipLabels[relationship.type],
          ariaLabel: t("relationship.edgeLabel", {
            relationship: relationshipLabels[relationship.type],
            source: relationship.source,
            target: relationship.target,
          }),
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: path,
          style: {
            stroke: color,
            strokeWidth: path ? 3 : relationship.confirmed === false ? 1.5 : 2,
            strokeDasharray:
              relationship.confirmed === false ? "6 5" : undefined,
          },
          labelStyle: { fill: "#525252", fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: "#f4f4f4", fillOpacity: 0.92 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 0,
        };
      }),
    );
  }, [
    activeMode,
    currentSelected,
    missingIds,
    onCreateRelationship,
    readOnly,
    relationships,
    relationshipLabels,
    savedPositions,
    selectStakeholder,
    setEdges,
    setNodes,
    sponsor?.id,
    sponsorPath.edges,
    sponsorPath.nodes,
    stakeholders,
    t,
  ]);

  const changeMode = (nextMode: RelationshipGraphMode) => {
    if (!mode) setInternalMode(nextMode);
    setRelationType(nextMode === "hierarchy" ? "reporta_para" : "influencia");
    onModeChange?.(nextMode);
    requestAnimationFrame(() =>
      flow?.fitView({ padding: 0.22, duration: 280, maxZoom: 1 }),
    );
  };

  const persistPosition = useCallback(
    (_event: unknown, node: RelationshipFlowNode) => {
      const positions = {
        ...(positionsRef.current[activeMode] || {}),
        [node.id]: { x: node.position.x, y: node.position.y },
      };
      positionsRef.current[activeMode] = positions;
      void onLayoutChange?.(activeMode, positions, node.id);
    },
    [activeMode, onLayoutChange],
  );

  const connect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        connection.source === connection.target ||
        !onCreateRelationship
      )
        return;
      void onCreateRelationship({
        source: connection.source,
        target: connection.target,
        type: relationType,
        confirmed: true,
      });
    },
    [onCreateRelationship, relationType],
  );

  const resetLayout = () => {
    positionsRef.current[activeMode] = {};
    const positions =
      activeMode === "hierarchy"
        ? hierarchyPositions(stakeholders, relationships)
        : influencePositions(stakeholders, sponsor?.id);
    positionsRef.current[activeMode] = positions;
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        position: positions[node.id] || node.position,
      })),
    );
    const changedNodeId = stakeholders[0]?.id || "layout";
    void onLayoutChange?.(activeMode, positions, changedNodeId);
    requestAnimationFrame(() =>
      flow?.fitView({ padding: 0.22, duration: 280, maxZoom: 1 }),
    );
  };

  const style = {
    "--graph-panel-width": selected ? "22rem" : "0rem",
  } as CSSProperties;

  if (loading) {
    return (
      <section
        className={`${styles.shell} ${styles.loading} ${className}`}
        aria-label={d.relationship.loading}
        aria-busy="true"
      >
        <div className={styles.skeletonToolbar} />
        <div className={styles.skeletonCanvas}>
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
      style={style}
      aria-label={d.relationship.mapLabel}
    >
      <header className={styles.toolbar}>
        <div
          className={styles.modeGroup}
          role="group"
          aria-label={d.relationship.viewLabel}
        >
          <button
            type="button"
            aria-pressed={activeMode === "hierarchy"}
            onClick={() => changeMode("hierarchy")}
          >
            {d.relationship.hierarchy}
          </button>
          <button
            type="button"
            aria-pressed={activeMode === "influence"}
            onClick={() => changeMode("influence")}
          >
            {d.relationship.influenceNetwork}
          </button>
        </div>
        <div className={styles.toolbarActions}>
          {!readOnly && onCreateRelationship && (
            <label>
              <span>{d.relationship.newRelationship}</span>
              <select
                value={relationType}
                onChange={(event) =>
                  setRelationType(event.target.value as RelationshipType)
                }
                aria-label={d.relationship.relationshipType}
              >
                {(Object.keys(relationshipLabels) as RelationshipType[]).map(
                  (type) => (
                    <option key={type} value={type}>
                      {relationshipLabels[type]}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <button
            type="button"
            className={styles.quietButton}
            onClick={resetLayout}
          >
            {d.relationship.rearrange}
          </button>
          {onRequestAddStakeholder && !readOnly && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onRequestAddStakeholder}
            >
              {d.relationship.addPerson}
            </button>
          )}
        </div>
      </header>

      <div className={styles.graphArea}>
        {stakeholders.length ? (
          <ReactFlow<RelationshipFlowNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={persistPosition}
            onConnect={connect}
            onPaneClick={() => selectStakeholder(null)}
            onInit={setFlow}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly && Boolean(onCreateRelationship)}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.8}
            defaultEdgeOptions={{ interactionWidth: 20 }}
            connectionLineStyle={{
              stroke: relationshipColors[relationType],
              strokeWidth: 2,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#c6c6c6" gap={24} size={1} />
            <Controls
              position="bottom-left"
              showInteractive={!readOnly}
              aria-label={d.relationship.zoomControls}
            />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              nodeColor={(node) =>
                node.data?.sponsor
                  ? "#f1c21b"
                  : node.data?.missingRelationship
                    ? "#da1e28"
                    : "#0f62fe"
              }
              maskColor="rgba(244, 244, 244, 0.78)"
              aria-label={d.relationship.minimap}
            />
            <div className={styles.legend} aria-label={d.relationship.legend}>
              <span>
                <i className={styles.legendSponsor} />
                {d.relationship.sponsorPath}
              </span>
              <span>
                <i className={styles.legendGap} />
                {d.relationship.pendingRelationship}
              </span>
              {!readOnly && onCreateRelationship && (
                <small>{d.relationship.dragHelp}</small>
              )}
            </div>
          </ReactFlow>
        ) : (
          <div className={styles.empty}>
            <span aria-hidden="true">◎</span>
            <h3>{d.relationship.emptyTitle}</h3>
            <p>{d.relationship.emptyHelp}</p>
            {onRequestAddStakeholder && !readOnly && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onRequestAddStakeholder}
              >
                {d.relationship.addFirst}
              </button>
            )}
          </div>
        )}
      </div>

      {selected && (
        <aside
          className={styles.contextPanel}
          aria-label={t("relationship.intelligenceFor", {
            name: selected.name,
          })}
        >
          <div className={styles.panelHeader}>
            <span className={styles.panelAvatar} aria-hidden="true">
              {initials(selected.name)}
            </span>
            <div>
              <small>{selected.role}</small>
              <h3>{selected.name}</h3>
              <p>{selected.area || d.relationship.unknownArea}</p>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => selectStakeholder(null)}
              aria-label={d.relationship.closeProfile}
            >
              ×
            </button>
          </div>
          <div className={styles.tags}>
            <span>
              {selected.stance
                ? localizeSystemValue(locale, selected.stance)
                : d.relationship.stanceUnknown}
            </span>
            <span>
              {t("relationship.influence", {
                value: selected.influence
                  ? localizeSystemValue(locale, selected.influence)
                  : d.common.notAssessed.toLowerCase(),
              })}
            </span>
            {selected.id === sponsor?.id && (
              <span className={styles.sponsorTag}>
                {d.relationship.sponsor}
              </span>
            )}
          </div>
          {sponsor && selected.id !== sponsor.id && (
            <div className={styles.sponsorPathSummary}>
              <strong>
                {sponsorPath.edges.size
                  ? t("relationship.connectionsToSponsor", {
                      count: sponsorPath.edges.size,
                    })
                  : d.relationship.incompleteSponsorPath}
              </strong>
              <span>
                {sponsor.name} · {sponsor.role}
              </span>
            </div>
          )}
          <div className={styles.panelSection}>
            <small>{d.relationship.knownPriorities}</small>
            {selected.priorities?.length ? (
              <div className={styles.priorityList}>
                {selected.priorities.map((item, index) => (
                  <span key={`${index}-${item}`}>{item}</span>
                ))}
              </div>
            ) : (
              <p className={styles.gapText}>{d.relationship.noPriorities}</p>
            )}
          </div>
          <div className={styles.panelSection}>
            <small>{d.relationship.recommendedApproach}</small>
            <p>{approachFor(selected, d)}</p>
          </div>
          {selected.notes && (
            <div className={styles.panelSection}>
              <small>{d.relationship.notes}</small>
              <p>{selected.notes}</p>
            </div>
          )}
          <div className={styles.panelSection}>
            <small>{d.relationship.evidence}</small>
            {selected.evidence?.length ? (
              <ul className={styles.evidenceList}>
                {selected.evidence.slice(0, 5).map((evidence) => (
                  <li key={evidence.id}>
                    {evidence.href ? (
                      <a href={evidence.href}>{evidence.title}</a>
                    ) : (
                      <strong>{evidence.title}</strong>
                    )}
                    {evidence.excerpt && <p>{evidence.excerpt}</p>}
                    <span>
                      {[
                        evidence.sourceType,
                        evidence.confidence === undefined
                          ? ""
                          : t("relationship.evidenceConfidence", {
                              value: evidence.confidence,
                            }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.gapText}>{d.relationship.noEvidence}</p>
            )}
          </div>
          {!readOnly && (
            <div className={styles.panelActions}>
              {onRequestEdit && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => onRequestEdit(selected)}
                >
                  {d.relationship.editProfile}
                </button>
              )}
              {onRequestRelationship && (
                <button
                  type="button"
                  className={styles.quietButton}
                  onClick={() => onRequestRelationship(selected.id)}
                >
                  {d.relationship.addRelationship}
                </button>
              )}
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
