"use client";

import { useState, useEffect, useCallback } from "react";

interface RubricScore {
  dimension: string;
  score: number;
  maxScore: number;
  passed: boolean;
  details: string;
}

interface EvalResult {
  caseId: string;
  restaurant: string;
  intent: string;
  timestamp: string;
  analysis: {
    parallaxScore: number;
    googleScore: number;
    confidence: string;
    explanation: string;
  };
  rubricScores: RubricScore[];
  overallScore: number;
  overallMax: number;
  passed: boolean;
}

interface ReportSummary {
  totalCases: number;
  passed: number;
  failed: number;
  overallScore: number;
  overallMax: number;
  byDimension: Record<string, { score: number; max: number; passRate: number }>;
}

interface EvalReport {
  runId: string;
  timestamp: string;
  promptHash: string;
  results: EvalResult[];
  summary: ReportSummary;
}

interface EvalData {
  reports: EvalReport[];
  fixtureCount: number;
  fixtureIds: string[];
}

function PassBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        passed
          ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800"
          : "bg-red-900/50 text-red-400 border border-red-800"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  );
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-zinc-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-12">
        {score}/{max}
      </span>
    </div>
  );
}

function DimensionOverview({ summary }: { summary: ReportSummary }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-4">
        Dimensions
      </h3>
      <div className="space-y-3">
        {Object.entries(summary.byDimension).map(([dim, stats]) => (
          <div key={dim} className="flex items-center justify-between">
            <span className="text-sm text-zinc-300 capitalize w-48 truncate">
              {dim.replace(/_/g, " ")}
            </span>
            <ScoreBar score={stats.score} max={stats.max} />
            <span
              className={`text-xs w-12 text-right ${
                stats.passRate >= 0.8
                  ? "text-emerald-400"
                  : stats.passRate >= 0.5
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {(stats.passRate * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseDetail({ result }: { result: EvalResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <PassBadge passed={result.passed} />
          <span className="text-sm font-medium text-zinc-200">
            {result.restaurant}
          </span>
          <span className="text-xs text-zinc-500 truncate max-w-xs">
            {result.intent}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            P:{result.analysis.parallaxScore} / G:
            {result.analysis.googleScore}
          </span>
          <ScoreBar score={result.overallScore} max={result.overallMax} />
          <span className="text-zinc-600">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-zinc-500">Parallax Score</span>
              <p className="text-zinc-200 text-lg font-bold">
                {result.analysis.parallaxScore}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Google Score</span>
              <p className="text-zinc-200 text-lg font-bold">
                {result.analysis.googleScore}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Confidence</span>
              <p className="text-zinc-200 text-lg font-bold capitalize">
                {result.analysis.confidence}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs text-zinc-500">Explanation</span>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              {result.analysis.explanation}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-zinc-500">Rubric Scores</span>
            {result.rubricScores.map((rs, i) => (
              <div
                key={i}
                className="flex items-start justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      rs.passed ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {rs.passed ? "+" : "x"}
                  </span>
                  <span className="text-zinc-300 capitalize">
                    {rs.dimension.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-zinc-500 text-right max-w-md truncate">
                  {rs.details}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  const headers = useCallback(
    (): Record<string, string> =>
      password ? { Authorization: `Bearer ${password}` } : {},
    [password]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eval", { headers: headers() });
      if (res.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } catch {
      setError("Failed to load eval data");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function runEvals() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: headers(),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Eval run failed");
        return;
      }
      await fetchData();
    } catch {
      setError("Failed to run evals");
    } finally {
      setRunning(false);
    }
  }

  if (!authed && !loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-zinc-100 text-center">
            Parallax Admin
          </h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={fetchData}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-500"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <span className="text-zinc-500">Loading...</span>
      </main>
    );
  }

  const latest = data?.reports?.[0];

  return (
    <main className="flex-1 flex flex-col px-4 py-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Parallax Eval Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            {data?.fixtureCount ?? 0} fixtures |{" "}
            {data?.reports?.length ?? 0} reports
          </p>
        </div>
        <button
          onClick={runEvals}
          disabled={running}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? "Running..." : "Run Evals"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {latest && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Overall
              </p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">
                {latest.summary.overallMax > 0
                  ? (
                      (latest.summary.overallScore /
                        latest.summary.overallMax) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
              <p className="text-xs text-zinc-600">
                {latest.summary.overallScore}/{latest.summary.overallMax}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Passed
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {latest.summary.passed}
              </p>
              <p className="text-xs text-zinc-600">
                of {latest.summary.totalCases}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Failed
              </p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {latest.summary.failed}
              </p>
              <p className="text-xs text-zinc-600">
                of {latest.summary.totalCases}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Prompt Hash
              </p>
              <p className="text-lg font-mono text-zinc-400 mt-1">
                {latest.promptHash}
              </p>
              <p className="text-xs text-zinc-600">
                {new Date(latest.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Dimension overview */}
          <div className="mb-8">
            <DimensionOverview summary={latest.summary} />
          </div>

          {/* Run history */}
          {data && data.reports.length > 1 && (
            <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-4">
                Run History
              </h3>
              <div className="space-y-2">
                {data.reports.map((report) => {
                  const pct =
                    report.summary.overallMax > 0
                      ? (
                          (report.summary.overallScore /
                            report.summary.overallMax) *
                          100
                        ).toFixed(0)
                      : "0";
                  return (
                    <div
                      key={report.runId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-zinc-400">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-zinc-600 font-mono">
                          {report.promptHash}
                        </span>
                        <span
                          className={`font-medium ${
                            Number(pct) >= 80
                              ? "text-emerald-400"
                              : Number(pct) >= 50
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {pct}%
                        </span>
                        <span className="text-zinc-500">
                          {report.summary.passed}/{report.summary.totalCases}{" "}
                          passed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Individual case results */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-4">
              Fixture Results
            </h3>
            <div className="space-y-2">
              {latest.results.map((result) => (
                <CaseDetail key={result.caseId} result={result} />
              ))}
            </div>
          </div>
        </>
      )}

      {!latest && (
        <div className="text-center text-zinc-500 py-16">
          No eval reports yet. Click &ldquo;Run Evals&rdquo; to generate the
          first report.
        </div>
      )}
    </main>
  );
}
