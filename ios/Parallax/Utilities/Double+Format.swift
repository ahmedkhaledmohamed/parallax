import Foundation

extension Double {
    var scoreFormatted: String {
        String(format: "%.1f", self)
    }

    var deltaFormatted: String {
        let sign = self > 0 ? "+" : ""
        return "\(sign)\(String(format: "%.1f", self))"
    }

    var percentFormatted: String {
        "\(Int(self * 100))%"
    }
}

extension String {
    var dimensionDisplayName: String {
        replacingOccurrences(of: "_", with: " ").capitalized
    }
}
