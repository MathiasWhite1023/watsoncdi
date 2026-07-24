# Watson CDI — Customer Discovery Intelligence

Watson CDI is a bilingual Account Intelligence platform for the work that happens before CRM. It helps teams understand customer context, preserve grounded account memory, map relationships, identify IBM portfolio themes, and proactively qualify next steps before creating a formal opportunity.

English (US) is the default interface language. Users can switch the entire product to Brazilian Portuguese from the global header, and the preference persists between sessions. Human-authored notes, documents, answers, evidence, company names, people, and product names always remain in their original language.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

This is a portfolio/challenge project. It is not an official IBM product.

The live demo remains on OpenAI Sites at V5.3.1 while V6 is validated as a
parallel IBM Cloud pilot. No production traffic or data is dual-written.

## IBM Cloud Pilot V6

V6 runs the same Watson CDI product as a standalone Node.js application on IBM
Cloud Code Engine in `br-sao`. The target architecture is:

```text
User
  -> IBM Code Engine
  -> IBM App ID (open, verified-email registration)
  -> IBM Databases for PostgreSQL
  -> IBM Cloud Object Storage
  -> IBM watsonx or transparent deterministic rules
```

The pilot is infrastructure-as-code, but this repository does not provision it
automatically. A Schematics `terraform plan`, catalog cost review, and explicit
human authorization are required before any `terraform apply`, because the
managed PostgreSQL instance is paid.

V6 includes:

- Next.js standalone on Node.js 22, packaged in a multi-stage non-root image;
- live and ready health endpoints, with real PostgreSQL and COS probes;
- forward-only PostgreSQL migrations executed as a Code Engine Job;
- a restricted PostgreSQL application role separated from the migration
  administrator;
- private COS document keys scoped by a hash of the immutable App ID subject;
- App ID Authorization Code Flow with state, nonce, PKCE, verified email,
  rotating opaque sessions, secure cookies, and same-origin mutation checks;
- immutable image deployment by commit SHA, migration-before-revision ordering,
  protected staging/production environments, and digest-based rollback;
- structured operational logs that allowlist metadata and omit account notes,
  documents, tokens, secrets, and complete email addresses.

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
- Accepts PDF, DOCX, TXT and Markdown sources in the private workspace, storing originals privately in IBM COS and searchable chunks in PostgreSQL on V6.
- Keeps audit history, human validation, and clear processing-engine status.
- Keeps `/` as a synthetic read-only demo and opens `/workspace` to any
  verified IBM App ID user on V6. Server-side ownership uses the immutable
  identity subject, never only an email address.
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

## Guided Discovery

Open `Account intelligence -> Strategy -> Guided discovery` (or `Inteligência de contas -> Estratégia -> Descoberta guiada` in Portuguese) to run the account questionnaire. The localized `2026.1` catalog starts with six business and technology diagnosis questions, then ranks FinOps, Trusted Data, AI Governance, Hybrid Cloud, Automation and App Modernization by information value.

Two modes are available in both languages:

- `Adaptive / Adaptativo`: completes the base diagnosis, selects the two most relevant pillars and materializes the next route.
- `Direct by pillar / Direto por pilar`: starts immediately in one or more selected technology themes.

Each answer can include a structured value, free context, evidence nature, related stakeholder, source, date and confidence. Drafts do not change intelligence. Confirmed and unknown answers update the deterministic account model, while an AI-generated follow-up remains a proposal until a person accepts it.

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
- Node.js 22 standalone runtime
- IBM Code Engine
- IBM Databases for PostgreSQL and Drizzle `pg-core`
- IBM Cloud Object Storage
- IBM App ID Cloud Directory
- Terraform / IBM Cloud Schematics
- GitHub Actions and IBM Container Registry
- IBM Carbon React
- Carbon Charts React
- React Flow (`@xyflow/react`)
- Zod structured-output validation
- Sass
- OpenAI Sites remains the unchanged V5.3.1 production host during the pilot

## Architecture

```text
Meeting notes / unified information / documents
  -> App ID session and immutable-subject authorization
  -> /api/accounts and domain services
  -> guided discovery catalog, route and append-only evidence
  -> selective account-scoped retrieval
  -> deterministic workflow today; IBM watsonx through the provider adapter when configured
  -> PostgreSQL memory, actions, hypotheses, plans, relationships and audit
  -> private IBM COS originals
  -> Home, account workspace, context map, portfolio radar and settings
```

The main product UI lives in `app/page.tsx`. Typed translations and locale resolution live in `lib/i18n.ts`, with the client provider and Carbon language selector in `app/I18nProvider.tsx`. Health formulas live in `lib/account-health.ts`; the three semantic heatmap surfaces live in `app/HealthHeatmaps.tsx`. The conversation review, visible analysis pipeline, governed CRM handoff and observed metrics live in `app/CommercialProofPanels.tsx`; the relationship-oriented context view lives in `app/CustomerContextMap.tsx`. Commercial state comparisons and handoff/impact contracts live in `lib/commercial-proof.ts`.

The guided workspace lives in `app/GuidedDiscoveryWorkspace.tsx`, its versioned, localized catalog and deterministic route engine in `lib/guided-discovery.ts`, and its scoped endpoints under `app/api/accounts/[id]/guided-discovery`. The account API remains compatible with `/api/discoveries` while exposing `/api/accounts` and scoped account routes. The vendor-neutral AI boundary lives in `lib/ai-provider.ts`, retrieval in `lib/account-retrieval.ts`, and deterministic intelligence in `lib/account-intelligence.ts`. V5 charts and relationship canvas live in `app/V5Charts.tsx` and `app/RelationshipGraph.tsx`.

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

Run the IBM runtime locally:

```bash
cp .env.example .env.local
npm run db:migrate
npm run db:seed:ibm
npm run dev:ibm
```

Build:

```bash
npm run build
```

Validate:

```bash
npm test
npm run build:ibm
```

IBM Cloud infrastructure and the exact bootstrap sequence are documented in
[`infra/ibm-cloud/README.md`](infra/ibm-cloud/README.md). Secrets belong only in
Schematics, Code Engine Secrets, or protected GitHub Environment secrets.

## Versioning And Rollback

V6 is developed on `codex/ibm-cloud-portability-v6`. Its production rollback
baseline is `v5.3.1-open-authenticated-workspace`. The OpenAI Sites deployment
is not changed by the pilot.

Before IBM cutover, rollback means disabling or deleting the pilot application;
the Sites production URL continues to serve V5.3.1. After an IBM revision is
published, application rollback selects the previous Code Engine image digest.
PostgreSQL and COS are preserved, and migrations are never reversed
destructively. The tag `v6-ibm-cloud-pilot` will only be created after the paid
plan is approved and the staging flow is validated.

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
