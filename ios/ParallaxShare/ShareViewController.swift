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
        let urlString = extractURL(from: text) ?? text

        DispatchQueue.main.async { [weak self] in
            let defaults = UserDefaults(suiteName: "group.com.ahmedkhaled.parallax")
            defaults?.set(urlString, forKey: "pendingShareURL")
            defaults?.synchronize()

            // Open the main app — the only reliable way from a share extension
            self?.openMainApp()

            // Dismiss after a short delay to let the open happen
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                self?.done()
            }
        }
    }

    private func openMainApp() {
        guard let url = URL(string: "parallax://pending") else { return }

        // Method 1: Walk the responder chain to find UIApplication
        var responder: UIResponder? = self as UIResponder
        let openURLSelector = NSSelectorFromString("openURL:")
        while responder != nil {
            if responder?.responds(to: openURLSelector) == true {
                responder?.perform(openURLSelector, with: url)
                return
            }
            responder = responder?.next
        }

        // Method 2: Use shared UIApplication via string-based lookup
        if let app = UIApplication.value(forKeyPath: "sharedApplication") as? UIApplication {
            app.open(url)
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        let matches = detector?.matches(in: text, range: range) ?? []
        return matches.first?.url?.absoluteString
    }

    private func done() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
