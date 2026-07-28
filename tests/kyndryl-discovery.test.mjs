import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function loadKyndrylModule() {
  const [typescript, source] = await Promise.all([
    import("typescript"),
    readFile(new URL("lib/kyndryl-discovery.ts", root), "utf8"),
  ]);
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
}

const answer = (questionId, value, status = "confirmed") => ({
  questionId,
  status,
  structured: status === "unknown" ? {} : { value },
  answerText: "",
  confidence: status === "unknown" ? 0 : 85,
});

test("materializes the eight battle-card pillars with six traceable questions each", async () => {
  const engine = await loadKyndrylModule();
  assert.equal(engine.KYNDYRL_DISCOVERY_VERSION, "2026.2-kyndryl");
  assert.equal(engine.KYNDYRL_PILLARS.length, 8);
  assert.equal(engine.KYNDYRL_QUESTION_CATALOG.length, 48);
  for (const pillar of engine.KYNDYRL_PILLARS) {
    assert.equal(pillar.questions.length, 6);
    assert.ok(pillar.journeys.length >= 3);
    assert.ok(pillar.capabilities.length >= 5);
    assert.ok(pillar.technologies.length >= 4);
    for (const question of pillar.questions) {
      assert.ok(question.responseMapping.YES.evidenceId);
      assert.ok(question.responseMapping.NO.evidenceId);
      assert.ok(question.capabilityIds.length);
      assert.ok(
        question.responseMapping.YES.technologyIds.length ||
          question.responseMapping.NO.technologyIds.length,
      );
    }
  }
});

test("keeps confidence separate from propensity and excludes N/A from its denominator", async () => {
  const engine = await loadKyndrylModule();
  const assessment = engine.scoreKyndrylAssessment({
    pillarKeys: ["infrastructure-modernization"],
    locale: "en-US",
    answers: [
      answer("infra-visibility", "NO"),
      answer("infra-governance", "DONT_KNOW", "unknown"),
      answer("infra-iac", "NOT_APPLICABLE"),
      answer("infra-automation", "NO"),
    ],
  });
  assert.equal(assessment.summary.knownAnswers, 2);
  assert.equal(assessment.summary.dontKnowAnswers, 1);
  assert.equal(assessment.summary.notApplicableAnswers, 1);
  assert.equal(assessment.summary.applicableQuestions, 5);
  assert.equal(assessment.summary.overallConfidence, 40);
  assert.ok(assessment.technologies.some((item) => item.propensity > 0));
});

test("enforces the IBM Z required gate before any product recommendation", async () => {
  const engine = await loadKyndrylModule();
  const blocked = engine.scoreKyndrylAssessment({
    pillarKeys: ["ibm-z"],
    answers: [
      answer("ibmz-platform", "NO"),
      answer("ibmz-monitoring", "NO"),
      answer("ibmz-incidents", "NO"),
    ],
  });
  assert.ok(
    blocked.technologies.every(
      (item) =>
        item.gateStatus === "FAILED" &&
        item.propensity === 0 &&
        item.action === "GATE_FAILED",
    ),
  );

  const open = engine.scoreKyndrylAssessment({
    pillarKeys: ["ibm-z"],
    answers: [
      answer("ibmz-platform", "YES"),
      answer("ibmz-monitoring", "NO"),
      answer("ibmz-incidents", "NO"),
      answer("ibmz-modernization", "YES"),
      answer("ibmz-security", "NO"),
      answer("ibmz-optimization", "NO"),
    ],
  });
  assert.ok(open.technologies.some((item) => item.propensity > 0));
  assert.ok(open.technologies.every((item) => item.gateStatus === "SATISFIED"));
});

test("calculates every technology with the published explainable formula", async () => {
  const engine = await loadKyndrylModule();
  const assessment = engine.scoreKyndrylAssessment({
    pillarKeys: ["modern-operations"],
    answers: engine
      .getKyndrylPillar("modern-operations")
      .questions.map((question) => answer(question.id, "NO")),
  });
  const technology = assessment.technologies.find(
    (item) => item.propensity > 0,
  );
  assert.ok(technology);
  const c = technology.components;
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
  assert.equal(technology.propensity, expected);
  assert.ok(technology.evidence.length);
  assert.ok(technology.capabilities.length);
  assert.match(technology.explanation, /assessed because/i);
});

test("localizes curated questions without changing stable scoring IDs", async () => {
  const engine = await loadKyndrylModule();
  const english = engine.getLocalizedKyndrylPillar("cyber-security", "en-US");
  const portuguese = engine.getLocalizedKyndrylPillar(
    "cyber-security",
    "pt-BR",
  );
  assert.equal(english.key, portuguese.key);
  assert.notEqual(english.label, portuguese.label);
  assert.deepEqual(
    english.questions.map((question) => question.id),
    portuguese.questions.map((question) => question.id),
  );
  assert.deepEqual(
    english.technologies.map((technology) => technology.name),
    portuguese.technologies.map((technology) => technology.name),
  );
});
