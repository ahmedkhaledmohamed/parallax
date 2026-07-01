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
            dismiss()
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
                            self?.dismiss()
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
                            self?.dismiss()
                        }
                    }
                    return
                }
            }
        }

        dismiss()
    }

    private func openApp(with sharedText: String) {
        let lines = sharedText.components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        var restaurantName: String?
        for line in lines {
            if !line.hasPrefix("http") {
                restaurantName = line
                break
            }
        }

        if restaurantName == nil {
            for line in lines {
                if line.contains("place/") {
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
            dismiss()
            return
        }

        DispatchQueue.main.async { [weak self] in
            // iOS 17+: extensionContext.open() works in share extensions
            // CRITICAL: do NOT call done/dismiss before this completes
            self?.extensionContext?.open(deepLink) { success in
                // Only dismiss AFTER the open attempt completes
                self?.dismiss()
            }
        }
    }

    private func dismiss() {
        DispatchQueue.main.async { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}
