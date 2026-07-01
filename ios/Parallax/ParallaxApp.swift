import SwiftUI
import SwiftData
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var onDeepLink: ((String) -> Void)?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        handleURL(url)
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        if let urlString = response.notification.request.content.userInfo["url"] as? String {
            onDeepLink?(urlString)
        }
        completionHandler()
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    private func handleURL(_ url: URL) {
        guard url.scheme == "parallax" else { return }
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            if let urlParam = components.queryItems?.first(where: { $0.name == "url" })?.value {
                onDeepLink?(urlParam)
            } else if let query = components.queryItems?.first(where: { $0.name == "query" })?.value {
                onDeepLink?(query)
            }
        }
    }
}

@main
struct ParallaxApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    let container: ModelContainer

    @State private var pendingQuery: String?

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
                .onAppear {
                    appDelegate.onDeepLink = { [self] query in
                        pendingQuery = query
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
    }
}
