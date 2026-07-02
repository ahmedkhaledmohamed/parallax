package com.parallax.app.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
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

    // Move camera when user location updates
    LaunchedEffect(userLocation) {
        userLocation?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(it, 14f))
        }
    }

    // Move camera when a place is selected
    LaunchedEffect(selectedPlace) {
        selectedPlace?.latLng?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(it, 16f))
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Map
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(isMyLocationEnabled = true),
            uiSettings = MapUiSettings(myLocationButtonEnabled = false, zoomControlsEnabled = false),
        ) {
            searchResults.forEach { place ->
                place.latLng?.let { pos ->
                    Marker(
                        state = MarkerState(position = pos),
                        title = place.name,
                        onClick = {
                            viewModel.selectPlace(place)
                            true
                        }
                    )
                }
            }
            selectedPlace?.latLng?.let { pos ->
                Marker(
                    state = MarkerState(position = pos),
                    title = selectedPlace?.name ?: "",
                )
            }
        }

        // Floating search bar + location button
        Column(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Row(spacing = 10.dp) {
                FloatingSearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = viewModel::updateSearchQuery,
                    onSubmit = { viewModel.selectFirstResult() },
                    modifier = Modifier.weight(1f),
                )
                // Location button
                IconButton(
                    onClick = {
                        userLocation?.let {
                            viewModel.recenterMap()
                        }
                    },
                    modifier = Modifier
                        .size(48.dp)
                        .shadow(8.dp, CircleShape)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Background.copy(alpha = 0.85f))
                ) {
                    Icon(
                        painter = rememberVectorPainter(
                            defaultWidth = 24.dp, defaultHeight = 24.dp,
                            viewportWidth = 24f, viewportHeight = 24f,
                            autoMirror = false,
                        ) { _, _ ->
                            addPath(
                                pathData = listOf(
                                    androidx.compose.ui.graphics.vector.PathNode.MoveTo(12f, 8f),
                                    androidx.compose.ui.graphics.vector.PathNode.ArcTo(4f, 4f, 0f, false, true, 16f, 12f),
                                    androidx.compose.ui.graphics.vector.PathNode.ArcTo(4f, 4f, 0f, false, true, 12f, 16f),
                                    androidx.compose.ui.graphics.vector.PathNode.ArcTo(4f, 4f, 0f, false, true, 8f, 12f),
                                    androidx.compose.ui.graphics.vector.PathNode.ArcTo(4f, 4f, 0f, false, true, 12f, 8f),
                                    androidx.compose.ui.graphics.vector.PathNode.Close,
                                ),
                                fill = androidx.compose.ui.graphics.SolidColor(Amber600),
                            )
                        },
                        contentDescription = "My location",
                        tint = Amber600,
                    )
                }
            }

            // Search results overlay
            AnimatedVisibility(visible = searchResults.isNotEmpty() && selectedPlace == null) {
                SearchResultsOverlay(
                    results = searchResults,
                    onSelect = { viewModel.selectPlace(it) },
                )
            }
        }

        // Bottom sheet for selected place
        if (selectedPlace != null) {
            PlaceBottomSheet(
                viewModel = viewModel,
                onDismiss = { viewModel.clearSelection() },
            )
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
        Icon(
            imageVector = androidx.compose.material.icons.Icons.Default.Search,
            contentDescription = null,
            tint = if (isFocused) Amber600 else TextTertiary,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.width(10.dp))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            textStyle = androidx.compose.ui.text.TextStyle(
                color = TextPrimary,
                fontSize = 15.sp,
            ),
            singleLine = true,
            modifier = Modifier
                .weight(1f)
                .onFocusChanged { isFocused = it.isFocused },
            decorationBox = { inner ->
                if (query.isEmpty()) {
                    Text("Search restaurants", color = TextTertiary, fontSize = 15.sp)
                }
                inner()
            },
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                imeAction = androidx.compose.ui.text.input.ImeAction.Search,
            ),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                onSearch = { onSubmit() },
            ),
        )
        if (query.isNotEmpty()) {
            IconButton(onClick = { onQueryChange("") }, modifier = Modifier.size(20.dp)) {
                Icon(
                    imageVector = androidx.compose.material.icons.Icons.Default.Close,
                    contentDescription = "Clear",
                    tint = TextTertiary,
                    modifier = Modifier.size(16.dp),
                )
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
                Icon(
                    imageVector = androidx.compose.material.icons.Icons.Default.Place,
                    contentDescription = null,
                    tint = Amber600,
                    modifier = Modifier.size(24.dp),
                )
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
                HorizontalDivider(
                    modifier = Modifier.padding(start = 50.dp),
                    color = Border.copy(alpha = 0.5f),
                )
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
        com.parallax.app.ui.component.PlaceDetailContent(
            place = place,
            viewModel = viewModel,
        )
    }
}
