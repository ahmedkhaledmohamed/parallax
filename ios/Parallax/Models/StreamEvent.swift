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
            return nil
        }

        switch envelope.type {
        case "restaurant":
            guard let event = try? decoder.decode(TypedEvent<RestaurantEvent>.self, from: data) else { return nil }
            return .restaurant(event.data)
        case "decomposed":
            guard let event = try? decoder.decode(TypedEvent<DecomposedEvent>.self, from: data) else { return nil }
            return .decomposed(event.data)
        case "result":
            guard let event = try? decoder.decode(TypedEvent<AnalysisResult>.self, from: data) else { return nil }
            return .result(event.data)
        case "error":
            guard let event = try? decoder.decode(TypedEvent<APIError>.self, from: data) else { return nil }
            return .error(event.data)
        default:
            return nil
        }
    }
}
