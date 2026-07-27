import SwiftUI

struct RootView: View {
    @Environment(DashboardStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase

    @State private var tab = Tab.today
    @State private var showSettings = false

    enum Tab: Hashable { case today, queue, team, activity }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                scopePicker
                banners
                content
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar }
            .searchable(text: Binding(get: { store.filter }, set: { store.filter = $0 }),
                        placement: .navigationBarDrawer(displayMode: .automatic),
                        prompt: "Filter by name or person")
            .refreshable { await store.load(force: true) }
            .safeAreaInset(edge: .bottom) { tabBar }
        }
        .task {
            if store.snapshot == nil { await store.load() }
            store.startTicker()
        }
        .onChange(of: scenePhase) { _, phase in
            // No polling from a pocket; refresh the moment it comes back.
            if phase == .active {
                store.startTicker()
                Task { await store.load() }
            } else {
                store.stopTicker()
            }
        }
        .sheet(isPresented: $showSettings) { SettingsView() }
    }

    private var title: String {
        switch tab {
        case .today: return "Today"
        case .queue: return "Queue"
        case .team: return "Team"
        case .activity: return "Activity"
        }
    }

    // MARK: - Scope

    private var scopePicker: some View {
        Group {
            if store.scopes.count > 1 {
                Picker("Board scope", selection: Binding(
                    get: { store.scope },
                    set: { store.scope = $0 }
                )) {
                    ForEach(store.scopes) { s in
                        Text(s.shortLabel).tag(s.key)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
            }
        }
    }

    // MARK: - Banners

    private var banners: some View {
        VStack(spacing: 6) {
            if store.snapshot?.demo == true {
                Banner(text: "Sample data — this server has no monday token.", role: "warning")
            }
            if let error = store.errorMessage {
                Banner(text: error, role: "critical")
            }
            if !store.filter.isEmpty {
                HStack {
                    Text("Filtered to “\(store.filter)”").font(.system(size: 12))
                    Spacer()
                    Button("Clear") { store.filter = "" }.font(.system(size: 12, weight: .medium))
                }
                .padding(.horizontal, 12).padding(.vertical, 7)
                .background(RoundedRectangle(cornerRadius: 9).fill(Theme.laneFlight.opacity(0.12)))
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, store.snapshot?.demo == true || store.errorMessage != nil || !store.filter.isEmpty ? 8 : 0)
    }

    @ViewBuilder
    private var content: some View {
        switch tab {
        case .today: TodayView()
        case .queue: QueueView()
        case .team: TeamView()
        case .activity: ActivityView()
        }
    }

    // MARK: - Chrome

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            HStack(spacing: 5) {
                Circle()
                    .fill(store.errorMessage != nil ? Theme.critical
                          : store.snapshot?.demo == true ? Color.secondary : Theme.good)
                    .frame(width: 7, height: 7)
                Text(store.lastLoaded == nil ? "…" : Fmt.clock(store.snapshot?.fetchedAt))
                    .font(.system(size: 11))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button { showSettings = true } label: { Image(systemName: "gearshape") }
        }
    }

    /// A custom bar rather than TabView, so the scope picker, banners and search
    /// stay shared across tabs instead of being rebuilt per tab.
    private var tabBar: some View {
        HStack(spacing: 0) {
            barButton(.today, "square.grid.2x2", "Today")
            barButton(.queue, "checkmark.circle", "Queue", badge: store.slice?.headline.needsReview)
            barButton(.team, "person.2", "Team")
            barButton(.activity, "waveform", "Activity")
        }
        .padding(.top, 8)
        .background(.bar)
    }

    private func barButton(_ value: Tab, _ icon: String, _ label: String, badge: Int? = nil) -> some View {
        Button {
            tab = value
        } label: {
            VStack(spacing: 3) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: icon).font(.system(size: 17))
                    if let badge, badge > 0 {
                        Text("\(badge)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 4).padding(.vertical, 1)
                            .background(Capsule().fill(Theme.critical))
                            .offset(x: 12, y: -6)
                    }
                }
                Text(label).font(.system(size: 10))
            }
            .frame(maxWidth: .infinity)
            .foregroundStyle(tab == value ? Color.accentColor : .secondary)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct Banner: View {
    let text: String
    let role: String

    var body: some View {
        HStack(alignment: .top, spacing: 7) {
            Image(systemName: Theme.roleIcon(role)).font(.system(size: 10)).padding(.top, 2)
            Text(text).font(.system(size: 12))
            Spacer(minLength: 0)
        }
        .foregroundStyle(Theme.role(role))
        .padding(.horizontal, 11).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 9).fill(Theme.role(role).opacity(0.12)))
    }
}
