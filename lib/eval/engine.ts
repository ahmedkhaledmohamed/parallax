import { GooglePlaceResult } from "../types";
import { decomposeReviews, matchAndScore } from "../review-analyzer";
import { runAllRubrics, scoreIntentAlignment } from "./rubrics";
import { judgeExplanationQuality } from "./judge";
import { EvalCase, EvalResult, EvalReport, EvalComparison } from "./types";

export async function runCase(evalCase: EvalCase): Promise<EvalResult> {
  const place: GooglePlaceResult = {
    ...evalCase.mockPlace,
    reviews: evalCase.mockReviews,
  };

  const decomposed = await decomposeReviews(evalCase.mockReviews);
  const analysis = await matchAndScore(place, decomposed, evalCase.intent);
  const rubricScores = runAllRubrics(analysis, decomposed, evalCase);

  try {
    const judgeScore = await judgeExplanationQuality(evalCase.intent, analysis);
    rubricScores.push(judgeScore);
  } catch {
    // Judge failure is non-fatal
  }

  const overallScore = rubricScores.reduce((sum, r) => sum + r.score, 0);
  const overallMax = rubricScores.reduce((sum, r) => sum + r.maxScore, 0);

  return {
    caseId: evalCase.id,
    restaurant: evalCase.restaurant,
    intent: evalCase.intent,
    timestamp: new Date().toISOString(),
    analysis,
    decomposed,
    rubricScores,
    overallScore,
    overallMax,
    passed: rubricScores.every((r) => r.passed),
  };
}

export async function runAllCases(
  fixtures: EvalCase[]
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const fixture of fixtures) {
    try {
      const result = await runCase(fixture);
      results.push(result);
    } catch (err) {
      console.error(`  Case ${fixture.id} failed: ${err}`);
    }
  }

  // Paired alignment checks
  const resultMap = new Map(results.map((r) => [r.caseId, r]));
  const checkedPairs = new Set<string>();

  for (const fixture of fixtures) {
    if (!fixture.pairedWith) continue;
    const pairKey = [fixture.id, fixture.pairedWith].sort().join(":");
    if (checkedPairs.has(pairKey)) continue;
    checkedPairs.add(pairKey);

    const resultA = resultMap.get(fixture.id);
    const resultB = resultMap.get(fixture.pairedWith);
    if (!resultA || !resultB) continue;

    const alignmentScore = scoreIntentAlignment(
      resultA.analysis,
      resultB.analysis,
      resultA.caseId,
      resultB.caseId
    );

    resultA.rubricScores.push(alignmentScore);
    resultA.overallScore += alignmentScore.score;
    resultA.overallMax += alignmentScore.maxScore;
    if (!alignmentScore.passed) resultA.passed = false;
  }

  return results;
}

export function buildReport(
  results: EvalResult[],
  promptHash: string
): EvalReport {
  const byDimension: Record<
    string,
    { score: number; max: number; passCount: number; total: number }
  > = {};

  for (const result of results) {
    for (const rs of result.rubricScores) {
      if (!byDimension[rs.dimension]) {
        byDimension[rs.dimension] = { score: 0, max: 0, passCount: 0, total: 0 };
      }
      byDimension[rs.dimension].score += rs.score;
      byDimension[rs.dimension].max += rs.maxScore;
      byDimension[rs.dimension].passCount += rs.passed ? 1 : 0;
      byDimension[rs.dimension].total += 1;
    }
  }

  const dimensionSummary: Record<
    string,
    { score: number; max: number; passRate: number }
  > = {};
  for (const [dim, stats] of Object.entries(byDimension)) {
    dimensionSummary[dim] = {
      score: stats.score,
      max: stats.max,
      passRate: stats.total > 0 ? stats.passCount / stats.total : 0,
    };
  }

  const overallScore = results.reduce((sum, r) => sum + r.overallScore, 0);
  const overallMax = results.reduce((sum, r) => sum + r.overallMax, 0);

  return {
    runId: `eval-${Date.now()}`,
    timestamp: new Date().toISOString(),
    promptHash,
    results,
    summary: {
      totalCases: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      overallScore,
      overallMax,
      byDimension: dimensionSummary,
    },
  };
}

export function compareReports(
  baseline: EvalReport,
  current: EvalReport
): EvalComparison {
  const regressions: EvalComparison["regressions"] = [];
  const improvements: EvalComparison["improvements"] = [];

  for (const currentResult of current.results) {
    const baselineResult = baseline.results.find(
      (r) => r.caseId === currentResult.caseId
    );
    if (!baselineResult) continue;

    for (const currentRubric of currentResult.rubricScores) {
      const baselineRubric = baselineResult.rubricScores.find(
        (r) => r.dimension === currentRubric.dimension
      );
      if (!baselineRubric) continue;

      const baseNorm =
        baselineRubric.maxScore > 0
          ? baselineRubric.score / baselineRubric.maxScore
          : 0;
      const currNorm =
        currentRubric.maxScore > 0
          ? currentRubric.score / currentRubric.maxScore
          : 0;
      const delta = currNorm - baseNorm;

      if (delta < -0.1) {
        regressions.push({
          caseId: currentResult.caseId,
          dimension: currentRubric.dimension,
          baselineScore: baseNorm,
          currentScore: currNorm,
          delta,
        });
      } else if (delta > 0.1) {
        improvements.push({
          caseId: currentResult.caseId,
          dimension: currentRubric.dimension,
          baselineScore: baseNorm,
          currentScore: currNorm,
          delta,
        });
      }
    }
  }

  const baseNorm =
    baseline.summary.overallMax > 0
      ? baseline.summary.overallScore / baseline.summary.overallMax
      : 0;
  const currNorm =
    current.summary.overallMax > 0
      ? current.summary.overallScore / current.summary.overallMax
      : 0;

  return {
    baselineRunId: baseline.runId,
    currentRunId: current.runId,
    regressions,
    improvements,
    overallDelta: currNorm - baseNorm,
  };
}
