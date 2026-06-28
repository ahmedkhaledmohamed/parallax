"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";

interface ParallaxScoreProps {
  result: AnalysisResult;
}

function scoreColor(score: number): string {
  if (score >= 4.0) return "text-emerald-400";
  if (score >= 3.0) return "text-amber-400";
  return "text-red-400";
}

function ConfidenceExplainer({ result }: { result: AnalysisResult }) {
  const [expanded, setExpanded] = useState(false);
  const { confidence, sampleSize, dimensionBreakdown } = result;

  const styles = {
    high: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
    medium: "bg-amber-900/50 text-amber-400 border-amber-800",
    low: "bg-red-900/50 text-red-400 border-red-800",
  };

  const uncovered = dimensionBreakdown
    .filter((d) => d.weight > 0.1 && d.reviewCount === 0)
    .map((d) => d.dimension.replace(/_/g, " "));

  let explanation: string;
  if (sampleSize < 3) {
    explanation = `Only ${sampleSize} review${sampleSize === 1 ? "" : "s"} available. Take this score as directional.`;
  } else if (confidence === "low") {
    explanation = `Few of the ${sampleSize} reviews mention your priorities. This score may shift with more data.`;
  } else if (confidence === "medium") {
    explanation = `Decent coverage from ${sampleSize} reviews, but some priorities had limited mentions.`;
  } else {
    explanation = `Strong coverage — most of your priorities were directly addressed across ${sampleSize} reviews.`;
  }

  if (uncovered.length > 0) {
    explanation += ` No reviews mentioned: ${uncovered.join(", ")}.`;
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${styles[confidence]}`}
      >
        {confidence} confidence
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {expanded && (
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed max-w-sm">
          {explanation}
        </p>
      )}
    </div>
  );
}

function ShareButton({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const text = `${result.restaurant.name}: Parallax ${result.parallaxScore.toFixed(1)} vs Google ${result.googleScore.toFixed(1)}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Parallax", text, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3.5 h-3.5"
      >
        <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .799l6.733 3.365a2.5 2.5 0 1 1-.671 1.342l-6.733-3.365a2.5 2.5 0 1 1 0-3.482l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
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
              {result.sourceBreakdown && result.sourceBreakdown.length > 1
                ? result.sourceBreakdown.map((s) => `${s.count} ${s.source}`).join(" + ")
                : `${result.sampleSize} analyzed`}
            </p>
            {result.sampleSize < 5 && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                Few reviews — score may shift
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ConfidenceExplainer result={result} />
            {result.restaurant.priceLevel != null && (
              <span className="text-sm text-zinc-500">
                {"$".repeat(result.restaurant.priceLevel)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ShareButton result={result} />
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
    </div>
  );
}
