"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";

interface DimensionDetailProps {
  result: AnalysisResult;
}

function formatDimension(dim: string): string {
  return dim.replace(/_/g, " ");
}

function sentimentColor(s: number): string {
  if (s >= 0.3) return "text-emerald-400";
  if (s >= -0.3) return "text-amber-400";
  return "text-red-400";
}

export function DimensionDetail({ result }: DimensionDetailProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const claims = result.dimensionClaims;

  if (!claims || Object.keys(claims).length === 0) return null;

  const selectedClaims = selected ? claims[selected] ?? [] : [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-1">
        Evidence by dimension
      </h3>
      <p className="text-xs text-zinc-600 mb-4">
        Click a dimension to see the review claims behind it
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(claims).map(([dim, entries]) => (
          <button
            key={dim}
            onClick={() => setSelected(selected === dim ? null : dim)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected === dim
                ? "border-amber-600 bg-amber-600/20 text-amber-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            {formatDimension(dim)} ({entries.length})
          </button>
        ))}
      </div>

      {selected && selectedClaims.length > 0 && (
        <div className="space-y-3 border-t border-zinc-800 pt-4">
          {selectedClaims.map((claim, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className={`text-xs font-mono mt-0.5 ${sentimentColor(claim.sentiment)}`}
              >
                {claim.sentiment > 0 ? "+" : ""}
                {claim.sentiment.toFixed(1)}
              </span>
              <div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  &ldquo;{claim.claim}&rdquo;
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  — {claim.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && selectedClaims.length === 0 && (
        <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
          No claims found for this dimension.
        </p>
      )}
    </div>
  );
}
