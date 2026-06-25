import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { GooglePlaceResult } from "../types";
import { decomposeReviews, matchAndScore } from "../review-analyzer";
import { runAllRubrics, scoreIntentAlignment } from "./rubrics";
import { judgeExplanationQuality } from "./judge";
import { EvalCase, EvalResult, EvalReport, EvalComparison } from "./types";

const FIXTURES_DIR = join(__dirname, "fixtures");
const REPORTS_DIR = join(__dirname, "reports");

function loadFixtures(): EvalCase[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), "utf-8")) as EvalCase);
}

function getPromptHash(): string {
  const analyzerSource = readFileSync(
    join(__dirname, "..", "review-analyzer.ts"),
    "utf-8"
  );
  return createHash("sha256").update(analyzerSource).digest("hex").slice(0, 12);
}

function loadReport(path: string): EvalReport {
  return JSON.parse(readFileSync(path, "utf-8")) as EvalReport;
}

function findLatestReport(): string | null {
  if (!existsSync(REPORTS_DIR)) return null;
  const files = readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "baseline.json")
    .sort()
    .reverse();
  return files.length > 0 ? join(REPORTS_DIR, files[0]) : null;
}

async function runCase(evalCase: EvalCase): Promise<EvalResult> {
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
  } catch (err) {
    console.error(`    Judge failed for ${evalCase.id}: ${err}`);
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

function buildReport(results: EvalResult[]): EvalReport {
  const byDimension: Record<string, { score: number; max: number; passCount: number; total: number }> = {};

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

  const dimensionSummary: Record<string, { score: number; max: number; passRate: number }> = {};
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
    promptHash: getPromptHash(),
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

function compareReports(baseline: EvalReport, current: EvalReport): EvalComparison {
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

      const baseNorm = baselineRubric.maxScore > 0 ? baselineRubric.score / baselineRubric.maxScore : 0;
      const currNorm = currentRubric.maxScore > 0 ? currentRubric.score / currentRubric.maxScore : 0;
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

  const baseNorm = baseline.summary.overallMax > 0
    ? baseline.summary.overallScore / baseline.summary.overallMax
    : 0;
  const currNorm = current.summary.overallMax > 0
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

function printResult(result: EvalResult): void {
  const status = result.passed ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(
    `  ${status} ${result.caseId} — ${result.restaurant} (${result.overallScore}/${result.overallMax})`
  );
  console.log(`         Intent: "${result.intent}"`);
  console.log(
    `         Parallax: ${result.analysis.parallaxScore} vs Google: ${result.analysis.googleScore} (confidence: ${result.analysis.confidence})`
  );
  for (const rs of result.rubricScores) {
    const icon = rs.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(
      `         ${icon} ${rs.dimension}: ${rs.score}/${rs.maxScore} — ${rs.details}`
    );
  }
  console.log();
}

function printComparison(comparison: EvalComparison): void {
  console.log(`\nComparison: ${comparison.baselineRunId} → ${comparison.currentRunId}`);
  console.log(`Overall delta: ${comparison.overallDelta > 0 ? "+" : ""}${(comparison.overallDelta * 100).toFixed(1)}%\n`);

  if (comparison.regressions.length > 0) {
    console.log("\x1b[31mRegressions:\x1b[0m");
    for (const r of comparison.regressions) {
      console.log(
        `  ${r.caseId} / ${r.dimension}: ${(r.baselineScore * 100).toFixed(0)}% → ${(r.currentScore * 100).toFixed(0)}% (${(r.delta * 100).toFixed(1)}%)`
      );
    }
  }

  if (comparison.improvements.length > 0) {
    console.log("\x1b[32mImprovements:\x1b[0m");
    for (const imp of comparison.improvements) {
      console.log(
        `  ${imp.caseId} / ${imp.dimension}: ${(imp.baselineScore * 100).toFixed(0)}% → ${(imp.currentScore * 100).toFixed(0)}% (+${(imp.delta * 100).toFixed(1)}%)`
      );
    }
  }

  if (comparison.regressions.length === 0 && comparison.improvements.length === 0) {
    console.log("No significant changes detected.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "run";

  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  if (command === "run") {
    const fixtures = loadFixtures();
    if (fixtures.length === 0) {
      console.log("No fixtures found in lib/eval/fixtures/. Add .json test cases first.");
      process.exit(1);
    }

    console.log(`\nRunning ${fixtures.length} eval case(s)...\n`);

    const results: EvalResult[] = [];
    for (const fixture of fixtures) {
      try {
        const result = await runCase(fixture);
        printResult(result);
        results.push(result);
      } catch (err) {
        console.error(`  \x1b[31mERROR\x1b[0m ${fixture.id}: ${err}`);
      }
    }

    // Run paired intent-alignment checks
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

      const icon = alignmentScore.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(`  ${icon} PAIRED: ${alignmentScore.details}\n`);
    }

    const report = buildReport(results);

    const reportFile = join(
      REPORTS_DIR,
      `${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportFile}`);

    console.log(`\nSummary: ${report.summary.passed}/${report.summary.totalCases} passed (${report.summary.overallScore}/${report.summary.overallMax} points)`);
    for (const [dim, stats] of Object.entries(report.summary.byDimension)) {
      console.log(`  ${dim}: ${stats.score}/${stats.max} (${(stats.passRate * 100).toFixed(0)}% pass rate)`);
    }

    const hasFailures = report.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
  }

  if (command === "compare") {
    const baselinePath = args[1] ?? join(REPORTS_DIR, "baseline.json");
    const currentPath = args[2] ?? findLatestReport();

    if (!currentPath || !existsSync(baselinePath)) {
      console.error("Need both baseline and current report. Usage: eval:compare [baseline.json] [current.json]");
      process.exit(1);
    }

    const baseline = loadReport(baselinePath);
    const current = loadReport(currentPath);
    const comparison = compareReports(baseline, current);
    printComparison(comparison);

    const hasRegressions = comparison.regressions.length > 0;
    process.exit(hasRegressions ? 1 : 0);
  }

  if (command === "baseline") {
    const latestPath = findLatestReport();
    if (!latestPath) {
      console.error("No reports found. Run `npm run eval` first.");
      process.exit(1);
    }
    const baselinePath = join(REPORTS_DIR, "baseline.json");
    writeFileSync(baselinePath, readFileSync(latestPath, "utf-8"));
    console.log(`Baseline saved: ${baselinePath}`);
    process.exit(0);
  }

  console.error(`Unknown command: ${command}. Use: run, compare, baseline`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Eval runner failed:", err);
  process.exit(1);
});
