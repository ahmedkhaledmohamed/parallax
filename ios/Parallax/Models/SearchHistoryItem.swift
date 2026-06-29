import Foundation
import SwiftData

@Model
final class SearchHistoryItem {
    var restaurant: String
    var intent: String
    var parallaxScore: Double
    var googleScore: Double
    var timestamp: Date
    var placeId: String?

    init(restaurant: String, intent: String, parallaxScore: Double, googleScore: Double, placeId: String? = nil) {
        self.restaurant = restaurant
        self.intent = intent
        self.parallaxScore = parallaxScore
        self.googleScore = googleScore
        self.timestamp = Date()
        self.placeId = placeId
    }
}
