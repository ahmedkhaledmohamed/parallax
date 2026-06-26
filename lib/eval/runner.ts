import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { runAllCases, buildReport, compareReports } from "./engine";
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

    const results = await runAllCases(fixtures);
    for (const result of results) {
      printResult(result);
    }

    const report = buildReport(results, getPromptHash());

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

    const baselinePath = join(REPORTS_DIR, "baseline.json");
    if (existsSync(baselinePath)) {
      const baseline = loadReport(baselinePath);
      const comparison = compareReports(baseline, report);
      printComparison(comparison);

      if (comparison.overallDelta < -0.05) {
        console.log(`\n\x1b[31mOverall score regressed by ${(comparison.overallDelta * 100).toFixed(1)}% (threshold: -5%). Failing CI.\x1b[0m`);
        process.exit(1);
      }
      console.log("\n\x1b[32mNo significant overall regression vs baseline.\x1b[0m");
    }

    process.exit(0);
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
