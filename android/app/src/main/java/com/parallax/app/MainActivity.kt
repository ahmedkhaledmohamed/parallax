package com.parallax.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.model.LatLng
import com.parallax.app.data.api.MapsUrlDetector
import com.parallax.app.data.api.ParallaxApi
import com.parallax.app.data.repository.AnalysisRepository
import com.parallax.app.ui.screen.HomeScreen
import com.parallax.app.ui.theme.ParallaxTheme
import com.parallax.app.ui.viewmodel.HomeViewModel

class MainActivity : ComponentActivity() {

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.any { it }) {
            fetchLocation()
        }
    }

    private var viewModelRef: HomeViewModel? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val sharedText = extractSharedText(intent)

        setContent {
            ParallaxTheme {
                val vm: HomeViewModel = viewModel {
                    val app = application as ParallaxApp
                    val repo = AnalysisRepository(
                        api = ParallaxApi(),
                        dao = app.database.searchHistoryDao(),
                    )
                    HomeViewModel(repo, app.placeSearchService)
                }

                viewModelRef = vm

                LaunchedEffect(Unit) {
                    requestLocationPermission()
                }

                LaunchedEffect(sharedText) {
                    if (sharedText != null) {
                        val query = if (MapsUrlDetector.isGoogleMapsUrl(sharedText)) {
                            MapsUrlDetector.extractQuery(sharedText)
                        } else {
                            // Extract restaurant name from shared text (first non-URL line)
                            sharedText.lines()
                                .map { it.trim() }
                                .firstOrNull { it.isNotEmpty() && !it.startsWith("http") }
                                ?: sharedText
                        }
                        vm.updateSearchQuery(query)
                        vm.selectFirstResult()
                    }
                }

                HomeScreen(viewModel = vm)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            return intent.getStringExtra(Intent.EXTRA_TEXT)
        }
        return null
    }

    private fun requestLocationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
        ) {
            fetchLocation()
        } else {
            locationPermission.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                )
            )
        }
    }

    @Suppress("MissingPermission")
    private fun fetchLocation() {
        val client = LocationServices.getFusedLocationProviderClient(this)
        client.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                viewModelRef?.setUserLocation(LatLng(location.latitude, location.longitude))
            }
        }
    }
}
