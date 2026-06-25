import { NextRequest, NextResponse } from "next/server";
import { aggregateReviews } from "@/lib/sources/aggregator";
import { analyzeReviews } from "@/lib/review-analyzer";
import { GooglePlaceResult } from "@/lib/types";

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

    const place: GooglePlaceResult = {
      ...aggregated.place,
      reviews: aggregated.reviews.map((r) => ({
        author: r.author,
        rating: r.rating ?? 0,
        text: r.text,
        relativeTime: r.date ?? "",
      })),
    };

    const analysis = await analyzeReviews(place, intent);

    return NextResponse.json({
      ...analysis,
      sourceBreakdown: aggregated.sourceBreakdown,
    });
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
