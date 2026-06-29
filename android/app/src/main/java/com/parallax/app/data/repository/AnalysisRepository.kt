package com.parallax.app.data.repository

import com.parallax.app.data.api.ApiException
import com.parallax.app.data.api.ApiResponse
import com.parallax.app.data.api.ParallaxApi
import com.parallax.app.data.db.SearchHistoryDao
import com.parallax.app.data.db.SearchHistoryEntity
import com.parallax.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow

sealed interface AnalysisState {
    data object Searching : AnalysisState
    data class Found(val restaurant: RestaurantInfo) : AnalysisState
    data class Decomposing(val restaurant: RestaurantInfo) : AnalysisState
    data class Done(val result: AnalysisResult) : AnalysisState
    data class Failed(val error: ApiError) : AnalysisState
}

class AnalysisRepository(
    private val api: ParallaxApi,
    private val dao: SearchHistoryDao,
) {
    fun analyze(query: String, intent: String): Flow<AnalysisState> = flow {
        emit(AnalysisState.Searching)

        when (val response = api.analyze(query, intent)) {
            is ApiResponse.CacheHit -> {
                emit(AnalysisState.Done(response.result))
                saveToHistory(response.result, intent)
            }
            is ApiResponse.Stream -> {
                var lastRestaurant: RestaurantInfo? = null
                response.events.collect { event ->
                    when (event) {
                        is StreamEvent.RestaurantFound -> {
                            lastRestaurant = event.data
                            emit(AnalysisState.Found(event.data))
                        }
                        is StreamEvent.Decomposed -> {
                            lastRestaurant?.let { emit(AnalysisState.Decomposing(it)) }
                        }
                        is StreamEvent.Result -> {
                            emit(AnalysisState.Done(event.data))
                            saveToHistory(event.data, intent)
                        }
                        is StreamEvent.Error -> {
                            emit(AnalysisState.Failed(event.data))
                        }
                    }
                }
            }
        }
    }.catch { e ->
        val error = if (e is ApiException) {
            e.apiError
        } else {
            ApiError(error = e.message ?: "Connection failed", suggestion = "Check your internet connection and try again.")
        }
        emit(AnalysisState.Failed(error))
    }

    val history: Flow<List<SearchHistoryEntity>> = dao.getRecent()

    suspend fun clearHistory() = dao.clearAll()

    private suspend fun saveToHistory(result: AnalysisResult, intent: String) {
        dao.insert(
            SearchHistoryEntity(
                restaurantName = result.restaurant.name,
                intent = intent,
                parallaxScore = result.parallaxScore,
                googleScore = result.googleScore,
            )
        )
    }
}
