import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses one relationship canvas for organization and capability responsibility", async () => {
  const [graph, panel] = await Promise.all([
    read("app/RelationshipGraph.tsx"),
    read("app/KyndrylV4AccountPanels.tsx"),
  ]);

  assert.match(graph, /RelationshipGraphMode = "hierarchy" \| "influence" \| "capability"/);
  assert.match(graph, /StakeholderCapabilityAssignment/);
  assert.match(graph, /decision_maker/);
  assert.match(graph, /technical_contact/);
  assert.match(graph, /assignment\.status === "confirmed"/);
  assert.match(graph, /assignment\.status === "proposed"/);
  assert.match(graph, /assignment\.status === "suggested"/);
  assert.match(graph, /assignment\.status !== "dismissed"/);
  assert.match(graph, /onConfirmAssignment/);
  assert.match(panel, /KyndrylV4RelationshipsPanel/);
  assert.match(panel, /openRoleGaps/);
});

test("renders the V4 opportunity cockpit from supplied account intelligence", async () => {
  const panel = await read("app/KyndrylV4AccountPanels.tsx");

  assert.match(panel, /export function KyndrylV4StrategyPanel/);
  assert.match(panel, /<BubbleChart data=\{bubbleData\}/);
  assert.match(panel, /radiusMapsTo: "impact"/);
  assert.match(panel, /mapsTo: "confidence"/);
  assert.match(panel, /mapsTo: "fit"/);
  assert.match(panel, /validSnapshots\.length >= 2/);
  assert.match(panel, /Account Plan · 30 \/ 60 \/ 90/);
  assert.match(panel, /intelligenceStatus = "deterministic"/);
  assert.doesNotMatch(panel, /gemini/i);
});

test("keeps governance traceable from an answer to evidence and recommendation", async () => {
  const panel = await read("app/KyndrylV4AccountPanels.tsx");

  assert.match(panel, /export function KyndrylV4GovernancePanel/);
  assert.match(panel, /Answer impact ledger/);
  assert.match(panel, /item\.scoreDeltas/);
  assert.match(panel, /item\.appliedRules/);
  assert.match(panel, /item\.gates/);
  assert.match(panel, /item\.penalties/);
  assert.match(panel, /item\.technologies/);
  assert.match(panel, /meetings = \[\]/);
  assert.match(panel, /documents = \[\]/);
  assert.match(panel, /auditEvents = \[\]/);
});

test("guards confirmed discovery answers and exposes penalty traceability", async () => {
  const [workspace, workspaceStyles] = await Promise.all([
    read("app/GuidedDiscoveryWorkspace.tsx"),
    read("app/GuidedDiscoveryWorkspace.module.css"),
  ]);

  assert.match(workspace, /export function hasGuidedDiscoveryAnswerInput/);
  assert.match(workspace, /status === "confirmed" && !canConfirmAnswer/);
  assert.match(workspace, /disabled=\{saving \|\| !canConfirmAnswer\}/);
  assert.match(workspace, /onClick=\{\(\) => save\("unknown"\)\}/);
  assert.match(workspace, /penaltyChanges\?: Array<Record<string, unknown>>/);
  assert.match(workspace, /persistedDelta\?\.penaltyChanges/);
  assert.match(workspace, /rulePenaltyTrace\?\.changes/);
  assert.match(workspace, /\["penalties", locale === "pt-BR" \? "Penalidades" : "Penalties"\]/);
  assert.match(workspaceStyles, /\.validationHint/);
});

test("keeps all four account workspace tabs visible on mobile", async () => {
  const styles = await read("app/v5.css");

  assert.match(styles, /\.v5-account-tabs\.v4-account-tabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(styles, /\.v5-account-tabs\.v4-account-tabs button\s*\{[\s\S]*?min-width:\s*0/);
});
