import Foundation
import MapKit

struct PlaceResult: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let address: String
    let coordinate: CLLocationCoordinate2D
    let category: String
    let mapItem: MKMapItem

    var formattedDistance: String? = nil

    static func == (lhs: PlaceResult, rhs: PlaceResult) -> Bool {
        lhs.id == rhs.id
    }

    static func from(_ item: MKMapItem, userLocation: CLLocationCoordinate2D?) -> PlaceResult {
        let category = item.pointOfInterestCategory.flatMap { Self.categoryName($0) } ?? "Restaurant"
        var result = PlaceResult(
            name: item.name ?? "Unknown",
            address: item.placemark.title ?? "",
            coordinate: item.placemark.coordinate,
            category: category,
            mapItem: item
        )
        if let userLoc = userLocation {
            let from = CLLocation(latitude: userLoc.latitude, longitude: userLoc.longitude)
            let to = CLLocation(latitude: item.placemark.coordinate.latitude, longitude: item.placemark.coordinate.longitude)
            let meters = from.distance(from: to)
            if meters < 1000 {
                result.formattedDistance = "\(Int(meters))m"
            } else {
                result.formattedDistance = String(format: "%.1fkm", meters / 1000)
            }
        }
        return result
    }

    private static func categoryName(_ category: MKPointOfInterestCategory) -> String? {
        switch category {
        case .restaurant: return "Restaurant"
        case .cafe: return "Cafe"
        case .bakery: return "Bakery"
        case .foodMarket: return "Food Market"
        case .nightlife: return "Bar"
        default: return nil
        }
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
            results = response.mapItems.prefix(3).map {
                PlaceResult.from($0, userLocation: coordinate)
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
