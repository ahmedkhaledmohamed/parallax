package com.parallax.app.ui.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.data.model.DimensionScore
import com.parallax.app.ui.theme.*
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

@Composable
fun RadarChart(dimensions: List<DimensionScore>) {
    if (dimensions.size < 3) return

    val textMeasurer = rememberTextMeasurer()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .padding(20.dp),
    ) {
        Text("DIMENSION PROFILE", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Amber600, letterSpacing = 1.sp)
        Spacer(Modifier.height(12.dp))

        Canvas(modifier = Modifier.fillMaxWidth().aspectRatio(1f)) {
            val cx = size.width / 2
            val cy = size.height / 2
            val radius = min(size.width, size.height) / 2 - 40f
            val n = dimensions.size
            val step = (2 * Math.PI / n).toFloat()

            fun vertex(i: Int, value: Float): Offset {
                val angle = step * i - Math.PI.toFloat() / 2
                return Offset(cx + radius * value * cos(angle), cy + radius * value * sin(angle))
            }

            for (level in listOf(0.25f, 0.5f, 0.75f, 1f)) {
                val path = Path()
                for (i in 0 until n) {
                    val p = vertex(i, level)
                    if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
                }
                path.close()
                drawPath(path, Border.copy(alpha = 0.5f), style = Stroke(0.5f))
            }

            for (i in 0 until n) {
                val p = vertex(i, 1f)
                drawLine(Border.copy(alpha = 0.3f), Offset(cx, cy), p, strokeWidth = 0.5f)
            }

            val googlePath = Path()
            val parallaxPath = Path()
            for (i in 0 until n) {
                val gv = ((dimensions[i].googleSentiment + 1) / 2).toFloat()
                val pv = ((dimensions[i].averageSentiment + 1) / 2).toFloat()
                val gp = vertex(i, gv)
                val pp = vertex(i, pv)
                if (i == 0) { googlePath.moveTo(gp.x, gp.y); parallaxPath.moveTo(pp.x, pp.y) }
                else { googlePath.lineTo(gp.x, gp.y); parallaxPath.lineTo(pp.x, pp.y) }
            }
            googlePath.close()
            parallaxPath.close()

            drawPath(googlePath, TextSecondary.copy(alpha = 0.1f))
            drawPath(googlePath, TextSecondary.copy(alpha = 0.4f), style = Stroke(1.5f))
            drawPath(parallaxPath, Amber600.copy(alpha = 0.15f))
            drawPath(parallaxPath, Amber600, style = Stroke(2f))

            for (i in 0 until n) {
                val angle = step * i - Math.PI.toFloat() / 2
                val labelR = radius + 24f
                val p = Offset(cx + labelR * cos(angle), cy + labelR * sin(angle))
                val label = dimensions[i].dimension.replace("_", " ")
                    .replaceFirstChar { it.uppercase() }
                val layout = textMeasurer.measure(label, TextStyle(fontSize = 9.sp, color = TextTertiary))
                drawText(layout, topLeft = Offset(p.x - layout.size.width / 2, p.y - layout.size.height / 2))
            }
        }
    }
}
