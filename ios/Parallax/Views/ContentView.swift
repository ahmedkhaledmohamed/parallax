import SwiftUI
import SwiftData

struct ContentView: View {
    @Binding var pendingQuery: String?
    @State private var apiClient = APIClient()
    @State private var query = ""
    @State private var intent = ""
    @State private var showSheet = false

    private var isActive: Bool {
        switch apiClient.state {
        case .idle: return false
        default: return true
        }
    }

    var body: some View {
        ZStack {
            Color.parallaxBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                    .padding(.top, 8)

                ScrollView {
                    VStack(spacing: 16) {
                        SearchInputView(
                            query: $query,
                            intent: $intent,
                            isLoading: isActive,
                            onSubmit: submit
                        )

                        if case .error(let message, let suggestion) = apiClient.state {
                            ErrorBannerView(
                                message: message,
                                suggestion: suggestion,
                                onRetry: submit
                            )
                        }

                        if !isActive {
                            SearchHistoryView { restaurant, savedIntent in
                                query = restaurant
                                intent = savedIntent
                                submit()
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showSheet, onDismiss: {
            apiClient.cancel()
        }) {
            ResultSheetView(apiClient: apiClient)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackgroundInteraction(.enabled(upThrough: .medium))
                .presentationCornerRadius(20)
        }
        .onChange(of: apiClient.state) { _, newState in
            switch newState {
            case .searching, .foundRestaurant, .decomposing, .completed:
                if !showSheet { showSheet = true }
            case .error:
                showSheet = false
            case .idle:
                break
            }
        }
        .onChange(of: pendingQuery) { _, newQuery in
            if let q = newQuery {
                query = q
                pendingQuery = nil
            }
        }
    }

    private func submit() {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty,
              !intent.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        apiClient.analyze(query: query, intent: intent)
    }

    private var header: some View {
        HStack {
            HStack(spacing: 6) {
                Text("P")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.parallaxAmber)
                Text("Parallax")
                    .font(.headline)
                    .foregroundColor(.parallaxText)
            }
            Spacer()
            Text("Same reviews, your viewpoint")
                .font(.caption2)
                .foregroundColor(.parallaxMuted)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }
}
