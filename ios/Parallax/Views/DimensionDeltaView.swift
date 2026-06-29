import SwiftUI

struct DimensionDeltaView: View {
    let dimensions: [DimensionScore]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("DIMENSION SHIFTS")
                .font(.caption)
                .fontWeight(.medium)
                .tracking(1)
                .foregroundColor(.parallaxAmber)

            ForEach(dimensions.sorted(by: { $0.weight > $1.weight })) { dim in
                let delta = dim.averageSentiment - dim.googleSentiment

                VStack(spacing: 4) {
                    HStack {
                        Text(dim.dimension.dimensionDisplayName)
                            .font(.caption)
                            .foregroundColor(.parallaxText)
                        Spacer()
                        Text(delta.deltaFormatted)
                            .font(.caption.monospaced())
                            .foregroundColor(Color.deltaColor(delta))
                    }

                    GeometryReader { geo in
                        let mid = geo.size.width / 2
                        let barWidth = min(abs(delta) * geo.size.width / 2, geo.size.width / 2)
                        let barColor = delta >= 0 ? Color.parallaxEmerald : Color.parallaxRed

                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.parallaxBorder.opacity(0.3))
                                .frame(height: 6)
                                .cornerRadius(3)

                            Rectangle()
                                .fill(barColor.opacity(max(0.4, dim.weight)))
                                .frame(width: barWidth, height: 6)
                                .cornerRadius(3)
                                .offset(x: delta >= 0 ? mid : mid - barWidth)
                        }
                    }
                    .frame(height: 6)

                    Text("\(dim.reviewCount) mention\(dim.reviewCount == 1 ? "" : "s")")
                        .font(.system(size: 9))
                        .foregroundColor(.parallaxDimmed)
                        .frame(maxWidth: .infinity, alignment: .trailing)
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
