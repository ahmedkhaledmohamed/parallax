import SwiftUI
import SwiftData
import MapKit

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var mapSearch = MapSearchService()
    @State private var locationService = LocationService()

    @State private var searchText = ""
    @State private var isSearchFocused = false
    @State private var selectedPlace: PlaceResult?
    @State private var cameraPosition: MapCameraPosition = .userLocation(fallback: .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832),
            latitudinalMeters: 5000,
            longitudinalMeters: 5000
        )
    ))
    @FocusState private var searchFieldFocused: Bool

    private var searchCenter: CLLocationCoordinate2D {
        locationService.lastLocation ?? CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832)
    }

    private var showResults: Bool {
        isSearchFocused && !mapSearch.results.isEmpty && selectedPlace == nil
    }

    var body: some View {
        ZStack(alignment: .top) {
            // Full-screen map
            mapLayer
                .ignoresSafeArea()
                .onTapGesture {
                    dismissSearch()
                }

            // Floating search + results
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    searchBar
                    locationButton
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                if showResults {
                    searchResultsOverlay
                        .padding(.horizontal, 16)
                        .padding(.top, 4)
                }
            }
            .padding(.top, 50) // below dynamic island / status bar
        }
        .preferredColorScheme(.dark)
        .sheet(item: $selectedPlace) { place in
            PlaceDetailSheet(place: place, apiClient: apiClient)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackgroundInteraction(.enabled(upThrough: .medium))
                .presentationCornerRadius(20)
        }
        .onChange(of: selectedPlace) { _, newPlace in
            if newPlace == nil { apiClient.cancel() }
        }
        .task {
            if let coordinate = await locationService.requestLocation() {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: coordinate,
                        latitudinalMeters: 3000,
                        longitudinalMeters: 3000
                    )
                )
            }
        }
        .onChange(of: pendingQuery) { _, newQuery in
            if let q = newQuery {
                pendingQuery = nil

                // Extract restaurant name from Google Maps URL, or use raw text
                let query: String
                if GoogleMapsURLParser.isGoogleMapsURL(q),
                   let parsed = GoogleMapsURLParser.extract(from: q),
                   let name = parsed.query {
                    query = name
                } else {
                    query = q
                }

                searchText = query
                Task {
                    await mapSearch.search(query: query, near: searchCenter)
                    if let first = mapSearch.results.first {
                        selectPlace(first)
                    }
                }
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(isSearchFocused ? .parallaxAmber : .parallaxMuted)

            TextField("Search restaurants", text: $searchText)
                .textFieldStyle(.plain)
                .font(.subheadline)
                .foregroundColor(.parallaxText)
                .focused($searchFieldFocused)
                .submitLabel(.search)
                .onSubmit {
                    if let first = mapSearch.results.first {
                        selectPlace(first)
                    }
                }

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                    mapSearch.clear()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.parallaxMuted)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .background(Color.parallaxBackground.opacity(0.7))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(isSearchFocused ? Color.parallaxAmber.opacity(0.5) : Color.clear, lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
        .onChange(of: searchText) { _, newValue in
            mapSearch.searchDebounced(query: newValue, near: searchCenter)
        }
        .onChange(of: searchFieldFocused) { _, focused in
            isSearchFocused = focused
        }
    }

    // MARK: - Location Button

    private var locationButton: some View {
        Button {
            if let loc = locationService.lastLocation {
                withAnimation {
                    cameraPosition = .region(
                        MKCoordinateRegion(
                            center: loc,
                            latitudinalMeters: 3000,
                            longitudinalMeters: 3000
                        )
                    )
                }
            }
        } label: {
            Image(systemName: "location.fill")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.parallaxAmber)
                .frame(width: 44, height: 44)
                .background(.ultraThinMaterial)
                .background(Color.parallaxBackground.opacity(0.7))
                .cornerRadius(14)
                .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
        }
    }

    // MARK: - Map

    private var mapLayer: some View {
        Map(position: $cameraPosition) {
            ForEach(mapSearch.results) { result in
                Marker(result.name, coordinate: result.coordinate)
                    .tint(Color.parallaxAmber)
            }

            if let selected = selectedPlace {
                Marker(selected.name, coordinate: selected.coordinate)
                    .tint(Color.parallaxAmber)
            }

            UserAnnotation()
        }
        .mapStyle(.standard(elevation: .flat, pointsOfInterest: .including([.restaurant, .cafe, .bakery, .foodMarket])))
        .mapControls {
            MapCompass()
        }
    }

    // MARK: - Search Results

    private var searchResultsOverlay: some View {
        VStack(spacing: 0) {
            ForEach(Array(mapSearch.results.enumerated()), id: \.element.id) { index, place in
                Button {
                    selectPlace(place)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.title3)
                            .foregroundColor(.parallaxAmber)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(place.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.primary)
                            HStack(spacing: 4) {
                                Text(place.category)
                                if let dist = place.formattedDistance {
                                    Text("·")
                                    Text(dist)
                                }
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(.secondary.opacity(0.5))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                }

                if index < mapSearch.results.count - 1 {
                    Divider()
                        .padding(.leading, 48)
                }
            }
        }
        .background(.ultraThinMaterial)
        .background(Color.parallaxBackground.opacity(0.7))
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
    }

    // MARK: - Actions

    private func selectPlace(_ place: PlaceResult) {
        selectedPlace = place
        searchText = place.name
        dismissSearch()
        withAnimation {
            cameraPosition = .region(
                MKCoordinateRegion(
                    center: place.coordinate,
                    latitudinalMeters: 800,
                    longitudinalMeters: 800
                )
            )
        }
    }

    private func dismissSearch() {
        searchFieldFocused = false
        isSearchFocused = false
    }
}
