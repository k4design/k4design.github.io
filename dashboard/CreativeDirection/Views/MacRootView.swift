#if os(macOS)
import SwiftUI

/// The Mac shell, structured like the web dashboard rather than the phone app:
/// a top bar, a KPI strip, three tabbed views of panelled columns, and a rail
/// pinned to the right at exactly 25% carrying incoming requests above live
/// activity — with the same draggable border between them.
///
/// The window never scrolls. Each panel scrolls inside itself, so the shape of
/// the dashboard stays fixed while the contents change.
struct MacRootView: View {
    @Environment(DashboardStore.self) private var store

    /// Persisted, matching the web dashboard, which remembers the active view
    /// in localStorage — coming back to the app shouldn't reset where you were.
    @AppStorage("macWorkView") private var viewRaw = WorkView.priorities.rawValue
    private var view: WorkView { WorkView(rawValue: viewRaw) ?? .priorities }
    /// Fraction of the rail given to Incoming requests. 0 means "automatic",
    /// which caps requests at 42% the way the web layout does.
    @AppStorage("macRailSplit") private var railSplit = 0.0
    @State private var dragStart: Double?

    enum WorkView: String, CaseIterable {
        case priorities, team, risk

        var label: String {
            switch self {
            case .priorities: return "Priorities"
            case .team: return "Team"
            case .risk: return "Risk & hygiene"
            }
        }
    }

    private var isRnD: Bool { store.scope == "rnd" }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            Divider()
            banners
            shell
        }
        .frame(minWidth: 1080, minHeight: 680)
        .background(Color.primary.opacity(0.02))
        .task {
            if store.snapshot == nil { await store.load() }
            store.startTicker()
        }
    }

    // MARK: - Top bar
    //
    // Same running order as the web header: identity and freshness on the left,
    // the scope toggle in the middle, filter and controls on the right.

    private var topBar: some View {
        HStack(spacing: 14) {
            HStack(spacing: 7) {
                Circle()
                    .fill(store.errorMessage != nil ? Theme.critical
                          : store.snapshot?.demo == true ? Color.secondary : Theme.good)
                    .frame(width: 7, height: 7)
                Text("Creative Direction")
                    .font(.system(size: 13, weight: .semibold))
                Text(store.lastLoaded == nil ? "connecting…" : Fmt.clock(store.snapshot?.fetchedAt))
                    .font(.system(size: 11))
                    .monospacedDigit()
                    .foregroundStyle(.tertiary)
                if store.isLoading { ProgressView().controlSize(.small) }
            }

            if store.scopes.count > 1 {
                Picker("Board scope", selection: Binding(
                    get: { store.scope },
                    set: { store.scope = $0 }
                )) {
                    ForEach(store.scopes) { s in Text(s.shortLabel).tag(s.key) }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 330)
                .help("⌘1 – ⌘4")
            }

            Spacer(minLength: 8)

            filterField

            Button {
                store.appearance = store.appearance == "dark" ? "light" : "dark"
            } label: {
                Text(store.appearance == "dark" ? "Light" : "Dark")
            }
            .help("Switch theme")

            Button {
                Task { await store.load(force: true) }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .help("Refresh now (⌘R)")
            .disabled(store.isLoading)

            SettingsLink { Image(systemName: "gearshape") }
                .help("Settings (⌘,)")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var filterField: some View {
        HStack(spacing: 5) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 11))
                .foregroundStyle(.tertiary)
            TextField("Filter by name or person", text: Binding(
                get: { store.filter },
                set: { store.filter = $0 }
            ))
            .textFieldStyle(.plain)
            .font(.system(size: 12))
            .frame(width: 190)
            if !store.filter.isEmpty {
                Button { store.filter = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 11))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(Capsule().fill(Color.primary.opacity(0.06)))
    }

    private var banners: some View {
        VStack(spacing: 6) {
            if store.snapshot?.demo == true {
                Banner(text: "Sample data — this server has no monday token.", role: "warning")
            }
            if store.needsAccessKey {
                HStack(alignment: .top, spacing: 7) {
                    Image(systemName: "lock.fill").font(.system(size: 10)).padding(.top, 2)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Access key required").font(.system(size: 12, weight: .semibold))
                        Text(store.errorMessage ?? "").font(.system(size: 11))
                    }
                    Spacer(minLength: 0)
                    SettingsLink { Text("Open Settings").font(.system(size: 11, weight: .medium)) }
                }
                .foregroundStyle(Theme.critical)
                .padding(.horizontal, 11).padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: 9).fill(Theme.critical.opacity(0.12)))
            } else if let error = store.errorMessage {
                Banner(text: error, role: "critical")
            }
            if !store.filter.isEmpty {
                HStack {
                    Text("Showing only work matching “\(store.filter)” — every panel is filtered.")
                        .font(.system(size: 12))
                    Spacer()
                    Button("Show everything") { store.filter = "" }
                        .font(.system(size: 12, weight: .medium))
                }
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(RoundedRectangle(cornerRadius: 9).fill(Theme.laneFlight.opacity(0.12)))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, hasBanner ? 10 : 0)
    }

    private var hasBanner: Bool {
        store.snapshot?.demo == true || store.errorMessage != nil || !store.filter.isEmpty
    }

    // MARK: - Shell: workspace + pinned 25% rail

    private var shell: some View {
        GeometryReader { geo in
            HStack(spacing: 0) {
                workspace
                    .frame(width: geo.size.width * 0.75)
                Divider()
                rail(height: geo.size.height)
                    .frame(width: geo.size.width * 0.25)
            }
        }
    }

    @ViewBuilder
    private var workspace: some View {
        VStack(spacing: 10) {
            if let slice = store.slice {
                if isRnD {
                    // R&D replaces the whole tabbed workspace with one list —
                    // exploration, not pipeline, so no KPIs and no tabs.
                    MacPanel(title: "R&D projects",
                             count: slice.rndGroups.reduce(0) { $0 + $1.items.count },
                             hint: "tagged R&D on the board · grouped by assignee") {
                        rndBody(slice)
                    }
                } else {
                    kpiStrip(slice)
                    tabBar(slice)
                    tabContent(slice)
                }
            } else if store.isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 14)
    }

    // MARK: - KPI strip

    private func kpiStrip(_ slice: ScopeSlice) -> some View {
        let h = slice.headline
        return HStack(spacing: 10) {
            MacHeroTile(
                label: "Waiting on your review",
                value: h.needsReview,
                foot: slice.review.first.map { "oldest waiting \($0.daysStale ?? 0)d — \($0.name)" }
                    ?? "queue is clear"
            )
            // The hero earns more width than the four counters beside it: at an
            // equal fifth its label wrapped to three lines and the item name
            // truncated mid-word.
            .frame(minWidth: 300, idealWidth: 340, maxWidth: 380)

            KPITile(label: "Overdue", value: h.overdue, role: "critical",
                    foot: slice.deadlines.overdue.first.map { "worst \($0.daysOverdue)d late" } ?? "nothing past due")
            KPITile(label: "Stalled", value: h.blocked, role: "serious",
                    foot: "blocked or waiting on someone")
            KPITile(label: "Going stale", value: h.rotting, role: "warning",
                    foot: "untouched \(store.snapshot?.thresholds.staleWarnDays ?? 14)+ days")
            KPITile(label: "New requests", value: slice.intake.count, role: nil,
                    foot: h.untriaged > 0 ? "\(h.untriaged) untriaged" : "all triaged")
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: - Tabs

    private func tabBar(_ slice: ScopeSlice) -> some View {
        HStack(spacing: 6) {
            ForEach(Array(WorkView.allCases.enumerated()), id: \.element) { index, v in
                Button { viewRaw = v.rawValue } label: {
                    HStack(spacing: 6) {
                        Text(v.label).font(.system(size: 12, weight: .medium))
                        if let badge = badge(v, slice), badge > 0 {
                            Text("\(badge)")
                                .font(.system(size: 10, weight: .bold))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                                .padding(.horizontal, 5).padding(.vertical, 1)
                                .background(Capsule().fill(Theme.critical))
                        }
                    }
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(view == v ? Color.primary.opacity(0.10) : Color.primary.opacity(0.03))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(view == v ? Theme.laneFlight.opacity(0.5) : .clear, lineWidth: 1)
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(
                    KeyEquivalent(Character("\(index + 1)")),
                    modifiers: [.command, .option]
                )
            }
            Spacer()
            Text("⌥⌘1 · 2 · 3").font(.system(size: 10)).foregroundStyle(.tertiary)
        }
    }

    /// Each tab carries its group's most urgent count, so collapsing a view
    /// never hides the fact that something inside it needs attention.
    private func badge(_ v: WorkView, _ slice: ScopeSlice) -> Int? {
        switch v {
        case .priorities: return slice.headline.overdue
        case .team: return slice.headline.needsReview
        case .risk: return slice.headline.rotting + slice.stalled.count
        }
    }

    @ViewBuilder
    private func tabContent(_ slice: ScopeSlice) -> some View {
        switch view {
        case .priorities:
            // 7/5 column split, matching the web grid.
            MacColumns(ratio: 0.583) {
                MacPanel(title: "What to touch next", count: store.filtered(slice.focus).count,
                         hint: "ranked by urgency · click to open in monday") {
                    let items = store.filtered(slice.focus)
                    if items.isEmpty {
                        EmptyPanel(message: "Nothing is urgent. Genuinely.")
                    } else {
                        ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                            ItemRow(item: item, rank: i + 1, showReasons: true, showBoard: true)
                        }
                    }
                }
            } trailing: {
                MacPanel(title: "Deadlines", count: deadlineTotal(slice)) {
                    deadlineBody(slice)
                }
            }

        case .team:
            MacColumns(ratio: 0.583) {
                MacPanel(
                    title: "Who is carrying what",
                    hint: store.showRecurring ? "open work, recurring included" : "open work, recurring hidden",
                    controls: {
                        Button {
                            store.showRecurring.toggle()
                        } label: {
                            Text("Recurring")
                                .font(.system(size: 10, weight: .semibold))
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Capsule().fill(store.showRecurring
                                    ? Theme.laneRecurring.opacity(0.3)
                                    : Color.primary.opacity(0.06)))
                        }
                        .buttonStyle(.plain)
                        .help("Include weekly recurring work in the counts")
                    }
                ) {
                    capacityBody(slice)
                }
            } trailing: {
                MacPanel(title: "Your approval queue", count: store.filtered(slice.review).count) {
                    reviewBody(slice)
                }
            }

        case .risk:
            // The long list gets a full column; the two short panels share the
            // other — the same balance the web layout strikes.
            MacColumns(ratio: 0.583) {
                VStack(spacing: 10) {
                    MacPanel(title: "Going stale", count: store.filtered(slice.rot).count) {
                        listBody(store.filtered(slice.rot), empty: "Nothing is going stale.") { item in
                            ItemRow(item: item, showBoard: true, showStatus: true,
                                    extraChips: [("\(item.daysStale ?? 0)d untouched", "warning")])
                        }
                    }
                    MacPanel(title: "Back burner", count: store.filtered(slice.shelved).count,
                             hint: "shelved on the board · no alerts, no stats") {
                        listBody(store.filtered(slice.shelved), empty: "Nothing is on the back burner.") { item in
                            ItemRow(item: item, showStatus: true,
                                    extraChips: (item.daysStale ?? 0) > 0
                                        ? [("\(item.daysStale!)d untouched", nil)] : [])
                        }
                    }
                }
            } trailing: {
                VStack(spacing: 10) {
                    MacPanel(title: "Stalled — who to chase", count: store.filtered(slice.stalled).count) {
                        listBody(store.filtered(slice.stalled), empty: "Nothing is stuck.") { item in
                            ItemRow(item: item, extraChips: [
                                (item.status ?? item.laneLabel, item.lane == "blocked" ? "critical" : "serious")
                            ])
                        }
                    }
                    MacPanel(title: "Board hygiene", hint: "fix these once, save hours") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("\(slice.hygiene.scoped) open items")
                                .font(.system(size: 11)).foregroundStyle(.tertiary)
                            Meter(label: "Has a due date", pct: slice.hygiene.dateCoverage)
                            Meter(label: "Has an owner", pct: slice.hygiene.assignedCoverage)
                            Meter(label: "Has a status", pct: slice.hygiene.statusCoverage)
                        }
                        .padding(.top, 4)
                    }
                }
            }
        }
    }

    // MARK: - Panel bodies

    @ViewBuilder
    private func listBody<Row: View>(
        _ items: [Item], empty: String, @ViewBuilder row: @escaping (Item) -> Row
    ) -> some View {
        if items.isEmpty {
            EmptyPanel(message: empty)
        } else {
            ForEach(items) { row($0) }
        }
    }

    private func deadlineTotal(_ slice: ScopeSlice) -> Int {
        store.filtered(slice.deadlines.overdue).count
            + store.filtered(slice.deadlines.today).count
            + store.filtered(slice.deadlines.thisWeek).count
    }

    @ViewBuilder
    private func deadlineBody(_ slice: ScopeSlice) -> some View {
        let groups: [(String, String?, [Item])] = [
            ("Overdue", "critical", store.filtered(slice.deadlines.overdue)),
            ("Due today", "serious", store.filtered(slice.deadlines.today)),
            ("Next 7 days", nil, store.filtered(slice.deadlines.thisWeek)),
        ]
        if !slice.datesTracked {
            // "Nothing is due" would be a lie — this board has no date column.
            EmptyPanel(message: "This board has no due-date column.",
                       icon: "calendar.badge.exclamationmark")
        } else if groups.allSatisfy({ $0.2.isEmpty }) {
            EmptyPanel(message: "Nothing dated is coming up.", icon: "calendar")
        } else {
            ForEach(Array(groups.enumerated()), id: \.offset) { _, group in
                if !group.2.isEmpty {
                    Text(group.0.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.7)
                        .foregroundStyle(group.1 == nil ? .secondary : Theme.role(group.1))
                        .padding(.top, 4)
                    ForEach(group.2) { item in
                        ItemRow(item: item, showStatus: true, showDueAlert: true)
                    }
                }
            }
        }
    }


    @ViewBuilder
    private func reviewBody(_ slice: ScopeSlice) -> some View {
        let items = store.filtered(slice.review)
        let t = store.snapshot?.thresholds
        if items.isEmpty {
            EmptyPanel(message: "Nothing is waiting on you.")
        } else {
            ForEach(items) { item in
                let days = item.daysStale ?? 0
                let role = days >= (t?.reviewWaitCriticalDays ?? 5) ? "critical"
                         : days >= (t?.reviewWaitWarnDays ?? 2) ? "warning" : nil
                ItemRow(item: item, showBoard: true,
                        extraChips: [(days > 0 ? "\(days)d waiting" : "just now", role)])
            }
        }
    }

    @State private var expandedPeople: Set<String> = []

    @ViewBuilder
    private func capacityBody(_ slice: ScopeSlice) -> some View {
        let rows = slice.load.filter { $0.visibleTotal(includeRecurring: store.showRecurring) > 0 }
        if rows.isEmpty {
            EmptyPanel(message: "Nobody has open work.", icon: "person.2")
        } else {
            let maxTotal = rows.map { $0.visibleTotal(includeRecurring: store.showRecurring) }.max() ?? 1
            ForEach(rows) { row in
                CapacityRow(
                    row: row,
                    maxTotal: maxTotal,
                    slot: row.person == "Unassigned" ? 0 : store.slot(for: row.person),
                    showRecurring: store.showRecurring,
                    isExpanded: expandedPeople.contains(row.person),
                    toggle: {
                        if expandedPeople.contains(row.person) { expandedPeople.remove(row.person) }
                        else { expandedPeople.insert(row.person) }
                    }
                )
            }
            laneLegend
        }
    }

    private var laneLegend: some View {
        FlowLayout(spacing: 12) {
            ForEach(
                [("idle", "Not started"), ("flight", "In progress"),
                 ("you", "With you"), ("stalled", "Blocked/waiting")]
                    + (store.showRecurring ? [("recurring", "Recurring")] : []),
                id: \.0
            ) { key, label in
                HStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 2).fill(Theme.lane(key)).frame(width: 9, height: 9)
                    Text(label).font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private func rndBody(_ slice: ScopeSlice) -> some View {
        let groups = slice.rndGroups
            .map { ($0.person, store.filtered($0.items)) }
            .filter { !$0.1.isEmpty }
        if groups.isEmpty {
            EmptyPanel(message: "Nothing is tagged R&D yet.", icon: "flask")
        } else {
            ForEach(groups, id: \.0) { person, items in
                HStack(spacing: 7) {
                    let slot = person == "Unassigned" ? 0 : store.slot(for: person)
                    Text(person == "Unassigned" ? "—" : Fmt.initials(person))
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Theme.slotInk(slot))
                        .frame(width: 18, height: 18)
                        .background(Circle().fill(Theme.slotFill(slot)))
                    Text(person).font(.system(size: 13, weight: .semibold))
                    Text("\(items.count)").font(.system(size: 12)).foregroundStyle(.tertiary)
                }
                .padding(.top, 10)
                ForEach(items) { item in
                    ItemRow(item: item, showStatus: true, hideOwner: true,
                            extraChips: (item.daysStale ?? 0) > 0
                                ? [("\(item.daysStale!)d untouched", nil)] : [])
                }
            }
        }
    }

    // MARK: - The pinned rail
    //
    // Requests on top (what is arriving), activity beneath (what is moving),
    // with a draggable border between them. Neither the rail nor the window
    // scrolls; each block scrolls inside itself.

    private func rail(height: CGFloat) -> some View {
        let auto = min(max(height * 0.42, 120), height - 160)
        let requestsHeight = railSplit > 0
            ? min(max(height * railSplit, 90), height - 90)
            : auto

        return VStack(spacing: 0) {
            railBlock(
                title: "Incoming requests",
                hint: store.slice.map { s in
                    let n = store.filtered(s.intake).count
                    return n == 0 ? "none waiting" : "\(n) waiting"
                } ?? ""
            ) {
                if let slice = store.slice {
                    let items = store.filtered(slice.intake)
                    if items.isEmpty {
                        EmptyPanel(message: "No new requests.", icon: "tray")
                    } else {
                        ForEach(items) { item in
                            ItemRow(item: item, showStatus: true,
                                    extraChips: item.untriaged == true ? [("untriaged", "warning")] : [])
                        }
                    }
                }
            }
            .frame(height: requestsHeight)

            railDivider(height: height)

            railBlock(title: "Live activity", hint: "\(store.scopedActivity.count) recent") {
                ActivityView()
            }
            .frame(maxHeight: .infinity)
        }
        .background(Color.primary.opacity(0.02))
    }

    private func railDivider(height: CGFloat) -> some View {
        ZStack {
            Rectangle().fill(Color.primary.opacity(0.06))
            Capsule()
                .fill(dragStart != nil ? Theme.laneFlight : Color.secondary.opacity(0.45))
                .frame(width: 26, height: 3)
        }
        .frame(height: 11)
        .contentShape(Rectangle())
        .onHover { inside in
            // A resize cursor is the only affordance a border like this gets.
            if inside { NSCursor.resizeUpDown.push() } else { NSCursor.pop() }
        }
        .gesture(
            DragGesture(minimumDistance: 1)
                .onChanged { value in
                    let start = dragStart ?? Double(currentRequestsHeight(in: height))
                    if dragStart == nil { dragStart = start }
                    let next = (start + Double(value.translation.height)) / Double(height)
                    railSplit = min(max(next, 90 / Double(height)), 1 - 90 / Double(height))
                }
                .onEnded { _ in dragStart = nil }
        )
        // Double-click restores automatic sizing, as on the web.
        .onTapGesture(count: 2) { railSplit = 0 }
        .help("Drag to resize · double-click to reset")
    }

    private func currentRequestsHeight(in height: CGFloat) -> CGFloat {
        railSplit > 0 ? height * railSplit : min(max(height * 0.42, 120), height - 160)
    }

    private func railBlock<Content: View>(
        title: String, hint: String, @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(hint).font(.system(size: 10)).foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 14)
            .padding(.top, 11)
            .padding(.bottom, 6)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 5) {
                    content()
                }
                .padding(.horizontal, 10)
                .padding(.bottom, 10)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Mac building blocks

/// The web dashboard's 7/5 column grid.
struct MacColumns<Leading: View, Trailing: View>: View {
    let ratio: Double
    @ViewBuilder let leading: Leading
    @ViewBuilder let trailing: Trailing

    var body: some View {
        GeometryReader { geo in
            HStack(alignment: .top, spacing: 10) {
                leading.frame(width: (geo.size.width - 10) * ratio)
                trailing
            }
        }
    }
}

/// A bordered card with a heading and its own scrolling body — the `.panel` of
/// the web layout. The card never grows past its column; the body scrolls.
struct MacPanel<Content: View, Controls: View>: View {
    let title: String
    var count: Int? = nil
    var hint: String? = nil
    @ViewBuilder var controls: Controls
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                if let count {
                    Text("\(count)")
                        .font(.system(size: 11, weight: .medium))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Capsule().fill(Color.primary.opacity(0.07)))
                }
                controls
                Spacer(minLength: 6)
                if let hint {
                    Text(hint)
                        .font(.system(size: 10))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, 13)
            .padding(.top, 11)
            .padding(.bottom, 8)

            Divider().opacity(0.5)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 6) {
                    content
                }
                .padding(.horizontal, 11)
                .padding(.vertical, 10)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: Theme.corner)
                .fill(Color.primary.opacity(0.035))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.corner)
                .strokeBorder(Color.primary.opacity(0.07), lineWidth: 1)
        )
    }
}

extension MacPanel where Controls == EmptyView {
    init(title: String, count: Int? = nil, hint: String? = nil, @ViewBuilder content: () -> Content) {
        self.init(title: title, count: count, hint: hint, controls: { EmptyView() }, content: content)
    }
}

/// The hero KPI: the one number worth a glance from across the room.
struct MacHeroTile: View {
    let label: String
    let value: Int
    let foot: String

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            Text("\(value)")
                .font(.system(size: 42, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(value == 0 ? .secondary : .primary)
            VStack(alignment: .leading, spacing: 3) {
                Text(label).font(.system(size: 12, weight: .medium))
                Text(foot)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Theme.warning.opacity(0.10)))
        .overlay(alignment: .leading) {
            Rectangle().fill(Theme.warning).frame(width: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: Theme.corner))
    }
}

/// The Mac settings window. Same three concerns as the iOS sheet — server,
/// appearance, access key — but the server and key are applied on commit rather
/// than per keystroke, so a half-typed URL never triggers a failing fetch.
struct MacSettingsView: View {
    @Environment(DashboardStore.self) private var store
    @State private var urlDraft = ""
    @State private var keyDraft = ""

    var body: some View {
        Form {
            Section("Dashboard server") {
                TextField("http://localhost:5180", text: $urlDraft)
                    .onSubmit(apply)
                Text("The machine running `node server.js`, or your Cloudflare Worker URL. The monday token stays on the server — this app never sees it.")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section("Access key") {
                SecureField("Access key", text: $keyDraft)
                    .onSubmit(apply)
                Text("Required by a deployed server, which is reachable from the internet. Stored in the login Keychain and sent as a request header. A local server on your own machine doesn't need one.")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Section("Appearance") {
                Picker("Appearance", selection: Binding(
                    get: { store.appearance },
                    set: { store.appearance = $0 }
                )) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .pickerStyle(.segmented)
                .labelsHidden()
            }

            if let snapshot = store.snapshot {
                Section("Connected") {
                    LabeledContent("Updated", value: Fmt.clock(snapshot.fetchedAt))
                    LabeledContent("Mode", value: snapshot.demo ? "Sample data" : "Live")
                    ForEach(snapshot.boards, id: \.id) { board in
                        LabeledContent(board.label, value: "\(board.itemsCount ?? 0) items")
                    }
                }
            }

            if let error = store.errorMessage {
                Section("Last error") {
                    Text(error).font(.system(size: 12)).foregroundStyle(Theme.critical)
                }
            }

            HStack {
                Spacer()
                Button("Apply", action: apply)
                    .keyboardShortcut(.defaultAction)
                    .disabled(urlDraft.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .formStyle(.grouped)
        .frame(width: 460)
        .fixedSize(horizontal: false, vertical: true)
        .onAppear {
            urlDraft = store.baseURL
            keyDraft = store.accessKey
        }
    }

    private func apply() {
        store.baseURL = urlDraft.trimmingCharacters(in: .whitespaces)
        store.accessKey = keyDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            await store.load(force: true)
            store.startTicker()
        }
    }
}
#endif
