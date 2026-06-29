package com.parallax.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [SearchHistoryEntity::class], version = 1, exportSchema = false)
abstract class ParallaxDatabase : RoomDatabase() {
    abstract fun searchHistoryDao(): SearchHistoryDao
}
