# Watson CDI Account Intelligence

Account Intelligence before CRM: a functional web platform to understand client context, maintain a grounded account memory, map relationships, identify IBM portfolio themes, and proactively qualify next steps before creating a formal CRM opportunity.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

This is a portfolio/challenge project. It is not an official IBM product.

## What It Does

- Provides a role-oriented Home with a daily briefing, prioritized action queue, meetings and accounts that need attention.
- Tracks a portfolio of client accounts before they become CRM opportunities.
- Captures free-form meeting notes and turns them into account intelligence.
- Generates summaries, business signals, IBM themes, next questions, next actions, risks, stakeholders, systems, and pain points.
- Provides a persistent, editable stakeholder organogram for every account, with reporting lines, influence, stance, priorities, notes, and a relationship plan.
- Crosses stakeholder profiles with meeting evidence, pains, and IBM capability scores to suggest who to approach, what to discuss, and which question to ask.
- Keeps the broader account map for systems, pains, risks, initiatives, and IBM capabilities.
- Shows a portfolio heatmap and account-level capability heatmap.
- Produces a pre-CRM handoff that can be copied into Salesforce, Dynamics, HubSpot, or another CRM.
- Maintains `Sabemos`, `Supomos`, `Falta descobrir` and `Desatualizado` account memory with clickable evidence.
- Offers a grounded `Pergunte sobre esta conta` copilot, opportunity hypotheses and human-editable 30/60/90 Account Plan.
- Accepts PDF, DOCX, TXT and Markdown sources in the private workspace, storing originals in R2 and chunks in D1.
- Keeps audit history, human validation, and clear AI/fallback status.
- Keeps `/` as a synthetic read-only demo and protects `/workspace` with Sign in with ChatGPT plus server-side ownership checks.
- Produces a proactive daily briefing, Next Best Actions, the next best conversation and the discovery question with the highest information value.
- Combines keyword, recency and 768-dimensional semantic retrieval with account-scoped citations.
- Provides a Carbon command palette (`Cmd/Ctrl + K`) and an interactive hierarchy/influence graph powered by React Flow.

## AI Behavior

The server-side AI adapter uses this precedence:

```text
IBM watsonx -> Google Gemini -> deterministic fallback
```

IBM watsonx remains the target production provider and uses:

- `WATSONX_API_KEY`
- `WATSONX_PROJECT_ID`
- `WATSONX_URL`
- `WATSONX_MODEL_ID`

The temporary test provider uses:

- `GEMINI_API_KEY` (secret; never expose it in source code or browser variables)
- `GEMINI_MODEL_ID=gemini-3.1-flash-lite`
- `GEMINI_EMBEDDING_MODEL_ID=gemini-embedding-2`
- `AI_PROVIDER_MODE=auto`

The public demo never calls Gemini. Accounts classified as `confidential` also block Gemini automatically. A test account may use Gemini only inside the authenticated workspace. If a provider is unavailable, over quota, returns invalid output or opens the circuit breaker, the app continues with the deterministic engine and exposes the active status without returning credentials.

The key previously pasted into a chat is intentionally not present in this repository or deployment. Revoke it, create a new key restricted to the Gemini API, and save the replacement only as the `GEMINI_API_KEY` Sites secret. Until then, V5 operates safely in deterministic fallback mode.

Free-tier Gemini processing is experimental. Do not mark real or confidential customer data as `test`; use watsonx or fallback for that content.

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
  -> selective retrieval (semantic + keyword + recency)
  -> IBM watsonx, Gemini, or deterministic fallback
  -> D1 memory, embeddings, cache, briefings, relationships, actions, plans and audit
  -> R2 original documents
  -> Home, account workspace, portfolio radar and settings
```

The main product UI lives in `app/page.tsx`. The account API remains compatible with `/api/discoveries` while exposing `/api/accounts` and scoped account routes. The vendor-neutral AI boundary lives in `lib/ai-provider.ts`, retrieval in `lib/account-retrieval.ts`, and deterministic intelligence in `lib/account-intelligence.ts`. V5 charts and relationship canvas live in `app/V5Charts.tsx` and `app/RelationshipGraph.tsx`.

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

The rollback baseline for V5 is tagged as:

```bash
v4-proactive-account-intelligence
```

The V5 version is developed on:

```bash
codex/proactive-intelligence-v5
```

After validation and deployment, tag the exact deployed commit:

```bash
v5-proactive-copilot-gemini
```

Application rollback:

```bash
git checkout v4-proactive-account-intelligence
npm install
npm run build
```

Then republish that validated source through OpenAI Sites.

Data rollback policy:

- V5 migrations are additive only.
- Existing `discoveries` data remains compatible.
- New embeddings, AI cache, briefings, snapshots, relationships, layouts, public signals and feedback tables can be ignored safely by V4.
- New discovery and meeting fields are optional/defaulted, so legacy rows remain readable.
- No destructive migration is included in this release.

## Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `watsonx` `account-intelligence` `sales-intelligence` `customer-discovery` `serverless`
