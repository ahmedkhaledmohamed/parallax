package com.parallax.app.data.api

import com.parallax.app.BuildConfig
import com.parallax.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

private val json = Json { ignoreUnknownKeys = true; isLenient = true }

@kotlinx.serialization.Serializable
private data class AnalyzeRequest(val query: String, val intent: String)

sealed interface ApiResponse {
    data class CacheHit(val result: AnalysisResult, val rateLimitRemaining: Int?) : ApiResponse
    data class Stream(val events: Flow<StreamEvent>, val rateLimitRemaining: Int?) : ApiResponse
}

class ParallaxApi(
    private val baseUrl: String = BuildConfig.API_BASE_URL,
    private val apiKey: String = BuildConfig.API_KEY,
) {
    private val client = OkHttpClient.Builder()
        .readTimeout(90, TimeUnit.SECONDS)
        .connectTimeout(15, TimeUnit.SECONDS)
        .build()

    suspend fun analyze(query: String, intent: String): ApiResponse = withContext(Dispatchers.IO) {
        val body = json.encodeToString(AnalyzeRequest(query, intent))
            .toRequestBody("application/json".toMediaType())

        val requestBuilder = Request.Builder()
            .url("$baseUrl/api/analyze")
            .post(body)
        if (apiKey.isNotEmpty()) {
            requestBuilder.header("Authorization", "Bearer $apiKey")
        }

        val response = client.newCall(requestBuilder.build()).execute()
        val remaining = response.header("X-RateLimit-Remaining")?.toIntOrNull()

        if (!response.isSuccessful) {
            val errorBody = response.body?.string() ?: ""
            val apiError = try {
                json.decodeFromString<ApiError>(errorBody)
            } catch (_: Exception) {
                ApiError(error = "Request failed (HTTP ${response.code})")
            }
            throw ApiException(response.code, apiError)
        }

        val contentType = response.header("Content-Type") ?: ""

        if (contentType.contains("application/json")) {
            val result = json.decodeFromString<AnalysisResult>(response.body!!.string())
            ApiResponse.CacheHit(result, remaining)
        } else {
            val events = parseNdjsonStream(response.body!!.source())
            ApiResponse.Stream(events, remaining)
        }
    }
}

class ApiException(val code: Int, val apiError: ApiError) : Exception(apiError.error)
