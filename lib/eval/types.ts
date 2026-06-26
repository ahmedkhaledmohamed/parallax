import { GoogleReview, AnalysisResult, DecomposedReview } from "../types";

export interface EvalCase {
  id: string;
  restaurant: string;
  city: string;
  intent: string;
  mockReviews: GoogleReview[];
  mockPlace: {
    name: string;
    address: string;
    placeId: string;
    rating: number;
    totalReviews: number;
    priceLevel?: number;
  };
  expectations: {
    scoreShouldBe?: { min: number; max: number };
    confidenceShouldBe?: "high" | "medium" | "low";
    dimensionsMustInclude?: string[];
    dimensionsMustExclude?: string[];
    explanationMustMention?: string[];
    explanationMustNotContain?: string[];
    weightOrder?: string[];
    expectedDirection?: "lower" | "higher" | "similar";
  };
  pairedWith?: string;
  humanScore?: number;
  humanRationale?: string;
}

export interface RubricScore {
  dimension: string;
  score: number;
  maxScore: number;
  passed: boolean;
  details: string;
}

export interface EvalResult {
  caseId: string;
  restaurant: string;
  intent: string;
  timestamp: string;
  analysis: AnalysisResult;
  decomposed: DecomposedReview[];
  rubricScores: RubricScore[];
  overallScore: number;
  overallMax: number;
  passed: boolean;
}

export interface EvalReport {
  runId: string;
  timestamp: string;
  promptHash: string;
  results: EvalResult[];
  summary: {
    totalCases: number;
    passed: number;
    failed: number;
    overallScore: number;
    overallMax: number;
    byDimension: Record<string, { score: number; max: number; passRate: number }>;
  };
}

export interface EvalComparison {
  baselineRunId: string;
  currentRunId: string;
  regressions: {
    caseId: string;
    dimension: string;
    baselineScore: number;
    currentScore: number;
    delta: number;
  }[];
  improvements: {
    caseId: string;
    dimension: string;
    baselineScore: number;
    currentScore: number;
    delta: number;
  }[];
  overallDelta: number;
}
