import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createJiti } from "jiti";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const jiti = createJiti(import.meta.url);
const {
  evaluateGuidedPillarCompletion,
  isEssentialGuidedCatalogQuestion,
} = await jiti.import("../lib/guided-discovery.ts");

test("final essential answer completes the capability and opens its calculated result", async () => {
  const [api, workspace] = await Promise.all([
    read("app/api/discoveries/route.ts"),
    read("app/GuidedDiscoveryWorkspace.tsx"),
  ]);
  const refresh =
    api.match(
      /async function refreshGuidedSession[\s\S]*?async function materializeLegacyGuidedAnswers/,
    )?.[0] || "";
  const answerMutation =
    api.match(
      /if \(body\.action === "guided_discovery_answer"\)[\s\S]*?if \(body\.action === "guided_discovery_patch"\)/,
    )?.[0] || "";

  assert.match(refresh, /evaluateGuidedPillarCompletion/);
  assert.match(refresh, /submittedQuestionId: options\.submittedQuestionId/);
  assert.match(
    refresh,
    /status = CASE WHEN \? = 1 THEN 'completed' ELSE status END/,
  );
  assert.match(
    answerMutation,
    /submittedQuestionId:[\s\S]*?answerStatus === "draft" \? null : input\.questionId/,
  );
  assert.match(workspace, /setShowResults\(completedReview\)/);
});

test("completion helper opens a preliminary result and preserves the optional route", () => {
  const essentialQuestionIds = ["C1", "C2", "C3", "C4", "C5"];
  const coreAnswers = essentialQuestionIds.map((questionId) => ({
    questionId,
    status: "confirmed",
    evidenceStatus: "reported",
    structured: { value: "YES" },
    confidence: 80,
  }));
  const common = {
    essentialQuestionIds,
    coveragePercent: 100,
    confidencePercent: 80,
    conflictCount: 0,
  };

  const preliminary = evaluateGuidedPillarCompletion({
    ...common,
    answers: coreAnswers,
    submittedQuestionId: "C5",
    hasRemainingQuestions: true,
  });
  assert.equal(preliminary.allEssentialAddressed, true);
  assert.equal(preliminary.shouldComplete, true);
  assert.equal(preliminary.reviewedStatus, "reviewed_sufficient");

  const firstDeep = evaluateGuidedPillarCompletion({
    ...common,
    answers: [
      ...coreAnswers,
      {
        questionId: "D1",
        status: "confirmed",
        structured: { value: "YES" },
      },
    ],
    submittedQuestionId: "D1",
    hasRemainingQuestions: true,
    previousStatus: "reviewed_sufficient",
  });
  assert.equal(firstDeep.shouldComplete, false);
  assert.equal(firstDeep.pillarStatus, "reviewed_sufficient");

  const finalDeep = evaluateGuidedPillarCompletion({
    ...common,
    answers: [
      ...coreAnswers,
      {
        questionId: "D2",
        status: "confirmed",
        structured: { value: "YES" },
      },
    ],
    submittedQuestionId: "D2",
    hasRemainingQuestions: false,
  });
  assert.equal(finalDeep.shouldComplete, true);
  assert.equal(finalDeep.pillarStatus, "reviewed_sufficient");

  const fourOfFive = evaluateGuidedPillarCompletion({
    ...common,
    answers: coreAnswers.slice(0, 4),
    submittedQuestionId: "C4",
    hasRemainingQuestions: true,
    previousStatus: "reviewed_sufficient",
  });
  assert.equal(fourOfFive.allEssentialAddressed, false);
  assert.equal(fourOfFive.shouldComplete, false);
  assert.equal(fourOfFive.pillarStatus, "in_progress");
});

test("only explicit catalog core questions count toward the essential denominator", () => {
  assert.equal(isEssentialGuidedCatalogQuestion(undefined), false);
  assert.equal(isEssentialGuidedCatalogQuestion(null), false);
  assert.equal(isEssentialGuidedCatalogQuestion({ essential: false }), false);
  assert.equal(isEssentialGuidedCatalogQuestion({ essential: true }), true);
});

test("route applies explicit essential classification to snapshots, refresh and completion", async () => {
  const api = await read("app/api/discoveries/route.ts");

  assert.doesNotMatch(api, /catalog\?\.essential !== false/);
  assert.ok(
    [...api.matchAll(/isEssentialGuidedCatalogQuestion\(/g)].length >= 3,
  );
  assert.match(api, /previousStatus: existingPillarStatus\?\.status/);
  assert.match(api, /status: completion\.pillarStatus/);
});

test("results distinguish essential continuation from deeper optional discovery", async () => {
  const [workspace, results] = await Promise.all([
    read("app/GuidedDiscoveryWorkspace.tsx"),
    read("app/KyndrylAssessmentResults.tsx"),
  ]);
  const continueFlow =
    workspace.match(
      /const isPendingQuestion[\s\S]*?const currentPillarQuestionIds/,
    )?.[0] || "";

  assert.match(continueFlow, /pendingEssentialQuestion/);
  assert.match(continueFlow, /pendingOptionalQuestion/);
  assert.match(continueFlow, /continuePendingDiscovery/);
  assert.match(continueFlow, /operation: "reopen_pillar"/);
  assert.match(
    continueFlow,
    /\[updatedView\?\.nextQuestion, updatedView\?\.currentQuestion\]\.find[\s\S]*?updatedView\?\.questions\.find/,
  );
  assert.match(continueFlow, /setActiveQuestionId\(nextPending\.id\)/);
  assert.match(workspace, /pendingEssentialQuestion[\s\S]*?Continue discovery/);
  assert.match(workspace, /pendingOptionalQuestion[\s\S]*?Continue deeper discovery/);
  assert.match(
    workspace,
    /onContinue=\{\s*pendingQuestion\s*\? \(\) => void continuePendingDiscovery\(\)\s*: undefined\s*\}/,
  );
  assert.match(results, /continueDeeper \? c\.continueDeeper : c\.continue/);
  assert.match(results, /Continue discovery/);
  assert.match(results, /Continue deeper discovery/);
  assert.match(results, /Continuar descoberta/);
  assert.match(results, /Aprofundar descoberta/);
});

test("recovers an existing 5/5 in-progress session from the capability hub", async () => {
  const workspace = await read("app/GuidedDiscoveryWorkspace.tsx");
  const openPillar =
    workspace.match(
      /const openPillar = async \([\s\S]*?const markNotRelevant = async/,
    )?.[0] || "";

  assert.match(
    openPillar,
    /pillar\.answeredCount >= pillar\.requiredCount/,
  );
  assert.match(
    openPillar,
    /hasAllEssentialAnswers[\s\S]*?"complete_pillar"[\s\S]*?: "reopen_pillar"/,
  );
  assert.match(openPillar, /setShowResults\(true\)/);
});

test("keeps a zero-fit solution visible as a calculated deterministic result", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const pillarAssessment =
    api.match(
      /const pillarAssessments = GUIDED_DISCOVERY_PILLARS\.map[\s\S]*?const reviewedStatuses/,
    )?.[0] || "";

  assert.match(
    pillarAssessment,
    /leadingTechnology: assessment\.pillars\[0\]\?\.leadingTechnology \|\| null/,
  );
  assert.doesNotMatch(
    pillarAssessment,
    /\(assessment\.pillars\[0\]\?\.propensity \|\| 0\) > 0/,
  );
});

test("labels a fully assessed capability without a linked product as a calculated outcome", async () => {
  const workspace = await read("app/GuidedDiscoveryWorkspace.tsx");
  const hub =
    workspace.match(/function PillarHub[\s\S]*?function StructuredInput/)?.[0] ||
    "";

  assert.match(hub, /No evidence-backed opportunity/);
  assert.match(hub, /Nenhuma oportunidade sustentada por evidências/);
  assert.match(hub, /pillar\.answeredCount >= pillar\.requiredCount/);
  assert.match(
    hub,
    /pillar\.leadingTechnology \|\|[\s\S]*?c\.noEvidenceOpportunity[\s\S]*?: c\.noTechnology/,
  );
});

test("completed sessions do not expose a stale active question", async () => {
  const api = await read("app/api/discoveries/route.ts");
  const snapshot =
    api.match(
      /const nextRanked = ranked\[0\][\s\S]*?const checkpoint = checkpointForRoute/,
    )?.[0] || "";

  assert.match(snapshot, /effectiveSession\?\.status === "completed"/);
  assert.match(snapshot, /\? null/);
});
