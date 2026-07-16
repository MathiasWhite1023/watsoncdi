import { z } from "zod";
import type { Locale } from "./i18n";

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

type GuidedDiscoveryQuestionTranslation = Omit<GuidedDiscoveryCatalogQuestion, "id" | "pillar">;

/**
 * English copy is keyed by the immutable catalog question ID. Structured answers
 * continue to store their canonical value; consumers can use
 * `localizeGuidedDiscoveryOption` to translate only the visible label.
 */
export const GUIDED_DISCOVERY_CATALOG_EN_US: Record<string, GuidedDiscoveryQuestionTranslation> = {
  "base-business-objective": { title: "Business objective", question: "What is the primary business objective for the next 12 months?", rationale: "The objective connects technology to outcomes and keeps discovery from starting with a product.", hint: "Describe the outcome, metric, and time horizon when known.", input: single("Objective clarity", ["Not defined yet", "General theme", "Defined objective", "Objective with a metric", "Objective with a metric and deadline"]), keywords: ["growth", "revenue", "margin", "cost", "productivity", "experience", "risk", "12 months"] },
  "base-why-now": { title: "Why now", question: "What made this theme a priority now?", rationale: "Understanding the trigger reveals urgency, the decision window, and the cost of inaction.", hint: "Examples: executive target, incident, audit, rising costs, or a regulatory change.", input: multi("Triggers", ["Executive target", "Cost pressure", "Risk or compliance", "Incident", "Market change", "We do not know yet"]), keywords: ["urgency", "now", "deadline", "incident", "audit", "target", "priority"] },
  "base-tech-landscape": { title: "Current environment", question: "How is the technology environment organized today?", rationale: "The current landscape reveals dependencies, complexity, and where change can begin.", hint: "Include cloud, data centers, platforms, data, critical applications, and the operating model.", input: single("Understanding level", ["Not mapped", "Partial", "Main environments", "Architecture mapped", "Architecture and dependencies mapped"]), keywords: ["aws", "azure", "cloud", "data center", "mainframe", "sap", "openshift", "architecture"] },
  "base-biggest-loss": { title: "Largest loss", question: "Where is the greatest loss of money, productivity, trust, speed, or control?", rationale: "The largest loss helps size value and prioritize the next conversation.", hint: "Provide a concrete example and, if possible, an order of magnitude.", input: multi("Impact types", ["Money", "Productivity", "Trust", "Speed", "Control", "We do not know yet"]), keywords: ["cost", "waste", "rework", "delay", "risk", "control", "productivity"] },
  "base-stakeholders": { title: "People and decisions", question: "Who feels the pain, who influences, and who decides?", rationale: "A technical hypothesis without a political map rarely becomes a qualified opportunity.", hint: "Link the answer to a mapped stakeholder or record the roles that are still unknown.", input: single("Stakeholder coverage", ["Not mapped", "Solution user", "Influencer", "Decision-maker", "Decision-maker and sponsor"]), keywords: ["ceo", "cio", "cto", "cfo", "ciso", "director", "sponsor", "decision-maker"] },
  "base-qualification": { title: "Conditions to advance", question: "Is there a sponsor, budget, deadline, team, and success criterion?", rationale: "These conditions distinguish curiosity from an initiative that can advance to CRM.", hint: "Select only what has been confirmed; everything else becomes a discovery gap.", input: multi("Confirmed conditions", ["Sponsor", "Budget", "Deadline", "Team", "Success criterion", "None confirmed"]), keywords: ["sponsor", "budget", "deadline", "team", "metric", "success"] },
  "finops-allocation": { title: "Cost allocation", question: "How are technology and cloud costs allocated by product, business unit, or team?", rationale: "Reliable allocation is the foundation for ownership and optimization decisions.", hint: "Consider tags, cost centers, showback, chargeback, and shared costs.", input: scale("Allocation maturity"), keywords: ["allocation", "tag", "showback", "chargeback", "cost center"] },
  "finops-forecast": { title: "Budget and forecast", question: "How are budgets, forecasts, and cost variances monitored?", rationale: "Financial predictability shows the potential value of a FinOps practice.", hint: "Explain frequency, tools, variance tolerance, and who receives alerts.", input: scale("Planning maturity"), keywords: ["forecast", "budget", "variance", "predictability"] },
  "finops-accountability": { title: "Accountability", question: "How do finance and engineering share accountability for cost and performance decisions?", rationale: "Without shared accountability, savings recommendations are rarely implemented.", hint: "Identify forums, owners, targets, and conflicts among cost, risk, and performance.", input: single("Accountability model", ["None", "Ad hoc", "Informal owners", "Defined RACI", "Shared targets and operating cadence"]), keywords: ["finance", "engineering", "owner", "raci", "accountability", "performance"] },
  "finops-waste-risk": { title: "Waste and risk", question: "What waste is known, and which optimizations could create performance risk?", rationale: "Real value combines cost reduction with protection of performance and experience.", hint: "Include idle resources, commitments, licenses, and over- or under-sized workloads.", input: multi("Observed signals", ["Idle capacity", "Overprovisioning", "Licenses", "Commitments", "Performance risk", "Not measured yet"]), keywords: ["idle", "waste", "rightsizing", "reservation", "license", "performance"] },
  "trusted-data-sources": { title: "Critical sources", question: "Which data sources are critical to priority decisions and initiatives?", rationale: "Critical sources define scope and show where trust creates the most value.", hint: "List source systems, consumers, and the decisions that depend on this data.", input: single("Source mapping", ["Not mapped", "Sources mentioned", "Sources and consumers", "Critical flows", "Flows and criticality documented"]), keywords: ["source", "erp", "crm", "lakehouse", "warehouse", "mainframe", "critical data"] },
  "trusted-data-quality": { title: "Quality and integration", question: "How are quality, cataloging, lineage, and integration handled today?", rationale: "These controls explain why users trust—or do not trust—the data.", hint: "Describe processes, tools, coverage, and where information breaks down.", input: multi("Existing capabilities", ["Quality", "Catalog", "Lineage", "Integration", "Data observability", "None structured"]), keywords: ["quality", "catalog", "lineage", "integration", "observability", "silo"] },
  "trusted-data-sensitive": { title: "Sensitive data and access", question: "Where is sensitive data located, and how is access granted, revoked, and audited?", rationale: "Security and privacy determine the risk and feasibility of new data uses.", hint: "Consider classification, privacy regulation, privileges, masking, and audit trails.", input: scale("Access-control maturity"), keywords: ["sensitive", "privacy", "access", "privilege", "masking", "audit"] },
  "trusted-data-ownership": { title: "Ownership and SLAs", question: "Who owns the data, and which SLAs or metrics define trust?", rationale: "Ownership and metrics make governance executable and measurable.", hint: "Map domains, data owners, stewards, availability, and expected quality.", input: single("Ownership model", ["None", "Informal", "Owners by system", "Owners by domain", "Owners with SLAs and metrics"]), keywords: ["owner", "steward", "domain", "sla", "metric", "governance"] },
  "ai-governance-cases": { title: "AI use cases", question: "Which AI use cases exist, are in pilot, or are priorities for the coming months?", rationale: "The inventory connects governance to real decisions rather than abstract controls.", hint: "Include objective, user, model, data, impact, and use-case stage.", input: single("Portfolio maturity", ["No use cases", "Ideas", "Pilots", "Isolated production", "Managed portfolio"]), keywords: ["ai", "genai", "model", "pilot", "production", "use case"] },
  "ai-governance-risk": { title: "Risk approval", question: "How are AI risks assessed, approved, and documented before production?", rationale: "The approval process reveals controls, bottlenecks, and accountability.", hint: "Consider legal, risk, security, privacy, and AI committees.", input: scale("Approval maturity"), keywords: ["risk", "approval", "documentation", "committee", "legal", "privacy"] },
  "ai-governance-monitoring": { title: "Monitoring", question: "How are models monitored for drift, quality, explainability, and misuse?", rationale: "Continuous monitoring reduces risk after a model enters operation.", hint: "Include metrics, alerts, human review, logs, and response to deviations.", input: multi("Operational controls", ["Quality", "Drift", "Bias", "Explainability", "Misuse", "No continuous controls"]), keywords: ["drift", "bias", "explainability", "monitoring", "alert", "model"] },
  "ai-governance-accountability": { title: "Accountability", question: "Who is accountable for automated decisions and AI-related incidents?", rationale: "Clear accountability is required to scale AI safely.", hint: "Map the use-case owner, model owner, risk, operations, and escalation.", input: single("Accountability clarity", ["Not defined", "Case by case", "Technical owner", "Technical and business owners", "RACI and incident response"]), keywords: ["accountable", "owner", "incident", "decision", "raci", "escalation"] },
  "hybrid-cloud-workloads": { title: "Workload distribution", question: "How are workloads distributed across cloud, data center, edge, and third-party platforms?", rationale: "Distribution reveals complexity, constraints, and opportunities for standardization.", hint: "Include criticality, data, latency, regulation, and operational responsibility.", input: multi("Environments", ["Public cloud", "Private cloud", "Data center", "Edge", "SaaS", "Not mapped yet"]), keywords: ["workload", "cloud", "data center", "edge", "saas", "hybrid"] },
  "hybrid-cloud-portability": { title: "Portability and standards", question: "Which standards enable—or prevent—portability and consistency across environments?", rationale: "Platform and automation standards determine speed and lock-in.", hint: "Consider containers, Kubernetes, IaC, pipelines, policies, and proprietary services.", input: scale("Standardization maturity"), keywords: ["portability", "openshift", "kubernetes", "terraform", "iac", "standard", "lock-in"] },
  "hybrid-cloud-resilience": { title: "Security and resilience", question: "How do security, resilience, and observability work end to end?", rationale: "Consistent operations are essential before moving or modernizing workloads.", hint: "Describe incidents, SLOs, recovery, visibility, and controls across environments.", input: multi("Capabilities", ["Security", "Backup and DR", "Observability", "SLOs", "Incident response", "Fragmented coverage"]), keywords: ["security", "resilience", "dr", "observability", "slo", "incident"] },
  "hybrid-cloud-dependencies": { title: "Dependencies and blockers", question: "Which technical, contractual, or regulatory dependencies prevent change?", rationale: "Real blockers inform a viable transformation sequence.", hint: "Include data, licenses, integrations, skills, contracts, and compliance.", input: multi("Blocker types", ["Data", "Integrations", "Licenses", "Contract", "Skills", "Regulation"]), keywords: ["dependency", "contract", "license", "regulation", "integration", "skill"] },
  "automation-repetitive": { title: "Repetitive work", question: "Which repetitive tasks or decisions consume the most team time?", rationale: "Volume, frequency, and effort help prioritize automation with measurable value.", hint: "Describe frequency, people involved, time, and exceptions.", input: single("Scale of manual work", ["Not mapped yet", "Occasional", "Recurring", "High volume", "High volume and critical impact"]), keywords: ["manual", "repetitive", "task", "decision", "time", "volume"] },
  "automation-handoffs": { title: "Handoffs and rework", question: "Where are there handoffs, waits, errors, or rework between teams?", rationale: "Handoffs expose process bottlenecks and orchestration opportunities.", hint: "Map input, output, approver, wait time, and the most common cause of return.", input: scale("Handoff impact"), keywords: ["handoff", "wait", "error", "rework", "approval", "queue"] },
  "automation-integrations": { title: "Required integrations", question: "Which systems, data, and channels need to be connected to automate the journey?", rationale: "Feasibility depends on integrations and each system's boundaries.", hint: "Include APIs, files, email, chat, legacy systems, and systems without available integration.", input: multi("Integration types", ["APIs", "Events", "Files", "Email or chat", "Legacy", "No integration available"]), keywords: ["api", "integration", "file", "email", "teams", "legacy", "event"] },
  "automation-owner-value": { title: "Owner and value", question: "Who will own the automation, and which metric will prove value?", rationale: "An owner and metric prevent automation without adoption or sustainable outcomes.", hint: "Consider time, cost, errors, SLA, experience, and released capacity.", input: single("Ownership clarity", ["Not defined", "Interested team", "Proposed owner", "Owner and metric", "Owner, metric, and baseline"]), keywords: ["owner", "metric", "baseline", "sla", "time", "error", "value"] },
  "app-modernization-critical": { title: "Critical applications", question: "Which applications are critical to business strategy and operations?", rationale: "Criticality and value determine where to modernize first.", hint: "Map supported journeys, users, revenue, risk, and tolerated downtime.", input: single("Portfolio mapping", ["Not mapped", "Partial list", "Critical applications", "Criticality and value", "Criticality, value, and dependencies"]), keywords: ["application", "critical", "portfolio", "revenue", "downtime", "user"] },
  "app-modernization-debt": { title: "Debt and dependencies", question: "Where do technical debt and dependencies limit change, security, or scale?", rationale: "Debt and coupling explain effort, risk, and the modernization sequence.", hint: "Include language, middleware, database, integrations, vendor, and scarce knowledge.", input: multi("Debt types", ["Code", "Platform", "Data", "Integrations", "Security", "Knowledge"]), keywords: ["debt", "dependency", "legacy", "coupling", "middleware", "mainframe"] },
  "app-modernization-delivery": { title: "Delivery and operations", question: "How do releases, incidents, and observability affect delivery speed?", rationale: "Delivery and operations reveal current cost and the success criteria.", hint: "Include release frequency, lead time, failures, MTTR, and visibility.", input: scale("Delivery maturity"), keywords: ["release", "deploy", "incident", "mttr", "observability", "lead time"] },
  "app-modernization-strategy": { title: "Modernization strategy", question: "Which modernization strategy has been considered, and which constraints shape the decision?", rationale: "The strategy must balance value, risk, time, and team capacity.", hint: "Consider retain, replatform, refactor, replace, retire, and delivery waves.", input: multi("Options considered", ["Retain", "Replatform", "Refactor", "Replace", "Retire", "Not defined yet"]), keywords: ["retain", "replatform", "refactor", "replace", "retire", "modernization", "roadmap"] },
};

export const GUIDED_DISCOVERY_PILLAR_META: Record<GuidedDiscoveryPillarKey, { label: string; description: string }> = {
  base: { label: "Diagnóstico-base", description: "Objetivo, urgência, ambiente, impacto, pessoas e condições para avançar." },
  finops: { label: "FinOps", description: "Economia, previsibilidade e responsabilidade sobre custos de tecnologia." },
  "trusted-data": { label: "Trusted Data", description: "Confiança, integração, proteção e ownership dos dados." },
  "ai-governance": { label: "AI Governance", description: "Casos de IA, riscos, monitoramento e responsabilidade." },
  "hybrid-cloud": { label: "Hybrid Cloud", description: "Workloads, padrões, resiliência e dependências híbridas." },
  automation: { label: "Automation", description: "Trabalho repetitivo, handoffs, integrações e valor operacional." },
  "app-modernization": { label: "App Modernization", description: "Portfólio crítico, dívida, entrega e estratégia de modernização." },
};

export const GUIDED_DISCOVERY_PILLAR_META_EN_US: typeof GUIDED_DISCOVERY_PILLAR_META = {
  base: { label: "Baseline assessment", description: "Objective, urgency, environment, impact, people, and conditions to advance." },
  finops: { label: "FinOps", description: "Savings, predictability, and accountability for technology costs." },
  "trusted-data": { label: "Trusted Data", description: "Data trust, integration, protection, and ownership." },
  "ai-governance": { label: "AI Governance", description: "AI use cases, risk, monitoring, and accountability." },
  "hybrid-cloud": { label: "Hybrid Cloud", description: "Workloads, standards, resilience, and hybrid dependencies." },
  automation: { label: "Automation", description: "Repetitive work, handoffs, integrations, and operational value." },
  "app-modernization": { label: "App Modernization", description: "Critical portfolio, debt, delivery, and modernization strategy." },
};

const catalogById = new Map(GUIDED_DISCOVERY_CATALOG.map((question) => [question.id, question]));

export function getLocalizedQuestionById(id: string, locale: Locale = "pt-BR") {
  const canonical = catalogById.get(id);
  if (!canonical || locale === "pt-BR") return canonical || null;
  const translation = GUIDED_DISCOVERY_CATALOG_EN_US[id];
  return translation ? { ...canonical, ...translation, id: canonical.id, pillar: canonical.pillar } : canonical;
}

export function getLocalizedPillarMeta(pillar: GuidedDiscoveryPillarKey, locale: Locale = "pt-BR") {
  return (locale === "en-US" ? GUIDED_DISCOVERY_PILLAR_META_EN_US : GUIDED_DISCOVERY_PILLAR_META)[pillar];
}

export function localizeGuidedDiscoveryOption(questionId: string, canonicalValue: string, locale: Locale = "pt-BR") {
  const canonical = catalogById.get(questionId);
  const translated = GUIDED_DISCOVERY_CATALOG_EN_US[questionId];
  const canonicalIndex = canonical?.input.options?.indexOf(canonicalValue) ?? -1;
  const translatedIndex = translated?.input.options?.indexOf(canonicalValue) ?? -1;
  if (locale === "en-US" && canonicalIndex >= 0) return translated?.input.options?.[canonicalIndex] || canonicalValue;
  if (locale === "pt-BR" && translatedIndex >= 0) return canonical?.input.options?.[translatedIndex] || canonicalValue;
  return canonicalValue;
}

export function canonicalizeGuidedDiscoveryOption(questionId: string, value: string) {
  const canonical = catalogById.get(questionId);
  const translated = GUIDED_DISCOVERY_CATALOG_EN_US[questionId];
  const translatedIndex = translated?.input.options?.indexOf(value) ?? -1;
  return translatedIndex >= 0 ? canonical?.input.options?.[translatedIndex] || value : value;
}

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
    const keywordHits = new Set(questions.flatMap((question) => [
      ...question.keywords,
      ...(GUIDED_DISCOVERY_CATALOG_EN_US[question.id]?.keywords || []),
    ]).filter((keyword) => text.includes(keyword.toLowerCase()))).size;
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
