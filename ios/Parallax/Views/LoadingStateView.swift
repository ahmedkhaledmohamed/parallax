import SwiftUI

struct LoadingStateView: View {
    enum Stage {
        case searching, found, decomposing
    }

    let stage: Stage
    let restaurant: RestaurantEvent?

    var body: some View {
        VStack(spacing: 16) {
            if let restaurant, stage != .searching {
                VStack(spacing: 4) {
                    Text(restaurant.name)
                        .font(.headline)
                        .foregroundColor(.parallaxText)
                    Text(restaurant.address)
                        .font(.caption)
                        .foregroundColor(.parallaxMuted)
                    Text("Google: \(restaurant.rating.scoreFormatted)/5 from \(restaurant.totalReviews) reviews")
                        .font(.caption)
                        .foregroundColor(.parallaxMuted)
                }
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(Color.parallaxSurface)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.parallaxBorder, lineWidth: 1)
                )
            }

            HStack(spacing: 10) {
                ProgressView()
                    .tint(.parallaxAmber)
                Text(stageText)
                    .font(.caption)
                    .foregroundColor(.parallaxMuted)
            }
        }
    }

    private var stageText: String {
        switch stage {
        case .searching: return "Finding restaurant..."
        case .found: return "Analyzing reviews..."
        case .decomposing: return "Computing your personalized score..."
        }
    }
}
