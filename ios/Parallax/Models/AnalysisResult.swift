import Foundation

enum Confidence: String, Codable {
    case high, medium, low
}

enum IntentSource: String, Codable {
    case deterministic, llm
}

struct Restaurant: Codable {
    let name: String
    let address: String
    let placeId: String
    let googleRating: Double
    let totalReviews: Int
    let priceLevel: Int?
}

struct ReviewDimensionScore: Codable {
    let dimension: String
    let sentiment: Double
}

struct RelevantReview: Codable, Identifiable {
    var id: String { "\(author)-\(excerpt.prefix(20))" }
    let author: String
    let rating: Int
    let excerpt: String
    let whyRelevant: String
    let dimensionScores: [ReviewDimensionScore]
}

struct DimensionScore: Codable, Identifiable {
    var id: String { dimension }
    let dimension: String
    let averageSentiment: Double
    let googleSentiment: Double
    let weight: Double
    let reviewCount: Int
}

struct SourceBreakdown: Codable {
    let source: String
    let count: Int
}

struct DimensionClaim: Codable {
    let author: String
    let claim: String
    let sentiment: Double
}

struct ParsedDimension: Codable, Identifiable {
    var id: String { dimension }
    let dimension: String
    let weight: Double
}

struct AnalysisResult: Codable {
    let restaurant: Restaurant
    let parallaxScore: Double
    let googleScore: Double
    let relevantReviews: [RelevantReview]
    let explanation: String
    let confidence: Confidence
    let sampleSize: Int
    let dimensionBreakdown: [DimensionScore]
    let sourceBreakdown: [SourceBreakdown]?
    let dimensionClaims: [String: [DimensionClaim]]?
    let intentSource: IntentSource?
    let parsedDimensions: [ParsedDimension]?
}
