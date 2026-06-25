import OpenAI from "openai";
import {
  GooglePlaceResult,
  GoogleReview,
  DecomposedReview,
  AnalysisResult,
} from "./types";

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
      breakdown.push({
        dimension: dw.dimension,
        averageSentiment: 0,
        googleSentiment,
        weight: dw.weight,
        reviewCount: 0,
      });
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
2. Assign weights to relevant dimensions (0.0 to 1.0, should roughly sum to 1.0). Do NOT compute a score — the score will be calculated separately from your weights.

CRITICAL WEIGHT RULES:
- Dimensions explicitly mentioned in the user's intent MUST receive the highest weights.
- If the user says "authentic" or "real" or "traditional", authenticity MUST be the top-weighted dimension.
- If the user says "don't care about X", dimension X MUST receive weight 0.0 and be EXCLUDED.
- food_quality should only be highly weighted if the user explicitly mentions food quality, taste, or flavor.
- Do NOT default to food_quality as the highest weight — many intents prioritize other dimensions.
- Rank dimensions STRICTLY by how prominently they appear in the user's intent statement.
3. Select the 3-5 most relevant review excerpts — reviews that specifically address what the user cares about.
4. Write the explanation following this structure:
   - Start: "For someone looking for [restate the user's intent in your own words],"
   - State whether the Parallax score is higher, lower, or similar to Google's and by how much.
   - Explain WHY using specific dimension findings: name the dimensions, cite sentiment direction, and reference how many reviewers mentioned them (e.g., "3 of 5 reviewers praised the ambiance, but only 1 mentioned noise level — and negatively").
   - Contrast: explain what drives Google's aggregate that the user does NOT care about (e.g., "Google's high rating is driven by presentation and service scores, which you deprioritized").
   - NEVER use these phrases: "based on the reviews analyzed", "the restaurant has mixed reviews", "overall the restaurant", or any statement that would be equally valid for a completely different user intent.

Respond as JSON:
{
  "dimensionWeights": [
    { "dimension": "noise_level", "weight": 0.4 }
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
  "explanation": "For someone looking for X, this restaurant scores [higher/lower] than Google's Y because..."
}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? "";
  const parsed = extractJson(text) as {
    dimensionWeights: { dimension: string; weight: number }[];
    relevantReviews: AnalysisResult["relevantReviews"];
    explanation: string;
  };

  const { score, dimensionBreakdown } = computeParallaxScore(
    decomposed,
    parsed.dimensionWeights
  );

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
    dimensionClaims: buildDimensionClaims(decomposed, parsed.dimensionWeights),
  };
}

export async function analyzeReviews(
  place: GooglePlaceResult,
  userIntent: string
): Promise<AnalysisResult> {
  const decomposed = await decomposeReviews(place.reviews);
  return matchAndScore(place, decomposed, userIntent);
}
