# Changelog

## v4-proactive-account-intelligence

Status: implementation validated; production deployment pending
Branch: `codex/account-intelligence-v4`
Deploy commit: pending
OpenAI Sites version: pending
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Four-destination IBM Carbon shell: `Início`, `Inteligência de contas`, `Radar da carteira` and `Configurações`.
- Role-oriented daily briefing and proactive action queue with human-controlled states.
- Unified account memory with known facts, assumptions, gaps, stale information and normalized sources.
- Grounded account copilot with citations and no direct data mutation.
- Meeting scheduling, preparation and post-meeting extraction.
- Opportunity hypotheses, qualification gates and editable 30/60/90 Account Plan.
- Private `/workspace` with Sign in with ChatGPT, email allowlist and server-side account ownership checks.
- PDF, DOCX, TXT and Markdown ingestion with R2 originals and D1 chunks.
- Additive D1 tables for events, entities, memory, actions, hypotheses, plans, documents, chat and AI runs.

### Rollback

Use tag `v3-stakeholder-intelligence` to rebuild and republish the previous application. V4 migrations are additive only; V3 safely ignores all new tables and optional columns.

## v3-stakeholder-intelligence

Status: published
Branch: `codex/stakeholder-intelligence-v3`
Deploy commit: `a8b94f44b2f86cd966179815c38edffd90da78ba`
OpenAI Sites version: `4`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Simplified navigation with `Início`, `Inteligência de contas`, and `Organograma`.
- Dynamic stakeholder tree for every account with expandable reporting lines.
- Create, edit, annotate, reparent, and remove stakeholder records.
- Persistent stakeholder profiles with role, area, influence, stance, priorities, notes, and source.
- Context panel that crosses each stakeholder with account evidence and IBM capability scores.
- Suggested person, conversation theme, and next question inside Account Intelligence.
- Additive `stakeholders` D1 migration and audit events.

### Rollback

Use tag `v2-account-intelligence` to rebuild and republish the current production version. The V2 application safely ignores the additive `stakeholders` table.

## v2-account-intelligence

Status: published  
Branch: `feature/account-intelligence-v2`  
Deploy commit: `1ef8a30ed55c5193a70aedf47df02a13b545cb91`  
OpenAI Sites version: `3`  
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Account Intelligence positioning before CRM.
- Client 360 cockpit for accounts, meetings, signals, risks, next actions, and IBM themes.
- Free-form meeting notes with IBM watsonx.ai adapter and deterministic fallback.
- Persistent `meetings` and `account_maps` D1 tables.
- Account map visualization with stakeholders, systems, pains, risks, and IBM capabilities.
- Portfolio heatmap plus account-level heatmap.
- Actionable IBM capability playbook.
- Governance view with AI/fallback status and human validation.

### Rollback

Use tag `v1-current-production` to rebuild and republish the previous production version.

V2 migrations are additive only. The previous version can ignore `meetings` and `account_maps`.

## v1-current-production

Status: production baseline before Account Intelligence v2  
Tag: `v1-current-production`

### Included

- Customer Discovery Intelligence MVP.
- IBM Carbon-inspired UI and Carbon Charts.
- Persistent discoveries and audit events.
- Deterministic scoring and recommendations.
