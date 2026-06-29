import SwiftUI
import SwiftData
import MapKit

private struct IntentOption: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let full: String
}

private let intentOptions = [
    IntentOption(title: "Date night", subtitle: "Quiet, wine, romantic", full: "Quiet date night, great wine, romantic atmosphere"),
    IntentOption(title: "Family lunch", subtitle: "Kids, quick, portions", full: "Quick family lunch, kid-friendly, large portions"),
    IntentOption(title: "Business dinner", subtitle: "Upscale, cocktails", full: "Business dinner, upscale but not pretentious, good cocktails"),
    IntentOption(title: "Cheap eats", subtitle: "Big flavors, casual", full: "Cheap eats, big flavors, don't care about decor"),
    IntentOption(title: "Brunch", subtitle: "Vibes, coffee, friends", full: "Brunch with friends, good vibes, strong coffee"),
    IntentOption(title: "Post-workout", subtitle: "Protein, fast, filling", full: "Post-workout meal, high protein, generous portions, quick"),
]

struct PlaceDetailSheet: View {
    let place: PlaceResult
    let apiClient: APIClient
    var preselectedIntent: String = ""
    @Environment(\.modelContext) private var modelContext
    @State private var intent = ""
    @State private var selectedOption: UUID?
    @State private var showIntentEditor = false

    private var isAnalyzing: Bool {
        switch apiClient.state {
        case .searching, .foundRestaurant, .decomposing: return true
        default: return false
        }
    }

    private var hasResult: Bool {
        if case .completed = apiClient.state { return true }
        return false
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                placeHeader
                Divider().background(Color.parallaxBorder)

                if case .completed(let result) = apiClient.state {
                    resultContent(result)
                } else if isAnalyzing {
                    loadingContent
                } else if !preselectedIntent.isEmpty && !showIntentEditor {
                    preselectedIntentContent
                } else {
                    intentContent
                }
            }
            .padding(16)
            .padding(.bottom, 24)
        }
        .background(Color.parallaxBackground)
    }

    private var placeHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(place.name)
                .font(.title3.bold())
                .foregroundColor(.parallaxText)
            Text(place.address)
                .font(.caption)
                .foregroundColor(.parallaxMuted)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private var intentContent: some View {
        VStack(spacing: 16) {
            Text("What matters to you?")
                .font(.subheadline.weight(.medium))
                .foregroundColor(.parallaxSubtext)
                .frame(maxWidth: .infinity, alignment: .leading)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(intentOptions) { option in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            selectedOption = option.id
                            intent = option.full
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(option.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(selectedOption == option.id ? .parallaxAmber : .parallaxText)
                            Text(option.subtitle)
                                .font(.caption2)
                                .foregroundColor(.parallaxMuted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(selectedOption == option.id ? Color.parallaxAmber.opacity(0.1) : Color.parallaxSurface)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selectedOption == option.id ? Color.parallaxAmber.opacity(0.4) : Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                }
            }

            HStack(spacing: 10) {
                Image(systemName: "text.bubble")
                    .foregroundColor(.parallaxMuted)
                    .font(.system(size: 13))
                TextField("Or describe your own...", text: $intent, axis: .vertical)
                    .lineLimit(1...3)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { analyze() }
                    .onChange(of: intent) { _, _ in
                        if selectedOption != nil {
                            let isPreset = intentOptions.contains { $0.full == intent }
                            if !isPreset { selectedOption = nil }
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

            Button(action: analyze) {
                Text("Get Parallax Score")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 16)
            .background(intent.isEmpty ? Color.parallaxAmber.opacity(0.3) : Color.parallaxAmber)
            .foregroundColor(.white)
            .cornerRadius(14)
            .disabled(intent.isEmpty)

            if case .error(let message, let suggestion) = apiClient.state {
                ErrorBannerView(message: message, suggestion: suggestion, onRetry: analyze)
            }
        }
    }

    private var preselectedIntentContent: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("YOUR ANGLE")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.parallaxMuted)
                    Text(preselectedIntent)
                        .font(.subheadline)
                        .foregroundColor(.parallaxText)
                        .lineLimit(2)
                }
                Spacer()
                Button("Edit") {
                    intent = preselectedIntent
                    showIntentEditor = true
                }
                .font(.caption.weight(.medium))
                .foregroundColor(.parallaxAmber)
            }
            .padding(12)
            .background(Color.parallaxSurface)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.parallaxAmber.opacity(0.3), lineWidth: 1)
            )

            Button {
                intent = preselectedIntent
                analyze()
            } label: {
                Text("Get Parallax Score")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 16)
            .background(Color.parallaxAmber)
            .foregroundColor(.white)
            .cornerRadius(14)

            if case .error(let message, let suggestion) = apiClient.state {
                ErrorBannerView(message: message, suggestion: suggestion, onRetry: {
                    intent = preselectedIntent
                    analyze()
                })
            }
        }
    }

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
        .padding(.top, 8)
    }

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

    private func analyze() {
        guard !intent.isEmpty else { return }
        apiClient.analyze(query: place.name + ", " + place.address, intent: intent)
    }

    private func saveToHistory(_ result: AnalysisResult) {
        let item = SearchHistoryItem(
            restaurant: result.restaurant.name,
            intent: intent,
            parallaxScore: result.parallaxScore,
            googleScore: result.googleScore,
            placeId: result.restaurant.placeId
        )
        modelContext.insert(item)
    }
}
