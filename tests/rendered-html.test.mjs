import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const root = new URL("../", import.meta.url);
const execFileAsync = promisify(execFile);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

let providerModule;
async function loadProviderModule() {
  if (providerModule) return providerModule;
  const [typescript, source] = await Promise.all([
    import("typescript"),
    readProjectFile("lib/ai-provider.ts"),
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
  providerModule = await import(
    `data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`
  );
  return providerModule;
}

let guidedModule;
async function loadGuidedModule() {
  if (guidedModule) return guidedModule;
  const [typescript, source, kyndrylSource] = await Promise.all([
    import("typescript"),
    readProjectFile("lib/guided-discovery.ts"),
    readProjectFile("lib/kyndryl-discovery.ts"),
  ]);
  const kyndrylCompiled = typescript.transpileModule(kyndrylSource, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const kyndrylUrl = `data:text/javascript;base64,${Buffer.from(kyndrylCompiled).toString("base64")}`;
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const executable = compiled.replace(
    'from "zod"',
    `from ${JSON.stringify(import.meta.resolve("zod"))}`,
  ).replace('from "./kyndryl-discovery"', `from ${JSON.stringify(kyndrylUrl)}`);
  guidedModule = await import(
    `data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`
  );
  return guidedModule;
}

const accountAnswer = (answer) => ({
  answer,
  confidence: 82,
  citationIds: ["source-1"],
  facts: ["Fato confirmado"],
  hypotheses: [],
  inferences: [],
  suggestedActions: ["Validar próximo passo"],
});

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });

test("documents Watson CDI V5.3.1 and its non-destructive rollback path", async () => {
  const [readme, changelog, packageJson] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("CHANGELOG.md"),
    readProjectFile("package.json"),
  ]);

  assert.match(readme, /# Watson CDI — Customer Discovery Intelligence/);
  assert.match(
    readme,
    /Account Intelligence platform for the work that happens before CRM/,
  );
  assert.match(readme, /English \(US\) is the default/);
  assert.match(readme, /Account Health/);
  assert.match(readme, /Capability Health/);
  assert.match(readme, /Portfolio Fit/);
  assert.match(readme, /WATSONX_API_KEY/);
  assert.match(readme, /v5\.3-commercial-proof/);
  assert.match(readme, /codex\/open-workspace-v5-3-1/);
  assert.match(readme, /Customer Context Map/);
  assert.match(readme, /observed values/i);
  assert.match(changelog, /v5\.2-bilingual-account-health/);
  assert.match(changelog, /v5\.3-commercial-proof/);
  assert.match(
    changelog,
    /Status: (?:published|validation and production deployment pending)/,
  );
  assert.match(changelog, /v5-proactive-copilot-gemini/);
  assert.match(changelog, /v4-proactive-account-intelligence/);
  assert.match(changelog, /migrations are additive/i);
  assert.match(readme, /Live demo:/);
  assert.match(readme, /not an official IBM product/i);
  assert.match(packageJson, /"name": "watson-cdi"/);
  assert.match(packageJson, /"version": "5\.3\.1"/);
});

test("keeps the V5 proactive account intelligence surfaces wired", async () => {
  const [
    page,
    appMessages,
    i18n,
    api,
    engine,
    visuals,
    graph,
    charts,
    migration,
    stakeholderMigration,
    v4Migration,
    v5Migration,
    auth,
    documents,
  ] = await Promise.all([
    readProjectFile("app/page.tsx"),
    readProjectFile("lib/app-messages.ts"),
    readProjectFile("lib/i18n.ts"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("lib/account-intelligence.ts"),
    readProjectFile("app/CarbonVisuals.tsx"),
    readProjectFile("app/RelationshipGraph.tsx"),
    readProjectFile("app/V5Charts.tsx"),
    readProjectFile("drizzle/0001_high_skaar.sql"),
    readProjectFile("drizzle/0002_calm_miek.sql"),
    readProjectFile("drizzle/0003_certain_epoch.sql"),
    readProjectFile("drizzle/0005_unique_mattie_franklin.sql"),
    readProjectFile("app/chatgpt-auth.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
  ]);

  assert.match(page, /const navItems/);
  assert.match(page, /const accountModeItems/);
  assert.match(page, /LanguageSwitcher/);
  assert.match(page, /useI18n/);
  assert.match(i18n, /home: "Home"/);
  assert.match(i18n, /portfolio: "Portfolio"/);
  assert.match(i18n, /settings: "Settings"/);
  assert.match(appMessages, /overview: "Overview"/);
  assert.match(appMessages, /activity: "Evidence & activity"/);
  assert.match(appMessages, /relationships: "Relationships"/);
  assert.match(appMessages, /strategy: "Discovery"/);
  assert.match(appMessages, /title: "Account copilot"/);
  assert.match(appMessages, /prepare: "Prepare conversation"/);
  assert.match(appMessages, /next: "Next step"/);
  assert.match(appMessages, /title: "What deserves your attention today"/);
  assert.match(appMessages, /dialog: "Command palette"/);
  assert.match(page, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(appMessages, /addInformation: "Add information"/);
  assert.match(appMessages, /accountPlan: "Account Plan"/);
  assert.match(appMessages, /known: "Known"/);
  assert.match(appMessages, /assumed: "Assumed"/);
  assert.match(appMessages, /missing: "Missing"/);

  assert.match(api, /createAIProviderFromEnv/);
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
  assert.match(api, /daily_briefings/);
  assert.match(api, /account_embeddings/);
  assert.match(api, /account_relationships/);
  assert.match(api, /external_signals/);
  assert.match(api, /action_feedback/);
  assert.match(api, /information_preview/);
  assert.match(api, /prepare_conversation/);
  assert.match(api, /public-research/);

  assert.match(engine, /impact \* \.35/);
  assert.match(engine, /buildActions/);
  assert.match(engine, /buildHypotheses/);
  assert.match(engine, /answerFromEvidence/);

  assert.match(migration, /CREATE TABLE `meetings`/);
  assert.match(migration, /CREATE TABLE `account_maps`/);
  assert.match(stakeholderMigration, /CREATE TABLE `stakeholders`/);
  assert.match(v4Migration, /CREATE TABLE `account_actions`/);
  assert.match(v4Migration, /CREATE TABLE `documents`/);
  assert.match(v5Migration, /CREATE TABLE `account_embeddings`/);
  assert.match(v5Migration, /CREATE TABLE `daily_briefings`/);
  assert.match(v5Migration, /CREATE TABLE `account_relationships`/);
  assert.match(
    v5Migration,
    /ALTER TABLE `discoveries` ADD `data_classification`/,
  );
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(documents, /15 \* 1024 \* 1024/);
  assert.match(documents, /R2Bucket/);
  assert.match(documents, /DELETE FROM account_embeddings/);

  assert.match(visuals, /@carbon\/charts-react/);
  assert.match(visuals, /DonutChart/);
  assert.match(visuals, /GroupedBarChart/);
  assert.match(graph, /@xyflow\/react/);
  assert.match(graph, /MiniMap/);
  assert.match(graph, /fitView/);
  assert.match(charts, /BubbleChart/);
  assert.match(charts, /GroupedBarChart/);
  assert.match(charts, /LineChart/);
});

test("wires the V5.1 guided discovery workspace, additive storage and account routes", async () => {
  const [
    page,
    workspace,
    i18n,
    styles,
    api,
    domain,
    kyndrylDomain,
    provider,
    migration,
    schema,
    getRoute,
    sessionRoute,
    answerRoute,
  ] = await Promise.all([
    readProjectFile("app/page.tsx"),
    readProjectFile("app/GuidedDiscoveryWorkspace.tsx"),
    readProjectFile("lib/i18n.ts"),
    readProjectFile("app/GuidedDiscoveryWorkspace.module.css"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("lib/guided-discovery.ts"),
    readProjectFile("lib/kyndryl-discovery.ts"),
    readProjectFile("lib/ai-provider.ts"),
    readProjectFile("drizzle/0006_hot_impossible_man.sql"),
    readProjectFile("db/schema.ts"),
    readProjectFile("app/api/accounts/[id]/guided-discovery/route.ts"),
    readProjectFile("app/api/accounts/[id]/guided-discovery/sessions/route.ts"),
    readProjectFile("app/api/accounts/[id]/guided-discovery/answers/route.ts"),
  ]);

  assert.match(page, /GuidedDiscoverySummary/);
  assert.match(workspace, /useI18n/);
  assert.match(workspace, /getLocalizedQuestionById/);
  assert.match(workspace, /localizeGuidedDiscoveryOption/);
  assert.match(i18n, /adaptive: "Adaptive"/);
  assert.match(i18n, /direct: "Direct by pillar"/);
  assert.match(i18n, /whyAsk: "Why are we asking this\?"/);
  assert.match(i18n, /saveDraft: "Save draft"/);
  assert.match(i18n, /confirmContinue: "Confirm and continue"/);
  assert.match(i18n, /doNotKnow: "I don't know yet"/);
  assert.match(i18n, /historyAndRevisions: "History and revisions/);
  assert.match(i18n, /checkpointAvailable: "Checkpoint available"/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /max-width:\s*700px/);

  assert.match(kyndrylDomain, /2026\.3-kyndryl/);
  assert.match(
    domain,
    /informationGap \* 0\.45[\s\S]+hypothesisImpact \* 0\.3[\s\S]+staleness \* 0\.15[\s\S]+stakeholderCoverage \* 0\.1/,
  );
  assert.match(domain, /KYNDYRL_QUESTION_CATALOG/);
  assert.match(kyndrylDomain, /ibmz-platform/);
  assert.match(kyndrylDomain, /infra-finops/);
  assert.match(kyndrylDomain, /app-observability/);
  assert.match(kyndrylDomain, /sap-roadmap/);
  assert.match(kyndrylDomain, /ops-automation/);
  assert.match(kyndrylDomain, /data-governance/);
  assert.match(kyndrylDomain, /work-experience/);
  assert.match(kyndrylDomain, /cyber-recovery/);
  assert.match(provider, /suggestDiscoveryFollowUp/);
  assert.match(provider, /Não calcule nem altere scores/);

  for (const table of [
    "guided_discovery_sessions",
    "guided_discovery_questions",
    "guided_discovery_answers",
  ]) {
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
    assert.match(schema, new RegExp(table.replaceAll("_", ""), "i"));
    assert.match(api, new RegExp(table));
  }
  assert.match(migration, /supersedes_id/);
  assert.match(migration, /ON DELETE cascade/);
  assert.match(api, /guided_discovery_start/);
  assert.match(api, /guided_discovery_answer/);
  assert.match(api, /guided_discovery_patch/);
  assert.match(api, /skipGenerative:\s*true,\s*skipEmbeddings:\s*true/);
  assert.match(api, /aiCalled: false/);
  assert.match(api, /sourceType: "guided_discovery"/);
  assert.match(api, /materializeLegacyGuidedAnswers/);
  assert.match(getRoute, /guidedDiscoveries/);
  assert.match(sessionRoute, /scope: "private"/);
  assert.match(answerRoute, /scope: "private"/);
});

test("routes discovery directly through the eight Kyndryl pillars and keeps coverage separate from progress", async () => {
  const guided = await loadGuidedModule();
  assert.equal(guided.GUIDED_DISCOVERY_CATALOG_VERSION, "2026.3-kyndryl");
  assert.equal(guided.GUIDED_DISCOVERY_CATALOG.length, 96);
  for (const pillar of [
    "ibm-z",
    "infrastructure-modernization",
    "application-modernization",
    "sap-transformation",
    "modern-operations",
    "data-ai",
    "modern-workplace",
    "cyber-security",
  ]) {
    assert.equal(guided.questionsForPillar(pillar).length, 6);
  }

  const direct = guided.materializeQuestionRoute({
    mode: "direct",
    selectedPillars: ["data-ai"],
    answers: [],
  });
  assert.equal(direct.questionIds.length, 6);
  assert.ok(
    direct.questionIds.every(
      (id) => guided.getQuestionById(id)?.pillar === "data-ai",
    ),
  );

  const pillarAnswers = direct.questionIds.map((questionId, index) => ({
    questionId,
    status: index === 2 ? "unknown" : "confirmed",
    evidenceStatus: index === 2 ? "unknown" : "reported",
    answerText: index === 2 ? "" : "Evidência relatada",
    structured: index === 2 ? {} : { value: 3 },
  }));
  const metrics = guided.calculateDiscoveryMetrics(
    direct.questionIds,
    pillarAnswers,
  );
  assert.equal(metrics.progressPercent, 100);
  assert.equal(metrics.coveragePercent, 83);
  assert.equal(metrics.gaps, 1);
});

test("uses the transparent 45/30/15/10 information-value ranking", async () => {
  const guided = await loadGuidedModule();
  const questions = guided.questionsForPillar("modern-operations").slice(0, 2);
  const ranked = guided.rankNextQuestion({
    questions,
    answers: [],
    hypothesisImpactByPillar: { "modern-operations": 80 },
    stakeholderCoverageByPillar: { "modern-operations": 20 },
    now: new Date("2026-07-14T12:00:00Z"),
  });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].factors.informationGap, 100);
  assert.equal(ranked[0].factors.hypothesisImpact, 80);
  assert.equal(ranked[0].factors.staleness, 35);
  assert.equal(ranked[0].factors.stakeholderCoverage, 80);
  assert.equal(
    ranked[0].rankingScore,
    Math.round(100 * 0.45 + 80 * 0.3 + 35 * 0.15 + 80 * 0.1),
  );
});

test("keeps public reads isolated and the authenticated workspace fail-closed", async () => {
  const [api, documents, aiStatus] = await Promise.all([
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
    readProjectFile("app/api/ai/status/route.ts"),
  ]);

  assert.match(
    api,
    /seedStakeholderTrees\(db: D1Database, discoveryIds: string\[\]\)/,
  );
  assert.doesNotMatch(api, /SELECT id, industry, created_at FROM discoveries"/);
  assert.match(
    api,
    /backfillV4\(\s*db: D1Database,\s*discoveryRows: Record<string, unknown>\[\],\s*responseLocale: ResponseLocale,\s*\)/,
  );
  assert.match(api, /skipGenerative:\s*true,\s*skipEmbeddings:\s*true/);
  assert.match(api, /if \(!identity\.email\)/);
  assert.doesNotMatch(api, /PRIVATE_ALLOWED_EMAILS/);
  assert.doesNotMatch(api, /WORKSPACE_ALLOWLIST_NOT_CONFIGURED/);
  assert.doesNotMatch(documents, /PRIVATE_ALLOWED_EMAILS/);
  assert.doesNotMatch(aiStatus, /PRIVATE_ALLOWED_EMAILS/);
});

test("keeps Gemini behind the server-side provider boundary and policy gates", async () => {
  const [provider, api, statusRoute, page] = await Promise.all([
    readProjectFile("lib/ai-provider.ts"),
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/api/ai/status/route.ts"),
    readProjectFile("app/page.tsx"),
  ]);

  assert.match(provider, /gemini-3\.1-flash-lite/);
  assert.match(provider, /gemini-embedding-2/);
  assert.match(provider, /GEMINI_EMBEDDING_DIMENSIONS = 768/);
  assert.match(provider, /\["watsonx", "gemini", "fallback"\]/);
  assert.match(provider, /x-goog-api-key/);
  assert.match(provider, /responseJsonSchema/);
  assert.match(
    provider,
    /options\.publicDemo \|\| options\.classification === "confidential"/,
  );
  assert.match(provider, /\.slice\(0, 60\)/);
  assert.match(provider, /outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS/);

  assert.match(api, /visibility \|\| "demo"\) !== "private"/);
  assert.match(api, /classificationOf\(row\) === "confidential"/);
  assert.match(api, /rpm = kind === "embedding" \? 80 : 12/);
  assert.match(api, /daily = kind === "embedding" \? 900 : 450/);
  assert.match(api, /meetingQuota = await quotaAllows\(db, "generative"\)/);
  assert.match(api, /"meeting-intelligence",\s*meetingRun/);
  assert.match(api, /attemptedProvider = result\.attemptedProviders/);
  assert.match(api, /attemptedProvider\s*\?\s*"error"\s*:\s*"fallback"/);
  assert.match(api, /circuitWindow = new Date\(now - 5 \* 60_000\)/);
  assert.match(api, /cachedAI/);
  assert.match(api, /putAICache/);
  assert.match(api, /providerCacheSignature/);
  assert.match(api, /provider <> 'deterministic-fallback' AND model <> ''/);
  assert.match(api, /if \(generated\.ok\)\s*await putAICache/);
  assert.match(api, /normalizeCompanyDomain/);
  assert.match(api, /domínio corporativo válido/);
  assert.match(api, /requiresHumanApproval: true/);
  assert.match(api, /status === "approved"/);
  assert.match(api, /rank_adjustment/);

  assert.doesNotMatch(page, /GEMINI_API_KEY/);
  assert.match(statusRoute, /secretsExposed: false/);
  assert.match(statusRoute, /if \(!email\)/);
  assert.doesNotMatch(statusRoute, /PRIVATE_ALLOWED_EMAILS/);
  assert.doesNotMatch(statusRoute, /WORKSPACE_EMAIL_NOT_ALLOWED/);
  assert.doesNotMatch(statusRoute, /apiKey:/);
});

test("prefers watsonx and falls through to Gemini only when needed", async () => {
  const { createAIProvider } = await loadProviderModule();
  const watsonCalls = [];
  const watsonFirst = createAIProvider({
    watsonx: {
      apiKey: "watson-test",
      projectId: "project-test",
      url: "https://watson.example",
      modelId: "watson-model",
    },
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async (url) => {
      watsonCalls.push(String(url));
      if (String(url).includes("iam.cloud.ibm.com"))
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      if (String(url).includes("watson.example"))
        return jsonResponse({
          results: [
            {
              generated_text: JSON.stringify(accountAnswer("Resposta Watson")),
              input_token_count: 4,
              generated_token_count: 5,
            },
          ],
        });
      throw new Error(
        "Gemini não deveria ser chamado quando watsonx responde.",
      );
    },
  });
  const watsonResult = await watsonFirst.answerQuestion(
    "source-1: contexto",
    "Pergunta?",
  );
  assert.equal(watsonResult.provider, "watsonx");
  assert.equal(watsonResult.data.answer, "Resposta Watson");
  assert.equal(
    watsonCalls.some((url) =>
      url.includes("generativelanguage.googleapis.com"),
    ),
    false,
  );

  const failoverCalls = [];
  const failover = createAIProvider({
    watsonx: {
      apiKey: "watson-test",
      projectId: "project-test",
      url: "https://watson.example",
      modelId: "watson-model",
    },
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async (url) => {
      failoverCalls.push(String(url));
      if (String(url).includes("iam.cloud.ibm.com"))
        return jsonResponse({ access_token: "token", expires_in: 3600 });
      if (String(url).includes("watson.example"))
        return jsonResponse({ error: "bad request" }, 400);
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify(accountAnswer("Resposta Gemini")) },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 7,
          candidatesTokenCount: 8,
          totalTokenCount: 15,
        },
      });
    },
  });
  const failoverResult = await failover.answerQuestion(
    "source-1: contexto",
    "Pergunta?",
  );
  assert.equal(failoverResult.provider, "gemini");
  assert.equal(failoverResult.data.answer, "Resposta Gemini");
  assert.deepEqual(
    failoverCalls.map((url) =>
      url.includes("iam.cloud.ibm.com")
        ? "iam"
        : url.includes("watson.example")
          ? "watsonx"
          : "gemini",
    ),
    ["iam", "watsonx", "gemini"],
  );
});

test("blocks Gemini for demo/confidential data and validates structured output", async () => {
  const { createAIProvider } = await loadProviderModule();
  let calls = 0;
  const blocked = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async () => {
      calls += 1;
      throw new Error("A política deveria bloquear antes do fetch.");
    },
  });
  const demo = await blocked.answerQuestion("contexto", "Pergunta?", {
    publicDemo: true,
    classification: "test",
  });
  const confidential = await blocked.answerQuestion("contexto", "Pergunta?", {
    classification: "confidential",
  });
  assert.equal(demo.reason, "policy_blocked");
  assert.equal(confidential.reason, "policy_blocked");
  assert.equal(calls, 0);

  const invalid = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async () =>
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "{not-json" }] } }],
      }),
  });
  const invalidResult = await invalid.answerQuestion("contexto", "Pergunta?", {
    classification: "test",
  });
  assert.equal(invalidResult.ok, false);
  assert.equal(invalidResult.reason, "invalid_output");
  assert.deepEqual(invalidResult.attemptedProviders, ["gemini"]);
});

test("retries a Gemini 429 only once", async () => {
  const { createAIProvider } = await loadProviderModule();
  let calls = 0;
  const provider = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1)
        return new Response("quota", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify(accountAnswer("Resposta após retry")) },
              ],
            },
          },
        ],
      });
    },
  });
  const result = await provider.answerQuestion(
    "source-1: contexto",
    "Pergunta?",
    { classification: "test" },
  );
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);
});

test("limits an embedding batch to 60 sources at 768 dimensions", async () => {
  const { createAIProvider } = await loadProviderModule();
  let requestBody;
  const provider = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init.body));
      return jsonResponse({
        embeddings: requestBody.requests.map(() => ({
          values: Array.from({ length: 768 }, () => 0.01),
        })),
      });
    },
  });
  const sources = Array.from({ length: 65 }, (_, index) => ({
    id: `source-${index}`,
    text: `Conteúdo ${index}`,
  }));
  const result = await provider.embedSources(sources, {
    classification: "test",
  });
  assert.equal(requestBody.requests.length, 60);
  assert.equal(requestBody.requests[0].outputDimensionality, 768);
  assert.equal(result.data.length, 60);
  assert.equal(result.data[0].values.length, 768);
});

test("does not commit a Gemini credential", async () => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-co", "--exclude-standard"],
    {
      cwd: new URL(".", root),
    },
  );
  const candidateFiles = stdout
    .split("\n")
    .filter(Boolean)
    .filter(
      (path) =>
        /^(app|lib|db|tests|drizzle|public|\.openai)\//.test(path) ||
        /^(README|CHANGELOG|package|wrangler|\.gitignore)/.test(path),
    );
  const contents = await Promise.all(
    candidateFiles.map(async (path) => {
      try {
        return await readProjectFile(path);
      } catch {
        return "";
      }
    }),
  );

  // The previously shared credential used this prefix. Keep both it and
  // conventional Google API keys out of source, tests, generated assets and config.
  const combined = contents.join("\n");
  assert.doesNotMatch(combined, /AQ\.[A-Za-z0-9_-]{24,}/);
  assert.doesNotMatch(combined, /AIza[0-9A-Za-z_-]{30,}/);
});
