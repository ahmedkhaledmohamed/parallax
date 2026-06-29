import SwiftUI
import SwiftData

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var query = ""
    @State private var intent = ""

    var body: some View {
        ZStack {
            Color.parallaxBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    header
                    searchSection
                    resultSection
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .preferredColorScheme(.dark)
        .onChange(of: pendingQuery) { _, newQuery in
            if let q = newQuery {
                query = q
                pendingQuery = nil
            }
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("P")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.parallaxAmber)
            Text("Parallax")
                .font(.title2.bold())
                .foregroundColor(.parallaxText)
            Text("Same reviews, your viewpoint")
                .font(.subheadline)
                .foregroundColor(.parallaxMuted)
        }
        .padding(.top, 24)
        .padding(.bottom, 24)
    }

    private var searchSection: some View {
        SearchInputView(
            query: $query,
            intent: $intent,
            isLoading: isLoading,
            onSubmit: {
                apiClient.analyze(query: query, intent: intent)
            }
        )
    }

    private func resetSearch() {
        apiClient.cancel()
        query = ""
        intent = ""
    }

    @ViewBuilder
    private var resultSection: some View {
        switch apiClient.state {
        case .idle:
            SearchHistoryView { restaurant, savedIntent in
                query = restaurant
                intent = savedIntent
                apiClient.analyze(query: restaurant, intent: savedIntent)
            }
            .padding(.top, 24)

        case .searching:
            LoadingStateView(stage: .searching, restaurant: nil)
                .padding(.top, 24)

        case .foundRestaurant(let restaurant):
            LoadingStateView(stage: .found, restaurant: restaurant)
                .padding(.top, 24)

        case .decomposing(let restaurant):
            LoadingStateView(stage: .decomposing, restaurant: restaurant)
                .padding(.top, 24)

        case .completed(let result):
            ResultView(result: result, onNewSearch: resetSearch)
                .padding(.top, 24)

        case .error(let message, let suggestion):
            ErrorBannerView(
                message: message,
                suggestion: suggestion,
                onRetry: {
                    apiClient.analyze(query: query, intent: intent)
                }
            )
            .padding(.top, 24)
        }
    }

    private var isLoading: Bool {
        switch apiClient.state {
        case .idle, .completed, .error: return false
        default: return true
        }
    }
}
