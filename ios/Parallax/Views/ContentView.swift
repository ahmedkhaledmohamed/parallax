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
    QuickIntent(emoji: "💰", label: "Budget", full: "Cheap eats, big flavors, don't care about decor"),
    QuickIntent(emoji: "🥑", label: "Brunch", full: "Brunch with friends, good vibes, strong coffee"),
    QuickIntent(emoji: "💪", label: "Gym", full: "Post-workout, high protein, generous portions, quick"),
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
                Map(position: $cameraPosition) {
                    ForEach(mapSearch.results) { result in
                        Marker(result.name, coordinate: result.coordinate)
                            .tint(Color.parallaxAmber)
                    }
                }
                .mapStyle(.standard(elevation: .flat, pointsOfInterest: .including([.restaurant, .cafe, .bakery, .foodMarket])))

                intentBar
            }
            .navigationTitle("Parallax")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Search restaurants")
            .searchSuggestions {
                ForEach(mapSearch.results) { place in
                    Button {
                        selectPlace(place)
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title3)
                                .foregroundColor(.parallaxAmber)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(place.name)
                                    .font(.subheadline.weight(.medium))
                                HStack(spacing: 4) {
                                    Text(place.category)
                                    if let dist = place.formattedDistance {
                                        Text("•")
                                        Text(dist)
                                    }
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                            }
                        }
                    }
                    .searchCompletion(place.name)
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

    private var intentBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(quickIntents) { intent in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            selectedIntentId = intent.id
                            selectedIntent = intent.full
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(intent.emoji)
                                .font(.system(size: 13))
                            Text(intent.label)
                                .font(.caption.weight(.medium))
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(selectedIntentId == intent.id ? Color.parallaxAmber.opacity(0.25) : Color(.systemBackground).opacity(0.6))
                        .foregroundColor(selectedIntentId == intent.id ? .parallaxAmber : .primary)
                        .cornerRadius(22)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22)
                                .stroke(selectedIntentId == intent.id ? Color.parallaxAmber.opacity(0.6) : Color.clear, lineWidth: 1.5)
                        )
                    }
                }
            }
            .padding(.horizontal, 12)
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
