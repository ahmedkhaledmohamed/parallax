package com.parallax.app.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "search_history")
data class SearchHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val restaurantName: String,
    val intent: String,
    val parallaxScore: Double,
    val googleScore: Double,
    val timestamp: Long = System.currentTimeMillis(),
)
