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

## AI Behavior

The platform is prepared for real IBM watsonx analysis using these runtime variables:

- `WATSONX_API_KEY`
- `WATSONX_PROJECT_ID`
- `WATSONX_URL`
- `WATSONX_MODEL_ID`

When those values are present, the unified adapter uses IBM watsonx.ai for meeting preparation, account analysis, grounded answers and Account Plan suggestions. When they are missing or a call fails, the app keeps working with a deterministic fallback engine and clearly marks the analysis as fallback.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Cloudflare Workers / vinext
- Cloudflare D1-style persistence
- Drizzle migrations
- IBM Carbon React
- Carbon Charts React
- Sass
- OpenAI Sites hosting

## Architecture

```text
Meeting notes / unified information / documents
  -> /api/accounts
  -> IBM watsonx adapter or deterministic fallback
  -> D1 memory, events, stakeholders, hypotheses, actions, plans and audit
  -> R2 original documents
  -> Home, account workspace, portfolio radar and settings
```

The main product UI lives in `app/page.tsx`. The account API remains compatible with `/api/discoveries` while exposing `/api/accounts` and scoped account routes. The deterministic intelligence engine lives in `lib/account-intelligence.ts`. Carbon chart components live in `app/CarbonVisuals.tsx`.

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

The rollback baseline for V4 is tagged as:

```bash
v3-stakeholder-intelligence
```

The V4 version is developed on:

```bash
codex/account-intelligence-v4
```

After validation and deployment, tag the exact deployed commit:

```bash
v4-proactive-account-intelligence
```

Application rollback:

```bash
git checkout v3-stakeholder-intelligence
npm run build
```

Then republish that validated source through OpenAI Sites.

Data rollback policy:

- V4 migrations are additive only.
- Existing `discoveries` data remains compatible.
- New memory, action, hypothesis, plan, document and chat tables can be ignored safely by V3.
- New discovery and meeting fields are optional/defaulted, so legacy rows remain readable.
- No destructive migration is included in this release.

## Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `watsonx` `account-intelligence` `sales-intelligence` `customer-discovery` `serverless`
