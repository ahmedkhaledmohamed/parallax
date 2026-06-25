import { AnalysisResult, DecomposedReview } from "../types";

export type CacheStatus = "hit" | "partial" | "miss";

export interface CacheCheckResult {
  status: CacheStatus;
  analysis?: AnalysisResult;
  decomposed?: DecomposedReview[];
  cachedIntent?: string;
  similarity?: number;
}

export interface CacheStats {
  vectorCount: number;
  decompCacheKeys: number;
}
