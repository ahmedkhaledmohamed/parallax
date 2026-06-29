package com.parallax.app

import android.app.Application
import androidx.room.Room
import com.parallax.app.data.db.ParallaxDatabase

class ParallaxApp : Application() {
    val database: ParallaxDatabase by lazy {
        Room.databaseBuilder(this, ParallaxDatabase::class.java, "parallax.db").build()
    }

    companion object {
        lateinit var instance: ParallaxApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}
