export const CONFIG = {
  scoring: {
    /** Minimum dimension weight to count as "key" for confidence calculation */
    keyDimensionWeightThreshold: 0.15,
    /** Coverage ratio below which confidence is "low" */
    lowCoverageRatio: 0.3,
    /** Coverage ratio below which confidence is "medium" */
    mediumCoverageRatio: 0.6,
    /** Minimum review count for "medium" confidence (below this = "medium" at best) */
    mediumMinReviews: 5,
    /** Minimum review count for anything above "low" */
    lowMinReviews: 3,
    /** Sentiment penalty when the top-weighted dimension has zero coverage */
    absencePenalty: -0.3,
  },

  intent: {
    /** Exponential decay base for position-ranked dimension weights */
    weightDecayBase: 0.6,
  },

  cache: {
    /** Cosine similarity threshold for vector cache hits */
    vectorSimilarityThreshold: 0.92,
    /** Vector analysis cache TTL in milliseconds (7 days) */
    vectorTtlMs: 7 * 24 * 60 * 60 * 1000,
    /** Decomposition cache TTL in seconds (30 days — longer because decomposition is intent-independent) */
    decompTtlSeconds: 30 * 24 * 60 * 60,
  },

  dedup: {
    /** Jaccard similarity threshold for review deduplication */
    jaccardThreshold: 0.5,
  },

  llm: {
    /** Timeout per LLM call in milliseconds */
    timeoutMs: 30_000,
  },
} as const;
