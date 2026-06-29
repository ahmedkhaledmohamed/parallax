import SwiftUI

struct ErrorBannerView: View {
    let message: String
    let suggestion: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(message)
                    .font(.caption)
                    .foregroundColor(.red)
                Spacer()
                Button("Try again", action: onRetry)
                    .font(.caption2.bold())
                    .foregroundColor(.red)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.red.opacity(0.4), lineWidth: 1)
                    )
            }
            if let suggestion {
                Text(suggestion)
                    .font(.system(size: 11))
                    .foregroundColor(.parallaxMuted)
            }
        }
        .padding(16)
        .background(Color.red.opacity(0.08))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.red.opacity(0.2), lineWidth: 1)
        )
    }
}
