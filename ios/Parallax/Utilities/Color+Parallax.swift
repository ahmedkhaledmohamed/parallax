import SwiftUI

extension Color {
    static let parallaxBackground = Color(red: 0.035, green: 0.035, blue: 0.043)
    static let parallaxSurface = Color(red: 0.094, green: 0.094, blue: 0.106)
    static let parallaxBorder = Color(red: 0.153, green: 0.153, blue: 0.169)
    static let parallaxAmber = Color(red: 0.851, green: 0.467, blue: 0.024)
    static let parallaxText = Color(red: 0.957, green: 0.957, blue: 0.961)
    static let parallaxSubtext = Color(red: 0.631, green: 0.631, blue: 0.667)
    static let parallaxMuted = Color(red: 0.396, green: 0.396, blue: 0.416)
    static let parallaxDimmed = Color(red: 0.322, green: 0.322, blue: 0.337)
    static let parallaxEmerald = Color(red: 0.204, green: 0.827, blue: 0.600)
    static let parallaxRed = Color(red: 0.973, green: 0.443, blue: 0.443)
    static let parallaxAmberLight = Color(red: 0.984, green: 0.749, blue: 0.141)

    static func sentimentColor(_ sentiment: Double) -> Color {
        if sentiment >= 0.3 { return .parallaxEmerald }
        if sentiment >= -0.3 { return .parallaxAmberLight }
        return .parallaxRed
    }

    static func scoreColor(_ score: Double) -> Color {
        if score >= 4.0 { return .parallaxEmerald }
        if score >= 3.0 { return .parallaxAmberLight }
        return .parallaxRed
    }

    static func deltaColor(_ delta: Double) -> Color {
        if abs(delta) < 0.3 { return .parallaxMuted }
        if delta > 0 { return .parallaxEmerald }
        return .parallaxRed
    }

    static func confidenceColor(_ confidence: Confidence) -> Color {
        switch confidence {
        case .high: return .parallaxEmerald
        case .medium: return .parallaxAmberLight
        case .low: return .parallaxRed
        }
    }
}
