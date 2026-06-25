import { AnalysisResult, DecomposedReview } from "../types";
import { embedIntent } from "./embeddings";
import { getDecomposed, setDecomposed } from "./decomp-cache";
import { findSimilarAnalysis, storeAnalysis, getVectorStats } from "./vector-cache";
import { CacheCheckResult, CacheStats } from "./types";

export { type CacheStatus, type CacheStats } from "./types";

function isCacheConfigured(): boolean {
  return !!process.env.TOGETHER_API_KEY && !!process.env.UPSTASH_VECTOR_REST_URL;
}

export async function checkCache(
  placeId: string,
  intent: string
): Promise<CacheCheckResult> {
  if (!isCacheConfigured()) return { status: "miss" };

  try {
    const embedding = await embedIntent(intent);

    // Layer 2: full analysis cache (vector similarity)
    const cached = await findSimilarAnalysis(placeId, embedding);
    if (cached) {
      return {
        status: "hit",
        analysis: cached.analysis,
        cachedIntent: cached.intent,
        similarity: cached.similarity,
      };
    }

    // Layer 1: decomposition cache (exact placeId match)
    const decomposed = await getDecomposed(placeId);
    if (decomposed) {
      return { status: "partial", decomposed };
    }

    return { status: "miss" };
  } catch {
    return { status: "miss" };
  }
}

export async function storeInCache(
  placeId: string,
  intent: string,
  result: AnalysisResult,
  decomposed: DecomposedReview[]
): Promise<void> {
  if (!isCacheConfigured()) return;

  try {
    const embedding = await embedIntent(intent);

    await Promise.allSettled([
      storeAnalysis(placeId, intent, embedding, result),
      setDecomposed(placeId, decomposed),
    ]);
  } catch {
    // Cache store failures are non-fatal
  }
}

export async function getCacheStats(): Promise<CacheStats> {
  const vectorStats = await getVectorStats();
  return {
    vectorCount: vectorStats.vectorCount,
    decompCacheKeys: 0,
  };
}
