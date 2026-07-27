import Foundation
import Observation

/// Talks to the same `/api/snapshot` the web dashboard uses, so the monday token
/// stays on the server and never ships inside the app binary.
enum API {
    static func snapshot(baseURL: String, force: Bool = false) async throws -> Snapshot {
        guard var comps = URLComponents(string: baseURL.trimmingCharacters(in: .whitespaces)) else {
            throw APIError.badURL
        }
        comps.path = "/api/snapshot"
        if force { comps.queryItems = [URLQueryItem(name: "force", value: "1")] }
        guard let url = comps.url else { throw APIError.badURL }

        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 20

        let (data, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            // The server sends a JSON body explaining itself (e.g. a missing
            // token on Netlify); surface that rather than a bare status code.
            if let payload = try? JSONDecoder().decode([String: String].self, from: data),
               let message = payload["error"] {
                throw APIError.server(message)
            }
            throw APIError.server("HTTP \(http.statusCode)")
        }
        return try JSONDecoder().decode(Snapshot.self, from: data)
    }

    enum APIError: LocalizedError {
        case badURL
        case server(String)

        var errorDescription: String? {
            switch self {
            case .badURL: return "That server address isn't a valid URL."
            case .server(let m): return m
            }
        }
    }
}

@MainActor
@Observable
final class DashboardStore {

    // MARK: - Persisted settings

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: "baseURL") }
    }
    var scope: String {
        didSet { UserDefaults.standard.set(scope, forKey: "scope") }
    }

    // MARK: - Live state

    var snapshot: Snapshot?
    var errorMessage: String?
    var isLoading = false
    var lastLoaded: Date?
    var filter = ""

    private var ticker: Task<Void, Never>?

    init() {
        let saved = UserDefaults.standard.string(forKey: "baseURL")
        // localhost is the only address that is reliably correct on first run:
        // it works immediately in the simulator, and a hardcoded LAN IP would
        // be wrong the moment DHCP reassigns it (this Mac moved from
        // 192.168.1.87 to 192.168.2.152 during development). On a real device,
        // set the Mac's current address in Settings.
        baseURL = saved?.isEmpty == false ? saved! : "http://localhost:5180"
        scope = UserDefaults.standard.string(forKey: "scope") ?? "design"
    }

    // MARK: - Derived

    var slice: ScopeSlice? { snapshot?.slice(scope) }
    var scopes: [ScopeInfo] { snapshot?.scopeList ?? [] }

    /// Colour slot for a person, straight from the server roster so the phone
    /// and the browser agree.
    func slot(for person: String?) -> Int {
        guard let person, let roster = snapshot?.roster else { return 0 }
        return roster[person] ?? 0
    }

    /// Activity is shared across scopes, so narrow it to the active boards.
    var scopedActivity: [ActivityEntry] {
        guard let snapshot else { return [] }
        guard let ids = snapshot.scopeList.first(where: { $0.key == scope })?.boardIds else {
            return snapshot.activity
        }
        return snapshot.activity.filter { ids.contains($0.boardId) }
    }

    /// The same fields the web filter matches on, so muscle memory carries over.
    func matches(_ item: Item) -> Bool {
        guard !filter.isEmpty else { return true }
        let q = filter.lowercased()
        return item.name.lowercased().contains(q)
            || item.people.contains { $0.lowercased().contains(q) }
            || item.boardLabel.lowercased().contains(q)
            || (item.status ?? "").lowercased().contains(q)
            || (item.parentName ?? "").lowercased().contains(q)
    }

    func filtered(_ items: [Item]) -> [Item] { items.filter(matches) }

    // MARK: - Loading

    func load(force: Bool = false) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let fresh = try await API.snapshot(baseURL: baseURL, force: force)
            snapshot = fresh
            lastLoaded = Date()
            // A payload can be valid and still carry a soft error (stale data
            // after an API hiccup) — keep showing the data, flag the problem.
            errorMessage = fresh.error
            if scopes.contains(where: { $0.key == scope }) == false, let first = scopes.first {
                scope = first.key
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Polls only while the app is in the foreground; `startTicker` is called on
    /// appear and `stopTicker` on background, so a phone in a pocket does no work.
    func startTicker() {
        stopTicker()
        let seconds = max(15, snapshot?.pollSeconds ?? 30)
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(seconds))
                if Task.isCancelled { return }
                await self?.load()
            }
        }
    }

    func stopTicker() {
        ticker?.cancel()
        ticker = nil
    }
}
