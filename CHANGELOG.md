# Changelog

## v5-proactive-copilot-gemini

Status: published
Branch: `codex/proactive-intelligence-v5`
Deploy commit: `cac122711ccb9f438aeb2c276eef20fa5abfbefb`
OpenAI Sites version: `6`
Rollback tag: `v4-proactive-account-intelligence`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Vendor-neutral AI adapter with `watsonx -> Gemini -> deterministic fallback` precedence, Zod validation, one transient retry and circuit breaker.
- Temporary `gemini-3.1-flash-lite` generation plus `gemini-embedding-2` retrieval at 768 dimensions for authenticated test accounts only.
- Daily briefing, Next Best Action, next best conversation, highest-value discovery question, postponement and explicit human feedback.
- Hybrid retrieval over account memory, meetings, documents, stakeholders, relationships, hypotheses, actions and Account Plan, with citations and cache fingerprints.
- IBM Carbon account workspace with four modes, three-mode copilot and global `Cmd/Ctrl + K` command palette.
- React Flow hierarchy/influence canvas with saved layouts, relationship types, sponsor paths and stakeholder evidence panel.
- Carbon portfolio radar with potential/maturity bubbles, stakeholder coverage and hypothesis-confidence evolution.
- Grounded public research proposals with confirmed company name/domain and mandatory approval before account-memory ingestion.
- Additive D1 storage for embeddings, AI cache, briefings, snapshots, relationships, graph layouts, external signals, action feedback and expanded AI-run metrics.
- Quota controls, cache, public/confidential policy blocks and a safe status endpoint that never returns secrets.

### Security and activation

- The credential previously shared in chat is treated as compromised and is not stored in Git or Sites.
- Revoke that credential, create a new Gemini API-restricted key and save it only as the `GEMINI_API_KEY` Sites secret.
- Until a replacement secret is configured, production remains fully usable through the deterministic fallback engine.

### Rollback

Use tag `v4-proactive-account-intelligence`, rebuild and republish it through OpenAI Sites. Migration `0005` is additive; V4 safely ignores all V5 tables and optional fields.

## v4-proactive-account-intelligence

Status: published
Branch: `codex/account-intelligence-v4`
Deploy commit: `eec9f307967bf52b455ba2629a7578000df0ae5a`
OpenAI Sites version: `5`
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
