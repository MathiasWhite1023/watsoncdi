import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("integrates Home, Portfolio, Radar and account workspace into one navigation", async () => {
  const [page, i18n, messages] = await Promise.all([
    read("app/page.tsx"),
    read("lib/i18n.ts"),
    read("lib/app-messages.ts"),
  ]);

  const navBlock = page.match(/const navItems = \[[\s\S]*?\] as const;/)?.[0] || "";
  assert.match(navBlock, /id: "home"/);
  assert.match(navBlock, /id: "portfolio"/);
  assert.match(navBlock, /id: "settings"/);
  assert.doesNotMatch(navBlock, /id: "accounts"/);
  assert.doesNotMatch(navBlock, /id: "radar"/);
  assert.match(page, /portfolioMode/);
  assert.match(page, /v5-breadcrumb/);
  assert.match(page, /v5-operational-table/);
  assert.match(i18n, /portfolio: "Portfolio"/);
  assert.match(messages, /strategy: "Discovery"/);
  assert.match(messages, /activity: "Evidence & activity"/);
});

test("keeps multipillar review state additive and separate from current-pillar progress", async () => {
  const [migration, schema, api, workspace] = await Promise.all([
    read("drizzle/0009_kyndryl_pillar_status.sql"),
    read("db/schema.ts"),
    read("app/api/discoveries/route.ts"),
    read("app/GuidedDiscoveryWorkspace.tsx"),
  ]);

  assert.match(migration, /CREATE TABLE `guided_discovery_pillar_status`/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|COLUMN)\b|\bDELETE\s+FROM\b/i);
  assert.match(schema, /guidedDiscoveryPillarStatus/);
  assert.match(api, /reviewedPillars\.length[\s\S]*GUIDED_DISCOVERY_PILLARS\.length/);
  assert.match(api, /mark_pillar_not_relevant/);
  assert.match(api, /pause_pillar/);
  assert.match(api, /complete_pillar/);
  assert.match(api, /reopen_pillar/);
  assert.match(api, /essentialQuestions\.length/);
  assert.match(workspace, /Back to capabilities/);
  assert.match(workspace, /Voltar às capacidades/);
  assert.match(workspace, /pillarAssessments/);
  assert.match(workspace, /overallReview/);
  assert.match(workspace, /Add context and evidence/);
});

test("materializes five core questions and at most one deterministic deep question per core signal", async () => {
  const domain = await read("lib/guided-discovery.ts");
  assert.match(domain, /essential: true/);
  assert.match(domain, /essential: false/);
  assert.match(domain, /questionsForPillar[\s\S]*question\.essential/);
  assert.match(domain, /question\.id\.replace\("_C", "_D"\)/);
  assert.match(domain, /\.slice\(\s*0,\s*10,\s*\)/);
  assert.match(domain, /triggerQuestionId/);
});
