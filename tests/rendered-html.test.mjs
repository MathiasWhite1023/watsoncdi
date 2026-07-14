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
  const executable = compiled.replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`);
  providerModule = await import(`data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`);
  return providerModule;
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

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { "content-type": "application/json" },
});

test("documents the proactive account intelligence product and rollback path", async () => {
  const [readme, changelog, packageJson] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("CHANGELOG.md"),
    readProjectFile("package.json"),
  ]);

  assert.match(readme, /# Watson CDI Account Intelligence/);
  assert.match(readme, /Account Intelligence before CRM/);
  assert.match(readme, /WATSONX_API_KEY/);
  assert.match(readme, /v4-proactive-account-intelligence/);
  assert.match(readme, /v5-proactive-copilot-gemini/);
  assert.match(readme, /GEMINI_API_KEY/);
  assert.match(readme, /gemini-3\.1-flash-lite/);
  assert.match(changelog, /v5-proactive-copilot-gemini/);
  assert.match(changelog, /v4-proactive-account-intelligence/);
  assert.match(changelog, /migrations are additive/i);
  assert.match(readme, /Live demo:/);
  assert.match(readme, /not an official IBM product/i);
  assert.match(packageJson, /"name": "ibm-opportunity-heatmap"/);
});

test("keeps the V5 proactive account intelligence surfaces wired", async () => {
  const [page, api, engine, visuals, graph, charts, migration, stakeholderMigration, v4Migration, v5Migration, auth, documents] = await Promise.all([
    readProjectFile("app/page.tsx"),
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

  assert.match(page, /label: "Início"/);
  assert.match(page, /Inteligência de contas/);
  assert.match(page, /Radar da carteira/);
  assert.match(page, /Configurações/);
  assert.match(page, /label: "Visão geral"/);
  assert.match(page, /label: "Atividade"/);
  assert.match(page, /label: "Relacionamentos"/);
  assert.match(page, /label: "Estratégia"/);
  assert.match(page, /Copiloto da conta/);
  assert.match(page, /Preparar conversa/);
  assert.match(page, /Próximo passo/);
  assert.match(page, /O que merece sua atenção hoje/);
  assert.match(page, /Paleta de comandos/);
  assert.match(page, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(page, /Adicionar informação/);
  assert.match(page, /Account Plan/);
  assert.match(page, /Sabemos/);
  assert.match(page, /Supomos/);
  assert.match(page, /Falta descobrir/);

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
  assert.match(v5Migration, /ALTER TABLE `discoveries` ADD `data_classification`/);
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

test("keeps public reads isolated and the private workspace fail-closed", async () => {
  const [api, documents, aiStatus] = await Promise.all([
    readProjectFile("app/api/discoveries/route.ts"),
    readProjectFile("app/api/accounts/[id]/documents/route.ts"),
    readProjectFile("app/api/ai/status/route.ts"),
  ]);

  assert.match(api, /seedStakeholderTrees\(db: D1Database, discoveryIds: string\[\]\)/);
  assert.doesNotMatch(api, /SELECT id, industry, created_at FROM discoveries"/);
  assert.match(api, /backfillV4\(db: D1Database, discoveryRows: Record<string, unknown>\[\]\)/);
  assert.match(api, /skipGenerative: true, skipEmbeddings: true/);
  assert.match(api, /allowlistConfigured: allowed\.length > 0/);
  assert.match(api, /if \(!identity\.allowlistConfigured\)/);
  assert.match(documents, /if \(!allowlist\.length\)/);
  assert.match(aiStatus, /if \(!allowlist\.length\)/);
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
  assert.match(provider, /options\.publicDemo \|\| options\.classification === "confidential"/);
  assert.match(provider, /\.slice\(0, 60\)/);
  assert.match(provider, /outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS/);

  assert.match(api, /visibility \|\| "demo"\) !== "private"/);
  assert.match(api, /classificationOf\(row\) === "confidential"/);
  assert.match(api, /rpm = kind === "embedding" \? 80 : 12/);
  assert.match(api, /daily = kind === "embedding" \? 900 : 450/);
  assert.match(api, /meetingQuota = await quotaAllows\(db, "generative"\)/);
  assert.match(api, /"meeting-intelligence", meetingRun/);
  assert.match(api, /attemptedProvider = result\.attemptedProviders/);
  assert.match(api, /attemptedProvider \? "error" : "fallback"/);
  assert.match(api, /circuitWindow = new Date\(now - 5 \* 60_000\)/);
  assert.match(api, /cachedAI/);
  assert.match(api, /putAICache/);
  assert.match(api, /providerCacheSignature/);
  assert.match(api, /provider <> 'deterministic-fallback' AND model <> ''/);
  assert.match(api, /if \(generated\.ok\) await putAICache/);
  assert.match(api, /normalizeCompanyDomain/);
  assert.match(api, /domínio corporativo válido/);
  assert.match(api, /requiresHumanApproval: true/);
  assert.match(api, /status === "approved"/);
  assert.match(api, /rank_adjustment/);

  assert.doesNotMatch(page, /GEMINI_API_KEY/);
  assert.match(statusRoute, /secretsExposed: false/);
  assert.match(statusRoute, /PRIVATE_ALLOWED_EMAILS/);
  assert.match(statusRoute, /!allowlist\.includes\(email\)/);
  assert.doesNotMatch(statusRoute, /apiKey:/);
});

test("prefers watsonx and falls through to Gemini only when needed", async () => {
  const { createAIProvider } = await loadProviderModule();
  const watsonCalls = [];
  const watsonFirst = createAIProvider({
    watsonx: { apiKey: "watson-test", projectId: "project-test", url: "https://watson.example", modelId: "watson-model" },
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async (url) => {
      watsonCalls.push(String(url));
      if (String(url).includes("iam.cloud.ibm.com")) return jsonResponse({ access_token: "token", expires_in: 3600 });
      if (String(url).includes("watson.example")) return jsonResponse({ results: [{ generated_text: JSON.stringify(accountAnswer("Resposta Watson")), input_token_count: 4, generated_token_count: 5 }] });
      throw new Error("Gemini não deveria ser chamado quando watsonx responde.");
    },
  });
  const watsonResult = await watsonFirst.answerQuestion("source-1: contexto", "Pergunta?");
  assert.equal(watsonResult.provider, "watsonx");
  assert.equal(watsonResult.data.answer, "Resposta Watson");
  assert.equal(watsonCalls.some((url) => url.includes("generativelanguage.googleapis.com")), false);

  const failoverCalls = [];
  const failover = createAIProvider({
    watsonx: { apiKey: "watson-test", projectId: "project-test", url: "https://watson.example", modelId: "watson-model" },
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async (url) => {
      failoverCalls.push(String(url));
      if (String(url).includes("iam.cloud.ibm.com")) return jsonResponse({ access_token: "token", expires_in: 3600 });
      if (String(url).includes("watson.example")) return jsonResponse({ error: "bad request" }, 400);
      return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(accountAnswer("Resposta Gemini")) }] } }], usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 8, totalTokenCount: 15 } });
    },
  });
  const failoverResult = await failover.answerQuestion("source-1: contexto", "Pergunta?");
  assert.equal(failoverResult.provider, "gemini");
  assert.equal(failoverResult.data.answer, "Resposta Gemini");
  assert.deepEqual(failoverCalls.map((url) => url.includes("iam.cloud.ibm.com") ? "iam" : url.includes("watson.example") ? "watsonx" : "gemini"), ["iam", "watsonx", "gemini"]);
});

test("blocks Gemini for demo/confidential data and validates structured output", async () => {
  const { createAIProvider } = await loadProviderModule();
  let calls = 0;
  const blocked = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async () => { calls += 1; throw new Error("A política deveria bloquear antes do fetch."); },
  });
  const demo = await blocked.answerQuestion("contexto", "Pergunta?", { publicDemo: true, classification: "test" });
  const confidential = await blocked.answerQuestion("contexto", "Pergunta?", { classification: "confidential" });
  assert.equal(demo.reason, "policy_blocked");
  assert.equal(confidential.reason, "policy_blocked");
  assert.equal(calls, 0);

  const invalid = createAIProvider({
    mode: "gemini",
    gemini: { apiKey: "gemini-test" },
    fetchImpl: async () => jsonResponse({ candidates: [{ content: { parts: [{ text: "{not-json" }] } }] }),
  });
  const invalidResult = await invalid.answerQuestion("contexto", "Pergunta?", { classification: "test" });
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
      if (calls === 1) return new Response("quota", { status: 429, headers: { "retry-after": "0" } });
      return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(accountAnswer("Resposta após retry")) }] } }] });
    },
  });
  const result = await provider.answerQuestion("source-1: contexto", "Pergunta?", { classification: "test" });
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
      return jsonResponse({ embeddings: requestBody.requests.map(() => ({ values: Array.from({ length: 768 }, () => 0.01) })) });
    },
  });
  const sources = Array.from({ length: 65 }, (_, index) => ({ id: `source-${index}`, text: `Conteúdo ${index}` }));
  const result = await provider.embedSources(sources, { classification: "test" });
  assert.equal(requestBody.requests.length, 60);
  assert.equal(requestBody.requests[0].outputDimensionality, 768);
  assert.equal(result.data.length, 60);
  assert.equal(result.data[0].values.length, 768);
});

test("does not commit a Gemini credential", async () => {
  const { stdout } = await execFileAsync("git", ["ls-files", "-co", "--exclude-standard"], {
    cwd: new URL(".", root),
  });
  const candidateFiles = stdout
    .split("\n")
    .filter(Boolean)
    .filter((path) => /^(app|lib|db|tests|drizzle|public|\.openai)\//.test(path) || /^(README|CHANGELOG|package|wrangler|\.gitignore)/.test(path));
  const contents = await Promise.all(candidateFiles.map(async (path) => {
    try {
      return await readProjectFile(path);
    } catch {
      return "";
    }
  }));

  // The previously shared credential used this prefix. Keep both it and
  // conventional Google API keys out of source, tests, generated assets and config.
  const combined = contents.join("\n");
  assert.doesNotMatch(combined, /AQ\.[A-Za-z0-9_-]{24,}/);
  assert.doesNotMatch(combined, /AIza[0-9A-Za-z_-]{30,}/);
});
