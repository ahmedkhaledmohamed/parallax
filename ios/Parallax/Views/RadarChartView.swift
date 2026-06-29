import SwiftUI

struct RadarChartView: View {
    let dimensions: [DimensionScore]

    var body: some View {
        if dimensions.count < 3 { EmptyView() } else {
            VStack(alignment: .leading, spacing: 12) {
                Text("DIMENSION PROFILE")
                    .font(.caption)
                    .fontWeight(.medium)
                    .tracking(1)
                    .foregroundColor(.parallaxAmber)

                Canvas { context, size in
                    let center = CGPoint(x: size.width / 2, y: size.height / 2)
                    let radius = min(size.width, size.height) / 2 - 40
                    let count = dimensions.count
                    let angleStep = (2 * .pi) / Double(count)

                    func vertex(index: Int, value: Double) -> CGPoint {
                        let angle = angleStep * Double(index) - .pi / 2
                        let r = radius * value
                        return CGPoint(
                            x: center.x + r * cos(angle),
                            y: center.y + r * sin(angle)
                        )
                    }

                    for level in [0.25, 0.5, 0.75, 1.0] {
                        var path = Path()
                        for i in 0..<count {
                            let p = vertex(index: i, value: level)
                            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
                        }
                        path.closeSubpath()
                        context.stroke(path, with: .color(.parallaxBorder.opacity(0.5)), lineWidth: 0.5)
                    }

                    for i in 0..<count {
                        let p = vertex(index: i, value: 1.0)
                        var line = Path()
                        line.move(to: center)
                        line.addLine(to: p)
                        context.stroke(line, with: .color(.parallaxBorder.opacity(0.3)), lineWidth: 0.5)
                    }

                    var googlePath = Path()
                    var parallaxPath = Path()
                    for i in 0..<count {
                        let gVal = (dimensions[i].googleSentiment + 1) / 2
                        let pVal = (dimensions[i].averageSentiment + 1) / 2
                        let gp = vertex(index: i, value: gVal)
                        let pp = vertex(index: i, value: pVal)
                        if i == 0 {
                            googlePath.move(to: gp)
                            parallaxPath.move(to: pp)
                        } else {
                            googlePath.addLine(to: gp)
                            parallaxPath.addLine(to: pp)
                        }
                    }
                    googlePath.closeSubpath()
                    parallaxPath.closeSubpath()

                    context.fill(googlePath, with: .color(.parallaxSubtext.opacity(0.1)))
                    context.stroke(googlePath, with: .color(.parallaxSubtext.opacity(0.4)), lineWidth: 1.5)
                    context.fill(parallaxPath, with: .color(.parallaxAmber.opacity(0.15)))
                    context.stroke(parallaxPath, with: .color(.parallaxAmber), lineWidth: 2)

                    for i in 0..<count {
                        let angle = angleStep * Double(i) - .pi / 2
                        let labelR = radius + 30
                        let p = CGPoint(
                            x: center.x + labelR * cos(angle),
                            y: center.y + labelR * sin(angle)
                        )
                        let label = Text(dimensions[i].dimension.dimensionDisplayName)
                            .font(.system(size: 10))
                            .foregroundColor(.parallaxMuted)
                        context.draw(label, at: p)
                    }
                }
                .frame(height: 240)

                HStack(spacing: 16) {
                    HStack(spacing: 6) {
                        Circle().fill(Color.parallaxSubtext.opacity(0.4)).frame(width: 8, height: 8)
                        Text("Google").font(.caption2).foregroundColor(.parallaxMuted)
                    }
                    HStack(spacing: 6) {
                        Circle().fill(Color.parallaxAmber).frame(width: 8, height: 8)
                        Text("Parallax").font(.caption2).foregroundColor(.parallaxMuted)
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
