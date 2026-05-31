import SwiftUI

struct OnboardingView: View {
    @AppStorage("has_seen_onboarding") private var hasSeenOnboarding = false
    @AppStorage("anthropic_api_key") private var apiKey = ""
    @State private var currentPage = 0
    @State private var draftKey = ""
    @State private var showKey = false

    var body: some View {
        ZStack {
            Color.ccBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                // Page indicator
                HStack(spacing: 6) {
                    ForEach(0..<3) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(i == currentPage ? Color.ccAccent : Color.ccBorder)
                            .frame(width: i == currentPage ? 24 : 6, height: 4)
                            .animation(.spring(response: 0.4), value: currentPage)
                    }
                }
                .padding(.top, 24)

                TabView(selection: $currentPage) {
                    page0.tag(0)
                    page1.tag(1)
                    page2.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
        .preferredColorScheme(.dark)
    }

    private var page0: some View {
        VStack(spacing: 32) {
            Spacer()
            Image(systemName: "music.note.list")
                .font(.system(size: 72))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.ccAccent, .ccTeal],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(spacing: 12) {
                HStack(spacing: 2) {
                    Text("Chord").font(.ccDisplay(36)).foregroundColor(.white)
                    Text("Craft").font(.ccDisplay(36)).foregroundColor(.ccAccent)
                }
                Text("AI-powered chord progressions for your songs")
                    .font(.system(size: 16))
                    .foregroundColor(.ccTextSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
            nextButton("See What It Can Do")
        }
        .padding(.horizontal, 32)
        .padding(.bottom, 40)
    }

    private var page1: some View {
        VStack(spacing: 28) {
            Spacer()

            VStack(spacing: 20) {
                FeatureRow(
                    icon: "music.note.list",
                    iconColor: .ccAccent,
                    title: "Generate from Verse",
                    subtitle: "Enter your verse chords and get AI-crafted suggestions for chorus, bridge, and more."
                )

                FeatureRow(
                    icon: "music.note.house.fill",
                    iconColor: .ccTeal,
                    title: "Build Full Songs",
                    subtitle: "Choose key, scale, and genre — Claude composes a complete song structure."
                )

                FeatureRow(
                    icon: "heart.fill",
                    iconColor: .red,
                    title: "Save Your Favorites",
                    subtitle: "Star progressions to build your personal chord library."
                )
            }

            Spacer()
            nextButton("Set Up API Key")
        }
        .padding(.horizontal, 32)
        .padding(.bottom, 40)
    }

    private var page2: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(spacing: 8) {
                Image(systemName: "key.horizontal.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.ccAccent)
                Text("Connect Anthropic API")
                    .font(.ccHeadline(26))
                    .foregroundColor(.ccText)
                Text("ChordCraft uses Claude to generate progressions. Add your API key to get started.")
                    .font(.system(size: 14))
                    .foregroundColor(.ccTextSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Anthropic API Key")
                    .font(.system(.caption, design: .default).weight(.semibold))
                    .foregroundColor(.ccTextSecondary)

                HStack {
                    Group {
                        if showKey {
                            TextField("sk-ant-...", text: $draftKey)
                        } else {
                            SecureField("sk-ant-...", text: $draftKey)
                        }
                    }
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.ccText)
                    .autocapitalization(.none)
                    .autocorrectionDisabled()

                    Button(action: { showKey.toggle() }) {
                        Image(systemName: showKey ? "eye.slash" : "eye")
                            .foregroundColor(.ccTextSecondary)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.ccCard)
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ccBorder))
            }

            Spacer()

            VStack(spacing: 12) {
                Button(action: {
                    apiKey = draftKey.trimmingCharacters(in: .whitespacesAndNewlines)
                    hasSeenOnboarding = true
                }) {
                    Text("Let's Go")
                        .font(.system(.body).weight(.semibold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(draftKey.isEmpty ? Color.ccAccent.opacity(0.4) : Color.ccAccent)
                        .cornerRadius(14)
                }
                .disabled(draftKey.isEmpty)

                Button(action: { hasSeenOnboarding = true }) {
                    Text("Skip for now")
                        .font(.system(.subheadline))
                        .foregroundColor(.ccTextSecondary)
                }
            }
        }
        .padding(.horizontal, 32)
        .padding(.bottom, 40)
    }

    private func nextButton(_ label: String) -> some View {
        Button(action: {
            withAnimation(.spring(response: 0.4)) {
                currentPage += 1
            }
        }) {
            HStack(spacing: 6) {
                Text(label)
                Image(systemName: "arrow.right")
            }
            .font(.system(.body).weight(.semibold))
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.ccAccent)
            .cornerRadius(14)
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(iconColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(iconColor)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(.body).weight(.semibold))
                    .foregroundColor(.ccText)
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(.ccTextSecondary)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
