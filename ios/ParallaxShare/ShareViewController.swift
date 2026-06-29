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
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.processURL(url.absoluteString)
                        } else if let urlString = item as? String {
                            self?.processURL(urlString)
                        } else {
                            self?.dismiss()
                        }
                    }
                    return
                }

                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] item, _ in
                        if let text = item as? String {
                            self?.processURL(text)
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

    private func processURL(_ urlString: String) {
        DispatchQueue.main.async { [weak self] in
            let defaults = UserDefaults(suiteName: "group.com.ahmedkhaled.parallax")
            defaults?.set(urlString, forKey: "pendingShareURL")

            if let appURL = URL(string: "parallax://pending") {
                self?.openURL(appURL)
            }

            self?.dismiss()
        }
    }

    private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(url)
                return
            }
            responder = r.next
        }
    }

    private func dismiss() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
