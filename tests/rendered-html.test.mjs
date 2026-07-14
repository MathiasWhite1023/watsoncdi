import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("documents the proactive account intelligence product and rollback path", async () => {
  const [readme, changelog, packageJson] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("CHANGELOG.md"),
    readProjectFile("package.json"),
  ]);

  assert.match(readme, /# Watson CDI Account Intelligence/);
  assert.match(readme, /Account Intelligence before CRM/);
  assert.match(readme, /WATSONX_API_KEY/);
  assert.match(readme, /v3-stakeholder-intelligence/);
  assert.match(changelog, /v4-proactive-account-intelligence/);
  assert.match(changelog, /migrations are additive/i);
  assert.match(readme, /Live demo:/);
  assert.match(readme, /not an official IBM product/i);
  assert.match(packageJson, /"name": "ibm-opportunity-heatmap"/);
});

test("keeps the V4 account intelligence surfaces wired", async () => {
  const [page, api, engine, visuals, migration, stakeholderMigration, v4Migration, auth, documents] = await Promise.all([
    readProjectFile("app/page.tsx"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("lib/account-intelligence.ts"),
    readProjectFile("app/CarbonVisuals.tsx"),
    readProjectFile("drizzle/0001_high_skaar.sql"),
    readProjectFile("drizzle/0002_calm_miek.sql"),
    readProjectFile("drizzle/0003_certain_epoch.sql"),
    readProjectFile("app/chatgpt-auth.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
  ]);

  assert.match(page, /label: "Início"/);
  assert.match(page, /Inteligência de contas/);
  assert.match(page, /Radar da carteira/);
  assert.match(page, /Configurações/);
  assert.match(page, /Pergunte sobre esta conta/);
  assert.match(page, /Organograma dinâmico/);
  assert.match(page, /Pós-reunião inteligente/);
  assert.match(page, /Account Plan/);
  assert.match(page, /Sabemos, supomos e falta descobrir/);

  assert.match(api, /WATSONX_API_KEY/);
  assert.match(api, /getWatsonxInsights/);
  assert.match(api, /fallbackMeetingInsights/);
  assert.match(api, /buildAccountMap/);
  assert.match(api, /FinOps & Technology Financial Management/);
  assert.match(api, /AI Governance/);
  assert.match(api, /meetings/);
  assert.match(api, /audit_events/);
  assert.match(api, /stakeholder_upsert/);
  assert.match(api, /stakeholder_delete/);
  assert.match(api, /seedStakeholderTrees/);
  assert.match(api, /account_actions/);
  assert.match(api, /opportunity_hypotheses/);
  assert.match(api, /account_memory/);
  assert.match(api, /account_chat_messages/);

  assert.match(engine, /impact \* \.35/);
  assert.match(engine, /buildActions/);
  assert.match(engine, /buildHypotheses/);
  assert.match(engine, /answerFromEvidence/);

  assert.match(migration, /CREATE TABLE `meetings`/);
  assert.match(migration, /CREATE TABLE `account_maps`/);
  assert.match(stakeholderMigration, /CREATE TABLE `stakeholders`/);
  assert.match(v4Migration, /CREATE TABLE `account_actions`/);
  assert.match(v4Migration, /CREATE TABLE `documents`/);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(documents, /15 \* 1024 \* 1024/);
  assert.match(documents, /R2Bucket/);

  assert.match(visuals, /@carbon\/charts-react/);
  assert.match(visuals, /DonutChart/);
  assert.match(visuals, /GroupedBarChart/);
});
