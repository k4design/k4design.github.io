import Foundation

// Mirrors the /api/snapshot payload the web dashboard already serves. Nothing is
// re-derived here on purpose: lanes, the focus ranking, capacity, rot and hygiene
// are all computed once in lib/derive.js so the phone and the browser can never
// disagree about what "overdue" means.

// MARK: - Items

struct Item: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let url: String
    let boardId: String
    let boardLabel: String
    let isSub: Bool
    let parentName: String?
    let status: String?
    let people: [String]
    let lane: String
    let laneLabel: String
    let due: String?
    let daysToDue: Int?
    let overdue: Bool
    let daysOverdue: Int
    let daysStale: Int?
    /// Cold / Warm / Hot from the board's temperature column (Aperture only).
    let temperature: String?
    /// True when the board marks this Cold. The server already excludes these
    /// from every alert list, so the app just labels them where they do appear.
    let alertSuppressed: Bool?

    // focus list only
    let score: Int?
    let reasons: [Reason]?

    // intake board only
    let ageDays: Int?
    let untriaged: Bool?
    let priority: String?
    let requester: String?
    let requestType: String?

    var owner: String? { people.first }

    struct Reason: Codable, Hashable {
        let kind: String
        let role: String
        let text: String
    }
}

// MARK: - Aggregates

struct Headline: Codable, Hashable {
    let needsReview: Int
    let overdue: Int
    let blocked: Int
    let rotting: Int
    let untriaged: Int
    let dueToday: Int
    let openTotal: Int
    let doneTotal: Int
    /// Open items held out of the alert panels for being Cold.
    let coldSuppressed: Int?
}

struct Deadlines: Codable, Hashable {
    let overdue: [Item]
    let today: [Item]
    let thisWeek: [Item]
    let later: [Item]
}

struct Hygiene: Codable, Hashable {
    let scoped: Int
    let dateCoverage: Int
    let assignedCoverage: Int
    let statusCoverage: Int
}

struct LoadRow: Codable, Hashable, Identifiable {
    let person: String
    let total: Int
    let lanes: [String: Int]
    let overdue: Int
    let rotting: Int
    let items: [Item]
    let wip: Int
    let overloaded: Bool
    let blocked: Int

    var id: String { person }

    /// The same four buckets the web capacity chart stacks, in the same order.
    var buckets: [(key: String, label: String, count: Int)] {
        [
            ("idle", "Not started", (lanes["queued"] ?? 0) + (lanes["parked"] ?? 0) + (lanes["unset"] ?? 0)),
            ("flight", "In progress", lanes["active"] ?? 0),
            ("you", "With you for review", lanes["review"] ?? 0),
            ("stalled", "Blocked or waiting", (lanes["blocked"] ?? 0) + (lanes["waiting"] ?? 0)),
        ].filter { $0.count > 0 }
    }
}

/// One board scope's worth of derived data.
struct ScopeSlice: Codable, Hashable {
    let headline: Headline
    let focus: [Item]
    let review: [Item]
    let blocked: [Item]
    let waiting: [Item]
    let rot: [Item]
    let deadlines: Deadlines
    let load: [LoadRow]
    let hygiene: Hygiene
    let intake: [Item]
    let datesTracked: Bool

    var stalled: [Item] { blocked + waiting }
}

// MARK: - Activity

struct ActivityEntry: Codable, Identifiable, Hashable {
    let id: String
    let event: String
    let at: String?
    let boardId: String
    let itemName: String?
    let who: String
    let text: String
    let tone: String
}

// MARK: - Envelope

struct ScopeInfo: Codable, Hashable, Identifiable {
    let key: String
    let label: String
    let boardIds: [String]
    var id: String { key }

    /// "Design Team Board" is too wide for a phone segmented control.
    var shortLabel: String {
        switch key {
        case "design": return "Design"
        case "aperture": return "Aperture"
        case "both": return "Both"
        default: return label
        }
    }
}

struct BoardInfo: Codable, Hashable {
    let id: String
    let label: String
    let itemsCount: Int?
}

struct Snapshot: Codable {
    let fetchedAt: String
    let demo: Bool
    let boards: [BoardInfo]
    let scopeList: [ScopeInfo]
    let scopes: [String: ScopeSlice]
    let activity: [ActivityEntry]
    /// person name → colour slot 1...5, 0 = neutral. Assigned server-side so the
    /// phone and the browser give the same person the same colour.
    let roster: [String: Int]
    let thresholds: Thresholds
    let pollSeconds: Int?
    let error: String?

    struct Thresholds: Codable, Hashable {
        let staleWarnDays: Int
        let reviewWaitWarnDays: Int
        let reviewWaitCriticalDays: Int
        let wipHealthyMax: Int
    }

    func slice(_ scope: String) -> ScopeSlice? {
        scopes[scope] ?? scopes["design"] ?? scopes.values.first
    }
}
