import OpenAI from "openai";
import {
  GooglePlaceResult,
  GoogleReview,
  DecomposedReview,
  AnalysisResult,
} from "./types";
import { parseIntent } from "./intent-parser";

interface ProviderConfig {
  name: string;
  apiKey: string | undefined;
  baseURL: string;
  model: string;
}

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
    });
  }

  if (process.env.TOGETHER_API_KEY) {
    providers.push({
      name: "together",
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    });
  }

  return providers;
}

const _clients = new Map<string, OpenAI>();

function getClient(provider: ProviderConfig): OpenAI {
  if (!_clients.has(provider.name)) {
    _clients.set(
      provider.name,
      new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL })
    );
  }
  return _clients.get(provider.name)!;
}

async function chatWithFallback(
  params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model">
): Promise<OpenAI.Chat.ChatCompletion> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error("No LLM provider configured. Set GROQ_API_KEY or TOGETHER_API_KEY.");
  }

  for (let i = 0; i < providers.length; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const result = await getClient(providers[i]).chat.completions.create(
          { ...params, model: providers[i].model },
          { signal: controller.signal }
        );
        return result;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const isRateLimit = err instanceof Error && err.message.includes("429");
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const isLast = i === providers.length - 1;
      if ((isRateLimit || isTimeout) && !isLast) continue;
      if (isTimeout) throw new Error("LLM request timed out after 30 seconds");
      throw err;
    }
  }

  throw new Error("All providers failed");
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

export function computeParallaxScore(
  decomposed: DecomposedReview[],
  dimensionWeights: { dimension: string; weight: number }[]
): { score: number; dimensionBreakdown: AnalysisResult["dimensionBreakdown"] } {
  // Compute unweighted (Google-perspective) sentiment across ALL dimensions
  const allDimensions = new Map<string, number[]>();
  for (const review of decomposed) {
    for (const claim of review.dimensions) {
      if (!allDimensions.has(claim.dimension)) {
        allDimensions.set(claim.dimension, []);
      }
      allDimensions.get(claim.dimension)!.push(claim.sentiment);
    }
  }

  const breakdown: AnalysisResult["dimensionBreakdown"] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dw of dimensionWeights) {
    const claims = decomposed.flatMap((r) =>
      r.dimensions.filter((d) => d.dimension === dw.dimension)
    );

    const allSentiments = allDimensions.get(dw.dimension) ?? [];
    const googleSentiment =
      allSentiments.length > 0
        ? allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length
        : 0;

    if (claims.length === 0) {
      // No reviews mention this dimension — treat as mildly negative signal.
      // If the user specifically asked about authenticity and no reviewer
      // addressed it, that's a meaningful absence, not neutral.
      const absencePenalty = -0.3;
      breakdown.push({
        dimension: dw.dimension,
        averageSentiment: absencePenalty,
        googleSentiment,
        weight: dw.weight,
        reviewCount: 0,
      });
      weightedSum += absencePenalty * dw.weight;
      totalWeight += dw.weight;
      continue;
    }

    const avgSentiment =
      claims.reduce((sum, c) => sum + c.sentiment, 0) / claims.length;

    breakdown.push({
      dimension: dw.dimension,
      averageSentiment: avgSentiment,
      googleSentiment,
      weight: dw.weight,
      reviewCount: claims.length,
    });

    weightedSum += avgSentiment * dw.weight;
    totalWeight += dw.weight;
  }

  // Map weighted sentiment [-1, 1] to score [1, 5]
  const normalizedSentiment = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = Math.round(((normalizedSentiment + 1) / 2) * 4 * 10 + 10) / 10;
  const clampedScore = Math.max(1.0, Math.min(5.0, score));

  return { score: clampedScore, dimensionBreakdown: breakdown };
}

function buildDimensionClaims(
  decomposed: DecomposedReview[],
  weights: { dimension: string }[]
): Record<string, { author: string; claim: string; sentiment: number }[]> {
  const relevant = new Set(weights.map((w) => w.dimension));
  const claims: Record<string, { author: string; claim: string; sentiment: number }[]> = {};

  for (const review of decomposed) {
    for (const dim of review.dimensions) {
      if (!relevant.has(dim.dimension)) continue;
      if (!claims[dim.dimension]) claims[dim.dimension] = [];
      claims[dim.dimension].push({
        author: review.author,
        claim: dim.claim,
        sentiment: dim.sentiment,
      });
    }
  }

  return claims;
}

function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error("LLM returned invalid JSON — could not parse response");
  }
}

export async function decomposeReviews(
  reviews: GoogleReview[]
): Promise<DecomposedReview[]> {
  const response = await chatWithFallback({
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

CRITICAL RULES FOR AUTHENTICITY SCORING:
- Generic praise like "delicious food" or "tasty" is food_quality, NOT authenticity. Authenticity requires SPECIFIC mention of traditional preparation, cultural fidelity, regional accuracy, or comparison to the cuisine's origin.
- If a reviewer says "great pasta" at a chain restaurant, that is food_quality sentiment +0.5 to +0.7 (decent but generic) — NOT authenticity.
- Authenticity claims must reference: traditional methods, original recipes, imported ingredients, comparison to the home country, regional specificity, or cultural context.
- If NO reviewer mentions authenticity specifically, do NOT infer or create an authenticity dimension. Absence of authenticity discussion IS the signal.
- Confidence for authenticity should be LOW (0.2-0.4) unless the reviewer demonstrates knowledge of the cuisine's origin.

SENTIMENT CALIBRATION:
- "Delicious" or "tasty" without specifics = food_quality +0.5 (not +0.8 or +0.9)
- "Best X I've ever had" with specific details = +0.9
- Generic positive with no specific claim = +0.3 to +0.5
- Reserve +0.8 to +1.0 for reviews with SPECIFIC, detailed praise

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
  // Deterministic weight assignment — no LLM involved
  const parsedIntent = parseIntent(userIntent);
  const intentWeights =
    parsedIntent.dimensions.length > 0
      ? parsedIntent.dimensions
      : [{ dimension: "food_quality", weight: 1.0 }];

  const { score, dimensionBreakdown } = computeParallaxScore(
    decomposed,
    intentWeights
  );

  // LLM only handles explanation + relevant review selection
  const response = await chatWithFallback({
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
        content: `Given decomposed restaurant reviews and pre-computed dimension weights, select relevant reviews and write an explanation.

Restaurant: ${place.name}
Address: ${place.address}
Google rating: ${place.rating}/5 from ${place.totalReviews} total reviews
Parallax score: ${score.toFixed(1)}/5 (already computed, DO NOT recalculate)

User's intent: "${userIntent}"
Excluded dimensions: ${parsedIntent.excluded.length > 0 ? parsedIntent.excluded.join(", ") : "none"}

Pre-computed dimension weights and scores:
${JSON.stringify(dimensionBreakdown.map((d) => ({
  dimension: d.dimension,
  weight: d.weight,
  sentiment: d.averageSentiment.toFixed(2),
  reviewCount: d.reviewCount,
})), null, 2)}

Decomposed reviews:
${JSON.stringify(decomposed, null, 2)}

Instructions:
1. Select the 3-5 most relevant review excerpts — reviews that address the dimensions with highest weights.
2. Write the explanation following this structure:
   - Start: "For someone looking for [restate the user's intent in your own words],"
   - State that the Parallax score is ${score.toFixed(1)} vs Google's ${place.rating} (${score > place.rating ? "higher" : score < place.rating ? "lower" : "similar"}).
   - Explain WHY using the pre-computed dimension data: name the dimensions, cite their sentiment direction and review count.
   - Contrast: explain what drives Google's aggregate that the user does NOT care about.
   - NEVER use these phrases: "based on the reviews analyzed", "the restaurant has mixed reviews", "overall the restaurant", or any statement that would be equally valid for a different intent.

Respond as JSON:
{
  "relevantReviews": [
    {
      "author": "Name",
      "rating": 4,
      "excerpt": "the most relevant part of their review",
      "whyRelevant": "why this review matters for this user's intent",
      "dimensionScores": [{ "dimension": "noise_level", "sentiment": -0.5 }]
    }
  ],
  "explanation": "For someone looking for X, this restaurant scores [higher/lower] than Google's Y because..."
}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? "";
  const parsed = extractJson(text) as {
    relevantReviews: AnalysisResult["relevantReviews"];
    explanation: string;
  };

  const confidence = calculateConfidence(
    decomposed.length,
    dimensionBreakdown
  );

  return {
    restaurant: {
      name: place.name,
      address: place.address,
      placeId: place.placeId,
      googleRating: place.rating,
      totalReviews: place.totalReviews,
      priceLevel: place.priceLevel,
    },
    parallaxScore: score,
    googleScore: place.rating,
    relevantReviews: parsed.relevantReviews,
    explanation: parsed.explanation,
    confidence,
    sampleSize: decomposed.length,
    dimensionBreakdown,
    dimensionClaims: buildDimensionClaims(decomposed, intentWeights),
  };
}

export async function analyzeReviews(
  place: GooglePlaceResult,
  userIntent: string
): Promise<AnalysisResult> {
  const decomposed = await decomposeReviews(place.reviews);
  return matchAndScore(place, decomposed, userIntent);
}
