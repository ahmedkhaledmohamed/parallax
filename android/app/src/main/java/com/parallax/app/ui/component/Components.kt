package com.parallax.app.ui.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.data.db.SearchHistoryEntity
import com.parallax.app.data.model.*
import com.parallax.app.ui.theme.*
import com.parallax.app.ui.viewmodel.SheetPhase

@Composable
fun ErrorCard(message: String, suggestion: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Red400.copy(alpha = 0.08f))
            .border(1.dp, Red400.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(message, fontSize = 13.sp, color = Red400, modifier = Modifier.weight(1f))
            TextButton(onClick = onRetry) { Text("Retry", color = Red400, fontSize = 12.sp) }
        }
        if (suggestion.isNotEmpty()) {
            Spacer(Modifier.height(4.dp))
            Text(suggestion, fontSize = 11.sp, color = TextTertiary)
        }
    }
}

// LoadingSection removed — loading is handled in PlaceDetail.kt

@Composable
fun ConfidenceBadge(result: AnalysisResult) {
    var expanded by remember { mutableStateOf(false) }
    val color = when (result.confidence) {
        Confidence.HIGH -> Emerald400
        Confidence.MEDIUM -> AmberLight
        Confidence.LOW -> Red400
    }

    val uncovered = result.dimensionBreakdown
        .filter { it.weight > 0.1 && it.reviewCount == 0 }
        .map { it.dimension.replace("_", " ") }

    val explanation = buildString {
        when {
            result.sampleSize < 3 -> append("Only ${result.sampleSize} review${if (result.sampleSize == 1) "" else "s"} available. Take this score as directional.")
            result.confidence == Confidence.LOW -> append("Few of the ${result.sampleSize} reviews mention your priorities. This score may shift with more data.")
            result.confidence == Confidence.MEDIUM -> append("Decent coverage from ${result.sampleSize} reviews, but some priorities had limited mentions.")
            else -> append("Strong coverage — most of your priorities were directly addressed across ${result.sampleSize} reviews.")
        }
        if (uncovered.isNotEmpty()) append(" No reviews mentioned: ${uncovered.joinToString(", ")}.")
    }

    Column {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(color.copy(alpha = 0.15f))
                .border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                .clickable { expanded = !expanded }
                .padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text("${result.confidence.name.lowercase()} confidence", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = color)
        }
        AnimatedVisibility(expanded) {
            Text(explanation, fontSize = 11.sp, color = TextTertiary, lineHeight = 16.sp, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

@Composable
fun DimensionDelta(dimensions: List<DimensionScore>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("DIMENSION SHIFTS", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Amber600, letterSpacing = 1.sp)

        dimensions.sortedByDescending { it.weight }.forEach { dim ->
            val delta = dim.averageSentiment - dim.googleSentiment
            val sign = if (delta > 0) "+" else ""
            Column {
                Row {
                    Text(dim.dimension.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = TextPrimary, modifier = Modifier.weight(1f))
                    Text("$sign%.1f".format(delta), fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = deltaColor(delta))
                }
                Spacer(Modifier.height(4.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Border.copy(alpha = 0.3f))
                )
                Text("${dim.reviewCount} mention${if (dim.reviewCount == 1) "" else "s"}", fontSize = 9.sp, color = TextMuted, modifier = Modifier.align(Alignment.End))
            }
        }
    }
}

@Composable
fun ExplanationCard(result: AnalysisResult) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        result.parsedDimensions?.takeIf { it.isNotEmpty() }?.let { parsed ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Border, RoundedCornerShape(16.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("WHAT WE UNDERSTOOD", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = TextTertiary, letterSpacing = 1.sp)
                    if (result.intentSource == IntentSource.LLM) {
                        Text("AI-INTERPRETED", fontSize = 8.sp, fontWeight = FontWeight.Medium, color = TextMuted, letterSpacing = 1.sp,
                            modifier = Modifier.border(1.dp, Border, RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    parsed.forEach { dim ->
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(SurfaceVariant)
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Text(dim.dimension.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = TextPrimary)
                            Text("${(dim.weight * 100).toInt()}%", fontSize = 11.sp, color = TextTertiary)
                        }
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .border(1.dp, Border, RoundedCornerShape(16.dp))
                .padding(20.dp),
        ) {
            Text("WHY THE DIFFERENCE?", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Amber600, letterSpacing = 1.sp)
            Spacer(Modifier.height(10.dp))
            Text(result.explanation, fontSize = 14.sp, color = TextPrimary.copy(alpha = 0.85f), lineHeight = 20.sp)
        }
    }
}

@Composable
fun ReviewCard(review: RelevantReview) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(review.author, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                repeat(5) { i ->
                    Text(if (i < review.rating) "★" else "☆", fontSize = 10.sp, color = if (i < review.rating) Amber600 else Border)
                }
            }
        }

        Row {
            Box(modifier = Modifier.width(2.dp).height(IntrinsicSize.Max).background(Amber600))
            Text(review.excerpt, fontSize = 13.sp, color = TextPrimary.copy(alpha = 0.8f), lineHeight = 18.sp, modifier = Modifier.padding(start = 10.dp))
        }

        Text(review.whyRelevant, fontSize = 11.sp, fontStyle = FontStyle.Italic, color = TextTertiary)
    }
}

@Composable
fun HistorySection(items: List<SearchHistoryEntity>, onSelect: (String, String) -> Unit, onClear: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("RECENT", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = TextTertiary, letterSpacing = 1.sp, modifier = Modifier.weight(1f))
            TextButton(onClick = onClear) { Text("Clear", fontSize = 11.sp, color = TextMuted) }
        }
        items.take(10).forEach { item ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .border(1.dp, Border, RoundedCornerShape(10.dp))
                    .clickable { onSelect(item.restaurantName, item.intent) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.restaurantName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    if (item.intent.isNotEmpty()) Text(item.intent, fontSize = 10.sp, color = TextTertiary, maxLines = 1)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("%.1f".format(item.googleScore), fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = TextSecondary)
                    Text("→", fontSize = 10.sp, color = TextMuted)
                    Text("%.1f".format(item.parallaxScore), fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = scoreColor(item.parallaxScore))
                }
            }
        }
    }
}
