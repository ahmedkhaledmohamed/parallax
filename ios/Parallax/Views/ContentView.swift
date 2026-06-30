import SwiftUI
import SwiftData
import MapKit

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var mapSearch = MapSearchService()
    @State private var locationService = LocationService()

    @State private var searchText = ""
    @State private var isSearchActive = false
    @State private var selectedPlace: PlaceResult?
    @State private var cameraPosition: MapCameraPosition = .userLocation(fallback: .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832),
            latitudinalMeters: 5000,
            longitudinalMeters: 5000
        )
    ))

    private var searchCenter: CLLocationCoordinate2D {
        locationService.lastLocation ?? CLLocationCoordinate2D(latitude: 43.6532, longitude: -79.3832)
    }

    private var showResults: Bool {
        isSearchActive && !mapSearch.results.isEmpty && selectedPlace == nil
    }

    var body: some View {
        NavigationStack {
            ZStack {
                mapLayer
                    .ignoresSafeArea()

                if showResults {
                    searchResultsOverlay
                }
            }
            .navigationTitle("Parallax")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .searchable(text: $searchText, isPresented: $isSearchActive, prompt: "Search restaurants")
            .onChange(of: searchText) { _, newValue in
                mapSearch.searchDebounced(query: newValue, near: searchCenter)
            }
            .onSubmit(of: .search) {
                if let first = mapSearch.results.first {
                    selectPlace(first)
                }
            }
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
            MapUserLocationButton()
            MapCompass()
        }
    }

    // MARK: - Search Results Overlay

    private var searchResultsOverlay: some View {
        VStack {
            VStack(spacing: 0) {
                ForEach(Array(mapSearch.results.enumerated()), id: \.element.id) { index, place in
                    Button {
                        selectPlace(place)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title2)
                                .foregroundColor(.parallaxAmber)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(place.name)
                                    .font(.body.weight(.semibold))
                                    .foregroundColor(.primary)
                                HStack(spacing: 4) {
                                    Text(place.category)
                                    if let dist = place.formattedDistance {
                                        Text("·")
                                        Text(dist)
                                    }
                                }
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(.secondary.opacity(0.5))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }

                    if index < mapSearch.results.count - 1 {
                        Divider()
                            .padding(.leading, 52)
                    }
                }
            }
            .background(.regularMaterial)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.3), radius: 12, y: 4)
            .padding(.horizontal, 12)

            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    // MARK: - Actions

    private func selectPlace(_ place: PlaceResult) {
        selectedPlace = place
        isSearchActive = false
        searchText = ""
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
}
