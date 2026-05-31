import SwiftUI

struct ProgressionResultCard: View {
    let progression: ChordProgression
    var onFavorite: () -> Void
    var onCopy: () -> Void

    @State private var isPressed = false
    @State private var showCopied = false

    private var sectionColor: Color { .sectionColor(progression.section) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            // Header
            HStack {
                Text(progression.section.uppercased() + (progression.variation > 1 ? " \(progression.variation)" : ""))
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(sectionColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(sectionColor.opacity(0.15))
                    .clipShape(Capsule())

                Spacer()

                HStack(spacing: 14) {
                    // Copy button
                    Button(action: {
                        UIPasteboard.general.string = progression.chordsText
                        withAnimation(.spring(response: 0.3)) { showCopied = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            withAnimation { showCopied = false }
                        }
                        onCopy()
                    }) {
                        Image(systemName: showCopied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(showCopied ? .ccTeal : .ccTextSecondary)
                    }

                    // Favorite button
                    Button(action: onFavorite) {
                        Image(systemName: progression.isFavorited ? "heart.fill" : "heart")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(progression.isFavorited ? .red : .ccTextSecondary)
                            .scaleEffect(progression.isFavorited ? 1.1 : 1.0)
                            .animation(.spring(response: 0.3, dampingFraction: 0.5), value: progression.isFavorited)
                    }
                }
            }

            // Chord pills with Roman numerals
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(Array(zip(progression.chords, progression.romanNumerals)), id: \.0) { chord, roman in
                        ChordWithRomanView(chord: chord, roman: roman)
                    }
                }
                .padding(.horizontal, 1)
            }

            // Feel tag
            HStack(spacing: 6) {
                Image(systemName: "waveform")
                    .font(.system(size: 11))
                    .foregroundColor(sectionColor.opacity(0.8))
                Text(progression.feel)
                    .font(.system(size: 12, weight: .medium, design: .default).italic())
                    .foregroundColor(sectionColor.opacity(0.9))
            }

            // Description
            Text(progression.description)
                .font(.system(size: 12))
                .foregroundColor(.ccTextSecondary)
                .lineSpacing(3)
        }
        .padding(16)
        .cardStyle()
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.8), value: isPressed)
        .onTapGesture {
            withAnimation { isPressed = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation { isPressed = false }
            }
        }
    }
}
