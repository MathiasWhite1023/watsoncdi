import { env } from "cloudflare:workers";

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

function parseJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(candidate) as Partial<MeetingInsight>;
}

async function getWatsonxInsights(notes: string, customerName: string, industry: string): Promise<MeetingInsight | null> {
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const apiKey = runtimeEnv.WATSONX_API_KEY;
  const projectId = runtimeEnv.WATSONX_PROJECT_ID;
  const baseUrl = runtimeEnv.WATSONX_URL;
  const modelId = runtimeEnv.WATSONX_MODEL_ID;
  if (!apiKey || !projectId || !baseUrl || !modelId) return null;

  const tokenResponse = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  if (!tokenResponse.ok) return null;
  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) return null;

  const prompt = `Você é um especialista IBM de account intelligence antes do CRM.
Analise as notas de reunião e responda somente JSON válido, sem markdown.
Cliente: ${customerName}
Setor: ${industry}
Notas:
${notes}

Formato obrigatório:
{
  "summary": "resumo executivo curto",
  "signals": ["sinais de negócio ou tecnologia"],
  "ibmThemes": ["temas IBM recomendados, ex: FinOps, Trusted Data, AI Governance, Hybrid Cloud, Automation, App Modernization"],
  "nextQuestions": ["perguntas para próxima conversa"],
  "nextActions": ["ações recomendadas antes do CRM"],
  "risks": ["riscos ou lacunas"],
  "stakeholders": ["stakeholders citados ou inferidos"],
  "systems": ["sistemas, plataformas ou clouds citados"],
  "painPoints": ["dores do cliente"]
}`;

  const generationResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/ml/v1/text/generation?version=2023-05-29`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      model_id: modelId,
      project_id: projectId,
      input: prompt,
      parameters: { decoding_method: "greedy", max_new_tokens: 900, min_new_tokens: 80, temperature: 0.2 },
    }),
  });
  if (!generationResponse.ok) return null;
  const generationPayload = (await generationResponse.json()) as { results?: Array<{ generated_text?: string }> };
  const generated = generationPayload.results?.[0]?.generated_text;
  if (!generated) return null;

  const parsed = parseJsonObject(generated);
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
    db.prepare("CREATE INDEX IF NOT EXISTS discoveries_updated_idx ON discoveries(updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS meetings_discovery_created_idx ON meetings(discovery_id, created_at)"),
  ]);
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
      await db.prepare("INSERT OR IGNORE INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
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
    await db.prepare("INSERT INTO discoveries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(example.id, example.name, example.industry, example.size, "Mariana Costa", example.answers.length >= 5 ? "Qualificação pré-CRM" : "Account intelligence", Math.min(100, 20 + example.answers.length * 12 + 22), result.priority, result.challengeSummary, JSON.stringify(example.answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now.toISOString(), updated).run();
    await db.prepare("INSERT INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(meeting.id, meeting.discoveryId, meeting.title, meeting.notes, meeting.summary, JSON.stringify(meeting.insights), meeting.aiStatus, meeting.createdAt).run();
    const accountMap = buildAccountMap({ customerName: example.name, industry: example.industry, scores: result.scores }, example.answers, [meeting]);
    await db.prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(example.id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(example.id, "meeting", `Reunião analisada por ${meeting.aiStatus === "watsonx" ? "watsonx" : "fallback determinístico"}`, updated).run();
  }
}

function mapMeeting(row: Record<string, unknown>): Meeting {
  const insights = JSON.parse(String(row.insights_json || "{}")) as MeetingInsight;
  return {
    id: String(row.id),
    discoveryId: String(row.discovery_id),
    title: String(row.title),
    notes: String(row.notes),
    summary: String(row.summary),
    insights: { ...insights, aiStatus: (row.ai_status as MeetingInsight["aiStatus"]) || insights.aiStatus || "fallback" },
    aiStatus: (row.ai_status as Meeting["aiStatus"]) || "fallback",
    createdAt: String(row.created_at),
  };
}

function mapDiscovery(row: Record<string, unknown>, meetings: Meeting[], accountMap?: AccountMap) {
  const answers = JSON.parse(String(row.answers_json)) as Answer[];
  const scores = JSON.parse(String(row.scores_json)) as Score[];
  const mapped = accountMap || buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores }, answers, meetings);
  return {
    id: row.id,
    customerName: row.customer_name,
    industry: row.industry,
    companySize: row.company_size,
    owner: row.owner,
    stage: row.stage,
    progress: row.progress,
    priority: row.priority,
    challengeSummary: row.challenge_summary,
    answers,
    meetings,
    accountMap: mapped,
    aiMode: meetings[0]?.aiStatus || "fallback",
    scores,
    recommendations: JSON.parse(String(row.recommendations_json)),
    nextEngagement: row.next_engagement,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const db = env.DB as D1Database;
  await ensureSchema(db);
  await seed(db);
  const [discoveriesResult, eventsResult, meetingsResult, mapsResult] = await Promise.all([
    db.prepare("SELECT * FROM discoveries ORDER BY updated_at DESC").all(),
    db.prepare("SELECT id, discovery_id, type, detail, created_at FROM audit_events ORDER BY created_at DESC LIMIT 50").all(),
    db.prepare("SELECT * FROM meetings ORDER BY created_at DESC").all(),
    db.prepare("SELECT * FROM account_maps").all(),
  ]);
  const meetings = meetingsResult.results.map((row) => mapMeeting(row as Record<string, unknown>));
  const maps = new Map((mapsResult.results as Record<string, unknown>[]).map((row) => [String(row.discovery_id), { nodes: JSON.parse(String(row.nodes_json)), edges: JSON.parse(String(row.edges_json)), updatedAt: String(row.updated_at) } as AccountMap]));
  return Response.json({
    discoveries: discoveriesResult.results.map((row) => {
      const record = row as Record<string, unknown>;
      return mapDiscovery(record, meetings.filter((meeting) => meeting.discoveryId === record.id), maps.get(String(record.id)));
    }),
    meetings,
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
    const accountMap = buildAccountMap({ customerName: String(body.customerName), industry: String(body.industry), scores }, [], []);
    await db.prepare("INSERT INTO discoveries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, String(body.customerName), String(body.industry), String(body.companySize || "Enterprise"), "Mariana Costa", "Account intelligence", 8, "Baixa", "Conta criada. Registre uma reunião para gerar inteligência antes do CRM.", "[]", JSON.stringify(scores), "[]", "Registrar primeira reunião", now, now).run();
    await db.prepare("INSERT INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "create", "Conta criada para account intelligence", now).run();
    const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first();
    return Response.json(mapDiscovery(row as Record<string, unknown>, [], accountMap), { status: 201 });
  }

  const id = String(body.id);
  const row = await db.prepare("SELECT * FROM discoveries WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Discovery not found" }, { status: 404 });

  if (body.action === "answer") {
    const answers = JSON.parse(String(row.answers_json)) as Answer[];
    const existing = answers.findIndex((item) => item.key === body.key);
    const nextAnswer = { key: String(body.key), question: String(body.question), answer: String(body.answer), at: now };
    if (existing >= 0) answers[existing] = nextAnswer; else answers.push(nextAnswer);
    const meetingRows = await db.prepare("SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC").bind(id).all();
    const meetings = meetingRows.results.map((item) => mapMeeting(item as Record<string, unknown>));
    const result = analyze(answers, meetings);
    const progress = Math.min(100, 16 + answers.length * 10 + meetings.length * 18);
    const stage = meetings.length >= 2 && result.priority !== "Baixa" ? "Pronto para handoff" : meetings.length ? "Qualificação pré-CRM" : "Account intelligence";
    const accountMap = buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores: result.scores }, answers, meetings);
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, answers_json = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?")
      .bind(stage, progress, result.priority, result.challengeSummary, JSON.stringify(answers), JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run();
    await db.prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "answer", `Sinal de discovery atualizado em ${String(body.key)}`, now).run();
    return Response.json({ ok: true });
  }

  if (body.action === "meeting") {
    const notes = String(body.notes || "").trim();
    if (!notes) return Response.json({ error: "Meeting notes are required" }, { status: 400 });
    let insights: MeetingInsight;
    try {
      insights = await getWatsonxInsights(notes, String(row.customer_name), String(row.industry)) || fallbackMeetingInsights(notes, String(row.customer_name));
    } catch {
      insights = { ...fallbackMeetingInsights(notes, String(row.customer_name)), aiStatus: "error" };
    }
    const meeting: Meeting = {
      id: `mtg-${Date.now()}`,
      discoveryId: id,
      title: String(body.title || "Reunião registrada"),
      notes,
      summary: insights.summary,
      insights,
      aiStatus: insights.aiStatus,
      createdAt: now,
    };
    await db.prepare("INSERT INTO meetings VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(meeting.id, id, meeting.title, meeting.notes, meeting.summary, JSON.stringify(insights), meeting.aiStatus, now).run();
    const answers = JSON.parse(String(row.answers_json)) as Answer[];
    const meetingRows = await db.prepare("SELECT * FROM meetings WHERE discovery_id = ? ORDER BY created_at DESC").bind(id).all();
    const meetings = meetingRows.results.map((item) => mapMeeting(item as Record<string, unknown>));
    const result = analyze(answers, meetings);
    const progress = Math.min(100, 20 + answers.length * 10 + meetings.length * 18);
    const stage = meetings.length >= 2 && result.priority !== "Baixa" ? "Pronto para handoff" : "Qualificação pré-CRM";
    const accountMap = buildAccountMap({ customerName: String(row.customer_name), industry: String(row.industry), scores: result.scores }, answers, meetings);
    await db.prepare("UPDATE discoveries SET stage = ?, progress = ?, priority = ?, challenge_summary = ?, scores_json = ?, recommendations_json = ?, next_engagement = ?, updated_at = ? WHERE id = ?")
      .bind(stage, progress, result.priority, result.challengeSummary, JSON.stringify(result.scores), JSON.stringify(result.recommendations), result.nextEngagement, now, id).run();
    await db.prepare("INSERT OR REPLACE INTO account_maps VALUES (?, ?, ?, ?)")
      .bind(id, JSON.stringify(accountMap.nodes), JSON.stringify(accountMap.edges), accountMap.updatedAt).run();
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "meeting", `Reunião analisada por ${meeting.aiStatus === "watsonx" ? "IBM watsonx" : meeting.aiStatus === "error" ? "fallback após erro de IA" : "fallback determinístico"}`, now).run();
    return Response.json({ ok: true, meeting });
  }

  if (body.action === "feedback") {
    await db.prepare("INSERT INTO audit_events (discovery_id, type, detail, created_at) VALUES (?, ?, ?, ?)").bind(id, "feedback", body.accepted ? "Handoff pré-CRM validado pelo Business Partner" : "Recomendação enviada para revisão humana", now).run();
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
