package com.parallax.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.parallax.app.data.model.AnalysisResult
import com.parallax.app.data.model.ApiError
import com.parallax.app.data.repository.AnalysisRepository
import com.parallax.app.data.repository.AnalysisState
import com.parallax.app.util.PlaceResult
import com.parallax.app.util.PlaceSearchService
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class SheetPhase { INFO, INTENT, ANALYZING, RESULT }

data class HomeUiState(
    val searchQuery: String = "",
    val sheetPhase: SheetPhase = SheetPhase.INFO,
    val intentText: String = "",
    val selectedTags: Set<String> = emptySet(),
    val analysisResult: AnalysisResult? = null,
    val error: ApiError? = null,
)

class HomeViewModel(
    private val repository: AnalysisRepository,
    private val placeSearch: PlaceSearchService,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val searchResults = placeSearch.results
    val history = repository.history

    private val _selectedPlace = MutableStateFlow<PlaceResult?>(null)
    val selectedPlace: StateFlow<PlaceResult?> = _selectedPlace.asStateFlow()

    private val _userLocation = MutableStateFlow<LatLng?>(null)
    val userLocation: StateFlow<LatLng?> = _userLocation.asStateFlow()

    private var analysisJob: Job? = null
    private var searchJob: Job? = null

    fun setUserLocation(latLng: LatLng) {
        _userLocation.value = latLng
    }

    fun updateSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            placeSearch.searchDebounced(query, _userLocation.value)
        }
    }

    fun selectPlace(place: PlaceResult) {
        _selectedPlace.value = place
        _uiState.value = _uiState.value.copy(
            searchQuery = place.name,
            sheetPhase = SheetPhase.INFO,
            analysisResult = null,
            error = null,
            intentText = "",
            selectedTags = emptySet(),
        )
        placeSearch.clear()
    }

    fun selectFirstResult() {
        searchResults.value.firstOrNull()?.let { selectPlace(it) }
    }

    fun clearSelection() {
        _selectedPlace.value = null
        _uiState.value = _uiState.value.copy(sheetPhase = SheetPhase.INFO)
    }

    fun recenterMap() {
        // Camera recentering handled by LaunchedEffect in HomeScreen
    }

    fun showIntentPicker() {
        _uiState.value = _uiState.value.copy(sheetPhase = SheetPhase.INTENT)
    }

    fun updateIntentText(text: String) {
        _uiState.value = _uiState.value.copy(intentText = text)
    }

    fun toggleTag(keyword: String) {
        val current = _uiState.value
        val tags = current.selectedTags.toMutableSet()
        val intentParts = current.intentText.split(", ").filter { it.isNotBlank() }.toMutableList()

        if (tags.contains(keyword)) {
            tags.remove(keyword)
            intentParts.remove(keyword)
        } else {
            tags.add(keyword)
            intentParts.add(keyword)
        }

        _uiState.value = current.copy(
            selectedTags = tags,
            intentText = intentParts.joinToString(", "),
        )
    }

    fun analyze() {
        val place = _selectedPlace.value ?: return
        val intent = _uiState.value.intentText
        if (intent.isBlank()) return

        _uiState.value = _uiState.value.copy(sheetPhase = SheetPhase.ANALYZING, error = null)

        analysisJob?.cancel()
        analysisJob = viewModelScope.launch {
            val query = "${place.name}, ${place.address}"
            repository.analyze(query, intent).collect { state ->
                when (state) {
                    is AnalysisState.Done -> {
                        _uiState.value = _uiState.value.copy(
                            sheetPhase = SheetPhase.RESULT,
                            analysisResult = state.result,
                        )
                    }
                    is AnalysisState.Failed -> {
                        _uiState.value = _uiState.value.copy(
                            sheetPhase = SheetPhase.INTENT,
                            error = state.error,
                        )
                    }
                    else -> {}
                }
            }
        }
    }

    fun clearHistory() {
        viewModelScope.launch { repository.clearHistory() }
    }
}
