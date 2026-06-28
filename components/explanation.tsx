import { AnalysisResult } from "@/lib/types";

interface ExplanationProps {
  result: AnalysisResult;
}

function sentimentBar(sentiment: number, weight: number) {
  const pct = ((sentiment + 1) / 2) * 100;
  const barColor =
    sentiment >= 0.3
      ? "bg-emerald-500"
      : sentiment >= -0.3
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-8 text-right">
        {(weight * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export function Explanation({ result }: ExplanationProps) {
  return (
    <div className="w-full max-w-2xl space-y-4">
      {result.parsedDimensions && result.parsedDimensions.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              What we understood
            </h3>
            {result.intentSource === "llm" && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">
                AI-interpreted
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.parsedDimensions.map((d) => (
              <span
                key={d.dimension}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
              >
                <span className="capitalize">
                  {d.dimension.replace(/_/g, " ")}
                </span>
                <span className="text-zinc-500">
                  {(d.weight * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-3">
          Why the difference?
        </h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {result.explanation}
        </p>
      </div>

      {result.dimensionBreakdown.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-4">
            Your dimensions
          </h3>
          <div className="space-y-3">
            {result.dimensionBreakdown.map((d) => (
              <div key={d.dimension}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300 capitalize">
                    {d.dimension.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {d.reviewCount} mention{d.reviewCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {sentimentBar(d.averageSentiment, d.weight)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
