package com.parallax.app.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SearchHistoryDao {
    @Query("SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 20")
    fun getRecent(): Flow<List<SearchHistoryEntity>>

    @Insert
    suspend fun insert(entry: SearchHistoryEntity)

    @Query("DELETE FROM search_history")
    suspend fun clearAll()
}
