import SwiftUI
import SwiftData
import MapKit

private struct QuickIntent: Identifiable {
    let id = UUID()
    let emoji: String
    let label: String
    let full: String
}

private let quickIntents = [
    QuickIntent(emoji: "🕯️", label: "Date night", full: "Quiet date night, great wine, romantic atmosphere"),
    QuickIntent(emoji: "👨‍👩‍👧", label: "Family", full: "Quick family lunch, kid-friendly, large portions"),
    QuickIntent(emoji: "💼", label: "Business", full: "Business dinner, upscale but not pretentious"),
    QuickIntent(emoji: "💰", label: "Cheap eats", full: "Cheap eats, big flavors, don't care about decor"),
    QuickIntent(emoji: "🥑", label: "Brunch", full: "Brunch with friends, good vibes, strong coffee"),
    QuickIntent(emoji: "💪", label: "Post-workout", full: "Post-workout, high protein, quick"),
]

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var mapSearch = MapSearchService()
    @State private var locationService = LocationService()

    @State private var searchText = ""
    @State private var selectedPlace: PlaceResult?
    @State private var selectedIntent = ""
    @State private var selectedIntentId: UUID?
    @State private var showCustomIntent = false
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832),
            latitudinalMeters: 5000,
            longitudinalMeters: 5000
        )
    )

    private var searchCenter: CLLocationCoordinate2D {
        locationService.lastLocation ?? CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832)
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                mapLayer
                intentBar
            }
            .navigationTitle("Parallax")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Search restaurants")
            .searchSuggestions {
                if !mapSearch.results.isEmpty {
                    ForEach(mapSearch.results) { place in
                        Button {
                            selectPlace(place)
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(place.name)
                                    .font(.subheadline.weight(.medium))
                                Text(place.address)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        .searchCompletion(place.name)
                    }
                }
            }
            .onChange(of: searchText) { _, newValue in
                mapSearch.searchDebounced(query: newValue, near: searchCenter)
            }
            .onSubmit(of: .search) {
                if let first = mapSearch.results.first {
                    selectPlace(first)
                }
            }
            .sheet(item: $selectedPlace) { place in
                PlaceDetailSheet(place: place, apiClient: apiClient, preselectedIntent: selectedIntent)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .presentationBackgroundInteraction(.enabled(upThrough: .medium))
                    .presentationCornerRadius(20)
            }
            .onChange(of: selectedPlace) { _, newPlace in
                if newPlace == nil { apiClient.cancel() }
            }
            .task {
                if let _ = await locationService.requestCityIfNeeded(),
                   let location = locationService.lastLocation {
                    cameraPosition = .region(
                        MKCoordinateRegion(
                            center: location,
                            latitudinalMeters: 5000,
                            longitudinalMeters: 5000
                        )
                    )
                }
            }
            .onChange(of: pendingQuery) { _, newQuery in
                if let q = newQuery {
                    searchText = q
                    pendingQuery = nil
                    Task {
                        await mapSearch.search(query: q, near: searchCenter)
                        if let first = mapSearch.results.first {
                            selectPlace(first)
                        }
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            if selectedIntentId == nil, let first = quickIntents.first {
                selectedIntentId = first.id
                selectedIntent = first.full
            }
        }
    }

    private var mapLayer: some View {
        Map(position: $cameraPosition) {
            ForEach(mapSearch.results) { result in
                Marker(result.name, coordinate: result.coordinate)
                    .tint(Color.parallaxAmber)
            }
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .including([.restaurant, .cafe, .bakery, .foodMarket])))
    }

    private var intentBar: some View {
        VStack(spacing: 0) {
            if showCustomIntent {
                HStack(spacing: 8) {
                    TextField("Describe what matters...", text: $selectedIntent)
                        .textFieldStyle(.plain)
                        .font(.subheadline)
                        .padding(10)
                        .background(.ultraThinMaterial)
                        .cornerRadius(10)
                    Button {
                        withAnimation { showCustomIntent = false }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.parallaxMuted)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 6)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(quickIntents) { intent in
                        Button {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                selectedIntentId = intent.id
                                selectedIntent = intent.full
                                showCustomIntent = false
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(intent.emoji)
                                    .font(.system(size: 12))
                                Text(intent.label)
                                    .font(.caption.weight(.medium))
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(selectedIntentId == intent.id ? Color.parallaxAmber.opacity(0.2) : Color.clear)
                            .foregroundColor(selectedIntentId == intent.id ? .parallaxAmber : .parallaxText)
                            .cornerRadius(20)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(selectedIntentId == intent.id ? Color.parallaxAmber.opacity(0.5) : Color.parallaxBorder, lineWidth: 1)
                            )
                        }
                    }

                    Button {
                        withAnimation {
                            selectedIntentId = nil
                            selectedIntent = ""
                            showCustomIntent = true
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "text.bubble")
                                .font(.system(size: 11))
                            Text("Custom")
                                .font(.caption.weight(.medium))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .foregroundColor(showCustomIntent ? .parallaxAmber : .parallaxText)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(showCustomIntent ? Color.parallaxAmber.opacity(0.5) : Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
                .padding(.horizontal, 12)
            }
        }
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    private func selectPlace(_ place: PlaceResult) {
        selectedPlace = place
        withAnimation {
            cameraPosition = .region(
                MKCoordinateRegion(
                    center: place.coordinate,
                    latitudinalMeters: 1000,
                    longitudinalMeters: 1000
                )
            )
        }
    }
}
