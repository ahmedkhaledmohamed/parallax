package com.parallax.app.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.parallax.app.ui.theme.*
import com.parallax.app.ui.viewmodel.HomeViewModel
import com.parallax.app.util.PlaceResult

@Composable
fun HomeScreen(viewModel: HomeViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    val selectedPlace by viewModel.selectedPlace.collectAsState()
    val userLocation by viewModel.userLocation.collectAsState()

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            userLocation ?: LatLng(43.6532, -79.3832), 14f
        )
    }

    LaunchedEffect(userLocation) {
        userLocation?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(it, 14f))
        }
    }

    LaunchedEffect(selectedPlace) {
        selectedPlace?.latLng?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(it, 16f))
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false),
        ) {
            searchResults.forEach { place ->
                place.latLng?.let { pos ->
                    Marker(
                        state = MarkerState(position = pos),
                        title = place.name,
                        onClick = { viewModel.selectPlace(place); true },
                    )
                }
            }
            selectedPlace?.latLng?.let { pos ->
                Marker(state = MarkerState(position = pos), title = selectedPlace?.name ?: "")
            }
        }

        // Floating search + results
        Column(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FloatingSearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = viewModel::updateSearchQuery,
                    onSubmit = { viewModel.selectFirstResult() },
                    modifier = Modifier.weight(1f),
                )
                IconButton(
                    onClick = { /* camera recenters via LaunchedEffect */ },
                    modifier = Modifier
                        .size(48.dp)
                        .shadow(8.dp, RoundedCornerShape(14.dp))
                        .clip(RoundedCornerShape(14.dp))
                        .background(Background.copy(alpha = 0.85f)),
                ) {
                    Icon(Icons.Default.LocationOn, "My location", tint = Amber600)
                }
            }

            AnimatedVisibility(visible = searchResults.isNotEmpty() && selectedPlace == null) {
                SearchResultsOverlay(results = searchResults, onSelect = { viewModel.selectPlace(it) })
            }
        }

        // Bottom sheet
        if (selectedPlace != null) {
            PlaceBottomSheet(viewModel = viewModel, onDismiss = { viewModel.clearSelection() })
        }
    }
}

@Composable
private fun FloatingSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .shadow(8.dp, RoundedCornerShape(14.dp))
            .clip(RoundedCornerShape(14.dp))
            .background(Background.copy(alpha = 0.85f))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Icon(Icons.Default.Search, null, tint = if (isFocused) Amber600 else TextTertiary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))

        Box(modifier = Modifier.weight(1f)) {
            if (query.isEmpty()) {
                Text("Search restaurants", color = TextTertiary, fontSize = 15.sp)
            }
            BasicTextField(
                value = query,
                onValueChange = onQueryChange,
                textStyle = TextStyle(color = TextPrimary, fontSize = 15.sp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSubmit() }),
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { isFocused = it.isFocused },
            )
        }

        if (query.isNotEmpty()) {
            IconButton(onClick = { onQueryChange("") }, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Default.Close, "Clear", tint = TextTertiary, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun SearchResultsOverlay(results: List<PlaceResult>, onSelect: (PlaceResult) -> Unit) {
    Column(
        modifier = Modifier
            .padding(top = 4.dp)
            .shadow(8.dp, RoundedCornerShape(14.dp))
            .clip(RoundedCornerShape(14.dp))
            .background(Background.copy(alpha = 0.9f))
    ) {
        results.forEachIndexed { index, place ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelect(place) }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Icon(Icons.Default.Place, null, tint = Amber600, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(place.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(place.category, fontSize = 12.sp, color = TextSecondary)
                        place.formattedDistance?.let {
                            Text("·", fontSize = 12.sp, color = TextTertiary)
                            Text(it, fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                }
            }
            if (index < results.lastIndex) {
                HorizontalDivider(modifier = Modifier.padding(start = 50.dp), color = Border.copy(alpha = 0.5f))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlaceBottomSheet(viewModel: HomeViewModel, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
    val selectedPlace by viewModel.selectedPlace.collectAsState()
    val place = selectedPlace ?: return

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Background,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextTertiary) },
    ) {
        com.parallax.app.ui.component.PlaceDetailContent(place = place, viewModel = viewModel)
    }
}
