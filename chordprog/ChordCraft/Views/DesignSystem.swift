import SwiftUI

// MARK: - Colors

extension Color {
    static let ccBackground = Color(hex: "#0D0D14")
    static let ccSurface = Color(hex: "#12121E")
    static let ccCard = Color(hex: "#1A1A2E")
    static let ccAccent = Color(hex: "#F5A623")
    static let ccTeal = Color(hex: "#4ECDC4")
    static let ccText = Color.white
    static let ccTextSecondary = Color(white: 0.6)
    static let ccBorder = Color(white: 1, opacity: 0.08)

    static let ccIntro = Color(hex: "#6C7BFF")
    static let ccVerse = Color(hex: "#4ECDC4")
    static let ccPreChorus = Color(hex: "#A78BFA")
    static let ccChorus = Color(hex: "#F5A623")
    static let ccBridge = Color(hex: "#F87171")
    static let ccOutro = Color(hex: "#6EE7B7")

    // Chord quality colors
    static let chordMajor = Color(hex: "#F5A623")
    static let chordMinor = Color(hex: "#4ECDC4")
    static let chordDominant = Color(hex: "#A78BFA")
    static let chordDiminished = Color(hex: "#F87171")
    static let chordAugmented = Color(hex: "#FCD34D")
    static let chordSuspended = Color(hex: "#6EE7B7")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }

    static func sectionColor(_ section: String) -> Color {
        switch section.lowercased() {
        case "intro": return .ccIntro
        case "verse": return .ccVerse
        case "pre-chorus", "prechorus": return .ccPreChorus
        case "chorus": return .ccChorus
        case "bridge": return .ccBridge
        case "outro": return .ccOutro
        default: return .ccAccent
        }
    }

    static func chordQualityColor(_ chord: String) -> Color {
        switch MusicTheoryHelpers.colorCategory(for: chord) {
        case .major: return .chordMajor
        case .minor: return .chordMinor
        case .dominant: return .chordDominant
        case .diminished: return .chordDiminished
        case .augmented: return .chordAugmented
        case .suspended: return .chordSuspended
        case .other: return .ccTeal
        }
    }
}

// MARK: - Fonts

extension Font {
    static func ccDisplay(_ size: CGFloat) -> Font {
        if #available(iOS 17, *) {
            return Font.custom("NewYork-Regular", size: size).weight(.bold)
        }
        return Font.custom("Georgia-Bold", size: size)
    }

    static func ccHeadline(_ size: CGFloat) -> Font {
        if #available(iOS 17, *) {
            return Font.custom("NewYork-Regular", size: size).weight(.semibold)
        }
        return Font.custom("Georgia", size: size)
    }
}

// MARK: - View Modifiers

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.ccCard)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.ccBorder, lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardModifier())
    }
}

// MARK: - Loading Overlay

struct LoadingOverlay: View {
    let message: String

    var body: some View {
        ZStack {
            Color.black.opacity(0.5).ignoresSafeArea()
            VStack(spacing: 20) {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .ccAccent))
                    .scaleEffect(1.5)
                Text(message)
                    .font(.system(.body, design: .default).weight(.medium))
                    .foregroundColor(.ccText)
            }
            .padding(32)
            .background(Color.ccCard)
            .cornerRadius(20)
        }
    }
}
