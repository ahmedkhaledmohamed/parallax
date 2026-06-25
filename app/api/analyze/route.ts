import { NextRequest, NextResponse } from "next/server";
import { searchPlace } from "@/lib/google-places";
import { analyzeReviews } from "@/lib/review-analyzer";

export async function POST(request: NextRequest) {
  try {
    const { query, intent } = await request.json();

    if (!query?.trim() || !intent?.trim()) {
      return NextResponse.json(
        { error: "Both restaurant and intent are required." },
        { status: 400 }
      );
    }

    const place = await searchPlace(query);
    if (!place) {
      return NextResponse.json(
        { error: "Could not find that restaurant. Try a more specific name or add the city." },
        { status: 404 }
      );
    }

    if (!place.reviews.length) {
      return NextResponse.json(
        { error: "No reviews found for this restaurant." },
        { status: 404 }
      );
    }

    const analysis = await analyzeReviews(place, intent);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
