import Foundation

struct ChordProgression: Identifiable, Codable {
    var id: UUID
    let section: String
    let chords: [String]
    let romanNumerals: [String]
    let description: String
    let feel: String
    var isFavorited: Bool
    let variation: Int
    let createdAt: Date

    init(
        id: UUID = UUID(),
        section: String,
        chords: [String],
        romanNumerals: [String],
        description: String,
        feel: String,
        isFavorited: Bool = false,
        variation: Int = 1,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.section = section
        self.chords = chords
        self.romanNumerals = romanNumerals
        self.description = description
        self.feel = feel
        self.isFavorited = isFavorited
        self.variation = variation
        self.createdAt = createdAt
    }

    var chordsText: String {
        chords.joined(separator: " - ")
    }
}

// Response types for JSON decoding
struct ProgressionResponse: Codable {
    let key: String
    let progressions: [ProgressionItem]
}

struct ProgressionItem: Codable {
    let section: String
    let variation: Int
    let chords: [String]
    let romanNumerals: [String]
    let feel: String
    let description: String

    enum CodingKeys: String, CodingKey {
        case section, variation, chords, feel, description
        case romanNumerals = "roman_numerals"
    }
}
