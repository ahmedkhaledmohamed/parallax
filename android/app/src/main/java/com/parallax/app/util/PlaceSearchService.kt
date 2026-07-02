package com.parallax.app.util

import android.location.Location
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.places.api.model.AutocompletePrediction
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class PlaceResult(
    val id: String,
    val name: String,
    val address: String,
    val category: String,
    val latLng: LatLng?,
    val phoneNumber: String? = null,
    val websiteUri: String? = null,
    val formattedDistance: String? = null,
)

class PlaceSearchService(private val placesClient: PlacesClient) {
    private val _results = MutableStateFlow<List<PlaceResult>>(emptyList())
    val results: StateFlow<List<PlaceResult>> = _results

    private var searchJob: Job? = null

    suspend fun searchDebounced(query: String, userLocation: LatLng?) {
        searchJob?.cancel()
        if (query.isBlank()) {
            _results.value = emptyList()
            return
        }
        delay(300)
        search(query, userLocation)
    }

    suspend fun search(query: String, userLocation: LatLng?) {
        if (query.isBlank()) {
            _results.value = emptyList()
            return
        }

        val requestBuilder = FindAutocompletePredictionsRequest.builder()
            .setQuery(query)
            .setTypesFilter(listOf("restaurant", "cafe", "bar", "food"))

        if (userLocation != null) {
            val bias = RectangularBounds.newInstance(
                LatLng(userLocation.latitude - 0.05, userLocation.longitude - 0.05),
                LatLng(userLocation.latitude + 0.05, userLocation.longitude + 0.05)
            )
            requestBuilder.setLocationBias(bias)
        }

        try {
            val predictions = suspendCancellableCoroutine<List<AutocompletePrediction>> { cont ->
                placesClient.findAutocompletePredictions(requestBuilder.build())
                    .addOnSuccessListener { cont.resume(it.autocompletePredictions) }
                    .addOnFailureListener { cont.resume(emptyList()) }
            }

            val places = predictions.take(5).map { prediction ->
                fetchPlaceDetails(prediction, userLocation)
            }

            _results.value = places
        } catch (_: Exception) {
            _results.value = emptyList()
        }
    }

    private suspend fun fetchPlaceDetails(prediction: AutocompletePrediction, userLocation: LatLng?): PlaceResult {
        val fields = listOf(
            Place.Field.ID, Place.Field.DISPLAY_NAME, Place.Field.FORMATTED_ADDRESS,
            Place.Field.LOCATION, Place.Field.TYPES,
            Place.Field.NATIONAL_PHONE_NUMBER, Place.Field.WEBSITE_URI
        )

        val place = try {
            suspendCancellableCoroutine<Place?> { cont ->
                placesClient.fetchPlace(FetchPlaceRequest.newInstance(prediction.placeId, fields))
                    .addOnSuccessListener { cont.resume(it.place) }
                    .addOnFailureListener { cont.resume(null) }
            }
        } catch (_: Exception) {
            null
        }

        val latLng = place?.location
        val distance = if (userLocation != null && latLng != null) {
            val results = FloatArray(1)
            Location.distanceBetween(
                userLocation.latitude, userLocation.longitude,
                latLng.latitude, latLng.longitude, results
            )
            val meters = results[0]
            if (meters < 1000) "${meters.toInt()}m" else "%.1fkm".format(meters / 1000)
        } else null

        val category = place?.placeTypes?.firstOrNull()
            ?.toString()?.replace("_", " ")?.replaceFirstChar { it.uppercase() }
            ?: "Restaurant"

        return PlaceResult(
            id = prediction.placeId,
            name = place?.displayName ?: prediction.getPrimaryText(null).toString(),
            address = place?.formattedAddress ?: prediction.getSecondaryText(null).toString(),
            category = category,
            latLng = latLng,
            phoneNumber = place?.nationalPhoneNumber,
            websiteUri = place?.websiteUri?.toString(),
            formattedDistance = distance,
        )
    }

    fun clear() {
        _results.value = emptyList()
    }
}
