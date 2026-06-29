package com.parallax.app.data.api

import java.net.URLDecoder

object MapsUrlDetector {
    private val DETECTION_REGEX = Regex(
        """(?:maps\.google\.|google\.\w+/maps|goo\.gl/maps|maps\.app\.goo\.gl)"""
    )

    private val EXTRACTION_PATTERNS = listOf(
        Regex("""place_id[=:]([A-Za-z0-9_-]+)""") to true,
        Regex("""maps/place/([^/@]+)""") to false,
        Regex("""maps\?.*q=([^&]+)""") to false,
    )

    fun isGoogleMapsUrl(input: String): Boolean =
        DETECTION_REGEX.containsMatchIn(input)

    fun extractQuery(url: String): String {
        for ((pattern, _) in EXTRACTION_PATTERNS) {
            val match = pattern.find(url) ?: continue
            val raw = match.groupValues[1].replace("+", " ")
            return try {
                URLDecoder.decode(raw, "UTF-8")
            } catch (_: Exception) {
                raw
            }
        }
        return url
    }
}
