import Foundation
import CoreLocation

@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    private(set) var city: String?
    private(set) var lastLocation: CLLocationCoordinate2D?
    private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined
    private(set) var isReady = false
    private let manager = CLLocationManager()
    private var locationContinuation: CheckedContinuation<CLLocationCoordinate2D?, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func requestLocation() async -> CLLocationCoordinate2D? {
        if let lastLocation { isReady = true; return lastLocation }

        let status = manager.authorizationStatus
        if status == .denied || status == .restricted { isReady = true; return nil }

        if status == .notDetermined {
            manager.requestWhenInUseAuthorization()
            try? await Task.sleep(for: .seconds(1))
            if manager.authorizationStatus == .denied { isReady = true; return nil }
        }

        manager.requestLocation()

        let coordinate = await withCheckedContinuation { cont in
            self.locationContinuation = cont
        }

        isReady = true
        return coordinate
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else {
            locationContinuation?.resume(returning: nil)
            locationContinuation = nil
            return
        }

        lastLocation = location.coordinate
        locationContinuation?.resume(returning: location.coordinate)
        locationContinuation = nil

        CLGeocoder().reverseGeocodeLocation(location) { [weak self] placemarks, _ in
            self?.city = placemarks?.first?.locality
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationContinuation?.resume(returning: nil)
        locationContinuation = nil
        isReady = true
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}
