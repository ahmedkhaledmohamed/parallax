import { Redis } from "@upstash/redis";
import { DecomposedReview } from "../types";

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

export function isDecompCacheAvailable(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function getDecomposed(
  placeId: string
): Promise<DecomposedReview[] | null> {
  if (!isDecompCacheAvailable()) return null;
  try {
    return await redis().get<DecomposedReview[]>(`decomp:${placeId}`);
  } catch {
    return null;
  }
}

export async function setDecomposed(
  placeId: string,
  data: DecomposedReview[]
): Promise<void> {
  if (!isDecompCacheAvailable()) return;
  try {
    await redis().set(`decomp:${placeId}`, data, { ex: TTL_SECONDS });
  } catch {
    // Cache write failures are non-fatal
  }
}
