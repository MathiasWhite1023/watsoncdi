export const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";
export const LOCALE_COOKIE = "watson-cdi-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const enUS = {
  brand: {
    name: "Watson CDI",
    subtitle: "Customer Discovery Intelligence",
    description:
      "Proactive account intelligence before CRM: memory, stakeholders, meetings, hypotheses, IBM themes, and evidence-based next steps.",
  },
  language: {
    label: "Language",
    english: "English",
    portuguese: "Português",
  },
  common: {
    loading: "Loading",
    saving: "Saving…",
    close: "Close",
    accept: "Accept",
    dismiss: "Dismiss",
    edit: "Edit",
    add: "Add",
    review: "Review",
    unknown: "Unknown",
    notAssessed: "Not assessed",
    noData: "No data available",
    account: "Account",
    people: "People",
    confidence: "Confidence",
    progress: "Progress",
    coverage: "Coverage",
    impact: "Impact",
    maturity: "Maturity",
    alignment: "Alignment",
    readiness: "Readiness",
    value: "Business value",
  },
  navigation: {
    home: "Home",
    accounts: "Account intelligence",
    radar: "Portfolio radar",
    settings: "Settings",
  },
  heatmaps: {
    accountHealth: "Account Health",
    capabilityHealth: "Capability Health",
    portfolioFit: "Portfolio Fit",
    opportunityPotential: "Opportunity potential",
    preCrmMaturity: "Pre-CRM maturity",
    relationshipCoverage: "Relationship coverage",
    evidenceConfidence: "Evidence confidence",
    discoveryCoverage: "Discovery coverage",
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  guided: {
    accountStrategy: "Account intelligence · Strategy",
    title: "Opportunity discovery",
    catalog: "catalog",
    closeLabel: "Close guided discovery",
    demoTitle: "Completed demonstration",
    demoReadonly:
      "Explore the answers and prioritization logic. Sign in to the private workspace to save your own session.",
    demoLegacy:
      "Legacy answers appear in history and will be materialized when the session starts.",
    dynamicPath: "Dynamic path",
    addressed: "{addressed} of {total} addressed",
    sessionProgress: "Session progress",
    progressHelp:
      "Progress measures addressed questions; coverage requires confirmed evidence.",
    discoveryPillars: "Discovery pillars",
    relevance: "relevance",
    hideHistory: "Hide history",
    historyAndRevisions: "History and revisions ({count})",
    aiProposal: "AI proposal",
    questionPosition: "Question {number} · information value {score}",
    confirmed: "Confirmed",
    gap: "Gap",
    draft: "Draft",
    contextLabel: "Context and evidence",
    contextHelp:
      "Record what was said, examples, metrics, and what still needs to be validated.",
    evidenceNature: "Evidence type",
    evidenceConfirmed: "Confirmed document or data",
    evidenceReported: "Stakeholder statement",
    evidenceHypothesis: "Hypothesis to validate",
    evidenceUnknown: "Still unknown",
    relatedStakeholder: "Related stakeholder",
    stakeholderUnlinked: "Not linked yet",
    sourceType: "Source",
    sourceMeeting: "Meeting",
    sourceDocument: "Document",
    sourceCustomer: "Customer statement",
    sourceResearch: "Approved research",
    sourceOther: "Other",
    sourceReference: "Source / reference",
    sourcePlaceholder: "Example: 2026 QBR, page 4",
    evidenceDate: "Evidence date",
    pause: "Pause",
    saveDraft: "Save draft",
    doNotKnow: "I don't know yet",
    confirmContinue: "Confirm and continue",
    pathAddressed: "Path addressed",
    pathAddressedHelp:
      "Review gaps, request a checkpoint, or complete the session when appropriate.",
    whyAsk: "Why are we asking this?",
    defaultRationale:
      "The next question is ranked by the value it can add to the account hypotheses and coverage.",
    discoveryQuality: "Discovery quality",
    withEvidence: "with evidence",
    gaps: "gaps",
    stale: "stale",
    contradictions: "contradictions",
    answerImpact: "Impact of this answer",
    proposedFollowUp: "Proposed follow-up",
    checkpointAvailable: "Checkpoint available",
    checkpointHelp:
      "The catalog has recalculated the path. AI can propose one complementary question without changing scores.",
    requestFollowUp: "Request follow-up",
    completeSession: "Complete session",
    newAssessment: "New assessment",
    chooseStart: "Choose how to begin",
    startHelp:
      "The path remains editable and recalculates the next question as evidence develops.",
    recommended: "Recommended",
    adaptive: "Adaptive",
    adaptiveHelp:
      "Starts with six baseline questions, identifies the two most relevant pillars, and builds the path.",
    shortcut: "Shortcut",
    direct: "Direct by pillar",
    directHelp:
      "Go directly to one or more technology themes already present in the conversation.",
    selectPillars: "Select pillars",
    currentRelevance: "current relevance",
    preparingPath: "Preparing path…",
    startAdaptive: "Start adaptive assessment",
    enterSelected: "Open selected pillars",
    structuredAnswer: "Structured answer",
    initial: "Initial",
    advanced: "Advanced",
    selectedCount: "{count} selected",
    sessionMemory: "Session memory",
    answersRevisions: "Answers and revisions",
    revisionsHelp:
      "Each edit creates a new version; the original source remains auditable.",
    previousQuestion: "Previous question",
    markedUnknown: "Marked as still unknown.",
    reviseAnswer: "Revise answer",
    emptyHistory: "Empty history",
    emptyHistoryHelp:
      "Answers will appear here with their revisions and sources.",
    informationGapFactor: "Information gap · 45%",
    hypothesisImpactFactor: "Hypothesis impact · 30%",
    stalenessFactor: "Staleness · 15%",
    stakeholderCoverageFactor: "Stakeholder coverage · 10%",
  },
  relationship: {
    reporta_para: "Reports to",
    influencia: "Influences",
    aliado: "Ally of",
    bloqueia: "Blocks",
    decide: "Decides",
    possui_iniciativa: "Owns initiative",
    unknownArea: "Area not provided",
    influenceUnknown: "Influence not assessed",
    sponsor: "Sponsor",
    pendingRelationship: "Relationship gap",
    connectTarget: "Connect as target",
    connectSource: "Connect as source",
    loading: "Loading relationship map",
    mapLabel: "Interactive account relationship map",
    viewLabel: "Map view",
    hierarchy: "Hierarchy",
    influenceNetwork: "Influence network",
    newRelationship: "New relationship",
    relationshipType: "New relationship type",
    rearrange: "Rearrange",
    addPerson: "Add person",
    zoomControls: "Zoom and fit controls",
    minimap: "Relationship minimap",
    legend: "Legend",
    sponsorPath: "Path to sponsor",
    dragHelp: "Drag between connectors to create the selected relationship.",
    emptyTitle: "The map starts with people",
    emptyHelp:
      "Add decision-makers, influencers, and contacts to build the account hierarchy and influence network.",
    addFirst: "Add first stakeholder",
    intelligenceFor: "Intelligence for {name}",
    closeProfile: "Close profile",
    stanceUnknown: "Stance not assessed",
    influence: "Influence {value}",
    connectionsToSponsor: "{count} connection(s) to the sponsor",
    incompleteSponsorPath: "Path to sponsor is incomplete",
    knownPriorities: "Known priorities",
    noPriorities: "No priorities have been confirmed yet.",
    recommendedApproach: "Recommended approach",
    notes: "Notes",
    evidence: "Evidence",
    evidenceConfidence: "{value}% confidence",
    noEvidence:
      "This profile has no linked evidence. Confirm the information in a future interaction.",
    editProfile: "Edit profile",
    addRelationship: "Add relationship",
    approachResistant: "Start by validating objections and risk criteria",
    approachAlly: "Use this relationship as a bridge to broaden sponsorship",
    approachNeutral: "Confirm goals, influence, and decision criteria",
    approachSuffix:
      "Connect the conversation to {theme} and capture evidence before advancing the hypothesis.",
    defaultTheme: "this person's executive priority",
    edgeLabel: "{relationship}: {source} to {target}",
  },
  charts: {
    potentialMaturity: "Potential × maturity",
    preCrmMaturity: "Pre-CRM maturity",
    fitPotential: "Fit potential",
    impact: "Impact",
    stakeholderCoverage: "Stakeholder coverage",
    confirmedExecutives: "Confirmed executives",
    highInfluence: "High influence",
    totalMapped: "Total mapped",
    people: "People",
    account: "Account",
    stakeholderAria: "Stakeholder coverage by account",
    bubbleAria: "Bubble chart comparing account potential and maturity",
    confidenceEvolution: "Confidence evolution",
    analyses: "Analyses",
    confidence: "Confidence",
    confidenceAria: "Historical evolution of hypothesis confidence",
    group: "Group",
    total: "Total",
    tableTitle: "Data table",
    downloadCsv: "Download as CSV",
    exportCsv: "Export as CSV",
    exportJpg: "Export as JPG",
    exportPng: "Export as PNG",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
    moreOptions: "More options",
    fullscreen: "Make fullscreen",
    exitFullscreen: "Exit fullscreen",
    showTable: "Show as data table",
  },
  systemValues: {
    high: "High",
    medium: "Medium",
    low: "Low",
    ally: "Ally",
    neutral: "Neutral",
    resistant: "Resistant",
    unknown: "Unknown",
    proposal: "Proposed",
    accepted: "Accepted",
    inProgress: "In progress",
    completed: "Completed",
    dismissed: "Dismissed",
    preCrmQualification: "Pre-CRM qualification",
    readyForHandoff: "Ready for handoff",
    inDiscovery: "In discovery",
    validation: "Validation",
    deepenDiscovery: "Deepen discovery",
    notProvided: "Not provided",
  },
} as const;

type DictionaryParity<T> = {
  [K in keyof T]: T[K] extends string ? string : DictionaryParity<T[K]>;
};

const ptBR = {
  brand: {
    name: "Watson CDI",
    subtitle: "Inteligência de descoberta do cliente",
    description:
      "Inteligência proativa de contas antes do CRM: memória, stakeholders, reuniões, hipóteses, temas IBM e próximos passos fundamentados.",
  },
  language: { label: "Idioma", english: "English", portuguese: "Português" },
  common: {
    loading: "Carregando",
    saving: "Salvando…",
    close: "Fechar",
    accept: "Aceitar",
    dismiss: "Descartar",
    edit: "Editar",
    add: "Adicionar",
    review: "Revisar",
    unknown: "Desconhecido",
    notAssessed: "Não avaliado",
    noData: "Nenhum dado disponível",
    account: "Conta",
    people: "Pessoas",
    confidence: "Confiança",
    progress: "Progresso",
    coverage: "Cobertura",
    impact: "Impacto",
    maturity: "Maturidade",
    alignment: "Alinhamento",
    readiness: "Prontidão",
    value: "Valor de negócio",
  },
  navigation: {
    home: "Início",
    accounts: "Inteligência de contas",
    radar: "Radar da carteira",
    settings: "Configurações",
  },
  heatmaps: {
    accountHealth: "Saúde das contas",
    capabilityHealth: "Saúde das capacidades",
    portfolioFit: "Aderência da carteira",
    opportunityPotential: "Potencial da oportunidade",
    preCrmMaturity: "Maturidade pré-CRM",
    relationshipCoverage: "Cobertura de relacionamentos",
    evidenceConfidence: "Confiança das evidências",
    discoveryCoverage: "Cobertura da descoberta",
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
  },
  guided: {
    accountStrategy: "Inteligência de contas · Estratégia",
    title: "Descoberta de oportunidades",
    catalog: "catálogo",
    closeLabel: "Fechar descoberta guiada",
    demoTitle: "Demonstração preenchida",
    demoReadonly:
      "Explore respostas e lógica de priorização. Para salvar uma sessão própria, entre no workspace privado.",
    demoLegacy:
      "As respostas legadas aparecem no histórico e serão materializadas ao iniciar a sessão.",
    dynamicPath: "Roteiro dinâmico",
    addressed: "{addressed} de {total} abordadas",
    sessionProgress: "Progresso da sessão",
    progressHelp:
      "Progresso mede perguntas abordadas; cobertura exige evidência confirmada.",
    discoveryPillars: "Pilares da descoberta",
    relevance: "relevância",
    hideHistory: "Ocultar histórico",
    historyAndRevisions: "Histórico e revisões ({count})",
    aiProposal: "Proposta de IA",
    questionPosition: "Pergunta {number} · valor de informação {score}",
    confirmed: "Confirmada",
    gap: "Lacuna",
    draft: "Rascunho",
    contextLabel: "Contexto e evidência",
    contextHelp:
      "Registre o que foi dito, exemplos, métricas e o que ainda precisa ser validado.",
    evidenceNature: "Natureza da evidência",
    evidenceConfirmed: "Documento ou dado confirmado",
    evidenceReported: "Relato de stakeholder",
    evidenceHypothesis: "Hipótese a validar",
    evidenceUnknown: "Ainda desconhecido",
    relatedStakeholder: "Stakeholder relacionado",
    stakeholderUnlinked: "Ainda não relacionado",
    sourceType: "Origem",
    sourceMeeting: "Reunião",
    sourceDocument: "Documento",
    sourceCustomer: "Relato do cliente",
    sourceResearch: "Pesquisa aprovada",
    sourceOther: "Outra",
    sourceReference: "Fonte / referência",
    sourcePlaceholder: "Ex.: QBR 2026, página 4",
    evidenceDate: "Data da evidência",
    pause: "Pausar",
    saveDraft: "Salvar rascunho",
    doNotKnow: "Não sei ainda",
    confirmContinue: "Confirmar e continuar",
    pathAddressed: "Roteiro abordado",
    pathAddressedHelp:
      "Revise lacunas, solicite um checkpoint ou conclua a sessão quando fizer sentido.",
    whyAsk: "Por que estamos perguntando isso?",
    defaultRationale:
      "A próxima pergunta é ordenada pelo valor que pode acrescentar às hipóteses e à cobertura da conta.",
    discoveryQuality: "Qualidade da descoberta",
    withEvidence: "com evidência",
    gaps: "lacunas",
    stale: "desatualizadas",
    contradictions: "contradições",
    answerImpact: "Impacto desta resposta",
    proposedFollowUp: "Follow-up proposto",
    checkpointAvailable: "Checkpoint disponível",
    checkpointHelp:
      "O catálogo já recalculou o roteiro. A IA pode propor uma pergunta complementar, sem alterar scores.",
    requestFollowUp: "Solicitar follow-up",
    completeSession: "Concluir sessão",
    newAssessment: "Novo diagnóstico",
    chooseStart: "Escolha como quer começar",
    startHelp:
      "O roteiro permanece editável e recalcula a próxima pergunta conforme as evidências avançam.",
    recommended: "Recomendado",
    adaptive: "Adaptativo",
    adaptiveHelp:
      "Começa pelas seis perguntas-base, identifica os dois pilares mais relevantes e monta o roteiro.",
    shortcut: "Atalho",
    direct: "Direto por pilar",
    directHelp:
      "Entre imediatamente em um ou mais temas tecnológicos que já fazem parte da conversa.",
    selectPillars: "Selecione os pilares",
    currentRelevance: "relevância atual",
    preparingPath: "Preparando roteiro…",
    startAdaptive: "Iniciar diagnóstico adaptativo",
    enterSelected: "Entrar nos pilares selecionados",
    structuredAnswer: "Resposta estruturada",
    initial: "Inicial",
    advanced: "Avançado",
    selectedCount: "{count} selecionado(s)",
    sessionMemory: "Memória da sessão",
    answersRevisions: "Respostas e revisões",
    revisionsHelp:
      "Cada edição cria uma versão nova; a fonte original permanece auditável.",
    previousQuestion: "Pergunta anterior",
    markedUnknown: "Marcada como ainda desconhecida.",
    reviseAnswer: "Revisar resposta",
    emptyHistory: "Histórico vazio",
    emptyHistoryHelp:
      "As respostas aparecerão aqui com suas revisões e fontes.",
    informationGapFactor: "Lacuna de informação · 45%",
    hypothesisImpactFactor: "Impacto nas hipóteses · 30%",
    stalenessFactor: "Desatualização · 15%",
    stakeholderCoverageFactor: "Cobertura política · 10%",
  },
  relationship: {
    reporta_para: "Reporta para",
    influencia: "Influencia",
    aliado: "Aliado de",
    bloqueia: "Bloqueia",
    decide: "Decide",
    possui_iniciativa: "Possui iniciativa",
    unknownArea: "Área não informada",
    influenceUnknown: "Influência não avaliada",
    sponsor: "Sponsor",
    pendingRelationship: "Relação pendente",
    connectTarget: "Conectar como destino",
    connectSource: "Conectar como origem",
    loading: "Carregando mapa de relacionamentos",
    mapLabel: "Mapa interativo de relacionamentos da conta",
    viewLabel: "Visualização do mapa",
    hierarchy: "Hierarquia",
    influenceNetwork: "Rede de influência",
    newRelationship: "Nova relação",
    relationshipType: "Tipo da nova relação",
    rearrange: "Reorganizar",
    addPerson: "Adicionar pessoa",
    zoomControls: "Controles de zoom e enquadramento",
    minimap: "Minimapa dos relacionamentos",
    legend: "Legenda",
    sponsorPath: "Caminho ao sponsor",
    dragHelp: "Arraste entre os conectores para criar a relação selecionada.",
    emptyTitle: "O mapa começa pelas pessoas",
    emptyHelp:
      "Adicione decisores, influenciadores e contatos para construir a hierarquia e a rede de influência desta conta.",
    addFirst: "Adicionar primeiro stakeholder",
    intelligenceFor: "Inteligência de {name}",
    closeProfile: "Fechar perfil",
    stanceUnknown: "Postura não avaliada",
    influence: "Influência {value}",
    connectionsToSponsor: "{count} conexão(ões) até o sponsor",
    incompleteSponsorPath: "Caminho ao sponsor incompleto",
    knownPriorities: "Prioridades conhecidas",
    noPriorities: "Ainda não há prioridades confirmadas.",
    recommendedApproach: "Abordagem recomendada",
    notes: "Anotações",
    evidence: "Evidências",
    evidenceConfidence: "{value}% confiança",
    noEvidence:
      "Perfil sem evidência vinculada. Confirme a informação em uma próxima interação.",
    editProfile: "Editar perfil",
    addRelationship: "Adicionar relação",
    approachResistant: "Comece validando objeções e critérios de risco",
    approachAlly: "Use a relação como ponte para ampliar o patrocínio",
    approachNeutral: "Confirme objetivos, influência e critérios de decisão",
    approachSuffix:
      "Conecte a conversa a {theme} e registre uma evidência antes de avançar a hipótese.",
    defaultTheme: "a prioridade executiva desta pessoa",
    edgeLabel: "{relationship}: {source} para {target}",
  },
  charts: {
    potentialMaturity: "Potencial × maturidade",
    preCrmMaturity: "Maturidade pré-CRM",
    fitPotential: "Potencial de aderência",
    impact: "Impacto",
    stakeholderCoverage: "Cobertura de stakeholders",
    confirmedExecutives: "Executivos confirmados",
    highInfluence: "Alta influência",
    totalMapped: "Total mapeado",
    people: "Pessoas",
    account: "Conta",
    stakeholderAria: "Cobertura de stakeholders por conta",
    bubbleAria:
      "Gráfico de bolhas comparando potencial e maturidade das contas",
    confidenceEvolution: "Evolução da confiança",
    analyses: "Análises",
    confidence: "Confiança",
    confidenceAria: "Evolução histórica da confiança das hipóteses",
    group: "Grupo",
    total: "Total",
    tableTitle: "Tabela de dados",
    downloadCsv: "Baixar como CSV",
    exportCsv: "Exportar como CSV",
    exportJpg: "Exportar como JPG",
    exportPng: "Exportar como PNG",
    zoomIn: "Ampliar",
    zoomOut: "Reduzir",
    resetZoom: "Redefinir zoom",
    moreOptions: "Mais opções",
    fullscreen: "Tela cheia",
    exitFullscreen: "Sair da tela cheia",
    showTable: "Mostrar como tabela de dados",
  },
  systemValues: {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
    ally: "Aliado",
    neutral: "Neutro",
    resistant: "Resistente",
    unknown: "Desconhecido",
    proposal: "Proposta",
    accepted: "Aceita",
    inProgress: "Em andamento",
    completed: "Concluída",
    dismissed: "Descartada",
    preCrmQualification: "Qualificação pré-CRM",
    readyForHandoff: "Pronto para handoff",
    inDiscovery: "Em descoberta",
    validation: "Validação",
    deepenDiscovery: "Aprofundar descoberta",
    notProvided: "Não informado",
  },
} satisfies DictionaryParity<typeof enUS>;

export type Messages = DictionaryParity<typeof enUS>;
export const messages: Record<Locale, Messages> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;
export type TranslationKey = {
  [K in keyof Messages]: Messages[K] extends string
    ? K
    : Join<
        K,
        {
          [P in keyof Messages[K]]: Messages[K][P] extends string ? P : never;
        }[keyof Messages[K]]
      >;
}[keyof Messages] &
  string;

export function normalizeLocale(value: unknown): Locale {
  const locale = String(value || "")
    .trim()
    .toLowerCase();
  if (locale === "pt" || locale.startsWith("pt-")) return "pt-BR";
  if (locale === "en" || locale.startsWith("en-")) return "en-US";
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveRequestLocale(
  input: { explicit?: unknown; cookie?: unknown } = {},
): Locale {
  if (input.explicit && isSupportedLocale(String(input.explicit)))
    return input.explicit as Locale;
  if (input.explicit && /^(en|pt)(-|$)/i.test(String(input.explicit)))
    return normalizeLocale(input.explicit);
  if (input.cookie && isSupportedLocale(String(input.cookie)))
    return input.cookie as Locale;
  if (input.cookie && /^(en|pt)(-|$)/i.test(String(input.cookie)))
    return normalizeLocale(input.cookie);
  return DEFAULT_LOCALE;
}

export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  values?: Record<string, string | number>,
) {
  const result = key
    .split(".")
    .reduce<unknown>(
      (current, part) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[part]
          : undefined,
      messages[locale],
    );
  return interpolate(typeof result === "string" ? result : key, values);
}

export function formatLocalizedDate(
  locale: Locale,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, options).format(date)
    : "—";
}

export function formatLocalizedNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

const systemValueKeys: Record<string, keyof Messages["systemValues"]> = {
  alta: "high",
  high: "high",
  média: "medium",
  media: "medium",
  medium: "medium",
  baixa: "low",
  low: "low",
  aliado: "ally",
  ally: "ally",
  neutro: "neutral",
  neutral: "neutral",
  resistente: "resistant",
  resistant: "resistant",
  desconhecido: "unknown",
  unknown: "unknown",
  proposta: "proposal",
  proposed: "proposal",
  aceita: "accepted",
  accepted: "accepted",
  "em andamento": "inProgress",
  "in progress": "inProgress",
  concluída: "completed",
  concluida: "completed",
  completed: "completed",
  descartada: "dismissed",
  dismissed: "dismissed",
  "qualificação pré-crm": "preCrmQualification",
  "pre-crm qualification": "preCrmQualification",
  "pronto para handoff": "readyForHandoff",
  "ready for handoff": "readyForHandoff",
  "em descoberta": "inDiscovery",
  "in discovery": "inDiscovery",
  validação: "validation",
  validacao: "validation",
  validation: "validation",
  "aprofundar descoberta": "deepenDiscovery",
  "deepen discovery": "deepenDiscovery",
  "não informado": "notProvided",
  "nao informado": "notProvided",
  "not provided": "notProvided",
};

export function localizeSystemValue(
  locale: Locale,
  value: string | null | undefined,
) {
  if (!value) return value || "";
  const key = systemValueKeys[value.trim().toLowerCase()];
  return key ? messages[locale].systemValues[key] : value;
}

export function localeRequestHeaders(locale: Locale, init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Accept-Language", locale);
  headers.set("X-Watson-CDI-Locale", locale);
  return headers;
}
