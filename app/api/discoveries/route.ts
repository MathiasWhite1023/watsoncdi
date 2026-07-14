import { env } from "cloudflare:workers";
import { answerFromEvidence, buildActions, buildHypotheses, buildMemory, suggestAccountPlan, type AccountEvent, type AccountMemory, type EvidenceRef } from "../../../lib/account-intelligence";
import { createAIProviderFromEnv, type AccountDataClassification, type AIResult } from "../../../lib/ai-provider";
import { collectAccountSources, evidenceFingerprint, persistEmbeddings, retrieveAccountSources, type RetrievalSource } from "../../../lib/account-retrieval";

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
  aiStatus: "watsonx" | "gemini" | "fallback" | "error";
};
type Meeting = {
  id: string;
  discoveryId: string;
  title: string;
  notes: string;
  summary: string;
  insights: MeetingInsight;
  aiStatus: "watsonx" | "gemini" | "fallback" | "error";
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
type AccountAction = { id: string; discoveryId: string; stakeholderId: string | null; type: string; title: string; rationale: string; whyNow: string; nextStep: string; impact: number; urgency: number; confidence: number; maturity: number; effort: number; priorityScore: number; status: string; dueAt: string | null; expectedOutcome: string; conversation: { stakeholder: string; theme: string; opener: string; questions: string[]; objection: string; successCriterion: string }; snoozedUntil: string | null; feedbackReason: string | null; rankAdjustment: number; evidence: EvidenceRef[]; dedupeKey: string; evidenceFingerprint: string; createdAt: string; updatedAt: string };
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
  return createAIProviderFromEnv(runtime);
};

const classificationOf = (row: Record<string, unknown>): AccountDataClassification =>
  String(row.data_classification || "test") === "confidential" ? "confidential" : "test";

const aiStatusOf = (provider: "watsonx" | "gemini" | "fallback") =>
  provider === "watsonx" ? "watsonx" as const : provider === "gemini" ? "gemini" as const : "fallback" as const;

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

async function getAIInsights(notes: string, customerName: string, industry: string, classification: AccountDataClassification): Promise<{ insights: MeetingInsight | null; result: AIResult<unknown> }> {
  const generated = await aiAdapter().prepareMeeting(`Cliente: ${customerName}\nSetor: ${industry}\nNotas da reunião:\n${notes}`, { classification });
  const parsed = generated.data as Partial<MeetingInsight> | null;
  if (!parsed) return { insights: null, result: generated };
  return { result: generated, insights: {
    summary: String(parsed.summary || notes.slice(0, 260)),
    signals: compact((parsed.signals || []) as string[]),
    ibmThemes: compact((parsed.ibmThemes || []) as string[]),
    nextQuestions: compact((parsed.nextQuestions || []) as string[]),
    nextActions: compact((parsed.nextActions || []) as string[]),
    risks: compact((parsed.risks || []) as string[]),
    stakeholders: compact((parsed.stakeholders || []) as string[]),
    systems: compact((parsed.systems || []) as string[]),
    painPoints: compact((parsed.painPoints || []) as string[]),
    aiStatus: aiStatusOf(generated.provider),
  } };
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
    db.prepare("CREATE TABLE IF NOT EXISTS account_embeddings (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, chunk_ordinal INTEGER NOT NULL DEFAULT 0, content_hash TEXT NOT NULL, model TEXT NOT NULL, dimensions INTEGER NOT NULL DEFAULT 768, vector_json TEXT NOT NULL, content_preview TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS ai_cache (id TEXT PRIMARY KEY, cache_key TEXT NOT NULL, discovery_id TEXT, task TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, response_json TEXT NOT NULL, usage_json TEXT NOT NULL DEFAULT '{}', expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS daily_briefings (id TEXT PRIMARY KEY, owner_email TEXT NOT NULL, briefing_date TEXT NOT NULL, account_ids_json TEXT NOT NULL DEFAULT '[]', content_json TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, evidence_fingerprint TEXT NOT NULL, generated_at TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_snapshots (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, reason TEXT NOT NULL, snapshot_json TEXT NOT NULL, confidence INTEGER NOT NULL DEFAULT 0, source_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_relationships (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, source_stakeholder_id TEXT NOT NULL, target_stakeholder_id TEXT NOT NULL, relation_type TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', confidence INTEGER NOT NULL DEFAULT 50, evidence_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS account_graph_layouts (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, mode TEXT NOT NULL, nodes_json TEXT NOT NULL DEFAULT '[]', viewport_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS external_signals (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL, query_fingerprint TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, source_url TEXT NOT NULL, publisher TEXT NOT NULL DEFAULT '', published_at TEXT, citation_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'proposed', confidence INTEGER NOT NULL DEFAULT 0, approved_at TEXT, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS action_feedback (id TEXT PRIMARY KEY, action_id TEXT NOT NULL, discovery_id TEXT NOT NULL, feedback_type TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', adjustment INTEGER NOT NULL DEFAULT 0, previous_status TEXT NOT NULL DEFAULT '', new_status TEXT NOT NULL DEFAULT '', metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL)"),
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
    db.prepare("CREATE INDEX IF NOT EXISTS account_embeddings_discovery_idx ON account_embeddings(discovery_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS account_embeddings_source_idx ON account_embeddings(discovery_id, source_type, source_id, chunk_ordinal, model)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_key_idx ON ai_cache(cache_key)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS daily_briefings_owner_date_idx ON daily_briefings(owner_email, briefing_date)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS account_relationships_relation_idx ON account_relationships(discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS account_graph_layouts_account_mode_idx ON account_graph_layouts(discovery_id, mode)"),
    db.prepare("CREATE INDEX IF NOT EXISTS external_signals_account_status_idx ON external_signals(discovery_id, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS action_feedback_account_time_idx ON action_feedback(discovery_id, created_at)"),
  ]);
  await ensureColumn(db, "discoveries", "owner_email", "TEXT");
  await ensureColumn(db, "discoveries", "visibility", "TEXT NOT NULL DEFAULT 'demo'");
  await ensureColumn(db, "discoveries", "last_analyzed_at", "TEXT");
  await ensureColumn(db, "discoveries", "data_classification", "TEXT NOT NULL DEFAULT 'test'");
  await ensureColumn(db, "discoveries", "company_domain", "TEXT");
  await ensureColumn(db, "meetings", "scheduled_at", "TEXT");
  await ensureColumn(db, "meetings", "attendees_json", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, "meetings", "objective", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "meetings", "preparation_json", "TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn(db, "meetings", "meeting_status", "TEXT NOT NULL DEFAULT 'completed'");
  await ensureColumn(db, "account_actions", "why_now", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "account_actions", "effort", "INTEGER NOT NULL DEFAULT 50");
  await ensureColumn(db, "account_actions", "expected_outcome", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "account_actions", "conversation_json", "TEXT NOT NULL DEFAULT '{}'");
  await ensureColumn(db, "account_actions", "snoozed_until", "TEXT");
  await ensureColumn(db, "account_actions", "feedback_reason", "TEXT");
  await ensureColumn(db, "account_actions", "rank_adjustment", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "model", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "ai_runs", "prompt_tokens", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "output_tokens", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "latency_ms", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "cache_hit", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "ai_runs", "error_code", "TEXT");
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
  return { id: String(row.id), discoveryId: String(row.discovery_id), stakeholderId: row.stakeholder_id ? String(row.stakeholder_id) : null, type: String(row.type), title: String(row.title), rationale: String(row.rationale), whyNow: String(row.why_now || row.rationale || ""), nextStep: String(row.next_step), impact: Number(row.impact), urgency: Number(row.urgency), confidence: Number(row.confidence), maturity: Number(row.maturity), effort: Number(row.effort || 50), priorityScore: Math.max(0, Math.min(100, Number(row.priority_score) + Number(row.rank_adjustment || 0))), status: String(row.status), dueAt: row.due_at ? String(row.due_at) : null, expectedOutcome: String(row.expected_outcome || ""), conversation: json<AccountAction["conversation"]>(row.conversation_json, { stakeholder: "Stakeholder a identificar", theme: "prioridade estratégica", opener: "Validar contexto e prioridade.", questions: [], objection: "Ainda não há evidência suficiente.", successCriterion: "Confirmar um próximo passo com prazo." }), snoozedUntil: row.snoozed_until ? String(row.snoozed_until) : null, feedbackReason: row.feedback_reason ? String(row.feedback_reason) : null, rankAdjustment: Number(row.rank_adjustment || 0), evidence: json<EvidenceRef[]>(row.evidence_json, []), dedupeKey: String(row.dedupe_key), evidenceFingerprint: String(row.evidence_fingerprint), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
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
  return { id: String(row.id), customerName: String(row.customer_name), industry: String(row.industry), companySize: String(row.company_size), owner: String(row.owner), ownerEmail: row.owner_email ? String(row.owner_email) : null, visibility: String(row.visibility || "demo"), dataClassification: String(row.data_classification || "test"), companyDomain: row.company_domain ? String(row.company_domain) : null, stage: String(row.stage), progress: Number(row.progress), priority: String(row.priority), challengeSummary: String(row.challenge_summary), answers, meetings, accountMap: accountMap || buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores }, answers, meetings), aiMode: meetings[0]?.aiStatus || "fallback", scores, recommendations: json<Recommendation[]>(row.recommendations_json, []), nextEngagement: String(row.next_engagement), lastAnalyzedAt: row.last_analyzed_at ? String(row.last_analyzed_at) : null, updatedAt: String(row.updated_at) };
}

function requestIdentity(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() || "";
  const allowed = String((env as unknown as Record<string, unknown>).PRIVATE_ALLOWED_EMAILS || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return { email, allowed: !allowed.length || allowed.includes(email) };
}

function scopeFor(request: Request, body?: Record<string, unknown>) {
  return String(body?.scope || new URL(request.url).searchParams.get("scope") || "demo") === "private" ? "private" : "demo";
}

function normalizeCompanyDomain(value: unknown): string | null {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return null;
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) return null;
    const hostname = parsed.hostname.replace(/\.$/, "").replace(/^www\./, "");
    if (!hostname.includes(".") || hostname.length > 253) return null;
    const labels = hostname.split(".");
    if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels.at(-1) || "")) return null;
    return hostname;
  } catch {
    return null;
  }
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

const dbProviderName = (provider: "watsonx" | "gemini" | "fallback") =>
  provider === "watsonx" ? "ibm-watsonx" : provider === "gemini" ? "google-gemini" : "deterministic-fallback";

async function quotaAllows(db: D1Database, kind: "generative" | "embedding") {
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const circuitWindow = new Date(now - 5 * 60_000).toISOString();
  const agentFilter = kind === "embedding" ? "agent = 'semantic-index'" : "agent <> 'semantic-index'";
  const [minute, day, recentErrors] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND ${agentFilter} AND created_at >= ?`).bind(minuteAgo).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM ai_runs WHERE provider = 'google-gemini' AND ${agentFilter} AND created_at >= ?`).bind(dayAgo).first<{ count: number }>(),
    db.prepare("SELECT status FROM ai_runs WHERE provider = 'google-gemini' AND created_at >= ? ORDER BY created_at DESC LIMIT 3").bind(circuitWindow).all<{ status: string }>(),
  ]);
  const rpm = kind === "embedding" ? 80 : 12;
  const daily = kind === "embedding" ? 900 : 450;
  const circuitOpen = recentErrors.results.length === 3 && recentErrors.results.every((row) => row.status === "error");
  return { allowed: Number(minute?.count || 0) < rpm && Number(day?.count || 0) < daily && !circuitOpen, minute: Number(minute?.count || 0), daily: Number(day?.count || 0), rpm, dailyLimit: daily, circuitOpen };
}

async function recordAIRun<T>(db: D1Database, accountId: string, agent: string, result: AIResult<T>, sourceIds: string[], confidence: number, detail: string, cached = false) {
  const now = new Date().toISOString();
  const attemptedProvider = result.attemptedProviders?.at(-1);
  const recordedProvider = result.ok ? result.provider : attemptedProvider || result.provider;
  const status = result.ok ? "completed" : attemptedProvider ? "error" : "fallback";
  await db.prepare("INSERT INTO ai_runs (id, discovery_id, agent, provider, status, confidence, source_ids_json, validated, detail, model, prompt_tokens, output_tokens, latency_ms, cache_hit, error_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(`run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, accountId, agent, dbProviderName(recordedProvider), status, confidence, JSON.stringify(sourceIds), 0, detail, result.model || "", result.usage.inputTokens || 0, result.usage.outputTokens || 0, result.latencyMs, cached ? 1 : 0, result.reason || null, now).run();
}

async function cacheKeyFor(parts: string[]) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|")));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function providerCacheSignature(provider: ReturnType<typeof aiAdapter>, classification: AccountDataClassification) {
  const status = provider.status;
  return JSON.stringify({
    classification,
    mode: status.mode,
    precedence: status.precedence,
    watsonx: status.watsonx.configured ? status.watsonx.model : "disabled",
    gemini: status.gemini.configured ? status.gemini.model : "disabled",
    embedding: status.gemini.configured ? status.gemini.embeddingModel : "disabled",
  });
}

async function cachedAI<T>(db: D1Database, cacheKey: string): Promise<{ data: T; provider: string; model: string; usage: Record<string, unknown> } | null> {
  const row = await db.prepare("SELECT response_json, provider, model, usage_json FROM ai_cache WHERE cache_key = ? AND expires_at > ? AND provider <> 'deterministic-fallback' AND model <> ''").bind(cacheKey, new Date().toISOString()).first<Record<string, unknown>>();
  return row ? { data: json<T>(row.response_json, null as T), provider: String(row.provider), model: String(row.model), usage: json<Record<string, unknown>>(row.usage_json, {}) } : null;
}

async function putAICache<T>(db: D1Database, input: { cacheKey: string; accountId: string | null; task: string; provider: string; model: string; fingerprint: string; data: T; usage: Record<string, unknown>; ttlMs: number }) {
  if (input.provider === "deterministic-fallback" || !input.model) return;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
  await db.prepare("INSERT OR REPLACE INTO ai_cache (id, cache_key, discovery_id, task, provider, model, evidence_fingerprint, response_json, usage_json, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(`cache-${input.cacheKey}`, input.cacheKey, input.accountId, input.task, input.provider, input.model, input.fingerprint, JSON.stringify(input.data), JSON.stringify(input.usage), expiresAt, now, now).run();
}

async function refreshAccountEmbeddings(db: D1Database, row: Record<string, unknown>, sources?: RetrievalSource[]) {
  if (String(row.visibility || "demo") !== "private" || classificationOf(row) === "confidential") return;
  const provider = aiAdapter();
  if (!provider.status.gemini.configured || provider.status.mode === "fallback" || provider.status.mode === "watsonx") return;
  const quota = await quotaAllows(db, "embedding");
  if (!quota.allowed) return;
  const allSources = sources || await collectAccountSources(db, String(row.id));
  const selected = allSources.slice(0, 300);
  if (!selected.length) return;
  const existing = await db.prepare("SELECT source_id, content_hash FROM account_embeddings WHERE discovery_id = ? AND model = ?").bind(String(row.id), provider.status.gemini.embeddingModel).all<{ source_id: string; content_hash: string }>();
  const hashes = new Map(existing.results.map((item) => [item.source_id, item.content_hash]));
  const changed = selected.filter((source) => hashes.get(source.id) !== `${source.content.length}:${source.occurredAt}`);
  if (!changed.length) return;
  for (let index = 0; index < changed.length; index += 60) {
    const batch = changed.slice(index, index + 60);
    const batchQuota = index === 0 ? quota : await quotaAllows(db, "embedding");
    if (!batchQuota.allowed) break;
    const result = await provider.embedSources(batch.map((source) => ({ id: source.id, text: `${source.title}\n${source.content}` })), { classification: "test", embeddingTask: "RETRIEVAL_DOCUMENT" });
    if (result.ok && result.data) await persistEmbeddings(db, String(row.id), batch, result.data.map((item) => item.values), result.model || provider.status.gemini.embeddingModel);
    await recordAIRun(db, String(row.id), "semantic-index", result, batch.map((source) => source.id), result.ok ? 86 : 0, result.ok ? `${batch.length} fontes indexadas para recuperação seletiva.` : "Indexação semântica indisponível; busca híbrida manteve palavras-chave e recência.");
    if (!result.ok) break;
  }
}

export async function recomputeAccount(db: D1Database, id: string, recomputeOptions: { skipGenerative?: boolean } = {}) {
  const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return;
  const [eventRows, stakeholderRows, previousMemory] = await Promise.all([
    db.prepare("SELECT * FROM account_events WHERE discovery_id = ? ORDER BY occurred_at DESC").bind(id).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ? ORDER BY created_at ASC").bind(id).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM account_memory WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>(),
  ]);
  const events = eventRows.results.map(mapAccountEvent); const stakeholders = stakeholderRows.results.map(mapStakeholder); const scores = json<Score[]>(row.scores_json, initialScores());
  let memory = buildMemory(String(row.customer_name), String(row.challenge_summary), events, scores, Number(previousMemory?.version || 0));
  const provider = aiAdapter();
  const quota = await quotaAllows(db, "generative");
  const options = { classification: quota.allowed ? classificationOf(row) : "confidential" as const, publicDemo: String(row.visibility || "demo") !== "private" };
  const generatedMemory = recomputeOptions.skipGenerative
    ? { ok: false, data: null, provider: "fallback" as const, model: null, fallback: true, reason: "disabled" as const, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, latencyMs: 0, attempts: 0 }
    : await provider.analyzeAccount(JSON.stringify({ customer: row.customer_name, currentSummary: row.challenge_summary, sources: events.slice(0, 30), scores: scores.slice(0, 6), stakeholders }), options);
  if (generatedMemory.data && typeof generatedMemory.data.executiveSummary === "string") memory = { ...memory, executiveSummary: generatedMemory.data.executiveSummary, known: compact(generatedMemory.data.known.map(String)), assumptions: compact(generatedMemory.data.assumptions.map(String)), gaps: compact(generatedMemory.data.gaps.map(String)), changes: compact(generatedMemory.data.changes.map(String)), aiStatus: aiStatusOf(generatedMemory.provider) };
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
    const snoozedUntil = existing?.snoozed_until ? String(existing.snoozed_until) : null;
    const currentStatus = snoozedUntil && new Date(snoozedUntil).getTime() > Date.now() ? "snoozed" : status;
    await db.prepare("INSERT OR REPLACE INTO account_actions (id, discovery_id, stakeholder_id, type, title, rationale, next_step, impact, urgency, confidence, maturity, priority_score, status, due_at, evidence_json, dedupe_key, evidence_fingerprint, created_at, updated_at, why_now, effort, expected_outcome, conversation_json, snoozed_until, feedback_reason, rank_adjustment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(String(existing?.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`), id, item.stakeholderId, item.type, item.title, item.rationale, item.nextStep, item.impact, item.urgency, item.confidence, item.maturity, item.priorityScore, currentStatus, item.dueAt, JSON.stringify(item.evidence), item.dedupeKey, item.evidenceFingerprint, String(existing?.created_at || memory.updatedAt), memory.updatedAt, item.whyNow, item.effort, item.expectedOutcome, JSON.stringify(item.conversation), snoozedUntil, existing?.feedback_reason || null, Math.max(-5, Math.min(5, Number(existing?.rank_adjustment || 0)))).run();
  }
  const plan = await db.prepare("SELECT discovery_id FROM account_plans WHERE discovery_id = ?").bind(id).first();
  if (!plan) {
    const suggestion = suggestAccountPlan(memory, hypotheses, actions, stakeholders);
    await db.prepare("INSERT INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "[]", "draft", JSON.stringify(suggestion), memory.updatedAt).run();
  }
  const snapshotFingerprint = await evidenceFingerprint((await collectAccountSources(db, id)).slice(0, 60));
  await db.prepare("INSERT OR IGNORE INTO account_snapshots (id, discovery_id, reason, snapshot_json, confidence, source_fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`snap-${id}-${snapshotFingerprint.slice(0, 14)}`, id, "analysis", JSON.stringify({ progress: row.progress, topScores: scores.slice(0, 3), hypothesisConfidence: hypotheses.map((item) => ({ key: item.capabilityKey, confidence: item.confidence })), memoryVersion: memory.version }), scores[0]?.confidence || 0, snapshotFingerprint, memory.updatedAt).run();
  await recordAIRun(db, id, "account-orchestrator", generatedMemory, events.slice(0, 10).map((item) => item.id), generatedMemory.ok ? 82 : 72, "Memória, hipóteses e fila recalculadas; revisão humana necessária.");
  await db.prepare("UPDATE discoveries SET last_analyzed_at = ? WHERE id = ?").bind(memory.updatedAt, id).run();
  await refreshAccountEmbeddings(db, row).catch(() => undefined);
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
    const hierarchy = await db.prepare("SELECT id, reports_to_id, created_at, updated_at FROM stakeholders WHERE discovery_id = ? AND reports_to_id IS NOT NULL").bind(id).all<Record<string, unknown>>();
    for (const person of hierarchy.results) await db.prepare("INSERT OR IGNORE INTO account_relationships (id, discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type, label, confidence, evidence_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`rel-${id}-${String(person.id)}-reports`, id, String(person.id), String(person.reports_to_id), "reporta_para", "Reporta para", 88, "[]", "confirmed", String(person.created_at), String(person.updated_at)).run();
    const memory = await db.prepare("SELECT discovery_id FROM account_memory WHERE discovery_id = ?").bind(id).first();
    if (!memory) await recomputeAccount(db, id);
  }
}

async function accountPayload(db: D1Database, discoveryRows: Record<string, unknown>[]) {
  const ids = discoveryRows.map((row) => String(row.id));
  if (!ids.length) return { discoveries: [], meetings: [], stakeholders: [], events: [], accountEvents: [], actions: [], hypotheses: [], memories: [], plans: [], documents: [], chats: [], aiRuns: [], relationships: [], graphLayouts: [], externalSignals: [], snapshots: [], actionFeedback: [] };
  const placeholders = ids.map(() => "?").join(",");
  const queries = [
    db.prepare(`SELECT * FROM meetings WHERE discovery_id IN (${placeholders}) ORDER BY COALESCE(scheduled_at, created_at) DESC`).bind(...ids), db.prepare(`SELECT * FROM account_maps WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM stakeholders WHERE discovery_id IN (${placeholders}) ORDER BY created_at`).bind(...ids), db.prepare(`SELECT * FROM audit_events WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`).bind(...ids), db.prepare(`SELECT * FROM account_events WHERE discovery_id IN (${placeholders}) ORDER BY occurred_at DESC`).bind(...ids), db.prepare(`SELECT * FROM account_actions WHERE discovery_id IN (${placeholders}) ORDER BY priority_score DESC`).bind(...ids), db.prepare(`SELECT * FROM opportunity_hypotheses WHERE discovery_id IN (${placeholders}) ORDER BY confidence DESC`).bind(...ids), db.prepare(`SELECT * FROM account_memory WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM account_plans WHERE discovery_id IN (${placeholders})`).bind(...ids), db.prepare(`SELECT * FROM documents WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`).bind(...ids), db.prepare(`SELECT * FROM account_chat_messages WHERE discovery_id IN (${placeholders}) ORDER BY created_at`).bind(...ids), db.prepare(`SELECT * FROM ai_runs WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 100`).bind(...ids),
    db.prepare(`SELECT * FROM account_relationships WHERE discovery_id IN (${placeholders}) ORDER BY updated_at DESC`).bind(...ids),
    db.prepare(`SELECT * FROM account_graph_layouts WHERE discovery_id IN (${placeholders})`).bind(...ids),
    db.prepare(`SELECT * FROM external_signals WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC`).bind(...ids),
    db.prepare(`SELECT * FROM account_snapshots WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 120`).bind(...ids),
    db.prepare(`SELECT * FROM action_feedback WHERE discovery_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 120`).bind(...ids),
  ];
  const [meetingRows, mapRows, stakeholderRows, auditRows, eventRows, actionRows, hypothesisRows, memoryRows, planRows, documentRows, chatRows, aiRunRows, relationshipRows, layoutRows, signalRows, snapshotRows, feedbackRows] = await Promise.all(queries.map((query) => query.all<Record<string, unknown>>()));
  const meetings = meetingRows.results.map(mapMeeting); const maps = new Map(mapRows.results.map((row) => [String(row.discovery_id), { nodes: json<AccountNode[]>(row.nodes_json, []), edges: json<AccountEdge[]>(row.edges_json, []), updatedAt: String(row.updated_at) } as AccountMap]));
  return {
    discoveries: discoveryRows.map((row) => mapDiscovery(row, meetings.filter((item) => item.discoveryId === String(row.id)), maps.get(String(row.id)))), meetings,
    stakeholders: stakeholderRows.results.map(mapStakeholder), events: auditRows.results.map((row) => ({ id: row.id, discoveryId: row.discovery_id, type: row.type, detail: row.detail, createdAt: row.created_at })),
    accountEvents: eventRows.results.map(mapAccountEvent), actions: actionRows.results.map(mapAction), hypotheses: hypothesisRows.results.map(mapHypothesis), memories: memoryRows.results.map((row) => ({ discoveryId: String(row.discovery_id), ...mapMemory(row)! })), plans: planRows.results.map((row) => mapPlan(row)!),
    documents: documentRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), name: String(row.name), contentType: String(row.content_type), sizeBytes: Number(row.size_bytes), status: String(row.status), summary: String(row.summary), createdAt: String(row.created_at) } satisfies AccountDocument)),
    chats: chatRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), role: String(row.role), content: String(row.content), citations: json<EvidenceRef[]>(row.citations_json, []), aiStatus: String(row.ai_status), createdAt: String(row.created_at) })),
    aiRuns: aiRunRows.results.map((row) => ({ id: row.id, discoveryId: row.discovery_id, agent: row.agent, provider: row.provider, model: row.model, status: row.status, confidence: row.confidence, sources: json<string[]>(row.source_ids_json, []), validated: Boolean(row.validated), detail: row.detail, promptTokens: Number(row.prompt_tokens || 0), outputTokens: Number(row.output_tokens || 0), latencyMs: Number(row.latency_ms || 0), cached: Boolean(row.cache_hit), errorCode: row.error_code || null, createdAt: row.created_at })),
    relationships: relationshipRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), sourceStakeholderId: String(row.source_stakeholder_id), targetStakeholderId: String(row.target_stakeholder_id), relationType: String(row.relation_type), label: String(row.label || ""), confidence: Number(row.confidence), evidence: json<EvidenceRef[]>(row.evidence_json, []), status: String(row.status), createdAt: String(row.created_at), updatedAt: String(row.updated_at) })),
    graphLayouts: layoutRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), mode: String(row.mode), nodes: json<Array<{ id: string; x: number; y: number }>>(row.nodes_json, []), viewport: json<Record<string, number>>(row.viewport_json, {}), updatedAt: String(row.updated_at) })),
    externalSignals: signalRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), title: String(row.title), summary: String(row.summary), sourceUrl: String(row.source_url), publisher: String(row.publisher || ""), publishedAt: row.published_at ? String(row.published_at) : null, status: String(row.status), confidence: Number(row.confidence), expiresAt: String(row.expires_at), createdAt: String(row.created_at) })),
    snapshots: snapshotRows.results.map((row) => ({ id: String(row.id), discoveryId: String(row.discovery_id), reason: String(row.reason), snapshot: json<Record<string, unknown>>(row.snapshot_json, {}), confidence: Number(row.confidence), createdAt: String(row.created_at) })),
    actionFeedback: feedbackRows.results.map((row) => ({ id: String(row.id), actionId: String(row.action_id), discoveryId: String(row.discovery_id), feedbackType: String(row.feedback_type), reason: String(row.reason || ""), adjustment: Number(row.adjustment || 0), previousStatus: String(row.previous_status || ""), newStatus: String(row.new_status || ""), createdAt: String(row.created_at) })),
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
    const classification = String(body.dataClassification) === "confidential" ? "confidential" : "test";
    const rawDomain = String(body.companyDomain || "").trim();
    const domain = normalizeCompanyDomain(rawDomain);
    if (rawDomain && !domain) return Response.json({ error: "Informe um domínio corporativo válido, como empresa.com.br." }, { status: 400 });
    await db.prepare("INSERT INTO discoveries (id, customer_name, industry, company_size, owner, stage, progress, priority, challenge_summary, answers_json, scores_json, recommendations_json, next_engagement, created_at, updated_at, owner_email, visibility, data_classification, company_domain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, name, String(body.industry || "Não informado"), String(body.companySize || "Enterprise"), identity.email.split("@")[0], "Account intelligence", 8, "Baixa", "Conta criada. Adicione uma informação para iniciar a memória.", "[]", JSON.stringify(scores), "[]", "Registrar primeira informação", now, now, identity.email, "private", classification, domain).run();
    await db.prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), now).run();
    await addEvent(db, { id: `evt-${id}-created`, discoveryId: id, type: "account_created", title: "Conta adicionada ao workspace", content: `Conta ${name} criada para inteligência antes do CRM.`, sourceType: "system", sourceId: id, evidenceStatus: "confirmed", confidence: 100, occurredAt: now }); await seedStakeholderTrees(db); await recomputeAccount(db, id);
    return Response.json({ ok: true, id }, { status: 201 });
  }
  if (body.action === "briefing") {
    const briefingDate = now.slice(0, 10);
    const briefingProvider = aiAdapter();
    const briefingConfig = await cacheKeyFor(["daily-briefing", providerCacheSignature(briefingProvider, "test")]);
    const existing = await db.prepare("SELECT * FROM daily_briefings WHERE owner_email = ? AND briefing_date = ? AND expires_at > ? AND provider <> 'deterministic-fallback' AND model <> '' AND evidence_fingerprint LIKE ?").bind(identity.email, briefingDate, now, `${briefingConfig}:%`).first<Record<string, unknown>>();
    if (existing && !body.force) return Response.json({ briefing: json<Record<string, unknown>>(existing.content_json, {}), provider: String(existing.provider), model: String(existing.model || ""), cached: true, generatedAt: String(existing.generated_at) });
    const rows = await db.prepare("SELECT * FROM discoveries WHERE visibility = 'private' AND owner_email = ? ORDER BY progress DESC, updated_at DESC LIMIT 5").bind(identity.email).all<Record<string, unknown>>();
    const accountIds = rows.results.map((item) => String(item.id));
    if (!accountIds.length) return Response.json({ briefing: { headline: "Comece sua inteligência de contas", summary: "Adicione uma conta e registre a primeira informação para receber recomendações proativas.", focusAccounts: [], changes: [], meetingsToPrepare: [], overdueCommitments: [] }, provider: "deterministic-fallback", model: null, cached: false, generatedAt: now });
    const placeholders = accountIds.map(() => "?").join(",");
    const [actionRows, eventRows, meetingRows] = await Promise.all([
      db.prepare(`SELECT * FROM account_actions WHERE discovery_id IN (${placeholders}) AND status NOT IN ('completed', 'discarded') AND (snoozed_until IS NULL OR snoozed_until <= ?) ORDER BY (priority_score + rank_adjustment) DESC LIMIT 12`).bind(...accountIds, now).all<Record<string, unknown>>(),
      db.prepare(`SELECT * FROM account_events WHERE discovery_id IN (${placeholders}) ORDER BY occurred_at DESC LIMIT 20`).bind(...accountIds).all<Record<string, unknown>>(),
      db.prepare(`SELECT * FROM meetings WHERE discovery_id IN (${placeholders}) AND meeting_status = 'scheduled' ORDER BY scheduled_at ASC LIMIT 8`).bind(...accountIds).all<Record<string, unknown>>(),
    ]);
    const actions = actionRows.results.map(mapAction);
    const accountName = new Map(rows.results.map((item) => [String(item.id), String(item.customer_name)]));
    const deterministicBrief = {
      headline: actions.length ? "O que merece sua atenção hoje" : "Sua carteira não tem pendências críticas",
      summary: actions.length ? `${actions.length} ações estão abertas. As três primeiras combinam maior impacto, urgência, confiança e maturidade.` : "Registre novas interações para manter a memória e as recomendações atualizadas.",
      focusAccounts: actions.slice(0, 5).map((action) => ({ accountId: action.discoveryId, accountName: accountName.get(action.discoveryId) || "Conta", headline: action.title, whyNow: action.whyNow || action.rationale, priority: action.priorityScore, suggestedAction: action.nextStep, citationIds: action.evidence.map((source) => source.sourceId).slice(0, 8) })),
      changes: eventRows.results.slice(0, 8).map((event) => `${accountName.get(String(event.discovery_id)) || "Conta"}: ${String(event.title)}`),
      meetingsToPrepare: meetingRows.results.map((meeting) => `${accountName.get(String(meeting.discovery_id)) || "Conta"}: ${String(meeting.title)} · ${String(meeting.scheduled_at || "sem data")}`),
      overdueCommitments: eventRows.results.filter((event) => String(event.type) === "commitment" && new Date(String(event.occurred_at)).getTime() < Date.now()).map((event) => `${accountName.get(String(event.discovery_id)) || "Conta"}: ${String(event.title)}`).slice(0, 8),
    };
    const sources = eventRows.results.map((event) => ({ id: String(event.id), accountId: String(event.discovery_id), kind: String(event.type), title: String(event.title), content: String(event.content), sourceId: String(event.source_id || event.id), page: null, occurredAt: String(event.occurred_at), confidence: Number(event.confidence || 70) } satisfies RetrievalSource));
    const fingerprint = await evidenceFingerprint(sources);
    const quota = await quotaAllows(db, "generative");
    const testAccountIds = new Set(rows.results.filter((item) => classificationOf(item) === "test").map((item) => String(item.id)));
    const safeContext = { accounts: rows.results.filter((item) => testAccountIds.has(String(item.id))).map((item) => ({ id: item.id, name: item.customer_name, progress: item.progress, priority: item.priority, stage: item.stage })), actions: actions.filter((action) => testAccountIds.has(action.discoveryId)), events: sources.filter((source) => testAccountIds.has(source.accountId)), scheduledMeetings: meetingRows.results.filter((meeting) => testAccountIds.has(String(meeting.discovery_id))) };
    const generated = quota.allowed && testAccountIds.size ? await briefingProvider.generateDailyBrief(JSON.stringify(safeContext), { classification: "test" }) : { ok: false, data: null, provider: "fallback" as const, model: null, fallback: true, reason: "quota" as const, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, latencyMs: 0, attempts: 0 };
    const briefing = generated.data || deterministicBrief;
    const providerName = dbProviderName(generated.provider);
    if (generated.ok && generated.model) await db.prepare("INSERT OR REPLACE INTO daily_briefings (id, owner_email, briefing_date, account_ids_json, content_json, provider, model, status, evidence_fingerprint, generated_at, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`brief-${identity.email}-${briefingDate}`, identity.email, briefingDate, JSON.stringify(accountIds), JSON.stringify(briefing), providerName, generated.model, "generated", `${briefingConfig}:${fingerprint}`, now, new Date(Date.now() + 24 * 3600_000).toISOString(), String(existing?.created_at || now), now).run();
    await recordAIRun(db, accountIds[0], "daily-briefing", generated, sources.slice(0, 20).map((source) => source.id), generated.ok ? 82 : 70, "Briefing diário para até cinco contas; recomendações exigem aprovação humana.");
    return Response.json({ briefing, provider: providerName, model: generated.model, cached: false, usage: generated.usage, quota: { generative: quota }, generatedAt: now });
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
    const meetingQuota = await quotaAllows(db, "generative");
    let meetingRun: AIResult<unknown> = { ok: false, data: null, provider: "fallback", model: null, fallback: true, reason: meetingQuota.allowed ? "provider_error" : "quota", usage: { inputTokens: null, outputTokens: null, totalTokens: null }, latencyMs: 0, attempts: 0 };
    try {
      const generated = await getAIInsights(notes, String(row.customer_name), String(row.industry), meetingQuota.allowed ? classificationOf(row) : "confidential");
      meetingRun = generated.result;
      insights = generated.insights || fallbackMeetingInsights(notes, String(row.customer_name));
    } catch {
      insights = { ...fallbackMeetingInsights(notes, String(row.customer_name)), aiStatus: "error" };
    }
    const meetingId = `mtg-${Date.now()}`; const title = String(body.title || "Reunião registrada");
    await db.prepare("INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(meetingId, id, title, notes, insights.summary, JSON.stringify(insights), insights.aiStatus, now, null, JSON.stringify(list(body.attendees)), String(body.objective || ""), JSON.stringify({ questions: insights.nextQuestions, risks: insights.risks, themes: insights.ibmThemes }), "completed").run();
    await recordAIRun(db, id, "meeting-intelligence", meetingRun, [meetingId], meetingRun.ok ? 86 : 70, meetingRun.ok ? "Notas analisadas pelo provedor ativo; extrações exigem validação humana." : "Notas analisadas pelo motor determinístico após indisponibilidade, política ou cota do provedor.");
    await addEvent(db, { id: `evt-${id}-${meetingId}`, discoveryId: id, type: "meeting", title, content: `${insights.summary} ${insights.signals.join(" ")}`, sourceType: "meeting", sourceId: meetingId, evidenceStatus: "confirmed", confidence: insights.aiStatus === "watsonx" || insights.aiStatus === "gemini" ? 90 : 78, occurredAt: now }); const answers = json<Answer[]>(row.answers_json, []); const allMeetings = (await db.prepare("SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>()).results.map(mapMeeting); const result = analyze(answers, allMeetings); const progress = Math.min(100, 20 + answers.length * 10 + allMeetings.length * 18); const map = buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores: result.scores }, answers, allMeetings);
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?").bind(allMeetings.length >= 2 && result.priority !== "Baixa" ? "Pronto para handoff" : "Qualificação pré-CRM", progress, result.priority, result.challengeSummary, JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run(); await db.prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)").bind(id, JSON.stringify(map.nodes), JSON.stringify(map.edges), now).run(); await recomputeAccount(db, id, { skipGenerative: true }); return Response.json({ ok: true, aiStatus: insights.aiStatus });
  }
  if (body.action === "information") {
    const kind = String(body.kind || "note"); const title = String(body.title || "Nova informação").trim(); const content = String(body.content || "").trim(); if (!content) return Response.json({ error: "Descreva a informação." }, { status: 400 }); const occurredAt = String(body.occurredAt || now); const eventId = `evt-${id}-${Date.now()}`; const status = ["confirmed", "assumption", "gap", "stale"].includes(String(body.evidenceStatus)) ? String(body.evidenceStatus) as AccountEvent["evidenceStatus"] : "confirmed";
    await addEvent(db, { id: eventId, discoveryId: id, type: kind, title, content, sourceType: "manual", sourceId: eventId, evidenceStatus: status, confidence: status === "confirmed" ? 88 : status === "assumption" ? 55 : 70, occurredAt });
    if (["initiative", "system", "pain", "risk", "objective", "partner", "competitor"].includes(kind)) await db.prepare("INSERT INTO account_entities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`ent-${Date.now()}`, id, kind, title, content, "active", "manual", eventId, status === "confirmed" ? 88 : 55, now, now).run();
    if (kind === "scheduled_meeting") { const meetingId = `mtg-${Date.now()}`; const fallback = fallbackMeetingInsights(content, String(row.customer_name)); await db.prepare("INSERT INTO meetings (id, discovery_id, title, notes, summary, insights_json, ai_status, created_at, scheduled_at, attendees_json, objective, preparation_json, meeting_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(meetingId, id, title, "", content, JSON.stringify(fallback), "fallback", now, occurredAt, JSON.stringify(list(body.attendees)), content, JSON.stringify({ questions: fallback.nextQuestions, risks: fallback.risks, themes: fallback.ibmThemes }), "scheduled").run(); }
    await db.prepare("UPDATE discoveries SET updated_at = ? WHERE id = ?").bind(now, id).run(); await recomputeAccount(db, id); return Response.json({ ok: true, eventId });
  }
  if (body.action === "information_preview") {
    const content = String(body.content || "").trim();
    if (!content) return Response.json({ error: "Descreva a informação antes de revisar." }, { status: 400 });
    const lower = content.toLowerCase();
    const detectedKinds = compact([
      /ceo|cio|cto|cfo|ciso|diretor|gerente|stakeholder/.test(lower) && "stakeholder",
      /aws|azure|cloud|sap|mainframe|sistema|plataforma/.test(lower) && "system",
      /dor|problema|custo|risco|atraso|desperd/.test(lower) && "pain",
      /iniciativa|programa|projeto|roadmap/.test(lower) && "initiative",
      /compromisso|prazo|até |responsável/.test(lower) && "commitment",
    ]);
    const affectedThemes = capabilityCatalog.filter((item) => hitCount(lower, item.keywords) > 0).map((item) => item.short);
    return Response.json({
      preview: {
        title: String(body.title || "Nova informação").trim(),
        content,
        kind: String(body.kind || detectedKinds[0] || "note"),
        evidenceStatus: String(body.evidenceStatus || "confirmed"),
        detectedKinds,
        affectedThemes,
        willUpdate: ["Memória da conta", detectedKinds.includes("stakeholder") ? "Relacionamentos" : "Entidades da conta", affectedThemes.length ? "Hipóteses e Next Best Actions" : "Fila proativa"],
        requiresHumanConfirmation: true,
      },
    });
  }
  if (body.action === "prepare_conversation") {
    const focus = String(body.focus || "próxima conversa").trim();
    const sources = await retrieveAccountSources(db, id, focus, null, 16);
    const fingerprint = await evidenceFingerprint(sources);
    const provider = aiAdapter();
    const cacheKey = await cacheKeyFor([id, "prepare-conversation", providerCacheSignature(provider, classificationOf(row)), fingerprint, focus.toLowerCase()]);
    const cached = await cachedAI<Record<string, unknown>>(db, cacheKey);
    if (cached) return Response.json({ preparation: cached.data, provider: cached.provider, model: cached.model, cached: true, usage: cached.usage, citations: sources.slice(0, 8) });
    const quota = await quotaAllows(db, "generative");
    const generated = await provider.prepareMeeting(JSON.stringify({ customer: row.customer_name, focus, sources: sources.map((source) => ({ id: source.id, title: source.title, content: source.content, occurredAt: source.occurredAt })), stakeholders: (await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapStakeholder), hypotheses: (await db.prepare("SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapHypothesis) }), { classification: quota.allowed ? classificationOf(row) : "confidential" });
    const fallback = fallbackMeetingInsights(sources.map((source) => `${source.title}: ${source.content}`).join("\n"), String(row.customer_name));
    const preparation = generated.data || { ...fallback, objective: focus };
    await recordAIRun(db, id, "meeting-preparation", generated, sources.slice(0, 12).map((source) => source.id), generated.ok ? 84 : 70, "Preparação de conversa gerada sem alterar a memória da conta.");
    if (generated.ok) await putAICache(db, { cacheKey, accountId: id, task: "prepare-conversation", provider: dbProviderName(generated.provider), model: generated.model || "", fingerprint, data: preparation, usage: generated.usage, ttlMs: 12 * 3600_000 });
    return Response.json({ preparation, provider: dbProviderName(generated.provider), model: generated.model, cached: false, usage: generated.usage, citations: sources.slice(0, 8).map((source) => ({ sourceType: source.kind, sourceId: source.sourceId, title: source.title, excerpt: source.content.slice(0, 220), occurredAt: source.occurredAt })) });
  }
  if (body.action === "ask") {
    const question = String(body.question || "").trim();
    if (!question) return Response.json({ error: "Digite uma pergunta." }, { status: 400 });
    const provider = aiAdapter();
    const allSources = await collectAccountSources(db, id);
    const fingerprint = await evidenceFingerprint(allSources.slice(0, 90));
    const cacheKey = await cacheKeyFor([id, "ask", providerCacheSignature(provider, classificationOf(row)), fingerprint, question.toLowerCase()]);
    const cached = await cachedAI<Record<string, unknown>>(db, cacheKey);
    if (cached) {
      const cachedResponse = { ...cached.data, provider: cached.provider, model: cached.model, cached: true, usage: cached.usage };
      await db.batch([
        db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`chat-${Date.now()}-u`, id, "user", question, "[]", "human", now),
        db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`chat-${Date.now()}-a`, id, "assistant", String(cached.data.answer || ""), JSON.stringify(cached.data.citations || []), String(cached.data.aiStatus || "fallback"), now),
      ]);
      return Response.json(cachedResponse);
    }
    const embeddingQuota = await quotaAllows(db, "embedding");
    let queryVector: number[] | null = null;
    if (embeddingQuota.allowed && classificationOf(row) === "test" && provider.status.gemini.configured) {
      const embedded = await provider.embedSources([{ id: "query", text: question }], { classification: "test", embeddingTask: "RETRIEVAL_QUERY" });
      queryVector = embedded.data?.[0]?.values || null;
      await recordAIRun(db, id, "semantic-index", embedded, ["query"], embedded.ok ? 80 : 0, embedded.ok ? "Consulta vetorizada para recuperação híbrida." : "Consulta sem embedding; busca por palavras-chave e recência.");
    }
    const ranked = await retrieveAccountSources(db, id, question, queryVector, 14);
    const evidenceEvents: AccountEvent[] = ranked.map((source) => ({ id: source.id, discoveryId: id, type: source.kind, title: source.title, content: source.content, sourceType: source.kind, sourceId: source.sourceId, evidenceStatus: "confirmed", confidence: source.confidence, occurredAt: source.occurredAt, createdAt: source.occurredAt }));
    const stakeholders = (await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapStakeholder);
    const deterministic = answerFromEvidence(question, String(row.customer_name), evidenceEvents, json<Score[]>(row.scores_json, []), stakeholders);
    const generativeQuota = await quotaAllows(db, "generative");
    const generated = await provider.answerQuestion(JSON.stringify({ customer: row.customer_name, sources: ranked.map((source) => ({ id: source.id, title: source.title, content: source.content, sourceType: source.kind, sourceId: source.sourceId, page: source.page, occurredAt: source.occurredAt })), stakeholders, scores: json<Score[]>(row.scores_json, []).slice(0, 4) }), question, { classification: generativeQuota.allowed ? classificationOf(row) : "confidential" });
    const citationLookup = new Map(ranked.map((source) => [source.id, source]));
    const generatedCitations = generated.data?.citationIds.map((citationId) => citationLookup.get(citationId)).filter(Boolean).map((source) => ({ sourceType: source!.kind, sourceId: source!.sourceId, title: source!.title, excerpt: source!.content.slice(0, 220), occurredAt: source!.occurredAt })) || [];
    const citations = generatedCitations.length ? generatedCitations : deterministic.citations;
    const result = {
      answer: generated.data?.answer || deterministic.answer,
      citations,
      confidence: generated.data?.confidence ?? deterministic.confidence,
      aiStatus: generated.ok ? aiStatusOf(generated.provider) : "fallback",
      suggestedActions: generated.data?.suggestedActions || deterministic.suggestedActions,
      facts: generated.data?.facts || [],
      hypotheses: generated.data?.hypotheses || [],
      inferences: generated.data?.inferences || [],
      provider: dbProviderName(generated.provider),
      model: generated.model,
      cached: false,
      usage: generated.usage,
    };
    await db.batch([
      db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`chat-${Date.now()}-u`, id, "user", question, "[]", "human", now),
      db.prepare("INSERT INTO account_chat_messages VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`chat-${Date.now()}-a`, id, "assistant", result.answer, JSON.stringify(result.citations), result.aiStatus, now),
    ]);
    await recordAIRun(db, id, "account-copilot", generated, result.citations.map((item) => item.sourceId), result.confidence, "Resposta fundamentada; não altera dados.");
    if (generated.ok) await putAICache(db, { cacheKey, accountId: id, task: "ask", provider: result.provider, model: result.model || "", fingerprint, data: result, usage: generated.usage, ttlMs: 12 * 3600_000 });
    return Response.json(result);
  }
  if (body.action === "action_status") {
    const allowed = ["proposal", "accepted", "in_progress", "completed", "discarded", "snoozed"];
    const status = String(body.status);
    if (!allowed.includes(status)) return Response.json({ error: "Status inválido." }, { status: 400 });
    const actionId = String(body.actionId || "");
    const existing = await db.prepare("SELECT * FROM account_actions WHERE id = ? AND discovery_id = ?").bind(actionId, id).first<Record<string, unknown>>();
    if (!existing) return Response.json({ error: "Ação não encontrada." }, { status: 404 });
    const reason = String(body.reason || "").trim();
    if (status === "discarded" && !reason) return Response.json({ error: "Informe o motivo do descarte para melhorar as próximas recomendações." }, { status: 400 });
    const snoozedUntil = status === "snoozed" ? String(body.snoozedUntil || new Date(Date.now() + 7 * 86400000).toISOString()) : null;
    const feedbackType = String(body.feedbackType || (status === "accepted" ? "accepted" : status === "completed" ? "completed" : status === "discarded" ? "discarded" : status === "snoozed" ? "snoozed" : body.edited ? "edited" : "status_changed"));
    const adjustmentDelta = feedbackType === "completed" ? 3 : feedbackType === "accepted" ? 2 : feedbackType === "edited" ? 1 : feedbackType === "discarded" ? -3 : feedbackType === "snoozed" ? -1 : 0;
    const adjustment = Math.max(-5, Math.min(5, Number(existing.rank_adjustment || 0) + adjustmentDelta));
    await db.batch([
      db.prepare("UPDATE account_actions SET status = ?, title = ?, next_step = ?, due_at = ?, snoozed_until = ?, feedback_reason = ?, rank_adjustment = ?, updated_at = ? WHERE id = ? AND discovery_id = ?").bind(status, String(body.title || existing.title), String(body.nextStep || existing.next_step), body.dueAt ? String(body.dueAt) : existing.due_at, snoozedUntil, reason || existing.feedback_reason || null, adjustment, now, actionId, id),
      db.prepare("INSERT INTO action_feedback (id, action_id, discovery_id, feedback_type, reason, adjustment, previous_status, new_status, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`afb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, actionId, id, feedbackType, reason, adjustmentDelta, String(existing.status), status, JSON.stringify({ dueAt: body.dueAt || null, snoozedUntil, edited: Boolean(body.edited) }), now),
    ]);
    return Response.json({ ok: true, status, snoozedUntil, rankAdjustment: adjustment });
  }
  if (["plan_save", "plan_apply", "plan_suggest"].includes(String(body.action))) {
    const memory = mapMemory(await db.prepare("SELECT * FROM account_memory WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>()) || buildMemory(String(row.customer_name), String(row.challenge_summary), [], json<Score[]>(row.scores_json, [])); const hypotheses = (await db.prepare("SELECT * FROM opportunity_hypotheses WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapHypothesis); const actions = (await db.prepare("SELECT * FROM account_actions WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapAction); const stakeholders = (await db.prepare("SELECT * FROM stakeholders WHERE discovery_id = ?").bind(id).all<Record<string, unknown>>()).results.map(mapStakeholder); const current = mapPlan(await db.prepare("SELECT * FROM account_plans WHERE discovery_id = ?").bind(id).first<Record<string, unknown>>()); let suggestion = body.action === "plan_suggest" ? suggestAccountPlan(memory, hypotheses.map((item) => ({ ...item, stage: item.stage as "draft" | "validating" | "qualified" | "rejected" })), actions, stakeholders) : current?.suggestion || {}; if (body.action === "plan_suggest") { const quota = await quotaAllows(db, "generative"); const generated = await aiAdapter().suggestAccountPlan(JSON.stringify({ customer: row.customer_name, memory, hypotheses, actions, stakeholders, humanPlan: current }), { classification: quota.allowed ? classificationOf(row) : "confidential" }); if (generated.data) suggestion = Object.fromEntries(["priorities", "initiatives", "objectives", "risks", "ecosystem", "relationship", "plan30", "plan60", "plan90"].map((key) => [key, Array.isArray(generated.data?.[key as keyof typeof generated.data]) ? (generated.data?.[key as keyof typeof generated.data] as unknown[]).map(String).slice(0, 8) : suggestion[key as keyof typeof suggestion] || []])); await recordAIRun(db, id, "account-plan", generated, [], generated.ok ? 80 : 65, "Sugestão de Account Plan criada para comparação e aprovação humana."); }
    const source = body.action === "plan_apply" ? suggestion : body; const values = ["priorities", "initiatives", "objectives", "risks", "ecosystem", "relationship", "plan30", "plan60", "plan90"].map((key) => list((source as Record<string, unknown>)[key] ?? (current as unknown as Record<string, unknown> | null)?.[key])); await db.prepare("INSERT OR REPLACE INTO account_plans VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, ...values.map((value) => JSON.stringify(value)), body.action === "plan_apply" ? "human-approved" : body.action === "plan_save" ? "human-edited" : String(current?.approvalStatus || "draft"), JSON.stringify(suggestion), now).run(); return Response.json({ ok: true, suggestion });
  }
  if (body.action === "analyze") { const last = row.last_analyzed_at ? new Date(String(row.last_analyzed_at)).getTime() : 0; if (body.force || Date.now() - last > 12 * 3600000) await recomputeAccount(db, id); return Response.json({ ok: true }); }
  if (body.action === "relationship") {
    const allowedRelations = ["reporta_para", "influencia", "aliado", "bloqueia", "decide", "possui_iniciativa"];
    const relationshipId = String(body.relationshipId || `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    if (String(body.operation) === "delete") {
      await db.prepare("DELETE FROM account_relationships WHERE id = ? AND discovery_id = ?").bind(relationshipId, id).run();
      return Response.json({ ok: true });
    }
    const sourceId = String(body.sourceStakeholderId || body.source || "");
    const targetId = String(body.targetStakeholderId || body.target || "");
    const relationType = String(body.relationType || body.type || "reporta_para");
    if (!sourceId || !targetId || sourceId === targetId || !allowedRelations.includes(relationType)) return Response.json({ error: "Origem, destino e tipo de relação válidos são obrigatórios." }, { status: 400 });
    const people = await db.prepare("SELECT id FROM stakeholders WHERE discovery_id = ? AND id IN (?, ?)").bind(id, sourceId, targetId).all<{ id: string }>();
    if (people.results.length !== 2) return Response.json({ error: "Os dois stakeholders precisam pertencer à conta." }, { status: 400 });
    const existing = await db.prepare("SELECT id, created_at FROM account_relationships WHERE discovery_id = ? AND source_stakeholder_id = ? AND target_stakeholder_id = ? AND relation_type = ?").bind(id, sourceId, targetId, relationType).first<Record<string, unknown>>();
    const savedId = String(existing?.id || relationshipId);
    await db.prepare("INSERT OR REPLACE INTO account_relationships (id, discovery_id, source_stakeholder_id, target_stakeholder_id, relation_type, label, confidence, evidence_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(savedId, id, sourceId, targetId, relationType, String(body.label || ""), Math.max(0, Math.min(100, Number(body.confidence || 85))), JSON.stringify(Array.isArray(body.evidence) ? body.evidence : []), "confirmed", String(existing?.created_at || now), now).run();
    if (relationType === "reporta_para") await db.prepare("UPDATE stakeholders SET reports_to_id = ?, updated_at = ? WHERE id = ? AND discovery_id = ?").bind(targetId, now, sourceId, id).run();
    return Response.json({ ok: true, relationshipId: savedId });
  }
  if (body.action === "graph_layout") {
    const mode = String(body.mode) === "influence" ? "influence" : "hierarchy";
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 250) : [];
    const viewport = body.viewport && typeof body.viewport === "object" ? body.viewport : {};
    await db.prepare("INSERT OR REPLACE INTO account_graph_layouts (id, discovery_id, mode, nodes_json, viewport_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(`layout-${id}-${mode}`, id, mode, JSON.stringify(nodes), JSON.stringify(viewport), now).run();
    return Response.json({ ok: true, mode });
  }
  if (body.action === "research") {
    const companyName = String(body.companyName || row.customer_name).trim();
    const domain = normalizeCompanyDomain(body.domain || row.company_domain);
    if (!body.confirmed || companyName.toLowerCase() !== String(row.customer_name).trim().toLowerCase() || !domain) return Response.json({ error: "Confirme o nome da empresa e um domínio corporativo válido antes da pesquisa pública." }, { status: 400 });
    if (classificationOf(row) === "confidential") return Response.json({ error: "Pesquisa com Gemini está bloqueada para contas confidenciais. Use watsonx ou registre fontes aprovadas manualmente." }, { status: 403 });
    const query = String(body.question || "sinais estratégicos, tecnologia, investimentos e riscos recentes").trim();
    const provider = aiAdapter();
    const queryKey = await cacheKeyFor([id, "public-research", providerCacheSignature(provider, "test"), companyName.toLowerCase(), domain, query.toLowerCase()]);
    const saved = await db.prepare("SELECT * FROM external_signals WHERE discovery_id = ? AND query_fingerprint = ? AND expires_at > ? ORDER BY created_at DESC").bind(id, queryKey, now).all<Record<string, unknown>>();
    if (saved.results.length && !body.force) return Response.json({ signals: saved.results.map((signal) => ({ id: signal.id, title: signal.title, summary: signal.summary, sourceUrl: signal.source_url, publisher: signal.publisher, publishedAt: signal.published_at, status: signal.status, confidence: signal.confidence })), cached: true, provider: "google-gemini" });
    const quota = await quotaAllows(db, "generative");
    if (!quota.allowed) return Response.json({ error: "A cota experimental de IA foi atingida. Tente novamente mais tarde; nenhuma informação foi alterada.", quota }, { status: 429 });
    const context = await collectAccountSources(db, id);
    const generated = await provider.researchAccount(JSON.stringify({ existingAccountMemory: context.slice(0, 20).map((source) => ({ id: source.id, title: source.title, content: source.content })) }), { companyName, domain, question: query }, { classification: "test" });
    await recordAIRun(db, id, "public-research", generated, context.slice(0, 10).map((source) => source.id), generated.ok ? 78 : 0, "Pesquisa pública sob demanda; achados permanecem propostas até aprovação humana.");
    if (!generated.data || !generated.data.citations.length) return Response.json({ error: "A pesquisa fundamentada não retornou fontes verificáveis. Nenhuma informação foi salva.", provider: dbProviderName(generated.provider), model: generated.model, reason: generated.reason }, { status: 503 });
    await db.prepare("UPDATE discoveries SET company_domain = ?, updated_at = ? WHERE id = ?").bind(domain, now, id).run();
    const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const savedSignals = [];
    for (let index = 0; index < generated.data.signals.length; index += 1) {
      const signal = generated.data.signals[index];
      const citation = generated.data.citations[index % generated.data.citations.length];
      const signalId = `signal-${Date.now()}-${index}`;
      await db.prepare("INSERT INTO external_signals (id, discovery_id, query_fingerprint, title, summary, source_url, publisher, published_at, citation_json, status, confidence, approved_at, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(signalId, id, queryKey, signal.title, `${signal.description} Relevância: ${signal.relevance}`, citation.uri, citation.title, signal.publishedAt, JSON.stringify(citation), "proposed", 72, null, expiresAt, now, now).run();
      savedSignals.push({ id: signalId, title: signal.title, summary: signal.description, relevance: signal.relevance, sourceUrl: citation.uri, publisher: citation.title, publishedAt: signal.publishedAt, status: "proposed", confidence: 72 });
    }
    return Response.json({ summary: generated.data.summary, signals: savedSignals, provider: dbProviderName(generated.provider), model: generated.model, cached: false, usage: generated.usage, requiresHumanApproval: true });
  }
  if (body.action === "external_signal_status") {
    const signalId = String(body.signalId || "");
    const status = String(body.status) === "approved" ? "approved" : "discarded";
    const signal = await db.prepare("SELECT * FROM external_signals WHERE id = ? AND discovery_id = ?").bind(signalId, id).first<Record<string, unknown>>();
    if (!signal) return Response.json({ error: "Sinal público não encontrado." }, { status: 404 });
    await db.prepare("UPDATE external_signals SET status = ?, approved_at = ?, updated_at = ? WHERE id = ? AND discovery_id = ?").bind(status, status === "approved" ? now : null, now, signalId, id).run();
    if (status === "approved") {
      await addEvent(db, { id: `evt-${id}-${signalId}`, discoveryId: id, type: "public_signal", title: String(signal.title), content: `${String(signal.summary)} Fonte: ${String(signal.source_url)}`, sourceType: "public_research", sourceId: signalId, evidenceStatus: "confirmed", confidence: Number(signal.confidence || 72), occurredAt: String(signal.published_at || now) });
      await recomputeAccount(db, id);
    }
    return Response.json({ ok: true, status });
  }
  if (body.action === "account_settings") {
    const classification = String(body.dataClassification) === "confidential" ? "confidential" : "test";
    const rawDomain = String(body.companyDomain || "").trim();
    const domain = normalizeCompanyDomain(rawDomain);
    if (rawDomain && !domain) return Response.json({ error: "Informe um domínio corporativo válido, como empresa.com.br." }, { status: 400 });
    await db.prepare("UPDATE discoveries SET data_classification = ?, company_domain = ?, updated_at = ? WHERE id = ?").bind(classification, domain, now, id).run();
    await db.batch([
      db.prepare("DELETE FROM ai_cache WHERE discovery_id = ?").bind(id),
      db.prepare("DELETE FROM daily_briefings WHERE owner_email = ?").bind(identity.email),
      ...(classification === "confidential" ? [db.prepare("DELETE FROM account_embeddings WHERE discovery_id = ?").bind(id)] : []),
    ]);
    return Response.json({ ok: true, dataClassification: classification, companyDomain: domain });
  }
  if (body.action === "stakeholder_upsert") {
    const stakeholderId = String(body.stakeholderId || `stk-${Date.now()}`); const name = String(body.name || "").trim(); const role = String(body.role || "").trim(); if (!name || !role) return Response.json({ error: "Nome e cargo são obrigatórios." }, { status: 400 }); const reportsToId = body.reportsToId ? String(body.reportsToId) : null; if (reportsToId === stakeholderId) return Response.json({ error: "Uma pessoa não pode reportar a si mesma." }, { status: 400 });
    const existing = await db.prepare("SELECT created_at FROM stakeholders WHERE id = ? AND discovery_id = ?").bind(stakeholderId, id).first<Record<string, unknown>>(); await db.prepare("INSERT OR REPLACE INTO stakeholders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(stakeholderId, id, name, role, String(body.area || "Não informada"), reportsToId, String(body.influence || "Média"), String(body.stance || "Desconhecido"), JSON.stringify(list(body.priorities).slice(0, 8)), String(body.notes || ""), "manual", String(existing?.created_at || now), now).run(); await addEvent(db, { id: `evt-${id}-${stakeholderId}`, discoveryId: id, type: "stakeholder", title: `${name} · ${role}`, content: `${String(body.notes || "")} Prioridades: ${list(body.priorities).join(", ")}`, sourceType: "stakeholder", sourceId: stakeholderId, evidenceStatus: "confirmed", confidence: 90, occurredAt: now }); await recomputeAccount(db, id); return Response.json({ ok: true });
  }
  if (body.action === "stakeholder_delete") { const stakeholderId = String(body.stakeholderId || ""); await db.batch([db.prepare("UPDATE stakeholders SET reports_to_id = NULL WHERE reports_to_id = ? AND discovery_id = ?").bind(stakeholderId, id), db.prepare("DELETE FROM account_relationships WHERE discovery_id = ? AND (source_stakeholder_id = ? OR target_stakeholder_id = ?)").bind(id, stakeholderId, stakeholderId), db.prepare("DELETE FROM stakeholders WHERE id = ? AND discovery_id = ?").bind(stakeholderId, id), db.prepare("DELETE FROM account_events WHERE source_type = 'stakeholder' AND source_id = ? AND discovery_id = ?").bind(stakeholderId, id)]); await recomputeAccount(db, id); return Response.json({ ok: true }); }
  if (body.action === "feedback") { await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "feedback", body.accepted ? "Handoff validado pelo usuário" : "Handoff devolvido para revisão", now).run(); return Response.json({ ok: true }); }
  return Response.json({ error: "Ação desconhecida." }, { status: 400 });
}
