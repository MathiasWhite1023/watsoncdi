import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("adds only additive account-centric CDI tables and indexes", async () => {
  const [migration, schema] = await Promise.all([
    read("drizzle/0011_kyndryl_account_centric.sql"),
    read("db/schema.ts"),
  ]);

  assert.match(migration, /CREATE TABLE `stakeholder_capability_assignments`/);
  assert.match(migration, /CREATE TABLE `cdi_answer_impacts`/);
  assert.match(migration, /assignment_role[\s\S]*owner[\s\S]*decision_maker[\s\S]*technical_contact/);
  assert.match(migration, /status[\s\S]*confirmed[\s\S]*suggested[\s\S]*dismissed/);
  assert.match(migration, /CREATE UNIQUE INDEX `cdi_answer_impacts_answer_idx`/);
  assert.match(migration, /FOREIGN KEY \(`answer_id`\)[\s\S]*guided_discovery_answers/);
  assert.doesNotMatch(migration, /\bDROP\s+(?:TABLE|COLUMN)\b|\bDELETE\s+FROM\b/i);
  assert.match(schema, /export const stakeholderCapabilityAssignments/);
  assert.match(schema, /export const cdiAnswerImpacts/);
});

test("materializes deterministic evidence, snapshots, conflicts, reviews and immutable answer impact", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const materializer =
    api.match(
      /async function materializeCdiAnswerImpact[\s\S]*?async function insertCatalogQuestion/,
    )?.[0] || "";

  assert.match(materializer, /scoreCapabilityDrivenAssessment/);
  assert.match(materializer, /INSERT OR IGNORE INTO cdi_answer_impacts/);
  assert.match(materializer, /INSERT OR IGNORE INTO cdi_evidence/);
  assert.match(materializer, /INSERT OR IGNORE INTO cdi_capability_snapshots/);
  assert.match(materializer, /INSERT INTO cdi_conflicts/);
  assert.match(materializer, /INSERT INTO cdi_technology_reviews/);
  assert.match(materializer, /humanValidationRequired:\s*true/);
  assert.doesNotMatch(materializer, /UPDATE cdi_answer_impacts/);
  assert.match(api, /checkpointAvailable/);
  assert.match(api, /answerImpact,/);
});

test("explains technology penalty changes in the immutable answer impact", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const impactState =
    api.match(
      /function capabilityImpactState[\s\S]*?function changedTechnologyFields/,
    )?.[0] || "";
  const penaltyDiff =
    api.match(
      /function changedTechnologyPenalties[\s\S]*?async function materializeCdiAnswerImpact/,
    )?.[0] || "";
  const materializer =
    api.match(
      /async function materializeCdiAnswerImpact[\s\S]*?async function insertCatalogQuestion/,
    )?.[0] || "";

  assert.match(
    impactState,
    /components:\s*\{\s*penalties:\s*Number\(item\.components\.penalties/,
  );
  assert.match(penaltyDiff, /before:\s*previous/);
  assert.match(penaltyDiff, /after:\s*next/);
  assert.match(penaltyDiff, /delta:\s*next - previous/);
  assert.match(penaltyDiff, /triggered:\s*previous === 0 && next > 0/);
  assert.match(penaltyDiff, /cleared:\s*previous > 0 && next === 0/);
  assert.match(materializer, /const penaltyChanges = changedTechnologyPenalties/);
  assert.match(materializer, /penalties:\s*penaltyTotals/);
  assert.match(materializer, /penaltyChanges,/);
  assert.match(materializer, /changes:\s*penaltyChanges/);
  assert.match(
    materializer,
    /application:\s*"subtracted_after_weighted_components"/,
  );
});

test("publishes current-catalog portfolio coverage without artificial not-started scores", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const coverage =
    api.match(
      /const capabilityPortfolioCoverage = \{[\s\S]*?\n  return \{/,
    )?.[0] || "";

  assert.match(coverage, /catalogVersion:\s*CDI_CAPABILITY_CATALOG_VERSION/);
  assert.match(coverage, /guidedPillarStatuses[\s\S]*catalogVersion === CDI_CAPABILITY_CATALOG_VERSION/);
  assert.match(coverage, /reviewed_sufficient/);
  assert.match(coverage, /reviewed_gaps/);
  assert.match(coverage, /not_relevant/);
  assert.match(coverage, /needs_review/);
  assert.match(coverage, /reviewedAccounts \/ discoveryRows\.length/);
  assert.match(coverage, /technologyFit:\s*hasCurrentEvidence[\s\S]*:\s*null/);
  assert.match(coverage, /confidence:\s*hasCurrentEvidence[\s\S]*:\s*null/);
});

test("saves stakeholder capability responsibilities atomically and counts only confirmed coverage", async () => {
  const [api, relationships] = await Promise.all([
    read("app/api/discoveries/route.ts"),
    read("app/api/accounts/[id]/relationships/route.ts"),
  ]);
  const upsert =
    api.match(
      /if \(body\.action === "stakeholder_upsert"\)[\s\S]*?if \(body\.action === "stakeholder_delete"\)/,
    )?.[0] || "";

  assert.match(upsert, /capabilityAssignments/);
  assert.match(upsert, /CDI_CAPABILITY_KEYS\.includes/);
  assert.match(upsert, /decision_maker/);
  assert.match(upsert, /technical_contact/);
  assert.match(upsert, /DELETE FROM stakeholder_capability_assignments/);
  assert.match(upsert, /INSERT INTO stakeholder_capability_assignments/);
  assert.match(upsert, /await db\.batch\(stakeholderStatements\)/);
  assert.match(upsert, /SELECT discovery_id, created_at FROM stakeholders WHERE id = \?/);
  assert.match(api, /item\.status === "confirmed"/);
  assert.match(relationships, /capabilityAssignments/);
  assert.match(relationships, /capabilityCoverage/);
  assert.match(relationships, /stakeholder_upsert/);
});

test("keeps governance and account snapshots owner-scoped", async () => {
  const [accountRoute, governance, api] = await Promise.all([
    read("app/api/accounts/[id]/route.ts"),
    read("app/api/accounts/[id]/governance/route.ts"),
    read("app/api/discoveries/route.ts"),
  ]);

  assert.match(accountRoute, /get\("scope"\) !== "demo"/);
  assert.match(accountRoute, /searchParams\.set\("scope", "private"\)/);
  assert.match(governance, /searchParams\.set\("scope", "private"\)/);
  assert.match(governance, /searchParams\.set\("accountId", id\)/);
  assert.match(governance, /ANSWER_IMPACT_NOT_FOUND/);
  assert.match(governance, /answerImpacts/);
  assert.match(governance, /capabilitySnapshots/);
  assert.match(governance, /technologyReviews/);
  assert.match(api, /visibility = 'private' AND owner_email = \?/);
});

test("persists organization, influence and capability graph layouts independently", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const graphLayout =
    api.match(
      /if \(body\.action === "graph_layout"\)[\s\S]*?if \(body\.action === "research"\)/,
    )?.[0] || "";

  assert.match(graphLayout, /"hierarchy", "influence", "capability"/);
  assert.match(graphLayout, /`layout-\$\{id\}-\$\{mode\}`/);
  assert.match(graphLayout, /account_graph_layouts/);
});
