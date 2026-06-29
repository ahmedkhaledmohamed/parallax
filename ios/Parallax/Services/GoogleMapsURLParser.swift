import Foundation

struct ParsedMapsURL {
    let placeId: String?
    let placeName: String?

    var query: String? {
        placeName ?? placeId
    }
}

enum GoogleMapsURLParser {
    private static let detectionPattern = try! NSRegularExpression(
        pattern: #"(?:maps\.google\.|google\.\w+/maps|goo\.gl/maps|maps\.app\.goo\.gl)"#
    )

    private static let extractionPatterns: [(NSRegularExpression, Bool)] = [
        (try! NSRegularExpression(pattern: #"place_id[=:]([A-Za-z0-9_-]+)"#), true),
        (try! NSRegularExpression(pattern: #"maps/place/([^/@]+)"#), false),
        (try! NSRegularExpression(pattern: #"maps\?.*q=([^&]+)"#), false),
    ]

    static func isGoogleMapsURL(_ input: String) -> Bool {
        let range = NSRange(input.startIndex..., in: input)
        return detectionPattern.firstMatch(in: input, range: range) != nil
    }

    static func extract(from url: String) -> ParsedMapsURL? {
        let nsURL = url as NSString

        for (pattern, isPlaceId) in extractionPatterns {
            let range = NSRange(location: 0, length: nsURL.length)
            guard let match = pattern.firstMatch(in: url, range: range),
                  match.numberOfRanges > 1 else { continue }

            let captureRange = match.range(at: 1)
            guard captureRange.location != NSNotFound else { continue }

            let raw = nsURL.substring(with: captureRange)
                .replacingOccurrences(of: "+", with: " ")
            let decoded = raw.removingPercentEncoding ?? raw

            if isPlaceId {
                return ParsedMapsURL(placeId: decoded, placeName: nil)
            } else {
                return ParsedMapsURL(placeId: nil, placeName: decoded)
            }
        }

        return nil
    }
}
