import SwiftUI

struct ExplanationView: View {
    let result: AnalysisResult

    var body: some View {
        VStack(spacing: 16) {
            if let parsed = result.parsedDimensions, !parsed.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("WHAT WE UNDERSTOOD")
                            .font(.system(size: 10, weight: .medium))
                            .tracking(1)
                            .foregroundColor(.parallaxMuted)
                        if result.intentSource == .llm {
                            Text("AI-INTERPRETED")
                                .font(.system(size: 8, weight: .medium))
                                .tracking(1)
                                .foregroundColor(.parallaxDimmed)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.parallaxBorder, lineWidth: 1)
                                )
                        }
                    }

                    FlowLayout(spacing: 6) {
                        ForEach(parsed) { dim in
                            HStack(spacing: 4) {
                                Text(dim.dimension.dimensionDisplayName)
                                    .font(.caption2)
                                    .foregroundColor(.parallaxText)
                                Text(dim.weight.percentFormatted)
                                    .font(.caption2)
                                    .foregroundColor(.parallaxMuted)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.parallaxBorder.opacity(0.5))
                            .cornerRadius(12)
                        }
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

            VStack(alignment: .leading, spacing: 10) {
                Text("WHY THE DIFFERENCE?")
                    .font(.caption)
                    .fontWeight(.medium)
                    .tracking(1)
                    .foregroundColor(.parallaxAmber)

                Text(result.explanation)
                    .font(.subheadline)
                    .foregroundColor(.parallaxText.opacity(0.85))
                    .lineSpacing(4)
            }
            .padding(20)
            .background(Color.parallaxSurface)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.parallaxBorder, lineWidth: 1)
            )

            VStack(alignment: .leading, spacing: 12) {
                Text("YOUR DIMENSIONS")
                    .font(.caption)
                    .fontWeight(.medium)
                    .tracking(1)
                    .foregroundColor(.parallaxAmber)

                ForEach(result.dimensionBreakdown) { dim in
                    VStack(spacing: 4) {
                        HStack {
                            Text(dim.dimension.dimensionDisplayName)
                                .font(.caption)
                                .foregroundColor(.parallaxText)
                            Spacer()
                            Text("\(dim.reviewCount) mention\(dim.reviewCount == 1 ? "" : "s")")
                                .font(.system(size: 9))
                                .foregroundColor(.parallaxDimmed)
                        }

                        HStack(spacing: 8) {
                            GeometryReader { geo in
                                let pct = (dim.averageSentiment + 1) / 2
                                ZStack(alignment: .leading) {
                                    Rectangle()
                                        .fill(Color.parallaxBorder)
                                        .frame(height: 6)
                                        .cornerRadius(3)
                                    Rectangle()
                                        .fill(Color.sentimentColor(dim.averageSentiment))
                                        .frame(width: max(0, geo.size.width * pct), height: 6)
                                        .cornerRadius(3)
                                }
                            }
                            .frame(height: 6)

                            Text(dim.weight.percentFormatted)
                                .font(.system(size: 10))
                                .foregroundColor(.parallaxMuted)
                                .frame(width: 30, alignment: .trailing)
                        }
                    }
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
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(in: proposal.width ?? 0, subviews: subviews)
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(in: bounds.width, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(in width: CGFloat, subviews: Subviews) -> (positions: [CGPoint], height: CGFloat) {
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (positions, y + rowHeight)
    }
}
