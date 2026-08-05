import SwiftUI

@main
struct CreativeDirectionApp: App {
    @State private var store = DashboardStore()

    // A `#if` inside the scene builder has to wrap whole scene statements — it
    // cannot begin with a trailing modifier — so each platform declares its own
    // WindowGroup and shares the wrapper below.
    var body: some Scene {
        #if os(macOS)
        WindowGroup {
            root(MacRootView())
        }
        // A dashboard is a glanceable window, not a document: opened wide enough
        // that the content and the activity rail both fit.
        .defaultSize(width: 1240, height: 860)
        .commands { DashboardCommands(store: store) }

        Settings {
            root(MacSettingsView())
        }
        #else
        WindowGroup {
            root(RootView())
        }
        #endif
    }

    /// Shared wrapper so both platforms pick up the store, the accent colour and
    /// the appearance override from one place.
    private func root<Content: View>(_ content: Content) -> some View {
        content
            .environment(store)
            .tint(Theme.laneFlight)
            // nil means "follow the system" — the default.
            .preferredColorScheme(
                store.appearance == "dark" ? .dark
                : store.appearance == "light" ? .light
                : nil
            )
    }
}

#if os(macOS)
/// Menu-bar commands, so the things worth doing mid-thought have keys: refresh
/// without reaching for the toolbar, and jump straight to a board scope.
struct DashboardCommands: Commands {
    let store: DashboardStore

    var body: some Commands {
        CommandGroup(after: .toolbar) {
            Button("Refresh Now") {
                Task { await store.load(force: true) }
            }
            .keyboardShortcut("r", modifiers: .command)

            Divider()

            // ⌘1…⌘4 map to the scope toggle, matching the sidebar order.
            ForEach(Array(store.scopes.enumerated()), id: \.element.key) { index, scope in
                Button(scope.label) { store.scope = scope.key }
                    .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")), modifiers: .command)
            }
        }
    }
}
#endif
