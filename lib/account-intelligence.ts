export type EvidenceStatus = "confirmed" | "assumption" | "gap" | "stale";
export type AccountEvent = {
  id: string; discoveryId: string; type: string; title: string; content: string;
  sourceType: string; sourceId: string | null; evidenceStatus: EvidenceStatus;
  confidence: number; occurredAt: string; createdAt: string;
};
export type EvidenceRef = { sourceType: string; sourceId: string; title: string; excerpt: string; occurredAt: string };
export type AccountMemory = {
  executiveSummary: string; known: string[]; assumptions: string[]; gaps: string[];
  changes: string[]; aiStatus: "watsonx" | "gemini" | "fallback" | "error"; version: number; updatedAt: string;
};
export type ScoreLike = { name: string; short: string; alignment: number; readiness: number; confidence: number; evidence: string[]; action: string };
export type StakeholderLike = { id: string; name: string; role: string; influence: string; stance: string; priorities: string[]; notes: string; source?: string };
export type ActionCandidate = {
  type: string; title: string; rationale: string; nextStep: string; stakeholderId: string | null;
  impact: number; urgency: number; confidence: number; maturity: number; priorityScore: number;
  dueAt: string | null; evidence: EvidenceRef[]; dedupeKey: string; evidenceFingerprint: string;
  whyNow: string; effort: number; expectedOutcome: string;
  conversation: {
    stakeholder: string;
    theme: string;
    opener: string;
    questions: string[];
    objection: string;
    successCriterion: string;
  };
};
export type HypothesisCandidate = {
  capabilityKey: string; title: string; problem: string; products: string[]; stakeholderIds: string[];
  evidence: EvidenceRef[]; gaps: string[]; confidence: number; stage: "draft" | "validating" | "qualified" | "rejected";
  nextStep: string;
};

const productMap: Record<string, string[]> = {
  FinOps: ["IBM Cloudability", "IBM Turbonomic"],
  "Trusted Data": ["watsonx.data", "IBM Guardium"],
  "AI Governance": ["watsonx.governance", "watsonx.ai"],
  "Hybrid Cloud": ["Red Hat OpenShift", "HashiCorp Terraform"],
  Automation: ["watsonx Orchestrate", "IBM Concert"],
  "App Modernization": ["Red Hat OpenShift", "IBM Instana"],
};

const uniq = (items: string[], limit = 8) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
const excerpt = (value: string, length = 180) => value.length > length ? `${value.slice(0, length - 1)}…` : value;
const evidenceOf = (event: AccountEvent): EvidenceRef => ({ sourceType: event.sourceType, sourceId: event.sourceId || event.id, title: event.title, excerpt: excerpt(event.content), occurredAt: event.occurredAt });
const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const ageInDays = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
const hash = (value: string) => {
  let current = 2166136261;
  for (let index = 0; index < value.length; index += 1) current = Math.imul(current ^ value.charCodeAt(index), 16777619);
  return (current >>> 0).toString(36);
};
export const priorityScore = (impact: number, urgency: number, confidence: number, maturity: number) =>
  Math.round(impact * .35 + urgency * .25 + confidence * .25 + maturity * .15);

export function buildMemory(customerName: string, summary: string, events: AccountEvent[], scores: ScoreLike[], previousVersion = 0): AccountMemory {
  const ordered = [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const confirmed = ordered.filter((item) => item.evidenceStatus === "confirmed");
  const assumptions = ordered.filter((item) => item.evidenceStatus === "assumption");
  const explicitGaps = ordered.filter((item) => item.evidenceStatus === "gap");
  const top = scores[0];
  const known = uniq(confirmed.map((item) => `${item.title}: ${excerpt(item.content, 150)}`), 6);
  const gaps = uniq([
    ...explicitGaps.map((item) => item.content),
    !events.some((item) => item.type.includes("stakeholder")) ? "Validar decisores, influenciadores e sponsor executivo" : "",
    !events.some((item) => item.type.includes("meeting")) ? "Registrar uma reunião recente com evidências do cliente" : "",
    top?.confidence < 60 ? "Aumentar a qualidade das evidências antes do handoff para o CRM" : "",
  ], 6);
  return {
    executiveSummary: summary || (top ? `${customerName} apresenta sinais de aderência em ${top.name}, ainda em validação antes do CRM.` : `A memória de ${customerName} está em construção.`),
    known,
    assumptions: uniq(assumptions.map((item) => `${item.title}: ${excerpt(item.content, 150)}`), 6),
    gaps,
    changes: uniq(ordered.slice(0, 4).map((item) => `${item.title} · ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(item.occurredAt))}`), 4),
    aiStatus: "fallback",
    version: previousVersion + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function buildHypotheses(scores: ScoreLike[], events: AccountEvent[], stakeholders: StakeholderLike[]): HypothesisCandidate[] {
  const evidence = events.filter((item) => item.evidenceStatus === "confirmed").slice(0, 6).map(evidenceOf);
  const pains = events.filter((item) => item.type === "pain" || item.content.toLowerCase().includes("dor"));
  // Suggested placeholders help discovery, but never satisfy the human-validated
  // stakeholder gate required for a CRM handoff.
  const influential = stakeholders.filter((item) => item.influence === "Alta" && item.source !== "suggested");
  return scores.filter((score) => score.alignment >= 55).slice(0, 3).map((score) => {
    const confidence = Math.min(96, Math.round((score.alignment + score.readiness + score.confidence) / 3));
    const hasPain = pains.length > 0 || score.evidence.length > 0;
    const stage = score.alignment >= 75 && score.readiness >= 60 && confidence >= 70 && hasPain && influential.length > 0 ? "qualified" : confidence >= 58 ? "validating" : "draft";
    return {
      capabilityKey: score.short,
      title: `Hipótese de ${score.short}`,
      problem: score.evidence[0] || `Possível aderência entre o contexto da conta e ${score.name}.`,
      products: productMap[score.short] || [score.name],
      stakeholderIds: influential.slice(0, 3).map((item) => item.id),
      evidence: evidence.slice(0, 4),
      gaps: uniq([!hasPain ? "Confirmar a dor de negócio" : "", !influential.length ? "Identificar sponsor ou decisor" : "", score.readiness < 60 ? "Validar orçamento, prazo e critério de decisão" : ""], 4),
      confidence,
      stage,
      nextStep: score.action,
    };
  });
}

export function buildActions(account: { id: string; customerName: string; progress: number; updatedAt: string }, events: AccountEvent[], scores: ScoreLike[], stakeholders: StakeholderLike[], hypotheses: HypothesisCandidate[]): ActionCandidate[] {
  const candidates: Omit<ActionCandidate, "priorityScore" | "evidenceFingerprint" | "whyNow" | "effort" | "expectedOutcome" | "conversation">[] = [];
  const evidence = events.slice(0, 5).map(evidenceOf);
  const inactivity = Math.max(0, ageInDays(account.updatedAt));
  if (inactivity >= 21) candidates.push({ type: "reactivate", title: `Retomar ${account.customerName}`, rationale: `A conta está há ${inactivity} dias sem nova informação.`, nextStep: "Agendar uma conversa de atualização com o contato mais próximo.", stakeholderId: stakeholders[0]?.id || null, impact: 72, urgency: Math.min(95, 60 + inactivity), confidence: 92, maturity: account.progress, dueAt: daysFromNow(3), evidence, dedupeKey: `${account.id}:reactivate` });
  const executives = stakeholders.filter((item) => /chief|ceo|cio|cto|cfo|ciso|diretor|vp/i.test(`${item.role} ${item.name}`));
  if (!executives.length) candidates.push({ type: "coverage", title: "Mapear sponsor executivo", rationale: "A conta ainda não possui um stakeholder executivo confirmado.", nextStep: "Identificar quem patrocina, decide orçamento e responde pelo resultado.", stakeholderId: null, impact: 82, urgency: 68, confidence: 95, maturity: account.progress, dueAt: daysFromNow(7), evidence, dedupeKey: `${account.id}:executive-gap` });
  const upcoming = events.find((item) => item.type === "scheduled_meeting" && new Date(item.occurredAt).getTime() >= Date.now() && new Date(item.occurredAt).getTime() <= Date.now() + 7 * 86400000);
  if (upcoming) candidates.push({ type: "meeting_prep", title: `Preparar ${upcoming.title}`, rationale: "Existe uma reunião nos próximos sete dias e a preparação ainda precisa ser revisada.", nextStep: "Revisar briefing, perguntas, stakeholders e hipóteses antes da reunião.", stakeholderId: null, impact: 84, urgency: 92, confidence: 96, maturity: account.progress, dueAt: upcoming.occurredAt, evidence: [evidenceOf(upcoming), ...evidence].slice(0, 5), dedupeKey: `${account.id}:meeting:${upcoming.id}` });
  const stale = events.find((item) => item.evidenceStatus === "stale" || (item.evidenceStatus === "confirmed" && ageInDays(item.occurredAt) >= 90));
  if (stale) candidates.push({ type: "refresh_evidence", title: `Atualizar: ${stale.title}`, rationale: "Uma evidência importante está desatualizada há 90 dias ou foi marcada para revisão.", nextStep: "Confirmar se a informação continua válida e registrar uma fonte recente.", stakeholderId: null, impact: 68, urgency: 72, confidence: 95, maturity: account.progress, dueAt: daysFromNow(7), evidence: [evidenceOf(stale)], dedupeKey: `${account.id}:stale:${stale.id}` });
  const overdue = events.find((item) => item.type === "commitment" && new Date(item.occurredAt).getTime() < Date.now());
  if (overdue) candidates.push({ type: "overdue_commitment", title: `Resolver compromisso: ${overdue.title}`, rationale: "O prazo registrado para este compromisso já venceu.", nextStep: "Atualizar o responsável, concluir o compromisso ou renegociar o prazo.", stakeholderId: null, impact: 78, urgency: 96, confidence: 98, maturity: account.progress, dueAt: overdue.occurredAt, evidence: [evidenceOf(overdue)], dedupeKey: `${account.id}:commitment:${overdue.id}` });
  const contradiction = events.find((item) => item.type === "contradiction");
  if (contradiction) candidates.push({ type: "review_contradiction", title: `Revisar contradição: ${contradiction.title}`, rationale: "Existem registros conflitantes que podem alterar a leitura da conta.", nextStep: "Comparar as fontes e confirmar a versão correta com o cliente.", stakeholderId: null, impact: 86, urgency: 84, confidence: Math.max(70, contradiction.confidence), maturity: account.progress, dueAt: daysFromNow(3), evidence: [evidenceOf(contradiction)], dedupeKey: `${account.id}:contradiction:${contradiction.id}` });
  const top = scores[0];
  if (top?.alignment >= 70) candidates.push({ type: "validate_hypothesis", title: `Validar aderência em ${top.short}`, rationale: `${top.short} alcançou ${top.alignment}% de alinhamento com ${top.confidence}% de confiança.`, nextStep: top.action, stakeholderId: executives[0]?.id || stakeholders[0]?.id || null, impact: top.alignment, urgency: 70, confidence: top.confidence, maturity: account.progress, dueAt: daysFromNow(7), evidence, dedupeKey: `${account.id}:capability:${top.short}` });
  const qualified = hypotheses.find((item) => item.stage === "qualified");
  if (qualified) candidates.push({ type: "crm_handoff", title: `Revisar handoff de ${qualified.capabilityKey}`, rationale: "A hipótese atingiu os critérios mínimos de evidência, prontidão e cobertura de stakeholders.", nextStep: "Revisar o resumo estruturado e aprovar manualmente o handoff para o CRM.", stakeholderId: qualified.stakeholderIds[0] || null, impact: 94, urgency: 76, confidence: qualified.confidence, maturity: account.progress, dueAt: daysFromNow(5), evidence: qualified.evidence, dedupeKey: `${account.id}:handoff:${qualified.capabilityKey}` });
  return candidates.map((item) => {
    const stakeholder = stakeholders.find((person) => person.id === item.stakeholderId) || stakeholders.find((person) => person.influence === "Alta") || stakeholders[0];
    const theme = hypotheses[0]?.capabilityKey || scores[0]?.short || "prioridade estratégica";
    return {
      ...item,
      whyNow: item.rationale,
      effort: item.type === "meeting_prep" ? 35 : item.type === "crm_handoff" ? 65 : item.type === "coverage" ? 45 : 50,
      expectedOutcome: item.type === "crm_handoff" ? "Handoff revisado, fundamentado e pronto para decisão humana." : `Nova evidência para reduzir incerteza sobre ${theme}.`,
      conversation: {
        stakeholder: stakeholder ? `${stakeholder.name} · ${stakeholder.role}` : "Stakeholder a identificar",
        theme,
        opener: `Quero validar como ${theme} se conecta às prioridades atuais de ${account.customerName}.`,
        questions: [
          `Qual resultado de negócio torna ${theme} prioritário agora?`,
          "Quem precisa participar da decisão e quais métricas definem sucesso?",
          "Qual evidência ainda falta para concordarmos com o próximo passo?",
        ],
        objection: "Ainda não há urgência, sponsor ou evidência suficiente para avançar.",
        successCriterion: "Confirmar dor, responsável, métrica e um próximo passo com prazo.",
      },
      priorityScore: priorityScore(item.impact, item.urgency, item.confidence, item.maturity),
      evidenceFingerprint: hash(JSON.stringify(item.evidence.map((ref) => [ref.sourceId, ref.excerpt]))),
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

export function answerFromEvidence(question: string, customerName: string, events: AccountEvent[], scores: ScoreLike[], stakeholders: StakeholderLike[]) {
  const terms = question.toLowerCase().split(/[^a-zà-ú0-9]+/).filter((term) => term.length > 3);
  const ranked = events.map((event) => ({ event, relevance: terms.filter((term) => `${event.title} ${event.content}`.toLowerCase().includes(term)).length * 12 + event.confidence / 10 - Math.max(0, ageInDays(event.occurredAt)) / 30 })).sort((a, b) => b.relevance - a.relevance).slice(0, 5).map((item) => item.event);
  const citations = (ranked.length ? ranked : events.slice(0, 4)).map(evidenceOf);
  const asksStakeholder = /quem|stakeholder|patrocin|decisor|pessoa/i.test(question);
  const asksGap = /falta|lacuna|descobrir|não sabemos/i.test(question);
  const top = scores[0];
  let answer = `Com base nas evidências registradas de ${customerName}, ${top ? `o tema com maior aderência é ${top.name} (${top.alignment}%).` : "a conta ainda precisa de mais contexto."}`;
  if (asksStakeholder) answer = stakeholders.length ? `Os stakeholders mais relevantes mapeados são ${stakeholders.slice(0, 3).map((item) => `${item.name} (${item.role})`).join(", ")}. Priorize quem combina alta influência, postura favorável e interesse no tema em análise.` : "Ainda não há stakeholders suficientes para indicar um sponsor com segurança.";
  if (asksGap) answer = `As principais lacunas são cobertura executiva, evidências recentes de dor e confirmação de orçamento, prazo e critério de decisão. Valide esses pontos antes de avançar para o CRM.`;
  if (citations.length) answer += ` A resposta considera ${citations.length} fonte${citations.length > 1 ? "s" : ""} da memória da conta.`;
  return { answer, citations, confidence: Math.min(92, 48 + citations.length * 9), aiStatus: "fallback" as const, suggestedActions: [top?.action || "Registrar uma nova reunião", "Validar a resposta com o responsável pela conta"] };
}

export function suggestAccountPlan(memory: AccountMemory, hypotheses: HypothesisCandidate[], actions: ActionCandidate[], stakeholders: StakeholderLike[]) {
  const top = hypotheses[0];
  return {
    priorities: uniq([top?.capabilityKey || "Validar prioridade estratégica", ...memory.known.slice(0, 2)]),
    initiatives: uniq(hypotheses.map((item) => item.title), 5),
    objectives: uniq([top ? `Validar valor e prontidão para ${top.capabilityKey}` : "Construir contexto confiável da conta", "Ampliar cobertura de stakeholders e evidências"], 4),
    risks: uniq(memory.gaps, 5),
    ecosystem: [],
    relationship: uniq(stakeholders.slice(0, 4).map((item) => `${item.name}: ${item.stance}, influência ${item.influence}`), 5),
    plan30: uniq(actions.slice(0, 3).map((item) => item.nextStep), 4),
    plan60: uniq([top?.nextStep || "Conduzir workshop de descoberta", "Validar métricas, sponsor e arquitetura"], 4),
    plan90: uniq([top?.stage === "qualified" ? "Preparar handoff validado para o CRM" : "Qualificar a hipótese líder com evidências", "Consolidar roadmap conjunto com o cliente"], 4),
  };
}
