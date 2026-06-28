import { NextRequest, NextResponse } from "next/server";
import { aggregateReviews } from "@/lib/sources/aggregator";
import { decomposeReviews, matchAndScore } from "@/lib/review-analyzer";
import { GooglePlaceResult } from "@/lib/types";
import { checkCache, storeInCache, type CacheStatus } from "@/lib/cache";
import { validateApiKey } from "@/lib/api/auth";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/api/rate-limit";

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
    if (!validateApiKey(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
          suggestion: "Include an Authorization: Bearer <key> header.",
        },
        { status: 401 }
      );
    }

    const apiKey = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const rateLimitId = getRateLimitIdentifier(request, apiKey || undefined);
    const rateLimit = await checkRateLimit(rateLimitId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded.",
          suggestion: `Try again in ${Math.ceil((rateLimit.reset - Date.now() / 1000) / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.reset - Math.floor(Date.now() / 1000)),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Limit": "20",
          },
        }
      );
    }

    const { query, intent } = await request.json();

    if (!query?.trim() || !intent?.trim()) {
      return NextResponse.json(
        {
          error: "Both restaurant and intent are required.",
          suggestion: "Enter a restaurant name and describe what you're looking for.",
        },
        { status: 400 }
      );
    }

    const aggregated = await aggregateReviews(query, "");
    if (!aggregated) {
      return NextResponse.json(
        {
          error: "Could not find that restaurant.",
          suggestion: "Try the full name with city (e.g. \"PAI Northern Thai Kitchen, Toronto\"), or paste a Google Maps URL.",
        },
        { status: 404 }
      );
    }

    if (!aggregated.reviews.length) {
      return NextResponse.json(
        {
          error: "No reviews found for this restaurant.",
          suggestion: "This restaurant may be new or have reviews disabled. Try a nearby alternative.",
        },
        { status: 404 }
      );
    }

    const placeId = aggregated.place.placeId;

    const cached = await checkCache(placeId, intent);

    if (cached.status === "hit" && cached.analysis) {
      return NextResponse.json(
        {
          ...cached.analysis,
          sourceBreakdown: aggregated.sourceBreakdown,
          _cache: "hit",
          _cachedIntent: cached.cachedIntent,
          _similarity: cached.similarity,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Parallax-Cache": "hit",
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
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
            data: {
              error: "Analysis failed.",
              suggestion: "Our review analysis service is temporarily slow. Try again in a moment.",
            },
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
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      {
        error: "Analysis failed.",
        suggestion: "Our review analysis service is temporarily slow. Try again in a moment.",
      },
      { status: 500 }
    );
  }
}
