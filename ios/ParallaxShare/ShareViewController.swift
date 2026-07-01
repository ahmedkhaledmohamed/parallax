import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
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
                            self?.openApp(with: text)
                        } else {
                            self?.done()
                        }
                    }
                    return
                }

                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.openApp(with: url.absoluteString)
                        } else if let urlString = item as? String {
                            self?.openApp(with: urlString)
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

    private func openApp(with sharedText: String) {
        let urlString = extractURL(from: sharedText) ?? sharedText
        let encoded = urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? urlString
        guard let deepLink = URL(string: "parallax://analyze?url=\(encoded)") else {
            done()
            return
        }

        DispatchQueue.main.async { [weak self] in
            // Get UIApplication.shared via KVC (works in extensions)
            guard let app = UIApplication.value(forKeyPath: "sharedApplication") as? UIApplication else {
                self?.done()
                return
            }
            app.open(deepLink, options: [:]) { _ in
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

    private func done() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
