import SwiftUI
import SwiftData

struct SearchHistoryView: View {
    @Query(sort: \SearchHistoryItem.timestamp, order: .reverse) private var items: [SearchHistoryItem]
    @Environment(\.modelContext) private var modelContext
    let onSelect: (String, String) -> Void

    var body: some View {
        if items.isEmpty { EmptyView() } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("RECENT")
                        .font(.caption)
                        .fontWeight(.medium)
                        .tracking(1)
                        .foregroundColor(.parallaxMuted)
                    Spacer()
                    Button("Clear") {
                        for item in items { modelContext.delete(item) }
                    }
                    .font(.caption2)
                    .foregroundColor(.parallaxDimmed)
                }

                ForEach(items.prefix(10)) { item in
                    Button {
                        onSelect(item.restaurant, item.intent)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.restaurant)
                                    .font(.caption.bold())
                                    .foregroundColor(.parallaxText)
                                if !item.intent.isEmpty {
                                    Text(item.intent)
                                        .font(.system(size: 10))
                                        .foregroundColor(.parallaxMuted)
                                        .lineLimit(1)
                                }
                            }
                            Spacer()
                            HStack(spacing: 6) {
                                Text(item.googleScore.scoreFormatted)
                                    .font(.caption.monospaced())
                                    .foregroundColor(.parallaxSubtext)
                                Text("→")
                                    .font(.system(size: 10))
                                    .foregroundColor(.parallaxDimmed)
                                Text(item.parallaxScore.scoreFormatted)
                                    .font(.caption.bold().monospaced())
                                    .foregroundColor(Color.scoreColor(item.parallaxScore))
                            }
                        }
                        .padding(12)
                        .background(Color.parallaxSurface)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
            }
        }
    }
}
