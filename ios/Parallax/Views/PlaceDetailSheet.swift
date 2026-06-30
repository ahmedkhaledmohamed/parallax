import SwiftUI
import SwiftData
import MapKit

private struct IntentTag: Identifiable {
    let id = UUID()
    let emoji: String
    let label: String
    let keyword: String
}

private let intentTags = [
    IntentTag(emoji: "🕯️", label: "Quiet", keyword: "quiet"),
    IntentTag(emoji: "🍷", label: "Wine", keyword: "good wine"),
    IntentTag(emoji: "🥗", label: "Healthy", keyword: "healthy"),
    IntentTag(emoji: "👶", label: "Kids", keyword: "kid-friendly"),
    IntentTag(emoji: "💰", label: "Budget", keyword: "affordable"),
    IntentTag(emoji: "🔥", label: "Spicy", keyword: "spicy"),
    IntentTag(emoji: "🅿️", label: "Parking", keyword: "easy parking"),
    IntentTag(emoji: "⏱️", label: "Quick", keyword: "quick service"),
    IntentTag(emoji: "🎵", label: "Music", keyword: "live music"),
    IntentTag(emoji: "🍻", label: "Drinks", keyword: "good cocktails"),
    IntentTag(emoji: "🥩", label: "Steak", keyword: "great steak"),
    IntentTag(emoji: "🌱", label: "Vegan", keyword: "vegan options"),
    IntentTag(emoji: "📸", label: "Insta", keyword: "instagrammable"),
    IntentTag(emoji: "👔", label: "Formal", keyword: "upscale formal"),
    IntentTag(emoji: "☕", label: "Coffee", keyword: "strong coffee"),
    IntentTag(emoji: "🍰", label: "Dessert", keyword: "great desserts"),
    IntentTag(emoji: "🍝", label: "Authentic", keyword: "authentic"),
    IntentTag(emoji: "💪", label: "Protein", keyword: "high protein"),
    IntentTag(emoji: "🪑", label: "Outdoor", keyword: "outdoor seating"),
    IntentTag(emoji: "❤️", label: "Romantic", keyword: "romantic"),
]

enum SheetPhase {
    case info
    case intentPicker
    case analyzing
    case result(AnalysisResult)
}

struct PlaceDetailSheet: View {
    let place: PlaceResult
    let apiClient: APIClient
    @Environment(\.modelContext) private var modelContext
    @State private var phase: SheetPhase = .info
    @State private var intentText = ""
    @State private var selectedTags: Set<UUID> = []

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                placeHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 12)

                switch phase {
                case .info:
                    infoContent
                case .intentPicker:
                    intentPickerContent
                case .analyzing:
                    analyzingContent
                case .result(let result):
                    resultContent(result)
                }
            }
            .padding(.bottom, 32)
        }
        .background(Color.parallaxBackground)
        .onChange(of: apiClient.state) { _, newState in
            switch newState {
            case .completed(let result):
                withAnimation { phase = .result(result) }
                saveToHistory(result)
            case .error:
                withAnimation { phase = .intentPicker }
            default:
                break
            }
        }
    }

    // MARK: - Restaurant Header (richer)

    private var placeHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Name
            Text(place.name)
                .font(.title2.bold())
                .foregroundColor(.parallaxText)

            // Category · Distance · Rating (if available from analysis)
            HStack(spacing: 6) {
                Label(place.category, systemImage: "fork.knife")
                    .font(.subheadline)
                    .foregroundColor(.parallaxSubtext)
                if let distance = place.formattedDistance {
                    Text("·")
                        .foregroundColor(.parallaxDimmed)
                    Label(distance, systemImage: "location.fill")
                        .font(.subheadline)
                        .foregroundColor(.parallaxSubtext)
                }
                if case .result(let result) = phase {
                    Text("·")
                        .foregroundColor(.parallaxDimmed)
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.parallaxAmber)
                        Text(result.googleScore.scoreFormatted)
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                    .foregroundColor(.parallaxText)
                }
            }

            // Address
            HStack(spacing: 6) {
                Image(systemName: "mappin")
                    .font(.caption)
                    .foregroundColor(.parallaxMuted)
                Text(place.address)
                    .font(.caption)
                    .foregroundColor(.parallaxMuted)
                    .lineLimit(2)
            }

            // Action buttons
            HStack(spacing: 0) {
                if let phone = place.phoneNumber {
                    Link(destination: URL(string: "tel:\(phone)")!) {
                        actionButton(icon: "phone.fill", label: "Call")
                    }
                }

                if let url = place.websiteURL {
                    Link(destination: url) {
                        actionButton(icon: "safari", label: "Website")
                    }
                }

                Button {
                    place.mapItem.openInMaps()
                } label: {
                    actionButton(icon: "map.fill", label: "Directions")
                }

                Spacer()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func actionButton(icon: String, label: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
            Text(label)
                .font(.system(size: 10, weight: .medium))
        }
        .foregroundColor(.parallaxAmber)
        .frame(width: 70, height: 50)
        .background(Color.parallaxSurface)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.parallaxBorder, lineWidth: 1)
        )
        .padding(.trailing, 8)
    }

    // MARK: - Phase: Info

    private var infoContent: some View {
        VStack(spacing: 16) {
            Divider().background(Color.parallaxBorder)

            Button {
                withAnimation(.easeInOut(duration: 0.25)) { phase = .intentPicker }
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.body)
                    Text("Get Parallax Score")
                        .font(.body.weight(.semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .background(Color.parallaxAmber)
            .foregroundColor(.white)
            .cornerRadius(14)
            .padding(.horizontal, 20)

            if case .error(let message, let suggestion) = apiClient.state {
                ErrorBannerView(message: message, suggestion: suggestion, onRetry: {
                    withAnimation { phase = .intentPicker }
                })
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Phase: Intent Picker (composable)

    private var intentPickerContent: some View {
        VStack(spacing: 14) {
            Divider().background(Color.parallaxBorder)

            // Intent text field at top
            HStack(spacing: 8) {
                Image(systemName: "text.bubble")
                    .foregroundColor(.parallaxMuted)
                    .font(.system(size: 14))
                TextField("What matters to you?", text: $intentText, axis: .vertical)
                    .lineLimit(1...3)
                    .textFieldStyle(.plain)
                    .font(.subheadline)
                if !intentText.isEmpty {
                    Button {
                        intentText = ""
                        selectedTags.removeAll()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.parallaxMuted)
                    }
                }
            }
            .padding(14)
            .background(Color.parallaxSurface)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(intentText.isEmpty ? Color.parallaxBorder : Color.parallaxAmber.opacity(0.5), lineWidth: 1)
            )
            .padding(.horizontal, 20)

            // Tag grid
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 75), spacing: 6)],
                spacing: 6
            ) {
                ForEach(intentTags) { tag in
                    let isSelected = selectedTags.contains(tag.id)
                    Button {
                        toggleTag(tag)
                    } label: {
                        HStack(spacing: 3) {
                            Text(tag.emoji)
                                .font(.system(size: 12))
                            Text(tag.label)
                                .font(.caption2.weight(.medium))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(isSelected ? Color.parallaxAmber.opacity(0.2) : Color.parallaxSurface)
                        .foregroundColor(isSelected ? .parallaxAmber : .parallaxText)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(isSelected ? Color.parallaxAmber.opacity(0.5) : Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 20)

            // Analyze button
            Button {
                analyze(intent: intentText)
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.body)
                    Text("Analyze")
                        .font(.body.weight(.semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
            }
            .background(intentText.isEmpty ? Color.parallaxAmber.opacity(0.3) : Color.parallaxAmber)
            .foregroundColor(.white)
            .cornerRadius(14)
            .disabled(intentText.isEmpty)
            .padding(.horizontal, 20)

            if case .error(let message, let suggestion) = apiClient.state {
                ErrorBannerView(message: message, suggestion: suggestion, onRetry: {
                    analyze(intent: intentText)
                })
                .padding(.horizontal, 20)
            }
        }
    }

    // MARK: - Tag toggle

    private func toggleTag(_ tag: IntentTag) {
        if selectedTags.contains(tag.id) {
            selectedTags.remove(tag.id)
            let keywords = intentText.components(separatedBy: ", ").filter { $0 != tag.keyword }
            intentText = keywords.joined(separator: ", ")
        } else {
            selectedTags.insert(tag.id)
            if intentText.isEmpty {
                intentText = tag.keyword
            } else {
                intentText += ", " + tag.keyword
            }
        }
    }

    // MARK: - Phase: Analyzing

    private var analyzingContent: some View {
        VStack(spacing: 16) {
            Divider().background(Color.parallaxBorder)

            switch apiClient.state {
            case .searching:
                LoadingStateView(stage: .searching, restaurant: nil)
            case .foundRestaurant(let r):
                LoadingStateView(stage: .found, restaurant: r)
            case .decomposing(let r):
                LoadingStateView(stage: .decomposing, restaurant: r)
            default:
                ProgressView()
                    .tint(.parallaxAmber)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    // MARK: - Phase: Result

    private func resultContent(_ result: AnalysisResult) -> some View {
        VStack(spacing: 14) {
            Divider().background(Color.parallaxBorder)

            ScoreHeaderView(result: result)
            RadarChartView(dimensions: result.dimensionBreakdown)
            DimensionDeltaView(dimensions: result.dimensionBreakdown)
            ExplanationView(result: result)

            VStack(alignment: .leading, spacing: 12) {
                Text("REVIEWS THAT MATTER TO YOU")
                    .font(.caption)
                    .fontWeight(.medium)
                    .tracking(1)
                    .foregroundColor(.parallaxAmber)

                ForEach(result.relevantReviews) { review in
                    ReviewCardView(review: review)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    // MARK: - Actions

    private func analyze(intent: String) {
        guard !intent.isEmpty else { return }
        withAnimation(.easeInOut(duration: 0.25)) { phase = .analyzing }
        apiClient.analyze(query: place.name + ", " + place.address, intent: intent)
    }

    private func saveToHistory(_ result: AnalysisResult) {
        let item = SearchHistoryItem(
            restaurant: result.restaurant.name,
            intent: intentText,
            parallaxScore: result.parallaxScore,
            googleScore: result.googleScore,
            placeId: result.restaurant.placeId
        )
        modelContext.insert(item)
    }
}
