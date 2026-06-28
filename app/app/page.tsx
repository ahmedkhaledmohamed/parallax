"use client";

import { useState, useEffect, useRef } from "react";
import { AnalysisResult } from "@/lib/types";
import { SearchForm } from "@/components/search-form";
import { ParallaxScore } from "@/components/parallax-score";
import { Explanation } from "@/components/explanation";
import { DimensionRadar } from "@/components/dimension-radar";
import { DimensionDelta } from "@/components/dimension-delta";
import { DimensionDetail } from "@/components/dimension-detail";
import { ReviewCard } from "@/components/review-card";
import { SearchHistory, saveToHistory } from "@/components/search-history";

type Stage = "idle" | "searching" | "found" | "decomposing" | "done";

interface RestaurantInfo {
  name: string;
  address: string;
  rating: number;
  totalReviews: number;
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<{ query: string; intent: string } | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const didAutoSubmit = useRef(false);

  function updateUrl(query: string, intent: string) {
    const params = new URLSearchParams({ q: query, i: intent });
    window.history.replaceState(null, "", `/app?${params.toString()}`);
  }

  useEffect(() => {
    if (!result) return;
    const ogParams = new URLSearchParams({
      name: result.restaurant.name,
      parallax: result.parallaxScore.toFixed(1),
      google: result.googleScore.toFixed(1),
    });
    const ogUrl = `/api/og?${ogParams.toString()}`;

    let ogTag = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    if (!ogTag) {
      ogTag = document.createElement("meta");
      ogTag.setAttribute("property", "og:image");
      document.head.appendChild(ogTag);
    }
    ogTag.content = ogUrl;

    let titleTag = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (!titleTag) {
      titleTag = document.createElement("meta");
      titleTag.setAttribute("property", "og:title");
      document.head.appendChild(titleTag);
    }
    titleTag.content = `${result.restaurant.name} — Parallax ${result.parallaxScore.toFixed(1)} vs Google ${result.googleScore.toFixed(1)}`;
  }, [result]);

  useEffect(() => {
    if (didAutoSubmit.current) return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const i = params.get("i");
    if (q && i) {
      didAutoSubmit.current = true;
      handleSearch(q, i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(query: string, intent: string) {
    setStage("searching");
    setError(null);
    setErrorSuggestion(null);
    setResult(null);
    setRestaurant(null);
    setLastSearch({ query, intent });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, intent }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setErrorSuggestion(data.suggestion || null);
        setStage("idle");
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResult(data);
        setRestaurant({
          name: data.restaurant.name,
          address: data.restaurant.address,
          rating: data.restaurant.googleRating,
          totalReviews: data.restaurant.totalReviews,
        });
        saveToHistory({
          restaurant: data.restaurant.name,
          intent,
          parallaxScore: data.parallaxScore,
          googleScore: data.googleScore,
        });
        setHistoryKey((k) => k + 1);
        updateUrl(query, intent);
        setStage("done");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read response.");
        setStage("idle");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "restaurant") {
              setRestaurant(event.data);
              setStage("found");
            } else if (event.type === "decomposed") {
              setStage("decomposing");
            } else if (event.type === "result") {
              setResult(event.data);
              saveToHistory({
                restaurant: event.data.restaurant.name,
                intent,
                parallaxScore: event.data.parallaxScore,
                googleScore: event.data.googleScore,
              });
              setHistoryKey((k) => k + 1);
              updateUrl(query, intent);
              setStage("done");
            } else if (event.type === "error") {
              setError(event.data.error);
              setErrorSuggestion(event.data.suggestion || null);
              setStage("idle");
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setError("Failed to connect. Please try again.");
      setStage("idle");
    }
  }

  const isLoading = stage !== "idle" && stage !== "done";

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
        <div className="mt-8 w-full max-w-2xl rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-red-400">{error}</span>
            {lastSearch && (
              <button
                onClick={() => handleSearch(lastSearch.query, lastSearch.intent)}
                className="ml-4 shrink-0 rounded border border-red-800 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
          {errorSuggestion && (
            <p className="mt-2 text-xs text-zinc-500">{errorSuggestion}</p>
          )}
        </div>
      )}

      {isLoading && !error && (
        <div className="mt-10 w-full max-w-5xl">
          {restaurant && (stage === "found" || stage === "decomposing") && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">
                {restaurant.name}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">{restaurant.address}</p>
              <p className="text-sm text-zinc-500 mt-1">
                Google: {restaurant.rating}/5 from{" "}
                {restaurant.totalReviews.toLocaleString()} reviews
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <svg
              className="animate-spin h-4 w-4 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>
              {stage === "searching" && "Finding restaurant..."}
              {stage === "found" && "Analyzing reviews..."}
              {stage === "decomposing" && "Computing your personalized score..."}
            </span>
          </div>
        </div>
      )}

      {result && stage === "done" && (
        <div className="mt-10 w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ParallaxScore result={result} />
              <DimensionRadar dimensions={result.dimensionBreakdown} />
              <DimensionDelta dimensions={result.dimensionBreakdown} />
            </div>

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

      {!result && stage === "idle" && (
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
