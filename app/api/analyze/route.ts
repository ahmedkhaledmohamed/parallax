import { NextRequest, NextResponse } from "next/server";
import { aggregateReviews } from "@/lib/sources/aggregator";
import { decomposeReviews, matchAndScore } from "@/lib/review-analyzer";
import { GooglePlaceResult } from "@/lib/types";
import { checkCache, storeInCache, type CacheStatus } from "@/lib/cache";

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: Record<string, unknown>
) {
  controller.enqueue(
    new TextEncoder().encode(JSON.stringify(event) + "\n")
  );
}

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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendEvent(controller, {
            type: "restaurant",
            data: {
              name: aggregated.place.name,
              address: aggregated.place.address,
              rating: aggregated.place.rating,
              totalReviews: aggregated.place.totalReviews,
              sourceBreakdown: aggregated.sourceBreakdown,
            },
          });

          let decomposed;
          let cacheStatus: CacheStatus = "miss";

          if (cached.status === "partial" && cached.decomposed) {
            decomposed = cached.decomposed;
            cacheStatus = "partial";
          } else {
            decomposed = await decomposeReviews(place.reviews);
            cacheStatus = "miss";
          }

          sendEvent(controller, {
            type: "decomposed",
            data: {
              reviewCount: decomposed.length,
              dimensionCount: new Set(
                decomposed.flatMap((r) => r.dimensions.map((d) => d.dimension))
              ).size,
            },
          });

          const analysis = await matchAndScore(place, decomposed, intent);

          storeInCache(placeId, intent, analysis, decomposed).catch(() => {});

          sendEvent(controller, {
            type: "result",
            data: {
              ...analysis,
              sourceBreakdown: aggregated.sourceBreakdown,
              _cache: cacheStatus,
            },
          });

          controller.close();
        } catch (err) {
          sendEvent(controller, {
            type: "error",
            data: { error: "Analysis failed. Please try again." },
          });
          controller.close();
          console.error("Streaming analysis failed:", err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
