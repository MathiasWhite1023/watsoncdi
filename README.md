# Watson CDI Account Intelligence

Account Intelligence before CRM: a functional web platform to understand client context, register meeting notes, map account relationships, identify IBM portfolio themes, and qualify next steps before creating a formal CRM opportunity.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

This is a portfolio/challenge project. It is not an official IBM product.

## What It Does

- Tracks a portfolio of client accounts before they become CRM opportunities.
- Captures free-form meeting notes and turns them into account intelligence.
- Generates summaries, business signals, IBM themes, next questions, next actions, risks, stakeholders, systems, and pain points.
- Provides a persistent, editable stakeholder organogram for every account, with reporting lines, influence, stance, priorities, and notes.
- Crosses stakeholder profiles with meeting evidence, pains, and IBM capability scores to suggest who to approach, what to discuss, and which question to ask.
- Keeps the broader account map for systems, pains, risks, initiatives, and IBM capabilities.
- Shows a portfolio heatmap and account-level capability heatmap.
- Produces a pre-CRM handoff that can be copied into Salesforce, Dynamics, HubSpot, or another CRM.
- Keeps audit history, human validation, and clear AI/fallback status.

## AI Behavior

The platform is prepared for real IBM watsonx analysis using these runtime variables:

- `WATSONX_API_KEY`
- `WATSONX_PROJECT_ID`
- `WATSONX_URL`
- `WATSONX_MODEL_ID`

When those values are present, meeting notes are sent to IBM watsonx.ai for structured account-intelligence extraction. When they are missing or the call fails, the app keeps working with a deterministic fallback engine and clearly marks the analysis as fallback.

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
Meeting notes / discovery signals
  -> /api/discoveries
  -> IBM watsonx adapter or deterministic fallback
  -> D1 discoveries, meetings, stakeholders, account_maps, audit_events
  -> Home, account intelligence, organogram, heatmap, recommendations, governance
```

The main product UI lives in `app/page.tsx`. The account-intelligence API and watsonx/fallback logic live in `app/api/discoveries/route.ts`. Carbon chart components live in `app/CarbonVisuals.tsx`.

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

The current production baseline is tagged as:

```bash
v1-current-production
```

The Account Intelligence v2 version was developed on:

```bash
feature/account-intelligence-v2
```

After validation, tag the new version:

```bash
v2-account-intelligence
```

The stakeholder intelligence evolution is developed on:

```bash
codex/stakeholder-intelligence-v3
```

Application rollback:

```bash
git switch main
git checkout v1-current-production
npm run build
```

Then republish that validated source through OpenAI Sites.

Data rollback policy:

- V2 migrations are additive only.
- Existing `discoveries` data remains compatible.
- New `meetings` and `account_maps` tables can be ignored safely by V1.
- The V3 `stakeholders` table is also additive and can be ignored by earlier application versions.
- No destructive migration is included in this release.

## Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `watsonx` `account-intelligence` `sales-intelligence` `customer-discovery` `serverless`
