import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

async function loadTypeScriptModule(path) {
  const [typescript, source] = await Promise.all([
    import("typescript"),
    readProjectFile(path),
  ]);
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const executable = compiled.replace(
    'from "zod"',
    `from ${JSON.stringify(import.meta.resolve("zod"))}`,
  );
  return import(
    `data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`
  );
}

function keyTree(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return typeof value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, keyTree(value[key])]),
  );
}

test("defaults to English and keeps complete English/Portuguese dictionary parity", async () => {
  const [i18n, appCopy] = await Promise.all([
    loadTypeScriptModule("lib/i18n.ts"),
    loadTypeScriptModule("lib/app-messages.ts"),
  ]);

  assert.equal(i18n.DEFAULT_LOCALE, "en-US");
  assert.deepEqual(i18n.SUPPORTED_LOCALES, ["en-US", "pt-BR"]);
  assert.equal(i18n.LOCALE_COOKIE, "watson-cdi-locale");
  assert.deepEqual(
    keyTree(i18n.messages["en-US"]),
    keyTree(i18n.messages["pt-BR"]),
  );
  assert.deepEqual(
    keyTree(appCopy.appMessages["en-US"]),
    keyTree(appCopy.appMessages["pt-BR"]),
  );
  assert.equal(i18n.messages["en-US"].brand.name, "Watson CDI");
  assert.equal(
    i18n.messages["en-US"].brand.subtitle,
    "Customer Discovery Intelligence",
  );
  assert.equal(
    i18n.messages["pt-BR"].brand.subtitle,
    "Inteligência de descoberta do cliente",
  );
  assert.equal(i18n.translate("en-US", "navigation.home"), "Home");
  assert.equal(i18n.translate("pt-BR", "navigation.home"), "Início");
  assert.equal(
    i18n.translate("en-US", "guided.addressed", { addressed: 2, total: 6 }),
    "2 of 6 addressed",
  );
  assert.equal(
    i18n.translate("pt-BR", "guided.addressed", { addressed: 2, total: 6 }),
    "2 de 6 abordadas",
  );
});

test("resolves the locale in explicit-header, cookie, English-default order", async () => {
  const i18n = await loadTypeScriptModule("lib/i18n.ts");

  assert.equal(i18n.resolveRequestLocale(), "en-US");
  assert.equal(i18n.resolveRequestLocale({ cookie: "pt-BR" }), "pt-BR");
  assert.equal(
    i18n.resolveRequestLocale({ explicit: "en-US", cookie: "pt-BR" }),
    "en-US",
  );
  assert.equal(
    i18n.resolveRequestLocale({ explicit: "pt", cookie: "en-US" }),
    "pt-BR",
  );
  assert.equal(
    i18n.resolveRequestLocale({ explicit: "fr-FR", cookie: "fr-FR" }),
    "en-US",
  );
  assert.equal(i18n.localizeSystemValue("en-US", "Alta"), "High");
  assert.equal(i18n.localizeSystemValue("pt-BR", "accepted"), "Aceita");

  const headers = i18n.localeRequestHeaders("pt-BR", {
    "x-existing": "preserved",
  });
  assert.equal(headers.get("Accept-Language"), "pt-BR");
  assert.equal(headers.get("X-Watson-CDI-Locale"), "pt-BR");
  assert.equal(headers.get("x-existing"), "preserved");
});

test("keeps the guided-discovery catalog IDs and scoring stable across locales", async () => {
  const guided = await loadTypeScriptModule("lib/guided-discovery.ts");
  const english = guided.GUIDED_DISCOVERY_CATALOG.map((question) =>
    guided.getLocalizedQuestionById(question.id, "en-US"),
  );
  const portuguese = guided.GUIDED_DISCOVERY_CATALOG.map((question) =>
    guided.getLocalizedQuestionById(question.id, "pt-BR"),
  );

  assert.equal(english.length, 30);
  assert.equal(portuguese.length, 30);
  assert.deepEqual(
    english.map((question) => question.id),
    portuguese.map((question) => question.id),
  );
  assert.deepEqual(
    english.map((question) => question.pillar),
    portuguese.map((question) => question.pillar),
  );
  assert.notEqual(english[0].question, portuguese[0].question);
  assert.equal(english[0].input.kind, portuguese[0].input.kind);
  assert.equal(
    english[0].input.options.length,
    portuguese[0].input.options.length,
  );
  assert.deepEqual(
    english[0].input.options.map((option) =>
      guided.canonicalizeGuidedDiscoveryOption(english[0].id, option),
    ),
    portuguese[0].input.options,
  );

  const englishAnswer = [
    {
      questionId: "base-business-objective",
      status: "confirmed",
      evidenceStatus: "confirmed",
      answerText: "tag showback chargeback forecast budget sponsor",
      structured: { value: 4 },
    },
  ];
  const portugueseAnswer = [
    {
      questionId: "base-business-objective",
      status: "confirmed",
      evidenceStatus: "confirmed",
      answerText: "tag showback chargeback forecast budget sponsor",
      structured: { value: 4 },
    },
  ];
  assert.deepEqual(
    guided.rankPillarsFromAnswers(englishAnswer),
    guided.rankPillarsFromAnswers(portugueseAnswer),
  );
});

test("uses one consistent low, medium and high scale in every health matrix", async () => {
  const health = await loadTypeScriptModule("lib/account-health.ts");

  assert.equal(health.healthBand(0), "low");
  assert.equal(health.healthBand(39), "low");
  assert.equal(health.healthBand(40), "medium");
  assert.equal(health.healthBand(69), "medium");
  assert.equal(health.healthBand(70), "high");
  assert.equal(health.healthBand(100), "high");
  assert.equal(health.clampHealthScore(-12), 0);
  assert.equal(health.clampHealthScore(140), 100);
});

test("calculates relationship, evidence and discovery health from grounded account data", async () => {
  const health = await loadTypeScriptModule("lib/account-health.ts");
  const accountId = "account-1";
  const stakeholders = [
    {
      id: "ceo",
      discoveryId: accountId,
      role: "CEO",
      area: "Executive",
      influence: "High",
      stance: "Ally",
      status: "confirmed",
    },
    {
      id: "cio",
      discoveryId: accountId,
      role: "CIO",
      area: "Technology",
      influence: "Alta",
      stance: "Neutral",
      status: "confirmed",
    },
    {
      id: "fin",
      discoveryId: accountId,
      role: "Finance Director",
      area: "Finance",
      influence: "Medium",
      status: "confirmed",
    },
    {
      id: "ops",
      discoveryId: accountId,
      role: "Operations Manager",
      area: "Operations",
      influence: "Média",
      status: "confirmed",
    },
    {
      id: "draft",
      discoveryId: accountId,
      role: "CFO",
      area: "Finance",
      influence: "High",
      status: "suggested",
    },
  ];
  assert.equal(health.calculateRelationshipCoverage(stakeholders), 100);
  assert.equal(health.hasConfirmedSponsor(stakeholders), true);
  assert.equal(
    health.calculateEvidenceConfidence([
      { discoveryId: accountId, confidence: 80, evidenceStatus: "confirmed" },
      { discoveryId: accountId, confidence: 60, evidenceStatus: "stale" },
    ]),
    58,
  );

  const account = {
    id: accountId,
    customerName: "Acme",
    progress: 45,
    priority: "Alta",
    updatedAt: "2026-07-16T10:00:00.000Z",
    answers: [{}, {}],
    scores: [
      {
        short: "FinOps",
        alignment: 78,
        value: 84,
        readiness: 52,
        confidence: 66,
        evidence: ["meeting-1"],
        action: "Validate owner",
      },
      {
        short: "Trusted Data",
        alignment: 42,
        value: 60,
        readiness: 38,
        confidence: 54,
        evidence: [],
      },
    ],
  };
  const row = health.calculateAccountHealth(account, {
    stakeholders,
    events: [
      {
        id: "event-1",
        discoveryId: accountId,
        confidence: 80,
        evidenceStatus: "confirmed",
        occurredAt: "2026-07-15T10:00:00.000Z",
      },
    ],
    actions: [
      { discoveryId: accountId, priorityScore: 91, status: "proposal" },
    ],
    guidedDiscovery: {
      discoveryId: accountId,
      metrics: { coveragePercent: 62, confirmedWithEvidence: 5 },
      session: { updatedAt: "2026-07-16T09:00:00.000Z" },
    },
  });
  assert.equal(row.priority, "high");
  assert.equal(row.actionPriority, 91);
  assert.equal(row.cells.opportunityPotential.value, 78);
  assert.equal(row.cells.preCrmMaturity.value, 45);
  assert.equal(row.cells.relationshipCoverage.value, 100);
  assert.equal(row.cells.evidenceConfidence.value, 80);
  assert.equal(row.cells.discoveryCoverage.value, 62);
  assert.equal(row.cells.relationshipCoverage.destination, "relationships");
  assert.equal(row.cells.discoveryCoverage.destination, "guided-discovery");
});

test("builds distinct Capability Health and Portfolio Fit datasets", async () => {
  const health = await loadTypeScriptModule("lib/account-health.ts");
  const account = {
    id: "account-1",
    customerName: "Acme",
    progress: 48,
    priority: "medium",
    updatedAt: "2026-07-16T10:00:00.000Z",
    scores: [
      {
        short: "FinOps",
        alignment: 81,
        value: 74,
        readiness: 63,
        confidence: 77,
        evidence: ["meeting-1"],
        action: "Confirm budget",
      },
    ],
  };
  const capabilities = health.buildCapabilityHealth({
    account,
    guidedDiscovery: {
      discoveryId: account.id,
      metrics: { coveragePercent: 52, confirmedWithEvidence: 3 },
      pillars: [{ key: "finops", coveragePercent: 68 }],
    },
    playbooks: [
      {
        key: "FinOps",
        label: "FinOps",
        product: "Apptio",
        question: "Who owns the cloud budget?",
        workshop: "FinOps workshop",
        nextStep: "Map cost owners",
      },
    ],
  });
  const finops = capabilities.find((row) => row.pillarKey === "finops");
  assert.equal(capabilities.length, 6);
  assert.equal(finops.cells.alignment.value, 81);
  assert.equal(finops.cells.businessValue.value, 74);
  assert.equal(finops.cells.readiness.value, 63);
  assert.equal(finops.cells.confidence.value, 77);
  assert.equal(finops.cells.discoveryCoverage.value, 68);
  assert.equal(finops.product, "Apptio");

  const fit = health.buildPortfolioFit([account]);
  assert.equal(fit.length, 1);
  assert.equal(fit[0].cells.length, 6);
  assert.equal(fit[0].leadingCapability, "FinOps");
  assert.equal(fit[0].leadingFit, 81);
});

test("wires three accessible, interactive heatmap surfaces without duplicating purpose", async () => {
  const [component, styles, page] = await Promise.all([
    readProjectFile("app/HealthHeatmaps.tsx"),
    readProjectFile("app/HealthHeatmaps.module.css"),
    readProjectFile("app/page.tsx"),
  ]);

  assert.match(component, /export function AccountHealthHeatmap/);
  assert.match(component, /export function CapabilityHealthHeatmap/);
  assert.match(component, /export function PortfolioFitHeatmap/);
  assert.match(component, /role="region"/);
  assert.match(component, /tabIndex=\{0\}/);
  assert.match(component, /role="tooltip"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /0–39/);
  assert.match(component, /40–69/);
  assert.match(component, /70–100/);
  assert.match(styles, /position:\s*sticky/);
  assert.match(page, /<AccountHealthHeatmap/);
  assert.match(page, /<CapabilityHealthHeatmap/);
  assert.match(page, /<PortfolioFitHeatmap/);
});

test("keeps V5.2 storage additive and locale-specific", async () => {
  const [migration, schema] = await Promise.all([
    readProjectFile("drizzle/0007_bilingual_account_health.sql"),
    readProjectFile("db/schema.ts"),
  ]);

  assert.match(migration, /CREATE TABLE `daily_briefing_variants`/);
  assert.match(migration, /CREATE TABLE `content_translations`/);
  assert.match(migration, /ALTER TABLE `ai_runs` ADD `locale`/);
  assert.match(migration, /daily_briefing_variants_owner_date_locale_idx/);
  assert.match(migration, /content_translations_source_locale_idx/);
  assert.doesNotMatch(migration, /^\s*(?:DROP\b|RENAME\b|DELETE\s+FROM\b)/im);
  assert.match(schema, /dailyBriefingVariants/);
  assert.match(schema, /contentTranslations/);
  assert.match(schema, /locale:\s*text\("locale"\)/);
});

test("translation accepts only an authorized source reference and never arbitrary raw text", async () => {
  const [route, api, localeApi] = await Promise.all([
    readProjectFile("app/api/accounts/[id]/translations/route.ts"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("lib/api-locale.ts"),
  ]);

  assert.match(route, /scope:\s*"private"/);
  assert.match(route, /action:\s*"translate"/);
  assert.match(api, /accountForMutation\(db, id, request\)/);
  assert.match(api, /visibility = 'private' AND owner_email = \?/);
  assert.match(
    api,
    /"text" in body \|\| "content" in body \|\| "rawText" in body/,
  );
  assert.match(api, /RAW_TRANSLATION_TEXT_REJECTED/);
  assert.match(api, /sourceRef/);
  assert.match(api, /TRANSLATION_SOURCE_NOT_FOUND/);
  assert.match(api, /WHERE id = \? AND discovery_id = \?/);
  assert.match(api, /source_fingerprint/);
  assert.match(api, /The original content was preserved/);
  assert.match(localeApi, /Content-Language/);
  assert.match(localeApi, /errorCode/);
  assert.doesNotMatch(route, /GEMINI_API_KEY|WATSONX_API_KEY/);
});

test("keeps private account intelligence aligned with the active response locale", async () => {
  const api = await readProjectFile("app/api/discoveries/route.ts");

  assert.match(api, /recomputeOptions\.responseLocale \|\| "en-US"/);
  assert.match(api, /latestLocale !== responseLocale/);
  assert.match(api, /agent = 'account-orchestrator'/);
  assert.match(api, /backfillV4\(db, rows\.results, responseLocale\)/);
  assert.match(api, /responseLocale: locale/);
  assert.match(api, /\\bdirector\\b/);
  assert.match(api, /"Account memory"/);
  assert.match(api, /"New information"/);
});

test("localizes document APIs and projected account responses", async () => {
  const [documents, actions, guided, plan, relationships] = await Promise.all([
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
    readProjectFile("app/api/accounts/[id]/actions/route.ts"),
    readProjectFile("app/api/accounts/[id]/guided-discovery/route.ts"),
    readProjectFile("app/api/accounts/[id]/plan/route.ts"),
    readProjectFile("app/api/accounts/[id]/relationships/route.ts"),
  ]);

  assert.match(documents, /resolveResponseLocale\(request\)/);
  assert.match(documents, /DOCUMENT_TOO_LARGE/);
  assert.match(documents, /localizedJson\(locale/);
  assert.match(
    documents,
    /recomputeAccount\(db, id, \{ responseLocale: locale \}\)/,
  );
  for (const route of [actions, guided, plan, relationships]) {
    assert.match(route, /localizedJson\(locale/);
  }
});

test("returns a localized stable error for malformed JSON objects", async () => {
  const localeApi = await loadTypeScriptModule("lib/api-locale.ts");
  const result = await localeApi.parseLocalizedJsonObject(
    new Request("https://example.test/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Watson-CDI-Locale": "pt-BR",
      },
      body: "{invalid",
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 400);
  assert.equal(result.response.headers.get("Content-Language"), "pt-BR");
  assert.deepEqual(await result.response.json(), {
    errorCode: "INVALID_JSON",
    error: "Envie um objeto JSON válido no corpo da requisição.",
  });
});
