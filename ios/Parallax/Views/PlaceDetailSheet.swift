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

struct PlaceDetailSheet: View {
    let place: PlaceResult
    let apiClient: APIClient
    var preselectedIntent: String = ""
    @Environment(\.modelContext) private var modelContext
    @State private var intent = ""
    @State private var showIntentPicker = false
    @State private var customIntent = ""

    private var isAnalyzing: Bool {
        switch apiClient.state {
        case .searching, .foundRestaurant, .decomposing: return true
        default: return false
        }
    }

    private var activeIntent: String {
        intent.isEmpty ? preselectedIntent : intent
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                placeHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 16)

                Divider().background(Color.parallaxBorder)

                if case .completed(let result) = apiClient.state {
                    resultContent(result)
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                } else if isAnalyzing {
                    loadingContent
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                } else {
                    intentAndAction
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                }
            }
            .padding(.bottom, 32)
        }
        .background(Color.parallaxBackground)
        .onAppear {
            if !preselectedIntent.isEmpty {
                intent = preselectedIntent
            }
        }
    }

    // MARK: - Place Header (rich, like Apple Maps)

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
                    Text("•")
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

    // MARK: - Intent + Action

    private var intentAndAction: some View {
        VStack(spacing: 16) {
            if showIntentPicker {
                intentPickerContent
            } else {
                activeIntentBar
            }

            Button(action: analyze) {
                Text("Get Parallax Score")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            }
            .background(activeIntent.isEmpty ? Color.parallaxAmber.opacity(0.3) : Color.parallaxAmber)
            .foregroundColor(.white)
            .cornerRadius(14)
            .disabled(activeIntent.isEmpty || isAnalyzing)

            if case .error(let message, let suggestion) = apiClient.state {
                ErrorBannerView(message: message, suggestion: suggestion, onRetry: analyze)
            }
        }
    }

    private var activeIntentBar: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { showIntentPicker = true }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("YOUR ANGLE")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxMuted)
                    Text(activeIntent.isEmpty ? "Choose what matters..." : activeIntent)
                        .font(.subheadline)
                        .foregroundColor(activeIntent.isEmpty ? .parallaxMuted : .parallaxText)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption)
                    .foregroundColor(.parallaxAmber)
            }
            .padding(14)
            .background(Color.parallaxSurface)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.parallaxBorder, lineWidth: 1)
            )
        }
    }

    private var intentPickerContent: some View {
        VStack(spacing: 10) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(intentOptions) { option in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            intent = option.full
                            showIntentPicker = false
                        }
                    } label: {
                        VStack(spacing: 4) {
                            Text(option.emoji)
                                .font(.system(size: 20))
                            Text(option.title)
                                .font(.caption2.weight(.medium))
                                .foregroundColor(intent == option.full ? .parallaxAmber : .parallaxText)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(intent == option.full ? Color.parallaxAmber.opacity(0.1) : Color.parallaxSurface)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(intent == option.full ? Color.parallaxAmber.opacity(0.4) : Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
            }

            HStack(spacing: 8) {
                Image(systemName: "text.bubble")
                    .foregroundColor(.parallaxMuted)
                    .font(.system(size: 13))
                TextField("Or type your own...", text: $customIntent)
                    .textFieldStyle(.plain)
                    .font(.subheadline)
                    .submitLabel(.done)
                    .onSubmit {
                        if !customIntent.isEmpty {
                            intent = customIntent
                            showIntentPicker = false
                        }
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

    // MARK: - Loading

    private var loadingContent: some View {
        VStack(spacing: 12) {
            switch apiClient.state {
            case .searching:
                LoadingStateView(stage: .searching, restaurant: nil)
            case .foundRestaurant(let r):
                LoadingStateView(stage: .found, restaurant: r)
            case .decomposing(let r):
                LoadingStateView(stage: .decomposing, restaurant: r)
            default:
                EmptyView()
            }
        }
    }

    // MARK: - Results

    private func resultContent(_ result: AnalysisResult) -> some View {
        VStack(spacing: 14) {
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
        .onAppear { saveToHistory(result) }
    }

    // MARK: - Actions

    private func analyze() {
        guard !activeIntent.isEmpty else { return }
        apiClient.analyze(query: place.name + ", " + place.address, intent: activeIntent)
    }

    private func saveToHistory(_ result: AnalysisResult) {
        let item = SearchHistoryItem(
            restaurant: result.restaurant.name,
            intent: activeIntent,
            parallaxScore: result.parallaxScore,
            googleScore: result.googleScore,
            placeId: result.restaurant.placeId
        )
        modelContext.insert(item)
    }
}
