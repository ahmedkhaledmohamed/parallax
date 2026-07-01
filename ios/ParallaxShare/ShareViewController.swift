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
        // Google Maps shares text like:
        // "Pai Northern Thai Kitchen\nhttps://maps.app.goo.gl/xyz"
        // or just a URL. Extract the restaurant name (first line) if present.
        let lines = sharedText.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }

        // Use the first non-URL line as the restaurant name, or extract from URL
        var restaurantName: String?
        for line in lines {
            if !line.hasPrefix("http") {
                restaurantName = line
                break
            }
        }

        // If no name found, try to extract from the URL
        if restaurantName == nil {
            for line in lines {
                if line.contains("maps") && line.contains("place/") {
                    if let range = line.range(of: "place/") {
                        let after = line[range.upperBound...]
                        if let end = after.firstIndex(of: "/") ?? after.firstIndex(of: "@") {
                            restaurantName = String(after[..<end])
                                .replacingOccurrences(of: "+", with: " ")
                                .removingPercentEncoding
                        }
                    }
                }
            }
        }

        let query = restaurantName ?? sharedText
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query

        guard let deepLink = URL(string: "parallax://analyze?query=\(encoded)") else {
            done()
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let app = UIApplication.value(forKeyPath: "sharedApplication") as? UIApplication else {
                self?.done()
                return
            }
            app.open(deepLink, options: [:]) { _ in
                self?.done()
            }
        }
    }

    private func done() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
