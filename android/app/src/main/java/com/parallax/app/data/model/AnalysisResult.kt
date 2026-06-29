package com.parallax.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Confidence {
    @SerialName("high") HIGH,
    @SerialName("medium") MEDIUM,
    @SerialName("low") LOW,
}

@Serializable
enum class IntentSource {
    @SerialName("deterministic") DETERMINISTIC,
    @SerialName("llm") LLM,
}

@Serializable
data class Restaurant(
    val name: String,
    val address: String,
    val placeId: String,
    val googleRating: Double,
    val totalReviews: Int,
    val priceLevel: Int? = null,
)

@Serializable
data class ReviewDimensionScore(
    val dimension: String,
    val sentiment: Double,
)

@Serializable
data class RelevantReview(
    val author: String,
    val rating: Int,
    val excerpt: String,
    val whyRelevant: String,
    val dimensionScores: List<ReviewDimensionScore>,
)

@Serializable
data class DimensionScore(
    val dimension: String,
    val averageSentiment: Double,
    val googleSentiment: Double,
    val weight: Double,
    val reviewCount: Int,
)

@Serializable
data class SourceBreakdown(
    val source: String,
    val count: Int,
)

@Serializable
data class DimensionClaim(
    val author: String,
    val claim: String,
    val sentiment: Double,
)

@Serializable
data class ParsedDimension(
    val dimension: String,
    val weight: Double,
)

@Serializable
data class AnalysisResult(
    val restaurant: Restaurant,
    val parallaxScore: Double,
    val googleScore: Double,
    val relevantReviews: List<RelevantReview>,
    val explanation: String,
    val confidence: Confidence,
    val sampleSize: Int,
    val dimensionBreakdown: List<DimensionScore>,
    val sourceBreakdown: List<SourceBreakdown>? = null,
    val dimensionClaims: Map<String, List<DimensionClaim>>? = null,
    val intentSource: IntentSource? = null,
    val parsedDimensions: List<ParsedDimension>? = null,
)

@Serializable
data class ApiError(
    val error: String,
    val suggestion: String = "",
)
