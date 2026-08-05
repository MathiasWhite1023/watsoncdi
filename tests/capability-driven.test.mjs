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

