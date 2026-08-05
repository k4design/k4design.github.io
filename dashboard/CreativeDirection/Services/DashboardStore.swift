import Foundation
import Observation

/// Talks to the same `/api/snapshot` the web dashboard uses, so the monday token
/// stays on the server and never ships inside the app binary.
enum API {
    static func snapshot(baseURL: String, accessKey: String?, force: Bool = false) async throws -> Snapshot {
        guard var comps = URLComponents(string: baseURL.trimmingCharacters(in: .whitespaces)) else {
            throw APIError.badURL
        }
        comps.path = "/api/snapshot"
        if force { comps.queryItems = [URLQueryItem(name: "force", value: "1")] }
        guard let url = comps.url else { throw APIError.badURL }

        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 20
        // A deployed server gates access with a shared key. Sent as a header so
        // it never lands in a URL, a log, or a browser history.
        if let accessKey, !accessKey.isEmpty {
            req.setValue(accessKey, forHTTPHeaderField: "X-Dashboard-Key")
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, http.statusCode == 401 || http.statusCode == 503 {
            let body = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.needsKey(body?["error"] ?? "This dashboard requires an access key.")
        }
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

    /// The campaign routes: same host and same access key as the snapshot, but
    /// per-request queries, so they are deliberately not part of it.
    static func campaigns(
        baseURL: String, accessKey: String?, path: String, query: [URLQueryItem]
    ) async throws -> [Campaign] {
        guard var comps = URLComponents(string: baseURL.trimmingCharacters(in: .whitespaces)) else {
            throw APIError.badURL
        }
        comps.path = path
        comps.queryItems = query
        guard let url = comps.url else { throw APIError.badURL }

        var req = URLRequest(url: url)
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 25
        if let accessKey, !accessKey.isEmpty {
            req.setValue(accessKey, forHTTPHeaderField: "X-Dashboard-Key")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            let payload = try? JSONDecoder().decode([String: String].self, from: data)
            throw APIError.server(payload?["error"] ?? "HTTP \(http.statusCode)")
        }
        struct Wrapper: Codable { let rows: [Campaign]? }
        return (try JSONDecoder().decode(Wrapper.self, from: data)).rows ?? []
    }

    enum APIError: LocalizedError {
        case badURL
        case server(String)
        case needsKey(String)

        var errorDescription: String? {
            switch self {
            case .badURL: return "That server address isn't a valid URL."
            case .server(let m), .needsKey(let m): return m
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
    /// "system" | "light" | "dark". Applied at the app root; changing it takes
    /// effect immediately, no save step.
    var appearance: String {
        didSet { UserDefaults.standard.set(appearance, forKey: "appearance") }
    }
    /// Whether weekly recurring work counts in the capacity view.
    var showRecurring: Bool {
        didSet { UserDefaults.standard.set(showRecurring, forKey: "showRecurring") }
    }
    /// Kept in the Keychain, not UserDefaults — it is a credential.
    var accessKey: String {
        didSet { Keychain.set(accessKey, for: "accessKey") }
    }
    /// Pinned campaign ids, comma-joined.
    var pinnedRaw: String {
        didSet { UserDefaults.standard.set(pinnedRaw, forKey: "pinnedCampaigns") }
    }
    /// Set when the server rejected us for a missing or wrong key, so the UI can
    /// ask for it rather than showing a generic failure.
    var needsAccessKey = false

    // MARK: - Live state

    var snapshot: Snapshot?
    /// Campaign search + pin state. Transient except for the id list.
    var searchResults: [Campaign] = []
    var searchError: String?
    var isSearching = false
    var pinnedCampaigns: [Campaign] = []
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
        accessKey = Keychain.get("accessKey") ?? ""
        appearance = UserDefaults.standard.string(forKey: "appearance") ?? "system"
        showRecurring = UserDefaults.standard.bool(forKey: "showRecurring")
        pinnedRaw = UserDefaults.standard.string(forKey: "pinnedCampaigns") ?? ""
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

    /// nil only when the integration is switched off server-side; otherwise the
    /// feed carries its own connected/reason so the section can explain itself.
    var campaignFeed: CampaignFeed? { snapshot?.campaigns }

    /// The global filter field applies to campaigns too, so searching a listing
    /// address narrows the rail alongside every board panel.
    func matches(_ campaign: Campaign) -> Bool {
        guard !filter.isEmpty else { return true }
        let q = filter.lowercased()
        return campaign.name.lowercased().contains(q)
            || (campaign.groupName ?? "").lowercased().contains(q)
            || (campaign.advertiserName ?? "").lowercased().contains(q)
            || (campaign.channel ?? "").lowercased().contains(q)
            || (campaign.state ?? "").lowercased().contains(q)
    }

    func filtered(_ campaigns: [Campaign]) -> [Campaign] { campaigns.filter(matches) }

    // MARK: - Campaign search and pinning
    //
    // Pins live on the client, not in server config: pinning is a per-person
    // "keep an eye on this" and must not need a deploy. The server resolves the
    // ids on demand through /api/campaigns.

    /// Comma-joined ids — @AppStorage can't hold an array, and this stays
    /// readable in `defaults read` when something needs debugging.
    var pinnedIDs: [String] {
        get { pinnedRaw.split(separator: ",").map(String.init).filter { !$0.isEmpty } }
        set {
            pinnedRaw = newValue.joined(separator: ",")
            Task { await loadPinned() }
        }
    }

    func isPinned(_ campaign: Campaign) -> Bool { pinnedIDs.contains(campaign.id) }

    func togglePin(_ campaign: Campaign) {
        var ids = pinnedIDs
        if let i = ids.firstIndex(of: campaign.id) { ids.remove(at: i) } else { ids.append(campaign.id) }
        pinnedIDs = ids
    }

    /// Free-text search across every advertiser in the account — the allowlist
    /// is bypassed on purpose, since finding a campaign is the prerequisite to
    /// pinning one from elsewhere.
    func searchCampaigns(_ query: String) async {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        searchError = nil
        guard q.count >= 2 else { searchResults = []; return }
        isSearching = true
        defer { isSearching = false }
        do {
            searchResults = try await API.campaigns(
                baseURL: baseURL, accessKey: accessKey, path: "/api/campaigns/search",
                query: [URLQueryItem(name: "q", value: q)]
            )
        } catch {
            searchResults = []
            searchError = error.localizedDescription
        }
    }

    /// Pinned campaigns are fetched separately from the snapshot, because the
    /// snapshot is one shared cached payload and these ids are per-client.
    func loadPinned() async {
        let ids = pinnedIDs
        guard !ids.isEmpty else { pinnedCampaigns = []; return }
        do {
            pinnedCampaigns = try await API.campaigns(
                baseURL: baseURL, accessKey: accessKey, path: "/api/campaigns",
                query: [URLQueryItem(name: "ids", value: ids.joined(separator: ","))]
            )
        } catch {
            // A failure here leaves the previous list in place rather than
            // blanking a section the user deliberately curated.
        }
    }

    /// What the rail shows: the window rows from the snapshot, plus pinned
    /// campaigns the snapshot didn't already include (a pin under an
    /// allowlisted advertiser arrives in the snapshot already).
    var railCampaigns: [Campaign] {
        var rows = campaignFeed?.campaigns ?? []
        let have = Set(rows.map(\.id))
        rows += pinnedCampaigns.filter { !have.contains($0.id) }
        return rows.sorted {
            switch ($0.daysToEnd, $1.daysToEnd) {
            case let (a?, b?): return a == b ? $0.name < $1.name : a < b
            case (nil, _?): return false
            case (_?, nil): return true
            default: return $0.name < $1.name
            }
        }
    }

    // MARK: - Loading

    func load(force: Bool = false) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let fresh = try await API.snapshot(baseURL: baseURL, accessKey: accessKey, force: force)
            snapshot = fresh
            lastLoaded = Date()
            // A payload can be valid and still carry a soft error (stale data
            // after an API hiccup) — keep showing the data, flag the problem.
            errorMessage = fresh.error
            needsAccessKey = false
            await loadPinned()
            if scopes.contains(where: { $0.key == scope }) == false, let first = scopes.first {
                scope = first.key
            }
        } catch let error as API.APIError {
            if case .needsKey(let message) = error {
                needsAccessKey = true
                errorMessage = message
                stopTicker()   // polling would only be rejected again
            } else {
                errorMessage = error.localizedDescription
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
