import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function transpile(path) {
  const [typescript, source] = await Promise.all([
    import("typescript"),
    readFile(new URL(path, root), "utf8"),
  ]);
  return typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
}

async function loadModules() {
  const catalogSource = await transpile("lib/cdi/capability-driven.ts");
  const catalogUrl = `data:text/javascript;base64,${Buffer.from(catalogSource).toString("base64")}`;
  const catalog = await import(catalogUrl);
  const engineSource = (await transpile("lib/cdi/engine.ts")).replace(
    '"./capability-driven"',
    `"${catalogUrl}"`,
  );
  const engine = await import(
    `data:text/javascript;base64,${Buffer.from(engineSource).toString("base64")}`
  );
  return { catalog, engine };
}

const answer = (questionId, value, confidence = 85) => ({
  questionId,
  status: value === "DONT_KNOW" ? "unknown" : "confirmed",
  structured: value === "DONT_KNOW" ? {} : { value },
  answerText: "",
  confidence: value === "DONT_KNOW" ? 0 : confidence,
});

test("publishes 10 context questions, 14 capabilities, 70 core and 70 deep questions", async () => {
  const { catalog } = await loadModules();
  assert.equal(catalog.CDI_CONTEXT_QUESTIONS.length, 10);
  assert.equal(catalog.CDI_CAPABILITIES.length, 14);
  assert.equal(catalog.CDI_QUESTIONS.filter((item) => item.level === "core").length, 70);
  assert.equal(catalog.CDI_QUESTIONS.filter((item) => item.level === "deep").length, 70);
  assert.equal(new Set(catalog.CDI_QUESTIONS.map((item) => item.id)).size, 140);
  for (const question of catalog.CDI_QUESTIONS) {
    assert.ok(question.mappings.YES.evidenceId);
    assert.ok(question.mappings.NO.evidenceId);
    assert.equal("technologyIds" in question, false);
  }
});

test("keeps every deep question binary while preserving its open evidence prompt", async () => {
  const { catalog } = await loadModules();
  const openEnglish = /^(which|what|who|where|how|when)\b/i;
  const openPortuguese = /^(qual|quais|quem|onde|como|quando)\b/i;
  const deepQuestions = catalog.CDI_QUESTIONS.filter(
    (item) => item.level === "deep",
  );

  assert.equal(deepQuestions.length, 70);
  for (const question of deepQuestions) {
    assert.doesNotMatch(question.prompt.en, openEnglish, question.id);
    assert.doesNotMatch(question.prompt.pt, openPortuguese, question.id);
    assert.match(question.prompt.en, /\?$/, question.id);
    assert.match(question.prompt.pt, /\?$/, question.id);
    assert.ok(question.contextPrompt?.en, question.id);
    assert.ok(question.contextPrompt?.pt, question.id);
    assert.notEqual(question.prompt.en, question.contextPrompt.en, question.id);
    assert.notEqual(question.prompt.pt, question.contextPrompt.pt, question.id);
  }
});

test("keeps unknown and N/A out of evidence and lowers confidence", async () => {
  const { engine } = await loadModules();
  const assessment = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO"),
      answer("FINOPS_C02", "DONT_KNOW"),
      answer("FINOPS_C03", "NOT_APPLICABLE"),
    ],
  });
  assert.equal(assessment.summary.knownAnswers, 1);
  assert.equal(assessment.summary.dontKnowAnswers, 1);
  assert.equal(assessment.summary.notApplicableAnswers, 1);
  assert.equal(assessment.evidence.length, 1);
  assert.ok(assessment.summary.overallConfidence < 50);
});

test("enforces the IBM Z gate and preserves the published fit formula", async () => {
  const { engine } = await loadModules();
  const blocked = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["z-run", "z-security"],
    answers: [answer("Z_RUN_C01", "NO"), answer("Z_SECURITY_C04", "NO")],
  });
  const zProducts = blocked.technologies.filter((item) =>
    ["omegamon", "z-aiops", "z-cyber-vault"].includes(item.id),
  );
  assert.ok(zProducts.length > 0);
  assert.ok(zProducts.every((item) => item.gateStatus === "FAILED"));

  const open = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["z-run", "observability"],
    answers: [
      answer("Z_RUN_C01", "YES"),
      answer("Z_RUN_C03", "NO"),
      answer("Z_RUN_C04", "NO"),
      answer("OBSERVABILITY_C01", "NO"),
      answer("OBSERVABILITY_C03", "NO"),
    ],
  });
  const candidate = open.technologies.find((item) => item.propensity > 0);
  assert.ok(candidate);
  const c = candidate.components;
  const expected = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        c.evidenceFit * 0.45 +
          c.capabilityGap * 0.25 +
          c.businessImpact * 0.15 +
          c.journeyFit * 0.1 +
          c.attachPriority * 0.05 -
          c.penalties,
      ),
    ),
  );
  assert.equal(candidate.propensity, expected);
});

test("produces deterministic traceability through technology and Kyndryl practice", async () => {
  const { engine } = await loadModules();
  const input = {
    capabilityKeys: ["trusted-data", "ai-governance"],
    locale: "en-US",
    answers: [
      answer("TRUSTED_DATA_C01", "NO"),
      answer("TRUSTED_DATA_C02", "NO"),
      answer("AI_GOVERNANCE_C02", "NO"),
      answer("AI_GOVERNANCE_C03", "NO"),
    ],
  };
  const first = engine.scoreCapabilityDrivenAssessment(input);
  const second = engine.scoreCapabilityDrivenAssessment(input);
  assert.deepEqual(first, second);
  assert.ok(first.trace.some((item) => item.evidenceId));
  assert.ok(first.technologies.some((item) => item.name.includes("watsonx")));
  assert.ok(first.practices.some((item) => item.name.includes("Applications")));
});

test("adds the audited IBM, Red Hat, and HashiCorp solution profiles", async () => {
  const { catalog } = await loadModules();
  const profiles = new Map(
    catalog.CDI_TECHNOLOGIES.map((item) => [item.id, item]),
  );
  const expected = {
    "webmethods-hybrid-integration": "IBM webMethods Hybrid Integration",
    "hashicorp-terraform": "HashiCorp Terraform",
    "red-hat-ansible": "Red Hat Ansible Automation Platform",
    "hashicorp-vault": "HashiCorp Vault",
    cloudability: "IBM Cloudability",
    sevone: "IBM SevOne Network Performance Management",
    "cloud-pak-aiops": "IBM Cloud Pak for AIOps",
    datastage: "IBM DataStage",
    "planning-analytics": "IBM Planning Analytics",
    zsecure: "IBM zSecure",
    "storage-defender": "IBM Storage Defender",
    "qradar-suite": "IBM QRadar Suite",
  };

  for (const [id, name] of Object.entries(expected)) {
    const profile = profiles.get(id);
    assert.ok(profile, id);
    assert.equal(profile.name, name, id);
    assert.ok(profile.supportingEvidence.length > 0, id);
    assert.ok(profile.minimumFit > 0, id);
    assert.ok(profile.minimumConfidence > 0, id);
  }

  const catalogEvidenceIds = new Set(
    catalog.CDI_QUESTIONS.flatMap((question) => [
      question.mappings.YES.evidenceId,
      question.mappings.NO.evidenceId,
    ]),
  );
  for (const profile of catalog.CDI_TECHNOLOGIES) {
    for (const evidenceId of [
      ...profile.requiredEvidence,
      ...profile.supportingEvidence,
      ...profile.contradictoryEvidence,
    ]) {
      assert.ok(catalogEvidenceIds.has(evidenceId), `${profile.id}: ${evidenceId}`);
    }
  }
});

test("offers at least three Data Streaming solutions and enforces the Event Automation gate", async () => {
  const { catalog, engine } = await loadModules();
  const dataStreamingSolutions = catalog.CDI_TECHNOLOGIES.filter((item) =>
    item.capabilityKeys.includes("data-streaming"),
  );
  assert.ok(dataStreamingSolutions.length >= 3);
  assert.ok(dataStreamingSolutions.some((item) => item.name === "Confluent"));
  assert.ok(
    dataStreamingSolutions.some((item) => item.name === "IBM Event Automation"),
  );
  assert.ok(dataStreamingSolutions.some((item) => item.name === "IBM MQ"));

  const pending = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["data-streaming"],
    answers: [answer("DATA_STREAMING_C02", "NO")],
  });
  const satisfied = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["data-streaming"],
    answers: [
      answer("DATA_STREAMING_C01", "YES"),
      answer("DATA_STREAMING_C02", "NO"),
      answer("DATA_STREAMING_C03", "NO"),
    ],
  });
  const failed = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["data-streaming"],
    answers: [
      answer("DATA_STREAMING_C01", "NO"),
      answer("DATA_STREAMING_C02", "NO"),
    ],
  });

  assert.equal(
    pending.technologies.find((item) => item.id === "event-automation")
      ?.gateStatus,
    "PENDING",
  );
  assert.equal(
    satisfied.technologies.find((item) => item.id === "event-automation")
      ?.gateStatus,
    "SATISFIED",
  );
  assert.equal(
    failed.technologies.find((item) => item.id === "event-automation")
      ?.gateStatus,
    "FAILED",
  );
});

test("does not use evidence from an unselected capability to assess a solution", async () => {
  const { engine } = await loadModules();
  const assessment = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [answer("HYBRID_CLOUD_C02", "NO")],
  });

  assert.equal(
    assessment.technologies.some((item) => item.id === "cloudability"),
    false,
  );
});

test("does not evaluate a solution from a generic capability gap alone", async () => {
  const { engine } = await loadModules();
  const assessment = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["hybrid-cloud"],
    answers: [answer("HYBRID_CLOUD_C04", "NO")],
  });

  assert.equal(assessment.technologies.length, 0);
  assert.equal(assessment.pillars[0].leadingTechnology, null);
  assert.equal(assessment.pillars[0].propensity, 0);
});

test("calculates confidence only from linked questions in selected capabilities", async () => {
  const { engine } = await loadModules();
  const partial = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [answer("FINOPS_C01", "NO", 80)],
  });
  const complete = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO", 80),
      answer("FINOPS_C02", "NO", 80),
    ],
  });

  assert.equal(
    partial.technologies.find((item) => item.id === "cloudability")
      ?.confidence,
    40,
  );
  assert.equal(
    complete.technologies.find((item) => item.id === "cloudability")
      ?.confidence,
    80,
  );
});

test("requires profile thresholds and two independent supporting evidences to recommend now", async () => {
  const { engine } = await loadModules();
  const oneEvidence = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [answer("FINOPS_C01", "NO", 85)],
  });
  const lowConfidence = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO", 50),
      answer("FINOPS_C02", "NO", 50),
    ],
  });
  const qualified = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO", 85),
      answer("FINOPS_C02", "NO", 85),
    ],
  });

  assert.equal(
    oneEvidence.technologies.find((item) => item.id === "apptio")?.action,
    "VALIDATE",
  );
  assert.equal(
    lowConfidence.technologies.find((item) => item.id === "apptio")?.action,
    "VALIDATE",
  );
  assert.equal(
    qualified.technologies.find((item) => item.id === "apptio")?.action,
    "RECOMMEND_NOW",
  );
});

test("preserves the Battle Card decision bands for fit and confidence", async () => {
  const { catalog, engine } = await loadModules();
  const apptio = catalog.CDI_TECHNOLOGIES.find(
    (item) => item.id === "apptio",
  );
  assert.ok(apptio);
  assert.ok(apptio.minimumFit < 80);
  assert.ok(apptio.minimumConfidence < 70);

  const belowRecommendNow = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO", 69),
      answer("FINOPS_C02", "NO", 69),
    ],
  });
  const qualified = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO", 70),
      answer("FINOPS_C02", "NO", 70),
    ],
  });

  const below = belowRecommendNow.technologies.find(
    (item) => item.id === "apptio",
  );
  const atThreshold = qualified.technologies.find(
    (item) => item.id === "apptio",
  );
  assert.ok(below.propensity >= 80);
  assert.equal(below.confidence, 69);
  assert.equal(below.action, "VALIDATE");
  assert.ok(atThreshold.propensity >= 80);
  assert.equal(atThreshold.confidence, 70);
  assert.equal(atThreshold.action, "RECOMMEND_NOW");
});

test("keeps contradictory solutions visible and diversifies FinOps output", async () => {
  const { engine } = await loadModules();
  const opportunity = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "NO"),
      answer("FINOPS_C02", "NO"),
      answer("FINOPS_C04", "NO"),
      answer("FINOPS_C05", "NO"),
    ],
  });
  const contradicted = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["finops"],
    answers: [
      answer("FINOPS_C01", "YES"),
      answer("FINOPS_C02", "YES"),
      answer("FINOPS_C05", "YES"),
    ],
  });

  const names = new Set(opportunity.technologies.map((item) => item.name));
  assert.ok(names.has("IBM Apptio"));
  assert.ok(names.has("IBM Cloudability"));
  assert.ok(names.has("IBM Planning Analytics"));
  assert.ok(names.has("IBM Turbonomic"));
  assert.equal(
    contradicted.technologies.find((item) => item.id === "cloudability")
      ?.action,
    "DO_NOT_RECOMMEND",
  );
});

test("adds solution names to the answer trace", async () => {
  const { engine } = await loadModules();
  const assessment = engine.scoreCapabilityDrivenAssessment({
    capabilityKeys: ["hybrid-cloud"],
    answers: [answer("HYBRID_CLOUD_C03", "NO")],
  });
  const trace = assessment.trace.find(
    (item) => item.questionId === "HYBRID_CLOUD_C03",
  );

  assert.ok(trace.technologyIds.includes("hashicorp-terraform"));
  assert.ok(trace.technologyIds.includes("red-hat-ansible"));
  assert.ok(trace.technologyNames.includes("HashiCorp Terraform"));
  assert.ok(
    trace.technologyNames.includes("Red Hat Ansible Automation Platform"),
  );
});

test("renders every evaluated solution with fit, gate, decision, and evidence details", async () => {
  const source = await readFile(
    new URL("app/KyndrylAssessmentResults.tsx", root),
    "utf8",
  );

  assert.match(source, /const evaluatedSolutions = assessment\.technologies/);
  assert.doesNotMatch(source, /technologies\.slice\(0,\s*8\)/);
  assert.match(source, /Solution fit/);
  assert.match(source, /not a probability of sale/);
  assert.match(source, /gateLabel\(technology\.gateStatus, locale\)/);
  assert.match(source, /actionLabel\(technology\.action, locale\)/);
  assert.match(source, /technology\.evidence\.map/);
  assert.match(source, /technology\.components\[key\]/);
});
