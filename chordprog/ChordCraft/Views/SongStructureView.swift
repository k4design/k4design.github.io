import SwiftUI

struct SongStructureView: View {
    let structure: SongStructure
    var onFavorite: (ChordProgression) -> Void
    @State private var showShareSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Header bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(structure.key) \(structure.scale)")
                        .font(.ccHeadline(18))
                        .foregroundColor(.ccText)
                    Text("\(structure.genre) · \(structure.overallFeel)")
                        .font(.system(size: 13))
                        .foregroundColor(.ccTextSecondary)
                        .lineLimit(1)
                }
                Spacer()
                Button(action: { showShareSheet = true }) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.ccAccent)
                        .padding(10)
                        .background(Color.ccAccent.opacity(0.12))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            // Timeline
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(structure.sections.enumerated()), id: \.element.id) { index, section in
                        HStack(alignment: .top, spacing: 0) {

                            // Timeline spine
                            VStack(spacing: 0) {
                                Circle()
                                    .fill(Color.sectionColor(section.section))
                                    .frame(width: 10, height: 10)
                                    .padding(.top, 20)

                                if index < structure.sections.count - 1 {
                                    Rectangle()
                                        .fill(Color.ccBorder)
                                        .frame(width: 1)
                                        .frame(maxHeight: .infinity)
                                }
                            }
                            .frame(width: 32)

                            // Card
                            SectionCard(progression: section, onFavorite: { onFavorite(section) })
                                .padding(.leading, 8)
                                .padding(.bottom, index < structure.sections.count - 1 ? 12 : 0)
                        }
                        .padding(.leading, 20)
                    }
                }
                .padding(.top, 8)
                .padding(.bottom, 24)
                .padding(.trailing, 20)
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(activityItems: [structure.exportText])
        }
    }
}

struct SectionCard: View {
    let progression: ChordProgression
    var onFavorite: () -> Void

    @State private var showCopied = false
    private var sectionColor: Color { .sectionColor(progression.section) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(progression.section.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundColor(sectionColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(sectionColor.opacity(0.15))
                    .clipShape(Capsule())

                Spacer()

                HStack(spacing: 12) {
                    Button(action: {
                        UIPasteboard.general.string = progression.chordsText
                        withAnimation { showCopied = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            withAnimation { showCopied = false }
                        }
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    }) {
                        Image(systemName: showCopied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 13))
                            .foregroundColor(showCopied ? .ccTeal : .ccTextSecondary)
                    }

                    Button(action: onFavorite) {
                        Image(systemName: progression.isFavorited ? "heart.fill" : "heart")
                            .font(.system(size: 15))
                            .foregroundColor(progression.isFavorited ? .red : .ccTextSecondary)
                    }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(zip(progression.chords, progression.romanNumerals)), id: \.0) { chord, roman in
                        ChordWithRomanView(chord: chord, roman: roman)
                    }
                }
            }

            Text(progression.feel)
                .font(.system(size: 11, weight: .medium).italic())
                .foregroundColor(sectionColor.opacity(0.85))

            if !progression.description.isEmpty {
                Text(progression.description)
                    .font(.system(size: 11))
                    .foregroundColor(.ccTextSecondary)
                    .lineSpacing(2)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
