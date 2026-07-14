import { z } from "zod";

export const GUIDED_DISCOVERY_CATALOG_VERSION = "2026.1";

export const GUIDED_DISCOVERY_PILLARS = [
  "base",
  "finops",
  "trusted-data",
  "ai-governance",
  "hybrid-cloud",
  "automation",
  "app-modernization",
] as const;

export type GuidedDiscoveryPillarKey = (typeof GUIDED_DISCOVERY_PILLARS)[number];
export type GuidedDiscoveryMode = "adaptive" | "direct";
export type GuidedDiscoveryAnswerStatus = "draft" | "confirmed" | "unknown";

export type GuidedDiscoveryInput = {
  kind: "scale" | "single" | "multi";
  label: string;
  min?: number;
  max?: number;
  options?: string[];
};

export type GuidedDiscoveryCatalogQuestion = {
  id: string;
  pillar: GuidedDiscoveryPillarKey;
  title: string;
  question: string;
  rationale: string;
  hint: string;
  input: GuidedDiscoveryInput;
  keywords: string[];
};

export type GuidedDiscoveryAnswerLike = {
  questionId: string;
  status: GuidedDiscoveryAnswerStatus;
  evidenceStatus?: "confirmed" | "reported" | "hypothesis" | "unknown";
  stakeholderId?: string | null;
  sourceDate?: string | null;
  answerText?: string;
  structured?: Record<string, unknown>;
  updatedAt?: string;
};

export type GuidedDiscoveryMetrics = {
  addressed: number;
  total: number;
  progressPercent: number;
  confirmedWithEvidence: number;
  coveragePercent: number;
  gaps: number;
  stale: number;
  contradictions: number;
};

export type GuidedDiscoveryQuestionDelta = {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
};

const scale = (label: string): GuidedDiscoveryInput => ({ kind: "scale", label, min: 1, max: 5 });
const single = (label: string, options: string[]): GuidedDiscoveryInput => ({ kind: "single", label, options });
const multi = (label: string, options: string[]): GuidedDiscoveryInput => ({ kind: "multi", label, options });

export const GUIDED_DISCOVERY_CATALOG: GuidedDiscoveryCatalogQuestion[] = [
  {
    id: "base-business-objective",
    pillar: "base",
    title: "Objetivo de negócio",
    question: "Qual é o principal objetivo de negócio para os próximos 12 meses?",
    rationale: "O objetivo conecta tecnologia a resultado e evita começar a descoberta por um produto.",
    hint: "Descreva resultado, métrica e horizonte quando forem conhecidos.",
    input: single("Clareza do objetivo", ["Ainda não definido", "Tema geral", "Objetivo definido", "Objetivo com métrica", "Objetivo com métrica e prazo"]),
    keywords: ["crescimento", "receita", "margem", "custo", "produtividade", "experiência", "risco", "12 meses"],
  },
  {
    id: "base-why-now",
    pillar: "base",
    title: "Prioridade agora",
    question: "O que tornou esse tema prioritário agora?",
    rationale: "Entender o gatilho revela urgência, janela de decisão e custo de não agir.",
    hint: "Exemplos: meta executiva, incidente, auditoria, aumento de custo ou mudança regulatória.",
    input: multi("Gatilhos", ["Meta executiva", "Pressão de custo", "Risco ou compliance", "Incidente", "Mudança de mercado", "Ainda não sabemos"]),
    keywords: ["urgência", "agora", "prazo", "incidente", "auditoria", "meta", "prioridade"],
  },
  {
    id: "base-tech-landscape",
    pillar: "base",
    title: "Ambiente atual",
    question: "Como está organizado o ambiente de tecnologia hoje?",
    rationale: "O desenho atual mostra dependências, complexidade e onde uma mudança pode começar.",
    hint: "Inclua cloud, datacenter, plataformas, dados, aplicações críticas e modelo operacional.",
    input: single("Nível de compreensão", ["Não mapeado", "Parcial", "Principais ambientes", "Arquitetura mapeada", "Arquitetura e dependências mapeadas"]),
    keywords: ["aws", "azure", "cloud", "datacenter", "mainframe", "sap", "openshift", "arquitetura"],
  },
  {
    id: "base-biggest-loss",
    pillar: "base",
    title: "Maior perda",
    question: "Onde existe maior perda de dinheiro, produtividade, confiança, velocidade ou controle?",
    rationale: "A maior perda ajuda a dimensionar valor e priorizar a próxima conversa.",
    hint: "Traga um exemplo concreto e, se possível, uma ordem de grandeza.",
    input: multi("Tipos de impacto", ["Dinheiro", "Produtividade", "Confiança", "Velocidade", "Controle", "Ainda não sabemos"]),
    keywords: ["custo", "desperdício", "retrabalho", "atraso", "risco", "controle", "produtividade"],
  },
  {
    id: "base-stakeholders",
    pillar: "base",
    title: "Pessoas e decisão",
    question: "Quem sente a dor, quem influencia e quem decide?",
    rationale: "Uma hipótese técnica sem mapa político raramente avança para uma oportunidade qualificada.",
    hint: "Relacione a resposta a um stakeholder já mapeado ou registre os cargos ainda desconhecidos.",
    input: single("Cobertura política", ["Não mapeada", "Usuário da solução", "Influenciador", "Decisor", "Decisor e sponsor"]),
    keywords: ["ceo", "cio", "cto", "cfo", "ciso", "diretor", "sponsor", "decisor"],
  },
  {
    id: "base-qualification",
    pillar: "base",
    title: "Condições para avançar",
    question: "Existe sponsor, orçamento, prazo, time e critério de sucesso?",
    rationale: "Essas condições distinguem curiosidade de uma iniciativa capaz de avançar para o CRM.",
    hint: "Marque somente o que foi confirmado; o restante vira lacuna de descoberta.",
    input: multi("Condições confirmadas", ["Sponsor", "Orçamento", "Prazo", "Time", "Critério de sucesso", "Nenhuma confirmada"]),
    keywords: ["sponsor", "orçamento", "budget", "prazo", "time", "métrica", "sucesso"],
  },
  {
    id: "finops-allocation",
    pillar: "finops",
    title: "Alocação de custos",
    question: "Como os custos de tecnologia e cloud são alocados por produto, unidade ou time?",
    rationale: "Alocação confiável é a base para ownership e decisões de otimização.",
    hint: "Considere tags, centros de custo, showback, chargeback e custos compartilhados.",
    input: scale("Maturidade da alocação"),
    keywords: ["rateio", "alocação", "tag", "showback", "chargeback", "centro de custo"],
  },
  {
    id: "finops-forecast",
    pillar: "finops",
    title: "Orçamento e forecast",
    question: "Como orçamento, forecast e desvios de custo são acompanhados?",
    rationale: "Previsibilidade financeira mostra o valor potencial de uma prática FinOps.",
    hint: "Explique frequência, ferramenta, tolerância a desvios e quem recebe os alertas.",
    input: scale("Maturidade de planejamento"),
    keywords: ["forecast", "orçamento", "budget", "desvio", "previsibilidade"],
  },
  {
    id: "finops-accountability",
    pillar: "finops",
    title: "Accountability",
    question: "Como finanças e engenharia dividem responsabilidade pelas decisões de custo e performance?",
    rationale: "Sem responsabilidade compartilhada, recomendações de economia raramente são executadas.",
    hint: "Identifique fóruns, owners, metas e conflitos entre custo, risco e performance.",
    input: single("Modelo de responsabilidade", ["Não existe", "Ad hoc", "Responsáveis informais", "RACI definido", "Metas e rotina compartilhadas"]),
    keywords: ["finanças", "engenharia", "owner", "raci", "responsabilidade", "performance"],
  },
  {
    id: "finops-waste-risk",
    pillar: "finops",
    title: "Desperdício e risco",
    question: "Quais desperdícios são conhecidos e quais otimizações poderiam criar risco de performance?",
    rationale: "O valor real combina redução de custo com proteção de desempenho e experiência.",
    hint: "Inclua recursos ociosos, compromissos, licenças e workloads super ou subdimensionados.",
    input: multi("Sinais observados", ["Ociosidade", "Superdimensionamento", "Licenças", "Compromissos", "Risco de performance", "Ainda não medido"]),
    keywords: ["ocioso", "desperdício", "rightsizing", "reserva", "licença", "performance"],
  },
  {
    id: "trusted-data-sources",
    pillar: "trusted-data",
    title: "Fontes críticas",
    question: "Quais fontes de dados são críticas para as decisões e iniciativas prioritárias?",
    rationale: "Fontes críticas delimitam escopo e mostram onde confiança gera mais valor.",
    hint: "Liste sistemas de origem, consumidores e decisões que dependem desses dados.",
    input: single("Mapeamento das fontes", ["Não mapeado", "Fontes citadas", "Fontes e consumidores", "Fluxos críticos", "Fluxos e criticidade documentados"]),
    keywords: ["fonte", "erp", "crm", "lakehouse", "warehouse", "mainframe", "dado crítico"],
  },
  {
    id: "trusted-data-quality",
    pillar: "trusted-data",
    title: "Qualidade e integração",
    question: "Como qualidade, catálogo, linhagem e integração são tratados hoje?",
    rationale: "Esses controles explicam por que usuários confiam — ou não — nos dados.",
    hint: "Traga processos, ferramentas, cobertura e pontos onde a informação quebra.",
    input: multi("Capacidades existentes", ["Qualidade", "Catálogo", "Linhagem", "Integração", "Observabilidade de dados", "Nenhuma estruturada"]),
    keywords: ["qualidade", "catálogo", "linhagem", "integração", "observabilidade", "silo"],
  },
  {
    id: "trusted-data-sensitive",
    pillar: "trusted-data",
    title: "Dados sensíveis e acesso",
    question: "Onde estão os dados sensíveis e como o acesso é concedido, revogado e auditado?",
    rationale: "Segurança e privacidade determinam o risco e a viabilidade de novos usos de dados.",
    hint: "Considere classificação, LGPD, privilégios, mascaramento e trilha de auditoria.",
    input: scale("Maturidade de controle de acesso"),
    keywords: ["sensível", "lgpd", "acesso", "privilégio", "mascaramento", "auditoria"],
  },
  {
    id: "trusted-data-ownership",
    pillar: "trusted-data",
    title: "Ownership e SLAs",
    question: "Quem é owner dos dados e quais SLAs ou métricas definem confiança?",
    rationale: "Ownership e métricas tornam a governança executável e mensurável.",
    hint: "Relacione domínios, data owners, stewards, disponibilidade e qualidade esperada.",
    input: single("Modelo de ownership", ["Não existe", "Informal", "Owners por sistema", "Owners por domínio", "Owners com SLAs e métricas"]),
    keywords: ["owner", "steward", "domínio", "sla", "métrica", "governança"],
  },
  {
    id: "ai-governance-cases",
    pillar: "ai-governance",
    title: "Casos de IA",
    question: "Quais casos de IA existem, estão em piloto ou são prioridade para os próximos meses?",
    rationale: "O inventário conecta governança a decisões reais, não a controles abstratos.",
    hint: "Inclua objetivo, usuário, modelo, dados, impacto e estágio do caso.",
    input: single("Maturidade do portfólio", ["Nenhum caso", "Ideias", "Pilotos", "Produção isolada", "Portfólio gerenciado"]),
    keywords: ["ia", "ai", "genai", "modelo", "piloto", "produção", "caso de uso"],
  },
  {
    id: "ai-governance-risk",
    pillar: "ai-governance",
    title: "Aprovação de risco",
    question: "Como riscos de IA são avaliados, aprovados e documentados antes da produção?",
    rationale: "O processo de aprovação revela controles, gargalos e responsabilidades.",
    hint: "Considere jurídico, risco, segurança, privacidade e comitês de IA.",
    input: scale("Maturidade de aprovação"),
    keywords: ["risco", "aprovação", "documentação", "comitê", "jurídico", "privacidade"],
  },
  {
    id: "ai-governance-monitoring",
    pillar: "ai-governance",
    title: "Monitoramento",
    question: "Como modelos são monitorados quanto a drift, qualidade, explicabilidade e uso indevido?",
    rationale: "Monitoramento contínuo reduz risco depois que o modelo entra em operação.",
    hint: "Inclua métricas, alertas, revisão humana, logs e resposta a desvios.",
    input: multi("Controles operacionais", ["Qualidade", "Drift", "Viés", "Explicabilidade", "Uso indevido", "Nenhum contínuo"]),
    keywords: ["drift", "viés", "explicabilidade", "monitoramento", "alerta", "modelo"],
  },
  {
    id: "ai-governance-accountability",
    pillar: "ai-governance",
    title: "Responsabilidade",
    question: "Quem responde por decisões automatizadas e incidentes envolvendo IA?",
    rationale: "Responsabilidade clara é necessária para escalar IA com segurança.",
    hint: "Mapeie dono do caso, dono do modelo, risco, operação e escalonamento.",
    input: single("Clareza de responsabilidade", ["Não definida", "Caso a caso", "Owner técnico", "Owners técnico e negócio", "RACI e resposta a incidentes"]),
    keywords: ["responsável", "owner", "incidente", "decisão", "raci", "escalonamento"],
  },
  {
    id: "hybrid-cloud-workloads",
    pillar: "hybrid-cloud",
    title: "Distribuição de workloads",
    question: "Como workloads estão distribuídos entre cloud, datacenter, edge e plataformas terceiras?",
    rationale: "A distribuição mostra complexidade, restrições e pontos de padronização.",
    hint: "Inclua criticidade, dados, latência, regulação e responsabilidade operacional.",
    input: multi("Ambientes", ["Cloud pública", "Cloud privada", "Datacenter", "Edge", "SaaS", "Ainda não mapeado"]),
    keywords: ["workload", "cloud", "datacenter", "edge", "saas", "híbrido"],
  },
  {
    id: "hybrid-cloud-portability",
    pillar: "hybrid-cloud",
    title: "Portabilidade e padrões",
    question: "Quais padrões permitem — ou impedem — portabilidade e consistência entre ambientes?",
    rationale: "Padrões de plataforma e automação determinam velocidade e lock-in.",
    hint: "Considere containers, Kubernetes, IaC, pipelines, políticas e serviços proprietários.",
    input: scale("Maturidade de padronização"),
    keywords: ["portabilidade", "openshift", "kubernetes", "terraform", "iac", "padrão", "lock-in"],
  },
  {
    id: "hybrid-cloud-resilience",
    pillar: "hybrid-cloud",
    title: "Segurança e resiliência",
    question: "Como segurança, resiliência e observabilidade funcionam de ponta a ponta?",
    rationale: "Operação consistente é essencial antes de mover ou modernizar workloads.",
    hint: "Traga incidentes, SLOs, recuperação, visibilidade e controles entre ambientes.",
    input: multi("Capacidades", ["Segurança", "Backup e DR", "Observabilidade", "SLOs", "Resposta a incidentes", "Cobertura fragmentada"]),
    keywords: ["segurança", "resiliência", "dr", "observabilidade", "slo", "incidente"],
  },
  {
    id: "hybrid-cloud-dependencies",
    pillar: "hybrid-cloud",
    title: "Dependências e bloqueios",
    question: "Quais dependências técnicas, contratuais ou regulatórias impedem uma mudança?",
    rationale: "Bloqueios reais orientam uma sequência de transformação viável.",
    hint: "Inclua dados, licenças, integrações, habilidades, contratos e compliance.",
    input: multi("Tipos de bloqueio", ["Dados", "Integrações", "Licenças", "Contrato", "Habilidades", "Regulação"]),
    keywords: ["dependência", "contrato", "licença", "regulação", "integração", "skill"],
  },
  {
    id: "automation-repetitive",
    pillar: "automation",
    title: "Trabalho repetitivo",
    question: "Quais tarefas ou decisões repetitivas mais consomem tempo das equipes?",
    rationale: "Volume, frequência e esforço ajudam a priorizar automações com valor mensurável.",
    hint: "Descreva frequência, pessoas envolvidas, tempo e exceções.",
    input: single("Escala do trabalho manual", ["Ainda não mapeado", "Pontual", "Recorrente", "Alto volume", "Alto volume e impacto crítico"]),
    keywords: ["manual", "repetitivo", "tarefa", "decisão", "tempo", "volume"],
  },
  {
    id: "automation-handoffs",
    pillar: "automation",
    title: "Handoffs e retrabalho",
    question: "Onde existem handoffs, esperas, erros ou retrabalho entre áreas?",
    rationale: "Handoffs expõem gargalos de processo e oportunidades de orquestração.",
    hint: "Mapeie entrada, saída, aprovador, espera e causa mais comum de retorno.",
    input: scale("Impacto dos handoffs"),
    keywords: ["handoff", "espera", "erro", "retrabalho", "aprovação", "fila"],
  },
  {
    id: "automation-integrations",
    pillar: "automation",
    title: "Integrações necessárias",
    question: "Quais sistemas, dados e canais precisam ser conectados para automatizar a jornada?",
    rationale: "A viabilidade depende das integrações e dos limites de cada sistema.",
    hint: "Inclua APIs, arquivos, e-mail, chat, legado e sistemas sem integração disponível.",
    input: multi("Tipos de integração", ["APIs", "Eventos", "Arquivos", "E-mail ou chat", "Legado", "Integração inexistente"]),
    keywords: ["api", "integração", "arquivo", "email", "teams", "legado", "evento"],
  },
  {
    id: "automation-owner-value",
    pillar: "automation",
    title: "Owner e valor",
    question: "Quem será owner da automação e qual métrica comprovará valor?",
    rationale: "Owner e métrica evitam automações sem adoção ou resultado sustentável.",
    hint: "Considere tempo, custo, erro, SLA, experiência e capacidade liberada.",
    input: single("Clareza de ownership", ["Não definido", "Área interessada", "Owner indicado", "Owner e métrica", "Owner, métrica e baseline"]),
    keywords: ["owner", "métrica", "baseline", "sla", "tempo", "erro", "valor"],
  },
  {
    id: "app-modernization-critical",
    pillar: "app-modernization",
    title: "Aplicações críticas",
    question: "Quais aplicações são críticas para a estratégia e a operação do negócio?",
    rationale: "Criticidade e valor orientam onde modernizar primeiro.",
    hint: "Relacione jornadas suportadas, usuários, receita, risco e indisponibilidade tolerada.",
    input: single("Mapeamento do portfólio", ["Não mapeado", "Lista parcial", "Aplicações críticas", "Criticidade e valor", "Criticidade, valor e dependências"]),
    keywords: ["aplicação", "crítica", "portfólio", "receita", "indisponibilidade", "usuário"],
  },
  {
    id: "app-modernization-debt",
    pillar: "app-modernization",
    title: "Dívida e dependências",
    question: "Onde dívida técnica e dependências limitam mudança, segurança ou escala?",
    rationale: "Dívida e acoplamento explicam esforço, risco e sequência de modernização.",
    hint: "Inclua linguagem, middleware, banco, integrações, fornecedor e conhecimento escasso.",
    input: multi("Tipos de dívida", ["Código", "Plataforma", "Dados", "Integrações", "Segurança", "Conhecimento"]),
    keywords: ["dívida", "dependência", "legado", "acoplamento", "middleware", "mainframe"],
  },
  {
    id: "app-modernization-delivery",
    pillar: "app-modernization",
    title: "Entrega e operação",
    question: "Como releases, incidentes e observabilidade afetam a velocidade de entrega?",
    rationale: "Fluxo de entrega e operação mostra o custo atual e o critério de sucesso.",
    hint: "Traga frequência de release, lead time, falhas, MTTR e visibilidade.",
    input: scale("Maturidade de entrega"),
    keywords: ["release", "deploy", "incidente", "mttr", "observabilidade", "lead time"],
  },
  {
    id: "app-modernization-strategy",
    pillar: "app-modernization",
    title: "Estratégia de modernização",
    question: "Qual estratégia de modernização foi considerada e quais restrições orientam a decisão?",
    rationale: "A estratégia precisa equilibrar valor, risco, prazo e capacidade do time.",
    hint: "Considere manter, replatform, refactor, replace, retire e ondas de execução.",
    input: multi("Opções consideradas", ["Manter", "Replatform", "Refactor", "Replace", "Retire", "Ainda não definida"]),
    keywords: ["replatform", "refactor", "replace", "retire", "modernização", "roadmap"],
  },
];

export const GUIDED_DISCOVERY_PILLAR_META: Record<GuidedDiscoveryPillarKey, { label: string; description: string }> = {
  base: { label: "Diagnóstico-base", description: "Objetivo, urgência, ambiente, impacto, pessoas e condições para avançar." },
  finops: { label: "FinOps", description: "Economia, previsibilidade e responsabilidade sobre custos de tecnologia." },
  "trusted-data": { label: "Trusted Data", description: "Confiança, integração, proteção e ownership dos dados." },
  "ai-governance": { label: "AI Governance", description: "Casos de IA, riscos, monitoramento e responsabilidade." },
  "hybrid-cloud": { label: "Hybrid Cloud", description: "Workloads, padrões, resiliência e dependências híbridas." },
  automation: { label: "Automation", description: "Trabalho repetitivo, handoffs, integrações e valor operacional." },
  "app-modernization": { label: "App Modernization", description: "Portfólio crítico, dívida, entrega e estratégia de modernização." },
};

const catalogById = new Map(GUIDED_DISCOVERY_CATALOG.map((question) => [question.id, question]));

export function isGuidedDiscoveryPillar(value: unknown): value is GuidedDiscoveryPillarKey {
  return GUIDED_DISCOVERY_PILLARS.includes(String(value) as GuidedDiscoveryPillarKey);
}

export function getQuestionById(id: string) {
  return catalogById.get(id) || null;
}

export function questionsForPillar(pillar: GuidedDiscoveryPillarKey) {
  return GUIDED_DISCOVERY_CATALOG.filter((question) => question.pillar === pillar);
}

export const legacyQuestionId = (legacyKey: string) => ({
  context: "base-business-objective",
  landscape: "base-tech-landscape",
  finops: "finops-allocation",
  data: "trusted-data-quality",
  security: "trusted-data-sensitive",
  readiness: "base-qualification",
}[legacyKey] || null);

const answerText = (answer: GuidedDiscoveryAnswerLike) => `${answer.answerText || ""} ${JSON.stringify(answer.structured || {})}`.toLowerCase();
const addressed = (answer?: GuidedDiscoveryAnswerLike) => answer?.status === "confirmed" || answer?.status === "unknown";

export function rankPillarsFromAnswers(answers: GuidedDiscoveryAnswerLike[], scoreHints: Record<string, number> = {}) {
  const text = answers.map(answerText).join(" ");
  return GUIDED_DISCOVERY_PILLARS.filter((pillar) => pillar !== "base").map((pillar) => {
    const questions = questionsForPillar(pillar);
    const keywordHits = new Set(questions.flatMap((question) => question.keywords).filter((keyword) => text.includes(keyword.toLowerCase()))).size;
    const score = Math.min(100, Math.round(28 + keywordHits * 11 + Number(scoreHints[pillar] || 0) * 0.45));
    return { pillar, score, rationale: keywordHits ? `${keywordHits} sinais encontrados nas respostas.` : "Pilar ainda com pouca evidência; priorização usa aderência atual da conta." };
  }).sort((a, b) => b.score - a.score);
}

export function calculateDiscoveryMetrics(questionIds: string[], answers: GuidedDiscoveryAnswerLike[], now = new Date()) : GuidedDiscoveryMetrics {
  const current = new Map(answers.map((answer) => [answer.questionId, answer]));
  const routeAnswers = questionIds.map((id) => current.get(id)).filter(Boolean) as GuidedDiscoveryAnswerLike[];
  const addressedAnswers = routeAnswers.filter(addressed);
  const confirmed = routeAnswers.filter((answer) => answer.status === "confirmed" && answer.evidenceStatus !== "hypothesis" && Boolean(answer.answerText?.trim() || Object.keys(answer.structured || {}).length));
  const staleCutoff = now.getTime() - 90 * 86400_000;
  const stale = routeAnswers.filter((answer) => {
    const value = answer.sourceDate || answer.updatedAt;
    return Boolean(value && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() < staleCutoff);
  }).length;
  const contradictions = routeAnswers.filter((answer) => answer.evidenceStatus === "hypothesis" && Boolean(answer.structured?.contradiction)).length;
  const total = questionIds.length;
  return {
    addressed: addressedAnswers.length,
    total,
    progressPercent: total ? Math.round(addressedAnswers.length / total * 100) : 0,
    confirmedWithEvidence: confirmed.length,
    coveragePercent: total ? Math.round(confirmed.length / total * 100) : 0,
    gaps: routeAnswers.filter((answer) => answer.status === "unknown" || answer.evidenceStatus === "unknown").length,
    stale,
    contradictions,
  };
}

export function materializeQuestionRoute(input: {
  mode: GuidedDiscoveryMode;
  selectedPillars?: GuidedDiscoveryPillarKey[];
  answers?: GuidedDiscoveryAnswerLike[];
  scoreHints?: Record<string, number>;
  hasRelevantStakeholder?: boolean;
  hasOwner?: boolean;
  hasContradiction?: boolean;
}) {
  const answers = input.answers || [];
  const selected = (input.selectedPillars || []).filter((pillar) => pillar !== "base");
  const base = questionsForPillar("base").map((question) => question.id);
  let pillars = selected;
  if (input.mode === "adaptive") {
    const baseComplete = base.every((id) => addressed(answers.find((answer) => answer.questionId === id)));
    if (!baseComplete) return { questionIds: base, selectedPillars: [] as GuidedDiscoveryPillarKey[] };
    if (!pillars.length) pillars = rankPillarsFromAnswers(answers, input.scoreHints).slice(0, 2).map((item) => item.pillar);
  }
  if (!pillars.length) pillars = ["finops"];
  const route = input.mode === "adaptive" ? [...base] : [];
  for (const pillar of pillars.slice(0, input.mode === "adaptive" ? 2 : 6)) {
    const questions = questionsForPillar(pillar);
    const firstThree = questions.slice(0, 3);
    route.push(...firstThree.map((question) => question.id));
    const firstThreeAnswers = answers.filter((answer) => firstThree.some((question) => question.id === answer.questionId));
    const firstThreeMetrics = calculateDiscoveryMetrics(firstThree.map((question) => question.id), firstThreeAnswers);
    const needsFourth = firstThreeMetrics.addressed === 3 && (firstThreeMetrics.coveragePercent < 75 || firstThreeMetrics.contradictions > 0 || !input.hasRelevantStakeholder || !input.hasOwner || input.hasContradiction);
    if (needsFourth && questions[3]) route.push(questions[3].id);
  }
  return { questionIds: Array.from(new Set(route)), selectedPillars: pillars };
}

export function rankNextQuestion(input: {
  questions: GuidedDiscoveryCatalogQuestion[];
  answers: GuidedDiscoveryAnswerLike[];
  hypothesisImpactByPillar?: Partial<Record<GuidedDiscoveryPillarKey, number>>;
  stakeholderCoverageByPillar?: Partial<Record<GuidedDiscoveryPillarKey, number>>;
  now?: Date;
}) {
  const current = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const now = input.now || new Date();
  return input.questions.map((question, sequence) => {
    const answer = current.get(question.id);
    const informationGap = addressed(answer) ? answer?.status === "unknown" ? 72 : 0 : 100;
    const hypothesisImpact = Math.max(0, Math.min(100, Number(input.hypothesisImpactByPillar?.[question.pillar] ?? (question.pillar === "base" ? 85 : 55))));
    const sourceTime = answer?.sourceDate || answer?.updatedAt;
    const staleness = sourceTime && new Date(sourceTime).getTime() < now.getTime() - 90 * 86400_000 ? 100 : answer ? 0 : 35;
    const stakeholderCoverage = 100 - Math.max(0, Math.min(100, Number(input.stakeholderCoverageByPillar?.[question.pillar] ?? (answer?.stakeholderId ? 100 : 30))));
    const rankingScore = Math.round(informationGap * .45 + hypothesisImpact * .30 + staleness * .15 + stakeholderCoverage * .10);
    return { question, rankingScore, sequence, factors: { informationGap, hypothesisImpact, staleness, stakeholderCoverage } };
  }).filter((item) => !addressed(current.get(item.question.id))).sort((a, b) => b.rankingScore - a.rankingScore || a.sequence - b.sequence);
}

export function calculateDeterministicDeltas(before: Array<Record<string, unknown>>, after: Array<Record<string, unknown>>): GuidedDiscoveryQuestionDelta[] {
  const labels: Record<string, string> = { alignment: "Alinhamento", value: "Valor", readiness: "Prontidão", confidence: "Confiança" };
  const previous = new Map(before.map((score) => [String(score.short || score.name), score]));
  return after.flatMap((score) => {
    const key = String(score.short || score.name);
    const old = previous.get(key) || {};
    return ["alignment", "value", "readiness", "confidence"].map((metric) => {
      const beforeValue = Number(old[metric] || 0);
      const afterValue = Number(score[metric] || 0);
      return { key: `${key}:${metric}`, label: `${key} · ${labels[metric]}`, before: beforeValue, after: afterValue, delta: afterValue - beforeValue };
    });
  }).filter((item) => item.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
}

export function checkpointForRoute(questionIds: string[], answers: GuidedDiscoveryAnswerLike[]) {
  const current = new Map(answers.map((answer) => [answer.questionId, answer]));
  for (const pillar of GUIDED_DISCOVERY_PILLARS.filter((item) => item !== "base")) {
    const pillarIds = questionIds.filter((id) => getQuestionById(id)?.pillar === pillar);
    if (pillarIds.length >= 3 && pillarIds.every((id) => addressed(current.get(id)))) return { kind: "pillar" as const, pillar };
  }
  const baseIds = questionsForPillar("base").map((question) => question.id);
  if (baseIds.every((id) => addressed(current.get(id)))) return { kind: "base" as const, pillar: "base" as GuidedDiscoveryPillarKey };
  return null;
}

export const GuidedDiscoveryAnswerPayloadSchema = z.object({
  sessionId: z.string().trim().min(1),
  questionId: z.string().trim().min(1),
  status: z.enum(["draft", "confirmed", "unknown"]),
  structured: z.record(z.string(), z.unknown()).default({}),
  answerText: z.string().trim().max(8_000).default(""),
  evidenceStatus: z.enum(["confirmed", "reported", "hypothesis", "unknown"]).default("reported"),
  stakeholderId: z.string().trim().nullable().optional(),
  sourceType: z.string().trim().max(80).nullable().optional(),
  sourceId: z.string().trim().max(240).nullable().optional(),
  sourceDate: z.string().trim().nullable().optional(),
  confidence: z.number().int().min(0).max(100).default(70),
});

export const GuidedDiscoveryStartPayloadSchema = z.object({
  mode: z.enum(["adaptive", "direct"]).default("adaptive"),
  selectedPillars: z.array(z.enum(GUIDED_DISCOVERY_PILLARS)).max(6).default([]),
});

export function humanizeStructuredAnswer(value: Record<string, unknown>) {
  return Object.values(value).flatMap((item) => Array.isArray(item) ? item.map(String) : item === undefined || item === null || item === "" ? [] : [String(item)]).join(" · ");
}
