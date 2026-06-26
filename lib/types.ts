export interface DimensionClaim {
  dimension: string;
  sentiment: number;
  confidence: number;
  claim: string;
}

export interface DecomposedReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  dimensions: DimensionClaim[];
  contextSignals: string[];
  overallTone: "positive" | "negative" | "mixed" | "neutral";
}

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface GooglePlaceResult {
  name: string;
  address: string;
  placeId: string;
  rating: number;
  totalReviews: number;
  priceLevel?: number;
  reviews: GoogleReview[];
}

export interface RelevantReview {
  author: string;
  rating: number;
  excerpt: string;
  whyRelevant: string;
  dimensionScores: { dimension: string; sentiment: number }[];
}

export interface DimensionScore {
  dimension: string;
  averageSentiment: number;
  googleSentiment: number;
  weight: number;
  reviewCount: number;
}

export interface AnalysisResult {
  restaurant: {
    name: string;
    address: string;
    placeId: string;
    googleRating: number;
    totalReviews: number;
    priceLevel?: number;
  };
  parallaxScore: number;
  googleScore: number;
  relevantReviews: RelevantReview[];
  explanation: string;
  confidence: "high" | "medium" | "low";
  sampleSize: number;
  dimensionBreakdown: DimensionScore[];
  sourceBreakdown?: { source: string; count: number }[];
  dimensionClaims?: Record<string, { author: string; claim: string; sentiment: number }[]>;
  intentSource?: "deterministic" | "llm";
}
