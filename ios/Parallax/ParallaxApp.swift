import SwiftUI
import SwiftData

@main
struct ParallaxApp: App {
    let container: ModelContainer

    @State private var pendingQuery: String?
    @Environment(\.scenePhase) private var scenePhase

    init() {
        let schema = Schema([SearchHistoryItem.self])
        let config = ModelConfiguration(schema: schema)
        container = try! ModelContainer(for: schema, configurations: config)
    }

    var body: some Scene {
        WindowGroup {
            ContentView(pendingQuery: $pendingQuery)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        checkPendingShare()
                    }
                }
        }
        .modelContainer(container)
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "parallax" else { return }

        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            if let urlParam = components.queryItems?.first(where: { $0.name == "url" })?.value {
                pendingQuery = urlParam
                return
            } else if let query = components.queryItems?.first(where: { $0.name == "query" })?.value {
                pendingQuery = query
                return
            }
        }

        checkPendingShare()
    }

    private func checkPendingShare() {
        let defaults = UserDefaults(suiteName: "group.com.ahmedkhaled.parallax")
        if let sharedURL = defaults?.string(forKey: "pendingShareURL") {
            pendingQuery = sharedURL
            defaults?.removeObject(forKey: "pendingShareURL")
            defaults?.synchronize()
        }
    }
}
