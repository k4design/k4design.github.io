import SwiftUI

struct ChordPillView: View {
    let chord: String
    var isRemovable: Bool = false
    var onRemove: (() -> Void)? = nil
    var isLarge: Bool = false

    @State private var isPressed = false
    @State private var showDelete = false

    private var accentColor: Color { .chordQualityColor(chord) }

    var body: some View {
        HStack(spacing: isLarge ? 6 : 4) {
            Text(chord)
                .font(.system(size: isLarge ? 15 : 13, weight: .semibold, design: .rounded))
                .foregroundColor(.white)

            if isRemovable && showDelete {
                Button(action: {
                    withAnimation(.spring(response: 0.2)) {
                        onRemove?()
                    }
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: isLarge ? 14 : 12))
                        .foregroundColor(.white.opacity(0.7))
                }
                .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(.horizontal, isLarge ? 14 : 10)
        .padding(.vertical, isLarge ? 8 : 6)
        .background(
            ZStack {
                accentColor.opacity(0.2)
                RoundedRectangle(cornerRadius: 100)
                    .stroke(accentColor.opacity(0.5), lineWidth: 1)
            }
        )
        .clipShape(Capsule())
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .onLongPressGesture(minimumDuration: 0.3) {
            if isRemovable {
                withAnimation(.spring(response: 0.3)) {
                    showDelete.toggle()
                }
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }
        }
    }
}

struct ChordWithRomanView: View {
    let chord: String
    let roman: String

    var body: some View {
        VStack(spacing: 4) {
            Text(chord)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.chordQualityColor(chord).opacity(0.2))
                .overlay(
                    Capsule().stroke(Color.chordQualityColor(chord).opacity(0.4), lineWidth: 1)
                )
                .clipShape(Capsule())

            Text(roman)
                .font(.system(size: 10, weight: .medium, design: .serif))
                .foregroundColor(.ccTextSecondary)
        }
    }
}

// MARK: - Chord Picker Modal

struct ChordPickerModal: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedRoot: String
    @Binding var selectedQuality: String
    let onAdd: (String) -> Void

    private let roots = ["C", "C#", "Db", "D", "D#", "Eb", "E",
                         "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]
    private let qualities = ["", "m", "7", "maj7", "m7", "sus2", "sus4", "dim", "aug", "m7b5", "add9"]
    private let qualityLabels = ["Major", "Minor", "Dom 7", "Maj 7", "Min 7",
                                  "Sus2", "Sus4", "Dim", "Aug", "m7♭5", "Add9"]

    var chordPreview: String { selectedRoot + selectedQuality }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.ccBackground.ignoresSafeArea()
                VStack(spacing: 24) {

                    // Preview
                    Text(chordPreview)
                        .font(.ccDisplay(48))
                        .foregroundColor(.ccText)
                        .padding(.top, 8)

                    // Root picker
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Root Note")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.ccTextSecondary)
                            .padding(.horizontal, 20)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(roots, id: \.self) { root in
                                    Button(root) {
                                        selectedRoot = root
                                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    }
                                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                                    .foregroundColor(selectedRoot == root ? .black : .white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(selectedRoot == root ? Color.ccAccent : Color.ccCard)
                                    .clipShape(Capsule())
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }

                    // Quality picker
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Quality")
                            .font(.caption.weight(.semibold))
                            .foregroundColor(.ccTextSecondary)
                            .padding(.horizontal, 20)

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 8) {
                            ForEach(Array(zip(qualities, qualityLabels)), id: \.0) { quality, label in
                                Button(label) {
                                    selectedQuality = quality
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                }
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(selectedQuality == quality ? .black : .white)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity)
                                .background(selectedQuality == quality ? Color.ccAccent : Color.ccCard)
                                .cornerRadius(10)
                            }
                        }
                        .padding(.horizontal, 20)
                    }

                    Spacer()

                    // Add button
                    Button(action: {
                        onAdd(chordPreview)
                        dismiss()
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    }) {
                        HStack {
                            Image(systemName: "plus")
                            Text("Add \(chordPreview)")
                        }
                        .font(.system(.body, design: .default).weight(.semibold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.ccAccent)
                        .cornerRadius(14)
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 8)
                }
            }
            .navigationTitle("Add Chord")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(.ccTextSecondary)
                }
            }
        }
    }
}
