import { Index } from "@upstash/vector";
import { AnalysisResult } from "../types";

const SIMILARITY_THRESHOLD = 0.92;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let _index: Index | null = null;
function index(): Index {
  if (!_index) {
    _index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
  }
  return _index;
}

export function isVectorCacheAvailable(): boolean {
  return (
    !!process.env.UPSTASH_VECTOR_REST_URL &&
    !!process.env.UPSTASH_VECTOR_REST_TOKEN
  );
}

type VectorMetadata = Record<string, string | number> & {
  placeId: string;
  intent: string;
  timestamp: number;
  analysis: string;
};

export async function findSimilarAnalysis(
  placeId: string,
  embedding: number[]
): Promise<{ analysis: AnalysisResult; intent: string; similarity: number } | null> {
  if (!isVectorCacheAvailable()) return null;

  try {
    const results = await index().query<VectorMetadata>({
      vector: embedding,
      topK: 1,
      filter: `placeId = '${placeId}'`,
      includeMetadata: true,
    });

    if (results.length === 0) return null;

    const top = results[0];
    if (top.score < SIMILARITY_THRESHOLD) return null;

    const meta = top.metadata;
    if (!meta) return null;

    // Check TTL
    if (Date.now() - meta.timestamp > TTL_MS) return null;

    return {
      analysis: JSON.parse(meta.analysis) as AnalysisResult,
      intent: meta.intent,
      similarity: top.score,
    };
  } catch {
    return null;
  }
}

export async function storeAnalysis(
  placeId: string,
  intent: string,
  embedding: number[],
  result: AnalysisResult
): Promise<void> {
  if (!isVectorCacheAvailable()) return;

  try {
    const id = `${placeId}:${Date.now()}`;
    await index().upsert({
      id,
      vector: embedding,
      metadata: {
        placeId,
        intent,
        timestamp: Date.now(),
        analysis: JSON.stringify(result),
      },
    });
  } catch {
    // Cache write failures are non-fatal
  }
}

export async function getVectorStats(): Promise<{ vectorCount: number }> {
  if (!isVectorCacheAvailable()) return { vectorCount: 0 };
  try {
    const info = await index().info();
    return { vectorCount: info.vectorCount };
  } catch {
    return { vectorCount: 0 };
  }
}
