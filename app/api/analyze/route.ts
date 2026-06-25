import { NextRequest, NextResponse } from "next/server";
import { aggregateReviews } from "@/lib/sources/aggregator";
import { decomposeReviews, matchAndScore } from "@/lib/review-analyzer";
import { GooglePlaceResult } from "@/lib/types";
import { checkCache, storeInCache, type CacheStatus } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const { query, intent } = await request.json();

    if (!query?.trim() || !intent?.trim()) {
      return NextResponse.json(
        { error: "Both restaurant and intent are required." },
        { status: 400 }
      );
    }

    const aggregated = await aggregateReviews(query, "");
    if (!aggregated) {
      return NextResponse.json(
        { error: "Could not find that restaurant. Try a more specific name or add the city." },
        { status: 404 }
      );
    }

    if (!aggregated.reviews.length) {
      return NextResponse.json(
        { error: "No reviews found for this restaurant." },
        { status: 404 }
      );
    }

    const placeId = aggregated.place.placeId;
    let cacheStatus: CacheStatus = "miss";

    // Check cache
    const cached = await checkCache(placeId, intent);

    if (cached.status === "hit" && cached.analysis) {
      return NextResponse.json({
        ...cached.analysis,
        sourceBreakdown: aggregated.sourceBreakdown,
        _cache: "hit",
        _cachedIntent: cached.cachedIntent,
        _similarity: cached.similarity,
      });
    }

    const place: GooglePlaceResult = {
      ...aggregated.place,
      reviews: aggregated.reviews.map((r) => ({
        author: r.author,
        rating: r.rating ?? 0,
        text: r.text,
        relativeTime: r.date ?? "",
      })),
    };

    // Use cached decomposition or run fresh
    let decomposed;
    if (cached.status === "partial" && cached.decomposed) {
      decomposed = cached.decomposed;
      cacheStatus = "partial";
    } else {
      decomposed = await decomposeReviews(place.reviews);
      cacheStatus = "miss";
    }

    const analysis = await matchAndScore(place, decomposed, intent);

    // Store in cache (non-blocking)
    storeInCache(placeId, intent, analysis, decomposed).catch(() => {});

    return NextResponse.json({
      ...analysis,
      sourceBreakdown: aggregated.sourceBreakdown,
      _cache: cacheStatus,
    });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
