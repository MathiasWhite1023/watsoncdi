import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("documents the account intelligence product and rollback path", async () => {
  const [readme, changelog, packageJson] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("CHANGELOG.md"),
    readProjectFile("package.json"),
  ]);

  assert.match(readme, /# Watson CDI Account Intelligence/);
  assert.match(readme, /Account Intelligence before CRM/);
  assert.match(readme, /WATSONX_API_KEY/);
  assert.match(readme, /v1-current-production/);
  assert.match(changelog, /v2-account-intelligence/);
  assert.match(changelog, /V2 migrations are additive only/);
  assert.match(readme, /Live demo:/);
  assert.match(readme, /not an official IBM product/i);
  assert.match(packageJson, /"name": "ibm-opportunity-heatmap"/);
});

test("keeps the account intelligence surfaces wired", async () => {
  const [page, api, visuals, migration, stakeholderMigration] = await Promise.all([
    readProjectFile("app/page.tsx"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/CarbonVisuals.tsx"),
    readProjectFile("drizzle/0001_high_skaar.sql"),
    readProjectFile("drizzle/0002_calm_miek.sql"),
  ]);

  assert.match(page, /label: "Início"/);
  assert.match(page, /Inteligência de contas/);
  assert.match(page, /Stakeholder intelligence/);
  assert.match(page, /StakeholderBranch/);
  assert.match(page, /Adicionar report/);
  assert.match(page, /Notas livres de reunião/);
  assert.match(page, /Handoff pré-CRM/);
  assert.match(page, /IBM capability playbook/);

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

  assert.match(migration, /CREATE TABLE `meetings`/);
  assert.match(migration, /CREATE TABLE `account_maps`/);
  assert.match(stakeholderMigration, /CREATE TABLE `stakeholders`/);

  assert.match(visuals, /@carbon\/charts-react/);
  assert.match(visuals, /DonutChart/);
  assert.match(visuals, /GroupedBarChart/);
});
