import SwiftUI

struct ConfidenceBadgeView: View {
    let result: AnalysisResult
    @State private var expanded = false

    private var uncovered: [String] {
        result.dimensionBreakdown
            .filter { $0.weight > 0.1 && $0.reviewCount == 0 }
            .map { $0.dimension.dimensionDisplayName }
    }

    private var explanation: String {
        var text: String
        if result.sampleSize < 3 {
            text = "Only \(result.sampleSize) review\(result.sampleSize == 1 ? "" : "s") available. Take this score as directional."
        } else if result.confidence == .low {
            text = "Few of the \(result.sampleSize) reviews mention your priorities. This score may shift with more data."
        } else if result.confidence == .medium {
            text = "Decent coverage from \(result.sampleSize) reviews, but some priorities had limited mentions."
        } else {
            text = "Strong coverage — most of your priorities were directly addressed across \(result.sampleSize) reviews."
        }
        if !uncovered.isEmpty {
            text += " No reviews mentioned: \(uncovered.joined(separator: ", "))."
        }
        return text
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
            } label: {
                HStack(spacing: 4) {
                    Text("\(result.confidence.rawValue) confidence")
                        .font(.system(size: 11, weight: .medium))
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 8, weight: .medium))
                        .rotationEffect(.degrees(expanded ? 180 : 0))
                }
                .foregroundColor(Color.confidenceColor(result.confidence))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.confidenceColor(result.confidence).opacity(0.15))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.confidenceColor(result.confidence).opacity(0.3), lineWidth: 1)
                )
            }

            if expanded {
                Text(explanation)
                    .font(.system(size: 11))
                    .foregroundColor(.parallaxMuted)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}
