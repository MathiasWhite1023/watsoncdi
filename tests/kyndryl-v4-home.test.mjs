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
  assert.match(component, /function CapabilityExplorer/);
  assert.match(component, /<StructuredListWrapper/);
  assert.match(component, /<Search/);
  assert.match(component, /<ProgressBar/);
});

test("puts the opportunity heatmap before the compact capability explorer", async () => {
  const [component, styles] = await Promise.all([
    read("app/KyndrylV4Home.tsx"),
    read("app/KyndrylV4Home.module.css"),
  ]);
  const home = component.slice(component.indexOf("export function KyndrylV4Home"));

  assert.ok(home.indexOf("<PortfolioOpportunityHeatmap") > -1);
  assert.ok(home.indexOf("<CapabilityExplorer") > -1);
  assert.ok(
    home.indexOf("<PortfolioOpportunityHeatmap") <
      home.indexOf("<CapabilityExplorer"),
  );
  assert.doesNotMatch(styles, /min-height:\s*22rem/);
  assert.match(styles, /\.homeIntro\s*\{[\s\S]*?min-height:\s*7\.5rem/);
});

test("defaults to an IBM and ecosystem solution heatmap and keeps capability mode available", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /CDI_TECHNOLOGIES/);
  assert.match(component, /useState<"solutions" \| "capabilities">\("solutions"\)/);
  assert.match(component, /<ContentSwitcher/);
  assert.match(component, /<Switch name="solutions"/);
  assert.match(component, /<Switch name="capabilities"/);
  assert.match(component, /function PortfolioTechnologyHeatmap/);
  assert.match(component, /function PortfolioCapabilityHeatmap/);
  assert.match(component, /solutionCapability === "all"/);
  assert.match(component, /id="v4-solution-capability-filter"/);
  assert.match(component, /technology\.capabilityKeys\.includes/);
});

test("shows product fit, confidence, decision and gate without inventing a zero", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /export type KyndrylV4TechnologySignal/);
  assert.match(component, /technologySignals\?: KyndrylV4TechnologySignal\[\]/);
  assert.match(component, /onOpenStrategy\?: \(accountId: string, technologyId: string\)/);
  assert.match(component, /const assessed = Boolean\(signal && fit != null\)/);
  assert.match(component, /<strong>\{fit\}%<\/strong>/);
  assert.match(component, /\{copy\.confidenceShort\} \{confidence\}%/);
  assert.match(component, /decisionLabel\(signal\?\.decisionBand, locale\)/);
  assert.match(component, /gateLabel\(signal\?\.gateStatus, locale\)/);
  assert.match(component, /\{copy\.solutionNotAssessed\}/);
  assert.doesNotMatch(component, /fit \|\| 0/);
});

test("maps persisted product reviews into the Home and opens product cells in Strategy", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /data\.cdiTechnologyReviews\.filter/);
  assert.match(page, /review\.catalogVersion === CDI_CAPABILITY_CATALOG_VERSION/);
  assert.match(page, /const hasProductEvidence = Boolean/);
  assert.match(page, /live\?\.evidence\.length \|\| stored\?\.trace\.length/);
  assert.match(page, /technologySignals,/);
  assert.match(page, /onOpenStrategy=\{\(accountId\) => openAccount\(accountId, "strategy"\)\}/);
});

test("orders capability discovery by the largest portfolio gap and includes related solutions", async () => {
  const component = await read("app/KyndrylV4Home.tsx");

  assert.match(component, /technology\.capabilityKeys\.includes\(capability\.key\)/);
  assert.match(
    component,
    /right\.coverage\.total - right\.coverage\.reviewed/,
  );
  assert.match(component, /copy\.relatedSolutions/);
  assert.match(component, /aria-haspopup="dialog"/);
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
  assert.match(component, /onOpenStrategy\(account\.id, technology\.id\)/);
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
  assert.match(component, /Soluções IBM e ecossistema/);
  assert.match(component, /Não avaliado/);
  assert.match(component, /Workspace de contas/);
});
