package com.parallax.app.ui.theme

import androidx.compose.ui.graphics.Color

val Background = Color(0xFF09090B)
val Surface = Color(0xFF18181B)
val SurfaceVariant = Color(0xFF27272A)
val Border = Color(0xFF3F3F46)

val TextPrimary = Color(0xFFFAFAFA)
val TextSecondary = Color(0xFFA1A1AA)
val TextTertiary = Color(0xFF71717A)
val TextMuted = Color(0xFF52525B)

val Amber500 = Color(0xFFF59E0B)
val Amber600 = Color(0xFFD97706)
val Emerald400 = Color(0xFF34D399)
val Red400 = Color(0xFFF87171)
val AmberLight = Color(0xFFFBBF24)

fun sentimentColor(sentiment: Double): Color = when {
    sentiment >= 0.3 -> Emerald400
    sentiment >= -0.3 -> AmberLight
    else -> Red400
}

fun scoreColor(score: Double): Color = when {
    score >= 4.0 -> Emerald400
    score >= 3.0 -> AmberLight
    else -> Red400
}

fun deltaColor(delta: Double): Color = when {
    kotlin.math.abs(delta) < 0.3 -> TextTertiary
    delta > 0 -> Emerald400
    else -> Red400
}
