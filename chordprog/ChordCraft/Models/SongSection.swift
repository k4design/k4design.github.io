import Foundation

struct SongSection: Identifiable {
    let id: UUID
    let name: String
    let chords: [String]

    init(id: UUID = UUID(), name: String, chords: [String]) {
        self.id = id
        self.name = name
        self.chords = chords
    }
}

enum SectionType: String, CaseIterable, Identifiable {
    case intro = "Intro"
    case verse = "Verse"
    case preChorus = "Pre-Chorus"
    case chorus = "Chorus"
    case bridge = "Bridge"
    case outro = "Outro"

    var id: String { rawValue }

    var color: String {
        switch self {
        case .intro: return "#6C7BFF"
        case .verse: return "#4ECDC4"
        case .preChorus: return "#A78BFA"
        case .chorus: return "#F5A623"
        case .bridge: return "#F87171"
        case .outro: return "#6EE7B7"
        }
    }

    var order: Int {
        switch self {
        case .intro: return 0
        case .verse: return 1
        case .preChorus: return 2
        case .chorus: return 3
        case .bridge: return 4
        case .outro: return 5
        }
    }
}

enum GeneratableSectionType: String, CaseIterable, Identifiable {
    case preChorus = "Pre-Chorus"
    case chorus = "Chorus"
    case bridge = "Bridge"
    case outro = "Outro"

    var id: String { rawValue }
}
