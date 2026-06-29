import SwiftUI

struct ReviewCardView: View {
    let review: RelevantReview

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(review.author)
                    .font(.caption.bold())
                    .foregroundColor(.parallaxText)
                Spacer()
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= review.rating ? "star.fill" : "star")
                            .font(.system(size: 10))
                            .foregroundColor(star <= review.rating ? .parallaxAmber : .parallaxBorder)
                    }
                }
            }

            HStack(spacing: 0) {
                Rectangle()
                    .fill(Color.parallaxAmber)
                    .frame(width: 2)
                Text(review.excerpt)
                    .font(.subheadline)
                    .foregroundColor(.parallaxText.opacity(0.8))
                    .lineSpacing(3)
                    .padding(.leading, 10)
            }

            Text(review.whyRelevant)
                .font(.system(size: 11))
                .italic()
                .foregroundColor(.parallaxMuted)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) {
                    ForEach(review.dimensionScores, id: \.dimension) { score in
                        Text("\(score.dimension.dimensionDisplayName) \(score.sentiment >= 0 ? "+" : "")\(String(format: "%.1f", score.sentiment))")
                            .font(.system(size: 9))
                            .foregroundColor(Color.sentimentColor(score.sentiment))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(Color.sentimentColor(score.sentiment).opacity(0.3), lineWidth: 1)
                            )
                    }
                }
            }
        }
        .padding(16)
        .background(Color.parallaxSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.parallaxBorder, lineWidth: 1)
        )
    }
}
