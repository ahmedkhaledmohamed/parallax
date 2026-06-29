import Foundation

enum DemoData {
    static let query = "PAI Northern Thai Kitchen"
    static let intent = "authentic Thai, spicy, not dumbed down"

    static func isDemo(query: String) -> Bool {
        query.lowercased().contains("pai northern thai")
    }

    static let result = AnalysisResult(
        restaurant: Restaurant(
            name: "PAI Northern Thai Kitchen",
            address: "18 Duncan St, Toronto, ON M5H 3G8, Canada",
            placeId: "ChIJE9on3F3L1IkRyitHxPYqn6k",
            googleRating: 4.6,
            totalReviews: 14864,
            priceLevel: 2
        ),
        parallaxScore: 4.7,
        googleScore: 4.6,
        relevantReviews: [
            RelevantReview(
                author: "Angie R",
                rating: 5,
                excerpt: "The khao soi was rich and creamy with just the right amount of spice. Authentic northern Thai comfort food at its best.",
                whyRelevant: "Directly addresses authenticity and spice level — the two highest-weighted dimensions",
                dimensionScores: [
                    ReviewDimensionScore(dimension: "authenticity", sentiment: 0.9),
                    ReviewDimensionScore(dimension: "food_quality", sentiment: 0.85),
                ]
            ),
            RelevantReview(
                author: "David Chen",
                rating: 3,
                excerpt: "The spice level seems toned down compared to actual Thai street food. The pad thai was sweet, not the tangy version you'd get in Bangkok.",
                whyRelevant: "Critiques authenticity — signals that some dishes may be adapted for western palates",
                dimensionScores: [
                    ReviewDimensionScore(dimension: "authenticity", sentiment: -0.4),
                    ReviewDimensionScore(dimension: "food_quality", sentiment: 0.3),
                ]
            ),
            RelevantReview(
                author: "Sarah M",
                rating: 5,
                excerpt: "Beautiful restaurant with amazing food presentation. The cocktails were incredible and the atmosphere was perfect for our anniversary dinner.",
                whyRelevant: "Strong on ambiance but doesn't address authenticity — shows what Google's score is based on vs what you care about",
                dimensionScores: [
                    ReviewDimensionScore(dimension: "ambiance", sentiment: 0.9),
                    ReviewDimensionScore(dimension: "presentation", sentiment: 0.85),
                ]
            ),
        ],
        explanation: "For someone looking for authentic, unapologetically spicy Thai food, PAI scores slightly higher than Google's 4.6 because multiple reviewers specifically praise the northern Thai dishes as genuinely traditional. However, one reviewer notes the spice level is toned down compared to Bangkok street food. Google's aggregate is boosted by reviewers who love the Instagram-worthy decor and cocktails — dimensions you didn't prioritize.",
        confidence: .high,
        sampleSize: 5,
        dimensionBreakdown: [
            DimensionScore(dimension: "authenticity", averageSentiment: 0.55, googleSentiment: 0.4, weight: 0.45, reviewCount: 3),
            DimensionScore(dimension: "food_quality", averageSentiment: 0.7, googleSentiment: 0.65, weight: 0.35, reviewCount: 5),
            DimensionScore(dimension: "ambiance", averageSentiment: 0.8, googleSentiment: 0.8, weight: 0.12, reviewCount: 2),
            DimensionScore(dimension: "service", averageSentiment: 0.75, googleSentiment: 0.75, weight: 0.08, reviewCount: 3),
        ],
        sourceBreakdown: [SourceBreakdown(source: "google", count: 5)],
        dimensionClaims: nil,
        intentSource: .deterministic,
        parsedDimensions: [
            ParsedDimension(dimension: "authenticity", weight: 0.45),
            ParsedDimension(dimension: "food_quality", weight: 0.35),
            ParsedDimension(dimension: "ambiance", weight: 0.12),
            ParsedDimension(dimension: "service", weight: 0.08),
        ]
    )
}
