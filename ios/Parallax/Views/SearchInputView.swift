import SwiftUI

private struct IntentOption: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let full: String
}

private let intentOptions = [
    IntentOption(title: "Date night", subtitle: "Quiet, wine, romantic", full: "Quiet date night, great wine, authentic Italian"),
    IntentOption(title: "Family lunch", subtitle: "Kids, quick, portions", full: "Quick family lunch, kid-friendly, large portions"),
    IntentOption(title: "Business dinner", subtitle: "Upscale, cocktails", full: "Business dinner, upscale but not pretentious, good cocktails"),
    IntentOption(title: "Cheap eats", subtitle: "Big flavors, casual", full: "Cheap eats, big flavors, don't care about decor"),
    IntentOption(title: "Brunch", subtitle: "Vibes, coffee, friends", full: "Brunch with friends, good vibes, strong coffee"),
    IntentOption(title: "Post-workout", subtitle: "Protein, fast, filling", full: "Post-workout meal, high protein, generous portions, quick"),
]

struct SearchInputView: View {
    @Binding var query: String
    @Binding var intent: String
    let isLoading: Bool
    let onSubmit: () -> Void

    @State private var selectedOption: UUID?

    var body: some View {
        VStack(spacing: 20) {
            restaurantField
            intentSection
            submitButton
        }
    }

    private var restaurantField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.parallaxMuted)
                .font(.system(size: 15))
            TextField("Restaurant name or Maps link", text: $query)
                .textFieldStyle(.plain)
                .submitLabel(.next)
                .disabled(isLoading)
        }
        .padding(14)
        .background(Color.parallaxSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(query.isEmpty ? Color.parallaxBorder : Color.parallaxAmber.opacity(0.5), lineWidth: 1)
        )
    }

    private var intentSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("What matters to you?")
                .font(.subheadline.weight(.medium))
                .foregroundColor(.parallaxSubtext)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(intentOptions) { option in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            selectedOption = option.id
                            intent = option.full
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(option.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(selectedOption == option.id ? .parallaxAmber : .parallaxText)
                            Text(option.subtitle)
                                .font(.caption2)
                                .foregroundColor(.parallaxMuted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(selectedOption == option.id ? Color.parallaxAmber.opacity(0.1) : Color.parallaxSurface)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selectedOption == option.id ? Color.parallaxAmber.opacity(0.4) : Color.parallaxBorder, lineWidth: 1)
                        )
                    }
                    .disabled(isLoading)
                }
            }

            HStack(spacing: 10) {
                Image(systemName: "text.bubble")
                    .foregroundColor(.parallaxMuted)
                    .font(.system(size: 13))
                TextField("Or describe your own...", text: $intent, axis: .vertical)
                    .lineLimit(1...3)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { onSubmit() }
                    .disabled(isLoading)
                    .onChange(of: intent) { _, _ in
                        if selectedOption != nil {
                            let isPreset = intentOptions.contains { $0.full == intent }
                            if !isPreset { selectedOption = nil }
                        }
                    }
            }
            .padding(12)
            .background(Color.parallaxSurface)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.parallaxBorder, lineWidth: 1)
            )
        }
    }

    private var canSubmit: Bool {
        !query.trimmingCharacters(in: .whitespaces).isEmpty &&
        !intent.trimmingCharacters(in: .whitespaces).isEmpty &&
        !isLoading
    }

    private var submitButton: some View {
        Button(action: onSubmit) {
            if isLoading {
                ProgressView()
                    .tint(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 22)
            } else {
                Text("Get your Parallax Score")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 16)
        .background(canSubmit ? Color.parallaxAmber : Color.parallaxAmber.opacity(0.3))
        .foregroundColor(.white)
        .cornerRadius(14)
        .disabled(!canSubmit)
    }
}
