import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("documents the portfolio project instead of the starter", async () => {
  const [readme, packageJson] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("package.json"),
  ]);

  assert.match(readme, /# IBM Opportunity Heatmap/);
  assert.match(readme, /Live demo:/);
  assert.match(readme, /not an official IBM product/i);
  assert.match(packageJson, /"name": "ibm-opportunity-heatmap"/);
});

test("keeps the core discovery intelligence surfaces wired", async () => {
  const [page, api, visuals] = await Promise.all([
    readProjectFile("app/page.tsx"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/CarbonVisuals.tsx"),
  ]);

  assert.match(page, /Customer Discovery Agent/);
  assert.match(page, /FinOps Intelligence/);
  assert.match(page, /Trusted Data Agent/);
  assert.match(page, /Explainability Agent/);
  assert.match(page, /Customer Capability Heatmap/);

  assert.match(api, /function analyze\(answers: Answer\[\]\)/);
  assert.match(api, /FinOps & Technology Financial Management/);
  assert.match(api, /AI Governance/);
  assert.match(api, /audit_events/);

  assert.match(visuals, /@carbon\/charts-react/);
  assert.match(visuals, /DonutChart/);
  assert.match(visuals, /GroupedBarChart/);
});
