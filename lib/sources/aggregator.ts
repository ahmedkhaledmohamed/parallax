import { ReviewSource, UnifiedReview, PlaceInfo } from "./types";
import { GooglePlacesSource, isGoogleMapsUrl } from "./google-places";
import { YelpSource } from "./yelp";
import { CONFIG } from "../config";

export interface AggregatedResult {
  place: PlaceInfo;
  reviews: UnifiedReview[];
  sourceBreakdown: { source: string; count: number }[];
}

const sources: ReviewSource[] = [new GooglePlacesSource(), new YelpSource()];

export function registerSource(source: ReviewSource): void {
  sources.push(source);
}

export async function aggregateReviews(
  query: string,
  city: string
): Promise<AggregatedResult | null> {
  const googleSource = sources.find(
    (s) => s.name === "google"
  ) as GooglePlacesSource | undefined;

  if (!googleSource?.isAvailable()) {
    return null;
  }

  const googleResult = isGoogleMapsUrl(query)
    ? await googleSource.getPlaceByUrl(query)
    : await googleSource.searchPlace(query);
  if (!googleResult) return null;

  const allReviews: UnifiedReview[] = [...googleResult.reviews];

  const resolvedCity = city || extractCity(googleResult.place.address);

  const otherSources = sources.filter(
    (s) => s.name !== "google" && s.isAvailable()
  );

  const supplementary = await Promise.allSettled(
    otherSources.map((s) =>
      s.fetchReviews(googleResult.place.name, resolvedCity)
    )
  );

  for (const result of supplementary) {
    if (result.status === "fulfilled") {
      allReviews.push(...result.value);
    }
  }

  const deduplicated = deduplicateReviews(allReviews);

  const sourceBreakdown = buildSourceBreakdown(deduplicated);

  return {
    place: googleResult.place,
    reviews: deduplicated,
    sourceBreakdown,
  };
}

function deduplicateReviews(reviews: UnifiedReview[]): UnifiedReview[] {
  const seen = new Set<string>();
  const result: UnifiedReview[] = [];

  for (const review of reviews) {
    const trigrams = extractTrigrams(review.text.toLowerCase());
    const key = `${review.author.toLowerCase().trim()}|${trigrams.slice(0, 5).join(",")}`;

    let isDuplicate = false;
    for (const existing of seen) {
      if (jaccardSimilarity(key, existing) > CONFIG.dedup.jaccardThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(key);
      result.push(review);
    }
  }

  return result;
}

function extractTrigrams(text: string): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const trigrams: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) {
    trigrams.push(words.slice(i, i + 3).join(" "));
  }
  return trigrams;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(","));
  const setB = new Set(b.split(","));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractCity(address: string): string {
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 3] ?? parts[0] : address;
}

function buildSourceBreakdown(
  reviews: UnifiedReview[]
): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    counts.set(r.source, (counts.get(r.source) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([source, count]) => ({
    source,
    count,
  }));
}
