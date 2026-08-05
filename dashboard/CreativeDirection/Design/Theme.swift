import SwiftUI

/// The web dashboard's palette, unchanged. Status roles and assignee slots are
/// the same hexes, so the two surfaces read as one product — and the assignee
/// slot numbers come from the API, so a person's colour matches across both.
enum Theme {

    // MARK: - Status roles (fixed, never themed; always paired with an icon + label)

    static let good = Color(hex: 0x0CA30C)
    static let warning = Color(hex: 0xFAB219)
    static let serious = Color(hex: 0xEC835A)
    static let critical = Color(hex: 0xD03B3B)

    static func role(_ name: String?) -> Color {
        switch name {
        case "critical": return critical
        case "serious": return serious
        case "warning": return warning
        case "good": return good
        default: return .secondary
        }
    }

    /// Hue never carries meaning alone — every status colour ships with this.
    static func roleIcon(_ name: String?) -> String {
        switch name {
        case "critical": return "exclamationmark.triangle.fill"
        case "serious": return "diamond.fill"
        case "warning": return "circle.fill"
        case "good": return "checkmark"
        default: return "circle"
        }
    }

    // MARK: - Capacity chart lanes (validator-passing trio + neutral)

    static let laneIdle = Color(hex: 0x4A4A46)
    static let laneFlight = Color(hex: 0x3987E5)
    static let laneYou = Color(hex: 0xC98500)
    static let laneStalled = Color(hex: 0xD03B3B)
    /// Recurring weekly work — lavender step validated all-pairs vs the trio.
    static let laneRecurring = Color(hex: 0xB39DDB)

    static func lane(_ key: String) -> Color {
        switch key {
        case "flight": return laneFlight
        case "you": return laneYou
        case "stalled": return laneStalled
        case "recurring": return laneRecurring
        default: return laneIdle
        }
    }

    // MARK: - Assignee slots
    //
    // Best-measured five-hue subset of the categorical palette. Worst all-pairs
    // normal-vision ΔE is 11.9, under the 15 floor, so colour CANNOT carry
    // identity: the initials sit inside the swatch and the name sits beside it.
    // Colour is a scanning aid only. Ink per swatch chosen by measured contrast.

    private static let slotFills: [Color] = [
        Color(hex: 0x4A4A46),  // 0 neutral / unassigned
        Color(hex: 0x3987E5),  // 1 blue
        Color(hex: 0x199E70),  // 2 aqua
        Color(hex: 0xC98500),  // 3 yellow
        Color(hex: 0x008300),  // 4 green
        Color(hex: 0xE66767),  // 5 red
    ]

    private static let slotInks: [Color] = [
        .white,
        Color(hex: 0x0B0B0B),
        Color(hex: 0x0B0B0B),
        Color(hex: 0x0B0B0B),
        .white,
        Color(hex: 0x0B0B0B),
    ]

    static func slotFill(_ slot: Int) -> Color {
        slotFills[max(0, min(slot, slotFills.count - 1))]
    }

    static func slotInk(_ slot: Int) -> Color {
        slotInks[max(0, min(slot, slotInks.count - 1))]
    }

    // MARK: - Metrics

    static let corner: CGFloat = 14
    static let cardCorner: CGFloat = 11
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

// MARK: - Formatting

enum Fmt {
    static func initials(_ name: String) -> String {
        name.split(separator: " ").prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
    }

    /// Compact relative age: 40s / 12m / 5h / 3d — matches the web feed.
    static func ago(_ iso: String?) -> String {
        guard let date = parseISO(iso) else { return "" }
        let s = max(0, Date().timeIntervalSince(date))
        if s < 60 { return "\(Int(s))s" }
        if s < 3600 { return "\(Int(s / 60))m" }
        if s < 86_400 { return "\(Int(s / 3600))h" }
        return "\(Int(s / 86_400))d"
    }

    /// Date and time a label was applied, in the reader's own timezone:
    /// "Jul 28, 2:29 PM". Same day still shows the date — a proof sent this
    /// morning and one sent last Tuesday should not read identically.
    static func stamp(_ iso: String?) -> String? {
        guard let date = parseISO(iso) else { return nil }
        return date.formatted(.dateTime.month(.abbreviated).day().hour().minute())
    }

    static func clock(_ iso: String?) -> String {
        guard let date = parseISO(iso) else { return "—" }
        return date.formatted(date: .omitted, time: .shortened)
    }

    /// The payload mixes two ISO shapes: the dashboard's own timestamps carry
    /// fractional seconds ("…08.926Z") while monday's created/updated fields do
    /// not ("…19:00:12Z"). A formatter configured for one rejects the other, so
    /// try both rather than silently returning nil for half the dates.
    static func parseISO(_ iso: String?) -> Date? {
        guard let iso, !iso.isEmpty else { return nil }
        return ISO8601DateFormatter.withFraction.date(from: iso)
            ?? ISO8601DateFormatter.plain.date(from: iso)
    }
}

extension ISO8601DateFormatter {
    static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}
