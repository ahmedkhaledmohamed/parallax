import OpenAI from "openai";
import {
  GooglePlaceResult,
  GoogleReview,
  DecomposedReview,
  AnalysisResult,
} from "./types";

const MODEL = "llama-3.3-70b-versatile";

let _groq: OpenAI | null = null;
function groq(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

function calculateConfidence(
  totalReviews: number,
  dimensionBreakdown: AnalysisResult["dimensionBreakdown"]
): "high" | "medium" | "low" {
  if (totalReviews < 3) return "low";

  const keyDimensions = dimensionBreakdown.filter((d) => d.weight > 0.15);
  if (keyDimensions.length === 0) return "low";

  const avgCoverage =
    keyDimensions.reduce((sum, d) => sum + d.reviewCount, 0) /
    keyDimensions.length;
  const coverageRatio = avgCoverage / totalReviews;

  if (coverageRatio < 0.3) return "low";
  if (coverageRatio < 0.6 || totalReviews < 5) return "medium";
  return "high";
}

function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  return JSON.parse(raw);
}

export async function decomposeReviews(
  reviews: GoogleReview[]
): Promise<DecomposedReview[]> {
  const response = await groq().chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a review analysis engine. Respond with ONLY valid JSON, no markdown or explanation.",
      },
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

Respond as JSON:
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

  const text = response.choices[0].message.content ?? "";
  const parsed = extractJson(text) as {
    reviews: Omit<DecomposedReview, "text" | "relativeTime">[];
  };

  return parsed.reviews.map((r, i) => ({
    ...r,
    text: reviews[i].text,
    relativeTime: reviews[i].relativeTime,
  }));
}

export async function matchAndScore(
  place: GooglePlaceResult,
  decomposed: DecomposedReview[],
  userIntent: string
): Promise<AnalysisResult> {
  const response = await groq().chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are Parallax, a review re-scoring engine. Respond with ONLY valid JSON, no markdown or explanation.",
      },
      {
        role: "user",
        content: `Given decomposed restaurant reviews and a user's specific intent, compute a personalized score that reflects what this user actually cares about.

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
6. Write the explanation following this structure:
   - Start: "For someone looking for [restate the user's intent in your own words],"
   - State whether the Parallax score is higher, lower, or similar to Google's and by how much.
   - Explain WHY using specific dimension findings: name the dimensions, cite sentiment direction, and reference how many reviewers mentioned them (e.g., "3 of 5 reviewers praised the ambiance, but only 1 mentioned noise level — and negatively").
   - Contrast: explain what drives Google's aggregate that the user does NOT care about (e.g., "Google's high rating is driven by presentation and service scores, which you deprioritized").
   - NEVER use these phrases: "based on the reviews analyzed", "the restaurant has mixed reviews", "overall the restaurant", or any statement that would be equally valid for a completely different user intent.
7. Set confidence to "medium" (this will be overridden by deterministic calculation).

Respond as JSON:
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

  const text = response.choices[0].message.content ?? "";
  const parsed = extractJson(text) as {
    parallaxScore: number;
    dimensionBreakdown: AnalysisResult["dimensionBreakdown"];
    relevantReviews: AnalysisResult["relevantReviews"];
    explanation: string;
    confidence: "high" | "medium" | "low";
  };

  const confidence = calculateConfidence(
    decomposed.length,
    parsed.dimensionBreakdown
  );

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
    confidence,
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
