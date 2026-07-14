import { env } from "cloudflare:workers";
import { answerFromEvidence, buildActions, buildHypotheses, buildMemory, suggestAccountPlan, type AccountEvent, type AccountMemory, type EvidenceRef } from "../../../lib/account-intelligence";
import { createAccountIntelligenceAdapter } from "../../../lib/watsonx-adapter";

export const dynamic = "force-dynamic";

type Priority = "Alta" | "Média" | "Baixa";
type Answer = { key: string; question: string; answer: string; at: string };
type Recommendation = { type: "Capacidade" | "Software" | "Consultoria"; name: string; rationale: string };
type Score = {
  name: string;
  short: string;
  alignment: number;
  value: number;
  readiness: number;
  confidence: number;
  level: Priority;
  evidence: string[];
  action: string;
};
type MeetingInsight = {
  summary: string;
  signals: string[];
  ibmThemes: string[];
  nextQuestions: string[];
  nextActions: string[];
  risks: string[];
  stakeholders: string[];
  systems: string[];
  painPoints: string[];
  aiStatus: "watsonx" | "fallback" | "error";
};
type Meeting = {
  id: string;
  discoveryId: string;
  title: string;
  notes: string;
  summary: string;
  insights: MeetingInsight;
  aiStatus: "watsonx" | "fallback" | "error";
  createdAt: string;
};
type AccountNode = { id: string; type: "area" | "person" | "system" | "pain" | "initiative" | "capability" | "risk"; label: string; detail: string; strength: number };
type AccountEdge = { source: string; target: string; label: "impacta" | "depende de" | "decisor de" | "possível aderência" | "risco associado" };
type AccountMap = { nodes: AccountNode[]; edges: AccountEdge[]; updatedAt: string };
type Stakeholder = {
  id: string;
  discoveryId: string;
  name: string;
  role: string;
  area: string;
  reportsToId: string | null;
  influence: "Alta" | "Média" | "Baixa";
  stance: "Aliado" | "Neutro" | "Resistente" | "Desconhecido";
  priorities: string[];
  notes: string;
  source: "manual" | "suggested";
  createdAt: string;
  updatedAt: string;
};
type AccountAction = { id: string; discoveryId: string; stakeholderId: string | null; type: string; title: string; rationale: string; nextStep: string; impact: number; urgency: number; confidence: number; maturity: number; priorityScore: number; status: string; dueAt: string | null; evidence: EvidenceRef[]; dedupeKey: string; evidenceFingerprint: string; createdAt: string; updatedAt: string };
type Hypothesis = { id: string; discoveryId: string; capabilityKey: string; title: string; problem: string; products: string[]; stakeholderIds: string[]; evidence: EvidenceRef[]; gaps: string[]; confidence: number; stage: string; nextStep: string; createdAt: string; updatedAt: string };
type AccountPlan = { discoveryId: string; priorities: string[]; initiatives: string[]; objectives: string[]; risks: string[]; ecosystem: string[]; relationship: string[]; plan30: string[]; plan60: string[]; plan90: string[]; approvalStatus: string; suggestion: Record<string, string[]>; updatedAt: string };
type AccountDocument = { id: string; discoveryId: string; name: string; contentType: string; sizeBytes: number; status: string; summary: string; createdAt: string };

const capabilityCatalog = [
  { name: "FinOps & Technology Financial Management", short: "FinOps", type: "capability", keywords: ["custo", "cloud", "nuvem", "orçamento", "budget", "desperd", "forecast", "rateio", "finops", "otimiza", "multicloud"], action: "Mapear baseline de gastos, owners e desperdícios antes de propor Cloudability/Turbonomic." },
  { name: "Trusted Data & Data Security", short: "Trusted Data", type: "capability", keywords: ["dado", "governan", "qualidade", "linhagem", "catálogo", "seguran", "lgpd", "compliance", "silo", "integra"], action: "Validar fontes críticas, qualidade, acesso e riscos de dados com stakeholders de negócio." },
  { name: "AI Governance", short: "AI Governance", type: "capability", keywords: ["inteligência artificial", " ia ", "ai ", "modelo", "governança de ia", "responsável", "genai", "llm"], action: "Identificar casos de IA, riscos regulatórios e controles necessários para watsonx.governance." },
  { name: "Hybrid Infrastructure", short: "Hybrid Cloud", type: "capability", keywords: ["híbr", "multicloud", "datacenter", "legado", "infraestrutura", "container", "kubernetes", "openshift"], action: "Entender workloads, restrições e padrões de plataforma para uma revisão de arquitetura híbrida." },
  { name: "Enterprise Automation", short: "Automation", type: "capability", keywords: ["manual", "automação", "automat", "ineficiência", "processo", "produtividade", "workflow"], action: "Mapear tarefas repetitivas, handoffs e decisões que podem ser orquestradas com watsonx Orchestrate." },
  { name: "Application Modernization", short: "App Modernization", type: "capability", keywords: ["aplicação", "aplicativo", "legado", "moderniza", "mainframe", "entrega", "devops"], action: "Classificar aplicações por valor, risco e esforço para ondas de modernização." },
] as const;

const recommendationMap: Record<string, Recommendation[]> = {
  FinOps: [
    { type: "Capacidade", name: "FinOps & Technology Financial Management", rationale: "Maior correspondência entre desafios financeiros, maturidade operacional e potencial de valor." },
    { type: "Software", name: "IBM Cloudability + IBM Turbonomic", rationale: "Combina transparência financeira com otimização contínua de recursos e performance." },
    { type: "Consultoria", name: "FinOps Discovery Workshop", rationale: "Valida baseline, modelo operacional, responsabilidades e prioridades antes de uma decisão comercial." },
  ],
  "Trusted Data": [
    { type: "Capacidade", name: "Trusted Data & Data Security", rationale: "Os sinais conectam governança, proteção, integração e consumo confiável de dados." },
    { type: "Software", name: "watsonx.data + IBM Guardium + HashiCorp Vault", rationale: "Cria uma fundação governada de dados com controles de segurança e segredos empresariais." },
    { type: "Consultoria", name: "Trusted Data Workshop", rationale: "Alinha stakeholders, fontes críticas, riscos e um roadmap de dados confiáveis." },
  ],
  "AI Governance": [
    { type: "Capacidade", name: "AI Governance", rationale: "Adoção de IA exige transparência, risco, políticas e supervisão humana coordenados." },
    { type: "Software", name: "watsonx.governance + watsonx.ai", rationale: "Conecta ciclo de vida de modelos, controles de risco e evidências operacionais." },
    { type: "Consultoria", name: "AI Readiness & Governance Workshop", rationale: "Define casos prioritários, guardrails e modelo operacional responsável." },
  ],
  "Hybrid Cloud": [
    { type: "Capacidade", name: "Hybrid Infrastructure", rationale: "O cenário distribuído exige portabilidade, consistência operacional e otimização." },
    { type: "Software", name: "Red Hat OpenShift + HashiCorp Terraform", rationale: "Padroniza execução e provisionamento seguro em ambientes híbridos." },
    { type: "Consultoria", name: "Hybrid Cloud Architecture Review", rationale: "Cria um roadmap de arquitetura alinhado às prioridades de negócio." },
  ],
  Automation: [
    { type: "Capacidade", name: "Enterprise Automation", rationale: "Sinais de processos manuais e ineficiência indicam potencial de produtividade." },
    { type: "Software", name: "watsonx Orchestrate + IBM Concert", rationale: "Orquestra trabalho e conecta insights operacionais a ações coordenadas." },
    { type: "Consultoria", name: "Automation Discovery Workshop", rationale: "Prioriza jornadas de automação por impacto, risco e esforço." },
  ],
  "App Modernization": [
    { type: "Capacidade", name: "Application Modernization", rationale: "Dependências legadas e velocidade de entrega sugerem modernização incremental." },
    { type: "Software", name: "Red Hat OpenShift + IBM Instana", rationale: "Apoia modernização com plataforma consistente e observabilidade ponta a ponta." },
    { type: "Consultoria", name: "Application Modernization Assessment", rationale: "Classifica aplicações e define ondas de modernização orientadas a valor." },
  ],
};

const initialScores = (): Score[] =>
  capabilityCatalog.map((item, index) => ({
    name: item.name,
    short: item.short,
    alignment: Math.max(22, 36 - index * 3),
    value: Math.max(34, 45 - index * 2),
    readiness: Math.max(28, 38 - index * 2),
    confidence: 30,
    level: "Baixa",
    evidence: ["Conta ainda sem evidência suficiente. Registre uma reunião ou responda o discovery guiado."],
    action: item.action,
  }));

const clamp = (value: number) => Math.max(12, Math.min(97, Math.round(value)));
const level = (value: number): Priority => (value >= 75 ? "Alta" : value >= 50 ? "Média" : "Baixa");
const hitCount = (text: string, words: readonly string[]) => words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
const compact = (items: Array<string | false | null | undefined>) => Array.from(new Set(items.filter(Boolean) as string[])).slice(0, 6);

const aiAdapter = () => {
  const runtime = env as unknown as Record<string, string | undefined>;
  return createAccountIntelligenceAdapter({ apiKey: runtime.WATSONX_API_KEY, projectId: runtime.WATSONX_PROJECT_ID, url: runtime.WATSONX_URL, modelId: runtime.WATSONX_MODEL_ID });
};

function fallbackMeetingInsights(notes: string, customerName: string): MeetingInsight {
  const text = notes.toLowerCase();
  const themeHits = capabilityCatalog
    .map((item) => ({ theme: item.short, hits: hitCount(text, item.keywords) }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((item) => item.theme);
  const stakeholders = compact([
    text.includes("cfo") && "CFO / Finanças",
    text.includes("cio") && "CIO / Tecnologia",
    text.includes("cto") && "CTO / Arquitetura",
    text.includes("ciso") && "CISO / Segurança",
    text.includes("dados") && "Líder de dados",
    text.includes("operação") && "Operações",
  ]);
  const systems = compact([
    text.includes("aws") && "AWS",
    text.includes("azure") && "Azure",
    text.includes("mainframe") && "Mainframe",
    text.includes("sap") && "SAP",
    text.includes("datacenter") && "Datacenter",
    text.includes("lakehouse") && "Lakehouse",
    text.includes("salesforce") && "Salesforce",
  ]);
  const painPoints = compact([
    hitCount(text, ["custo", "orçamento", "forecast", "rateio"]) > 0 && "Pressão por previsibilidade e controle de custos",
    hitCount(text, ["silo", "qualidade", "linhagem", "catálogo"]) > 0 && "Dados fragmentados ou pouco confiáveis",
    hitCount(text, ["lgpd", "risco", "compliance", "seguran"]) > 0 && "Risco, conformidade e proteção de dados",
    hitCount(text, ["manual", "produtividade", "processo"]) > 0 && "Processos manuais ou baixa produtividade",
    hitCount(text, ["legado", "mainframe", "moderniza"]) > 0 && "Dependências legadas ou necessidade de modernização",
  ]);

  const themes = themeHits.length ? themeHits : ["Trusted Data", "FinOps"];
  return {
    summary: notes.trim().slice(0, 260) || `Contexto inicial de ${customerName} ainda precisa de evidências de reunião.`,
    signals: compact([...painPoints, ...systems.map((item) => `Sistema citado: ${item}`)]),
    ibmThemes: themes,
    nextQuestions: [
      "Qual iniciativa executiva está por trás dessa conversa?",
      "Quem decide orçamento, risco e arquitetura nessa conta?",
      "Quais métricas definem sucesso nos próximos 90 dias?",
      "O que precisa estar comprovado para virar oportunidade no CRM?",
    ],
    nextActions: [
      `Atualizar o mapa da conta de ${customerName} com stakeholders e sistemas citados.`,
      `Validar aderência inicial em ${themes[0]} com sponsor e time técnico.`,
      "Preparar conversa de aprofundamento antes de criar oportunidade no CRM.",
    ],
    risks: compact([
      !stakeholders.length && "Stakeholders decisores ainda não identificados",
      !systems.length && "Arquitetura/sistemas ainda pouco claros",
      !painPoints.length && "Dor de negócio ainda genérica",
      "Recomendação precisa de validação humana antes de handoff comercial",
    ]),
    stakeholders,
    systems,
    painPoints,
    aiStatus: "fallback",
  };
}

async function getWatsonxInsights(notes: string, customerName: string, industry: string): Promise<MeetingInsight | null> {
  const parsed = await aiAdapter().prepareMeeting(`Cliente: ${customerName}\nSetor: ${industry}\nNotas da reunião:\n${notes}`) as Partial<MeetingInsight> | null;
  if (!parsed) return null;
  return {
    summary: String(parsed.summary || notes.slice(0, 260)),
    signals: compact((parsed.signals || []) as string[]),
    ibmThemes: compact((parsed.ibmThemes || []) as string[]),
    nextQuestions: compact((parsed.nextQuestions || []) as string[]),
    nextActions: compact((parsed.nextActions || []) as string[]),
    risks: compact((parsed.risks || []) as string[]),
    stakeholders: compact((parsed.stakeholders || []) as string[]),
    systems: compact((parsed.systems || []) as string[]),
    painPoints: compact((parsed.painPoints || []) as string[]),
    aiStatus: "watsonx",
  };
}

function analyze(answers: Answer[], meetings: Meeting[] = []) {
  const text = [
    answers.map((item) => item.answer).join(" "),
    meetings.map((item) => `${item.notes} ${(item.insights.ibmThemes || []).join(" ")} ${(item.insights.painPoints || []).join(" ")}`).join(" "),
  ].join(" ").toLowerCase();
  const completeness = answers.length + meetings.length * 1.5;
  const readinessHits = hitCount(text, ["patroc", "executiv", "urg", "prazo", "time", "orçamento", "budget", "iniciativa", "prioridade", "sponsor", "decisão"]);
  const confidence = clamp(28 + answers.length * 8 + meetings.length * 13);
  const base = 26 + completeness * 4;
  const quote = (key: string) => answers.find((item) => item.key === key)?.answer;

  const scores = capabilityCatalog.map((item) => {
    const hits = hitCount(text, item.keywords);
    const themeMention = meetings.some((meeting) => meeting.insights.ibmThemes.some((theme) => theme.toLowerCase().includes(item.short.toLowerCase().split(" ")[0])));
    const alignment = clamp(base + hits * 8 + (themeMention ? 10 : 0));
    const value = clamp(38 + hits * 7 + meetings.length * 5 + answers.length * 2);
    const readiness = clamp(32 + readinessHits * 7 + meetings.length * 4 + answers.length * 2);
    const meetingEvidence = meetings.find((meeting) => meeting.insights.ibmThemes.some((theme) => theme.toLowerCase().includes(item.short.toLowerCase().split(" ")[0])));
    return {
      name: item.name,
      short: item.short,
      alignment,
      value,
      readiness,
      confidence,
      level: level(alignment),
      evidence: compact([
        quote("context") && `Contexto: "${quote("context")?.slice(0, 150)}"`,
        quote("data") && item.short === "Trusted Data" && `Dados: "${quote("data")?.slice(0, 150)}"`,
        quote("finops") && item.short === "FinOps" && `FinOps: "${quote("finops")?.slice(0, 150)}"`,
        meetingEvidence && `Reunião: ${meetingEvidence.summary.slice(0, 150)}`,
        hits > 1 && `Foram encontrados ${hits} sinais relacionados a ${item.short}.`,
      ]),
      action: item.action,
    } satisfies Score;
  }).sort((a, b) => b.alignment - a.alignment);

  const top = scores[0];
  const recommendations = recommendationMap[top.short] || recommendationMap["Trusted Data"];
  const latestMeeting = meetings[0];
  const challengeSummary = latestMeeting?.summary || answers[0]?.answer?.slice(0, 240) || "Contexto inicial em construção; registre uma reunião para gerar inteligência da conta.";
  const nextEngagement = latestMeeting?.insights.nextActions?.[0] || recommendations[2]?.name || "Aprofundar descoberta";
  const priority = top.alignment >= 75 && top.readiness >= 60 ? "Alta" : top.alignment >= 50 ? "Média" : "Baixa";
  return { scores, recommendations, challengeSummary, nextEngagement, priority };
}

function buildAccountMap(discovery: { customerName: string; industry: string; scores: Score[] }, answers: Answer[], meetings: Meeting[]): AccountMap {
  const latest = meetings[0]?.insights;
  const topScores = discovery.scores.slice(0, 4);
  const nodes: AccountNode[] = [
    { id: "account", type: "area", label: discovery.customerName, detail: discovery.industry, strength: 95 },
    ...compact((latest?.stakeholders || [])).map((item, index) => ({ id: `person-${index}`, type: "person" as const, label: item, detail: "Stakeholder identificado em reunião", strength: 82 - index * 5 })),
    ...compact((latest?.systems || [])).map((item, index) => ({ id: `system-${index}`, type: "system" as const, label: item, detail: "Sistema/plataforma citado", strength: 76 - index * 4 })),
    ...compact((latest?.painPoints || [])).map((item, index) => ({ id: `pain-${index}`, type: "pain" as const, label: item, detail: "Dor de negócio ou tecnologia", strength: 88 - index * 5 })),
    ...compact((latest?.risks || [])).slice(0, 3).map((item, index) => ({ id: `risk-${index}`, type: "risk" as const, label: item, detail: "Lacuna para validar antes do CRM", strength: 68 - index * 4 })),
    ...topScores.map((item, index) => ({ id: `cap-${index}`, type: "capability" as const, label: item.short, detail: item.name, strength: item.alignment })),
  ];
  if (!meetings.length) {
    nodes.push(...answers.slice(0, 3).map((item, index) => ({ id: `initiative-${index}`, type: "initiative" as const, label: item.question.slice(0, 48), detail: item.answer.slice(0, 120), strength: 54 + index * 4 })));
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: AccountEdge[] = [
    ...nodes.filter((node) => node.id !== "account" && ["person", "system", "pain", "initiative"].includes(node.type)).map((node) => ({ source: "account", target: node.id, label: node.type === "person" ? "decisor de" : "impacta" } as AccountEdge)),
    ...nodes.filter((node) => node.type === "pain").flatMap((pain) => topScores.slice(0, 2).map((_, index) => ({ source: pain.id, target: `cap-${index}`, label: "possível aderência" as const }))),
    ...nodes.filter((node) => node.type === "risk").map((risk) => ({ source: risk.id, target: "account", label: "risco associado" as const })),
  ].filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)).slice(0, 18);
  return { nodes, edges, updatedAt: new Date().toISOString() };
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS discoveries (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, industry TEXT NOT NULL, company_size TEXT NOT NULL, owner TEXT NOT NULL, stage TEXT NOT NULL, progress INTEGER NOT NULL, priority TEXT NOT NULL, challenge_summary TEXT NOT NULL, answers_json TEXT NOT NULL, scores_json TEXT NOT NULL, recommendations_json TEXT NOT NULL, next_engagement TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, discovery_id TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL, summary TEXT NOT NULL, insights_json TEXT NOT NULL, ai_status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_maps (discovery_id TEXT PRIMARY KEY, nodes_json TEXT NOT NULL, edges_json TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS stakeholders (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, area TEXT NOT NULL, reports_to_id TEXT, influence TEXT NOT NULL, stance TEXT NOT NULL, priorities_json TEXT NOT NULL, notes TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_events (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, evidence_status TEXT NOT NULL, confidence INTEGER NOT NULL, occurred_at TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_entities (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT, confidence INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_memory (discovery_id TEXT PRIMARY KEY, executive_summary TEXT NOT NULL, known_json TEXT NOT NULL, assumptions_json TEXT NOT NULL, gaps_json TEXT NOT NULL, changes_json TEXT NOT NULL, ai_status TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_actions (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, stakeholder_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL, rationale TEXT NOT NULL, next_step TEXT NOT NULL, impact INTEGER NOT NULL, urgency INTEGER NOT NULL, confidence INTEGER NOT NULL, maturity INTEGER NOT NULL, priority_score INTEGER NOT NULL, status TEXT NOT NULL, due_at TEXT, evidence_json TEXT NOT NULL, dedupe_key TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS opportunity_hypotheses (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, capability_key TEXT NOT NULL, title TEXT NOT NULL, problem TEXT NOT NULL, products_json TEXT NOT NULL, stakeholder_ids_json TEXT NOT NULL, evidence_json TEXT NOT NULL, gaps_json TEXT NOT NULL, confidence INTEGER NOT NULL, stage TEXT NOT NULL, next_step TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_plans (discovery_id TEXT PRIMARY KEY, priorities_json TEXT NOT NULL, initiatives_json TEXT NOT NULL, objectives_json TEXT NOT NULL, risks_json TEXT NOT NULL, ecosystem_json TEXT NOT NULL, relationship_json TEXT NOT NULL, plan_30_json TEXT NOT NULL, plan_60_json TEXT NOT NULL, plan_90_json TEXT NOT NULL, approval_status TEXT NOT NULL, suggestion_json TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, r2_key TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS document_chunks (id TEXT PRIMARY KEY, document_id TEXT NOT NULL, discovery_id TEXT NOT NULL, ordinal INTEGER NOT NULL, content TEXT NOT NULL, page INTEGER, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_chat_messages (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, citations_json TEXT NOT NULL, ai_status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS ai_runs (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, agent TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, confidence INTEGER NOT NULL, source_ids_json TEXT NOT NULL, validated INTEGER NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS discoveries_updated_idx ON discoveries(updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS meetings_discovery_created_idx ON meetings(discovery_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS stakeholders_discovery_idx ON stakeholders(discovery_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS stakeholders_reports_to_idx ON stakeholders(reports_to_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS account_events_discovery_idx ON account_events(discovery_id, occurred_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS account_actions_discovery_idx ON account_actions(discovery_id, status, priority_score)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS account_actions_dedupe_idx ON account_actions(discovery_id, dedupe_key)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS opportunity_hypotheses_key_idx ON opportunity_hypotheses(discovery_id, capability_key)"),
    db.prepare("CREATE INDEX IF NOT EXISTS document_chunks_discovery_idx ON document_chunks(discovery_id)"),
  ]);
  await ensureColumn(db, "discoveries", "owner_email", "TEXT");
  await ensureColumn(db, "discoveries", "visibility", "TEXT NOT NULL DEFAULT 'demo'");
  await ensureColumn(db, "discoveries", "last_analyzed_at", "TEXT");
  await ensureColumn(db, "meetings", "scheduled_at", "TEXT");
  await ensureColumn(db, "meetings", "attendees_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "meetings", "objective", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "meetings", "preparation_json", "TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn(db, "meetings", "meeting_status", "TEXT NOT NULL DEFAULT 'completed'");
}

async function ensureColumn(db: D1Database, table: string, column: string, definition: string) {
  const info = await db.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === column)) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

function mapStakeholder(row: Record<string, unknown>): Stakeholder {
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    name: String(row.name),
    role: String(row.role),
    area: String(row.area),
    reportsToId: row.reports_to_id ? String(row.reports_to_id) : null,
    influence: String(row.influence) as Stakeholder["influence"],
    stance: String(row.stance) as Stakeholder["stance"],
    priorities: JSON.parse(String(row.priorities_json || "[]")),
    notes: String(row.notes || ""),
    source: String(row.source || "manual") as Stakeholder["source"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function seedStakeholderTrees(db: D1Database) {
  const discoveries = await db.prepare("SELECT id, industry, created_at FROM discoveries").all<Record<string, unknown>>();
  for (const discovery of discoveries.results) {
    const discoveryId = String(discovery.id);
    const existing = await db.prepare("SELECT COUNT(*) AS count FROM stakeholders WHERE discovery_id = ?").bind(discoveryId).first<{ count: number }>();
    if ((existing?.count || 0) > 0) continue;
    const createdAt = String(discovery.created_at || new Date().toISOString());
    const industry = String(discovery.industry || "negócio").toLowerCase();
    const people = [
      { id: `${discoveryId}-ceo`, name: "CEO (a identificar)", role: "Chief Executive Officer", area: "Diretoria executiva", parent: null, influence: "Alta", stance: "Desconhecido", priorities: ["Crescimento", "Eficiência operacional", `Estratégia de ${industry}`], notes: "Mapeie prioridades executivas, métricas e patrocinadores da transformação." },
      { id: `${discoveryId}-cio`, name: "CIO (a identificar)", role: "Chief Information Officer", area: "Tecnologia", parent: `${discoveryId}-ceo`, influence: "Alta", stance: "Neutro", priorities: ["FinOps", "Trusted Data", "Hybrid Cloud"], notes: "Validar agenda de dados, cloud, governança e investimento tecnológico." },
      { id: `${discoveryId}-cto`, name: "CTO (a identificar)", role: "Chief Technology Officer", area: "Arquitetura e engenharia", parent: `${discoveryId}-ceo`, influence: "Alta", stance: "Neutro", priorities: ["App Modernization", "Automation", "Arquitetura híbrida"], notes: "Entender dependências técnicas, plataformas e capacidade de execução." },
    ] as const;
    for (const person of people) {
      await db.prepare("INSERT OR IGNORE INTO stakeholders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(person.id, discoveryId, person.name, person.role, person.area, person.parent, person.influence, person.stance, JSON.stringify(person.priorities), person.notes, "suggested", createdAt, createdAt).run();
    }
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)")
      .bind(discoveryId, "stakeholder", "Organograma inicial sugerido para validação humana", createdAt).run();
  }
}

async function seed(db: D1Database) {
  const count = await db.prepare("SELECT COUNT(*) AS count FROM discoveries").first<{ count: number }>();
  const now = new Date();
  const examples = [
    { id: "aurora-retail", name: "Aurora Retail Group", industry: "Varejo", size: "Enterprise", answers: [
      { key: "context", question: "Qual evento de negócio abriu essa conversa?", answer: "Reduzir o custo operacional do e-commerce e recuperar previsibilidade dos investimentos em cloud sem comprometer a experiência do cliente.", at: new Date(now.getTime() - 46e5).toISOString() },
      { key: "landscape", question: "Como está organizado o ambiente de tecnologia e nuvem hoje?", answer: "Operamos em AWS e Azure, além de aplicações legadas no datacenter. O rateio por unidade e produto é pouco confiável.", at: new Date(now.getTime() - 42e5).toISOString() },
      { key: "finops", question: "Onde existem sinais de desperdício, risco ou falta de previsibilidade?", answer: "A fatura cloud cresceu 34%, existem recursos ociosos e não temos forecast nem accountability clara entre finanças e engenharia.", at: new Date(now.getTime() - 38e5).toISOString() },
    ] as Answer[], meeting: "Reunião com CFO e engenharia. O CFO quer previsibilidade trimestral e o time técnico citou AWS, Azure, recursos ociosos e dificuldade de rateio por produto." },
    { id: "banco-horizonte", name: "Banco Horizonte", industry: "Serviços financeiros", size: "Enterprise", answers: [
      { key: "context", question: "Qual evento de negócio abriu essa conversa?", answer: "Acelerar casos de IA generativa com dados confiáveis e controles compatíveis com o ambiente regulado.", at: new Date(now.getTime() - 864e5).toISOString() },
      { key: "data", question: "O que impede o uso confiável de dados?", answer: "Linhas de negócio não confiam na qualidade, a linhagem é parcial e o catálogo não cobre dados sensíveis.", at: new Date(now.getTime() - 720e5).toISOString() },
    ] as Answer[], meeting: "CIO e líder de dados querem levar GenAI para atendimento, mas a arquitetura tem lakehouse, mainframe e catálogo incompleto. CISO pediu auditoria de modelos e controle LGPD." },
    { id: "novalog", name: "NovaLog", industry: "Logística", size: "Large", answers: [
      { key: "context", question: "Qual evento de negócio abriu essa conversa?", answer: "Melhorar produtividade da operação e reduzir atrasos causados por processos manuais.", at: new Date(now.getTime() - 2 * 864e5).toISOString() },
    ] as Answer[], meeting: "Operações relatou processos manuais entre transporte, armazém e clientes. Há integrações ponto a ponto e baixa visibilidade de custo por rota." },
    { id: "solaris-energia", name: "Solaris Energia", industry: "Energia", size: "Enterprise", answers: [
      { key: "context", question: "Qual evento de negócio abriu essa conversa?", answer: "Criar uma fundação de dados industriais segura para analytics e manutenção preditiva.", at: new Date(now.getTime() - 3 * 864e5).toISOString() },
      { key: "data", question: "O que impede o uso confiável de dados?", answer: "Falta governança comum, catálogo e qualidade consistente entre dados industriais e corporativos.", at: new Date(now.getTime() - 2.4 * 864e5).toISOString() },
    ] as Answer[], meeting: "Dados OT e IT estão distribuídos entre plantas, cloud e sistemas de fornecedores. O sponsor quer analytics confiável e segurança para dados industriais." },
  ];

  if ((count?.count || 0) > 0) {
    const meetingCount = await db.prepare("SELECT COUNT(*) AS count FROM meetings").first<{ count: number }>();
    if ((meetingCount?.count || 0) > 0) return;
    const existing = await db.prepare("SELECT * FROM discoveries").all();
    for (const row of existing.results as Record<string, unknown>[]) {
      const id = String(row.id);
      const customerName = String(row.customer_name);
      const industry = String(row.industry || "Indústria não informada");
      const answers = JSON.parse(String(row.answers_json || "[]")) as Answer[];
      const currentScores = JSON.parse(String(row.scores_json || "[]")) as Score[];
      const notes = [
        `Contexto legado de ${customerName}.`,
        String(row.challenge_summary || ""),
        ...answers.map((item) => `${item.question}: ${item.answer}`),
      ].filter(Boolean).join(" ");
      const insight = fallbackMeetingInsights(notes, customerName);
      const createdAt = String(row.updated_at || row.created_at || now.toISOString());
      const meeting: Meeting = {
        id: `${id}-legacy-intelligence`,
        discoveryId: id,
        title: "Contexto migrado para Account Intelligence",
        notes,
        summary: insight.summary,
        insights: insight,
        aiStatus: "fallback",
        createdAt,
      };
      const result = analyze(answers, [meeting]);
      const accountMap = buildAccountMap({ customerName, industry, scores: currentScores.length ? currentScores : result.scores }, answers, [meeting]);
      await db.prepare("INSERT OR IGNORE INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(meeting.id, meeting.discoveryId, meeting.title, meeting.notes, meeting.summary, JSON.stringify(meeting.insights), meeting.aiStatus, meeting.createdAt).run();
      await db.prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)")
        .bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
      await db.prepare("UPDATE discoveries SET challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?")
        .bind(result.challengeSummary, JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, createdAt, id).run();
      await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)")
        .bind(id, "migration", "Registro legado enriquecido para Account Intelligence v2 com fallback determinístico", createdAt).run();
    }
    return;
  }

  for (const example of examples) {
    const insight = fallbackMeetingInsights(example.meeting, example.name);
    const meeting: Meeting = {
      id: `${example.id}-meeting-1`,
      discoveryId: example.id,
      title: "Reunião de contexto inicial",
      notes: example.meeting,
      summary: insight.summary,
      insights: insight,
      aiStatus: insight.aiStatus,
      createdAt: example.answers.at(-1)?.at || now.toISOString(),
    };
    const result = analyze(example.answers, [meeting]);
    const updated = meeting.createdAt;
    await db.prepare("INSERT INTO discoveries (id, customer_name, industry, company_size, owner, stage, progress, priority, challenge_summary, answers_json, scores_json, recommendations_json, next_engagement, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(example.id, example.name, example.industry, example.size, "Mariana Costa", example.answers.length >= 5 ? "Qualificação pré-CRM" : "Account intelligence", Math.min(100, 20 + example.answers.length * 12 + 22), result.priority, result.challengeSummary, JSON.stringify(example.answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now.toISOString(), updated).run();
    await db.prepare("INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(meeting.id, meeting.discoveryId, meeting.title, meeting.notes, meeting.summary, JSON.stringify(meeting.insights), meeting.aiStatus, meeting.createdAt).run();
    const accountMap = buildAccountMap({ customerName: example.name, industry: example.industry, scores: result.scores }, example.answers, [meeting]);
    await db.prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(example.id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(example.id, "meeting", `Reunião analisada por ${meeting.aiStatus === "watsonx" ? "watsonx" : "fallback determinístico"}`, updated).run();
  }
}

const json = <T,>(value: unknown, fallback: T): T => {
  try { return JSON.parse(String(value ?? "")) as T; } catch { return fallback; }
};

function mapMeeting(row: Record<string, unknown>): Meeting & { scheduledAt: string | null; attendees: string[]; objective: string; preparation: Record<string, unknown>; meetingStatus: string } {
  const insights = json<MeetingInsight>(row.insights_json, fallbackMeetingInsights(String(row.notes || ""), "a conta"));
  return {
    id: String(row.id), discoveryId: String(row.discovery_id), title: String(row.title), notes: String(row.notes || ""),
    summary: String(row.summary || ""), insights: { ...insights, aiStatus: (row.ai_status as MeetingInsight["aiStatus"]) || insights.aiStatus || "fallback" },
    aiStatus: (row.ai_status as Meeting["aiStatus"]) || "fallback", createdAt: String(row.created_at),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null, attendees: json<string[]>(row.attendees_json, []),
    objective: String(row.objective || ""), preparation: json<Record<string, unknown>>(row.preparation_json, {}), meetingStatus: String(row.meeting_status || "completed"),
  };
}

function mapAccountEvent(row: Record<string, unknown>): AccountEvent {
  return { id: String(row.id), discoveryId: String(row.discovery_id), type: String(row.type), title: String(row.title), content: String(row.content), sourceType: String(row.source_type), sourceId: row.source_id ? String(row.source_id) : null, evidenceStatus: String(row.evidence_status) as AccountEvent["evidenceStatus"], confidence: Number(row.confidence), occurredAt: String(row.occurred_at), createdAt: String(row.created_at) };
}

function mapMemory(row?: Record<string, unknown> | null): AccountMemory | null {
  if (!row) return null;
  return { executiveSummary: String(row.executive_summary), known: json<string[]>(row.known_json, []), assumptions: json<string[]>(row.assumptions_json, []), gaps: json<string[]>(row.gaps_json, []), changes: json<string[]>(row.changes_json, []), aiStatus: String(row.ai_status) as AccountMemory["aiStatus"], version: Number(row.version), updatedAt: String(row.updated_at) };
}

function mapAction(row: Record<string, unknown>): AccountAction {
  return { id: String(row.id), discoveryId: String(row.discovery_id), stakeholderId: row.stakeholder_id ? String(row.stakeholder_id) : null, type: String(row.type), title: String(row.title), rationale: String(row.rationale), nextStep: String(row.next_step), impact: Number(row.impact), urgency: Number(row.urgency), confidence: Number(row.confidence), maturity: Number(row.maturity), priorityScore: Number(row.priority_score), status: String(row.status), dueAt: row.due_at ? String(row.due_at) : null, evidence: json<EvidenceRef[]>(row.evidence_json, []), dedupeKey: String(row.dedupe_key), evidenceFingerprint: String(row.evidence_fingerprint), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapHypothesis(row: Record<string, unknown>): Hypothesis {
  return { id: String(row.id), discoveryId: String(row.discovery_id), capabilityKey: String(row.capability_key), title: String(row.title), problem: String(row.problem), products: json<string[]>(row.products_json, []), stakeholderIds: json<string[]>(row.stakeholder_ids_json, []), evidence: json<EvidenceRef[]>(row.evidence_json, []), gaps: json<string[]>(row.gaps_json, []), confidence: Number(row.confidence), stage: String(row.stage), nextStep: String(row.next_step), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapPlan(row?: Record<string, unknown> | null): AccountPlan | null {
  if (!row) return null;
  return { discoveryId: String(row.discovery_id), priorities: json<string[]>(row.priorities_json, []), initiatives: json<string[]>(row.initiatives_json, []), objectives: json<string[]>(row.objectives_json, []), risks: json<string[]>(row.risks_json, []), ecosystem: json<string[]>(row.ecosystem_json, []), relationship: json<string[]>(row.relationship_json, []), plan30: json<string[]>(row.plan_30_json, []), plan60: json<string[]>(row.plan_60_json, []), plan90: json<string[]>(row.plan_90_json, []), approvalStatus: String(row.approval_status), suggestion: json<Record<string, string[]>>(row.suggestion_json, {}), updatedAt: String(row.updated_at) };
}

function mapDiscovery(row: Record<string, unknown>, meetings: Meeting[], accountMap?: AccountMap) {
  const answers = json<Answer[]>(row.answers_json, []); const scores = json<Score[]>(row.scores_json, []);
  return { id: String(row.id), customerName: String(row.customer_name), industry: String(row.industry), companySize: String(row.company_size), owner: String(row.owner), ownerEmail: row.owner_email ? String(row.owner_email) : null, visibility: String(row.visibility || "demo"), stage: String(row.stage), progress: Number(row.progress), priority: String(row.priority), challengeSummary: String(row.challenge_summary), answers, meetings, accountMap: accountMap || buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores }, answers, meetings), aiMode: meetings[0]?.aiStatus || "fallback", scores, recommendations: json<Recommendation[]>(row.recommendations_json, []), nextEngagement: String(row.next_engagement), lastAnalyzedAt: row.last_analyzed_at ? String(row.last_analyzed_at) : null, updatedAt: String(row.updated_at) };
}

function requestIdentity(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || "";
  const allowed = String((env as unknown as Record<string, unknown>).PRIVATE_ALLOWED_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return { email, allowed: !allowed.length || allowed.includes(email) };
}

function scopeFor(request: Request, body?: Record<string, unknown>) {
  return String(body?.scope || new URL(request.url).searchParams.get("scope") || "demo") === "private" ? "private" : "demo";
}

function privateGate(request: Request) {
  const identity = requestIdentity(request);
  if (!identity.email) return Response.json({ error: "Faça login com ChatGPT para acessar o workspace privado." }, { status: 401 });
  if (!identity.allowed) return Response.json({ error: "Este e-mail não está autorizado para o workspace." }, { status: 403 });
  return null;
}

async function accountForMutation(db: D1Database, id: string, request: Request) {
  const identity = requestIdentity(request);
  const row = await db.prepare("SELECT * FROM discoveries WHERE id = ? AND visibility = 'private' AND owner_email = ?").bind(id, identity.email).first<Record<string, unknown>>();
  return row || null;
}

async function addEvent(db: D1Database, input: Omit<AccountEvent, "createdAt"> & { createdAt?: string }) {
  const createdAt = input.createdAt || new Date().toISOString();
  await db.prepare("INSERT OR REPLACE INTO account_events (id, discovery_id, type, title, content, source_type, source_id, evidence_status, confidence, occurred_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(input.id, input.discoveryId, input.type, input.title, input.content, input.sourceType, input.sourceId, input.evidenceStatus, input.confidence, input.occurredAt, createdAt).run();
}

export async function recomputeAccount(db: D1Database, id: string) {
  const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return;
  const [eventRows, stakeholderRows, previousMemory] = await Promise.all([
    db.prepare("SELECT * FROM account_events WHERE discovery_id = ? ORDER BY occurred_at DESC").bind(id).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at ASC").bind(id).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM account_memory WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>(),
  ]);
  const events = eventRows.results.map(mapAccountEvent); const stakeholders = stakeholderRows.results.map(mapStakeholder); const scores = json<Score[]>(row.scores_json, initialScores());
  let memory = buildMemory(String(row.customer_name), String(row.challenge_summary), events, scores, Number(previousMemory?.version || 0));
  const generatedMemory = await aiAdapter().analyzeAccount(JSON.stringify({ customer: row.customer_name, currentSummary: row.challenge_summary, sources: events.slice(0, 30), scores: scores.slice(0, 6), stakeholders }));
  if (generatedMemory && typeof generatedMemory.executiveSummary === "string") memory = { ...memory, executiveSummary: generatedMemory.executiveSummary, known: compact(Array.isArray(generatedMemory.known) ? generatedMemory.known.map(String) : memory.known), assumptions: compact(Array.isArray(generatedMemory.assumptions) ? generatedMemory.assumptions.map(String) : memory.assumptions), gaps: compact(Array.isArray(generatedMemory.gaps) ? generatedMemory.gaps.map(String) : memory.gaps), changes: compact(Array.isArray(generatedMemory.changes) ? generatedMemory.changes.map(String) : memory.changes), aiStatus: "watsonx" };
  const hypotheses = buildHypotheses(scores, events, stakeholders); const actions = buildActions({ id, customerName: String(row.customer_name), progress: Number(row.progress), updatedAt: String(row.updated_at) }, events, scores, stakeholders, hypotheses);
  await db.prepare("INSERT OR REPLACE INTO account_memory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, memory.executiveSummary, JSON.stringify(memory.known), JSON.stringify(memory.assumptions), JSON.stringify(memory.gaps), JSON.stringify(memory.changes), memory.aiStatus, memory.version, memory.updatedAt).run();
  for (const item of hypotheses) {
    const existing = await db.prepare("SELECT id, created_at FROM opportunity_hypotheses WHERE discovery_id = ? AND capability_key = ?").bind(id, item.capabilityKey).first<Record<string, unknown>>();
    await db.prepare("INSERT OR REPLACE INTO opportunity_hypotheses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(String(existing?.id || `hyp-${id}-${item.capabilityKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`), id, item.capabilityKey, item.title, item.problem, JSON.stringify(item.products), JSON.stringify(item.stakeholderIds), JSON.stringify(item.evidence), JSON.stringify(item.gaps), item.confidence, item.stage, item.nextStep, String(existing?.created_at || memory.updatedAt), memory.updatedAt).run();
  }
  for (const item of actions) {
    const existing = await db.prepare("SELECT * FROM account_actions WHERE discovery_id = ? AND dedupe_key = ?").bind(id, item.dedupeKey).first<Record<string, unknown>>();
    const unchangedDiscard = String(existing?.status || "") === "discarded" && String(existing?.evidence_fingerprint || "") === item.evidenceFingerprint;
    const status = unchangedDiscard ? "discarded" : String(existing?.status || "proposal") === "discarded" ? "proposal" : String(existing?.status || "proposal");
    await db.prepare("INSERT OR REPLACE INTO account_actions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(String(existing?.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`), id, item.stakeholderId, item.type, item.title, item.rationale, item.nextStep, item.impact, item.urgency, item.confidence, item.maturity, item.priorityScore, status, item.dueAt, JSON.stringify(item.evidence), item.dedupeKey, item.evidenceFingerprint, String(existing?.created_at || memory.updatedAt), memory.updatedAt).run();
  }
  const plan = await db.prepare("SELECT discovery_id FROM account_plans WHERE discovery_id = ?").bind(id).first();
  if (!plan) {
    const suggestion = suggestAccountPlan(memory, hypotheses, actions, stakeholders);
    await db.prepare("INSERT INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "draft", JSON.stringify(suggestion), memory.updatedAt).run();
  }
  await db.prepare("INSERT INTO ai_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, id, "account-orchestrator", memory.aiStatus === "watsonx" ? "ibm-watsonx" : "deterministic-fallback", "completed", memory.aiStatus === "watsonx" ? 82 : 72, JSON.stringify(events.slice(0, 10).map((item) => item.id)), 0, "Memória, hipóteses e fila recalculadas; revisão humana necessária.", memory.updatedAt).run();
  await db.prepare("UPDATE discoveries SET last_analyzed_at = ? WHERE id = ?").bind(memory.updatedAt, id).run();
}

async function backfillV4(db: D1Database) {
  const rows = await db.prepare("SELECT * FROM discoveries").all<Record<string, unknown>>();
  for (const row of rows.results) {
    const id = String(row.id); const existing = await db.prepare("SELECT COUNT(*) AS count FROM account_events WHERE discovery_id = ?").bind(id).first<{ count: number }>();
    if ((existing?.count || 0) === 0) {
      for (const answer of json<Answer[]>(row.answers_json, [])) await addEvent(db, { id: `evt-${id}-answer-${answer.key}`, discoveryId: id, type: answer.key === "pain" ? "pain" : "discovery_answer", title: answer.question, content: answer.answer, sourceType: "answer", sourceId: answer.key, evidenceStatus: "confirmed", confidence: 82, occurredAt: answer.at || String(row.updated_at) });
      const meetings = await db.prepare("SELECT * FROM meetings WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>();
      for (const meeting of meetings.results) await addEvent(db, { id: `evt-${id}-${String(meeting.id)}`, discoveryId: id, type: String(meeting.meeting_status || "") === "scheduled" ? "scheduled_meeting" : "meeting", title: String(meeting.title), content: String(meeting.summary || meeting.notes), sourceType: "meeting", sourceId: String(meeting.id), evidenceStatus: "confirmed", confidence: 86, occurredAt: String(meeting.scheduled_at || meeting.created_at) });
      const stakeholders = await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>();
      for (const stakeholder of stakeholders.results) await addEvent(db, { id: `evt-${id}-${String(stakeholder.id)}`, discoveryId: id, type: "stakeholder", title: `${String(stakeholder.name)} · ${String(stakeholder.role)}`, content: `${String(stakeholder.notes || "")} Prioridades: ${json<string[]>(stakeholder.priorities_json, []).join(", ")}`, sourceType: "stakeholder", sourceId: String(stakeholder.id), evidenceStatus: String(stakeholder.source) === "manual" ? "confirmed" : "assumption", confidence: String(stakeholder.source) === "manual" ? 88 : 52, occurredAt: String(stakeholder.updated_at) });
    }
    const memory = await db.prepare("SELECT discovery_id FROM account_memory WHERE discovery_id = ?").bind(id).first();
    if (!memory) await recomputeAccount(db, id);
  }
}

async function accountPayload(db: D1Database, discoveryRows: Record<string, unknown>[]) {
  const ids = discoveryRows.map((row) => String(row.id));
  if (!ids.length) return { discoveries: [], meetings: [], stakeholders: [], events: [], accountEvents: [], actions: [], hypotheses: [], memories: [], plans: [], documents: [], chats: [], aiRuns: [] };
  const placeholders = ids.map(() => "?").join(",");
  const queries = [
    db.prepare(`SELECT * FROM meetings WHERE discovery_id IN (${placeholders}) ORDER BY COALESCE(scheduled_at, created_at) DESC`).bind(...ids), db.prepare(`SELECT * FROM account_maps WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM stakeholders WHERE discovery_id IN (${placeholders}) ORDER BY created_at`).bind(...ids), db.prepare(`SELECT * FROM audit_events WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`).bind(...ids), db.prepare(`SELECT * FROM account_events WHERE discovery_id IN (${placeholders}) ORDER BY occurred_at DESC`).bind(...ids), db.prepare(`SELECT * FROM account_actions WHERE discovery_id IN (${placeholders}) ORDER BY priority_score DESC`).bind(...ids), db.prepare(`SELECT * FROM opportunity_hypotheses WHERE discovery_id IN (${placeholders}) ORDER BY confidence DESC`).bind(...ids), db.prepare(`SELECT * FROM account_memory WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM account_plans WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM documents WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`).bind(...ids), db.prepare(`SELECT * FROM account_chat_messages WHERE discovery_id IN (${placeholders}) ORDER BY created_at`).bind(...ids), db.prepare(`SELECT * FROM ai_runs WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`).bind(...ids),
  ];
  const [meetingRows, mapRows, stakeholderRows, auditRows, eventRows, actionRows, hypothesisRows, memoryRows, planRows, documentRows, chatRows, aiRunRows] = await Promise.all(queries.map((query) => query.all<Record<string, unknown>>()));
  const meetings = meetingRows.results.map(mapMeeting); const maps = new Map(mapRows.results.map((row) => [String(row.discovery_id), { nodes: json<AccountNode[]>(row.nodes_json, []), edges: json<AccountEdge[]>(row.edges_json, []), updatedAt: String(row.updated_at) } as AccountMap]));
  return {
    discoveries: discoveryRows.map((row) => mapDiscovery(row, meetings.filter((item) => item.discoveryId === String(row.id)), maps.get(String(row.id)))), meetings,
    stakeholders: stakeholderRows.results.map(mapStakeholder), events: auditRows.results.map((row) => ({ id: row.id, discoveryId: row.discovery_id, type: row.type, detail: row.detail, createdAt: row.created_at })),
    accountEvents: eventRows.results.map(mapAccountEvent), actions: actionRows.results.map(mapAction), hypotheses: hypothesisRows.results.map(mapHypothesis), memories: memoryRows.results.map((row) => ({ discoveryId: String(row.discovery_id), ...mapMemory(row)! })), plans: planRows.results.map((row) => mapPlan(row)!),
    documents: documentRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), name: String(row.name), contentType: String(row.content_type), sizeBytes: Number(row.size_bytes), status: String(row.status), summary: String(row.summary), createdAt: String(row.created_at) } satisfies AccountDocument)),
    chats: chatRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), role: String(row.role), content: String(row.content), citations: json<EvidenceRef[]>(row.citations_json, []), aiStatus: String(row.ai_status), createdAt: String(row.created_at) })),
    aiRuns: aiRunRows.results.map((row) => ({ id: row.id, discoveryId: row.discovery_id, agent: row.agent, provider: row.provider, status: row.status, confidence: row.confidence, sources: json<string[]>(row.source_ids_json, []), validated: Boolean(row.validated), detail: row.detail, createdAt: row.created_at })),
  };
}

export async function GET(request: Request) {
  const db = (env as unknown as { DB: D1Database }).DB; await ensureSchema(db); await seed(db); await seedStakeholderTrees(db); await backfillV4(db);
  const scope = scopeFor(request); let rows;
  if (scope === "private") {
    const denied = privateGate(request); if (denied) return denied; const { email } = requestIdentity(request);
    rows = await db.prepare("SELECT * FROM discoveries WHERE visibility = 'private' AND owner_email = ? ORDER BY updated_at DESC").bind(email).all<Record<string, unknown>>();
    for (const row of rows.results) { const last = row.last_analyzed_at ? new Date(String(row.last_analyzed_at)).getTime() : 0; if (Date.now() - last > 12 * 3600000) await recomputeAccount(db, String(row.id)); }
  } else rows = await db.prepare("SELECT * FROM discoveries WHERE visibility = 'demo' OR visibility IS NULL ORDER BY updated_at DESC").all<Record<string, unknown>>();
  const accountId = new URL(request.url).searchParams.get("accountId");
  return Response.json(await accountPayload(db, accountId ? rows.results.filter((row) => String(row.id) === accountId) : rows.results));
}

const list = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : String(value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);

export async function POST(request: Request) {
  const db = (env as unknown as { DB: D1Database }).DB; await ensureSchema(db); const body = await request.json() as Record<string, unknown>; const scope = scopeFor(request, body);
  if (scope !== "private") return Response.json({ error: "A demonstração pública é somente leitura. Entre no workspace para salvar dados reais." }, { status: 403 });
  const denied = privateGate(request); if (denied) return denied; const identity = requestIdentity(request); const now = new Date().toISOString();
  if (body.action === "create") {
    const name = String(body.customerName || "").trim(); if (!name) return Response.json({ error: "Informe o nome da conta." }, { status: 400 });
    const id = `cdi-${Date.now()}`; const scores = initialScores(); const accountMap = buildAccountMap({ customerName: name, industry: String(body.industry || "Não informado"), scores }, [], []);
    await db.prepare("INSERT INTO discoveries (id, customer_name, industry, company_size, owner, stage, progress, priority, challenge_summary, answers_json, scores_json, recommendations_json, next_engagement, created_at, updated_at, owner_email, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, name, String(body.industry || "Não informado"), String(body.companySize || "Enterprise"), identity.email.split("@")[0], "Account intelligence", 8, "Baixa", "Conta criada. Adicione uma informação para iniciar a memória.", "[]", JSON.stringify(scores), "[]", "Registrar primeira informação", now, now, identity.email, "private").run();
    await db.prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), now).run();
    await addEvent(db, { id: `evt-${id}-created`, discoveryId: id, type: "account_created", title: "Conta adicionada ao workspace", content: `Conta ${name} criada para inteligência antes do CRM.`, sourceType: "system", sourceId: id, evidenceStatus: "confirmed", confidence: 100, occurredAt: now }); await seedStakeholderTrees(db); await recomputeAccount(db, id);
    return Response.json({ ok: true, id }, { status: 201 });
  }
  const id = String(body.id || ""); const row = await accountForMutation(db, id, request); if (!row) return Response.json({ error: "Conta não encontrada ou acesso não autorizado." }, { status: 404 });
  if (body.action === "answer") {
    const answers = json<Answer[]>(row.answers_json, []); const next = { key: String(body.key), question: String(body.question), answer: String(body.answer), at: now }; const index = answers.findIndex((item) => item.key === next.key); if (index >= 0) answers[index] = next; else answers.push(next);
    const meetingRows = await db.prepare("SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>(); const meetings = meetingRows.results.map(mapMeeting); const result = analyze(answers, meetings); const progress = Math.min(100, 16 + answers.length * 10 + meetings.length * 18);
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, answers_json = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?").bind(meetings.length ? "Qualificação pré-CRM" : "Account intelligence", progress, result.priority, result.challengeSummary, JSON.stringify(answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run();
    await addEvent(db, { id: `evt-${id}-answer-${next.key}`, discoveryId: id, type: next.key === "pain" ? "pain" : "discovery_answer", title: next.question, content: next.answer, sourceType: "answer", sourceId: next.key, evidenceStatus: "confirmed", confidence: 86, occurredAt: now }); await recomputeAccount(db, id); return Response.json({ ok: true });
  }
  if (body.action === "meeting") {
    const notes = String(body.notes || "").trim(); if (!notes) return Response.json({ error: "As notas da reunião são obrigatórias." }, { status: 400 }); let insights: MeetingInsight;
    try { insights = await getWatsonxInsights(notes, String(row.customer_name), String(row.industry)) || fallbackMeetingInsights(notes, String(row.customer_name)); } catch { insights = { ...fallbackMeetingInsights(notes, String(row.customer_name)), aiStatus: "error" }; }
    const meetingId = `mtg-${Date.now()}`; const title = String(body.title || "Reunião registrada");
    await db.prepare("INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(meetingId, id, title, notes, insights.summary, JSON.stringify(insights), insights.aiStatus, now, null, JSON.stringify(list(body.attendees)), String(body.objective || ""), JSON.stringify({ questions: insights.nextQuestions, risks: insights.risks, themes: insights.ibmThemes }), "completed").run();
    await addEvent(db, { id: `evt-${id}-${meetingId}`, discoveryId: id, type: "meeting", title, content: `${insights.summary} ${insights.signals.join(" ")}`, sourceType: "meeting", sourceId: meetingId, evidenceStatus: "confirmed", confidence: insights.aiStatus === "watsonx" ? 90 : 78, occurredAt: now }); const answers = json<Answer[]>(row.answers_json, []); const allMeetings = (await db.prepare("SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>()).results.map(mapMeeting); const result = analyze(answers, allMeetings); const progress = Math.min(100, 20 + answers.length * 10 + allMeetings.length * 18); const map = buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores: result.scores }, answers, allMeetings);
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?").bind(allMeetings.length >= 2 && result.priority !== "Baixa" ? "Pronto para handoff" : "Qualificação pré-CRM", progress, result.priority, result.challengeSummary, JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run(); await db.prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(map.nodes), JSON.stringify(map.edges), now).run(); await recomputeAccount(db, id); return Response.json({ ok: true, aiStatus: insights.aiStatus });
  }
  if (body.action === "information") {
    const kind = String(body.kind || "note"); const title = String(body.title || "Nova informação").trim(); const content = String(body.content || "").trim(); if (!content) return Response.json({ error: "Descreva a informação." }, { status: 400 }); const occurredAt = String(body.occurredAt || now); const eventId = `evt-${id}-${Date.now()}`; const status = ["confirmed", "assumption", "gap", "stale"].includes(String(body.evidenceStatus)) ? String(body.evidenceStatus) as AccountEvent["evidenceStatus"] : "confirmed";
    await addEvent(db, { id: eventId, discoveryId: id, type: kind, title, content, sourceType: "manual", sourceId: eventId, evidenceStatus: status, confidence: status === "confirmed" ? 88 : status === "assumption" ? 55 : 70, occurredAt });
    if (["initiative", "system", "pain", "risk", "objective", "partner", "competitor"].includes(kind)) await db.prepare("INSERT INTO account_entities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`ent-${Date.now()}`, id, kind, title, content, "active", "manual", eventId, status === "confirmed" ? 88 : 55, now, now).run();
    if (kind === "scheduled_meeting") { const meetingId = `mtg-${Date.now()}`; const fallback = fallbackMeetingInsights(content, String(row.customer_name)); await db.prepare("INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(meetingId, id, title, "", content, JSON.stringify(fallback), "fallback", now, occurredAt, JSON.stringify(list(body.attendees)), content, JSON.stringify({ questions: fallback.nextQuestions, risks: fallback.risks, themes: fallback.ibmThemes }), "scheduled").run(); }
    await db.prepare("UPDATE discoveries SET updated_at = ? WHERE id = ?").bind(now, id).run(); await recomputeAccount(db, id); return Response.json({ ok: true, eventId });
  }
  if (body.action === "ask") {
    const question = String(body.question || "").trim(); if (!question) return Response.json({ error: "Digite uma pergunta." }, { status: 400 }); const eventRows = await db.prepare("SELECT * FROM account_events WHERE discovery_id = ? ORDER BY occurred_at DESC").bind(id).all<Record<string, unknown>>(); const chunkRows = await db.prepare("SELECT document_id, content, page, created_at FROM document_chunks WHERE discovery_id = ? ORDER BY ordinal LIMIT 30").bind(id).all<Record<string, unknown>>(); const evidenceEvents = [...eventRows.results.map(mapAccountEvent), ...chunkRows.results.map((chunk, index) => ({ id: `chunk-${index}`, discoveryId: id, type: "document", title: `Documento${chunk.page ? ` · pág. ${chunk.page}` : ""}`, content: String(chunk.content), sourceType: "document", sourceId: String(chunk.document_id), evidenceStatus: "confirmed" as const, confidence: 82, occurredAt: String(chunk.created_at), createdAt: String(chunk.created_at) }))]; const stakeholders = (await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapStakeholder); let result: { answer: string; citations: EvidenceRef[]; confidence: number; aiStatus: "watsonx" | "fallback"; suggestedActions: string[] } = answerFromEvidence(question, String(row.customer_name), evidenceEvents, json<Score[]>(row.scores_json, []), stakeholders); const generatedAnswer = await aiAdapter().answerQuestion(JSON.stringify({ customer: row.customer_name, sources: result.citations, context: evidenceEvents.slice(0, 15), stakeholders, scores: json<Score[]>(row.scores_json, []).slice(0, 4) }), question); if (generatedAnswer) result = { ...result, answer: String(generatedAnswer.answer), confidence: Math.max(0, Math.min(100, Number(generatedAnswer.confidence || result.confidence))), aiStatus: "watsonx", suggestedActions: Array.isArray(generatedAnswer.suggestedActions) ? generatedAnswer.suggestedActions.map(String).slice(0, 4) : result.suggestedActions }; const userId = `chat-${Date.now()}-u`; const assistantId = `chat-${Date.now()}-a`;
    await db.batch([db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(userId, id, "user", question, "[]", "human", now), db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(assistantId, id, "assistant", result.answer, JSON.stringify(result.citations), result.aiStatus, now), db.prepare("INSERT INTO ai_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`run-${Date.now()}-ask`, id, "account-copilot", "deterministic-fallback", "completed", result.confidence, JSON.stringify(result.citations.map((item) => item.sourceId)), 0, "Resposta fundamentada; não altera dados.", now)]); return Response.json(result);
  }
  if (body.action === "action_status") { const allowed = ["proposal", "accepted", "in_progress", "completed", "discarded"]; const status = String(body.status); if (!allowed.includes(status)) return Response.json({ error: "Status inválido." }, { status: 400 }); await db.prepare("UPDATE account_actions SET status = ?, updated_at = ? WHERE id = ? AND discovery_id = ?").bind(status, now, String(body.actionId), id).run(); return Response.json({ ok: true }); }
  if (["plan_save", "plan_apply", "plan_suggest"].includes(String(body.action))) {
    const memory = mapMemory(await db.prepare("SELECT * FROM account_memory WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>()) || buildMemory(String(row.customer_name), String(row.challenge_summary), [], json<Score[]>(row.scores_json, [])); const hypotheses = (await db.prepare("SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapHypothesis); const actions = (await db.prepare("SELECT * FROM account_actions WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapAction); const stakeholders = (await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapStakeholder); const current = mapPlan(await db.prepare("SELECT * FROM account_plans WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>()); let suggestion = body.action === "plan_suggest" ? suggestAccountPlan(memory, hypotheses.map((item) => ({ ...item, stage: item.stage as "draft" | "validating" | "qualified" | "rejected" })), actions, stakeholders) : current?.suggestion || {}; if (body.action === "plan_suggest") { const generated = await aiAdapter().suggestAccountPlan(JSON.stringify({ customer: row.customer_name, memory, hypotheses, actions, stakeholders, humanPlan: current })); if (generated) suggestion = Object.fromEntries(["priorities", "initiatives", "objectives", "risks", "ecosystem", "relationship", "plan30", "plan60", "plan90"].map((key) => [key, Array.isArray(generated[key]) ? (generated[key] as unknown[]).map(String).slice(0, 8) : suggestion[key as keyof typeof suggestion] || []])); }
    const source = body.action === "plan_apply" ? suggestion : body; const values = ["priorities", "initiatives", "objectives", "risks", "ecosystem", "relationship", "plan30", "plan60", "plan90"].map((key) => list((source as Record<string, unknown>)[key] ?? (current as unknown as Record<string, unknown> | null)?.[key])); await db.prepare("INSERT OR REPLACE INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, ...values.map((value) => JSON.stringify(value)), body.action === "plan_apply" ? "human-approved" : body.action === "plan_save" ? "human-edited" : String(current?.approvalStatus || "draft"), JSON.stringify(suggestion), now).run(); return Response.json({ ok: true, suggestion });
  }
  if (body.action === "analyze") { const last = row.last_analyzed_at ? new Date(String(row.last_analyzed_at)).getTime() : 0; if (body.force || Date.now() - last > 12 * 3600000) await recomputeAccount(db, id); return Response.json({ ok: true }); }
  if (body.action === "stakeholder_upsert") {
    const stakeholderId = String(body.stakeholderId || `stk-${Date.now()}`); const name = String(body.name || "").trim(); const role = String(body.role || "").trim(); if (!name || !role) return Response.json({ error: "Nome e cargo são obrigatórios." }, { status: 400 }); const reportsToId = body.reportsToId ? String(body.reportsToId) : null; if (reportsToId === stakeholderId) return Response.json({ error: "Uma pessoa não pode reportar a si mesma." }, { status: 400 });
    const existing = await db.prepare("SELECT created_at FROM stakeholders WHERE id = ? AND discovery_id = ?").bind(stakeholderId, id).first<Record<string, unknown>>(); await db.prepare("INSERT OR REPLACE INTO stakeholders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(stakeholderId, id, name, role, String(body.area || "Não informada"), reportsToId, String(body.influence || "Média"), String(body.stance || "Desconhecido"), JSON.stringify(list(body.priorities).slice(0, 8)), String(body.notes || ""), "manual", String(existing?.created_at || now), now).run(); await addEvent(db, { id: `evt-${id}-${stakeholderId}`, discoveryId: id, type: "stakeholder", title: `${name} · ${role}`, content: `${String(body.notes || "")} Prioridades: ${list(body.priorities).join(", ")}`, sourceType: "stakeholder", sourceId: stakeholderId, evidenceStatus: "confirmed", confidence: 90, occurredAt: now }); await recomputeAccount(db, id); return Response.json({ ok: true });
  }
  if (body.action === "stakeholder_delete") { const stakeholderId = String(body.stakeholderId || ""); await db.batch([db.prepare("UPDATE stakeholders SET reports_to_id = NULL WHERE reports_to_id = ? AND discovery_id = ?").bind(stakeholderId, id), db.prepare("DELETE FROM stakeholders WHERE id = ? AND discovery_id = ?").bind(stakeholderId, id), db.prepare("DELETE FROM account_events WHERE source_type = 'stakeholder' AND source_id = ? AND discovery_id = ?").bind(stakeholderId, id)]); await recomputeAccount(db, id); return Response.json({ ok: true }); }
  if (body.action === "feedback") { await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "feedback", body.accepted ? "Handoff validado pelo usuário" : "Handoff devolvido para revisão", now).run(); return Response.json({ ok: true }); }
  return Response.json({ error: "Ação desconhecida." }, { status: 400 });
}
