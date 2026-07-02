package com.parallax.app.ui.component

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.ui.theme.*
import com.parallax.app.ui.viewmodel.HomeViewModel
import com.parallax.app.ui.viewmodel.SheetPhase
import com.parallax.app.util.PlaceResult

private data class IntentTag(val emoji: String, val label: String, val keyword: String)

private val intentTags = listOf(
    IntentTag("🕯️", "Quiet", "quiet"),
    IntentTag("🍷", "Wine", "good wine"),
    IntentTag("🥗", "Healthy", "healthy"),
    IntentTag("👶", "Kids", "kid-friendly"),
    IntentTag("💰", "Budget", "affordable"),
    IntentTag("🔥", "Spicy", "spicy"),
    IntentTag("🅿️", "Parking", "easy parking"),
    IntentTag("⏱️", "Quick", "quick service"),
    IntentTag("🎵", "Music", "live music"),
    IntentTag("🍻", "Drinks", "good cocktails"),
    IntentTag("🥩", "Steak", "great steak"),
    IntentTag("🌱", "Vegan", "vegan options"),
    IntentTag("📸", "Insta", "instagrammable"),
    IntentTag("👔", "Formal", "upscale formal"),
    IntentTag("☕", "Coffee", "strong coffee"),
    IntentTag("🍰", "Dessert", "great desserts"),
    IntentTag("🍝", "Authentic", "authentic"),
    IntentTag("💪", "Protein", "high protein"),
    IntentTag("🪑", "Outdoor", "outdoor seating"),
    IntentTag("❤️", "Romantic", "romantic"),
)

@Composable
fun PlaceDetailContent(place: PlaceResult, viewModel: HomeViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // Restaurant header
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(place.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(place.category, fontSize = 14.sp, color = TextSecondary)
                    place.formattedDistance?.let {
                        Text("·", color = TextTertiary)
                        Text(it, fontSize = 14.sp, color = TextSecondary)
                    }
                }

                Text(place.address, fontSize = 12.sp, color = TextTertiary)

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    place.phoneNumber?.let { phone ->
                        ActionChip("Call", Icons.Default.Phone) {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
                        }
                    }
                    place.websiteUri?.let { url ->
                        ActionChip("Website", Icons.Default.Language) {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        }
                    }
                    ActionChip("Directions", Icons.Default.Directions) {
                        val uri = Uri.parse("google.navigation:q=${place.latLng?.latitude},${place.latLng?.longitude}")
                        context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                    }
                }
            }
        }

        item { HorizontalDivider(color = Border) }

        when (uiState.sheetPhase) {
            SheetPhase.INFO -> item {
                Button(
                    onClick = { viewModel.showIntentPicker() },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Amber600),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Get Parallax Score", fontWeight = FontWeight.SemiBold)
                }
            }

            SheetPhase.INTENT -> {
                item {
                    OutlinedTextField(
                        value = uiState.intentText,
                        onValueChange = { viewModel.updateIntentText(it) },
                        placeholder = { Text("What matters to you?", color = TextTertiary) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Amber600,
                            unfocusedBorderColor = Border,
                            focusedContainerColor = Surface,
                            unfocusedContainerColor = Surface,
                        ),
                        trailingIcon = {
                            if (uiState.intentText.isNotEmpty()) {
                                IconButton(onClick = { viewModel.updateIntentText("") }) {
                                    Icon(Icons.Default.Close, "Clear", tint = TextTertiary)
                                }
                            }
                        },
                    )
                }

                item {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(80.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.heightIn(max = 250.dp),
                    ) {
                        items(intentTags) { tag ->
                            val selected = uiState.selectedTags.contains(tag.keyword)
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(3.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(if (selected) Amber600.copy(alpha = 0.2f) else Surface)
                                    .border(
                                        1.dp,
                                        if (selected) Amber600.copy(alpha = 0.5f) else Border,
                                        RoundedCornerShape(20.dp)
                                    )
                                    .clickable { viewModel.toggleTag(tag.keyword) }
                                    .padding(horizontal = 10.dp, vertical = 8.dp),
                            ) {
                                Text(tag.emoji, fontSize = 12.sp)
                                Text(
                                    tag.label,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = if (selected) Amber600 else TextPrimary,
                                )
                            }
                        }
                    }
                }

                item {
                    Button(
                        onClick = { viewModel.analyze() },
                        enabled = uiState.intentText.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Amber600,
                            disabledContainerColor = Amber600.copy(alpha = 0.3f),
                        ),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Analyze", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            SheetPhase.ANALYZING -> item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(vertical = 20.dp),
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Amber600, strokeWidth = 2.dp)
                    Text("Analyzing reviews...", fontSize = 14.sp, color = TextSecondary)
                }
            }

            SheetPhase.RESULT -> {
                uiState.analysisResult?.let { result ->
                    item { ScoreCard(result = result) }
                    item { RadarChart(dimensions = result.dimensionBreakdown) }
                    item { DimensionDelta(dimensions = result.dimensionBreakdown) }
                    item { ExplanationCard(result = result) }

                    item {
                        Text("REVIEWS THAT MATTER TO YOU", fontSize = 11.sp, fontWeight = FontWeight.Medium,
                            color = Amber600, letterSpacing = 1.sp)
                    }
                    result.relevantReviews.forEach { review ->
                        item { ReviewCard(review = review) }
                    }
                }
            }
        }

        item { Spacer(Modifier.height(32.dp)) }
    }
}

@Composable
private fun ActionChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Icon(icon, contentDescription = null, tint = Amber600, modifier = Modifier.size(16.dp))
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = Amber600)
    }
}
