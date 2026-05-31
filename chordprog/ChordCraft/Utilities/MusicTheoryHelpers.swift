import Foundation

enum MusicTheoryHelpers {

    static let allNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    static let enharmonics: [String: String] = [
        "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"
    ]

    static let majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]
    static let minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10]
    static let dorianIntervals = [0, 2, 3, 5, 7, 9, 10]
    static let mixolydianIntervals = [0, 2, 4, 5, 7, 9, 10]
    static let lydianIntervals = [0, 2, 4, 6, 7, 9, 11]
    static let phrygianIntervals = [0, 1, 3, 5, 7, 8, 10]

    static let chordQualities = [
        "maj", "min", "7", "maj7", "m7", "sus2", "sus4", "dim", "aug", "m7b5", "add9"
    ]

    static let roots = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F",
                        "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]

    // MARK: - Key Detection

    static func detectKey(from chords: [String]) -> String {
        let roots = chords.compactMap { parseRoot(from: $0) }
        guard !roots.isEmpty else { return "C Major" }

        var bestKey = "C Major"
        var bestScore = -1

        for note in allNotes {
            let majorScore = score(roots: roots, key: note, intervals: majorScaleIntervals)
            let minorScore = score(roots: roots, key: note, intervals: minorScaleIntervals)

            if majorScore > bestScore {
                bestScore = majorScore
                bestKey = "\(note) Major"
            }
            if minorScore > bestScore {
                bestScore = minorScore
                bestKey = "\(note) Minor"
            }
        }
        return bestKey
    }

    private static func score(roots: [String], key: String, intervals: [Int]) -> Int {
        guard let keyIndex = noteIndex(key) else { return 0 }
        let scaleNotes = intervals.map { (keyIndex + $0) % 12 }
        return roots.filter { r in
            guard let idx = noteIndex(r) else { return false }
            return scaleNotes.contains(idx)
        }.count
    }

    // MARK: - Roman Numerals

    static func chordToRomanNumeral(chord: String, inKey: String) -> String {
        let parts = inKey.split(separator: " ", maxSplits: 1)
        guard parts.count == 2,
              let keyIndex = noteIndex(String(parts[0])) else { return "?" }

        let scaleName = String(parts[1]).lowercased()
        let intervals: [Int]
        switch scaleName {
        case "major": intervals = majorScaleIntervals
        case "minor", "natural minor": intervals = minorScaleIntervals
        case "dorian": intervals = dorianIntervals
        case "mixolydian": intervals = mixolydianIntervals
        case "lydian": intervals = lydianIntervals
        case "phrygian": intervals = phrygianIntervals
        default: intervals = majorScaleIntervals
        }

        guard let chordRoot = parseRoot(from: chord),
              let chordIndex = noteIndex(chordRoot) else { return "?" }

        let degree = (chordIndex - keyIndex + 12) % 12
        guard let position = intervals.firstIndex(of: degree) else { return "?" }

        let numerals = ["I", "II", "III", "IV", "V", "VI", "VII"]
        let numeral = numerals[position]
        let quality = parseQuality(from: chord)
        let isMinor = quality.contains("m") && !quality.contains("maj") || quality == "dim"

        return isMinor ? numeral.lowercased() : numeral
    }

    // MARK: - Parsing

    static func parseRoot(from chord: String) -> String? {
        if chord.count >= 2 {
            let twoChar = String(chord.prefix(2))
            if twoChar.last == "#" || twoChar.last == "b" {
                return enharmonics[twoChar] ?? twoChar
            }
        }
        let oneChar = String(chord.prefix(1))
        if oneChar.first?.isUppercase == true {
            return oneChar
        }
        return nil
    }

    static func parseQuality(from chord: String) -> String {
        guard let root = parseRoot(from: chord) else { return "maj" }
        return String(chord.dropFirst(root.count))
    }

    static func noteIndex(_ note: String) -> Int? {
        let normalized = enharmonics[note] ?? note
        return allNotes.firstIndex(of: normalized)
    }

    // MARK: - Chord Color Category

    enum ChordColorCategory {
        case major, minor, dominant, diminished, augmented, suspended, other
    }

    static func colorCategory(for chord: String) -> ChordColorCategory {
        let quality = parseQuality(from: chord).lowercased()
        if quality.isEmpty || quality == "maj" || quality == "maj7" || quality == "add9" {
            return .major
        } else if quality.hasPrefix("m") && !quality.contains("maj") {
            return .minor
        } else if quality == "7" || quality.contains("dom") {
            return .dominant
        } else if quality == "dim" || quality == "m7b5" {
            return .diminished
        } else if quality == "aug" {
            return .augmented
        } else if quality.contains("sus") {
            return .suspended
        }
        return .other
    }
}
