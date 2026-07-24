# Changelog

## v6-ibm-cloud-pilot

Status: implementation validated locally; Schematics plan, cost approval,
provisioning, staging validation, production tag and IBM deployment pending

Branch: `codex/ibm-cloud-portability-v6`
Rollback tag: `v5.3.1-open-authenticated-workspace`
Current production: OpenAI Sites V5.3.1 (unchanged)
Target region: `br-sao`

### Added

- Portable database boundary with PostgreSQL `pg-core` schema, forward-only
  checksum migrations, synthetic pilot seed, transactions, strict TLS and
  readiness probe.
- Next.js standalone Node.js 22 runtime and non-root multi-stage Docker image
  for Code Engine.
- IBM COS private document storage with MIME and size validation, SHA-256,
  tenant-scoped object keys, idempotent deletion and compensating cleanup.
- IBM App ID Cloud Directory open registration with verified email,
  Authorization Code Flow, state, nonce, PKCE, secure opaque sessions,
  renewal, logout revocation and CSRF protection.
- Immutable-subject ownership for private accounts, guided discovery,
  briefings and document access.
- Terraform for the resource group, Code Engine app/job, managed PostgreSQL,
  COS, App ID Lite, Container Registry, service identities, secrets, probes
  and scale-to-zero settings.
- Separate PostgreSQL migration administrator and restricted runtime role.
- Additive PostgreSQL performance and natural-key migration `0001`, including
  concurrency-safe actions, hypotheses and relationship upserts.
- Server-generated stakeholder and relationship IDs, same-account reporting-line
  validation, exact-origin CSRF enforcement and immutable-subject tenant checks.
- Pilot quotas for account creation, document count, document bytes and upload
  frequency, plus file-signature validation and bounded extracted content.
- GitHub Actions for pull-request validation and manually approved,
  migration-first, immutable-digest IBM deployments.
- Structured logs and `/api/health/live` plus `/api/health/ready`.

### Validated locally

- TypeScript, ESLint, 58 automated tests, Vinext/Sites build, Next standalone
  build, Docker image build and Terraform static validation passed.
- PostgreSQL migrations and synthetic seed were executed twice against
  PostgreSQL 17 to verify idempotence.
- The container completed demo reads, private account creation, deterministic
  recomputation, session renewal/logout, CSRF rejection and two-user isolation
  using the restricted runtime database role.
- COS and App ID provider-to-provider connectivity remain staging checks because
  no IBM Cloud resources have been provisioned.

### Provisioning gate

No IBM resource has been created by this release. Generate the plan in IBM
Cloud Schematics, review the paid PostgreSQL estimate, and obtain explicit
authorization before `terraform apply`. A registry-backed
`npm audit --omit=dev` review of production dependencies is also required
before staging.

### Rollback

The OpenAI Sites deployment remains untouched throughout the pilot. Before
cutover, abandon the IBM pilot without affecting production. After IBM
publication, select the previous Code Engine image digest and preserve
PostgreSQL/COS; migrations remain forward-only.

## v5.3.1-open-authenticated-workspace

Status: published
Branch: `codex/open-workspace-v5-3-1`
Deploy commit: `e707c57f71fa398d5fd9a1ea5a581b2bfe3956d6`
OpenAI Sites version: `10`
Rollback tag: `v5.3-commercial-proof`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Changed

- Removed the manual email pre-authorization requirement from the authenticated workspace.
- Any user with a verified Sign in with ChatGPT identity can enter `/workspace` and create a private account portfolio without administrator setup.
- Preserved strict server-side owner isolation for account reads, mutations, documents, guided discovery, analysis, and deletion.
- Kept unauthenticated private requests rejected and the synthetic public demonstration read-only.
- Removed current product messaging that suggested an email authorization list was required.
- No schema or data migration is required for this access-policy change.

### Rollback

Use tag `v5.3-commercial-proof`, rebuild and republish it through OpenAI Sites. V5.3.1 does not alter the schema or account ownership data, so rollback restores the previous access gate without a data migration.

## v5.3-commercial-proof

Status: published
Branch: `codex/commercial-proof-v5-3`
Deploy commit: `5e304386bae6c51c244dc0696f6f909f72978ac0`
OpenAI Sites version: `9`
Rollback tag: `v5.2-bilingual-account-health`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- End-to-end conversation-to-intelligence review with preserved original evidence and explicit before/after deltas for account progress, capability scores, account knowledge, stakeholders, hypotheses, and next actions.
- Visible logical-agent pipeline for source normalization, account memory, stakeholder intelligence, capability fit, opportunity hypotheses, next-best action, and governance.
- Honest engine disclosure: with no model API configured, every workflow stage is identified as deterministic rules and remains ready for IBM watsonx through the vendor-neutral adapter.
- Human approval or rejection of proposed change sets before derived intelligence becomes accepted account memory.
- Evidence navigation from analysis conclusions, recommendations, health matrices, and context relationships back to the supporting account activity.
- Interactive Customer Context Map connecting objectives, initiatives, stakeholders, systems, pains, risks, and IBM capabilities.
- Functional pre-CRM handoff with qualification gates, preview, copy, JSON export, audit status, and explicit human action to mark the handoff as completed.
- Observed impact metrics for discovery duration, coverage, open gaps, evidence, meetings, and qualified hypotheses. No time-saving percentage is inferred without a measured baseline and comparable sessions.
- Additive D1 migration `0008` for account change sets, commercial workflow runs, CRM handoffs, and account impact snapshots.

### Rollback

Use tag `v5.2-bilingual-account-health`, rebuild and republish it through OpenAI Sites. Migration `0008` is additive; V5.2 safely ignores commercial change sets, pipeline runs, handoffs, and impact metrics.

## v5.2-bilingual-account-health

Status: published
Branch: `codex/bilingual-account-health-v5-2`
Deploy commit: `8fc1b5c4db7a491f3f19c73c1ccf61b881504e02`
OpenAI Sites version: `8`
Rollback tag: `v5.1-guided-discovery`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Product identity standardized as **Watson CDI — Customer Discovery Intelligence**.
- Typed `en-US` and `pt-BR` localization with English as the unconditional first-visit default and a persisted `English / Português` Carbon selector.
- Localized navigation, account workspace, settings, guided discovery, relationship canvas, Carbon charts, API feedback, accessibility labels, dates, numbers, and deterministic fallback output.
- Preservation of user-authored content in its original language, with authorized on-demand translation references and provider-aware translation caching.
- Home `Account Health` heatmap for opportunity potential, pre-CRM maturity, relationship coverage, evidence confidence, and discovery coverage.
- Account `Capability Health` heatmap for alignment, business value, readiness, confidence, and discovery coverage by IBM pillar.
- Radar `Portfolio Fit` heatmap with search, combined filters, sorting, evidence details, and account/capability drill-down.
- A consistent numeric and semantic health scale across all three matrices: low `0–39`, medium `40–69`, and high `70–100`.
- Locale-aware AI requests, caches, audit metadata, briefing variants, stable API error codes, and `Content-Language` responses.
- Additive D1 migration `0007` for locale-specific briefings, authorized translation cache records, and AI-run locale auditing.

### Rollback

Use tag `v5.1-guided-discovery`, rebuild and republish it through OpenAI Sites. Migration `0007` is additive; V5.1 safely ignores localized briefing variants, translation cache records, and optional locale audit fields. Original customer content is never rewritten by V5.2.

## v5.1-guided-discovery

Status: published
Branch: `codex/guided-discovery-v5-1`
Deploy commit: `57746b592972464d969bc8902f77a391c3235031`
OpenAI Sites version: `7`
Rollback tag: `v5-proactive-copilot-gemini`
Production URL: https://watson-cdi-challenge.matheus68747.chatgpt.site

### Added

- Guided discovery inside `Inteligência de contas -> Estratégia`, without adding another primary navigation destination.
- Adaptive diagnosis and direct-by-pillar entry for FinOps, Trusted Data, AI Governance, Hybrid Cloud, Automation and App Modernization.
- Versioned `2026.1` catalog with six base questions and four curated questions per technology pillar.
- Structured answers plus free context, evidence nature, stakeholder, source, date and confidence.
- Draft, confirmed, unknown, pause, resume, revision and append-only history flows.
- Separate progress, evidence coverage, gaps, staleness and contradiction indicators.
- Transparent next-question ranking using `45% information gap + 30% hypothesis impact + 15% staleness + 10% stakeholder coverage`.
- Deterministic score, memory, hypothesis and action recalculation after confirmed answers.
- Provider-neutral AI checkpoint proposals, capped at three per session, cached for 24 hours and applied only after human approval.
- Additive D1 migration `0006` for sessions, materialized routes and append-only answer revisions.
- Read-only populated public demo with no Gemini calls and authenticated owner-scoped mutations.

### Rollback

Use tag `v5-proactive-copilot-gemini`, rebuild and republish it through OpenAI Sites. Migration `0006` is additive; V5 safely ignores all V5.1 guided-discovery tables.

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
