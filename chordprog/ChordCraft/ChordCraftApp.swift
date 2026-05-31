import SwiftUI

@main
struct ChordCraftApp: App {
    @AppStorage("has_seen_onboarding") private var hasSeenOnboarding = false

    var body: some Scene {
        WindowGroup {
            if hasSeenOnboarding {
                HomeView()
            } else {
                OnboardingView()
            }
        }
    }
}
