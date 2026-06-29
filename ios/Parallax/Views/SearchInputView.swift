import SwiftUI

private let intentExamples = [
    "Quiet date night, great wine, authentic Italian",
    "Quick family lunch, kid-friendly, large portions",
    "Business dinner, upscale but not pretentious",
    "Cheap eats, big flavors, don't care about decor",
    "Brunch with friends, good vibes, strong coffee",
]

struct SearchInputView: View {
    @Binding var query: String
    @Binding var intent: String
    let isLoading: Bool
    let onSubmit: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Restaurant")
                    .font(.caption)
                    .foregroundColor(.parallaxSubtext)
                TextField("Restaurant name or Google Maps URL", text: $query)
                    .textFieldStyle(.plain)
                    .padding(12)
                    .background(Color.parallaxSurface)
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.parallaxBorder, lineWidth: 1)
                    )
                    .disabled(isLoading)
                if GoogleMapsURLParser.isGoogleMapsURL(query) {
                    Text("Google Maps link detected")
                        .font(.caption2)
                        .foregroundColor(.parallaxAmber)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("What are you looking for?")
                    .font(.caption)
                    .foregroundColor(.parallaxSubtext)
                TextField("Describe what matters to you...", text: $intent, axis: .vertical)
                    .lineLimit(2...4)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { onSubmit() }
                    .padding(12)
                    .background(Color.parallaxSurface)
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.parallaxBorder, lineWidth: 1)
                    )
                    .disabled(isLoading)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(intentExamples, id: \.self) { example in
                            Button {
                                intent = example
                            } label: {
                                Text(example)
                                    .font(.caption2)
                                    .foregroundColor(.parallaxMuted)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 8)
                                    .overlay(
                                        Capsule()
                                            .stroke(Color.parallaxBorder, lineWidth: 1)
                                    )
                            }
                            .disabled(isLoading)
                        }
                    }
                }
            }

            Button(action: onSubmit) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 22)
                } else {
                    Text("Get your Parallax Score")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical, 14)
            .background(
                query.trimmingCharacters(in: .whitespaces).isEmpty ||
                intent.trimmingCharacters(in: .whitespaces).isEmpty ||
                isLoading ? Color.parallaxAmber.opacity(0.4) : Color.parallaxAmber
            )
            .foregroundColor(.white)
            .cornerRadius(10)
            .disabled(
                query.trimmingCharacters(in: .whitespaces).isEmpty ||
                intent.trimmingCharacters(in: .whitespaces).isEmpty ||
                isLoading
            )
        }
    }
}
