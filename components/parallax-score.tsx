import { AnalysisResult } from "@/lib/types";

interface ParallaxScoreProps {
  result: AnalysisResult;
}

function scoreColor(score: number): string {
  if (score >= 4.0) return "text-emerald-400";
  if (score >= 3.0) return "text-amber-400";
  return "text-red-400";
}

function confidenceBadge(confidence: "high" | "medium" | "low") {
  const styles = {
    high: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
    medium: "bg-amber-900/50 text-amber-400 border-amber-800",
    low: "bg-red-900/50 text-red-400 border-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[confidence]}`}
    >
      {confidence} confidence
    </span>
  );
}

export function ParallaxScore({ result }: ParallaxScoreProps) {
  const delta = result.parallaxScore - result.googleScore;
  const deltaSign = delta > 0 ? "+" : "";
  const deltaColor =
    Math.abs(delta) < 0.3
      ? "text-zinc-500"
      : delta > 0
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <div className="w-full max-w-2xl">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">
            {result.restaurant.name}
          </h2>
          <p className="text-sm text-zinc-500">{result.restaurant.address}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Google
            </p>
            <p className="text-3xl font-bold text-zinc-400">
              {result.googleScore.toFixed(1)}
            </p>
            <p className="text-xs text-zinc-600">
              {result.restaurant.totalReviews.toLocaleString()} reviews
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className={`text-lg font-mono font-bold ${deltaColor}`}>
                {deltaSign}{delta.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-amber-500 mb-1">
              Parallax
            </p>
            <p className={`text-3xl font-bold ${scoreColor(result.parallaxScore)}`}>
              {result.parallaxScore.toFixed(1)}
            </p>
            <p className="text-xs text-zinc-600">
              {result.sampleSize} analyzed
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {confidenceBadge(result.confidence)}
          {result.restaurant.priceLevel != null && (
            <span className="text-sm text-zinc-500">
              {"$".repeat(result.restaurant.priceLevel)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
