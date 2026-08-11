import type { Locale } from "../i18n";

export const CDI_CAPABILITY_CATALOG_VERSION = "2026.4-capability-driven";

export const CDI_CAPABILITY_KEYS = [
  "z-run",
  "z-modernize",
  "z-security",
  "finops",
  "trusted-data",
  "ai-governance",
  "hybrid-cloud",
  "automation",
  "integration",
  "data-streaming",
  "it-operations",
  "observability",
  "security",
  "sustainability",
] as const;

export type CdiCapabilityKey = (typeof CDI_CAPABILITY_KEYS)[number];
export type CdiResponse = "YES" | "NO" | "NOT_APPLICABLE" | "DONT_KNOW";
export type CdiLevel = "core" | "deep";
export type Localized = { en: string; pt: string };
export type MaturityDimension =
  | "strategy"
  | "process"
  | "technology"
  | "data"
  | "governance";

export type CdiQuestion = {
  id: string;
  capabilityKey: CdiCapabilityKey;
  level: CdiLevel;
  dimension: MaturityDimension;
  title: Localized;
  prompt: Localized;
  contextPrompt?: Localized;
  rationale: Localized;
  keywords: string[];
  businessImpact: number;
  mappings: {
    YES: { evidenceId: string; label: Localized; polarity: "POSITIVE" | "GAP"; strength: number };
    NO: { evidenceId: string; label: Localized; polarity: "POSITIVE" | "GAP"; strength: number };
  };
};

type Topic = {
  id: string;
  dimension: MaturityDimension;
  title: Localized;
  core: Localized;
  deep: Localized;
  rationale: Localized;
  keywords: string[];
  impact?: number;
  inverse?: boolean;
};

export type CdiCapability = {
  key: CdiCapabilityKey;
  code: string;
  label: Localized;
  description: Localized;
  outcome: Localized;
  journeyIds: string[];
  practiceIds: string[];
  topics: Topic[];
};

const l = (en: string, pt: string): Localized => ({ en, pt });
export const localizeCdi = (value: Localized, locale: Locale) =>
  locale === "pt-BR" ? value.pt : value.en;

const topic = (
  id: string,
  dimension: MaturityDimension,
  title: Localized,
  core: Localized,
  deep: Localized,
  rationale: Localized,
  keywords: string[],
  impact = 80,
  inverse = false,
): Topic => ({ id, dimension, title, core, deep, rationale, keywords, impact, inverse });

const deepValidationPrompt = (item: Topic): Localized =>
  l(
    `Is “${item.title.en}” supported by specific, verifiable evidence?`,
    `Existem evidências específicas e verificáveis que comprovem “${item.title.pt}”?`,
  );

export const CDI_CAPABILITIES: CdiCapability[] = [
  {
    key: "z-run", code: "Z_RUN", label: l("Run IBM Z", "Operar IBM Z"),
    description: l("Operate mission-critical IBM Z workloads with visibility, automation, and predictable service levels.", "Operar cargas críticas IBM Z com visibilidade, automação e níveis de serviço previsíveis."),
    outcome: l("Resilient and observable IBM Z operations", "Operações IBM Z resilientes e observáveis"), journeyIds: ["operate-optimize"], practiceIds: ["mainframe-services", "applications-data-ai"],
    topics: [
      topic("platform", "technology", l("IBM Z footprint", "Presença IBM Z"), l("Does the customer run production workloads on IBM Z?", "O cliente executa cargas de produção em IBM Z?"), l("Which z/OS, CICS, Db2, IMS, MQ, or Linux on Z workloads are business-critical?", "Quais cargas z/OS, CICS, Db2, IMS, MQ ou Linux on Z são críticas para o negócio?"), l("IBM Z eligibility is a required gate for Z-specific recommendations.", "A presença de IBM Z é um gate obrigatório para recomendações específicas de Z."), ["mainframe", "z/os", "cics", "db2", "ims"], 100),
      topic("service-level", "strategy", l("Business service levels", "Níveis de serviço"), l("Are business service levels defined for critical IBM Z applications?", "Existem níveis de serviço definidos para aplicações críticas em IBM Z?"), l("Which availability, latency, or recovery target is currently at risk?", "Qual meta de disponibilidade, latência ou recuperação está atualmente em risco?"), l("Business targets connect operational evidence to measurable impact.", "Metas de negócio conectam evidência operacional a impacto mensurável."), ["sla", "availability", "critical"], 95),
      topic("monitoring", "technology", l("Unified monitoring", "Monitoramento unificado"), l("Is monitoring unified across IBM Z and distributed environments?", "O monitoramento é unificado entre IBM Z e ambientes distribuídos?"), l("Can teams trace a transaction from a digital channel through middleware to the mainframe?", "As equipes conseguem rastrear uma transação do canal digital até o mainframe?"), l("Fragmented monitoring hides dependencies and increases resolution time.", "Monitoramento fragmentado oculta dependências e aumenta o tempo de resolução."), ["monitoring", "observability", "transaction"], 94),
      topic("incidents", "process", l("Incident correlation", "Correlação de incidentes"), l("Are IBM Z incidents correlated automatically with hybrid application events?", "Incidentes IBM Z são correlacionados automaticamente com eventos de aplicações híbridas?"), l("What proportion of high-severity incidents still requires manual root-cause analysis?", "Qual proporção dos incidentes críticos ainda exige análise manual de causa raiz?"), l("Correlation and automation reduce MTTR and operational risk.", "Correlação e automação reduzem MTTR e risco operacional."), ["incident", "mttr", "aiops"], 92),
      topic("capacity", "governance", l("Capacity governance", "Governança de capacidade"), l("Are IBM Z capacity and software costs reviewed against business demand?", "Capacidade e custos de software IBM Z são revisados frente à demanda do negócio?"), l("Which capacity forecast, MLC cost, or peak-consumption decision lacks reliable data?", "Qual decisão de forecast, custo MLC ou pico de consumo carece de dados confiáveis?"), l("Capacity governance exposes optimization and cost-control opportunities.", "Governança de capacidade revela oportunidades de otimização e controle de custos."), ["capacity", "mlc", "cost"], 84),
    ],
  },
  {
    key: "z-modernize", code: "Z_MODERNIZE", label: l("Modernize IBM Z", "Modernizar IBM Z"),
    description: l("Modernize applications, integration, delivery, and skills around IBM Z without compromising resilience.", "Modernizar aplicações, integração, entrega e competências em IBM Z sem comprometer a resiliência."),
    outcome: l("IBM Z integrated into the hybrid application estate", "IBM Z integrado ao ambiente híbrido de aplicações"), journeyIds: ["modernize-integrate"], practiceIds: ["applications-data-ai", "cloud"],
    topics: [
      topic("roadmap", "strategy", l("Modernization roadmap", "Roadmap de modernização"), l("Is there an approved modernization roadmap for IBM Z applications?", "Existe um roadmap aprovado para modernização de aplicações IBM Z?"), l("Which application domain has the strongest business case and executive sponsor?", "Qual domínio de aplicações tem o business case e sponsor executivo mais fortes?"), l("A roadmap separates funded transformation from general technical interest.", "Um roadmap separa transformação financiada de interesse técnico geral."), ["roadmap", "modernization", "sponsor"], 96),
      topic("api", "technology", l("API enablement", "Habilitação por APIs"), l("Are core IBM Z capabilities exposed through governed APIs?", "Capacidades centrais do IBM Z são expostas por APIs governadas?"), l("Which high-value business capability is blocked by point-to-point or batch integration?", "Qual capacidade de negócio de alto valor está bloqueada por integração ponto a ponto ou batch?"), l("Governed APIs enable reuse and reduce coupling.", "APIs governadas viabilizam reuso e reduzem acoplamento."), ["api", "integration", "batch"], 90),
      topic("delivery", "process", l("Modern delivery", "Entrega moderna"), l("Do IBM Z teams use automated CI/CD and testing?", "As equipes IBM Z usam CI/CD e testes automatizados?"), l("Where do manual approvals, environment constraints, or test-data gaps delay releases?", "Onde aprovações manuais, restrições de ambiente ou lacunas de dados de teste atrasam releases?"), l("Delivery evidence identifies the practical modernization bottleneck.", "Evidências de entrega identificam o gargalo prático da modernização."), ["devops", "cicd", "testing"], 86),
      topic("containers", "technology", l("Hybrid application platform", "Plataforma híbrida de aplicações"), l("Is a container platform used to extend or integrate IBM Z applications?", "Uma plataforma de containers é usada para estender ou integrar aplicações IBM Z?"), l("Which services could move to containers while transactions or data remain on IBM Z?", "Quais serviços poderiam migrar para containers mantendo transações ou dados no IBM Z?"), l("A hybrid pattern avoids false all-or-nothing modernization choices.", "Um padrão híbrido evita decisões falsas de modernização tudo-ou-nada."), ["container", "openshift", "hybrid"], 84),
      topic("skills", "governance", l("Skills continuity", "Continuidade de competências"), l("Is there a funded plan to address IBM Z skills and knowledge continuity?", "Existe um plano financiado para continuidade de competências e conhecimento IBM Z?"), l("Which roles, applications, or runbooks create the highest concentration risk?", "Quais funções, aplicações ou runbooks criam maior risco de concentração?"), l("Skills risk can determine sequencing and managed-service fit.", "Risco de competências pode determinar sequência e aderência a serviços gerenciados."), ["skills", "knowledge", "workforce"], 82),
    ],
  },
  {
    key: "z-security", code: "Z_SECURITY", label: l("Secure IBM Z", "Proteger IBM Z"),
    description: l("Protect privileged access, sensitive data, and cyber recovery for the IBM Z estate.", "Proteger acesso privilegiado, dados sensíveis e recuperação cibernética no ambiente IBM Z."),
    outcome: l("Verified controls and recoverable mission-critical workloads", "Controles verificados e cargas críticas recuperáveis"), journeyIds: ["protect-resilience"], practiceIds: ["security-resiliency", "mainframe-services"],
    topics: [
      topic("privileged", "governance", l("Privileged access", "Acesso privilegiado"), l("Is MFA enforced for privileged IBM Z access?", "MFA é obrigatório para acesso privilegiado ao IBM Z?"), l("Which privileged identities, service accounts, or break-glass paths remain outside consistent control?", "Quais identidades privilegiadas, contas de serviço ou acessos emergenciais permanecem fora de controle consistente?"), l("Privileged access is a material gate for security recommendations.", "Acesso privilegiado é um gate material para recomendações de segurança."), ["mfa", "privileged", "identity"], 100),
      topic("data", "data", l("Sensitive data protection", "Proteção de dados sensíveis"), l("Is sensitive IBM Z data discovered, classified, and monitored?", "Dados sensíveis no IBM Z são descobertos, classificados e monitorados?"), l("Which regulated data store lacks activity monitoring or accountable ownership?", "Qual repositório regulado carece de monitoramento de atividade ou owner responsável?"), l("Data controls link regulatory exposure to an actionable gap.", "Controles de dados conectam exposição regulatória a uma lacuna acionável."), ["sensitive", "guardium", "classification"], 96),
      topic("vulnerability", "process", l("Security posture", "Postura de segurança"), l("Are IBM Z security findings prioritized and remediated through a governed process?", "Achados de segurança IBM Z são priorizados e corrigidos por processo governado?"), l("What prevents the highest-risk finding from being remediated within policy?", "O que impede a correção do achado de maior risco dentro da política?"), l("Prioritization maturity indicates whether tooling can drive action.", "Maturidade de priorização indica se a tecnologia consegue gerar ação."), ["vulnerability", "posture", "remediation"], 90),
      topic("recovery", "technology", l("Cyber recovery", "Recuperação cibernética"), l("Is there an isolated and regularly tested cyber recovery capability for critical IBM Z workloads?", "Existe capacidade isolada e testada regularmente de recuperação cibernética para cargas críticas IBM Z?"), l("When was the last recovery test, and did it meet business RTO and RPO?", "Quando ocorreu o último teste de recuperação e ele atendeu RTO e RPO do negócio?"), l("A tested recovery capability distinguishes resilience from backup alone.", "Recuperação testada diferencia resiliência de simples backup."), ["recovery", "rto", "rpo", "vault"], 100),
      topic("evidence", "strategy", l("Control evidence", "Evidência de controles"), l("Can IBM Z control evidence be produced quickly for audit and executive review?", "Evidências de controles IBM Z podem ser produzidas rapidamente para auditoria e revisão executiva?"), l("Which audit request currently requires the most manual collection and reconciliation?", "Qual solicitação de auditoria exige hoje mais coleta e reconciliação manual?"), l("Evidence readiness exposes governance and automation value.", "Prontidão de evidências revela valor de governança e automação."), ["audit", "compliance", "evidence"], 82),
    ],
  },
  {
    key: "finops", code: "FINOPS", label: l("FinOps & Technology Economics", "FinOps e economia de tecnologia"),
    description: l("Connect technology consumption, accountability, planning, and optimization to business value.", "Conectar consumo de tecnologia, accountability, planejamento e otimização ao valor de negócio."), outcome: l("Transparent, governed, value-based technology spend", "Gasto tecnológico transparente, governado e orientado a valor"), journeyIds: ["optimize-economics"], practiceIds: ["cloud", "digital-workplace"],
    topics: [
      topic("allocation", "data", l("Cost allocation", "Alocação de custos"), l("Can technology costs be allocated reliably to products, services, or business units?", "Custos de tecnologia podem ser alocados de forma confiável a produtos, serviços ou unidades?"), l("Which shared cost or tag-quality issue most distorts accountability?", "Qual custo compartilhado ou problema de tags mais distorce a accountability?"), l("Reliable allocation is the foundation of financial accountability.", "Alocação confiável é a base da accountability financeira."), ["allocation", "tag", "showback"], 94),
      topic("forecast", "process", l("Planning and forecast", "Planejamento e forecast"), l("Are technology forecasts reconciled regularly with actual consumption?", "Forecasts de tecnologia são reconciliados regularmente com o consumo real?"), l("What variance is tolerated, and who acts when forecast and actuals diverge?", "Qual variação é tolerada e quem age quando forecast e realizado divergem?"), l("Forecast discipline reveals planning maturity and urgency.", "Disciplina de forecast revela maturidade de planejamento e urgência."), ["forecast", "budget", "variance"], 88),
      topic("accountability", "governance", l("Shared accountability", "Accountability compartilhada"), l("Do finance, engineering, and business owners share cost optimization targets?", "Finanças, engenharia e negócio compartilham metas de otimização de custos?"), l("Which role can approve trade-offs between cost, performance, and resilience?", "Qual função pode aprovar trade-offs entre custo, performance e resiliência?"), l("Shared targets turn insight into sustained action.", "Metas compartilhadas transformam insight em ação sustentada."), ["finance", "engineering", "owner"], 90),
      topic("optimization", "technology", l("Optimization execution", "Execução da otimização"), l("Are waste and commitment opportunities detected and actioned continuously?", "Oportunidades de desperdício e compromisso são detectadas e tratadas continuamente?"), l("How much identified savings remains unrealized because of operational or ownership constraints?", "Quanto da economia identificada permanece não realizada por restrições operacionais ou de ownership?"), l("Execution separates reporting from realized savings.", "Execução separa relatório de economia realizada."), ["waste", "commitment", "savings"], 92),
      topic("value", "strategy", l("Value measurement", "Mensuração de valor"), l("Are technology investments evaluated against business outcomes, not only cost?", "Investimentos em tecnologia são avaliados por resultados de negócio, não apenas custo?"), l("Which investment decision lacks an agreed unit economic or value metric?", "Qual decisão de investimento carece de métrica acordada de unit economics ou valor?"), l("Value metrics support prioritization before CRM qualification.", "Métricas de valor sustentam priorização antes da qualificação no CRM."), ["value", "unit economics", "outcome"], 86),
    ],
  },
  {
    key: "trusted-data", code: "TRUSTED_DATA", label: l("Trusted Data", "Dados confiáveis"), description: l("Make critical data discoverable, governed, integrated, and fit for analytics and AI.", "Tornar dados críticos descobríveis, governados, integrados e adequados para analytics e IA."), outcome: l("Reusable data products with trusted lineage and ownership", "Produtos de dados reutilizáveis com linhagem e ownership confiáveis"), journeyIds: ["govern-data-ai"], practiceIds: ["applications-data-ai"],
    topics: [
      topic("ownership", "governance", l("Data ownership", "Ownership de dados"), l("Does every critical data domain have an accountable owner?", "Cada domínio crítico de dados possui um owner responsável?"), l("Which domain lacks agreed quality targets and decision rights?", "Qual domínio carece de metas de qualidade e direitos de decisão acordados?"), l("Ownership is required to sustain data quality.", "Ownership é necessário para sustentar qualidade de dados."), ["owner", "domain", "steward"], 94),
      topic("catalog", "data", l("Catalog and lineage", "Catálogo e linhagem"), l("Are critical data assets cataloged with end-to-end lineage?", "Ativos críticos de dados são catalogados com linhagem ponta a ponta?"), l("Which report or AI use case cannot trace its most important source?", "Qual relatório ou caso de IA não consegue rastrear sua fonte mais importante?"), l("Lineage improves trust and change impact analysis.", "Linhagem melhora confiança e análise de impacto de mudanças."), ["catalog", "lineage", "metadata"], 92),
      topic("quality", "process", l("Data quality", "Qualidade de dados"), l("Are data quality rules monitored against business-approved thresholds?", "Regras de qualidade são monitoradas contra limites aprovados pelo negócio?"), l("Which recurring quality defect creates the greatest operational or regulatory impact?", "Qual defeito recorrente de qualidade gera maior impacto operacional ou regulatório?"), l("Quality evidence connects technical defects to business pain.", "Evidência de qualidade conecta defeitos técnicos à dor de negócio."), ["quality", "sla", "defect"], 96),
      topic("access", "technology", l("Governed access", "Acesso governado"), l("Can users discover and request trusted data through a governed workflow?", "Usuários conseguem descobrir e solicitar dados confiáveis por um fluxo governado?"), l("Where do manual access requests or duplicate extracts slow delivery?", "Onde solicitações manuais ou extrações duplicadas atrasam a entrega?"), l("Governed self-service balances speed and control.", "Autosserviço governado equilibra velocidade e controle."), ["access", "self service", "data product"], 84),
      topic("architecture", "strategy", l("Data architecture", "Arquitetura de dados"), l("Is there a target architecture for analytics and AI data workloads?", "Existe uma arquitetura alvo para cargas de dados de analytics e IA?"), l("Which workload is constrained by current cost, performance, or data movement?", "Qual workload é limitado por custo, performance ou movimentação de dados?"), l("Architecture fit informs modernization and platform choices.", "Aderência arquitetural orienta modernização e escolhas de plataforma."), ["lakehouse", "warehouse", "architecture"], 86),
    ],
  },
  {
    key: "ai-governance", code: "AI_GOVERNANCE", label: l("AI Governance", "Governança de IA"), description: l("Govern AI use cases, models, agents, risks, and outcomes across their lifecycle.", "Governar casos de IA, modelos, agentes, riscos e resultados ao longo do ciclo de vida."), outcome: l("Responsible AI at scale with measurable controls", "IA responsável em escala com controles mensuráveis"), journeyIds: ["govern-data-ai"], practiceIds: ["applications-data-ai", "security-resiliency"],
    topics: [
      topic("inventory", "data", l("AI inventory", "Inventário de IA"), l("Is there a current inventory of production AI models and agents?", "Existe um inventário atual de modelos e agentes de IA em produção?"), l("Which business-critical model or agent lacks a registered owner and purpose?", "Qual modelo ou agente crítico carece de owner e propósito registrados?"), l("An inventory is the control plane for AI governance.", "Um inventário é o plano de controle da governança de IA."), ["model", "agent", "inventory"], 96),
      topic("risk", "governance", l("Risk classification", "Classificação de risco"), l("Are AI use cases classified and approved according to risk?", "Casos de IA são classificados e aprovados conforme o risco?"), l("Which high-impact use case lacks documented review, limitations, or approval?", "Qual caso de alto impacto carece de revisão, limitações ou aprovação documentadas?"), l("Risk-based controls prevent both unmanaged exposure and unnecessary friction.", "Controles baseados em risco evitam exposição e fricção desnecessárias."), ["risk", "approval", "responsible ai"], 100),
      topic("monitoring", "technology", l("Model monitoring", "Monitoramento de modelos"), l("Are production models monitored for drift, quality, bias, and policy compliance?", "Modelos em produção são monitorados para drift, qualidade, viés e conformidade?"), l("Which metric or threshold would trigger human review or rollback?", "Qual métrica ou limite acionaria revisão humana ou rollback?"), l("Monitoring turns governance policy into operational control.", "Monitoramento transforma política em controle operacional."), ["drift", "bias", "monitoring"], 98),
      topic("accountability", "process", l("Decision accountability", "Accountability da decisão"), l("Are human owners and escalation paths defined for AI-assisted decisions?", "Owners humanos e caminhos de escalonamento são definidos para decisões assistidas por IA?"), l("Who can pause a model or agent, and how is that decision audited?", "Quem pode pausar um modelo ou agente e como a decisão é auditada?"), l("Clear accountability is essential for safe operations.", "Accountability clara é essencial para operações seguras."), ["human", "escalation", "audit"], 94),
      topic("value", "strategy", l("AI value realization", "Realização de valor da IA"), l("Are AI initiatives measured against agreed business outcomes?", "Iniciativas de IA são medidas contra resultados de negócio acordados?"), l("Which use case has the clearest path from model performance to financial or operational value?", "Qual caso tem o caminho mais claro entre performance do modelo e valor financeiro ou operacional?"), l("Outcome evidence helps prioritize scalable AI investments.", "Evidência de resultado ajuda a priorizar investimentos escaláveis em IA."), ["roi", "outcome", "use case"], 90),
    ],
  },
  {
    key: "hybrid-cloud", code: "HYBRID_CLOUD", label: l("Hybrid Cloud", "Nuvem híbrida"), description: l("Design, operate, and govern workloads consistently across on-premises, cloud, edge, and IBM Z.", "Projetar, operar e governar workloads de forma consistente entre on-premises, cloud, edge e IBM Z."), outcome: l("Portable, resilient, governed hybrid platforms", "Plataformas híbridas portáveis, resilientes e governadas"), journeyIds: ["modernize-integrate", "operate-optimize"], practiceIds: ["cloud"],
    topics: [
      topic("strategy", "strategy", l("Workload strategy", "Estratégia de workloads"), l("Are workload placement decisions based on explicit business and technical criteria?", "Decisões de posicionamento de workloads usam critérios explícitos de negócio e tecnologia?"), l("Which workload has the greatest mismatch between its requirements and current platform?", "Qual workload tem o maior desalinhamento entre requisitos e plataforma atual?"), l("Placement evidence prevents cloud-first decisions without workload fit.", "Evidência de posicionamento evita decisões cloud-first sem aderência do workload."), ["workload", "placement", "cloud"], 92),
      topic("platform", "technology", l("Common platform", "Plataforma comum"), l("Is there a consistent container platform across hybrid environments?", "Existe uma plataforma consistente de containers nos ambientes híbridos?"), l("Which platform difference creates the most operational duplication or lock-in?", "Qual diferença de plataforma cria mais duplicação operacional ou lock-in?"), l("Consistency improves portability and operating leverage.", "Consistência melhora portabilidade e alavancagem operacional."), ["container", "openshift", "platform"], 88),
      topic("automation", "process", l("Infrastructure automation", "Automação de infraestrutura"), l("Are infrastructure changes delivered through governed automation?", "Mudanças de infraestrutura são entregues por automação governada?"), l("Which manual change causes the most delay, drift, or failure risk?", "Qual mudança manual causa mais atraso, drift ou risco de falha?"), l("Automation evidence identifies execution readiness.", "Evidência de automação identifica prontidão de execução."), ["iac", "terraform", "automation"], 86),
      topic("resilience", "governance", l("Hybrid resilience", "Resiliência híbrida"), l("Are recovery objectives tested across hybrid dependencies?", "Objetivos de recuperação são testados entre dependências híbridas?"), l("Which dependency prevents an end-to-end recovery test from meeting its target?", "Qual dependência impede um teste de recuperação ponta a ponta de atingir a meta?"), l("Hybrid resilience depends on the full service chain.", "Resiliência híbrida depende de toda a cadeia do serviço."), ["resilience", "recovery", "dependency"], 96),
      topic("visibility", "data", l("Hybrid inventory", "Inventário híbrido"), l("Is there a current inventory of hybrid assets, dependencies, and ownership?", "Existe inventário atual de ativos híbridos, dependências e ownership?"), l("Which unowned or unknown dependency creates the largest migration risk?", "Qual dependência sem owner ou desconhecida cria o maior risco de migração?"), l("Reliable inventory supports planning and governance.", "Inventário confiável sustenta planejamento e governança."), ["inventory", "dependency", "cmdb"], 84),
    ],
  },
  {
    key: "automation", code: "AUTOMATION", label: l("Enterprise Automation", "Automação empresarial"), description: l("Automate decisions, workflows, integration, and operations with governed outcomes.", "Automatizar decisões, workflows, integração e operações com resultados governados."), outcome: l("Straight-through work with measurable business outcomes", "Trabalho ponta a ponta com resultados de negócio mensuráveis"), journeyIds: ["automate-transform"], practiceIds: ["applications-data-ai", "digital-workplace"],
    topics: [
      topic("process", "process", l("Process visibility", "Visibilidade de processos"), l("Are high-value processes measured end to end across organizational handoffs?", "Processos de alto valor são medidos ponta a ponta entre handoffs organizacionais?"), l("Which handoff creates the greatest wait time, rework, or customer impact?", "Qual handoff gera maior espera, retrabalho ou impacto ao cliente?"), l("End-to-end visibility is needed before automating local tasks.", "Visibilidade ponta a ponta é necessária antes de automatizar tarefas locais."), ["process", "handoff", "rework"], 92),
      topic("workflow", "technology", l("Workflow automation", "Automação de workflow"), l("Are repetitive decisions and approvals orchestrated through governed workflows?", "Decisões e aprovações repetitivas são orquestradas por workflows governados?"), l("Which rule, exception, or approval prevents straight-through processing?", "Qual regra, exceção ou aprovação impede processamento direto?"), l("Workflow evidence identifies the best automation pattern.", "Evidência de workflow identifica o melhor padrão de automação."), ["workflow", "decision", "approval"], 90),
      topic("integration", "technology", l("Automation integration", "Integração da automação"), l("Can automated workflows connect reliably to the required systems and data?", "Workflows automatizados conectam-se de forma confiável aos sistemas e dados necessários?"), l("Which legacy interface or manual data transfer blocks automation scale?", "Qual interface legada ou transferência manual bloqueia a escala da automação?"), l("Integration constraints determine feasibility and sequencing.", "Restrições de integração determinam viabilidade e sequência."), ["integration", "system", "api"], 86),
      topic("governance", "governance", l("Automation governance", "Governança da automação"), l("Are automation owners, controls, exceptions, and audit trails defined?", "Owners, controles, exceções e trilhas de auditoria da automação estão definidos?"), l("Who owns an automation failure and how quickly can it be safely overridden?", "Quem responde por uma falha de automação e quão rápido ela pode ser sobrescrita com segurança?"), l("Governance enables safe automation at scale.", "Governança permite automação segura em escala."), ["owner", "audit", "exception"], 88),
      topic("value", "strategy", l("Automation value", "Valor da automação"), l("Are automation outcomes measured in time, quality, risk, or cost?", "Resultados de automação são medidos em tempo, qualidade, risco ou custo?"), l("Which candidate has enough baseline data to prove value within 90 days?", "Qual candidato possui baseline suficiente para provar valor em 90 dias?"), l("A measurable outcome prioritizes the right first automation.", "Um resultado mensurável prioriza a automação inicial correta."), ["baseline", "time", "cost"], 94),
    ],
  },
  {
    key: "integration", code: "INTEGRATION", label: l("Integration & APIs", "Integração e APIs"), description: l("Connect applications, APIs, events, and partners through governed integration.", "Conectar aplicações, APIs, eventos e parceiros por integração governada."), outcome: l("Reusable and observable integration products", "Produtos de integração reutilizáveis e observáveis"), journeyIds: ["modernize-integrate"], practiceIds: ["applications-data-ai"],
    topics: [
      topic("inventory", "data", l("Integration inventory", "Inventário de integrações"), l("Is there a current inventory of critical APIs, interfaces, and owners?", "Existe inventário atual de APIs, interfaces críticas e owners?"), l("Which undocumented interface creates the greatest change or outage risk?", "Qual interface não documentada cria maior risco de mudança ou indisponibilidade?"), l("Inventory is the basis for modernization and governance.", "Inventário é a base para modernização e governança."), ["api", "interface", "inventory"], 88),
      topic("lifecycle", "governance", l("API lifecycle", "Ciclo de vida de APIs"), l("Are APIs designed, secured, versioned, and retired through a governed lifecycle?", "APIs são projetadas, protegidas, versionadas e descontinuadas por ciclo governado?"), l("Which lifecycle control is most inconsistent across teams?", "Qual controle de ciclo de vida é mais inconsistente entre equipes?"), l("Lifecycle governance improves reuse and reduces exposure.", "Governança de ciclo melhora reuso e reduz exposição."), ["lifecycle", "version", "security"], 90),
      topic("hybrid", "technology", l("Hybrid integration", "Integração híbrida"), l("Can integration patterns connect cloud, SaaS, on-premises, and IBM Z consistently?", "Padrões de integração conectam cloud, SaaS, on-premises e IBM Z de forma consistente?"), l("Which cross-environment flow has the highest latency, fragility, or manual intervention?", "Qual fluxo entre ambientes tem maior latência, fragilidade ou intervenção manual?"), l("Hybrid evidence identifies platform and modernization fit.", "Evidência híbrida identifica aderência de plataforma e modernização."), ["hybrid", "saas", "mainframe"], 92),
      topic("observability", "process", l("Integration observability", "Observabilidade de integração"), l("Are integration failures detected and traced to business transactions?", "Falhas de integração são detectadas e rastreadas até transações de negócio?"), l("Which integration failure is discovered first by a user or partner?", "Qual falha de integração é descoberta primeiro por um usuário ou parceiro?"), l("Observability connects interface health to customer impact.", "Observabilidade conecta saúde da interface ao impacto no cliente."), ["failure", "trace", "transaction"], 86),
      topic("product", "strategy", l("Integration product model", "Modelo de produto de integração"), l("Are reusable APIs and integrations managed as products with adoption metrics?", "APIs e integrações reutilizáveis são geridas como produtos com métricas de adoção?"), l("Which reusable capability lacks a product owner or consumer roadmap?", "Qual capacidade reutilizável carece de product owner ou roadmap de consumidores?"), l("A product model increases reuse and business alignment.", "Um modelo de produto aumenta reuso e alinhamento ao negócio."), ["product", "reuse", "adoption"], 82),
    ],
  },
  {
    key: "data-streaming", code: "DATA_STREAMING", label: l("Data Streaming", "Streaming de dados"), description: l("Use real-time events to connect operations, analytics, applications, and decisions.", "Usar eventos em tempo real para conectar operações, analytics, aplicações e decisões."), outcome: l("Reliable real-time data products and event-driven decisions", "Produtos de dados em tempo real confiáveis e decisões orientadas a eventos"), journeyIds: ["govern-data-ai", "modernize-integrate"], practiceIds: ["applications-data-ai"],
    topics: [
      topic("use-case", "strategy", l("Real-time use case", "Caso de uso em tempo real"), l("Is there a prioritized business use case that requires real-time events?", "Existe caso de negócio priorizado que exige eventos em tempo real?"), l("What decision or customer outcome loses value when data arrives late?", "Qual decisão ou resultado perde valor quando o dado chega atrasado?"), l("A time-sensitive outcome is the eligibility gate for streaming.", "Um resultado sensível ao tempo é o gate de elegibilidade para streaming."), ["real time", "event", "latency"], 98),
      topic("platform", "technology", l("Streaming platform", "Plataforma de streaming"), l("Is there a shared, production-grade event streaming platform?", "Existe plataforma compartilhada e robusta de streaming de eventos em produção?"), l("Which scale, availability, security, or multi-region requirement is not met?", "Qual requisito de escala, disponibilidade, segurança ou multirregião não é atendido?"), l("Platform evidence distinguishes pilots from an enterprise capability.", "Evidência de plataforma distingue pilotos de capacidade empresarial."), ["kafka", "confluent", "platform"], 90),
      topic("governance", "governance", l("Event governance", "Governança de eventos"), l("Are event schemas, ownership, quality, and access governed?", "Schemas, ownership, qualidade e acesso a eventos são governados?"), l("Which critical event lacks a schema contract or accountable owner?", "Qual evento crítico carece de contrato de schema ou owner responsável?"), l("Governance enables safe reuse across producers and consumers.", "Governança permite reuso seguro entre produtores e consumidores."), ["schema", "owner", "governance"], 88),
      topic("operations", "process", l("Streaming operations", "Operações de streaming"), l("Are lag, throughput, failures, and consumer health monitored against SLOs?", "Lag, throughput, falhas e saúde de consumidores são monitorados contra SLOs?"), l("Which operational signal currently fails to predict a business impact?", "Qual sinal operacional falha hoje em prever impacto no negócio?"), l("Operational maturity is required for critical event flows.", "Maturidade operacional é necessária para fluxos críticos de eventos."), ["lag", "throughput", "slo"], 86),
      topic("adoption", "data", l("Event adoption", "Adoção de eventos"), l("Are high-value events reused by multiple products or analytics teams?", "Eventos de alto valor são reutilizados por múltiplos produtos ou times de analytics?"), l("Which duplicate pipeline could be replaced by a governed event product?", "Qual pipeline duplicado poderia ser substituído por um produto de evento governado?"), l("Reuse demonstrates platform value and expansion potential.", "Reuso demonstra valor da plataforma e potencial de expansão."), ["reuse", "consumer", "pipeline"], 80),
    ],
  },
  {
    key: "it-operations", code: "IT_OPERATIONS", label: l("Modern IT Operations", "Operações modernas de TI"), description: l("Operate services through clear ownership, service data, automation, and outcome-based practices.", "Operar serviços com ownership claro, dados de serviço, automação e práticas orientadas a resultados."), outcome: l("Predictable services with less toil and faster decisions", "Serviços previsíveis com menos toil e decisões mais rápidas"), journeyIds: ["operate-optimize"], practiceIds: ["cloud", "digital-workplace"],
    topics: [
      topic("ownership", "governance", l("Service ownership", "Ownership de serviços"), l("Does every critical service have an accountable business and technical owner?", "Cada serviço crítico possui owner de negócio e técnico responsável?"), l("Which service lacks clear decision rights during a major incident?", "Qual serviço carece de direitos de decisão claros durante incidente crítico?"), l("Ownership enables prioritization and accountability.", "Ownership permite priorização e accountability."), ["service", "owner", "accountability"], 94),
      topic("service-data", "data", l("Service model", "Modelo de serviço"), l("Does the CMDB or service model reflect current dependencies?", "A CMDB ou modelo de serviços reflete as dependências atuais?"), l("Which dependency is most often discovered only during a change or incident?", "Qual dependência é descoberta com mais frequência apenas durante mudança ou incidente?"), l("Trusted service data supports automation and impact analysis.", "Dados confiáveis de serviço sustentam automação e análise de impacto."), ["cmdb", "dependency", "service model"], 90),
      topic("automation", "process", l("Operational automation", "Automação operacional"), l("Are repetitive operational tasks automated with governed runbooks?", "Tarefas operacionais repetitivas são automatizadas com runbooks governados?"), l("Which high-volume task creates the most toil or avoidable risk?", "Qual tarefa de alto volume gera mais toil ou risco evitável?"), l("Toil evidence identifies high-confidence automation candidates.", "Evidência de toil identifica candidatos de automação de alta confiança."), ["runbook", "toil", "automation"], 88),
      topic("sre", "strategy", l("Reliability practice", "Prática de confiabilidade"), l("Are SLOs and error budgets used to balance reliability and delivery?", "SLOs e error budgets são usados para equilibrar confiabilidade e entrega?"), l("Which service has recurring reliability work without an agreed business target?", "Qual serviço tem trabalho recorrente de confiabilidade sem meta de negócio acordada?"), l("SRE practices connect operations to product decisions.", "Práticas SRE conectam operações a decisões de produto."), ["slo", "error budget", "sre"], 86),
      topic("experience", "technology", l("Operational experience", "Experiência operacional"), l("Can operations teams access prioritized insights and actions in one workflow?", "Times de operações acessam insights e ações priorizadas em um único fluxo?"), l("Which swivel-chair handoff delays the highest-impact operational decision?", "Qual handoff entre ferramentas atrasa a decisão operacional de maior impacto?"), l("A unified experience reduces noise and speeds action.", "Uma experiência unificada reduz ruído e acelera ação."), ["workflow", "tool", "operations"], 82),
    ],
  },
  {
    key: "observability", code: "OBSERVABILITY", label: l("Observability & AIOps", "Observabilidade e AIOps"), description: l("Connect telemetry, topology, events, and business context to prevent and resolve incidents.", "Conectar telemetria, topologia, eventos e contexto de negócio para prevenir e resolver incidentes."), outcome: l("Business-aware visibility and lower MTTR", "Visibilidade orientada ao negócio e menor MTTR"), journeyIds: ["operate-optimize"], practiceIds: ["cloud", "applications-data-ai"],
    topics: [
      topic("coverage", "technology", l("Telemetry coverage", "Cobertura de telemetria"), l("Are critical services covered by metrics, logs, traces, and user-experience telemetry?", "Serviços críticos possuem cobertura de métricas, logs, traces e experiência do usuário?"), l("Which critical transaction has the largest blind spot across its dependency chain?", "Qual transação crítica possui o maior ponto cego em sua cadeia de dependências?"), l("Coverage is the basis for explainable operational insight.", "Cobertura é a base para insight operacional explicável."), ["metrics", "logs", "traces"], 96),
      topic("topology", "data", l("Dynamic topology", "Topologia dinâmica"), l("Is service topology discovered and updated automatically?", "A topologia de serviços é descoberta e atualizada automaticamente?"), l("Which dependency change most often invalidates incident analysis?", "Qual mudança de dependência mais frequentemente invalida análise de incidentes?"), l("Current topology improves correlation and impact analysis.", "Topologia atual melhora correlação e análise de impacto."), ["topology", "dependency", "discovery"], 88),
      topic("correlation", "process", l("Event intelligence", "Inteligência de eventos"), l("Are events correlated and prioritized before reaching responders?", "Eventos são correlacionados e priorizados antes de chegar aos responsáveis?"), l("What proportion of alerts is duplicate, non-actionable, or missing business context?", "Qual proporção dos alertas é duplicada, não acionável ou sem contexto de negócio?"), l("Noise reduction exposes AIOps value.", "Redução de ruído evidencia valor de AIOps."), ["alert", "correlation", "noise"], 92),
      topic("outcomes", "strategy", l("Business observability", "Observabilidade de negócio"), l("Are technical signals linked to customer and business outcomes?", "Sinais técnicos estão ligados a resultados de cliente e negócio?"), l("Which executive KPI should be connected to service health first?", "Qual KPI executivo deve ser conectado primeiro à saúde do serviço?"), l("Business context focuses investment on material services.", "Contexto de negócio concentra investimento em serviços materiais."), ["business", "kpi", "customer"], 90),
      topic("response", "governance", l("Closed-loop response", "Resposta em ciclo fechado"), l("Are diagnostic insights connected to approved remediation actions?", "Insights de diagnóstico estão conectados a ações de remediação aprovadas?"), l("Which remediation is safe enough to automate with human oversight?", "Qual remediação é segura o suficiente para automatizar com supervisão humana?"), l("Closed-loop controls convert insight into measurable action.", "Controles em ciclo fechado convertem insight em ação mensurável."), ["remediation", "runbook", "approval"], 86),
    ],
  },
  {
    key: "security", code: "SECURITY", label: l("Zero Trust & Cyber Resilience", "Zero Trust e resiliência cibernética"), description: l("Protect identities, data, workloads, and recovery through a verified Zero Trust model.", "Proteger identidades, dados, workloads e recuperação por um modelo Zero Trust verificado."), outcome: l("Reduced exposure with tested response and recovery", "Exposição reduzida com resposta e recuperação testadas"), journeyIds: ["protect-resilience"], practiceIds: ["security-resiliency"],
    topics: [
      topic("identity", "technology", l("Identity controls", "Controles de identidade"), l("Are strong identity, MFA, and privileged access controls applied consistently?", "Controles fortes de identidade, MFA e acesso privilegiado são aplicados de forma consistente?"), l("Which workforce, third-party, machine, or privileged identity is the highest unmanaged risk?", "Qual identidade de colaborador, terceiro, máquina ou privilegiada representa o maior risco não gerenciado?"), l("Identity is the primary Zero Trust control plane.", "Identidade é o principal plano de controle de Zero Trust."), ["identity", "mfa", "pam"], 98),
      topic("data", "data", l("Data protection", "Proteção de dados"), l("Is sensitive data discovered, classified, and monitored across environments?", "Dados sensíveis são descobertos, classificados e monitorados entre ambientes?"), l("Which sensitive data flow lacks a consistent control or activity trail?", "Qual fluxo de dados sensíveis carece de controle consistente ou trilha de atividade?"), l("Data evidence connects security controls to material assets.", "Evidência de dados conecta controles de segurança a ativos materiais."), ["data", "classification", "activity"], 96),
      topic("segmentation", "technology", l("Workload segmentation", "Segmentação de workloads"), l("Are critical workloads segmented according to identity and risk?", "Workloads críticos são segmentados conforme identidade e risco?"), l("Which trust relationship would allow the greatest lateral movement?", "Qual relação de confiança permitiria maior movimento lateral?"), l("Segmentation limits blast radius.", "Segmentação limita o raio de impacto."), ["segmentation", "network", "lateral"], 92),
      topic("response", "process", l("Detection and response", "Detecção e resposta"), l("Can high-impact threats be detected, investigated, and contained within target time?", "Ameaças de alto impacto podem ser detectadas, investigadas e contidas dentro da meta?"), l("Which detection or response handoff creates the longest delay?", "Qual handoff de detecção ou resposta cria o maior atraso?"), l("Time-to-contain is a practical measure of cyber maturity.", "Tempo para conter é uma medida prática de maturidade cibernética."), ["detect", "respond", "contain"], 94),
      topic("recovery", "governance", l("Cyber resilience", "Resiliência cibernética"), l("Are critical services recovered through isolated and regularly tested cyber plans?", "Serviços críticos são recuperados por planos cibernéticos isolados e testados regularmente?"), l("Which critical service has not proven recovery against a destructive scenario?", "Qual serviço crítico não comprovou recuperação diante de cenário destrutivo?"), l("Tested recovery is the final control when prevention fails.", "Recuperação testada é o controle final quando a prevenção falha."), ["recovery", "isolation", "test"], 100),
    ],
  },
  {
    key: "sustainability", code: "SUSTAINABILITY", label: l("Sustainable IT", "TI sustentável"), description: l("Measure and improve energy, carbon, asset, and workload efficiency across the technology estate.", "Medir e melhorar energia, carbono, ativos e eficiência de workloads no ambiente tecnológico."), outcome: l("Sustainability decisions grounded in operational evidence", "Decisões de sustentabilidade baseadas em evidência operacional"), journeyIds: ["optimize-economics"], practiceIds: ["cloud", "digital-workplace"],
    topics: [
      topic("targets", "strategy", l("Sustainability targets", "Metas de sustentabilidade"), l("Are technology sustainability targets linked to enterprise commitments?", "Metas de sustentabilidade de tecnologia estão ligadas aos compromissos corporativos?"), l("Which technology target has an owner, baseline, deadline, and executive consequence?", "Qual meta de tecnologia possui owner, baseline, prazo e consequência executiva?"), l("Material targets distinguish a funded agenda from reporting interest.", "Metas materiais distinguem agenda financiada de interesse em relatórios."), ["carbon", "target", "esg"], 88),
      topic("measurement", "data", l("Footprint measurement", "Medição de impacto"), l("Can energy and carbon impact be measured across cloud, data center, devices, and workloads?", "Impacto de energia e carbono pode ser medido em cloud, datacenter, dispositivos e workloads?"), l("Which part of the estate has the largest measurement gap or estimation uncertainty?", "Qual parte do ambiente possui maior lacuna de medição ou incerteza?"), l("Trusted measurement is required before optimization.", "Medição confiável é necessária antes da otimização."), ["energy", "carbon", "measurement"], 90),
      topic("optimization", "technology", l("Workload efficiency", "Eficiência de workloads"), l("Are workload efficiency and carbon considered in placement and optimization decisions?", "Eficiência e carbono dos workloads são considerados em decisões de posicionamento e otimização?"), l("Which workload has the greatest combined cost, utilization, and carbon opportunity?", "Qual workload tem a maior oportunidade combinada de custo, utilização e carbono?"), l("Joint economics and sustainability evidence improves prioritization.", "Evidência conjunta de economia e sustentabilidade melhora a priorização."), ["workload", "utilization", "carbon"], 84),
      topic("lifecycle", "process", l("Asset lifecycle", "Ciclo de vida de ativos"), l("Are device and infrastructure lifecycle decisions based on usage, condition, and sustainability data?", "Decisões de ciclo de vida de dispositivos e infraestrutura usam dados de uso, condição e sustentabilidade?"), l("Where do premature replacement or extended use create the greatest value risk?", "Onde substituição precoce ou uso prolongado criam maior risco de valor?"), l("Lifecycle evidence supports circular and economic decisions.", "Evidência de ciclo de vida sustenta decisões circulares e econômicas."), ["asset", "device", "lifecycle"], 78),
      topic("governance", "governance", l("Sustainability governance", "Governança de sustentabilidade"), l("Are sustainability insights embedded in technology governance and investment reviews?", "Insights de sustentabilidade estão incorporados à governança e revisão de investimentos?"), l("Which decision forum should own the next sustainability trade-off?", "Qual fórum de decisão deve assumir o próximo trade-off de sustentabilidade?"), l("Governance turns reporting into repeatable decisions.", "Governança transforma relatório em decisões repetíveis."), ["governance", "investment", "reporting"], 80),
    ],
  },
];

export const CDI_CONTEXT_QUESTIONS = [
  ["CTX001", l("Strategic priority", "Prioridade estratégica"), l("What business priority matters most in the next 12 months?", "Qual prioridade de negócio é mais importante nos próximos 12 meses?")],
  ["CTX002", l("Trigger", "Gatilho"), l("What changed to make this priority urgent now?", "O que mudou para tornar essa prioridade urgente agora?")],
  ["CTX003", l("Business impact", "Impacto de negócio"), l("Where is the greatest loss of money, speed, trust, productivity, or control?", "Onde está a maior perda de dinheiro, velocidade, confiança, produtividade ou controle?")],
  ["CTX004", l("Technology estate", "Ambiente tecnológico"), l("How is the technology estate distributed today?", "Como o ambiente tecnológico está distribuído hoje?")],
  ["CTX005", l("Critical services", "Serviços críticos"), l("Which applications or services are most critical to the business?", "Quais aplicações ou serviços são mais críticos para o negócio?")],
  ["CTX006", l("Stakeholders", "Stakeholders"), l("Who feels the pain, who influences, and who decides?", "Quem sente a dor, quem influencia e quem decide?")],
  ["CTX007", l("Sponsor", "Sponsor"), l("Is there an executive sponsor and accountable owner?", "Existe sponsor executivo e owner responsável?")],
  ["CTX008", l("Investment", "Investimento"), l("Is there a budget, timeline, or funded initiative?", "Existe orçamento, prazo ou iniciativa financiada?")],
  ["CTX009", l("Success", "Sucesso"), l("Which metric would prove a successful outcome?", "Qual métrica comprovaria um resultado bem-sucedido?")],
  ["CTX010", l("Constraints", "Restrições"), l("Which regulatory, contractual, skills, or architecture constraints matter?", "Quais restrições regulatórias, contratuais, de competências ou arquitetura importam?")],
] as const;

function buildQuestion(capability: CdiCapability, item: Topic, level: CdiLevel): CdiQuestion {
  const yesPositive = !item.inverse;
  const suffix = level === "core" ? "C" : "D";
  const id = `${capability.code}_${suffix}${String(capability.topics.indexOf(item) + 1).padStart(2, "0")}`;
  return {
    id,
    capabilityKey: capability.key,
    level,
    dimension: item.dimension,
    title: item.title,
    prompt: level === "core" ? item.core : deepValidationPrompt(item),
    contextPrompt: level === "deep" ? item.deep : undefined,
    rationale: item.rationale,
    keywords: item.keywords,
    businessImpact: item.impact || 80,
    mappings: {
      YES: {
        evidenceId: `${capability.code}.${item.id}.yes`,
        label: yesPositive ? l("Capability evidence", "Evidência de capacidade") : l("Opportunity evidence", "Evidência de oportunidade"),
        polarity: yesPositive ? "POSITIVE" : "GAP",
        strength: level === "core" ? 78 : 88,
      },
      NO: {
        evidenceId: `${capability.code}.${item.id}.no`,
        label: yesPositive ? l("Capability gap", "Lacuna de capacidade") : l("No current need", "Sem necessidade atual"),
        polarity: yesPositive ? "GAP" : "POSITIVE",
        strength: level === "core" ? 90 : 82,
      },
    },
  };
}

export const CDI_QUESTIONS: CdiQuestion[] = CDI_CAPABILITIES.flatMap((capability) =>
  capability.topics.flatMap((item) => [buildQuestion(capability, item, "core"), buildQuestion(capability, item, "deep")]),
);

export const CDI_JOURNEYS = [
  { id: "operate-optimize", label: l("Operate & optimize", "Operar e otimizar") },
  { id: "modernize-integrate", label: l("Modernize & integrate", "Modernizar e integrar") },
  { id: "protect-resilience", label: l("Protect & recover", "Proteger e recuperar") },
  { id: "govern-data-ai", label: l("Govern data & AI", "Governar dados e IA") },
  { id: "automate-transform", label: l("Automate & transform", "Automatizar e transformar") },
  { id: "optimize-economics", label: l("Optimize economics & sustainability", "Otimizar economia e sustentabilidade") },
  { id: "enable-experience", label: l("Enable digital experience", "Habilitar experiência digital") },
] as const;

export const CDI_PRACTICES = [
  { id: "mainframe-services", name: "Kyndryl Mainframe Services" },
  { id: "cloud", name: "Kyndryl Cloud Services" },
  { id: "applications-data-ai", name: "Kyndryl Applications, Data & AI" },
  { id: "security-resiliency", name: "Kyndryl Security & Resiliency" },
  { id: "digital-workplace", name: "Kyndryl Digital Workplace" },
] as const;

export type CdiTechnologyProfile = {
  id: string;
  name: string;
  capabilityKeys: CdiCapabilityKey[];
  journeyId: string;
  attach: "LEAD_ATTACH" | "OPPORTUNITY_ATTACH" | "EXPANSION_ATTACH";
  requiredEvidence: string[];
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  minimumFit: number;
  minimumConfidence: number;
};

const e = (code: string, topicId: string, response: "yes" | "no") => `${code}.${topicId}.${response}`;
export const CDI_TECHNOLOGIES: CdiTechnologyProfile[] = [
  { id: "omegamon", name: "IBM OMEGAMON", capabilityKeys: ["z-run"], journeyId: "operate-optimize", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [e("Z_RUN", "platform", "yes")], supportingEvidence: [e("Z_RUN", "monitoring", "no")], contradictoryEvidence: [e("Z_RUN", "platform", "no")], minimumFit: 65, minimumConfidence: 55 },
  { id: "z-aiops", name: "IBM Z AIOps", capabilityKeys: ["z-run", "observability"], journeyId: "operate-optimize", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [e("Z_RUN", "platform", "yes")], supportingEvidence: [e("Z_RUN", "incidents", "no"), e("OBSERVABILITY", "correlation", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "instana", name: "IBM Instana", capabilityKeys: ["observability", "z-run"], journeyId: "operate-optimize", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("OBSERVABILITY", "coverage", "no"), e("Z_RUN", "monitoring", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "concert", name: "IBM Concert", capabilityKeys: ["it-operations", "observability", "automation"], journeyId: "operate-optimize", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("IT_OPERATIONS", "experience", "no"), e("OBSERVABILITY", "response", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "openshift", name: "Red Hat OpenShift", capabilityKeys: ["hybrid-cloud", "z-modernize"], journeyId: "modernize-integrate", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("HYBRID_CLOUD", "platform", "no"), e("Z_MODERNIZE", "containers", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "api-connect", name: "IBM API Connect", capabilityKeys: ["integration", "z-modernize"], journeyId: "modernize-integrate", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("INTEGRATION", "lifecycle", "no"), e("Z_MODERNIZE", "api", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "app-connect", name: "IBM App Connect", capabilityKeys: ["integration", "automation"], journeyId: "modernize-integrate", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("INTEGRATION", "hybrid", "no"), e("AUTOMATION", "integration", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "confluent", name: "Confluent", capabilityKeys: ["data-streaming", "integration"], journeyId: "modernize-integrate", attach: "LEAD_ATTACH", requiredEvidence: [e("DATA_STREAMING", "use-case", "yes")], supportingEvidence: [e("DATA_STREAMING", "platform", "no"), e("DATA_STREAMING", "governance", "no")], contradictoryEvidence: [e("DATA_STREAMING", "use-case", "no")], minimumFit: 65, minimumConfidence: 55 },
  { id: "event-automation", name: "IBM Event Automation", capabilityKeys: ["data-streaming"], journeyId: "modernize-integrate", attach: "LEAD_ATTACH", requiredEvidence: [e("DATA_STREAMING", "use-case", "yes")], supportingEvidence: [e("DATA_STREAMING", "platform", "no"), e("DATA_STREAMING", "governance", "no"), e("DATA_STREAMING", "operations", "no"), e("DATA_STREAMING", "adoption", "no")], contradictoryEvidence: [e("DATA_STREAMING", "use-case", "no")], minimumFit: 65, minimumConfidence: 55 },
  { id: "ibm-mq", name: "IBM MQ", capabilityKeys: ["integration", "data-streaming", "z-modernize"], journeyId: "modernize-integrate", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("INTEGRATION", "hybrid", "no"), e("DATA_STREAMING", "operations", "no"), e("Z_MODERNIZE", "api", "no")], contradictoryEvidence: [e("INTEGRATION", "hybrid", "yes"), e("DATA_STREAMING", "operations", "yes"), e("Z_MODERNIZE", "api", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "watsonx-data", name: "IBM watsonx.data", capabilityKeys: ["trusted-data", "ai-governance"], journeyId: "govern-data-ai", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("TRUSTED_DATA", "architecture", "no"), e("TRUSTED_DATA", "access", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "knowledge-catalog", name: "IBM Knowledge Catalog", capabilityKeys: ["trusted-data", "ai-governance"], journeyId: "govern-data-ai", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("TRUSTED_DATA", "catalog", "no"), e("TRUSTED_DATA", "ownership", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "watsonx-governance", name: "IBM watsonx.governance", capabilityKeys: ["ai-governance"], journeyId: "govern-data-ai", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("AI_GOVERNANCE", "risk", "no"), e("AI_GOVERNANCE", "monitoring", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "turbonomic", name: "IBM Turbonomic", capabilityKeys: ["finops", "hybrid-cloud", "sustainability"], journeyId: "optimize-economics", attach: "EXPANSION_ATTACH", requiredEvidence: [], supportingEvidence: [e("FINOPS", "optimization", "no"), e("SUSTAINABILITY", "optimization", "no")], contradictoryEvidence: [], minimumFit: 45, minimumConfidence: 55 },
  { id: "apptio", name: "IBM Apptio", capabilityKeys: ["finops"], journeyId: "optimize-economics", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("FINOPS", "allocation", "no"), e("FINOPS", "forecast", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "guardium", name: "IBM Guardium", capabilityKeys: ["security", "z-security", "trusted-data"], journeyId: "protect-resilience", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("SECURITY", "data", "no"), e("Z_SECURITY", "data", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "verify", name: "IBM Verify", capabilityKeys: ["security", "z-security"], journeyId: "protect-resilience", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("SECURITY", "identity", "no"), e("Z_SECURITY", "privileged", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "z-cyber-vault", name: "IBM Z Cyber Vault", capabilityKeys: ["z-security", "security"], journeyId: "protect-resilience", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [e("Z_RUN", "platform", "yes")], supportingEvidence: [e("Z_SECURITY", "recovery", "no")], contradictoryEvidence: [e("Z_RUN", "platform", "no")], minimumFit: 65, minimumConfidence: 55 },
  { id: "business-automation", name: "IBM Business Automation Workflow", capabilityKeys: ["automation"], journeyId: "automate-transform", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("AUTOMATION", "workflow", "no"), e("AUTOMATION", "process", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "envizi", name: "IBM Envizi", capabilityKeys: ["sustainability"], journeyId: "optimize-economics", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("SUSTAINABILITY", "measurement", "no"), e("SUSTAINABILITY", "governance", "no")], contradictoryEvidence: [], minimumFit: 65, minimumConfidence: 55 },
  { id: "webmethods-hybrid-integration", name: "IBM webMethods Hybrid Integration", capabilityKeys: ["integration", "z-modernize"], journeyId: "modernize-integrate", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("INTEGRATION", "hybrid", "no"), e("INTEGRATION", "lifecycle", "no"), e("Z_MODERNIZE", "api", "no")], contradictoryEvidence: [e("INTEGRATION", "hybrid", "yes"), e("INTEGRATION", "lifecycle", "yes"), e("Z_MODERNIZE", "api", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "hashicorp-terraform", name: "HashiCorp Terraform", capabilityKeys: ["hybrid-cloud"], journeyId: "modernize-integrate", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("HYBRID_CLOUD", "automation", "no"), e("HYBRID_CLOUD", "visibility", "no"), e("HYBRID_CLOUD", "strategy", "no")], contradictoryEvidence: [e("HYBRID_CLOUD", "automation", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "red-hat-ansible", name: "Red Hat Ansible Automation Platform", capabilityKeys: ["hybrid-cloud", "it-operations", "automation"], journeyId: "automate-transform", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("HYBRID_CLOUD", "automation", "no"), e("IT_OPERATIONS", "automation", "no"), e("AUTOMATION", "workflow", "no")], contradictoryEvidence: [e("HYBRID_CLOUD", "automation", "yes"), e("IT_OPERATIONS", "automation", "yes"), e("AUTOMATION", "workflow", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "hashicorp-vault", name: "HashiCorp Vault", capabilityKeys: ["security", "z-security", "automation"], journeyId: "protect-resilience", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [], supportingEvidence: [e("SECURITY", "identity", "no"), e("Z_SECURITY", "privileged", "no"), e("AUTOMATION", "governance", "no")], contradictoryEvidence: [e("SECURITY", "identity", "yes"), e("Z_SECURITY", "privileged", "yes"), e("AUTOMATION", "governance", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "cloudability", name: "IBM Cloudability", capabilityKeys: ["finops", "hybrid-cloud"], journeyId: "optimize-economics", attach: "EXPANSION_ATTACH", requiredEvidence: [], supportingEvidence: [e("FINOPS", "allocation", "no"), e("FINOPS", "forecast", "no"), e("HYBRID_CLOUD", "visibility", "no")], contradictoryEvidence: [e("FINOPS", "allocation", "yes"), e("FINOPS", "forecast", "yes"), e("HYBRID_CLOUD", "visibility", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "sevone", name: "IBM SevOne Network Performance Management", capabilityKeys: ["observability", "hybrid-cloud"], journeyId: "operate-optimize", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("OBSERVABILITY", "coverage", "no"), e("OBSERVABILITY", "topology", "no"), e("OBSERVABILITY", "correlation", "no"), e("HYBRID_CLOUD", "visibility", "no")], contradictoryEvidence: [e("OBSERVABILITY", "coverage", "yes"), e("OBSERVABILITY", "topology", "yes"), e("HYBRID_CLOUD", "visibility", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "cloud-pak-aiops", name: "IBM Cloud Pak for AIOps", capabilityKeys: ["observability", "it-operations"], journeyId: "operate-optimize", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("OBSERVABILITY", "correlation", "no"), e("OBSERVABILITY", "response", "no"), e("IT_OPERATIONS", "service-data", "no"), e("IT_OPERATIONS", "automation", "no")], contradictoryEvidence: [e("OBSERVABILITY", "correlation", "yes"), e("IT_OPERATIONS", "automation", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "datastage", name: "IBM DataStage", capabilityKeys: ["trusted-data", "integration"], journeyId: "govern-data-ai", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("TRUSTED_DATA", "quality", "no"), e("TRUSTED_DATA", "architecture", "no"), e("INTEGRATION", "hybrid", "no")], contradictoryEvidence: [e("TRUSTED_DATA", "quality", "yes"), e("TRUSTED_DATA", "architecture", "yes"), e("INTEGRATION", "hybrid", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "planning-analytics", name: "IBM Planning Analytics", capabilityKeys: ["finops"], journeyId: "optimize-economics", attach: "EXPANSION_ATTACH", requiredEvidence: [], supportingEvidence: [e("FINOPS", "forecast", "no"), e("FINOPS", "value", "no")], contradictoryEvidence: [e("FINOPS", "forecast", "yes"), e("FINOPS", "value", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "zsecure", name: "IBM zSecure", capabilityKeys: ["z-security"], journeyId: "protect-resilience", attach: "OPPORTUNITY_ATTACH", requiredEvidence: [e("Z_RUN", "platform", "yes")], supportingEvidence: [e("Z_SECURITY", "vulnerability", "no"), e("Z_SECURITY", "evidence", "no"), e("Z_SECURITY", "privileged", "no")], contradictoryEvidence: [e("Z_RUN", "platform", "no"), e("Z_SECURITY", "vulnerability", "yes"), e("Z_SECURITY", "evidence", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "storage-defender", name: "IBM Storage Defender", capabilityKeys: ["security"], journeyId: "protect-resilience", attach: "EXPANSION_ATTACH", requiredEvidence: [], supportingEvidence: [e("SECURITY", "recovery", "no")], contradictoryEvidence: [e("SECURITY", "recovery", "yes")], minimumFit: 65, minimumConfidence: 55 },
  { id: "qradar-suite", name: "IBM QRadar Suite", capabilityKeys: ["security"], journeyId: "protect-resilience", attach: "LEAD_ATTACH", requiredEvidence: [], supportingEvidence: [e("SECURITY", "response", "no")], contradictoryEvidence: [e("SECURITY", "response", "yes")], minimumFit: 65, minimumConfidence: 55 },
];

export const cdiCapability = (key: string) => CDI_CAPABILITIES.find((item) => item.key === key) || null;
export const cdiQuestion = (id: string) => CDI_QUESTIONS.find((item) => item.id === id) || null;
export const coreQuestionsForCapability = (key: CdiCapabilityKey) => CDI_QUESTIONS.filter((item) => item.capabilityKey === key && item.level === "core");
export const deepQuestionsForCapability = (key: CdiCapabilityKey) => CDI_QUESTIONS.filter((item) => item.capabilityKey === key && item.level === "deep");
