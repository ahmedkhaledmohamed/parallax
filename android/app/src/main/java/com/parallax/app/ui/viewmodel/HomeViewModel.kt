package com.parallax.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.parallax.app.data.model.AnalysisResult
import com.parallax.app.data.model.ApiError
import com.parallax.app.data.model.RestaurantInfo
import com.parallax.app.data.repository.AnalysisRepository
import com.parallax.app.data.repository.AnalysisState
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class Stage { Idle, Searching, Found, Decomposing, Done }

data class HomeUiState(
    val query: String = "",
    val intent: String = "",
    val stage: Stage = Stage.Idle,
    val restaurantInfo: RestaurantInfo? = null,
    val result: AnalysisResult? = null,
    val error: ApiError? = null,
)

class HomeViewModel(private val repository: AnalysisRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val history = repository.history

    private var analysisJob: Job? = null

    fun updateQuery(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
    }

    fun updateIntent(intent: String) {
        _uiState.value = _uiState.value.copy(intent = intent)
    }

    fun setSharedQuery(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
    }

    fun analyze() {
        val state = _uiState.value
        if (state.query.isBlank() || state.intent.isBlank()) return

        analysisJob?.cancel()
        analysisJob = viewModelScope.launch {
            repository.analyze(state.query, state.intent).collect { analysisState ->
                _uiState.value = when (analysisState) {
                    is AnalysisState.Searching -> _uiState.value.copy(
                        stage = Stage.Searching, result = null, error = null, restaurantInfo = null
                    )
                    is AnalysisState.Found -> _uiState.value.copy(
                        stage = Stage.Found, restaurantInfo = analysisState.restaurant
                    )
                    is AnalysisState.Decomposing -> _uiState.value.copy(
                        stage = Stage.Decomposing, restaurantInfo = analysisState.restaurant
                    )
                    is AnalysisState.Done -> _uiState.value.copy(
                        stage = Stage.Done, result = analysisState.result, error = null
                    )
                    is AnalysisState.Failed -> _uiState.value.copy(
                        stage = Stage.Idle, error = analysisState.error, result = null
                    )
                }
            }
        }
    }

    fun retry() = analyze()

    fun clearHistory() {
        viewModelScope.launch { repository.clearHistory() }
    }
}
