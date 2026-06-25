import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { EvalCase, EvalReport } from "@/lib/eval/types";
import { runAllCases, buildReport } from "@/lib/eval/engine";

const FIXTURES_DIR = join(process.cwd(), "lib/eval/fixtures");
const REPORTS_DIR = join(process.cwd(), "lib/eval/reports");

function loadFixtures(): EvalCase[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIXTURES_DIR, f), "utf-8")) as EvalCase);
}

function loadReports(): EvalReport[] {
  if (!existsSync(REPORTS_DIR)) return [];
  return readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 20)
    .map((f) => {
      const report = JSON.parse(readFileSync(join(REPORTS_DIR, f), "utf-8")) as EvalReport;
      return {
        ...report,
        results: report.results.map((r) => ({
          ...r,
          decomposed: [],
        })),
      };
    });
}

function getPromptHash(): string {
  const analyzerPath = join(process.cwd(), "lib/review-analyzer.ts");
  const source = readFileSync(analyzerPath, "utf-8");
  return createHash("sha256").update(source).digest("hex").slice(0, 12);
}

function checkAuth(request: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return true;
  const auth = request.headers.get("authorization");
  if (!auth) return false;
  const token = auth.replace("Bearer ", "");
  return token === password;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = loadReports();
  const fixtures = loadFixtures();

  return NextResponse.json({
    reports,
    fixtureCount: fixtures.length,
    fixtureIds: fixtures.map((f) => f.id),
  });
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fixtures = loadFixtures();
    if (fixtures.length === 0) {
      return NextResponse.json({ error: "No fixtures found" }, { status: 404 });
    }

    const results = await runAllCases(fixtures);
    const report = buildReport(results, getPromptHash());

    if (!existsSync(REPORTS_DIR)) {
      mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const reportFile = join(
      REPORTS_DIR,
      `${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`
    );
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return NextResponse.json(report);
  } catch (err) {
    console.error("Eval run failed:", err);
    return NextResponse.json(
      { error: "Eval run failed. Check server logs." },
      { status: 500 }
    );
  }
}
