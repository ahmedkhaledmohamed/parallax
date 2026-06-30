import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1)
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            done()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                // Google Maps shares as plain text containing a URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
                        if let text = item as? String {
                            self?.processSharedText(text)
                        } else {
                            self?.done()
                        }
                    }
                    return
                }

                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.processSharedText(url.absoluteString)
                        } else if let urlString = item as? String {
                            self?.processSharedText(urlString)
                        } else {
                            self?.done()
                        }
                    }
                    return
                }
            }
        }

        done()
    }

    private func processSharedText(_ text: String) {
        // Extract the URL from shared text (Google Maps may include extra text around the URL)
        let urlString = extractURL(from: text) ?? text

        DispatchQueue.main.async { [weak self] in
            // Save to App Group for the main app to pick up
            let defaults = UserDefaults(suiteName: "group.com.ahmedkhaled.parallax")
            defaults?.set(urlString, forKey: "pendingShareURL")
            defaults?.synchronize()

            // Open the main app via URL scheme
            guard let appURL = URL(string: "parallax://pending") else {
                self?.done()
                return
            }

            // Try extensionContext.open first (iOS 17+)
            self?.extensionContext?.open(appURL) { success in
                if !success {
                    // Fallback: open via responder chain
                    self?.openURLViaResponder(appURL)
                }
                self?.done()
            }
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        let matches = detector?.matches(in: text, range: range) ?? []
        return matches.first?.url?.absoluteString
    }

    private func openURLViaResponder(_ url: URL) {
        let selector = sel_registerName("openURL:")
        var responder: UIResponder? = self
        while let r = responder {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            responder = r.next
        }
    }

    private func done() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
