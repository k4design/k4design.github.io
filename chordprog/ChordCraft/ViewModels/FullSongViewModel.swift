import Foundation
import SwiftUI

@MainActor
class FullSongViewModel: ObservableObject {
    @Published var selectedKey: String = "C"
    @Published var selectedScale: String = "Major"
    @Published var selectedGenre: String = "Pop"
    @Published var tempoFeel: String = ""
    @Published var emotionalVibe: String = ""
    @Published var songStructure: SongStructure?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    let keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    let scales = ["Major", "Natural Minor", "Dorian", "Mixolydian", "Lydian", "Phrygian"]
    let genres = ["Pop", "Rock", "Folk", "Jazz", "R&B", "Country", "Electronic"]

    private let historyKey = "fullsong_history"
    private let savedKey = "saved_progressions"

    func generate() async {
        isLoading = true
        errorMessage = nil
        songStructure = nil

        do {
            let response = try await AnthropicService.shared.generateFullSong(
                key: selectedKey,
                scale: selectedScale,
                genre: selectedGenre,
                tempoFeel: tempoFeel,
                emotionalVibe: emotionalVibe
            )

            let progressions = response.progressions.map { item in
                ChordProgression(
                    section: item.section,
                    chords: item.chords,
                    romanNumerals: item.romanNumerals,
                    description: item.description,
                    feel: item.feel,
                    variation: item.variation
                )
            }

            let structure = SongStructure(
                key: response.key,
                scale: response.scale,
                genre: response.genre,
                sections: progressions,
                overallFeel: response.overallFeel
            )

            songStructure = structure
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            saveSession(structure)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }

        isLoading = false
    }

    func toggleFavorite(progression: ChordProgression) {
        guard var structure = songStructure else { return }
        guard let index = structure.sections.firstIndex(where: { $0.id == progression.id }) else { return }

        var updatedSections = structure.sections
        updatedSections[index].isFavorited.toggle()

        songStructure = SongStructure(
            id: structure.id,
            key: structure.key,
            scale: structure.scale,
            genre: structure.genre,
            sections: updatedSections,
            overallFeel: structure.overallFeel,
            createdAt: structure.createdAt
        )

        if updatedSections[index].isFavorited {
            saveFavorite(updatedSections[index])
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    // MARK: - Persistence

    private func saveFavorite(_ progression: ChordProgression) {
        var saved = loadSavedProgressions()
        if !saved.contains(where: { $0.id == progression.id }) {
            saved.append(progression)
        }
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: savedKey)
        }
    }

    func loadSavedProgressions() -> [ChordProgression] {
        guard let data = UserDefaults.standard.data(forKey: savedKey),
              let progressions = try? JSONDecoder().decode([ChordProgression].self, from: data) else {
            return []
        }
        return progressions
    }

    private func saveSession(_ structure: SongStructure) {
        var history = loadHistory()
        let session = GenerationSession(
            type: .fullSong,
            progressions: structure.sections,
            songStructure: structure
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
}
