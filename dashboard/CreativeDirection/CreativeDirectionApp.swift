import SwiftUI

@main
struct CreativeDirectionApp: App {
    @State private var store = DashboardStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .tint(Theme.laneFlight)
        }
    }
}
