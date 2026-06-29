import SwiftUI
import SwiftData
import MapKit

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var mapSearch = MapSearchService()
    @State private var locationService = LocationService()

    @State private var searchText = ""
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

    var body: some View {
        NavigationStack {
            Map(position: $cameraPosition) {
                ForEach(mapSearch.results) { result in
                    Marker(result.name, coordinate: result.coordinate)
                        .tint(Color.parallaxAmber)
                }
                UserAnnotation()
            }
            .mapStyle(.standard(elevation: .flat, pointsOfInterest: .including([.restaurant, .cafe, .bakery, .foodMarket])))
            .mapControls {
                MapUserLocationButton()
                MapCompass()
            }
            .navigationTitle("Parallax")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Search restaurants")
            .searchSuggestions {
                ForEach(mapSearch.results.prefix(3)) { place in
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
                                        Text("·")
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
                await locationService.requestCityIfNeeded()
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
