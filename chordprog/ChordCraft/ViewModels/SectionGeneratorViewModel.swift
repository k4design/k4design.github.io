import Foundation
import SwiftUI

@MainActor
class SectionGeneratorViewModel: ObservableObject {
    @Published var verseChords: [String] = []
    @Published var detectedKey: String = "C Major"
    @Published var selectedSections: Set<String> = ["Chorus"]
    @Published var variationCount: Int = 2
    @Published var results: [ChordProgression] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    private let storageKey = "saved_progressions"
    private let historyKey = "generation_history"

    func addChord(_ chord: String) {
        verseChords.append(chord)
        updateDetectedKey()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    func removeChord(at index: Int) {
        guard verseChords.indices.contains(index) else { return }
        verseChords.remove(at: index)
        updateDetectedKey()
    }

    func moveChord(from source: IndexSet, to destination: Int) {
        verseChords.move(fromOffsets: source, toOffset: destination)
    }

    func toggleSection(_ section: String) {
        if selectedSections.contains(section) {
            selectedSections.remove(section)
        } else {
            selectedSections.insert(section)
        }
    }

    private func updateDetectedKey() {
        guard !verseChords.isEmpty else {
            detectedKey = "C Major"
            return
        }
        detectedKey = MusicTheoryHelpers.detectKey(from: verseChords)
    }

    func generate() async {
        guard !verseChords.isEmpty else {
            showErrorMessage("Please add at least one verse chord.")
            return
        }
        guard !selectedSections.isEmpty else {
            showErrorMessage("Please select at least one section to generate.")
            return
        }

        isLoading = true
        errorMessage = nil
        results = []

        do {
            let response = try await AnthropicService.shared.generateSectionProgressions(
                verseChords: verseChords,
                key: detectedKey,
                sections: Array(selectedSections).sorted(),
                variations: variationCount
            )

            results = response.progressions.map { item in
                ChordProgression(
                    section: item.section,
                    chords: item.chords,
                    romanNumerals: item.romanNumerals,
                    description: item.description,
                    feel: item.feel,
                    variation: item.variation
                )
            }

            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            saveSession()
        } catch {
            showErrorMessage(error.localizedDescription)
        }

        isLoading = false
    }

    func toggleFavorite(_ progression: ChordProgression) {
        if let index = results.firstIndex(where: { $0.id == progression.id }) {
            results[index].isFavorited.toggle()
            if results[index].isFavorited {
                saveFavorite(results[index])
            } else {
                removeFavorite(progression.id)
            }
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    // MARK: - Persistence

    private func saveFavorite(_ progression: ChordProgression) {
        var saved = loadSavedProgressions()
        saved.append(progression)
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func removeFavorite(_ id: UUID) {
        var saved = loadSavedProgressions()
        saved.removeAll { $0.id == id }
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    func loadSavedProgressions() -> [ChordProgression] {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let progressions = try? JSONDecoder().decode([ChordProgression].self, from: data) else {
            return []
        }
        return progressions
    }

    private func saveSession() {
        var history = loadHistory()
        let session = GenerationSession(
            type: .sectionGenerator,
            progressions: results
        )
        history.insert(session, at: 0)
        if history.count > 10 { history = Array(history.prefix(10)) }
        if let data = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(data, forKey: historyKey)
        }
    }

    func loadHistory() -> [GenerationSession] {
        guard let data = UserDefaults.standard.data(forKey: historyKey),
              let sessions = try? JSONDecoder().decode([GenerationSession].self, from: data) else {
            return []
        }
        return sessions
    }

    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
