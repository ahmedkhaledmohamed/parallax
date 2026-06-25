"use client";

import { useState, useCallback } from "react";

interface HistoryEntry {
  restaurant: string;
  intent: string;
  parallaxScore: number;
  googleScore: number;
  timestamp: string;
}

const STORAGE_KEY = "parallax_history";
const MAX_ENTRIES = 10;

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, "timestamp">): void {
  if (typeof window === "undefined") return;
  const history = loadHistory();
  history.unshift({ ...entry, timestamp: new Date().toISOString() });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history.slice(0, MAX_ENTRIES))
  );
}

interface SearchHistoryProps {
  onSelect: (restaurant: string, intent: string) => void;
}

export function SearchHistory({ onSelect }: SearchHistoryProps) {
  const [history, setHistory] = useState(loadHistory);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Recent searches
        </h3>
        <button
          onClick={clearHistory}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {history.map((entry, i) => {
          const delta = entry.parallaxScore - entry.googleScore;
          const deltaColor =
            Math.abs(delta) < 0.3
              ? "text-zinc-500"
              : delta > 0
                ? "text-emerald-400"
                : "text-red-400";

          return (
            <button
              key={i}
              onClick={() => onSelect(entry.restaurant, entry.intent)}
              className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">
                  {entry.restaurant}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">
                    G:{entry.googleScore.toFixed(1)}
                  </span>
                  <span className={`font-mono font-medium ${deltaColor}`}>
                    P:{entry.parallaxScore.toFixed(1)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-1 truncate">
                {entry.intent}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
