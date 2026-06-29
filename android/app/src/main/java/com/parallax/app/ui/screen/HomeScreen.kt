package com.parallax.app.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.parallax.app.ui.component.*
import com.parallax.app.ui.theme.*
import com.parallax.app.ui.viewmodel.HomeViewModel
import com.parallax.app.ui.viewmodel.Stage

@Composable
fun HomeScreen(viewModel: HomeViewModel) {
    val state by viewModel.uiState.collectAsState()
    val history by viewModel.history.collectAsState(initial = emptyList())

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 48.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("P", fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Amber600)
                Spacer(Modifier.height(4.dp))
                Text("Parallax", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Same reviews, your viewpoint",
                    fontSize = 14.sp,
                    color = TextTertiary,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(24.dp))
            }
        }

        item {
            SearchBar(
                query = state.query,
                intent = state.intent,
                isLoading = state.stage != Stage.Idle && state.stage != Stage.Done,
                onQueryChange = viewModel::updateQuery,
                onIntentChange = viewModel::updateIntent,
                onSubmit = viewModel::analyze,
            )
        }

        if (state.error != null) {
            item {
                ErrorCard(
                    message = state.error!!.error,
                    suggestion = state.error!!.suggestion,
                    onRetry = viewModel::retry,
                )
            }
        }

        if (state.stage == Stage.Searching || state.stage == Stage.Found || state.stage == Stage.Decomposing) {
            item {
                LoadingSection(stage = state.stage, restaurant = state.restaurantInfo)
            }
        }

        if (state.stage == Stage.Done && state.result != null) {
            val result = state.result!!

            item { ScoreCard(result = result) }
            item { RadarChart(dimensions = result.dimensionBreakdown) }
            item { DimensionDelta(dimensions = result.dimensionBreakdown) }
            item { ExplanationCard(result = result) }

            item {
                Text(
                    "REVIEWS THAT MATTER TO YOU",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = Amber600,
                    letterSpacing = 1.sp,
                )
            }
            items(result.relevantReviews) { review ->
                ReviewCard(review = review)
            }
        }

        if (state.stage == Stage.Idle && state.error == null && state.result == null && history.isNotEmpty()) {
            item {
                HistorySection(
                    items = history,
                    onSelect = { name, intent ->
                        viewModel.updateQuery(name)
                        viewModel.updateIntent(intent)
                        viewModel.analyze()
                    },
                    onClear = viewModel::clearHistory,
                )
            }
        }
    }
}
