"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button as CarbonButton,
  Header as CarbonHeader,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Tag,
  Theme,
} from "@carbon/react";
import {
  Add,
  Analytics,
  ArrowRight,
  Dashboard,
  DataBase,
  DataVis_4,
  Document,
  Help,
  Menu,
  Close,
  Notebook,
  Security,
  UserAvatar,
} from "@carbon/icons-react";
import { CarbonCapabilityChart } from "./CarbonVisuals";

type Priority = "Alta" | "Média" | "Baixa";
type Recommendation = { type: "Capacidade" | "Software" | "Consultoria"; name: string; rationale: string };
type Answer = { key: string; question: string; answer: string; at: string };
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
type AccountEdge = { source: string; target: string; label: string };
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
type Discovery = {
  id: string;
  customerName: string;
  industry: string;
  companySize: string;
  owner: string;
  stage: string;
  progress: number;
  priority: Priority;
  challengeSummary: string;
  answers: Answer[];
  meetings: Meeting[];
  accountMap: AccountMap;
  aiMode: "watsonx" | "fallback" | "error";
  scores: Score[];
  recommendations: Recommendation[];
  nextEngagement: string;
  updatedAt: string;
};
type AuditEvent = { id: number; discoveryId: string; type: string; detail: string; createdAt: string };
type ApiData = { discoveries: Discovery[]; meetings: Meeting[]; stakeholders: Stakeholder[]; events: AuditEvent[] };

const navItems = [
  { id: "dashboard", label: "Início", icon: Dashboard },
  { id: "accounts", label: "Inteligência de contas", icon: Document },
  { id: "meetings", label: "Reuniões", icon: Notebook },
  { id: "accountMap", label: "Organograma", icon: DataVis_4 },
  { id: "heatmap", label: "Heatmap", icon: Analytics },
  { id: "recommendations", label: "Recomendações", icon: ArrowRight },
  { id: "knowledge", label: "Conhecimento", icon: DataBase },
  { id: "governance", label: "Governança", icon: Security },
] as const;

const questions = [
  { key: "trigger", eyebrow: "Evento gatilho", text: "O que abriu essa conversa agora e qual pressão de negócio existe por trás?", hint: "Inclua metas, incidentes, mudança regulatória, redução de custo, crescimento ou transformação." },
  { key: "stakeholders", eyebrow: "Mapa político", text: "Quem participa da decisão e quem sente a dor no dia a dia?", hint: "Liste sponsor, usuários impactados, time técnico, financeiro, risco, dados e operações." },
  { key: "landscape", eyebrow: "Ambiente atual", text: "Quais sistemas, clouds, dados ou aplicações críticas apareceram na conversa?", hint: "Ex.: AWS, Azure, mainframe, SAP, datacenter, lakehouse, integrações, aplicações legadas." },
  { key: "pain", eyebrow: "Dores e impacto", text: "Onde existe perda de dinheiro, risco, produtividade, confiança ou velocidade?", hint: "Tente conectar cada dor a impacto mensurável ou consequência executiva." },
  { key: "data-ai", eyebrow: "Dados e IA", text: "A conta tem iniciativas de IA, analytics ou dados confiáveis em andamento?", hint: "Inclua qualidade, catálogo, governança, modelos, LGPD, segurança e casos de uso." },
  { key: "readiness", eyebrow: "Prontidão", text: "Existe sponsor, orçamento, timeline e critério claro para avançar?", hint: "Descreva urgência, janela de decisão, maturidade do time e próximos fóruns." },
  { key: "crm-fit", eyebrow: "Antes do CRM", text: "O que ainda falta validar antes de criar uma oportunidade no CRM?", hint: "Liste lacunas, riscos, stakeholders ausentes e evidências que precisam ser confirmadas." },
];

const knowledgeItems = [
  { tag: "FinOps", title: "IBM Cloudability + Turbonomic", signals: "Custos cloud, forecast, desperdício, performance", questions: "Como custos são alocados por produto? Quem aprova otimização?", pitch: "Une transparência financeira e otimização contínua para reduzir desperdício sem degradar experiência.", workshop: "FinOps Discovery Workshop" },
  { tag: "Trusted Data", title: "watsonx.data + IBM Guardium", signals: "Silos, qualidade, linhagem, dados sensíveis, LGPD", questions: "Quais fontes são críticas? Quem confia nos dados? Onde há dados sensíveis?", pitch: "Cria fundação governada para analytics e IA com proteção de dados sensíveis.", workshop: "Trusted Data Workshop" },
  { tag: "AI Governance", title: "watsonx.governance + watsonx.ai", signals: "GenAI, modelos, risco, auditoria, compliance", questions: "Quais modelos entram em produção? Como riscos são aprovados?", pitch: "Ajuda a controlar ciclo de vida, evidências, políticas e riscos de IA empresarial.", workshop: "AI Readiness & Governance Workshop" },
  { tag: "Hybrid Cloud", title: "Red Hat OpenShift + HashiCorp Terraform", signals: "Multicloud, datacenter, legado, containers", questions: "Quais workloads precisam de portabilidade? Onde provisionamento trava?", pitch: "Padroniza plataforma, automação e governança para ambientes híbridos.", workshop: "Hybrid Cloud Architecture Review" },
  { tag: "Automation", title: "watsonx Orchestrate + IBM Concert", signals: "Processo manual, handoff, produtividade, operação", questions: "Quais tarefas repetem toda semana? Onde há decisões manuais?", pitch: "Transforma trabalho repetitivo em fluxos orquestrados e conectados a insights operacionais.", workshop: "Automation Discovery Workshop" },
  { tag: "Modernization", title: "OpenShift + Instana", signals: "Aplicações legadas, mainframe, DevOps, observabilidade", questions: "Quais aplicações seguram roadmap? Onde falta visibilidade?", pitch: "Prioriza modernização por valor, risco e esforço com observabilidade ponta a ponta.", workshop: "Application Modernization Assessment" },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const scoreClass = (value: number) => (value >= 75 ? "high" : value >= 50 ? "medium" : "low");

export default function Home() {
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<ApiData>({ discoveries: [], meetings: [], stakeholders: [], events: [] });
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answer, setAnswer] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [notice, setNotice] = useState("");
  const [selectedStakeholderId, setSelectedStakeholderId] = useState("");
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [stakeholderManagerId, setStakeholderManagerId] = useState<string | null>(null);
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [collapsedStakeholders, setCollapsedStakeholders] = useState<Set<string>>(new Set());

  const load = async () => {
    const response = await fetch("/api/discoveries", { cache: "no-store" });
    const payload = (await response.json()) as ApiData;
    setData({ discoveries: payload.discoveries || [], meetings: payload.meetings || [], stakeholders: payload.stakeholders || [], events: payload.events || [] });
    setSelectedId((current) => current || payload.discoveries?.[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => {
    let activeRequest = true;
    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/discoveries", { cache: "no-store" });
        const payload = (await response.json()) as ApiData;
        if (!activeRequest) return;
        setData({ discoveries: payload.discoveries || [], meetings: payload.meetings || [], stakeholders: payload.stakeholders || [], events: payload.events || [] });
        setSelectedId((current) => current || payload.discoveries?.[0]?.id || "");
      } finally {
        if (activeRequest) setLoading(false);
      }
    };
    void loadInitialData();
    return () => { activeRequest = false; };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const syncViewport = () => setIsDesktop(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const selected = data.discoveries.find((item) => item.id === selectedId) || data.discoveries[0];
  const selectedMeetings = selected?.meetings || [];
  const selectedStakeholders = useMemo(() => data.stakeholders.filter((item) => item.discoveryId === selected?.id), [data.stakeholders, selected?.id]);
  const selectedStakeholder = selectedStakeholders.find((item) => item.id === selectedStakeholderId) || selectedStakeholders[0];
  const latestMeeting = selectedMeetings[0];
  const currentQuestion = questions[Math.min(selected?.answers.length || 0, questions.length - 1)];
  const completed = selected ? selected.answers.length >= questions.length : false;

  const metrics = useMemo(() => {
    const total = data.discoveries.length;
    const hot = data.discoveries.filter((item) => item.priority === "Alta").length;
    const noNextStep = data.discoveries.filter((item) => !item.meetings?.length || item.progress < 45).length;
    const watsonx = data.meetings.filter((meeting) => meeting.aiStatus === "watsonx").length;
    const avg = total ? Math.round(data.discoveries.reduce((sum, item) => sum + item.progress, 0) / total) : 0;
    return { total, hot, noNextStep, watsonx, avg };
  }, [data.discoveries, data.meetings]);

  const filteredDiscoveries = data.discoveries.filter((item) =>
    `${item.customerName} ${item.industry} ${item.owner} ${item.stage}`.toLowerCase().includes(search.toLowerCase()),
  );

  const portfolioThemes = useMemo(() => {
    const counts = new Map<string, number>();
    data.discoveries.forEach((item) => item.scores.slice(0, 2).forEach((score) => counts.set(score.short, (counts.get(score.short) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [data.discoveries]);

  const stakeholderMatches = useMemo(() => {
    if (!selected) return [];
    return selectedStakeholders.map((person) => {
      const profile = `${person.role} ${person.area} ${person.priorities.join(" ")} ${person.notes}`.toLowerCase();
      const ranked = selected.scores.map((score) => {
        const theme = knowledgeItems.find((item) => item.tag.toLowerCase().includes(score.short.toLowerCase().split(" ")[0]) || score.short.toLowerCase().includes(item.tag.toLowerCase().split(" ")[0]));
        const vocabulary = `${score.name} ${score.short} ${theme?.signals || ""} ${theme?.title || ""}`.toLowerCase().split(/[^a-zà-ú0-9]+/).filter((word) => word.length > 4);
        const matches = vocabulary.filter((word) => profile.includes(word)).length;
        return { score, theme, relevance: score.alignment + matches * 14 };
      }).sort((a, b) => b.relevance - a.relevance)[0];
      return {
        person,
        capability: ranked?.score,
        question: ranked?.theme ? `${ranked.theme.questions.split("?")[0]}?` : "Qual prioridade executiva deve ser validada com esta pessoa?",
        relevance: ranked?.relevance || 0,
      };
    }).sort((a, b) => b.relevance - a.relevance);
  }, [selected, selectedStakeholders]);

  const activeStakeholderMatch = stakeholderMatches.find((item) => item.person.id === selectedStakeholder?.id);

  const setSection = (id: string) => {
    setActive(id);
    setShowMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3200);
  };

  const openStakeholderForm = (stakeholder?: Stakeholder, managerId?: string | null) => {
    setEditingStakeholder(stakeholder || null);
    setStakeholderManagerId(managerId ?? stakeholder?.reportsToId ?? null);
    setShowStakeholderForm(true);
  };

  const submitStakeholder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "stakeholder_upsert",
        id: selected.id,
        stakeholderId: editingStakeholder?.id,
        name: form.get("name"),
        role: form.get("role"),
        area: form.get("area"),
        reportsToId: form.get("reportsToId") || null,
        influence: form.get("influence"),
        stance: form.get("stance"),
        priorities: String(form.get("priorities") || "").split(","),
        notes: form.get("notes"),
      }),
    });
    const payload = await response.json() as { stakeholder?: Stakeholder; error?: string };
    if (!response.ok) {
      setSaving(false);
      notify(payload.error || "Não foi possível salvar o stakeholder.");
      return;
    }
    await load();
    setSelectedStakeholderId(payload.stakeholder?.id || "");
    setShowStakeholderForm(false);
    setSaving(false);
    notify(editingStakeholder ? "Stakeholder atualizado e insights recalculados." : "Stakeholder adicionado ao organograma.");
  };

  const deleteStakeholder = async () => {
    if (!selected || !selectedStakeholder || !window.confirm(`Remover ${selectedStakeholder.name} do organograma? Os reports ficarão sem gestor.`)) return;
    setSaving(true);
    await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stakeholder_delete", id: selected.id, stakeholderId: selectedStakeholder.id }),
    });
    setSelectedStakeholderId("");
    await load();
    setSaving(false);
    notify("Stakeholder removido. Os reports diretos foram preservados.");
  };

  const toggleStakeholder = (id: string) => setCollapsedStakeholders((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !answer.trim()) return;
    setSaving(true);
    await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", id: selected.id, key: currentQuestion.key, question: currentQuestion.text, answer }),
    });
    setAnswer("");
    await load();
    setSaving(false);
    notify("Sinal de discovery atualizado. O mapa e o heatmap foram recalculados.");
  };

  const submitMeeting = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !meetingNotes.trim()) return;
    setSaving(true);
    const response = await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "meeting", id: selected.id, title: meetingTitle || "Reunião de account intelligence", notes: meetingNotes }),
    });
    const payload = await response.json() as { meeting?: Meeting; error?: string };
    setMeetingNotes("");
    setMeetingTitle("");
    await load();
    setSaving(false);
    notify(payload.meeting?.aiStatus === "watsonx" ? "Reunião analisada com IBM watsonx." : "Reunião analisada com fallback determinístico.");
  };

  const createDiscovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", customerName: form.get("customerName"), industry: form.get("industry"), companySize: form.get("companySize") }),
    });
    const created = (await response.json()) as Discovery;
    await load();
    setSelectedId(created.id);
    setShowNew(false);
    setActive("meetings");
    setSaving(false);
  };

  const sendFeedback = async (accepted: boolean) => {
    if (!selected) return;
    await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "feedback", id: selected.id, accepted }),
    });
    await load();
    notify(accepted ? "Handoff pré-CRM validado." : "Recomendação registrada para revisão humana.");
  };

  const copySummary = async () => {
    if (!selected) return;
    const top = selected.scores[0];
    const text = `${selected.customerName}
Account intelligence antes do CRM
Contexto: ${selected.challengeSummary}
Prioridade: ${selected.priority}
Capacidade líder: ${top?.name} (${top?.alignment}%)
Última reunião: ${latestMeeting?.summary || "Sem reunião registrada"}
Próximo passo: ${selected.nextEngagement}`;
    await navigator.clipboard.writeText(text);
    notify("Handoff pré-CRM copiado para a área de transferência.");
  };

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand-mark">w</div>
        <p>Preparando Account Intelligence…</p>
      </main>
    );
  }

  return (
    <div className="app-shell account-intelligence">
      <Theme theme="g100">
        <CarbonHeader aria-label="watson Account Intelligence" className="carbon-header">
          <SkipToContent />
          <HeaderMenuButton
            aria-label={showMobileNav ? "Fechar navegação" : "Abrir navegação"}
            isActive={showMobileNav}
            isCollapsible
            onClick={() => setShowMobileNav((value) => !value)}
            renderMenuIcon={<Menu size={20} />}
            renderCloseIcon={<Close size={20} />}
          />
          <HeaderName href="#" prefix="watson" onClick={(event) => { event.preventDefault(); setSection("dashboard"); }}>
            {isDesktop ? "Account Intelligence" : "AI"}
          </HeaderName>
          <div className="carbon-header-status"><i /> Antes do CRM</div>
          <HeaderGlobalBar>
            <HeaderGlobalAction aria-label="Ajuda" tooltipAlignment="end"><Help size={20} /></HeaderGlobalAction>
            <HeaderGlobalAction aria-label="Perfil de Mariana Costa" tooltipAlignment="end"><UserAvatar size={20} /></HeaderGlobalAction>
          </HeaderGlobalBar>
        </CarbonHeader>

        <SideNav aria-label="Navegação principal" className="cdi-side-nav" expanded={isDesktop || showMobileNav} isPersistent={isDesktop} isFixedNav onOverlayClick={() => setShowMobileNav(false)}>
          <SideNavItems>
            <p className="nav-label">Account Intelligence</p>
            {navItems.map((item) => (
              <SideNavLink key={item.id} href="#" renderIcon={item.icon} isActive={active === item.id} onClick={(event) => { event.preventDefault(); setSection(item.id); }}>
                {item.label}
              </SideNavLink>
            ))}
          </SideNavItems>
          <div className="sidebar-foot">
            <span>CDI Engine v2</span>
            <div><i /> IA real + fallback</div>
            <small>Carbon Design System</small>
          </div>
        </SideNav>
      </Theme>

      <main className="main-content">
        {notice && <div className="toast" role="status">✓ {notice}</div>}

        {active === "dashboard" && (
          <section className="page ai-dashboard">
            <PageTitle
              eyebrow="Account intelligence antes do CRM"
              title="Início"
              description="Entenda clientes, reuniões, dores, temas IBM e próximos passos antes de criar uma oportunidade formal."
              action={<CarbonButton renderIcon={Add} onClick={() => setShowNew(true)}>Nova conta</CarbonButton>}
            />
            <div className="command-strip">
              <div><span>Conta em foco</span><strong>{selected?.customerName}</strong><small>{selected?.stage} · {selected?.priority} prioridade</small></div>
              <div><span>Próximo passo</span><strong>{selected?.nextEngagement}</strong><small>{selected?.aiMode === "watsonx" ? "Gerado com IBM watsonx" : "Fallback determinístico ativo"}</small></div>
              <button onClick={() => setSection("meetings")}>Registrar reunião →</button>
            </div>
            <div className="metrics-grid">
              <article><span>Contas mapeadas</span><strong>{metrics.total}</strong><small>Account intelligence ativa</small></article>
              <article><span>Alta prioridade</span><strong>{metrics.hot}</strong><small>Possível handoff em maturação</small></article>
              <article><span>Sem próximo passo claro</span><strong>{metrics.noNextStep}</strong><small>Requer reunião ou validação</small></article>
              <article><span>Análises watsonx</span><strong>{metrics.watsonx}</strong><small>Fallback cobre ausência de credenciais</small></article>
            </div>
            <div className="content-grid cockpit-grid">
              <section className="panel span-2">
                <div className="panel-heading"><div><span className="eyebrow">Carteira</span><h2>Contas que pedem atenção</h2></div><button className="text-button" onClick={() => setSection("accounts")}>Ver contas →</button></div>
                <div className="account-table">
                  <div className="account-table-head"><span>Conta</span><span>Tema líder</span><span>Próximo passo</span><span>Prontidão</span></div>
                  {filteredDiscoveries.slice(0, 5).map((item) => (
                    <button key={item.id} onClick={() => { setSelectedId(item.id); setSection("accounts"); }}>
                      <span><i className={`priority-dot ${item.priority.toLowerCase()}`} /><strong>{item.customerName}</strong><small>{item.industry}</small></span>
                      <span>{item.scores[0]?.short}</span>
                      <span>{item.nextEngagement}</span>
                      <span><b style={{ width: `${item.progress}%` }} /><em>{item.progress}%</em></span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="panel action-panel">
                <span className="eyebrow">Última reunião</span>
                <h2>{latestMeeting?.title || "Sem reunião registrada"}</h2>
                <p>{latestMeeting?.summary || "Registre notas livres para gerar temas, perguntas e próximos passos."}</p>
                <div className="mini-tags">{(latestMeeting?.insights.ibmThemes || selected?.scores.slice(0, 3).map((score) => score.short) || []).slice(0, 4).map((theme) => <Tag key={theme} type="blue">{theme}</Tag>)}</div>
                <button className="button secondary full" onClick={() => setSection("meetings")}>Abrir reuniões →</button>
              </section>
              <section className="panel span-2 carbon-chart-panel">
                <div className="panel-heading"><div><span className="eyebrow">Heatmap de carteira</span><h2>Capacidades mais recorrentes</h2></div><Tag type="cyan">Portfolio IBM</Tag></div>
                {selected && <CarbonCapabilityChart scores={selected.scores} />}
              </section>
              <section className="panel">
                <div className="panel-heading"><div><span className="eyebrow">Temas</span><h2>Sinais na carteira</h2></div></div>
                <div className="theme-stack">{portfolioThemes.map(([theme, count]) => <div key={theme}><span>{theme}</span><strong>{count}</strong></div>)}</div>
              </section>
            </div>
          </section>
        )}

        {active === "accounts" && selected && (
          <section className="page">
            <PageTitle
              eyebrow="Inteligência de conta"
              title={selected.customerName}
              description={`${selected.industry} · ${selected.companySize} · ${selected.stage}`}
              action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />}
            />
            <div className="account-360-grid">
              <section className="panel span-2 account-context-panel">
                <div className="panel-heading"><div><span className="eyebrow">Contexto conhecido</span><h2>{selected.challengeSummary}</h2></div><Tag type={selected.aiMode === "watsonx" ? "green" : "gray"}>{selected.aiMode === "watsonx" ? "watsonx" : "fallback"}</Tag></div>
                <div className="signal-columns">
                  <SignalList title="Stakeholders" items={latestMeeting?.insights.stakeholders || []} empty="Ainda não identificados" />
                  <SignalList title="Dores" items={latestMeeting?.insights.painPoints || []} empty="Registre uma reunião" />
                  <SignalList title="Sistemas" items={latestMeeting?.insights.systems || []} empty="Sem sistemas citados" />
                </div>
              </section>
              <section className="panel account-score-panel">
                <span className="eyebrow">Maturidade pré-CRM</span>
                <div className="signal-score"><strong>{selected.progress}</strong><span>%<small>pronto para handoff</small></span></div>
                <p>{selected.nextEngagement}</p>
                <button className="button secondary full" onClick={() => setSection("recommendations")}>Ver handoff →</button>
              </section>
              <section className="panel span-2">
                <div className="panel-heading"><div><span className="eyebrow">Discovery guiado</span><h2>{completed ? "Perguntas principais concluídas" : currentQuestion.text}</h2></div></div>
                {!completed && (
                  <form className="compact-form" onSubmit={submitAnswer}>
                    <p>{currentQuestion.hint}</p>
                    <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Registre a evidência validada sobre esta conta..." rows={5} />
                    <button className="button primary" disabled={saving || !answer.trim()}>{saving ? "Analisando..." : "Salvar sinal e recalcular →"}</button>
                  </form>
                )}
                <div className="answer-history compact-history">
                  {[...selected.answers].reverse().map((item) => <details key={item.key}><summary><span>{item.question}</span><small>{formatDate(item.at)}</small></summary><p>{item.answer}</p></details>)}
                  {!selected.answers.length && <div className="empty-state">Nenhuma evidência guiada registrada.</div>}
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading"><div><span className="eyebrow">Perguntas sugeridas</span><h2>Próxima reunião</h2></div></div>
                <ul className="action-list">{(latestMeeting?.insights.nextQuestions || questions.slice(0, 4).map((q) => q.text)).map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="panel span-3 stakeholder-guidance">
                <div className="panel-heading"><div><span className="eyebrow">Inteligência de stakeholders</span><h2>Quem acionar para cada tema</h2></div><button className="text-button" onClick={() => setSection("accountMap")}>Explorar organograma →</button></div>
                <div className="stakeholder-match-grid">
                  {stakeholderMatches.slice(0, 3).map(({ person, capability, question }) => (
                    <button key={person.id} onClick={() => { setSelectedStakeholderId(person.id); setSection("accountMap"); }}>
                      <span className={`stance-marker ${person.stance.toLowerCase()}`} />
                      <div><small>{person.role}</small><strong>{person.name}</strong><p>{capability ? `Conversa recomendada: ${capability.short}` : "Contexto em construção"}</p><em>{question}</em></div>
                      <b>{person.influence}</b>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {active === "meetings" && selected && (
          <section className="page meetings-page">
            <PageTitle
              eyebrow="Notas livres de reunião"
              title="Transforme conversa em inteligência"
              description={`${selected.customerName} · cole o contexto da reunião e gere temas, ações e mapa da conta.`}
              action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />}
            />
            <div className="meeting-grid">
              <section className="panel span-2 meeting-input-panel">
                <form onSubmit={submitMeeting}>
                  <label>Título da reunião<input value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} placeholder="Ex.: Reunião com CFO e arquitetura" /></label>
                  <label>Notas livres<textarea value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} placeholder="Cole aqui o que você sabe: contexto do cliente, pessoas na reunião, dores, sistemas citados, iniciativas, riscos, próximos passos..." rows={10} /></label>
                  <div><small>{selected.aiMode === "watsonx" ? "A próxima análise tentará usar IBM watsonx." : "Sem credenciais watsonx, o fallback determinístico mantém a demo funcional."}</small><button className="button primary" disabled={saving || !meetingNotes.trim()}>{saving ? "Analisando..." : "Analisar reunião →"}</button></div>
                </form>
              </section>
              <section className="panel">
                <span className="eyebrow">O que a IA extrai</span>
                <div className="extraction-list">
                  {["Resumo executivo", "Sinais de negócio", "Temas IBM", "Stakeholders", "Sistemas", "Dores", "Riscos", "Próximas perguntas"].map((item) => <div key={item}><i>✓</i>{item}</div>)}
                </div>
              </section>
              <section className="panel span-3">
                <div className="panel-heading"><div><span className="eyebrow">Histórico</span><h2>Reuniões analisadas</h2></div><Tag type="blue">{selectedMeetings.length} registros</Tag></div>
                <div className="meeting-list">
                  {selectedMeetings.map((meeting) => (
                    <article key={meeting.id}>
                      <div><strong>{meeting.title}</strong><small>{formatDate(meeting.createdAt)} · {meeting.aiStatus === "watsonx" ? "IBM watsonx" : meeting.aiStatus === "error" ? "Fallback após erro" : "Fallback determinístico"}</small></div>
                      <p>{meeting.summary}</p>
                      <div className="mini-tags">{meeting.insights.ibmThemes.map((theme) => <Tag key={theme} type="blue">{theme}</Tag>)}</div>
                    </article>
                  ))}
                  {!selectedMeetings.length && <div className="empty-state">Registre a primeira reunião para iniciar o mapa da conta.</div>}
                </div>
              </section>
            </div>
          </section>
        )}

        {active === "accountMap" && selected && (
          <section className="page organogram-page">
            <PageTitle
              eyebrow="Stakeholder intelligence"
              title={`Organograma: ${selected.customerName}`}
              description="Monte a árvore de decisão da conta, explore relações e conecte cada pessoa às dores e aos temas IBM mais relevantes."
              action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />}
            />
            <div className="organogram-stats">
              <div><span>Pessoas mapeadas</span><strong>{selectedStakeholders.length}</strong></div>
              <div><span>Alta influência</span><strong>{selectedStakeholders.filter((item) => item.influence === "Alta").length}</strong></div>
              <div><span>Aliados</span><strong>{selectedStakeholders.filter((item) => item.stance === "Aliado").length}</strong></div>
              <div><span>Lacunas</span><strong>{selectedStakeholders.filter((item) => item.name.includes("identificar") || item.stance === "Desconhecido").length}</strong></div>
            </div>
            <div className="organogram-shell">
              <section className="organogram-canvas">
                <header><div><span className="eyebrow">Árvore da conta</span><h2>Estrutura de decisão e influência</h2></div><CarbonButton size="sm" renderIcon={Add} onClick={() => openStakeholderForm()}>Adicionar pessoa</CarbonButton></header>
                <div className="organogram-scroll" aria-label="Organograma interativo">
                  <div className="org-tree-roots">
                    {selectedStakeholders.filter((person) => !person.reportsToId || !selectedStakeholders.some((candidate) => candidate.id === person.reportsToId)).map((person) => (
                      <StakeholderBranch
                        key={person.id}
                        person={person}
                        people={selectedStakeholders}
                        selectedId={selectedStakeholder?.id}
                        collapsed={collapsedStakeholders}
                        onSelect={setSelectedStakeholderId}
                        onToggle={toggleStakeholder}
                        onAddReport={(managerId) => openStakeholderForm(undefined, managerId)}
                      />
                    ))}
                    {!selectedStakeholders.length && <div className="empty-state">Adicione o primeiro stakeholder para começar a árvore.</div>}
                  </div>
                </div>
                <footer><span><i className="legend-dot aliado" /> Aliado</span><span><i className="legend-dot neutro" /> Neutro</span><span><i className="legend-dot resistente" /> Resistente</span><small>Clique em uma pessoa para explorar contexto e recomendações.</small></footer>
              </section>
              <aside className="stakeholder-inspector">
                {selectedStakeholder ? (
                  <>
                    <header><div className="person-avatar">{selectedStakeholder.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><span>{selectedStakeholder.role}</span><h2>{selectedStakeholder.name}</h2><p>{selectedStakeholder.area}</p></div></header>
                    <div className="stakeholder-badges"><Tag type={selectedStakeholder.influence === "Alta" ? "red" : "gray"}>Influência {selectedStakeholder.influence}</Tag><Tag type={selectedStakeholder.stance === "Aliado" ? "green" : selectedStakeholder.stance === "Resistente" ? "magenta" : "blue"}>{selectedStakeholder.stance}</Tag></div>
                    <section><span className="eyebrow">Prioridades conhecidas</span><div className="priority-chips">{selectedStakeholder.priorities.map((item) => <span key={item}>{item}</span>)}{!selectedStakeholder.priorities.length && <small>Adicione prioridades para melhorar os insights.</small>}</div></section>
                    <section><span className="eyebrow">Contexto da pessoa</span><p>{selectedStakeholder.notes || "Nenhuma anotação registrada."}</p></section>
                    <section className="crossed-insight"><span className="eyebrow">Insight cruzado</span><h3>{activeStakeholderMatch?.capability ? `Converse sobre ${activeStakeholderMatch.capability.short}` : "Contexto em construção"}</h3><p>{activeStakeholderMatch?.capability ? `${activeStakeholderMatch.capability.evidence[0] || selected.challengeSummary} Este tema tem ${activeStakeholderMatch.capability.alignment}% de aderência na conta.` : "Adicione prioridades e notas para conectar esta pessoa aos sinais da conta."}</p><strong>Pergunta sugerida</strong><blockquote>{activeStakeholderMatch?.question}</blockquote></section>
                    <div className="inspector-actions"><button className="button primary" onClick={() => openStakeholderForm(undefined, selectedStakeholder.id)}>+ Adicionar report</button><button className="button secondary" onClick={() => openStakeholderForm(selectedStakeholder)}>Editar perfil</button><button className="button danger-ghost" onClick={deleteStakeholder} disabled={saving}>Remover</button></div>
                  </>
                ) : <div className="empty-state">Selecione uma pessoa no organograma.</div>}
              </aside>
            </div>
          </section>
        )}

        {active === "heatmap" && selected && (
          <section className="page">
            <PageTitle
              eyebrow="Heatmap de account intelligence"
              title="Carteira e detalhe da conta"
              description="Use a visão de carteira para priorizar contas e a visão de detalhe para explicar por que avançar."
              action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />}
            />
            <div className="portfolio-heatmap">
              <div className="portfolio-heatmap-head"><span>Conta</span>{knowledgeItems.slice(0, 6).map((item) => <span key={item.tag}>{item.tag}</span>)}</div>
              {data.discoveries.map((item) => (
                <button key={item.id} onClick={() => { setSelectedId(item.id); }}>
                  <span>{item.customerName}</span>
                  {knowledgeItems.slice(0, 6).map((cap) => {
                    const score = item.scores.find((entry) => cap.tag.toLowerCase().includes(entry.short.toLowerCase().split(" ")[0]) || entry.short.toLowerCase().includes(cap.tag.toLowerCase().split(" ")[0])) || item.scores[5];
                    return <i key={cap.tag} className={scoreClass(score?.alignment || 0)} title={`${cap.tag}: ${score?.alignment || 0}`} style={{ opacity: Math.max(.35, (score?.alignment || 20) / 100) }} />;
                  })}
                </button>
              ))}
            </div>
            <div className="heatmap-summary"><div><span>Maior alinhamento</span><strong>{selected.scores[0]?.name}</strong></div><div><span>Prontidão média</span><strong>{Math.round(selected.scores.reduce((sum, score) => sum + score.readiness, 0) / selected.scores.length)}%</strong></div><div><span>Qualidade da evidência</span><strong>{selected.scores[0]?.confidence >= 75 ? "Alta" : "Em evolução"}</strong></div><p>O heatmap prioriza valor de negócio antes do CRM. Abra uma capacidade para ver evidências e ação recomendada.</p></div>
            <section className="panel carbon-chart-panel heatmap-carbon-chart">
              <div className="panel-heading"><div><span className="eyebrow">Carbon Charts</span><h2>Alinhamento, valor e prontidão</h2></div><Tag type="purple">0-100</Tag></div>
              <CarbonCapabilityChart scores={selected.scores} />
            </section>
            <CapabilityTable scores={selected.scores} />
          </section>
        )}

        {active === "recommendations" && selected && (
          <section className="page">
            <PageTitle eyebrow="Handoff pré-CRM" title="Recomendações e próximos passos" description={`${selected.customerName} · gere material só quando houver evidência suficiente.`} action={<button className="button secondary" onClick={copySummary}>Copiar handoff</button>} />
            <div className="insight-hero"><div><span className="eyebrow light">Síntese da conta</span><h2>{selected.challengeSummary}</h2><p>Maior potencial em <strong>{selected.scores[0]?.name}</strong>, com {selected.scores[0]?.alignment}% de alinhamento e {selected.scores[0]?.confidence}% de confiança.</p></div><div><span>Status pré-CRM</span><strong>{selected.priority}</strong><small>{selected.stage}</small></div></div>
            <div className="content-grid insight-grid">
              <section className="panel span-2"><div className="panel-heading"><div><span className="eyebrow">Recomendações</span><h2>Do contexto ao engajamento</h2></div></div><div className="recommendation-list">{selected.recommendations.map((rec, index) => <article key={`${rec.name}-${index}`}><span>{index + 1}</span><div><small>{rec.type}</small><h3>{rec.name}</h3><p>{rec.rationale}</p></div></article>)}</div></section>
              <section className="panel next-action"><span className="eyebrow">Melhor próxima ação</span><h2>{selected.nextEngagement}</h2><p>Use isso antes do CRM: valide com sponsor, confirme dor e prepare o próximo workshop.</p><div className="decision-actions"><button className="button primary full" onClick={() => sendFeedback(true)}>✓ Validar handoff</button><button className="button ghost full" onClick={() => sendFeedback(false)}>Solicitar revisão</button></div></section>
              <section className="panel span-3 crm-summary"><div><span className="eyebrow">CRM-ready quando validado</span><h2>Resumo estruturado</h2></div><dl><div><dt>Cliente</dt><dd>{selected.customerName}</dd></div><div><dt>Desafio</dt><dd>{selected.challengeSummary}</dd></div><div><dt>Capacidade líder</dt><dd>{selected.scores[0]?.name}</dd></div><div><dt>Confiança</dt><dd>{selected.scores[0]?.confidence}%</dd></div><div><dt>Próximo passo</dt><dd>{selected.nextEngagement}</dd></div></dl><button className="text-button" onClick={copySummary}>Copiar para Salesforce, Dynamics ou HubSpot →</button></section>
            </div>
          </section>
        )}

        {active === "knowledge" && (
          <section className="page">
            <PageTitle eyebrow="Conhecimento acionável" title="IBM capability playbook" description="Use sinais de cliente para escolher perguntas, narrativa e workshop." />
            <div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar capacidade, produto, sinal ou workshop" /></label><span>Antes do CRM</span></div>
            <div className="knowledge-grid actionable-knowledge">{knowledgeItems.filter((item) => `${item.title} ${item.tag} ${item.signals}`.toLowerCase().includes(search.toLowerCase())).map((item) => <article key={item.title}><span className="knowledge-tag">{item.tag}</span><h3>{item.title}</h3><p><b>Sinais:</b> {item.signals}</p><p><b>Perguntas:</b> {item.questions}</p><p><b>Pitch:</b> {item.pitch}</p><footer><span>Workshop</span><strong>{item.workshop}</strong></footer></article>)}</div>
          </section>
        )}

        {active === "governance" && (
          <section className="page">
            <PageTitle eyebrow="Governança e rollback" title="Confiança operacional" description="Rastreie origem das evidências, status de IA, validação humana e prontidão para rollback." />
            <div className="governance-grid">
              <section className="panel"><span className="eyebrow">Controles ativos</span><h2>IA responsável por design</h2><div className="control-list">{[["Human-in-the-loop", "Toda recomendação exige decisão humana"], ["Explicabilidade", "Evidências e confiança visíveis"], ["Fallback", "Sem watsonx, análise por regras permanece funcional"], ["Pré-CRM", "Oportunidade só nasce após validação"]].map(([title, desc]) => <div key={title}><i>✓</i><span><strong>{title}</strong><small>{desc}</small></span></div>)}</div></section>
              <section className="panel"><span className="eyebrow">Enterprise integration</span><h2>Pontos de conexão</h2><div className="integration-list">{[["IBM watsonx.ai", "Análise de notas e mapa da conta"], ["Salesforce / Dynamics / HubSpot", "Handoff qualificado"], ["IBM Verify", "SSO e RBAC"], ["OpenAI Sites + D1", "Persistência e deployment"]].map(([name, desc]) => <div key={name}><span><i /> <b>{name}</b><small>{desc}</small></span><em>{name.includes("watsonx") ? "Config env" : "Preparado"}</em></div>)}</div><p className="panel-note">Credenciais devem ser configuradas como variáveis de runtime no Sites.</p></section>
              <section className="panel span-2"><div className="panel-heading"><div><span className="eyebrow">Trilha de auditoria</span><h2>Decisões e sinais recentes</h2></div><span className="live-label"><i /> Ao vivo</span></div><div className="audit-list">{data.events.slice(0, 10).map((event) => <div key={event.id}><span>{event.type === "feedback" ? "✓" : event.type === "meeting" ? "◇" : "+"}</span><div><strong>{event.detail}</strong><small>{data.discoveries.find((item) => item.id === event.discoveryId)?.customerName || "Sistema"}</small></div><time>{formatDate(event.createdAt)}</time></div>)}</div></section>
            </div>
          </section>
        )}
      </main>

      {showNew && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowNew(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title"><button className="modal-close" onClick={() => setShowNew(false)} aria-label="Fechar">×</button><span className="eyebrow">Nova conta</span><h2 id="new-title">Comece pelo contexto da conta</h2><p>Crie um workspace de account intelligence antes do CRM. A primeira reunião vai gerar o mapa da conta.</p><form onSubmit={createDiscovery}><label>Empresa<input name="customerName" required placeholder="Ex.: Acme Brasil" /></label><label>Setor<select name="industry" required defaultValue=""><option value="" disabled>Selecione</option><option>Serviços financeiros</option><option>Varejo</option><option>Manufatura</option><option>Energia</option><option>Saúde</option><option>Tecnologia</option><option>Outro</option></select></label><label>Porte<select name="companySize" defaultValue="Enterprise"><option>Enterprise</option><option>Large</option><option>Mid-market</option></select></label><div><button type="button" className="button ghost" onClick={() => setShowNew(false)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Criando..." : "Criar conta →"}</button></div></form></div></div>}
      {showStakeholderForm && selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowStakeholderForm(false)}><div className="modal stakeholder-modal" role="dialog" aria-modal="true" aria-labelledby="stakeholder-title"><button className="modal-close" onClick={() => setShowStakeholderForm(false)} aria-label="Fechar">×</button><span className="eyebrow">Organograma · {selected.customerName}</span><h2 id="stakeholder-title">{editingStakeholder ? "Editar stakeholder" : stakeholderManagerId ? "Adicionar report direto" : "Adicionar stakeholder"}</h2><p>Registre o que você sabe. Prioridades e contexto serão cruzados com os sinais, reuniões e capacidades IBM da conta.</p><form key={`${editingStakeholder?.id || "new"}-${stakeholderManagerId || "root"}`} onSubmit={submitStakeholder}>
        <div className="form-row"><label>Nome<input name="name" required defaultValue={editingStakeholder?.name || ""} placeholder="Ex.: Ana Souza" /></label><label>Cargo<input name="role" required defaultValue={editingStakeholder?.role || ""} placeholder="Ex.: Chief Information Officer" /></label></div>
        <div className="form-row"><label>Área<input name="area" defaultValue={editingStakeholder?.area || ""} placeholder="Ex.: Tecnologia" /></label><label>Reporta para<select name="reportsToId" defaultValue={stakeholderManagerId || ""}><option value="">Sem gestor mapeado</option>{selectedStakeholders.filter((person) => person.id !== editingStakeholder?.id).map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}</select></label></div>
        <div className="form-row"><label>Influência<select name="influence" defaultValue={editingStakeholder?.influence || "Média"}><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label>Postura<select name="stance" defaultValue={editingStakeholder?.stance || "Desconhecido"}><option>Aliado</option><option>Neutro</option><option>Resistente</option><option>Desconhecido</option></select></label></div>
        <label>Prioridades <small>separe por vírgulas</small><input name="priorities" defaultValue={editingStakeholder?.priorities.join(", ") || ""} placeholder="FinOps, redução de custos, governança de dados" /></label>
        <label>Contexto e anotações<textarea name="notes" rows={4} defaultValue={editingStakeholder?.notes || ""} placeholder="O que essa pessoa valoriza? Quais dores, objeções, métricas e relações são importantes?" /></label>
        <div><button type="button" className="button ghost" onClick={() => setShowStakeholderForm(false)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Salvando..." : "Salvar e cruzar insights →"}</button></div>
      </form></div></div>}
    </div>
  );
}

function StakeholderBranch({ person, people, selectedId, collapsed, onSelect, onToggle, onAddReport }: {
  person: Stakeholder;
  people: Stakeholder[];
  selectedId?: string;
  collapsed: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAddReport: (id: string) => void;
}) {
  const reports = people.filter((candidate) => candidate.reportsToId === person.id);
  const isCollapsed = collapsed.has(person.id);
  return (
    <div className="org-branch">
      <div className={`org-person ${selectedId === person.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => onSelect(person.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(person.id); }}>
        <div className="org-person-top"><span className={`stance-marker ${person.stance.toLowerCase()}`} /><small>{person.area}</small><em>{person.influence}</em></div>
        <div className="org-identity"><span className="org-avatar">{person.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div><strong>{person.name}</strong><p>{person.role}</p></div></div>
        <div className="org-person-actions">{reports.length > 0 && <button aria-label={isCollapsed ? "Expandir reports" : "Recolher reports"} onClick={(event) => { event.stopPropagation(); onToggle(person.id); }}>{isCollapsed ? "+" : "−"} {reports.length}</button>}<button onClick={(event) => { event.stopPropagation(); onAddReport(person.id); }}>+ report</button></div>
      </div>
      {reports.length > 0 && !isCollapsed && <div className="org-children">{reports.map((report) => <StakeholderBranch key={report.id} person={report} people={people} selectedId={selectedId} collapsed={collapsed} onSelect={onSelect} onToggle={onToggle} onAddReport={onAddReport} />)}</div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div>{action}</div>}</header>;
}

function CustomerSwitcher({ discoveries, selectedId, onChange }: { discoveries: Discovery[]; selectedId: string; onChange: (id: string) => void }) {
  return (
    <label className="customer-switcher">
      <span>Conta em foco</span>
      <select value={selectedId} onChange={(event) => onChange(event.target.value)}>
        {discoveries.map((item) => <option key={item.id} value={item.id}>{item.customerName}</option>)}
      </select>
    </label>
  );
}

function SignalList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div><span>{title}</span>{items.length ? items.slice(0, 5).map((item) => <strong key={item}>{item}</strong>) : <small>{empty}</small>}</div>;
}

function CapabilityTable({ scores }: { scores: Score[] }) {
  return (
    <div className="heatmap-table">
      <div className="heatmap-row header"><span>Capacidade</span><span>Alinhamento</span><span>Valor</span><span>Prontidão</span><span>Confiança</span></div>
      {scores.map((score) => (
        <details key={score.name} className={`heatmap-row ${scoreClass(score.alignment)}`}>
          <summary><span><i /> <strong>{score.name}</strong><small>{score.level}</small></span><span><b style={{ width: `${score.alignment}%` }} /><em>{score.alignment}</em></span><span>{score.value}</span><span>{score.readiness}</span><span>{score.confidence}</span></summary>
          <div className="evidence-drawer"><span className="eyebrow">Por que este score?</span><ul>{score.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}<li>Ação recomendada: {score.action}</li></ul><small>Score relativo para priorização pré-CRM; decisão final continua humana.</small></div>
        </details>
      ))}
    </div>
  );
}
