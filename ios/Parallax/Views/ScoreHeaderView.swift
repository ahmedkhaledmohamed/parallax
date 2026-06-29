import SwiftUI

struct ScoreHeaderView: View {
    let result: AnalysisResult
    var onNewSearch: (() -> Void)?

    private var delta: Double { result.parallaxScore - result.googleScore }

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 4) {
                Text(result.restaurant.name)
                    .font(.title3.bold())
                    .foregroundColor(.parallaxText)
                    .multilineTextAlignment(.center)
                Text(result.restaurant.address)
                    .font(.caption)
                    .foregroundColor(.parallaxMuted)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 0) {
                VStack(spacing: 4) {
                    Text("GOOGLE")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxMuted)
                    Text(result.googleScore.scoreFormatted)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.parallaxSubtext)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text("\(result.restaurant.totalReviews) reviews")
                        .font(.system(size: 10))
                        .foregroundColor(.parallaxDimmed)
                }
                .frame(maxWidth: .infinity)

                VStack {
                    Text(delta.deltaFormatted)
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.deltaColor(delta))
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("PARALLAX")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxAmber)
                    Text(result.parallaxScore.scoreFormatted)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(Color.scoreColor(result.parallaxScore))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    sourceText
                }
                .frame(maxWidth: .infinity)
            }

            ConfidenceBadgeView(result: result)

            HStack(spacing: 8) {
                if let onNewSearch {
                    Button(action: onNewSearch) {
                        Label("New Search", systemImage: "magnifyingglass")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.parallaxAmber)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.parallaxAmber.opacity(0.4), lineWidth: 1)
                            )
                    }
                }

                shareButton
                directionsButton
            }
        }
        .padding(16)
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
                .font(.caption.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .frame(maxWidth: .infinity, minHeight: 44)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.parallaxBorder, lineWidth: 1)
                )
        }
    }

    private var directionsButton: some View {
        Link(destination: URL(string: "https://www.google.com/maps/search/?api=1&query=\(result.restaurant.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&query_place_id=\(result.restaurant.placeId)")!) {
            Label("Directions", systemImage: "map")
                .font(.caption.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .frame(maxWidth: .infinity, minHeight: 44)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.parallaxBorder, lineWidth: 1)
                )
        }
    }
}
