# Watson CDI — Customer Discovery Intelligence

Watson CDI is a bilingual Account Intelligence platform for the work that happens before CRM. It helps teams understand customer context, preserve grounded account memory, map relationships, identify IBM portfolio themes, and proactively qualify next steps before creating a formal opportunity.

English (US) is the default interface language. Users can switch the entire product to Brazilian Portuguese from the global header, and the preference persists between sessions. Human-authored notes, documents, answers, evidence, company names, people, and product names always remain in their original language.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

This is a portfolio/challenge project. It is not an official IBM product.

## What It Does

- Provides a role-oriented Home with a daily briefing, prioritized action queue, meetings and accounts that need attention.
- Shows three complementary, interactive health views instead of repeating the same heatmap:
  - Home `Account Health`: accounts by opportunity potential, pre-CRM maturity, relationship coverage, evidence confidence, and discovery coverage.
  - Account `Capability Health`: IBM pillars by alignment, business value, readiness, confidence, and discovery coverage.
  - Radar `Portfolio Fit`: accounts by IBM capability, with search, combined filters, sorting, evidence details, and account drill-down.
- Uses a typed `en-US` / `pt-BR` localization layer for navigation, forms, Carbon charts, guided discovery, relationship maps, API messages, deterministic intelligence, dates, and numbers.
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
- Adds a dynamic guided-discovery workspace inside each account's Strategy mode, with adaptive and direct-by-pillar routes.
- Keeps discovery progress separate from evidence coverage, and records gaps, stale answers, contradictions and append-only revisions.
- Recalculates account intelligence deterministically after each confirmed answer and reserves generative AI for explicit, cached checkpoints.

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
  -> guided discovery catalog, route and append-only evidence
  -> selective retrieval (semantic + keyword + recency)
  -> IBM watsonx, Gemini, or deterministic fallback
  -> D1 memory, embeddings, cache, briefings, relationships, actions, plans and audit
  -> R2 original documents
  -> Home, account workspace, portfolio radar and settings
```

The main product UI lives in `app/page.tsx`. Typed translations and locale resolution live in `lib/i18n.ts`, with the client provider and Carbon language selector in `app/I18nProvider.tsx`. Health formulas live in `lib/account-health.ts`; the three semantic heatmap surfaces live in `app/HealthHeatmaps.tsx`.

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

Build:

```bash
npm run build
```

Validate:

```bash
npm test
```

## Versioning And Rollback

V5.2 is developed on `codex/bilingual-account-health-v5-2`. Its validated rollback baseline is `v5.1-guided-discovery`; after production validation, the exact deployed V5.2 commit is tagged `v5.2-bilingual-account-health`.

Application rollback:

```bash
git switch --detach v5.1-guided-discovery
npm install
npm run build
```

Republish that validated build through OpenAI Sites. To resume development afterward, switch back to a branch rather than committing from detached HEAD.

Data rollback policy:

- V5.2 migration `0007` is additive only.
- Existing discoveries, account content, guided-discovery answers, and user-authored sources are never rewritten by the language switch.
- V5.1 safely ignores localized briefing variants, translation cache records, and AI-run locale audit data.
- Existing `discoveries` and V5.1 guided-discovery records remain compatible.
- No table, column, source, answer, or document is removed or renamed in this release.

## Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `watsonx` `account-intelligence` `sales-intelligence` `customer-discovery` `serverless`
