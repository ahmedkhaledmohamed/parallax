import SwiftUI

struct ScoreHeaderView: View {
    let result: AnalysisResult

    private var delta: Double { result.parallaxScore - result.googleScore }

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text(result.restaurant.name)
                    .font(.title3.bold())
                    .foregroundColor(.parallaxText)
                Text(result.restaurant.address)
                    .font(.caption)
                    .foregroundColor(.parallaxMuted)
            }

            HStack(spacing: 0) {
                VStack(spacing: 4) {
                    Text("GOOGLE")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxMuted)
                    Text(result.googleScore.scoreFormatted)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.parallaxSubtext)
                    Text("\(result.restaurant.totalReviews) reviews")
                        .font(.system(size: 10))
                        .foregroundColor(.parallaxDimmed)
                }
                .frame(maxWidth: .infinity)

                VStack {
                    Text(delta.deltaFormatted)
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.deltaColor(delta))
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("PARALLAX")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxAmber)
                    Text(result.parallaxScore.scoreFormatted)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(Color.scoreColor(result.parallaxScore))
                    sourceText
                }
                .frame(maxWidth: .infinity)
            }

            HStack {
                ConfidenceBadgeView(result: result)
                Spacer()
                shareButton
                directionsButton
            }
        }
        .padding(20)
        .background(Color.parallaxSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.parallaxBorder, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var sourceText: some View {
        if let sources = result.sourceBreakdown, sources.count > 1 {
            Text(sources.map { "\($0.count) \($0.source)" }.joined(separator: " + "))
                .font(.system(size: 10))
                .foregroundColor(.parallaxDimmed)
        } else {
            Text("\(result.sampleSize) analyzed")
                .font(.system(size: 10))
                .foregroundColor(.parallaxDimmed)
        }
    }

    private var shareButton: some View {
        ShareLink(
            item: URL(string: "https://parallax-ten-sigma.vercel.app/app?q=\(result.restaurant.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&i=")!,
            subject: Text("Parallax"),
            message: Text("\(result.restaurant.name): Parallax \(result.parallaxScore.scoreFormatted) vs Google \(result.googleScore.scoreFormatted)")
        ) {
            Label("Share", systemImage: "square.and.arrow.up")
                .font(.caption2.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.parallaxBorder, lineWidth: 1)
                )
        }
    }

    private var directionsButton: some View {
        Link(destination: URL(string: "https://www.google.com/maps/search/?api=1&query=\(result.restaurant.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&query_place_id=\(result.restaurant.placeId)")!) {
            Label("Directions", systemImage: "map")
                .font(.caption2.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.parallaxBorder, lineWidth: 1)
                )
        }
    }
}
