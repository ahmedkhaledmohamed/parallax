import Foundation
import MapKit

struct PlaceResult: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let address: String
    let coordinate: CLLocationCoordinate2D
    let mapItem: MKMapItem

    static func == (lhs: PlaceResult, rhs: PlaceResult) -> Bool {
        lhs.id == rhs.id
    }
}

@Observable
final class MapSearchService {
    private(set) var results: [PlaceResult] = []
    private(set) var isSearching = false
    private var searchTask: Task<Void, Never>?

    func searchDebounced(query: String, near coordinate: CLLocationCoordinate2D) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await search(query: query, near: coordinate)
        }
    }

    func search(query: String, near coordinate: CLLocationCoordinate2D) async {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            results = []
            return
        }

        isSearching = true
        defer { isSearching = false }

        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = .pointOfInterest
        request.region = MKCoordinateRegion(
            center: coordinate,
            latitudinalMeters: 5000,
            longitudinalMeters: 5000
        )

        do {
            let search = MKLocalSearch(request: request)
            let response = try await search.start()
            guard !Task.isCancelled else { return }
            results = response.mapItems.prefix(8).map { item in
                PlaceResult(
                    name: item.name ?? "Unknown",
                    address: item.placemark.title ?? "",
                    coordinate: item.placemark.coordinate,
                    mapItem: item
                )
            }
        } catch {
            if !Task.isCancelled { results = [] }
        }
    }

    func clear() {
        searchTask?.cancel()
        results = []
    }
}
