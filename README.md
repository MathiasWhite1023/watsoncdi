# Watson CDI — Customer Discovery Intelligence

Watson CDI is a bilingual Account Intelligence platform for the work that happens before CRM. It helps teams understand customer context, preserve grounded account memory, map relationships, identify IBM portfolio themes, and proactively qualify next steps before creating a formal opportunity.

English (US) is the default interface language. Users can switch the entire product to Brazilian Portuguese from the global header, and the preference persists between sessions. Human-authored notes, documents, answers, evidence, company names, people, and product names always remain in their original language.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

This is a portfolio/challenge project. It is not an official IBM product.

## Kyndryl CDI V4 Pilot

The dedicated branch `codex/kyndryl-account-centric-v4` organizes the Kyndryl experience around capabilities and accounts. After publication approval it will replace only the separate Kyndryl pilot at https://watson-cdi-kyndryl.matheus68747.chatgpt.site; the original Watson CDI deployment remains unchanged.

```text
Home capability or portfolio heatmap
  -> select an account
  -> open one capability
  -> answer account-specific discovery questions
  -> review evidence, score, gates and penalties
  -> receive explainable IBM technology recommendations
  -> choose the next capability
```

The bilingual `2026.4-capability-driven` catalog contains 14 capabilities, 70 core questions and 70 deterministic deep questions. Home reports the current-catalog review percentage for each capability across all accounts and displays Technology Fit, confidence, and discovery state in one portfolio heatmap.

Each account has four focused modes: `Discovery`, `Relationships`, `Strategy`, and `Governance`. Capability progress remains separate from portfolio coverage and recommendation confidence. Completing one capability never marks the account discovery as complete.

The opportunity engine is deterministic and auditable. It applies the battle-card formula:

```text
Technology Fit Score =
  45% Evidence Fit
  + 25% Capability Gap
  + 15% Business Impact
  + 10% Journey Fit
  + 5% Attach Priority
  - Penalties
```

Propensity and confidence are deliberately separate. `Yes` and `No` become evidence according to the question rule; `N/A` is removed from the score and confidence denominators; `Don't know` adds no evidence and reduces confidence. Required gates are evaluated before gated technologies are recommended. Every recommendation retains the chain `answer -> evidence -> capability gap -> technology`, as well as the recommended workshop and next question.

Relationships combines the organization chart and capability responsibility map in one canvas. Strategy provides a technology Opportunity Cockpit. Governance explains the deterministic chain from every answer to evidence, maturity, fit, gates, penalties, technologies, and recommendations. Migration `0011` is additive; existing sessions, append-only answers, maps, and account records remain compatible.

## What It Does

- Provides a role-oriented Home with a daily briefing, prioritized action queue, meetings and accounts that need attention.
- Shows three complementary, interactive health views instead of repeating the same heatmap:
  - Home `Account Health`: accounts by opportunity potential, pre-CRM maturity, relationship coverage, evidence confidence, and discovery coverage.
  - Account `Capability Health`: IBM pillars by alignment, business value, readiness, confidence, and discovery coverage.
  - Radar `Portfolio Fit`: accounts by IBM capability, with search, combined filters, sorting, evidence details, and account drill-down.
- Uses a typed `en-US` / `pt-BR` localization layer for navigation, forms, Carbon charts, guided discovery, relationship maps, API messages, deterministic intelligence, dates, and numbers.
- Tracks a portfolio of client accounts before they become CRM opportunities.
- Captures free-form meeting notes and turns them into account intelligence.
- Shows a before/after review after every analyzed conversation, including score deltas, new account knowledge, affected hypotheses and recalculated next actions.
- Generates summaries, business signals, IBM themes, next questions, next actions, risks, stakeholders, systems, and pain points.
- Provides a persistent, editable stakeholder organogram for every account, with reporting lines, influence, stance, priorities, notes, and a relationship plan.
- Crosses stakeholder profiles with meeting evidence, pains, and IBM capability scores to suggest who to approach, what to discuss, and which question to ask.
- Provides an interactive Customer Context Map that connects objectives, initiatives, stakeholders, systems, pains, risks, and IBM capabilities, with filters and evidence drill-down.
- Shows a portfolio heatmap and account-level capability heatmap.
- Produces a governed pre-CRM handoff that can be reviewed, copied, exported as JSON and explicitly marked as handed off by a person.
- Maintains `Sabemos`, `Supomos`, `Falta descobrir` and `Desatualizado` account memory with clickable evidence.
- Offers a grounded `Pergunte sobre esta conta` copilot, opportunity hypotheses and human-editable 30/60/90 Account Plan.
- Accepts PDF, DOCX, TXT and Markdown sources in the private workspace, storing originals in R2 and chunks in D1.
- Keeps audit history, human validation, and clear processing-engine status.
- Keeps `/` as a synthetic read-only demo and opens `/workspace` to any user authenticated with ChatGPT, while server-side ownership checks keep every user's private accounts isolated.
- Produces a proactive daily briefing, Next Best Actions, the next best conversation and the discovery question with the highest information value.
- Uses account-scoped keyword and recency retrieval with citations today; semantic retrieval remains behind the provider adapter for later activation.
- Provides a Carbon command palette (`Cmd/Ctrl + K`) and an interactive hierarchy/influence graph powered by React Flow.
- Adds a dynamic guided-discovery workspace inside each account's Strategy mode, with adaptive and direct-by-pillar routes.
- Keeps discovery progress separate from evidence coverage, and records gaps, stale answers, contradictions and append-only revisions.
- Recalculates account intelligence deterministically after each confirmed answer and keeps future model-assisted checkpoints behind a vendor-neutral adapter.
- Makes the logical analysis pipeline visible: source normalization, account memory, stakeholder intelligence, capability fit, opportunity hypotheses, next-best action, and governance. These are workflow roles, not independent models.
- Links conclusions and recommendations back to their recorded evidence and measures only observed discovery coverage, gaps, evidence, meetings, qualification time, and qualified hypotheses.

## Commercial Proof V5.3

V5.3 closes the loop between information capture and a commercially useful decision. When a meeting or another source is recorded, Watson CDI preserves the original evidence, recalculates the account with transparent deterministic rules, and opens a review of what changed. Proposed changes remain pending until a person approves or rejects them.

The visible workflow is:

```text
recorded conversation
  -> original evidence
  -> normalized account event
  -> account-memory update
  -> stakeholder and capability assessment
  -> opportunity-hypothesis review
  -> next-best-action proposal
  -> human approval
  -> optional pre-CRM handoff
```

The analysis panel calls these stages logical agents because each stage has a bounded role, sources, conclusion, confidence, and validation status. With no model credential configured, every stage is explicitly identified as `Deterministic rules`; the interface never implies that a generative model ran. The same workflow boundary is ready for IBM watsonx without changing the product experience.

Evidence is navigable from the change review, pipeline, health views, recommendations, and Customer Context Map. Selecting a source moves the user to the account activity that supports the conclusion.

Impact reporting is deliberately conservative. Watson CDI reports observed values from product records and never infers a time-saving percentage. A reduction claim, including any `65–70%` claim, requires a recorded manual baseline and comparable assisted sessions with a stated sample size.

## Open Authenticated Workspace V5.3.1

The private workspace no longer requires an administrator to pre-authorize an email address. Any person who signs in with ChatGPT can enter `/workspace` and create a personal portfolio immediately. Authentication is still mandatory: requests without a verified ChatGPT identity are rejected by the server.

Opening registration does not make customer data public or shared. Each private account is assigned to the authenticated email that created it, and every private read, update, document operation, analysis, and deletion remains filtered by that owner identity. A different authenticated user cannot retrieve or mutate another user's accounts by changing an account ID. The public demonstration at `/` remains synthetic and read-only.

## Bilingual Account Health V5.2

The first visit starts in English, independently of the browser language. The `English / Português` selector writes the `watson-cdi-locale` preference and updates the application language, document language, localized request headers, and AI response locale. IDs, enums, scores, source references, and original customer content do not change when the language changes.

All health matrices use a consistent scale and always expose both the score and its semantic band:

- `0–39`: low;
- `40–69`: medium;
- `70–100`: high.

Cells are keyboard-accessible and open an evidence panel or the exact account context that explains the score. The public demo uses curated bilingual content and does not consume generative-AI quota when the user changes language.

## Opportunity Discovery

On the Kyndryl branch, start from a capability card or heatmap cell on Home, or open `Accounts -> account -> Discovery`. Select a capability, answer its account-specific questions, and review the resulting capability heatmap and IBM technology ranking without leaving the account workspace.

Two modes are available in both languages:

- The primary Kyndryl experience is `Direct by pillar / Direto por pilar`, keeping the user focused on one commercial conversation at a time.
- Existing adaptive sessions remain readable for backward compatibility and are scored by the same explainable engine.

Each answer can include `Yes`, `No`, `N/A` or `Don't know`, free context, evidence nature, related stakeholder, source, date and confidence. Drafts do not change intelligence. Confirmed answers update the deterministic account model immediately. Model-assisted follow-ups remain optional proposals and never define the scores.

## Intelligence Engine

The current release is fully usable without a model API. Deterministic rules persist sources, calculate scores, update memory, identify gaps, propose hypotheses and next actions, and expose every stage for human review.

IBM watsonx is the target model-assisted provider and, when enabled later, will use server-side secrets only:

- `WATSONX_API_KEY`
- `WATSONX_PROJECT_ID`
- `WATSONX_URL`
- `WATSONX_MODEL_ID`

Until those four values are configured, the application identifies the active engine as deterministic rules. The public demo does not call an external model. Account authorization, data classification, source citations, output validation, human approval and audit logging remain mandatory regardless of the active engine.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Cloudflare Workers / vinext
- Cloudflare D1-style persistence
- Drizzle migrations
- IBM Carbon React
- Carbon Charts React
- React Flow (`@xyflow/react`)
- Zod structured-output validation
- Sass
- OpenAI Sites hosting

## Architecture

```text
Meeting notes / unified information / documents
  -> /api/accounts
  -> guided discovery catalog, route and append-only evidence
  -> selective account-scoped retrieval
  -> deterministic workflow today; IBM watsonx through the provider adapter when configured
  -> D1 memory, change sets, logical-agent runs, handoffs, impact metrics, relationships, actions, plans and audit
  -> R2 original documents
  -> Home, account workspace, context map, portfolio radar and settings
```

The main product UI lives in `app/page.tsx`. Typed translations and locale resolution live in `lib/i18n.ts`, with the client provider and Carbon language selector in `app/I18nProvider.tsx`. Health formulas live in `lib/account-health.ts`; the three semantic heatmap surfaces live in `app/HealthHeatmaps.tsx`. The conversation review, visible analysis pipeline, governed CRM handoff and observed metrics live in `app/CommercialProofPanels.tsx`; the relationship-oriented context view lives in `app/CustomerContextMap.tsx`. Commercial state comparisons and handoff/impact contracts live in `lib/commercial-proof.ts`.

The guided workspace lives in `app/GuidedDiscoveryWorkspace.tsx`; the Kyndryl catalog, gates and scoring engine live in `lib/kyndryl-discovery.ts`; and the backward-compatible route adapter lives in `lib/guided-discovery.ts`. Results are presented by `app/KyndrylAssessmentResults.tsx`. Scoped endpoints remain under `app/api/accounts/[id]/guided-discovery`, while `/api/discoveries` continues to support the current application snapshot. The vendor-neutral AI boundary lives in `lib/ai-provider.ts`, retrieval in `lib/account-retrieval.ts`, and deterministic account intelligence in `lib/account-intelligence.ts`.

## Getting Started

Requirements:

- Node.js 22.13 or newer

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Validate:

```bash
npm test
```

## Versioning And Rollback

Kyndryl CDI V4 is developed on `codex/kyndryl-account-centric-v4`. Its validated rollback baseline is Kyndryl Sites version `5` at commit `93f15da7601a74b9af37ce21adc4918a4704e238`. Migration `0011` is additive, so version 5 safely ignores assignments and answer-impact records created by V4.

V5.3.1 is developed on `codex/open-workspace-v5-3-1`. Its validated rollback baseline is `v5.3-commercial-proof`. The access change does not require a database migration: it removes the administrative email pre-authorization gate while preserving authentication and owner-scoped queries.

Application rollback:

```bash
git switch --detach v5.3-commercial-proof
npm install
npm run build
```

Republish that validated build through OpenAI Sites. To resume development afterward, switch back to a branch rather than committing from detached HEAD.

Data rollback policy:

- V5.3.1 has no database migration; V5.3 migration `0008` remains additive only.
- Existing discoveries, account content, guided-discovery answers, and user-authored sources are never rewritten by the language switch.
- Returning to V5.3 restores the previous access policy without changing account ownership or deleting records.
- Existing `discoveries` and V5.3 records remain compatible.
- No table, column, source, answer, or document is removed or renamed in this release.

## Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `watsonx` `account-intelligence` `sales-intelligence` `customer-discovery` `serverless`
