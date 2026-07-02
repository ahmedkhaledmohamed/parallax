import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private var statusLabel: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1)
        setupUI()
        handleSharedContent()
    }

    private func setupUI() {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false

        statusLabel = UILabel()
        statusLabel.text = "Opening Parallax..."
        statusLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        statusLabel.textColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)
        statusLabel.textAlignment = .center

        let sub = UILabel()
        sub.text = "If it doesn't open, switch to Parallax manually"
        sub.font = .systemFont(ofSize: 12)
        sub.textColor = UIColor(white: 0.5, alpha: 1)
        sub.numberOfLines = 0
        sub.textAlignment = .center

        stack.addArrangedSubview(statusLabel)
        stack.addArrangedSubview(sub)
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
        ])
    }

    private func handleSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            finish()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for attachment in attachments {
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
                        if let text = item as? String {
                            self?.processShared(text)
                        } else {
                            self?.finish()
                        }
                    }
                    return
                }
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.processShared(url.absoluteString)
                        } else if let s = item as? String {
                            self?.processShared(s)
                        } else {
                            self?.finish()
                        }
                    }
                    return
                }
            }
        }
        finish()
    }

    private func processShared(_ text: String) {
        let name = extractRestaurantName(from: text)
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? name
        guard let deepLink = URL(string: "parallax://analyze?query=\(encoded)") else {
            finish()
            return
        }

        // Always copy to clipboard as fallback
        DispatchQueue.main.async {
            UIPasteboard.general.string = "parallax:\(name)"
        }

        // Try to open the app directly
        DispatchQueue.main.async { [weak self] in
            self?.extensionContext?.open(deepLink) { success in
                DispatchQueue.main.async {
                    if success {
                        self?.statusLabel.text = "✓ Opened Parallax"
                    } else {
                        self?.statusLabel.text = "✓ Copied — open Parallax"
                    }
                    // Dismiss after a short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        self?.finish()
                    }
                }
            }
        }
    }

    private func extractRestaurantName(from text: String) -> String {
        let lines = text.components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        // First non-URL line is the restaurant name
        for line in lines {
            if !line.hasPrefix("http") {
                return line
            }
        }

        // Extract from URL path
        for line in lines {
            if line.contains("place/") {
                if let range = line.range(of: "place/") {
                    let after = line[range.upperBound...]
                    if let end = after.firstIndex(of: "/") ?? after.firstIndex(of: "@") {
                        return String(after[..<end])
                            .replacingOccurrences(of: "+", with: " ")
                            .removingPercentEncoding ?? String(after[..<end])
                    }
                }
            }
        }

        return text
    }

    private func finish() {
        DispatchQueue.main.async { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}
