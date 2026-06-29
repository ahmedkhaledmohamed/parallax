import SwiftUI
import SwiftData
import MapKit

private struct IntentOption: Identifiable {
    let id = UUID()
    let emoji: String
    let title: String
    let full: String
}

private let intentOptions = [
    IntentOption(emoji: "🕯️", title: "Date night", full: "Quiet date night, great wine, romantic atmosphere"),
    IntentOption(emoji: "👨‍👩‍👧", title: "Family", full: "Quick family lunch, kid-friendly, large portions"),
    IntentOption(emoji: "💼", title: "Business", full: "Business dinner, upscale but not pretentious"),
    IntentOption(emoji: "💰", title: "Cheap eats", full: "Cheap eats, big flavors, don't care about decor"),
    IntentOption(emoji: "🥑", title: "Brunch", full: "Brunch with friends, good vibes, strong coffee"),
    IntentOption(emoji: "💪", title: "Post-workout", full: "Post-workout, high protein, generous portions, quick"),
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
    @State private var customIntent = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Always show restaurant header
                placeHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 16)

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
                withAnimation { phase = .info }
            default:
                break
            }
        }
    }

    // MARK: - Restaurant Header

    private var placeHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(place.name)
                .font(.title2.bold())
                .foregroundColor(.parallaxText)

            HStack(spacing: 6) {
                Text(place.category)
                    .font(.subheadline)
                    .foregroundColor(.parallaxSubtext)
                if let distance = place.formattedDistance {
                    Text("·")
                        .foregroundColor(.parallaxDimmed)
                    Text(distance)
                        .font(.subheadline)
                        .foregroundColor(.parallaxSubtext)
                }
            }

            Text(place.address)
                .font(.caption)
                .foregroundColor(.parallaxMuted)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Phase: Info (initial state)

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

    // MARK: - Phase: Intent Picker

    private var intentPickerContent: some View {
        VStack(spacing: 14) {
            Divider().background(Color.parallaxBorder)

            Text("What's your angle?")
                .font(.subheadline.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)],
                spacing: 8
            ) {
                ForEach(intentOptions) { option in
                    Button {
                        analyze(intent: option.full)
                    } label: {
                        VStack(spacing: 4) {
                            Text(option.emoji)
                                .font(.system(size: 22))
                            Text(option.title)
                                .font(.caption2.weight(.medium))
                                .foregroundColor(.parallaxText)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.parallaxSurface)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
            }
            .padding(.horizontal, 20)

            HStack(spacing: 10) {
                Image(systemName: "text.bubble")
                    .foregroundColor(.parallaxMuted)
                    .font(.system(size: 14))
                TextField("Or type your own...", text: $customIntent)
                    .textFieldStyle(.plain)
                    .font(.subheadline)
                    .submitLabel(.go)
                    .onSubmit {
                        if !customIntent.isEmpty {
                            analyze(intent: customIntent)
                        }
                    }
            }
            .padding(14)
            .background(Color.parallaxSurface)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.parallaxBorder, lineWidth: 1)
            )
            .padding(.horizontal, 20)
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
        withAnimation(.easeInOut(duration: 0.25)) { phase = .analyzing }
        apiClient.analyze(query: place.name + ", " + place.address, intent: intent)
    }

    private func saveToHistory(_ result: AnalysisResult) {
        let item = SearchHistoryItem(
            restaurant: result.restaurant.name,
            intent: "",
            parallaxScore: result.parallaxScore,
            googleScore: result.googleScore,
            placeId: result.restaurant.placeId
        )
        modelContext.insert(item)
    }
}
