package com.parallax.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class RestaurantInfo(
    val name: String,
    val address: String,
    val rating: Double,
    val totalReviews: Int,
    val sourceBreakdown: List<SourceBreakdown>? = null,
)

@Serializable
data class DecomposedInfo(
    val reviewCount: Int,
    val dimensionCount: Int,
)

sealed interface StreamEvent {
    data class RestaurantFound(val data: RestaurantInfo) : StreamEvent
    data class Decomposed(val data: DecomposedInfo) : StreamEvent
    data class Result(val data: AnalysisResult) : StreamEvent
    data class Error(val data: ApiError) : StreamEvent
}
