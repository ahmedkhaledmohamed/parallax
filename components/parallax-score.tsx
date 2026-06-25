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
          <div className="flex items-center gap-3">
            {confidenceBadge(result.confidence)}
            {result.restaurant.priceLevel != null && (
              <span className="text-sm text-zinc-500">
                {"$".repeat(result.restaurant.priceLevel)}
              </span>
            )}
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.restaurant.name)}&query_place_id=${result.restaurant.placeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                clipRule="evenodd"
              />
            </svg>
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}
