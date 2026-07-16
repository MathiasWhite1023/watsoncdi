import {
  getLocalizedPillarMeta,
  getLocalizedQuestionById,
  type GuidedDiscoveryPillarKey,
} from "./guided-discovery";
import { localizeSystemValue, type Locale } from "./i18n";

const replacements: Array<[string, string]> = [
  [
    "Reduzir o custo operacional do e-commerce e recuperar previsibilidade dos investimentos em cloud sem comprometer a experiência do cliente.",
    "Reduce e-commerce operating costs and restore predictability to cloud investments without compromising customer experience.",
  ],
  [
    "Operamos em AWS e Azure, além de aplicações legadas no datacenter. O rateio por unidade e produto é pouco confiável.",
    "We operate on AWS and Azure, with legacy applications in the data center. Cost allocation by business unit and product is unreliable.",
  ],
  [
    "A fatura cloud cresceu 34%, existem recursos ociosos e não temos forecast nem accountability clara entre finanças e engenharia.",
    "The cloud bill grew 34%; idle resources remain, and there is no forecast or clear accountability between finance and engineering.",
  ],
  [
    "Reunião com CFO e engenharia. O CFO quer previsibilidade trimestral e o time técnico citou AWS, Azure, recursos ociosos e dificuldade de rateio por produto.",
    "Meeting with the CFO and engineering. The CFO wants quarterly predictability, and the technical team cited AWS, Azure, idle resources, and difficulty allocating costs by product.",
  ],
  [
    "Acelerar casos de IA generativa com dados confiáveis e controles compatíveis com o ambiente regulado.",
    "Accelerate generative AI use cases with trusted data and controls suitable for a regulated environment.",
  ],
  [
    "Linhas de negócio não confiam na qualidade, a linhagem é parcial e o catálogo não cobre dados sensíveis.",
    "Business units do not trust data quality, lineage is partial, and the catalog does not cover sensitive data.",
  ],
  [
    "CIO e líder de dados querem levar GenAI para atendimento, mas a arquitetura tem lakehouse, mainframe e catálogo incompleto. CISO pediu auditoria de modelos e controle LGPD.",
    "The CIO and data leader want to bring GenAI into customer service, but the architecture includes a lakehouse, mainframe, and incomplete catalog. The CISO requested model auditing and privacy controls.",
  ],
  [
    "Melhorar produtividade da operação e reduzir atrasos causados por processos manuais.",
    "Improve operational productivity and reduce delays caused by manual processes.",
  ],
  [
    "Operações relatou processos manuais entre transporte, armazém e clientes. Há integrações ponto a ponto e baixa visibilidade de custo por rota.",
    "Operations reported manual processes across transportation, warehouses, and customers. Point-to-point integrations and low visibility into cost per route remain.",
  ],
  [
    "Criar uma fundação de dados industriais segura para analytics e manutenção preditiva.",
    "Create a secure industrial data foundation for analytics and predictive maintenance.",
  ],
  [
    "Falta governança comum, catálogo e qualidade consistente entre dados industriais e corporativos.",
    "There is no common governance, catalog, or consistent quality across industrial and corporate data.",
  ],
  [
    "Dados OT e IT estão distribuídos entre plantas, cloud e sistemas de fornecedores. O sponsor quer analytics confiável e segurança para dados industriais.",
    "OT and IT data are distributed across plants, cloud environments, and supplier systems. The sponsor wants trusted analytics and security for industrial data.",
  ],
  [
    "Qual evento de negócio abriu essa conversa?",
    "Which business event opened this conversation?",
  ],
  [
    "Como está organizado o ambiente de tecnologia e nuvem hoje?",
    "How is the technology and cloud environment organized today?",
  ],
  [
    "Onde existem sinais de desperdício, risco ou falta de previsibilidade?",
    "Where are there signs of waste, risk, or lack of predictability?",
  ],
  [
    "O que impede o uso confiável de dados?",
    "What prevents trusted use of data?",
  ],
  ["Reunião de contexto inicial", "Initial context meeting"],
  [
    "Contexto migrado para Account Intelligence",
    "Context migrated to Account Intelligence",
  ],
  [
    "Contexto inicial em construção; registre uma reunião para gerar inteligência da conta.",
    "Initial context is being built; record a meeting to generate account intelligence.",
  ],
  [
    "Conta ainda sem evidência suficiente. Registre uma reunião ou responda o discovery guiado.",
    "The account does not yet have enough evidence. Record a meeting or complete guided discovery.",
  ],
  [
    "Mapear baseline de gastos, owners e desperdícios antes de propor Cloudability/Turbonomic.",
    "Map the spending baseline, owners, and waste before proposing Cloudability or Turbonomic.",
  ],
  [
    "Validar fontes críticas, qualidade, acesso e riscos de dados com stakeholders de negócio.",
    "Validate critical sources, quality, access, and data risks with business stakeholders.",
  ],
  [
    "Identificar casos de IA, riscos regulatórios e controles necessários para watsonx.governance.",
    "Identify AI use cases, regulatory risks, and controls required for watsonx.governance.",
  ],
  [
    "Entender workloads, restrições e padrões de plataforma para uma revisão de arquitetura híbrida.",
    "Understand workloads, constraints, and platform standards for a hybrid architecture review.",
  ],
  [
    "Mapear tarefas repetitivas, handoffs e decisões que podem ser orquestradas com watsonx Orchestrate.",
    "Map repetitive tasks, handoffs, and decisions that can be orchestrated with watsonx Orchestrate.",
  ],
  [
    "Classificar aplicações por valor, risco e esforço para ondas de modernização.",
    "Classify applications by value, risk, and effort for modernization waves.",
  ],
  [
    "Maior correspondência entre desafios financeiros, maturidade operacional e potencial de valor.",
    "Strongest match among financial challenges, operational maturity, and value potential.",
  ],
  [
    "Combina transparência financeira com otimização contínua de recursos e performance.",
    "Combines financial transparency with continuous resource and performance optimization.",
  ],
  [
    "Valida baseline, modelo operacional, responsabilidades e prioridades antes de uma decisão comercial.",
    "Validates the baseline, operating model, responsibilities, and priorities before a commercial decision.",
  ],
  [
    "Os sinais conectam governança, proteção, integração e consumo confiável de dados.",
    "Signals connect governance, protection, integration, and trusted data consumption.",
  ],
  [
    "Cria uma fundação governada de dados com controles de segurança e segredos empresariais.",
    "Creates a governed data foundation with security and enterprise secrets controls.",
  ],
  [
    "Alinha stakeholders, fontes críticas, riscos e um roadmap de dados confiáveis.",
    "Aligns stakeholders, critical sources, risks, and a trusted-data roadmap.",
  ],
  [
    "Adoção de IA exige transparência, risco, políticas e supervisão humana coordenados.",
    "AI adoption requires coordinated transparency, risk controls, policies, and human oversight.",
  ],
  [
    "Conecta ciclo de vida de modelos, controles de risco e evidências operacionais.",
    "Connects the model lifecycle, risk controls, and operational evidence.",
  ],
  [
    "Define casos prioritários, guardrails e modelo operacional responsável.",
    "Defines priority use cases, guardrails, and a responsible operating model.",
  ],
  [
    "O cenário distribuído exige portabilidade, consistência operacional e otimização.",
    "The distributed landscape requires portability, operational consistency, and optimization.",
  ],
  [
    "Padroniza execução e provisionamento seguro em ambientes híbridos.",
    "Standardizes execution and secure provisioning across hybrid environments.",
  ],
  [
    "Cria um roadmap de arquitetura alinhado às prioridades de negócio.",
    "Creates an architecture roadmap aligned with business priorities.",
  ],
  [
    "Sinais de processos manuais e ineficiência indicam potencial de produtividade.",
    "Signals of manual processes and inefficiency indicate productivity potential.",
  ],
  [
    "Orquestra trabalho e conecta insights operacionais a ações coordenadas.",
    "Orchestrates work and connects operational insights to coordinated actions.",
  ],
  [
    "Prioriza jornadas de automação por impacto, risco e esforço.",
    "Prioritizes automation journeys by impact, risk, and effort.",
  ],
  [
    "Dependências legadas e velocidade de entrega sugerem modernização incremental.",
    "Legacy dependencies and delivery speed suggest incremental modernization.",
  ],
  [
    "Apoia modernização com plataforma consistente e observabilidade ponta a ponta.",
    "Supports modernization with a consistent platform and end-to-end observability.",
  ],
  [
    "Classifica aplicações e define ondas de modernização orientadas a valor.",
    "Classifies applications and defines value-led modernization waves.",
  ],
  [
    "Stakeholders decisores ainda não identificados",
    "Decision-making stakeholders have not been identified",
  ],
  [
    "Arquitetura/sistemas ainda pouco claros",
    "Architecture and systems remain unclear",
  ],
  ["Dor de negócio ainda genérica", "The business pain remains generic"],
  [
    "Recomendação precisa de validação humana antes de handoff comercial",
    "The recommendation requires human validation before commercial handoff",
  ],
  [
    "Qual iniciativa executiva está por trás dessa conversa?",
    "Which executive initiative is driving this conversation?",
  ],
  [
    "Quem decide orçamento, risco e arquitetura nessa conta?",
    "Who decides on budget, risk, and architecture in this account?",
  ],
  [
    "Quais métricas definem sucesso nos próximos 90 dias?",
    "Which metrics define success over the next 90 days?",
  ],
  [
    "O que precisa estar comprovado para virar oportunidade no CRM?",
    "What must be proven before this becomes a CRM opportunity?",
  ],
  [
    "Preparar conversa de aprofundamento antes de criar oportunidade no CRM.",
    "Prepare a deeper discovery conversation before creating a CRM opportunity.",
  ],
  [
    "Validar decisores, influenciadores e sponsor executivo",
    "Validate decision-makers, influencers, and the executive sponsor",
  ],
  [
    "Registrar uma reunião recente com evidências do cliente",
    "Record a recent meeting with customer evidence",
  ],
  [
    "Aumentar a qualidade das evidências antes do handoff para o CRM",
    "Improve evidence quality before CRM handoff",
  ],
  ["Mapear sponsor executivo", "Map an executive sponsor"],
  ["Revisar handoff de ", "Review handoff for "],
  [
    "Revisar o resumo estruturado e aprovar manualmente o handoff para o CRM.",
    "Review the structured summary and manually approve the CRM handoff.",
  ],
  [
    "A conta ainda não possui um stakeholder executivo confirmado.",
    "The account does not yet have a confirmed executive stakeholder.",
  ],
  [
    "Identificar quem patrocina, decide orçamento e responde pelo resultado.",
    "Identify who sponsors the initiative, decides on budget, and owns the outcome.",
  ],
  ["Hipótese de ", "Hypothesis for "],
  [
    "Possível aderência entre o contexto da conta e ",
    "Potential fit between the account context and ",
  ],
  ["Confirmar a dor de negócio", "Confirm the business pain"],
  ["Identificar sponsor ou decisor", "Identify a sponsor or decision-maker"],
  [
    "Validar orçamento, prazo e critério de decisão",
    "Validate budget, timeline, and decision criteria",
  ],
  [
    "Diagnóstico obrigatório no modo adaptativo.",
    "Required baseline assessment in adaptive mode.",
  ],
  ["Ainda sem evidência suficiente.", "Not enough evidence yet."],
  [
    "Organograma inicial sugerido para validação humana",
    "Initial organization chart suggested for human validation",
  ],
  ["Diretoria executiva", "Executive leadership"],
  ["Arquitetura e engenharia", "Architecture and engineering"],
  ["Crescimento", "Growth"],
  ["Eficiência operacional", "Operational efficiency"],
  [
    "Mapeie prioridades executivas, métricas e patrocinadores da transformação.",
    "Map executive priorities, metrics, and transformation sponsors.",
  ],
  [
    "Validar agenda de dados, cloud, governança e investimento tecnológico.",
    "Validate the data, cloud, governance, and technology investment agenda.",
  ],
  [
    "Entender dependências técnicas, plataformas e capacidade de execução.",
    "Understand technical dependencies, platforms, and delivery capacity.",
  ],
  ["CEO (a identificar)", "CEO (to identify)"],
  ["CIO (a identificar)", "CIO (to identify)"],
  ["CTO (a identificar)", "CTO (to identify)"],
  ["Varejo", "Retail"],
  ["Serviços financeiros", "Financial services"],
  ["Logística", "Logistics"],
  ["Energia", "Energy"],
  ["Tecnologia", "Technology"],
  ["Qualificação pré-CRM", "Pre-CRM qualification"],
  ["Pronto para handoff", "Ready for handoff"],
  ["Aprofundar descoberta", "Deepen discovery"],
  ["Capacidade", "Capability"],
  ["Consultoria", "Consulting"],
  ["decisor de", "decision-maker for"],
  ["possível aderência", "potential fit"],
  ["risco associado", "associated risk"],
  ["impacta", "impacts"],
  ["depende de", "depends on"],
  ["Sistema citado: ", "System mentioned: "],
  [
    "Pressão por previsibilidade e controle de custos",
    "Pressure for cost predictability and control",
  ],
  ["Dados fragmentados ou pouco confiáveis", "Fragmented or untrusted data"],
  [
    "Risco, conformidade e proteção de dados",
    "Risk, compliance, and data protection",
  ],
  [
    "Processos manuais ou baixa produtividade",
    "Manual processes or low productivity",
  ],
  [
    "Dependências legadas ou necessidade de modernização",
    "Legacy dependencies or modernization needs",
  ],
  [
    "Stakeholder identificado em reunião",
    "Stakeholder identified in a meeting",
  ],
  ["Sistema/plataforma citado", "System or platform mentioned"],
  ["Dor de negócio ou tecnologia", "Business or technology pain"],
  ["Lacuna para validar antes do CRM", "Gap to validate before CRM"],
  ["Contexto:", "Context:"],
  [" de jan.", " Jan"],
  [" de fev.", " Feb"],
  [" de mar.", " Mar"],
  [" de abr.", " Apr"],
  [" de mai.", " May"],
  [" de jun.", " Jun"],
  [" de jul.", " Jul"],
  [" de ago.", " Aug"],
  [" de set.", " Sep"],
  [" de out.", " Oct"],
  [" de nov.", " Nov"],
  [" de dez.", " Dec"],
];

const exact: Record<string, string> = {
  Alta: "High",
  Média: "Medium",
  Baixa: "Low",
  Aliado: "Ally",
  Neutro: "Neutral",
  Resistente: "Resistant",
  Desconhecido: "Unknown",
  "Não informada": "Not provided",
  "Indústria não informada": "Industry not provided",
};

function likelyPortuguese(value: string): boolean {
  if (/https?:\/\//i.test(value) || /^[-\w.:/@]+$/.test(value)) return false;
  return (
    /[ãõçáéíóúâêôà]/i.test(value) ||
    /\b(ação|ações|ainda|antes|conta|com|confiança|critério|dados|descoberta|evidência|informação|memória|não|para|prazo|reunião|risco|sem|uma|validar)\b/i.test(
      value,
    )
  );
}

export function localizeDemoSystemText(value: string, locale: Locale): string {
  if (locale === "pt-BR" || !value) return value;
  const system = localizeSystemValue(locale, value);
  if (system !== value) return system;
  let translated = exact[value] || value;
  for (const [source, target] of replacements)
    translated = translated.split(source).join(target);
  // The public records are synthetic. Unknown legacy prose is never sent to a
  // provider merely to switch the UI language, so expose a safe English label
  // instead of leaking partially translated Portuguese demo copy.
  return likelyPortuguese(translated)
    ? "Synthetic account intelligence evidence available for review."
    : translated;
}

function localizeDeep(value: unknown, locale: Locale): unknown {
  if (typeof value === "string") return localizeDemoSystemText(value, locale);
  if (Array.isArray(value))
    return value.map((item) => localizeDeep(item, locale));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      localizeDeep(item, locale),
    ]),
  );
}

function localizeCatalogObjects(value: unknown, locale: Locale): void {
  if (Array.isArray(value)) {
    value.forEach((item) => localizeCatalogObjects(item, locale));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const catalogQuestionId =
    typeof record.catalogQuestionId === "string"
      ? record.catalogQuestionId
      : null;
  if (catalogQuestionId) {
    const localized = getLocalizedQuestionById(catalogQuestionId, locale);
    if (localized) {
      if ("prompt" in record) record.prompt = localized.question;
      if ("hint" in record) record.hint = localized.hint;
      if ("rationale" in record) record.rationale = localized.rationale;
      if ("inputSchema" in record) record.inputSchema = localized.input;
    }
  }
  Object.values(record).forEach((item) => localizeCatalogObjects(item, locale));
}

function restoreProtectedNames(
  value: unknown,
  names: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") {
    let restored = value;
    for (const [localizedName, originalName] of names)
      restored = restored.split(localizedName).join(originalName);
    return restored;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = restoreProtectedNames(item, names);
    });
    return value;
  }
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(record))
    record[key] = restoreProtectedNames(item, names);
  return value;
}

export function localizeDemoPayload<T>(payload: T, locale: Locale): T {
  if (locale === "pt-BR") return payload;
  const originalRecord = payload as Record<string, unknown>;
  const originalCustomerNames = new Map(
    (Array.isArray(originalRecord.discoveries)
      ? originalRecord.discoveries
      : []
    )
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
      .map((item) => [String(item.id || ""), String(item.customerName || "")]),
  );
  const clone = localizeDeep(payload, locale) as T;
  localizeCatalogObjects(clone, locale);
  const record = clone as Record<string, unknown>;
  const discoveries = Array.isArray(record.discoveries)
    ? (record.discoveries as Array<Record<string, unknown>>)
    : [];
  for (const discovery of discoveries) {
    const originalName = originalCustomerNames.get(String(discovery.id || ""));
    if (originalName) discovery.customerName = originalName;
  }
  const guided = Array.isArray(record.guidedDiscoveries)
    ? (record.guidedDiscoveries as Array<Record<string, unknown>>)
    : [];
  for (const discovery of guided) {
    const questions = Array.isArray(discovery.questions)
      ? (discovery.questions as Array<Record<string, unknown>>)
      : [];
    for (const question of questions) {
      const id = String(question.catalogQuestionId || "");
      const localized = getLocalizedQuestionById(id, locale);
      if (!localized) continue;
      question.prompt = localized.question;
      question.hint = localized.hint;
      question.rationale = localized.rationale;
      question.inputSchema = localized.input;
    }
    const pillars = Array.isArray(discovery.pillars)
      ? (discovery.pillars as Array<Record<string, unknown>>)
      : [];
    for (const pillar of pillars) {
      const key = String(pillar.key) as GuidedDiscoveryPillarKey;
      const meta = getLocalizedPillarMeta(key, locale);
      if (meta) Object.assign(pillar, meta);
    }
  }
  const protectedNames = new Map(
    [...originalCustomerNames.values()]
      .filter(Boolean)
      .map((name) => [localizeDemoSystemText(name, locale), name]),
  );
  restoreProtectedNames(clone, protectedNames);
  return clone;
}
