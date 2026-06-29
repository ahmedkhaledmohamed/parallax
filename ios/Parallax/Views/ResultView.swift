import SwiftUI
import SwiftData

struct ResultView: View {
    let result: AnalysisResult
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        VStack(spacing: 20) {
            ScoreHeaderView(result: result)
            RadarChartView(dimensions: result.dimensionBreakdown)
            DimensionDeltaView(dimensions: result.dimensionBreakdown)
            ExplanationView(result: result)

            VStack(alignment: .leading, spacing: 12) {
                Text("REVIEWS THAT MATTER TO YOU")
                    .font(.caption)
                    .fontWeight(.medium)
                    .tracking(1)
                    .foregroundColor(.parallaxAmber)

                ForEach(result.relevantReviews) { review in
                    ReviewCardView(review: review)
                }
            }
        }
        .onAppear { saveToHistory() }
    }

    private func saveToHistory() {
        let item = SearchHistoryItem(
            restaurant: result.restaurant.name,
            intent: "",
            parallaxScore: result.parallaxScore,
            googleScore: result.googleScore,
            placeId: result.restaurant.placeId
        )
        modelContext.insert(item)
    }
}
