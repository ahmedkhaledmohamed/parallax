"use client";

import { useState } from "react";

interface SearchFormProps {
  onSubmit: (query: string, intent: string) => void;
  isLoading: boolean;
}

const INTENT_EXAMPLES = [
  "Quiet date night, great wine, authentic Italian",
  "Quick family lunch, kid-friendly, large portions",
  "Business dinner, upscale but not pretentious, good cocktails",
  "Cheap eats, big flavors, don't care about decor",
  "Brunch with friends, good vibes, strong coffee",
];

export function SearchForm({ onSubmit, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim() && intent.trim()) {
      onSubmit(query, intent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-5">
      <div>
        <label htmlFor="query" className="block text-sm font-medium text-zinc-400 mb-2">
          Restaurant
        </label>
        <input
          id="query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Restaurant name or Google Maps URL"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="intent" className="block text-sm font-medium text-zinc-400 mb-2">
          What are you looking for?
        </label>
        <textarea
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="Describe what matters to you right now..."
          rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors resize-none"
          disabled={isLoading}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {INTENT_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setIntent(example)}
              className="text-xs rounded-full border border-zinc-700 px-3 py-1 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !query.trim() || !intent.trim()}
        className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing reviews...
          </span>
        ) : (
          "Get your Parallax Score"
        )}
      </button>
    </form>
  );
}
