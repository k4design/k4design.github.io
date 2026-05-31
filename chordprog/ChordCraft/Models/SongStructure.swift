import Foundation

struct SongStructure: Identifiable, Codable {
    var id: UUID
    let key: String
    let scale: String
    let genre: String
    let sections: [ChordProgression]
    let overallFeel: String
    let createdAt: Date

    init(
        id: UUID = UUID(),
        key: String,
        scale: String,
        genre: String,
        sections: [ChordProgression],
        overallFeel: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.key = key
        self.scale = scale
        self.genre = genre
        self.sections = sections
        self.overallFeel = overallFeel
        self.createdAt = createdAt
    }

    var exportText: String {
        var lines = ["ChordCraft — \(key) \(scale) (\(genre))", "Feel: \(overallFeel)", ""]
        for section in sections {
            lines.append("[\(section.section)]")
            lines.append(section.chordsText)
            lines.append("")
        }
        return lines.joined(separator: "\n")
    }
}

struct FullSongResponse: Codable {
    let key: String
    let scale: String
    let genre: String
    let overallFeel: String
    let progressions: [ProgressionItem]

    enum CodingKeys: String, CodingKey {
        case key, scale, genre, progressions
        case overallFeel = "overall_feel"
    }
}

struct GenerationSession: Identifiable, Codable {
    var id: UUID
    let type: SessionType
    let progressions: [ChordProgression]
    let songStructure: SongStructure?
    let createdAt: Date

    enum SessionType: String, Codable {
        case sectionGenerator
        case fullSong
    }

    init(
        id: UUID = UUID(),
        type: SessionType,
        progressions: [ChordProgression],
        songStructure: SongStructure? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.type = type
        self.progressions = progressions
        self.songStructure = songStructure
        self.createdAt = createdAt
    }
}
