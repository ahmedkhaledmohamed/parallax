import UIKit
import UniformTypeIdentifiers
import UserNotifications

class ShareViewController: UIViewController {

    private let confirmationLabel: UILabel = {
        let label = UILabel()
        label.text = "✓ Saved to Parallax"
        label.font = .systemFont(ofSize: 17, weight: .semibold)
        label.textColor = UIColor(red: 0.851, green: 0.467, blue: 0.024, alpha: 1)
        label.textAlignment = .center
        return label
    }()

    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Tap the notification to open"
        label.font = .systemFont(ofSize: 13)
        label.textColor = UIColor(white: 0.6, alpha: 1)
        label.textAlignment = .center
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.035, green: 0.035, blue: 0.043, alpha: 1)

        let stack = UIStackView(arrangedSubviews: [confirmationLabel, subtitleLabel])
        stack.axis = .vertical
        stack.spacing = 6
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
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
                            self?.processSharedText(text)
                        } else {
                            self?.autoDismiss()
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
                            self?.autoDismiss()
                        }
                    }
                    return
                }
            }
        }

        autoDismiss()
    }

    private func processSharedText(_ text: String) {
        let urlString = extractURL(from: text) ?? text
        let restaurantName = extractRestaurantName(from: urlString)

        DispatchQueue.main.async { [weak self] in
            self?.sendNotification(urlString: urlString, restaurantName: restaurantName)
            self?.autoDismiss()
        }
    }

    private func sendNotification(urlString: String, restaurantName: String) {
        let content = UNMutableNotificationContent()
        content.title = "Parallax"
        content.body = "Tap to score \(restaurantName)"
        content.sound = .default
        content.userInfo = [
            "url": urlString,
            "deepLink": "parallax://analyze?url=\(urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? urlString)"
        ]

        let request = UNNotificationRequest(
            identifier: "parallax-share",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)
        )

        UNUserNotificationCenter.current().add(request)
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        let matches = detector?.matches(in: text, range: range) ?? []
        return matches.first?.url?.absoluteString
    }

    private func extractRestaurantName(from urlString: String) -> String {
        // Try to extract name from Google Maps URL path: /maps/place/Restaurant+Name/
        if let range = urlString.range(of: "place/") {
            let after = urlString[range.upperBound...]
            if let end = after.firstIndex(of: "/") ?? after.firstIndex(of: "@") {
                let raw = String(after[..<end])
                return raw.replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? raw
            }
        }
        return "this restaurant"
    }

    private func autoDismiss() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }
}
