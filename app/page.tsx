"use client";

import { useState } from "react";
import { AnalysisResult } from "@/lib/types";
import { SearchForm } from "@/components/search-form";
import { ParallaxScore } from "@/components/parallax-score";
import { Explanation } from "@/components/explanation";
import { DimensionRadar } from "@/components/dimension-radar";
import { DimensionDelta } from "@/components/dimension-delta";
import { DimensionDetail } from "@/components/dimension-detail";
import { ReviewCard } from "@/components/review-card";
import { SearchHistory, saveToHistory } from "@/components/search-history";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  async function handleSearch(query: string, intent: string) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, intent }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
      saveToHistory({
        restaurant: data.restaurant.name,
        intent,
        parallaxScore: data.parallaxScore,
        googleScore: data.googleScore,
      });
      setHistoryKey((k) => k + 1);
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-100 mb-2">
          Parallax
        </h1>
        <p className="text-zinc-500 max-w-md">
          Same reviews, your viewpoint. See what a restaurant&apos;s rating
          actually means for what you care about.
        </p>
      </div>

      <SearchForm onSubmit={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="mt-8 w-full max-w-2xl rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-10 w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: scores + visualizations */}
            <div className="space-y-6">
              <ParallaxScore result={result} />
              <DimensionRadar dimensions={result.dimensionBreakdown} />
              <DimensionDelta dimensions={result.dimensionBreakdown} />
            </div>

            {/* Right column: explanation + evidence + reviews */}
            <div className="space-y-6">
              <Explanation result={result} />
              <DimensionDetail result={result} />
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-4">
                  Reviews that matter to you
                </h3>
                <div className="space-y-3">
                  {result.relevantReviews.map((review, i) => (
                    <ReviewCard key={i} review={review} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <SearchHistory
          key={historyKey}
          onSelect={(restaurant, intent) =>
            handleSearch(restaurant, intent)
          }
        />
      )}
    </main>
  );
}
