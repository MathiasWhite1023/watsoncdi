# IBM Opportunity Heatmap

Functional web prototype for customer discovery, opportunity qualification, and IBM portfolio recommendation.

Live demo: https://watson-cdi-challenge.matheus68747.chatgpt.site

## Overview

IBM Opportunity Heatmap helps business partners and sales teams structure customer discovery evidence, identify high-potential opportunities, and turn early conversations into explainable next steps.

The app captures customer answers in a persistent discovery workspace, scores opportunity fit across IBM-aligned capability areas, renders a capability heatmap, and produces CRM-ready recommendations with audit history.

This is a portfolio/challenge project. It is not an official IBM product.

## Product Capabilities

- Guided customer discovery workspace
- Persistent customer records and answer history
- Explainable opportunity scoring by alignment, value, readiness, and confidence
- Capability heatmap for portfolio prioritization
- Recommendations for IBM software, consulting, and follow-up workshops
- Executive brief and CRM handoff summary
- Knowledge catalog for IBM-aligned capabilities
- Governance view with audit events and human validation controls
- Responsive IBM Carbon-inspired interface
- Carbon Charts visualizations for portfolio and capability analysis

## Agentic Workflow

The current version demonstrates an agentic product experience with a deterministic scoring engine.

When a user submits discovery evidence, the backend:

1. Saves the answer in the discovery record.
2. Rebuilds the customer context from all submitted answers.
3. Detects business signals across domains such as FinOps, trusted data, AI governance, hybrid cloud, automation, and application modernization.
4. Recalculates scores, confidence, priority, recommendations, and audit events.
5. Updates the dashboard, heatmap, and executive brief.

The visible agents in the UI represent specialized analysis roles such as Discovery Agent, FinOps Intelligence, Trusted Data Agent, and Explainability Agent. In this prototype they are implemented through rule-based backend logic, and the architecture is ready to evolve into model-backed agents using watsonx.ai, Granite, OpenAI, or another LLM provider.

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
User discovery input
  -> Next.js client workspace
  -> /api/discoveries server route
  -> D1 discoveries and audit_events tables
  -> deterministic scoring engine
  -> heatmap, recommendations, CRM summary, and governance views
```

The main scoring logic lives in `app/api/discoveries/route.ts`. The primary product UI is implemented in `app/page.tsx`, with chart components in `app/CarbonVisuals.tsx`.

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

## Project Status

The application is deployed and usable as an initial MVP. The next natural evolution is to replace the deterministic analysis layer with real model-backed agents and structured tool calls for semantic discovery analysis, evidence extraction, and recommendation generation.

## Suggested Repository Topics

`nextjs` `react` `typescript` `ibm-carbon` `carbon-charts` `ai` `sales-intelligence` `customer-discovery` `serverless` `cloudflare-workers`
