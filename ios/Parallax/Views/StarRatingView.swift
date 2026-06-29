import SwiftUI

struct StarRatingView: View {
    let rating: Double
    let maxRating: Int = 5

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<maxRating, id: \.self) { index in
                Image(systemName: starName(for: index))
                    .font(.system(size: 12))
                    .foregroundColor(.parallaxAmber)
            }
        }
    }

    private func starName(for index: Int) -> String {
        let threshold = Double(index) + 1
        if rating >= threshold { return "star.fill" }
        if rating >= threshold - 0.5 { return "star.leadinghalf.filled" }
        return "star"
    }
}
