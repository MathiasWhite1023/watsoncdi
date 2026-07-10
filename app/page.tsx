"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Score = {
  name: string;
  short: string;
  alignment: number;
  value: number;
  readiness: number;
  confidence: number;
  level: "Alta" | "Média" | "Baixa";
  evidence: string[];
};

type Recommendation = {
  type: "Capacidade" | "Software" | "Consultoria";
  name: string;
  rationale: string;
};

type Answer = { key: string; question: string; answer: string; at: string };

type Discovery = {
  id: string;
  customerName: string;
  industry: string;
  companySize: string;
  owner: string;
  stage: string;
  progress: number;
  priority: "Alta" | "Média" | "Baixa";
  challengeSummary: string;
  answers: Answer[];
  scores: Score[];
  recommendations: Recommendation[];
  nextEngagement: string;
  updatedAt: string;
};

type AuditEvent = { id: number; discoveryId: string; type: string; detail: string; createdAt: string };

type ApiData = { discoveries: Discovery[]; events: AuditEvent[] };

const navItems = [
  { id: "dashboard", label: "Visão geral", icon: "⌂" },
  { id: "discoveries", label: "Descobertas", icon: "◎" },
  { id: "workspace", label: "Workspace", icon: "◫" },
  { id: "heatmap", label: "Heatmap", icon: "▦" },
  { id: "insights", label: "Inteligência", icon: "◇" },
  { id: "knowledge", label: "Conhecimento", icon: "≡" },
  { id: "governance", label: "Governança", icon: "✓" },
] as const;

const questions = [
  {
    key: "context",
    eyebrow: "Contexto do cliente",
    text: "Qual é o principal objetivo de negócio para os próximos 12 meses?",
    hint: "Considere crescimento, eficiência, risco, experiência do cliente ou transformação.",
  },
  {
    key: "landscape",
    eyebrow: "Cenário tecnológico",
    text: "Como está organizado o ambiente de tecnologia e nuvem hoje?",
    hint: "Inclua provedores, ambientes híbridos, aplicações críticas e principais restrições.",
  },
  {
    key: "finops",
    eyebrow: "FinOps e gestão financeira",
    text: "Quais desafios existem em custos, previsibilidade e governança dos investimentos de tecnologia?",
    hint: "Ex.: crescimento de cloud, rateio, orçamento, desperdício, forecast ou accountability.",
  },
  {
    key: "data",
    eyebrow: "Dados confiáveis",
    text: "O que impede a organização de descobrir, governar e consumir dados com confiança?",
    hint: "Ex.: qualidade, silos, linhagem, integração, acesso, catálogo ou prontidão para IA.",
  },
  {
    key: "security",
    eyebrow: "Segurança e conformidade",
    text: "Quais riscos de dados, identidade ou conformidade mais preocupam a liderança?",
    hint: "Inclua dados sensíveis, LGPD, segredos, auditoria e políticas de acesso.",
  },
  {
    key: "readiness",
    eyebrow: "Prontidão organizacional",
    text: "Existe patrocínio executivo, time responsável e urgência para iniciar uma iniciativa?",
    hint: "Descreva patrocinadores, prazo, capacidade de mudança e decisões já tomadas.",
  },
];

const knowledgeItems = [
  { tag: "FinOps", title: "IBM Cloudability", desc: "Visibilidade, alocação e otimização de custos em ambientes multicloud.", status: "Verificado" },
  { tag: "FinOps", title: "IBM Turbonomic", desc: "Otimização contínua de recursos e performance de aplicações.", status: "Verificado" },
  { tag: "TBM", title: "IBM Apptio", desc: "Planejamento e transparência financeira para investimentos de tecnologia.", status: "Verificado" },
  { tag: "Trusted data", title: "watsonx.data", desc: "Base governada e aberta de dados para analytics e IA empresarial.", status: "Verificado" },
  { tag: "Security", title: "IBM Guardium", desc: "Descoberta, monitoramento e proteção de dados sensíveis.", status: "Verificado" },
  { tag: "Security", title: "HashiCorp Vault", desc: "Gestão de segredos, identidades de máquina e credenciais.", status: "Verificado" },
  { tag: "Integration", title: "Confluent", desc: "Data streaming em tempo real para dados empresariais conectados.", status: "Verificado" },
  { tag: "Consulting", title: "Trusted Data Workshop", desc: "Engajamento consultivo para priorizar fundações de dados confiáveis.", status: "Playbook" },
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const scoreClass = (value: number) => (value >= 75 ? "high" : value >= 50 ? "medium" : "low");

export default function Home() {
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<ApiData>({ discoveries: [], events: [] });
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answer, setAnswer] = useState("");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/discoveries", { cache: "no-store" });
    const payload = (await response.json()) as ApiData;
    setData(payload);
    setSelectedId((current) => current || payload.discoveries[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const selected = data.discoveries.find((item) => item.id === selectedId) || data.discoveries[0];
  const currentQuestion = questions[Math.min(selected?.answers.length || 0, questions.length - 1)];
  const completed = selected ? selected.answers.length >= questions.length : false;

  const metrics = useMemo(() => {
    const total = data.discoveries.length;
    const ready = data.discoveries.filter((item) => item.progress >= 85).length;
    const high = data.discoveries.filter((item) => item.priority === "Alta").length;
    const avg = total ? Math.round(data.discoveries.reduce((sum, item) => sum + item.progress, 0) / total) : 0;
    return { total, ready, high, avg };
  }, [data.discoveries]);

  const filteredDiscoveries = data.discoveries.filter((item) =>
    `${item.customerName} ${item.industry} ${item.owner}`.toLowerCase().includes(search.toLowerCase()),
  );

  const setSection = (id: string) => {
    setActive(id);
    setShowMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    setNotice("Resposta analisada. O contexto e os scores foram atualizados.");
    setTimeout(() => setNotice(""), 3200);
  };

  const createDiscovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch("/api/discoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        customerName: form.get("customerName"),
        industry: form.get("industry"),
        companySize: form.get("companySize"),
      }),
    });
    const created = (await response.json()) as Discovery;
    await load();
    setSelectedId(created.id);
    setShowNew(false);
    setActive("workspace");
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
    setNotice(accepted ? "Recomendação validada por você." : "Feedback registrado para revisão humana.");
    setTimeout(() => setNotice(""), 3200);
  };

  const copySummary = async () => {
    if (!selected) return;
    const top = selected.scores[0];
    const text = `${selected.customerName}\nDesafio: ${selected.challengeSummary}\nPrioridade: ${selected.priority}\nCapacidade líder: ${top?.name} (${top?.alignment}% de alinhamento)\nPróximo engajamento: ${selected.nextEngagement}`;
    await navigator.clipboard.writeText(text);
    setNotice("Resumo CRM copiado para a área de transferência.");
    setTimeout(() => setNotice(""), 3200);
  };

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand-mark">w</div>
        <p>Preparando o Customer Discovery Intelligence…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setShowMobileNav(!showMobileNav)} aria-label="Abrir navegação">☰</button>
        <button className="product-brand" onClick={() => setSection("dashboard")}>
          <span className="brand-mark small">w</span>
          <span><strong>watson</strong><em>Customer Discovery Intelligence</em></span>
        </button>
        <div className="topbar-actions">
          <span className="environment"><i /> Ambiente seguro</span>
          <button className="icon-button" aria-label="Ajuda">?</button>
          <button className="profile-button" aria-label="Perfil de Mariana Costa"><span>MC</span><b>Mariana Costa</b></button>
        </div>
      </header>

      <aside className={`sidebar ${showMobileNav ? "open" : ""}`}>
        <nav aria-label="Navegação principal">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => (
            <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>CDI Engine</span>
          <div><i /> 7 agentes disponíveis</div>
          <small>v1.0 · MVP Challenge</small>
        </div>
      </aside>

      <main className="main-content">
        {notice && <div className="toast" role="status">✓ {notice}</div>}

        {active === "dashboard" && (
          <section className="page dashboard-page">
            <div className="hero-panel">
              <div>
                <span className="eyebrow light">Customer discovery intelligence</span>
                <h1>Entenda primeiro.<br />Recomende depois.</h1>
                <p>Transforme conversas com clientes em inteligência explicável, prioridades claras e próximos engajamentos de alto valor.</p>
                <div className="hero-actions">
                  <button className="button primary inverse" onClick={() => setShowNew(true)}>Iniciar nova descoberta <span>→</span></button>
                  <button className="button ghost inverse" onClick={() => setSection("discoveries")}>Ver pipeline</button>
                </div>
              </div>
              <div className="reasoning-visual" aria-label="Fluxo de raciocínio do CDI Engine">
                <div className="core-orbit"><span>CDI</span><small>Engine</small></div>
                <div className="orbit-item o1">Entender</div>
                <div className="orbit-item o2">Analisar</div>
                <div className="orbit-item o3">Alinhar</div>
                <div className="orbit-item o4">Priorizar</div>
                <div className="orbit-item o5">Recomendar</div>
              </div>
            </div>

            <div className="metrics-grid">
              <article><span>Descobertas ativas</span><strong>{metrics.total}</strong><small>+2 nesta semana</small></article>
              <article><span>Prontas para engajar</span><strong>{metrics.ready}</strong><small>Revisão humana concluída</small></article>
              <article><span>Alta prioridade</span><strong>{metrics.high}</strong><small>Alinhamento acima de 75%</small></article>
              <article><span>Progresso médio</span><strong>{metrics.avg}%</strong><small>das evidências coletadas</small></article>
            </div>

            <div className="content-grid dashboard-grid">
              <section className="panel span-2">
                <div className="panel-heading"><div><span className="eyebrow">Trabalho em andamento</span><h2>Descobertas recentes</h2></div><button className="text-button" onClick={() => setSection("discoveries")}>Ver todas →</button></div>
                <div className="discovery-list compact">
                  {data.discoveries.slice(0, 4).map((item) => (
                    <button key={item.id} onClick={() => { setSelectedId(item.id); setSection("workspace"); }}>
                      <span className={`priority-dot ${item.priority.toLowerCase()}`} />
                      <span className="customer-cell"><strong>{item.customerName}</strong><small>{item.industry} · Atualizado {formatDate(item.updatedAt)}</small></span>
                      <span className="stage-cell">{item.stage}</span>
                      <span className="progress-cell"><i><b style={{ width: `${item.progress}%` }} /></i><small>{item.progress}%</small></span>
                      <span className="row-arrow">→</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="panel action-panel">
                <span className="eyebrow">Próxima melhor ação</span>
                <h2>{selected?.customerName}</h2>
                <div className="signal-score"><strong>{selected?.scores[0]?.alignment || 0}</strong><span>%<small>alinhamento líder</small></span></div>
                <p>{selected?.nextEngagement}</p>
                <button className="button secondary full" onClick={() => setSection("insights")}>Revisar recomendação →</button>
              </section>
            </div>
          </section>
        )}

        {active === "discoveries" && (
          <section className="page">
            <PageTitle eyebrow="Pipeline de inteligência" title="Descobertas" description="Acompanhe o contexto, a qualidade das evidências e o próximo passo de cada cliente." action={<button className="button primary" onClick={() => setShowNew(true)}>＋ Nova descoberta</button>} />
            <div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, setor ou responsável" /></label><span>{filteredDiscoveries.length} registros</span></div>
            <div className="discovery-cards">
              {filteredDiscoveries.map((item) => (
                <article key={item.id} className="discovery-card">
                  <div className="card-top"><span className={`status-pill ${item.priority.toLowerCase()}`}>{item.priority} prioridade</span><button aria-label="Mais opções">•••</button></div>
                  <h3>{item.customerName}</h3><p>{item.industry} · {item.companySize}</p>
                  <div className="card-progress"><span><b>{item.stage}</b><em>{item.progress}%</em></span><i><b style={{ width: `${item.progress}%` }} /></i></div>
                  <div className="card-signal"><span>Capacidade líder</span><strong>{item.scores[0]?.short || "Em análise"} <em>{item.scores[0]?.alignment || 0}%</em></strong></div>
                  <footer><span><i className="avatar">MC</i>{item.owner}</span><button className="text-button" onClick={() => { setSelectedId(item.id); setSection("workspace"); }}>Continuar →</button></footer>
                </article>
              ))}
            </div>
          </section>
        )}

        {active === "workspace" && selected && (
          <section className="page workspace-page">
            <PageTitle eyebrow="Discovery workspace" title={selected.customerName} description={`${selected.industry} · ${selected.companySize}`} action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />} />
            <div className="workflow-steps">
              {["Contexto", "Desafios", "Capacidades", "Heatmap", "Inteligência", "Validação"].map((step, index) => <div key={step} className={index <= selected.answers.length ? "done" : ""}><i>{index < selected.answers.length ? "✓" : index + 1}</i><span>{step}</span></div>)}
            </div>
            <div className="workspace-grid">
              <section className="conversation-panel">
                <div className="agent-heading"><div className="agent-avatar">w</div><div><strong>Customer Discovery Agent</strong><span><i /> Orquestrado pelo CDI Engine</span></div><button className="icon-button" title="A conversa é registrada na trilha de auditoria">i</button></div>
                {!completed ? (
                  <div className="question-block">
                    <span className="eyebrow">{currentQuestion.eyebrow} · Questão {selected.answers.length + 1} de {questions.length}</span>
                    <h2>{currentQuestion.text}</h2><p>{currentQuestion.hint}</p>
                    <form onSubmit={submitAnswer}>
                      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Registre a resposta do cliente com suas próprias palavras…" rows={6} />
                      <div><small>O agente usará esta evidência para escolher a próxima pergunta.</small><button className="button primary" disabled={saving || !answer.trim()}>{saving ? "Analisando…" : "Analisar e continuar →"}</button></div>
                    </form>
                  </div>
                ) : (
                  <div className="completion-block"><span>✓</span><h2>Descoberta pronta para revisão</h2><p>As evidências foram consolidadas em um heatmap e em recomendações explicáveis. A decisão final continua com você.</p><button className="button primary" onClick={() => setSection("heatmap")}>Explorar heatmap →</button></div>
                )}
                <div className="answer-history">
                  <div className="section-title"><span>Histórico da descoberta</span><small>{selected.answers.length} evidências</small></div>
                  {[...selected.answers].reverse().map((item) => <details key={item.key}><summary><span>{item.question}</span><small>{formatDate(item.at)}</small></summary><p>{item.answer}</p></details>)}
                  {!selected.answers.length && <div className="empty-state">A primeira resposta iniciará o Customer Knowledge Graph deste cliente.</div>}
                </div>
              </section>
              <aside className="context-panel">
                <div className="context-head"><span className="eyebrow">Contexto compartilhado</span><h3>Sinais em tempo real</h3></div>
                <div className="confidence-ring" style={{ "--score": `${selected.scores[0]?.confidence || 30}%` } as React.CSSProperties}><strong>{selected.scores[0]?.confidence || 30}%</strong><span>confiança geral</span></div>
                <div className="live-scores">{selected.scores.slice(0, 3).map((score) => <div key={score.name}><span>{score.short}<i className={scoreClass(score.alignment)}>{score.level}</i></span><b>{score.alignment}%</b></div>)}</div>
                <div className="agent-stack"><span className="eyebrow">Agentes ativos</span>{["Discovery Agent", "FinOps Intelligence", "Trusted Data Agent", "Explainability Agent"].map((agent, index) => <div key={agent}><i>{index === 0 ? "●" : "○"}</i><span>{agent}</span><small>{index <= selected.answers.length / 2 ? "Analisando" : "Em espera"}</small></div>)}</div>
              </aside>
            </div>
          </section>
        )}

        {active === "heatmap" && selected && (
          <section className="page">
            <PageTitle eyebrow="Inteligência explicável" title="Customer Capability Heatmap" description={`${selected.customerName} · Atualizado ${formatDate(selected.updatedAt)}`} action={<CustomerSwitcher discoveries={data.discoveries} selectedId={selected.id} onChange={setSelectedId} />} />
            <div className="heatmap-summary"><div><span>Maior alinhamento</span><strong>{selected.scores[0]?.name}</strong></div><div><span>Prontidão média</span><strong>{Math.round(selected.scores.reduce((sum, score) => sum + score.readiness, 0) / selected.scores.length)}%</strong></div><div><span>Qualidade da evidência</span><strong>{selected.scores[0]?.confidence >= 75 ? "Alta" : "Em evolução"}</strong></div><p>O heatmap prioriza valor de negócio — não produtos. Selecione uma capacidade para entender as evidências.</p></div>
            <div className="heatmap-table">
              <div className="heatmap-row header"><span>Capacidade</span><span>Alinhamento</span><span>Valor</span><span>Prontidão</span><span>Confiança</span></div>
              {selected.scores.map((score) => (
                <details key={score.name} className={`heatmap-row ${scoreClass(score.alignment)}`}>
                  <summary><span><i /> <strong>{score.name}</strong><small>{score.level}</small></span><span><b style={{ width: `${score.alignment}%` }} /><em>{score.alignment}</em></span><span>{score.value}</span><span>{score.readiness}</span><span>{score.confidence}</span></summary>
                  <div className="evidence-drawer"><span className="eyebrow">Por que este score?</span><ul>{score.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul><small>O score indica priorização relativa e não representa precisão matemática.</small></div>
                </details>
              ))}
            </div>
            <div className="legend"><span><i className="high" />75–100 · Alto</span><span><i className="medium" />50–74 · Médio</span><span><i className="low" />0–49 · Baixo</span><small>Baseado em {selected.answers.length} evidências e validação humana pendente.</small></div>
          </section>
        )}

        {active === "insights" && selected && (
          <section className="page">
            <PageTitle eyebrow="Lead intelligence" title="Brief executivo" description={`${selected.customerName} · Inteligência pronta para validação`} action={<button className="button secondary" onClick={copySummary}>Copiar resumo CRM</button>} />
            <div className="insight-hero"><div><span className="eyebrow light">Síntese executiva</span><h2>{selected.challengeSummary}</h2><p>A análise indica maior potencial de valor em <strong>{selected.scores[0]?.name}</strong>, com {selected.scores[0]?.alignment}% de alinhamento e confiança de {selected.scores[0]?.confidence}%.</p></div><div><span>Prioridade recomendada</span><strong>{selected.priority}</strong><small>Decisão assistida por evidências</small></div></div>
            <div className="content-grid insight-grid">
              <section className="panel span-2"><div className="panel-heading"><div><span className="eyebrow">Recomendações</span><h2>Do desafio ao próximo engajamento</h2></div></div><div className="recommendation-list">{selected.recommendations.map((rec, index) => <article key={`${rec.name}-${index}`}><span>{index + 1}</span><div><small>{rec.type}</small><h3>{rec.name}</h3><p>{rec.rationale}</p></div></article>)}</div></section>
              <section className="panel next-action"><span className="eyebrow">Próxima melhor ação</span><h2>{selected.nextEngagement}</h2><p>Recomendado por alinhamento, prontidão e potencial de valor. Exige validação do Business Partner.</p><div className="decision-actions"><button className="button primary full" onClick={() => sendFeedback(true)}>✓ Validar recomendação</button><button className="button ghost full" onClick={() => sendFeedback(false)}>Solicitar revisão</button></div></section>
              <section className="panel span-3 crm-summary"><div><span className="eyebrow">CRM-ready lead summary</span><h2>Handoff estruturado</h2></div><dl><div><dt>Cliente</dt><dd>{selected.customerName}</dd></div><div><dt>Desafio</dt><dd>{selected.challengeSummary}</dd></div><div><dt>Capacidade líder</dt><dd>{selected.scores[0]?.name}</dd></div><div><dt>Confiança</dt><dd>{selected.scores[0]?.confidence}%</dd></div><div><dt>Próximo passo</dt><dd>{selected.nextEngagement}</dd></div></dl><button className="text-button" onClick={copySummary}>Copiar para Salesforce, Dynamics ou HubSpot →</button></section>
            </div>
          </section>
        )}

        {active === "knowledge" && (
          <section className="page">
            <PageTitle eyebrow="Knowledge & RAG" title="Conhecimento empresarial" description="Catálogo governado que fundamenta recomendações de capacidade, software e consultoria." />
            <div className="knowledge-banner"><div><span>Base de conhecimento</span><strong>8 fontes verificadas</strong><small>Última revisão: hoje, 08:20</small></div><div><span>Domínios ativos</span><strong>2 primários + 4 exploratórios</strong><small>Arquitetura modular</small></div><div><span>Grounding</span><strong>100% rastreável</strong><small>Evidência ligada ao raciocínio</small></div></div>
            <div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar capacidade, produto ou playbook" /></label><span>IBM Capability Repository</span></div>
            <div className="knowledge-grid">{knowledgeItems.filter((item) => `${item.title} ${item.tag}`.toLowerCase().includes(search.toLowerCase())).map((item) => <article key={item.title}><span className="knowledge-tag">{item.tag}</span><h3>{item.title}</h3><p>{item.desc}</p><footer><span>✓ {item.status}</span><button aria-label={`Ver detalhes de ${item.title}`}>→</button></footer></article>)}</div>
          </section>
        )}

        {active === "governance" && (
          <section className="page">
            <PageTitle eyebrow="Trust & governance" title="Governança e integrações" description="Supervisão humana, rastreabilidade e pontos de conexão preparados para o ecossistema empresarial." />
            <div className="governance-grid">
              <section className="panel"><span className="eyebrow">Controles ativos</span><h2>IA responsável por design</h2><div className="control-list">{[["Human-in-the-loop", "Toda recomendação exige decisão humana"], ["Explicabilidade", "Evidências e confiança visíveis"], ["Audit logging", "Ações registradas com data e contexto"], ["Data minimization", "Somente contexto necessário à descoberta"]].map(([title, desc]) => <div key={title}><i>✓</i><span><strong>{title}</strong><small>{desc}</small></span></div>)}</div></section>
              <section className="panel"><span className="eyebrow">Enterprise integration</span><h2>Pontos de conexão</h2><div className="integration-list">{[["watsonx Orchestrate", "Orquestração multiagente"], ["watsonx.ai / Granite", "Raciocínio empresarial"], ["Salesforce / Dynamics / HubSpot", "Handoff de lead"], ["IBM Verify", "SSO e RBAC"]].map(([name, desc]) => <div key={name}><span><i /> <b>{name}</b><small>{desc}</small></span><em>Preparado</em></div>)}</div><p className="panel-note">As conexões dependem de credenciais e políticas do ambiente corporativo.</p></section>
              <section className="panel span-2"><div className="panel-heading"><div><span className="eyebrow">Trilha de auditoria</span><h2>Decisões e sinais recentes</h2></div><span className="live-label"><i /> Ao vivo</span></div><div className="audit-list">{data.events.slice(0, 8).map((event) => <div key={event.id}><span>{event.type === "feedback" ? "✓" : event.type === "answer" ? "◇" : "+"}</span><div><strong>{event.detail}</strong><small>{data.discoveries.find((item) => item.id === event.discoveryId)?.customerName || "Sistema"}</small></div><time>{formatDate(event.createdAt)}</time></div>)}</div></section>
            </div>
          </section>
        )}
      </main>

      {showNew && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setShowNew(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title"><button className="modal-close" onClick={() => setShowNew(false)} aria-label="Fechar">×</button><span className="eyebrow">Nova descoberta</span><h2 id="new-title">Comece pelo contexto do cliente</h2><p>Crie um workspace persistente para registrar evidências e construir a inteligência progressivamente.</p><form onSubmit={createDiscovery}><label>Empresa<input name="customerName" required placeholder="Ex.: Acme Brasil" /></label><label>Setor<select name="industry" required defaultValue=""><option value="" disabled>Selecione</option><option>Serviços financeiros</option><option>Varejo</option><option>Manufatura</option><option>Energia</option><option>Saúde</option><option>Tecnologia</option><option>Outro</option></select></label><label>Porte<select name="companySize" defaultValue="Enterprise"><option>Enterprise</option><option>Large</option><option>Mid-market</option></select></label><div><button type="button" className="button ghost" onClick={() => setShowNew(false)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Criando…" : "Criar workspace →"}</button></div></form></div></div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div>{action}</div>}</header>;
}

function CustomerSwitcher({ discoveries, selectedId, onChange }: { discoveries: Discovery[]; selectedId: string; onChange: (id: string) => void }) {
  return <label className="customer-switcher"><span>Cliente</span><select value={selectedId} onChange={(e) => onChange(e.target.value)}>{discoveries.map((item) => <option value={item.id} key={item.id}>{item.customerName}</option>)}</select></label>;
}
