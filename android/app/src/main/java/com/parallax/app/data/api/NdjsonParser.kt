package com.parallax.app.data.api

import com.parallax.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okio.BufferedSource

private val json = Json { ignoreUnknownKeys = true; isLenient = true }

fun parseNdjsonStream(source: BufferedSource): Flow<StreamEvent> = flow {
    while (!source.exhausted()) {
        val line = source.readUtf8Line() ?: break
        if (line.isBlank()) continue

        try {
            val element = json.parseToJsonElement(line)
            val type = element.jsonObject["type"]?.jsonPrimitive?.content ?: continue
            val data = element.jsonObject["data"] ?: continue

            val event: StreamEvent? = when (type) {
                "restaurant" -> StreamEvent.RestaurantFound(json.decodeFromJsonElement(RestaurantInfo.serializer(), data))
                "decomposed" -> StreamEvent.Decomposed(json.decodeFromJsonElement(DecomposedInfo.serializer(), data))
                "result" -> StreamEvent.Result(json.decodeFromJsonElement(AnalysisResult.serializer(), data))
                "error" -> StreamEvent.Error(json.decodeFromJsonElement(ApiError.serializer(), data))
                else -> null
            }
            if (event != null) emit(event)
        } catch (_: Exception) {
            // skip malformed lines
        }
    }
}
