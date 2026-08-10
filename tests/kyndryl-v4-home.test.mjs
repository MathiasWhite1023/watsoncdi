import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("defines an isolated account-centric Home and Accounts integration contract", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /export type KyndrylV4HomeProps/);
  assert.match(component, /export type KyndrylV4AccountsProps/);
  assert.match(component, /export type KyndrylV4Account/);
  assert.match(component, /export function KyndrylV4Home/);
  assert.match(component, /export function KyndrylV4Accounts/);
  assert.match(component, /onStartDiscovery\(account\.id, capability\.key\)/);
});

test("renders the canonical 14 capabilities without duplicating a catalog", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /CDI_CAPABILITIES\.map/);
  assert.match(component, /CDI_CAPABILITY_CATALOG_VERSION/);
  assert.match(component, /signal\.catalogVersion !== CDI_CAPABILITY_CATALOG_VERSION/);
  assert.match(component, /return "needs_review"/);
  assert.match(component, /<ClickableTile/);
  assert.match(component, /<ProgressBar/);
});

test("counts only current reviewed states and includes not relevant in coverage", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /status === "reviewed_gaps"/);
  assert.match(component, /status === "reviewed_sufficient"/);
  assert.match(component, /status === "not_relevant"/);
  assert.match(component, /Math\.round\(\(reviewed \/ accounts\.length\) \* 100\)/);
  assert.match(component, /summarizeKyndrylV4CapabilityCoverage/);
});

test("keeps unassessed heatmap cells scoreless and directly actionable", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /status === "not_started"/);
  assert.match(component, /\? null\s+: clampPercent\(signal\?\.technologyFit\)/);
  assert.match(component, /aria-label=\{accessibleValue\}/);
  assert.match(component, /onStartDiscovery\(account\.id, capability\.key\)/);
  assert.match(component, /role="region"/);
  assert.match(component, /tabIndex=\{0\}/);
});

test("provides a searchable and filterable Carbon accounts table", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /<DataTable/);
  assert.match(component, /<Search/);
  assert.match(component, /<Select/);
  assert.match(component, /needs_discovery/);
  assert.match(component, /leadingCapability/);
  assert.match(component, /lastActivity/);
  assert.match(component, /nextStep/);
});

test("keeps English default and provides complete Portuguese surface copy", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /locale = "en-US"/);
  assert.match(component, /"pt-BR": \{/);
  assert.match(component, /Escolha uma conta/);
  assert.match(component, /Heatmap da carteira/);
  assert.match(component, /Workspace de contas/);
});
