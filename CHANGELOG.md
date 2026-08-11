# Changelog

## Kyndryl CDI V4.1 — solution-led discovery

Status: validated locally; awaiting approval for Kyndryl Sites version `7`
Branch: `codex/kyndryl-account-centric-v4`
Rollback: Kyndryl Sites version `6` / commit `94378b6532f1a9a7839f01e8702b6ea47fa17f53`
Target URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Changed

- Reordered Home around the portfolio heatmap first and replaced the oversized capability-card grid with a compact, searchable Carbon coverage explorer.
- Added a default account-by-solution heatmap with Solution Fit, evidence confidence, decision band, gate status, capability filtering, and explicit `Not assessed` cells.
- Expanded the deterministic catalog across IBM, Red Hat, HashiCorp, and strategic ecosystem solutions while keeping every recommendation tied to specific answer evidence.
- Tightened recommendation governance: no direct product evidence means no product score; `Recommend now` requires a valid gate, fit of at least 80, confidence of at least 70, and two independent supporting evidence items.
- Reframed every deep discovery prompt as an answerable binary validation and preserved its original open question as contextual evidence guidance.
- Made the context editor permanently visible in editable workspaces, added explicit read-only guidance to the public demo, and made failed mutations release the saving state reliably.
- Expanded final discovery results with all evaluated solutions, Solution Fit percentages, confidence, gates, decision bands, evidence trace, score composition, and next evidence to validate.

### Validation

- TypeScript, ESLint, all 89 automated tests, and the Vinext production build pass.
- No destructive migration was added; stale materialized solution reviews are reset to `Not assessed` and recalculated from current evidence.

## Kyndryl CDI V4 — account-centric capability intelligence

Status: published as Kyndryl Sites version `6` on 2026-08-10
Branch: `codex/kyndryl-account-centric-v4`
Rollback: Kyndryl Sites version `5` / commit `93f15da7601a74b9af37ce21adc4918a4704e238`
Production URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site
Deployment commit: `94378b6532f1a9a7839f01e8702b6ea47fa17f53`

### Changed

- Reduced the primary navigation to `Home`, `Accounts`, and `Settings` and removed the isolated Portfolio Radar destination.
- Rebuilt Home around the 14 capabilities in catalog `2026.4-capability-driven`, current-catalog account coverage, and an accounts-by-capabilities Technology Fit heatmap.
- Added single-click deep links from a capability or heatmap cell to the exact account discovery, without relying on asynchronous selected-account state.
- Reorganized every account into `Discovery`, `Relationships`, `Strategy`, and `Governance`.
- Embedded the multipillar discovery runner in the account workspace and kept it on the next question after every confirmed answer.
- Unified the organization and capability-responsibility maps in one React Flow canvas.
- Added confirmed stakeholder-to-capability roles for owner, decision maker, influencer, and technical contact.
- Added an Opportunity Cockpit with technology fit, confidence, impact, gates, stakeholder gaps, hypotheses, and the 30/60/90 Account Plan.
- Added an answer-impact ledger covering evidence, score deltas, gates, penalties, technologies, recommendations, sources, stakeholders, and revisions.
- Removed unreachable V2/V3 navigation surfaces from the client bundle while preserving their data and Git history for rollback.

### Data and validation

- Added only additive migration `0011_kyndryl_account_centric.sql` for stakeholder capability assignments and immutable answer impacts.
- Began materializing the existing CDI evidence, capability snapshot, conflict, and technology-review tables after confirmed answers.
- TypeScript, ESLint, Vinext production build, and all 70 automated tests pass.
- Kyndryl Sites version `6` is live; version `5` remains available for application rollback.

## Kyndryl Discovery Flow V3.2

Status: published as Kyndryl Sites version `5`
Branch: `codex/kyndryl-guided-experience-v2`
Deploy commit: `93f15da7601a74b9af37ce21adc4918a4704e238`
Rollback: Kyndryl Sites version `4` / commit `4438ba90a02543cdbbde63cb7044734d9cb93fa1`
Pilot URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Fixed

- Opens a discovery track on the first click with immediate progress feedback while the session is loaded.
- Keeps the user inside the active track after `Confirm and continue`, selecting the next returned question instead of reopening the capability hub.
- Returns to capability selection only after an explicit navigation action or when the session cannot be opened.

### Validation

- TypeScript, ESLint, Vinext production build, and all 52 automated tests pass.

## Kyndryl Capability Discovery V3.1

Status: published as Kyndryl Sites version `4`; preserved for rollback
Branch: `codex/kyndryl-guided-experience-v2`
Deploy commit: `4438ba90a02543cdbbde63cb7044734d9cb93fa1`
Rollback: tag `kyndryl-capability-driven-v3` / Kyndryl Sites version `3`
Pilot URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Fixed

- Kept the discovery workspace on the next question after `Confirm and continue`; changing the returned question no longer reopens the capability hub.
- Corrected capability-key typing and low-confidence rendering in the capability-driven assessment.

### Changed

- Replaced the isolated selected-account policy form with a clickable `Account policies` section.
- Added a portfolio-level Carbon table showing every account, assigned policy, external-processing status, confirmed domain, last update, and an explicit edit action.
- Added a focused per-account policy editor without changing the globally selected account.
- Added an `account_policy_updated` audit event containing the previous and approved policy state.

### Validation

- TypeScript, Vinext production build, and all 51 automated tests pass.

## Kyndryl Capability-Driven CDI V3

Status: published as Kyndryl Sites version `3`
Branch: `codex/kyndryl-guided-experience-v2`
Deploy commit: `14523c5f6ef9765fc26c07512db7d761dccbbbc9`
Rollback: tag `kyndryl-ux-v2` / Kyndryl Sites version `2`
Pilot URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Changed

- Replaced product-first question routing with a deterministic capability-driven chain: `question -> evidence -> capability dimension -> journey -> IBM technology profile -> Kyndryl practice`.
- Added catalog `2026.4-capability-driven` with 10 account-context questions, 14 capabilities, 70 core questions, and 70 deep questions in English and Portuguese.
- Added adaptive deep-question triggers for low confidence, conflicting evidence, high-impact gaps, and unknown evidence, capped at 10 questions per capability.
- Added five maturity dimensions: strategy, process, technology, data, and governance.
- Preserved the published Technology Fit formula and separated fit, maturity, and evidence confidence.
- Tightened decision bands: `Recommend now` requires fit of at least 80 and confidence of at least 70; high-fit/low-confidence results require additional discovery.
- Added explicit IBM Z and streaming eligibility gates, contradiction penalties, and question-specific YES/NO evidence mappings.
- Expanded results with Kyndryl-practice alignment and a full explainability path.
- Reframed the discovery hub around 14 capabilities, with account context visible before capability selection and overall progress independent of the current capability.
- Added additive migration `0010_capability_driven_discovery.sql` for capability snapshots, normalized evidence, conflicts, and human-reviewed technology decisions.
- Preserved all legacy Kyndryl UX V2 tables, answers, and code paths for non-destructive rollback.

### Validation

- TypeScript, ESLint, Vinext build, and all 49 automated tests pass.
- Golden rules cover catalog counts, N/A and unknown handling, IBM Z gates, score formula, deterministic output, traceability, and Kyndryl-practice mapping.

### Rollback

Republish Kyndryl Sites version `2` or return to tag `kyndryl-ux-v2`. Migration `0010` is additive, so the previous application ignores the new derived-artifact tables.

## Kyndryl UX V2 — guided multipillar experience

Status: published as Kyndryl Sites version `2`
Branch: `codex/kyndryl-guided-experience-v2`
Deploy commit: `102e4615d7f762e68c022a7e160c291ed3e7cd91`
Rollback: OpenAI Sites Kyndryl version `1` / branch `codex/kyndryl-discovery-flow`
Pilot URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Changed

- Reduced the main navigation to `Home`, `Portfolio`, and `Settings`; the account workspace is now reached from Portfolio with a persistent breadcrumb.
- Combined the account table and comparative heatmap under two Portfolio views, removing competition between Account Intelligence and Radar.
- Rebuilt Home around a single `Continue discovery` action, a compact Account Health heatmap, and operational lists.
- Introduced catalog `2026.3-kyndryl`: six essential questions and up to six deterministic contextual follow-ups per pillar.
- Added a multipillar hub with independent status, progress, evidence coverage, and confidence for all eight pillars.
- Corrected overall completion: one completed pillar now reports `1/8 · 13%`; 100% requires all pillars to be reviewed or marked not relevant.
- Added pause, resume, reopen, and not-relevant operations without losing previous answers.
- Added a results handoff to `Choose next pillar`, while keeping `Back to pillars` visible throughout the assessment.
- Moved optional evidence details into progressive disclosure and replaced ambiguous tiles with tables, lists, tags, and explicit Carbon actions.
- Added additive migration `0009_kyndryl_pillar_status.sql`; all historical sessions and append-only answers remain compatible.
- Tightened recommendation governance: `Recommend now` requires a satisfied gate and at least two independent supporting answers.

### Rollback

Republish Kyndryl Sites version `1` or return to branch `codex/kyndryl-discovery-flow`. Migration `0009` is additive, so the previous application safely ignores the multipillar status table.

## Kyndryl opportunity-discovery pilot

Status: published as Kyndryl Sites version `1`; preserved for rollback
Branch: `codex/kyndryl-discovery-flow`
Baseline: `origin/main` / `v5.3.1-open-authenticated-workspace`
Pilot URL: https://watson-cdi-kyndryl.matheus68747.chatgpt.site

### Added

- Account-first journey: `account -> Kyndryl pillar -> discovery questions -> capability heatmap and IBM recommendations`.
- Versioned bilingual catalog `2026.2-kyndryl` with 48 curated questions across eight battle-card pillars:
  - IBM Z Modernization & Hybrid Operations;
  - Infrastructure Modernization;
  - Application Modernization;
  - SAP Transformation;
  - Modern Operations;
  - Data Platform & AI;
  - Modern Workplace;
  - Zero Trust & Cyber Security.
- Explainable deterministic Technology Fit Score:
  - `45% Evidence Fit + 25% Capability Gap + 15% Business Impact + 10% Journey Fit + 5% Attach Priority - Penalties`.
- Separate propensity and evidence-confidence indicators, with `N/A` excluded and `Don't know` reducing confidence.
- Required technology gates, including the IBM Z gate, before gated products can be recommended.
- Traceability from each answer through evidence, capability maturity, recommendation rationale, product, workshop and next question.
- Responsive IBM Carbon discovery workspace with a four-step journey, maturity heatmap, product ranking, score composition and bilingual public example.
- Compatibility with existing guided-discovery sessions and account data; no database migration is required.

### Rollback

This pilot remains isolated from the original Watson CDI production site. Republish Kyndryl Sites version `1` to restore this experience; no destructive data rollback is required.

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
