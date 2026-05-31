import SwiftUI

struct SectionGeneratorView: View {
    @StateObject private var vm = SectionGeneratorViewModel()
    @State private var showChordPicker = false
    @State private var pickerRoot = "C"
    @State private var pickerQuality = ""

    private let sectionOptions = ["Pre-Chorus", "Chorus", "Bridge", "Outro"]

    var body: some View {
        ZStack {
            Color.ccBackground.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    verseInputSection
                    keyDisplay
                    sectionSelector
                    variationStepper
                    generateButton
                    resultsSection
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 40)
            }

            if vm.isLoading {
                LoadingOverlay(message: "Generating progressions…")
                    .transition(.opacity)
            }
        }
        .navigationTitle("Generate from Verse")
        .navigationBarTitleDisplayMode(.large)
        .sheet(isPresented: $showChordPicker) {
            ChordPickerModal(
                selectedRoot: $pickerRoot,
                selectedQuality: $pickerQuality,
                onAdd: { vm.addChord($0) }
            )
            .presentationDetents([.medium, .large])
        }
        .alert("Error", isPresented: $vm.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "An unknown error occurred.")
        }
    }

    // MARK: - Subviews

    private var verseInputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Verse Chords", systemImage: "music.note.list")
                .font(.system(.subheadline, design: .default).weight(.semibold))
                .foregroundColor(.ccTextSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(vm.verseChords.enumerated()), id: \.offset) { index, chord in
                        ChordPillView(chord: chord, isRemovable: true, isLarge: true) {
                            withAnimation(.spring(response: 0.3)) {
                                vm.removeChord(at: index)
                            }
                        }
                        .transition(.scale.combined(with: .opacity))
                    }

                    Button(action: { showChordPicker = true }) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 13, weight: .bold))
                            Text("Add")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                        }
                        .foregroundColor(.ccAccent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.ccAccent.opacity(0.12))
                        .overlay(
                            Capsule().stroke(Color.ccAccent.opacity(0.3), lineWidth: 1)
                        )
                        .clipShape(Capsule())
                    }
                }
                .padding(.vertical, 4)
            }

            if vm.verseChords.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "hand.tap")
                        .foregroundColor(.ccTextSecondary)
                    Text("Tap + Add to build your verse")
                        .font(.system(size: 13))
                        .foregroundColor(.ccTextSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 4)
            }
        }
        .padding(16)
        .cardStyle()
    }

    private var keyDisplay: some View {
        HStack {
            Image(systemName: "key.horizontal")
                .foregroundColor(.ccTeal)
            Text("Detected Key")
                .font(.system(.subheadline, design: .default).weight(.medium))
                .foregroundColor(.ccTextSecondary)
            Spacer()
            Text(vm.detectedKey)
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundColor(.ccTeal)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardStyle()
    }

    private var sectionSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Generate For", systemImage: "square.grid.2x2")
                .font(.system(.subheadline, design: .default).weight(.semibold))
                .foregroundColor(.ccTextSecondary)

            FlowLayout(spacing: 8) {
                ForEach(sectionOptions, id: \.self) { section in
                    let isSelected = vm.selectedSections.contains(section)
                    Button(section) {
                        vm.toggleSection(section)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    }
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(isSelected ? .black : .ccText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(isSelected ? Color.sectionColor(section) : Color.ccCard)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule().stroke(
                            isSelected ? Color.clear : Color.ccBorder,
                            lineWidth: 1
                        )
                    )
                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
                }
            }
        }
        .padding(16)
        .cardStyle()
    }

    private var variationStepper: some View {
        HStack {
            Label("Variations", systemImage: "arrow.triangle.branch")
                .font(.system(.subheadline, design: .default).weight(.semibold))
                .foregroundColor(.ccTextSecondary)
            Spacer()
            Stepper("\(vm.variationCount)", value: $vm.variationCount, in: 1...4)
                .labelsHidden()
                .tint(.ccAccent)
            Text("\(vm.variationCount)")
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundColor(.ccText)
                .frame(width: 20)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .cardStyle()
    }

    private var generateButton: some View {
        Button(action: {
            Task { await vm.generate() }
        }) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                Text("Generate Progressions")
                    .font(.system(.body, design: .default).weight(.semibold))
            }
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                vm.verseChords.isEmpty || vm.selectedSections.isEmpty
                ? Color.ccAccent.opacity(0.3)
                : Color.ccAccent
            )
            .cornerRadius(14)
        }
        .disabled(vm.verseChords.isEmpty || vm.selectedSections.isEmpty)
    }

    @ViewBuilder
    private var resultsSection: some View {
        if !vm.results.isEmpty {
            VStack(alignment: .leading, spacing: 16) {
                Label("Results", systemImage: "music.quarternote.3")
                    .font(.system(.headline, design: .default).weight(.semibold))
                    .foregroundColor(.ccText)

                let grouped = Dictionary(grouping: vm.results, by: \.section)
                let sectionOrder = ["Pre-Chorus", "Chorus", "Bridge", "Outro"]

                ForEach(sectionOrder.filter { grouped[$0] != nil }, id: \.self) { section in
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(grouped[section] ?? []) { progression in
                            ProgressionResultCard(
                                progression: progression,
                                onFavorite: { vm.toggleFavorite(progression) },
                                onCopy: { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
                            )
                            .transition(.asymmetric(
                                insertion: .move(edge: .bottom).combined(with: .opacity),
                                removal: .opacity
                            ))
                        }
                    }
                }
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: vm.results.count)
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let width = proposal.width ?? 0
        var height: CGFloat = 0
        var x: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                height += rowHeight + spacing
                x = 0
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        height += rowHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX && x > bounds.minX {
                y += rowHeight + spacing
                x = bounds.minX
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
