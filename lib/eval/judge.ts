import OpenAI from "openai";
import { AnalysisResult } from "../types";
import { RubricScore } from "./types";

function getJudgeClient(): { client: OpenAI; model: string } {
  if (process.env.TOGETHER_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.TOGETHER_API_KEY,
        baseURL: "https://api.together.xyz/v1",
      }),
      model: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
    };
  }
  return {
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    }),
    model: "llama-3.1-8b-instant",
  };
}

export async function judgeExplanationQuality(
  intent: string,
  result: AnalysisResult
): Promise<RubricScore> {
  const { client, model } = getJudgeClient();

  const response = await client.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an evaluation judge. Score the quality of a review analysis explanation. Respond with ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Evaluate this explanation from a personalized restaurant review system.

The user's intent was: "${intent}"
The restaurant's Google rating is ${result.googleScore}/5.
The system's personalized score is ${result.parallaxScore}/5.
The system identified these dimensions as relevant: ${result.dimensionBreakdown.map((d) => `${d.dimension} (weight: ${d.weight}, sentiment: ${d.averageSentiment})`).join(", ")}

The explanation given:
"${result.explanation}"

Score this explanation on 4 criteria (each 0-5):

1. SPECIFICITY: Does it reference specific dimensions, specific sentiment findings, or specific reviewer perspectives? Or is it vague/generic? A score of 1 means "could apply to any restaurant with any intent." A score of 5 means "clearly tailored to this exact intent and these exact findings."

2. INTENT_RELEVANCE: Does the explanation address the user's specific intent? If the user asked about spice and authenticity, does the explanation discuss spice and authenticity — or does it talk about unrelated things?

3. CONTRAST_QUALITY: Does it clearly explain WHY the personalized score differs from the Google aggregate? Does it identify what drives the difference (e.g., "high ratings come from people who valued X, which you don't care about")?

4. ACTIONABILITY: After reading this explanation, would the user have a clearer picture of whether to visit this restaurant? Does it help them make a decision?

Also flag if the explanation contains any of these anti-patterns:
- Generic filler ("based on the reviews analyzed", "the restaurant has mixed reviews")
- Restating the score without explaining why
- Statements equally valid for any user intent

Respond as JSON:
{
  "specificity": 3,
  "intentRelevance": 4,
  "contrastQuality": 2,
  "actionability": 3,
  "antiPatterns": ["list of detected anti-patterns or empty array"],
  "reasoning": "brief explanation of scores"
}`,
      },
    ],
  });

  const text = response.choices[0].message.content ?? "";
  let parsed: {
    specificity: number;
    intentRelevance: number;
    contrastQuality: number;
    actionability: number;
    antiPatterns: string[];
    reasoning: string;
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      dimension: "explanation_quality_judge",
      score: 0,
      maxScore: 20,
      passed: false,
      details: "Judge failed to return valid JSON",
    };
  }

  const totalScore =
    parsed.specificity +
    parsed.intentRelevance +
    parsed.contrastQuality +
    parsed.actionability;
  const maxScore = 20;
  const passed = totalScore >= 12 && parsed.antiPatterns.length === 0;

  const details = [
    `Specificity: ${parsed.specificity}/5`,
    `Intent relevance: ${parsed.intentRelevance}/5`,
    `Contrast quality: ${parsed.contrastQuality}/5`,
    `Actionability: ${parsed.actionability}/5`,
    parsed.antiPatterns.length > 0
      ? `Anti-patterns: ${parsed.antiPatterns.join("; ")}`
      : "No anti-patterns",
    `Judge reasoning: ${parsed.reasoning}`,
  ].join(". ");

  return {
    dimension: "explanation_quality_judge",
    score: totalScore,
    maxScore,
    passed,
    details,
  };
}
