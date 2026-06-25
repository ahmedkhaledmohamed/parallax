import Anthropic from "@anthropic-ai/sdk";
import {
  GooglePlaceResult,
  GoogleReview,
  DecomposedReview,
  AnalysisResult,
} from "./types";

const anthropic = new Anthropic();

function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  return JSON.parse(raw);
}

async function decomposeReviews(
  reviews: GoogleReview[]
): Promise<DecomposedReview[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze these restaurant reviews. For each review, extract structured dimensional claims.

Reviews:
${reviews
  .map(
    (r, i) =>
      `[Review ${i + 1}] Rating: ${r.rating}/5, Author: ${r.author}\n"${r.text}"`
  )
  .join("\n\n")}

For each review, extract:
1. Dimensional claims — specific aspects mentioned. Use consistent dimension names from this set where applicable: food_quality, ambiance, service, noise_level, wait_time, portion_size, price_value, authenticity, cleanliness, drink_quality, kid_friendliness, presentation, menu_variety, location, parking. Add custom dimensions only when none of these fit.
2. For each dimension: sentiment (-1.0 to 1.0), confidence (0.0 to 1.0), and the exact claim text from the review.
3. Context signals — inferred visit context: date_night, family, business, solo, friends, celebration, casual, tourist, regular.
4. Overall tone: positive, negative, mixed, or neutral.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "reviews": [
    {
      "author": "Name",
      "rating": 5,
      "dimensions": [
        { "dimension": "food_quality", "sentiment": 0.8, "confidence": 0.9, "claim": "exact quote from review" }
      ],
      "contextSignals": ["date_night"],
      "overallTone": "positive"
    }
  ]
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJson(text) as {
    reviews: Omit<DecomposedReview, "text" | "relativeTime">[];
  };

  return parsed.reviews.map((r, i) => ({
    ...r,
    text: reviews[i].text,
    relativeTime: reviews[i].relativeTime,
  }));
}

async function matchAndScore(
  place: GooglePlaceResult,
  decomposed: DecomposedReview[],
  userIntent: string
): Promise<AnalysisResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are Parallax, a review re-scoring engine. Given decomposed restaurant reviews and a user's specific intent, compute a personalized score that reflects what this user actually cares about.

Restaurant: ${place.name}
Address: ${place.address}
Google rating: ${place.rating}/5 from ${place.totalReviews} total reviews
Reviews analyzed: ${decomposed.length}

User's intent: "${userIntent}"

Decomposed reviews:
${JSON.stringify(decomposed, null, 2)}

Instructions:
1. Identify which dimensions the user cares about based on their intent. Be specific — "quiet dinner" maps to noise_level and ambiance, not food_quality.
2. Assign weights to relevant dimensions (0.0 to 1.0, should roughly sum to 1.0).
3. For each review, assess how much it addresses the user's concerns.
4. Compute a Parallax Score (1.0 to 5.0, one decimal) — this is the weighted average of sentiment scores on relevant dimensions, mapped to a 1-5 scale. If a review doesn't mention a relevant dimension, exclude it from that dimension's calculation.
5. Select the 3-5 most relevant review excerpts — reviews that specifically address what the user cares about.
6. Write a concise, direct explanation of why the Google aggregate differs from the Parallax score for this user. Reference specific dimensions and reviewer perspectives. No generic filler.
7. Set confidence: "high" if 3+ reviews address the user's key dimensions, "medium" if 1-2 do, "low" if extrapolating.

Respond with ONLY valid JSON:
{
  "parallaxScore": 3.2,
  "dimensionBreakdown": [
    { "dimension": "noise_level", "averageSentiment": -0.3, "weight": 0.4, "reviewCount": 3 }
  ],
  "relevantReviews": [
    {
      "author": "Name",
      "rating": 4,
      "excerpt": "the most relevant part of their review",
      "whyRelevant": "why this review matters for this user's intent",
      "dimensionScores": [{ "dimension": "noise_level", "sentiment": -0.5 }]
    }
  ],
  "explanation": "Google's 4.2 reflects X, but for someone prioritizing Y, the picture is different because...",
  "confidence": "medium"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = extractJson(text) as {
    parallaxScore: number;
    dimensionBreakdown: AnalysisResult["dimensionBreakdown"];
    relevantReviews: AnalysisResult["relevantReviews"];
    explanation: string;
    confidence: "high" | "medium" | "low";
  };

  return {
    restaurant: {
      name: place.name,
      address: place.address,
      googleRating: place.rating,
      totalReviews: place.totalReviews,
      priceLevel: place.priceLevel,
    },
    parallaxScore: parsed.parallaxScore,
    googleScore: place.rating,
    relevantReviews: parsed.relevantReviews,
    explanation: parsed.explanation,
    confidence: parsed.confidence,
    sampleSize: decomposed.length,
    dimensionBreakdown: parsed.dimensionBreakdown,
  };
}

export async function analyzeReviews(
  place: GooglePlaceResult,
  userIntent: string
): Promise<AnalysisResult> {
  const decomposed = await decomposeReviews(place.reviews);
  return matchAndScore(place, decomposed, userIntent);
}
