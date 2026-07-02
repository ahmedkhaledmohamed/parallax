package com.parallax.app

import android.app.Application
import androidx.room.Room
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.net.PlacesClient
import com.parallax.app.data.db.ParallaxDatabase
import com.parallax.app.util.PlaceSearchService

class ParallaxApp : Application() {
    val database: ParallaxDatabase by lazy {
        Room.databaseBuilder(this, ParallaxDatabase::class.java, "parallax.db").build()
    }

    lateinit var placesClient: PlacesClient
        private set

    lateinit var placeSearchService: PlaceSearchService
        private set

    companion object {
        lateinit var instance: ParallaxApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        if (!Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(this, BuildConfig.API_BASE_URL.let {
                // Use the Google Maps API key from manifest metadata
                packageManager.getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
                    .metaData.getString("com.google.android.geo.API_KEY") ?: ""
            })
        }
        placesClient = Places.createClient(this)
        placeSearchService = PlaceSearchService(placesClient)
    }
}
