import Foundation
import CoreLocation

@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    private(set) var city: String?
    private(set) var lastLocation: CLLocationCoordinate2D?
    private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<String?, Never>?

    override init() {
        super.init()
        manager.delegate = self
    }

    func requestCityIfNeeded() async -> String? {
        if let city { return city }

        let status = manager.authorizationStatus
        if status == .denied || status == .restricted { return nil }

        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
            try? await Task.sleep(for: .seconds(1))
            if manager.authorizationStatus == .denied { return nil }
        }

        manager.requestLocation()

        return await withCheckedContinuation { cont in
            self.continuation = cont
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else {
            continuation?.resume(returning: nil)
            continuation = nil
            return
        }

        lastLocation = location.coordinate
        CLGeocoder().reverseGeocodeLocation(location) { [weak self] placemarks, _ in
            let cityName = placemarks?.first?.locality
            self?.city = cityName
            self?.continuation?.resume(returning: cityName)
            self?.continuation = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        continuation?.resume(returning: nil)
        continuation = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}
