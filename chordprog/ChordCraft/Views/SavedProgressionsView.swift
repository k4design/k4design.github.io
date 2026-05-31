import SwiftUI

struct SavedProgressionsView: View {
    @Environment(\.dismiss) var dismiss
    @State private var savedProgressions: [ChordProgression] = []
    @State private var selectedFilter: String = "All"

    private let sections = ["All", "Chorus", "Verse", "Pre-Chorus", "Bridge", "Outro", "Intro"]
    private let storageKey = "saved_progressions"

    var filtered: [ChordProgression] {
        if selectedFilter == "All" { return savedProgressions }
        return savedProgressions.filter { $0.section == selectedFilter }
    }

    var grouped: [String: [ChordProgression]] {
        Dictionary(grouping: filtered, by: \.section)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.ccBackground.ignoresSafeArea()
                VStack(spacing: 0) {
                    filterBar
                    if savedProgressions.isEmpty {
                        emptyState
                    } else if filtered.isEmpty {
                        noResultsState
                    } else {
                        progressionsList
                    }
                }
            }
            .navigationTitle("Saved")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.ccAccent)
                }
            }
            .onAppear { loadSaved() }
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(sections, id: \.self) { section in
                    let isSelected = selectedFilter == section
                    Button(section) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedFilter = section
                        }
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    }
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(isSelected ? .black : .ccText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(isSelected ? Color.ccAccent : Color.ccCard)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(isSelected ? Color.clear : Color.ccBorder, lineWidth: 1))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
    }

    private var progressionsList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12, pinnedViews: .sectionHeaders) {
                let sectionOrder = ["Intro", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Outro"]
                ForEach(sectionOrder.filter { grouped[$0] != nil }, id: \.self) { section in
                    Section {
                        ForEach(grouped[section] ?? []) { progression in
                            ProgressionResultCard(
                                progression: progression,
                                onFavorite: { removeSaved(progression) },
                                onCopy: {}
                            )
                            .padding(.horizontal, 20)
                        }
                    } header: {
                        Text(section)
                            .font(.system(.caption, design: .rounded).weight(.bold))
                            .foregroundColor(Color.sectionColor(section))
                            .padding(.horizontal, 20)
                            .padding(.vertical, 6)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.ccBackground)
                    }
                }
            }
            .padding(.vertical, 8)
            .padding(.bottom, 24)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "heart.slash")
                .font(.system(size: 56))
                .foregroundColor(.ccTextSecondary.opacity(0.3))
            Text("No saved progressions yet")
                .font(.system(.title3).weight(.medium))
                .foregroundColor(.ccText)
            Text("Tap the heart on any result card to save it here.")
                .font(.system(.subheadline))
                .foregroundColor(.ccTextSecondary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(40)
    }

    private var noResultsState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.ccTextSecondary.opacity(0.3))
            Text("No \(selectedFilter) progressions saved")
                .font(.system(.body))
                .foregroundColor(.ccTextSecondary)
            Spacer()
        }
    }

    private func loadSaved() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let progressions = try? JSONDecoder().decode([ChordProgression].self, from: data) else {
            savedProgressions = []
            return
        }
        savedProgressions = progressions
    }

    private func removeSaved(_ progression: ChordProgression) {
        savedProgressions.removeAll { $0.id == progression.id }
        if let data = try? JSONEncoder().encode(savedProgressions) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }
}
