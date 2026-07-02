import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1)

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false

        let check = UILabel()
        check.text = "✓ Copied restaurant"
        check.font = .systemFont(ofSize: 17, weight: .semibold)
        check.textColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)

        let sub = UILabel()
        sub.text = "Open Parallax — it will load automatically"
        sub.font = .systemFont(ofSize: 13)
        sub.textColor = UIColor(white: 0.6, alpha: 1)
        sub.numberOfLines = 0
        sub.textAlignment = .center

        stack.addArrangedSubview(check)
        stack.addArrangedSubview(sub)
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
        ])

        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            autoDismiss()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
                        if let text = item as? String {
                            self?.copyToClipboard(text)
                        } else {
                            self?.autoDismiss()
                        }
                    }
                    return
                }

                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.copyToClipboard(url.absoluteString)
                        } else if let urlString = item as? String {
                            self?.copyToClipboard(urlString)
                        } else {
                            self?.autoDismiss()
                        }
                    }
                    return
                }
            }
        }

        autoDismiss()
    }

    private func copyToClipboard(_ sharedText: String) {
        let lines = sharedText.components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        // Extract restaurant name (first non-URL line)
        var restaurantName: String?
        for line in lines {
            if !line.hasPrefix("http") {
                restaurantName = line
                break
            }
        }

        // Fallback: extract from URL path
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

        DispatchQueue.main.async { [weak self] in
            // Copy with a special prefix so the app knows it's from the share extension
            UIPasteboard.general.string = "parallax:\(query)"
            self?.autoDismiss()
        }
    }

    private func autoDismiss() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}
