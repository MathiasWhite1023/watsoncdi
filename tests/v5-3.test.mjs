import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

async function loadCommercialProofModule() {
  const [typescript, source] = await Promise.all([
    import("typescript"),
    readProjectFile("lib/commercial-proof.ts"),
  ]);
  const selfContained = source.replace(
    'import { localizedText, type ResponseLocale } from "./api-locale";',
    `type ResponseLocale = "en-US" | "pt-BR";
const localizedText = (locale: ResponseLocale, en: string, pt: string) => locale === "pt-BR" ? pt : en;`,
  );
  const compiled = typescript.transpileModule(selfContained, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}

const score = (overrides = {}) => ({
  name: "FinOps",
  short: "FinOps",
  alignment: 50,
  value: 60,
  readiness: 40,
  confidence: 55,
  ...overrides,
});

const state = (overrides = {}) => ({
  progress: 35,
  stage: "Discovery",
  scores: [score()],
  entities: [],
  stakeholders: [],
  hypotheses: [],
  actions: [],
  evidenceCount: 1,
  memoryVersion: 1,
  updatedAt: "2026-07-20T10:00:00.000Z",
  ...overrides,
});

test("keeps the V5.3 commercial-proof migration additive", async () => {
  const [migration, schema, journal] = await Promise.all([
    readProjectFile("drizzle/0008_minor_thunderbird.sql"),
    readProjectFile("db/schema.ts"),
    readProjectFile("drizzle/meta/_journal.json"),
  ]);

  for (const table of [
    "account_change_sets",
    "commercial_agent_runs",
    "crm_handoffs",
    "account_impact_metrics",
  ]) {
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  }
  assert.doesNotMatch(
    migration,
    /^\s*(?:DROP\b|RENAME\b|DELETE\s+FROM\b|TRUNCATE\b)/im,
  );
  assert.match(schema, /export const accountChangeSets/);
  assert.match(schema, /export const commercialAgentRuns/);
  assert.match(schema, /export const crmHandoffs/);
  assert.match(schema, /export const accountImpactMetrics/);
  assert.match(schema, /pending_review/);
  assert.match(schema, /requiresHumanApproval|humanValidationStatus/);
  assert.match(journal, /0008_minor_thunderbird/);
});

test("builds a reviewable before-and-after change set from a conversation", async () => {
  const commercial = await loadCommercialProofModule();
  const before = state();
  const after = state({
    progress: 52,
    scores: [score({ alignment: 74, readiness: 58, confidence: 70 })],
    entities: [{ id: "pain-1", type: "pain", name: "Unallocated cloud spend" }],
    stakeholders: [
      {
        id: "person-1",
        name: "Alex Morgan",
        role: "CIO",
        influence: "High",
      },
    ],
    hypotheses: [
      {
        id: "hypothesis-1",
        capabilityKey: "FinOps",
        title: "Cloud cost governance",
        problem: "Spend cannot be allocated by product.",
        products: ["IBM Apptio"],
        stakeholderIds: ["person-1"],
        evidence: [{ sourceId: "meeting-1", title: "FinOps meeting" }],
        gaps: ["Confirm budget"],
        confidence: 74,
        stage: "validation",
        nextStep: "Validate showback ownership",
      },
    ],
    actions: [
      {
        id: "action-1",
        type: "next_best_action",
        title: "Confirm cost owner",
        status: "proposal",
        priorityScore: 84,
        nextStep: "Speak with the CIO",
      },
    ],
    evidenceCount: 3,
    memoryVersion: 2,
  });

  const changeSet = commercial.buildAccountChangeSet(before, after, {
    stakeholders: ["Alex Morgan"],
    systems: ["AWS"],
    painPoints: ["Unallocated cloud spend"],
    themes: ["FinOps"],
    risks: ["No confirmed budget"],
    nextActions: ["Validate showback ownership"],
  });

  assert.deepEqual(changeSet.progress, { before: 35, after: 52, delta: 17 });
  assert.equal(changeSet.capabilities[0].delta.alignment, 24);
  assert.equal(changeSet.capabilities[0].delta.readiness, 18);
  assert.equal(changeSet.entities.added[0].id, "pain-1");
  assert.equal(changeSet.stakeholders.added[0].id, "person-1");
  assert.equal(changeSet.hypotheses[0].id, "hypothesis-1");
  assert.equal(changeSet.actions[0].id, "action-1");
  assert.deepEqual(changeSet.evidence, { before: 1, after: 3, delta: 2 });
  assert.deepEqual(changeSet.memoryVersion, { before: 1, after: 2 });
});

test("shows logical agents as deterministic workflow roles when no model is configured", async () => {
  const commercial = await loadCommercialProofModule();
  const changeSet = commercial.buildAccountChangeSet(state(), state(), {
    stakeholders: [],
    systems: [],
    painPoints: [],
    themes: [],
    risks: [],
    nextActions: [],
  });
  const runs = commercial.buildLogicalPipeline({
    provider: "",
    model: null,
    usedModel: false,
    sourceIds: ["meeting-1"],
    changeSet,
    locale: "en-US",
  });

  assert.deepEqual(
    runs.map((run) => run.agent),
    [
      "source-normalizer",
      "account-memory",
      "stakeholder-intelligence",
      "capability-fit",
      "opportunity-hypothesis",
      "next-best-action",
      "governance",
    ],
  );
  assert.ok(runs.every((run) => run.engineKind === "deterministic"));
  assert.ok(runs.every((run) => run.provider === "deterministic-rules"));
  assert.ok(runs.every((run) => run.model === ""));
  assert.ok(runs.every((run) => run.status === "fallback"));
  assert.ok(runs.every((run) => run.humanValidationStatus === "pending"));
  assert.ok(runs.every((run) => run.sourceIds.includes("meeting-1")));
});

test("creates a human-governed pre-CRM handoff without an external write", async () => {
  const commercial = await loadCommercialProofModule();
  const handoff = commercial.buildCrmHandoff({
    account: {
      id: "account-1",
      name: "Acme Corp",
      industry: "Retail",
      owner: "Seller",
      stage: "Validation",
      progress: 72,
      summary: "Cloud cost governance is fragmented.",
    },
    hypothesis: {
      id: "hypothesis-1",
      capabilityKey: "FinOps",
      title: "Cloud cost governance",
      problem: "Spend cannot be allocated by product.",
      products: ["IBM Apptio"],
      stakeholderIds: ["person-1"],
      evidence: [{ sourceId: "meeting-1", title: "FinOps meeting" }],
      gaps: [],
      confidence: 78,
      stage: "qualified",
      nextStep: "Run a cost-allocation workshop",
    },
    score: score({ alignment: 82, readiness: 68, confidence: 76 }),
    stakeholders: [
      {
        id: "person-1",
        name: "Alex Morgan",
        role: "CIO",
        influence: "Alta",
        source: "confirmed",
      },
    ],
    objectives: ["Improve unit economics"],
    sourceIds: ["meeting-1"],
    locale: "en-US",
  });

  assert.equal(handoff.qualification.eligible, true);
  assert.equal(handoff.payload.governance.requiresHumanApproval, true);
  assert.equal(handoff.payload.governance.externalWritePerformed, false);
  assert.equal(handoff.payload.sourceIds[0], "meeting-1");
  assert.match(handoff.copyText, /Human approval required/);
  assert.match(handoff.copyText, /eligible for review/);
});

test("reports observed impact and refuses to infer an efficiency percentage", async () => {
  const commercial = await loadCommercialProofModule();
  const metric = commercial.buildImpactMetrics({
    discoveryStartedAt: "2026-07-20T10:00:00.000Z",
    qualifiedAt: "2026-07-20T12:30:00.000Z",
    computedAt: "2026-07-20T13:00:00.000Z",
    questionsAddressed: 9,
    questionsConfirmed: 7,
    discoveryCoverage: 68,
    openGaps: 2,
    evidenceCount: 12,
    confirmedEvidenceCount: 9,
    meetingCount: 3,
    qualifiedHypothesisCount: 1,
  });

  assert.equal(metric.elapsedMinutes, 150);
  assert.equal(metric.discoveryCoverage, 68);
  assert.equal(metric.confirmedEvidenceCount, 9);
  assert.match(metric.methodology.claims, /No percentage .* is inferred/i);
  assert.match(metric.methodology.claims, /measured manual baseline/i);
  assert.equal("timeSavedPercent" in metric, false);
});

test("wires the commercial proof, evidence navigation and customer context surfaces", async () => {
  const [commercialPanels, contextMap, page, api] = await Promise.all([
    readProjectFile("app/CommercialProofPanels.tsx"),
    readProjectFile("app/CustomerContextMap.tsx"),
    readProjectFile("app/page.tsx"),
    readProjectFile("app/api/discoveries/route.ts"),
  ]);

  assert.match(commercialPanels, /export function ConversationImpactPanel/);
  assert.match(commercialPanels, /export function AnalysisPipelinePanel/);
  assert.match(commercialPanels, /export function CrmHandoffModal/);
  assert.match(commercialPanels, /export function ImpactMetricsPanel/);
  assert.match(commercialPanels, /onSourceSelect/);
  assert.match(commercialPanels, /onMarkHandedOff/);
  assert.match(contextMap, /export default function CustomerContextMap/);
  assert.match(contextMap, /<ReactFlow/);
  assert.match(contextMap, /onEvidenceActivate/);
  assert.match(contextMap, /objective/);
  assert.match(contextMap, /initiative/);
  assert.match(contextMap, /capability/);
  assert.match(page, /<CustomerContextMap/);
  assert.match(page, /source-\$\{event\.sourceId \|\| event\.id\}/);

  for (const action of [
    "commercial_proof",
    "change_set_status",
    "handoff_preview",
    "handoff_mark",
  ]) {
    assert.match(api, new RegExp(`body\\.action === "${action}"`));
  }
  assert.match(api, /accountForMutation\(db, id, request\)/);
  assert.match(api, /requiresHumanApproval: true/);
  assert.match(api, /externalWritePerformed: false/);
  assert.match(api, /HANDOFF_APPROVAL_REQUIRED/);
});

test("does not expose a temporary provider brand in product-facing strings", async () => {
  const typescript = await import("typescript");
  const visibleFiles = [
    "app/page.tsx",
    "lib/app-messages.ts",
    "app/CommercialProofPanels.tsx",
    "app/CustomerContextMap.tsx",
  ];
  const strings = [];

  for (const path of visibleFiles) {
    const source = await readProjectFile(path);
    const file = typescript.createSourceFile(
      path,
      source,
      typescript.ScriptTarget.Latest,
      true,
      typescript.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (
        typescript.isStringLiteral(node) ||
        typescript.isNoSubstitutionTemplateLiteral(node)
      ) {
        strings.push({ path, value: node.text });
      }
      typescript.forEachChild(node, visit);
    };
    visit(file);
  }

  const branded = strings.filter(({ value }) => /\bgemini\b/i.test(value));
  assert.deepEqual(branded, []);

  const readme = await readProjectFile("README.md");
  assert.doesNotMatch(readme, /\bgemini\b/i);
  const changelog = await readProjectFile("CHANGELOG.md");
  const currentRelease = changelog.split("## v5.2-")[0];
  assert.doesNotMatch(currentRelease, /\bgemini\b/i);
});
