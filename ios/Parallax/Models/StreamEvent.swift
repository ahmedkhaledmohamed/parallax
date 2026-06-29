import Foundation

struct RestaurantEvent: Codable {
    let name: String
    let address: String
    let rating: Double
    let totalReviews: Int
    let sourceBreakdown: [SourceBreakdown]?
}

struct DecomposedEvent: Codable {
    let reviewCount: Int
    let dimensionCount: Int
}

struct APIError: Codable {
    let error: String
    let suggestion: String?
}

enum StreamEventType {
    case restaurant(RestaurantEvent)
    case decomposed(DecomposedEvent)
    case result(AnalysisResult)
    case error(APIError)
}

struct StreamEventParser {
    private struct Envelope: Decodable {
        let type: String
    }

    private struct TypedEvent<T: Decodable>: Decodable {
        let data: T
    }

    static func parse(line: String) -> StreamEventType? {
        guard let data = line.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()

        guard let envelope = try? decoder.decode(Envelope.self, from: data) else {
            print("[Parallax] Failed to decode envelope from: \(line.prefix(100))")
            return nil
        }

        do {
            switch envelope.type {
            case "restaurant":
                let event = try decoder.decode(TypedEvent<RestaurantEvent>.self, from: data)
                return .restaurant(event.data)
            case "decomposed":
                let event = try decoder.decode(TypedEvent<DecomposedEvent>.self, from: data)
                return .decomposed(event.data)
            case "result":
                let event = try decoder.decode(TypedEvent<AnalysisResult>.self, from: data)
                return .result(event.data)
            case "error":
                let event = try decoder.decode(TypedEvent<APIError>.self, from: data)
                return .error(event.data)
            default:
                return nil
            }
        } catch {
            print("[Parallax] Failed to decode \(envelope.type) event: \(error)")
            return nil
        }
    }
}
