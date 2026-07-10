import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Answer = { key: string; question: string; answer: string; at: string };
type Score = { name: string; short: string; alignment: number; value: number; readiness: number; confidence: number; level: "Alta" | "Média" | "Baixa"; evidence: string[] };
type Recommendation = { type: "Capacidade" | "Software" | "Consultoria"; name: string; rationale: string };

const initialScores = (): Score[] => [
  { name: "FinOps & Technology Financial Management", short: "FinOps", alignment: 36, value: 45, readiness: 38, confidence: 30, level: "Baixa", evidence: ["Descoberta inicial ainda sem evidência suficiente."] },
  { name: "Trusted Data & Data Security", short: "Trusted Data", alignment: 34, value: 44, readiness: 36, confidence: 30, level: "Baixa", evidence: ["Descoberta inicial ainda sem evidência suficiente."] },
  { name: "AI Governance", short: "AI Governance", alignment: 30, value: 40, readiness: 34, confidence: 26, level: "Baixa", evidence: ["Domínio exploratório; requer mais contexto."] },
  { name: "Hybrid Infrastructure", short: "Hybrid Cloud", alignment: 28, value: 38, readiness: 32, confidence: 26, level: "Baixa", evidence: ["Domínio exploratório; requer mais contexto."] },
  { name: "Automation", short: "Automation", alignment: 24, value: 36, readiness: 30, confidence: 24, level: "Baixa", evidence: ["Domínio exploratório; requer mais contexto."] },
  { name: "Application Modernization", short: "App Modernization", alignment: 22, value: 34, readiness: 28, confidence: 24, level: "Baixa", evidence: ["Domínio exploratório; requer mais contexto."] },
];

const level = (value: number): "Alta" | "Média" | "Baixa" => value >= 75 ? "Alta" : value >= 50 ? "Média" : "Baixa";
const clamp = (value: number) => Math.max(12, Math.min(97, Math.round(value)));
const hitCount = (text: string, words: string[]) => words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);

function analyze(answers: Answer[]) {
  const text = answers.map((item) => item.answer.toLowerCase()).join(" ");
  const completeness = answers.length;
  const confidence = clamp(30 + completeness * 10);
  const readinessHits = hitCount(text, ["patroc", "executiv", "urg", "prazo", "time", "orçamento", "budget", "iniciativa", "prioridade"]);
  const finopsHits = hitCount(text, ["custo", "cloud", "nuvem", "orçamento", "budget", "desperd", "forecast", "rateio", "finops", "otimiza", "multicloud"]);
  const dataHits = hitCount(text, ["dado", "governan", "qualidade", "linhagem", "catálogo", "seguran", "lgpd", "compliance", "silo", "integra", "ia ", "ai "]);
  const aiHits = hitCount(text, ["inteligência artificial", " ia ", "ai ", "modelo", "governança de ia", "responsável"]);
  const hybridHits = hitCount(text, ["híbr", "multicloud", "datacenter", "legado", "infraestrutura", "container", "kubernetes"]);
  const automationHits = hitCount(text, ["manual", "automação", "automat", "ineficiência", "processo", "produtividade"]);
  const appHits = hitCount(text, ["aplicação", "aplicativo", "legado", "moderniza", "mainframe", "entrega", "devops"]);
  const base = 28 + completeness * 4;

  const make = (name: string, short: string, hits: number, evidence: string[]): Score => {
    const alignment = clamp(base + hits * 8);
    const value = clamp(40 + hits * 7 + completeness * 3);
    const readiness = clamp(34 + readinessHits * 7 + completeness * 2);
    return { name, short, alignment, value, readiness, confidence, level: level(alignment), evidence: evidence.length ? evidence : ["Há poucos indicadores diretos; recomenda-se aprofundar a descoberta."] };
  };

  const quote = (key: string) => answers.find((item) => item.key === key)?.answer;
  const scores = [
    make("FinOps & Technology Financial Management", "FinOps", finopsHits, [quote("finops") && `Evidência financeira: “${quote("finops")?.slice(0, 150)}”`, finopsHits > 2 && "Foram identificados sinais de pressão de custos, governança ou otimização multicloud."].filter(Boolean) as string[]),
    make("Trusted Data & Data Security", "Trusted Data", dataHits, [quote("data") && `Evidência de dados: “${quote("data")?.slice(0, 150)}”`, quote("security") && `Evidência de segurança: “${quote("security")?.slice(0, 150)}”`, dataHits > 2 && "O contexto conecta dados confiáveis, proteção e prontidão para IA."].filter(Boolean) as string[]),
    make("AI Governance", "AI Governance", aiHits, [aiHits > 1 && "A estratégia menciona adoção ou governança de IA."].filter(Boolean) as string[]),
    make("Hybrid Infrastructure", "Hybrid Cloud", hybridHits, [quote("landscape") && `Cenário tecnológico: “${quote("landscape")?.slice(0, 150)}”`].filter(Boolean) as string[]),
    make("Automation", "Automation", automationHits, [automationHits > 1 && "Há sinais de processos manuais ou eficiência operacional."].filter(Boolean) as string[]),
    make("Application Modernization", "App Modernization", appHits, [appHits > 1 && "O ambiente aponta dependências legadas ou necessidade de modernização."].filter(Boolean) as string[]),
  ].sort((a, b) => b.alignment - a.alignment);

  const top = scores[0];
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
      { type: "Capacidade", name: "AI Governance", rationale: "A adoção de IA exige transparência, risco, políticas e supervisão humana coordenados." },
      { type: "Software", name: "watsonx.governance + watsonx.ai", rationale: "Conecta ciclo de vida de modelos, controles de risco e evidências operacionais." },
      { type: "Consultoria", name: "AI Readiness & Governance Workshop", rationale: "Define casos prioritários, guardrails e modelo operacional responsável." },
    ],
    "Hybrid Cloud": [
      { type: "Capacidade", name: "Hybrid Infrastructure", rationale: "O cenário distribuído exige portabilidade, consistência operacional e otimização." },
      { type: "Software", name: "Red Hat OpenShift + HashiCorp Terraform", rationale: "Padroniza execução e provisionamento seguro em ambientes híbridos." },
      { type: "Consultoria", name: "Hybrid Cloud Architecture Review", rationale: "Cria um roadmap de arquitetura alinhado às prioridades de negócio." },
    ],
    Automation: [
      { type: "Capacidade", name: "Enterprise Automation", rationale: "Os sinais de processos manuais e ineficiência indicam potencial de produtividade." },
      { type: "Software", name: "watsonx Orchestrate + IBM Concert", rationale: "Orquestra trabalho e conecta insights operacionais a ações coordenadas." },
      { type: "Consultoria", name: "Automation Discovery Workshop", rationale: "Prioriza jornadas de automação por impacto, risco e esforço." },
    ],
    "App Modernization": [
      { type: "Capacidade", name: "Application Modernization", rationale: "Dependências legadas e velocidade de entrega sugerem uma jornada incremental de modernização." },
      { type: "Software", name: "Red Hat OpenShift + IBM Instana", rationale: "Apoia modernização com uma plataforma consistente e observabilidade ponta a ponta." },
      { type: "Consultoria", name: "Application Modernization Assessment", rationale: "Classifica aplicações e define ondas de modernização orientadas a valor." },
    ],
  };
  const recommendations = recommendationMap[top.short] || recommendationMap["Trusted Data"];
  const challengeSummary = answers[0]?.answer ? answers[0].answer.slice(0, 220) : "Contexto inicial em construção; a descoberta ainda precisa de evidências de negócio.";
  const nextEngagement = recommendations[2]?.name || "Aprofundar descoberta";
  const priority = top.alignment >= 75 && top.readiness >= 60 ? "Alta" : top.alignment >= 50 ? "Média" : "Baixa";
  return { scores, recommendations, challengeSummary, nextEngagement, priority };
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS discoveries (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, industry TEXT NOT NULL, company_size TEXT NOT NULL, owner TEXT NOT NULL, stage TEXT NOT NULL, progress INTEGER NOT NULL, priority TEXT NOT NULL, challenge_summary TEXT NOT NULL, answers_json TEXT NOT NULL, scores_json TEXT NOT NULL, recommendations_json TEXT NOT NULL, next_engagement TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, discovery_id TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS discoveries_updated_idx ON discoveries(updated_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at)`),
  ]);
}

async function seed(db: D1Database) {
  const count = await db.prepare("SELECT COUNT(*) AS count FROM discoveries").first<{ count: number }>();
  if ((count?.count || 0) > 0) return;
  const now = new Date();
  const examples = [
    { id: "aurora-retail", name: "Aurora Retail Group", industry: "Varejo", size: "Enterprise", answers: [
      { key: "context", question: "Qual é o principal objetivo de negócio para os próximos 12 meses?", answer: "Reduzir o custo operacional do e-commerce e recuperar previsibilidade dos investimentos em cloud sem comprometer a experiência do cliente.", at: new Date(now.getTime() - 46e5).toISOString() },
      { key: "landscape", question: "Como está organizado o ambiente de tecnologia e nuvem hoje?", answer: "Operamos em AWS e Azure, além de aplicações legadas no datacenter. O rateio por unidade e produto é pouco confiável.", at: new Date(now.getTime() - 42e5).toISOString() },
      { key: "finops", question: "Quais desafios existem em custos, previsibilidade e governança?", answer: "A fatura cloud cresceu 34%, existem recursos ociosos e não temos forecast nem accountability clara entre finanças e engenharia.", at: new Date(now.getTime() - 38e5).toISOString() },
      { key: "data", question: "O que impede o consumo de dados com confiança?", answer: "Há silos entre canais e qualidade irregular nos dados de produto e cliente.", at: new Date(now.getTime() - 30e5).toISOString() },
      { key: "security", question: "Quais riscos mais preocupam a liderança?", answer: "LGPD e acesso excessivo a dados de clientes continuam no radar do comitê de risco.", at: new Date(now.getTime() - 20e5).toISOString() },
      { key: "readiness", question: "Existe patrocínio e urgência?", answer: "O CFO patrocina a iniciativa, existe um time conjunto e a decisão precisa ocorrer neste trimestre.", at: new Date(now.getTime() - 12e5).toISOString() },
    ] as Answer[] },
    { id: "banco-horizonte", name: "Banco Horizonte", industry: "Serviços financeiros", size: "Enterprise", answers: [
      { key: "context", question: "Qual é o principal objetivo de negócio?", answer: "Acelerar casos de IA generativa com dados confiáveis e controles compatíveis com o ambiente regulado.", at: new Date(now.getTime() - 864e5).toISOString() },
      { key: "landscape", question: "Como está o cenário tecnológico?", answer: "Ambiente híbrido com mainframe, lakehouse e várias plataformas de dados isoladas.", at: new Date(now.getTime() - 820e5).toISOString() },
      { key: "finops", question: "Quais desafios financeiros?", answer: "Há interesse em otimização, mas o foco executivo está em risco e velocidade para IA.", at: new Date(now.getTime() - 760e5).toISOString() },
      { key: "data", question: "O que impede o uso confiável de dados?", answer: "Linhas de negócio não confiam na qualidade, a linhagem é parcial e o catálogo não cobre dados sensíveis.", at: new Date(now.getTime() - 720e5).toISOString() },
      { key: "security", question: "Quais riscos preocupam a liderança?", answer: "Proteção de dados sensíveis, LGPD, segregação de acesso e auditoria de modelos de IA.", at: new Date(now.getTime() - 680e5).toISOString() },
    ] as Answer[] },
    { id: "novalog", name: "NovaLog", industry: "Logística", size: "Large", answers: [
      { key: "context", question: "Qual é o principal objetivo de negócio?", answer: "Melhorar produtividade da operação e reduzir atrasos causados por processos manuais.", at: new Date(now.getTime() - 2 * 864e5).toISOString() },
      { key: "landscape", question: "Como está o cenário tecnológico?", answer: "Aplicações legadas e integrações ponto a ponto entre transporte, armazém e clientes.", at: new Date(now.getTime() - 1.8 * 864e5).toISOString() },
      { key: "finops", question: "Quais desafios financeiros?", answer: "Ainda não existe uma visão consolidada de custo por serviço ou rota.", at: new Date(now.getTime() - 1.6 * 864e5).toISOString() },
    ] as Answer[] },
    { id: "solaris-energia", name: "Solaris Energia", industry: "Energia", size: "Enterprise", answers: [
      { key: "context", question: "Qual é o principal objetivo de negócio?", answer: "Criar uma fundação de dados industriais segura para analytics e manutenção preditiva.", at: new Date(now.getTime() - 3 * 864e5).toISOString() },
      { key: "landscape", question: "Como está o cenário tecnológico?", answer: "Dados OT e IT estão distribuídos entre plantas, cloud e sistemas de fornecedores.", at: new Date(now.getTime() - 2.8 * 864e5).toISOString() },
      { key: "finops", question: "Quais desafios financeiros?", answer: "Custos são acompanhados por projeto, mas sem otimização contínua da infraestrutura híbrida.", at: new Date(now.getTime() - 2.6 * 864e5).toISOString() },
      { key: "data", question: "O que impede o uso confiável de dados?", answer: "Falta governança comum, catálogo e qualidade consistente entre dados industriais e corporativos.", at: new Date(now.getTime() - 2.4 * 864e5).toISOString() },
    ] as Answer[] },
  ];
  for (const example of examples) {
    const result = analyze(example.answers);
    const updated = example.answers.at(-1)?.at || now.toISOString();
    await db.prepare("INSERT INTO discoveries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(example.id, example.name, example.industry, example.size, "Mariana Costa", example.answers.length >= 6 ? "Validação" : "Em descoberta", Math.min(100, 18 + example.answers.length * 14), result.priority, result.challengeSummary, JSON.stringify(example.answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now.toISOString(), updated).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(example.id, "analysis", `Scores recalculados com ${example.answers.length} evidências`, updated).run();
  }
}

function mapDiscovery(row: Record<string, unknown>) {
  return {
    id: row.id, customerName: row.customer_name, industry: row.industry, companySize: row.company_size,
    owner: row.owner, stage: row.stage, progress: row.progress, priority: row.priority,
    challengeSummary: row.challenge_summary, answers: JSON.parse(String(row.answers_json)),
    scores: JSON.parse(String(row.scores_json)), recommendations: JSON.parse(String(row.recommendations_json)),
    nextEngagement: row.next_engagement, updatedAt: row.updated_at,
  };
}

export async function GET() {
  const db = env.DB as D1Database;
  await ensureSchema(db);
  await seed(db);
  const [discoveriesResult, eventsResult] = await Promise.all([
    db.prepare("SELECT * FROM discoveries ORDER BY updated_at DESC").all(),
    db.prepare("SELECT id, discovery_id, type, detail, created_at FROM audit_events ORDER BY created_at DESC LIMIT 30").all(),
  ]);
  return Response.json({
    discoveries: discoveriesResult.results.map((row) => mapDiscovery(row as Record<string, unknown>)),
    events: eventsResult.results.map((row) => ({ id: row.id, discoveryId: row.discovery_id, type: row.type, detail: row.detail, createdAt: row.created_at })),
  });
}

export async function POST(request: Request) {
  const db = env.DB as D1Database;
  await ensureSchema(db);
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();

  if (body.action === "create") {
    const id = `cdi-${Date.now()}`;
    const scores = initialScores();
    await db.prepare("INSERT INTO discoveries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, String(body.customerName), String(body.industry), String(body.companySize || "Enterprise"), "Mariana Costa", "Contexto", 8, "Baixa", "Contexto inicial em construção; a descoberta ainda precisa de evidências de negócio.", "[]", JSON.stringify(scores), "[]", "Completar contexto do cliente", now, now).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "create", "Workspace de descoberta criado", now).run();
    const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first();
    return Response.json(mapDiscovery(row as Record<string, unknown>), { status: 201 });
  }

  const id = String(body.id);
  const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Discovery not found" }, { status: 404 });

  if (body.action === "answer") {
    const answers = JSON.parse(String(row.answers_json)) as Answer[];
    const existing = answers.findIndex((item) => item.key === body.key);
    const nextAnswer = { key: String(body.key), question: String(body.question), answer: String(body.answer), at: now };
    if (existing >= 0) answers[existing] = nextAnswer; else answers.push(nextAnswer);
    const result = analyze(answers);
    const progress = Math.min(100, 18 + answers.length * 14);
    const stage = answers.length >= 6 ? "Validação" : answers.length >= 4 ? "Análise de capacidade" : "Em descoberta";
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, answers_json = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?")
      .bind(stage, progress, result.priority, result.challengeSummary, JSON.stringify(answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "answer", `Nova evidência analisada em ${String(body.key)}`, now).run();
    return Response.json({ ok: true });
  }

  if (body.action === "feedback") {
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "feedback", body.accepted ? "Recomendação validada pelo Business Partner" : "Recomendação enviada para revisão humana", now).run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
