package com.parallax.app.ui.component

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.data.model.AnalysisResult
import com.parallax.app.ui.theme.*

@Composable
fun ScoreCard(result: AnalysisResult) {
    val delta = result.parallaxScore - result.googleScore
    val sign = if (delta > 0) "+" else ""

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .padding(20.dp),
    ) {
        Text(result.restaurant.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(Modifier.height(2.dp))
        Text(result.restaurant.address, fontSize = 12.sp, color = TextTertiary)
        Spacer(Modifier.height(16.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("GOOGLE", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = TextTertiary, letterSpacing = 1.sp)
                Text("%.1f".format(result.googleScore), fontSize = 32.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                Text("${result.restaurant.totalReviews} reviews", fontSize = 10.sp, color = TextMuted)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(top = 16.dp)) {
                Text("$sign%.1f".format(delta), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = deltaColor(delta), fontFamily = FontFamily.Monospace)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("PARALLAX", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Amber600, letterSpacing = 1.sp)
                Text("%.1f".format(result.parallaxScore), fontSize = 32.sp, fontWeight = FontWeight.Bold, color = scoreColor(result.parallaxScore))
                val sourceText = result.sourceBreakdown?.takeIf { it.size > 1 }
                    ?.joinToString(" + ") { "${it.count} ${it.source}" }
                    ?: "${result.sampleSize} analyzed"
                Text(sourceText, fontSize = 10.sp, color = TextMuted)
            }
        }

        Spacer(Modifier.height(12.dp))
        ConfidenceBadge(result = result)
    }
}
