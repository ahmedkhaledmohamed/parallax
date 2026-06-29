import SwiftUI
import SwiftData

struct ResultSheetView: View {
    let apiClient: APIClient
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                switch apiClient.state {
                case .searching:
                    LoadingStateView(stage: .searching, restaurant: nil)
                        .padding(.top, 20)

                case .foundRestaurant(let restaurant):
                    LoadingStateView(stage: .found, restaurant: restaurant)
                        .padding(.top, 20)

                case .decomposing(let restaurant):
                    LoadingStateView(stage: .decomposing, restaurant: restaurant)
                        .padding(.top, 20)

                case .completed(let result):
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

                default:
                    EmptyView()
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        .background(Color.parallaxBackground)
        .onChange(of: apiClient.state) { _, newState in
            if case .completed(let result) = newState {
                saveToHistory(result)
            }
        }
    }

    private func saveToHistory(_ result: AnalysisResult) {
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
