import SwiftUI

struct HomeView: View {
    @State private var showSettings = false
    @State private var showSaved = false
    @State private var animateGradient = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Animated gradient background
                LinearGradient(
                    colors: [
                        Color.ccBackground,
                        animateGradient
                            ? Color(hex: "#0F0F20")
                            : Color(hex: "#10101A"),
                        Color.ccBackground
                    ],
                    startPoint: animateGradient ? .topLeading : .bottomTrailing,
                    endPoint: animateGradient ? .bottomTrailing : .topLeading
                )
                .ignoresSafeArea()
                .onAppear {
                    withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
                        animateGradient = true
                    }
                }

                VStack(spacing: 0) {
                    // Hero header
                    VStack(spacing: 8) {
                        HStack(spacing: 2) {
                            Text("Chord")
                                .font(.ccDisplay(42))
                                .foregroundColor(.ccText)
                            Text("Craft")
                                .font(.ccDisplay(42))
                                .foregroundColor(.ccAccent)
                        }
                        .padding(.top, 20)

                        Text("AI-powered chord progressions for songwriters")
                            .font(.system(size: 15))
                            .foregroundColor(.ccTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.bottom, 40)

                    // Mode cards
                    VStack(spacing: 16) {
                        NavigationLink(destination: SectionGeneratorView()) {
                            ModeCard(
                                icon: "music.note.list",
                                title: "Generate from Verse",
                                subtitle: "Input your verse chords and get AI-generated suggestions for chorus, bridge, pre-chorus, and outro.",
                                accentColor: .ccAccent,
                                badge: "SECTION MODE"
                            )
                        }
                        .buttonStyle(.plain)

                        NavigationLink(destination: FullSongGeneratorView()) {
                            ModeCard(
                                icon: "music.note.house.fill",
                                title: "Build Full Song",
                                subtitle: "Choose a key, scale, and genre to generate a complete song structure from intro to outro.",
                                accentColor: .ccTeal,
                                badge: "FULL SONG"
                            )
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)

                    Spacer()

                    // Footer
                    Button(action: { showSaved = true }) {
                        HStack(spacing: 8) {
                            Image(systemName: "heart.fill")
                                .font(.system(size: 13))
                                .foregroundColor(.red)
                            Text("Saved Progressions")
                                .font(.system(.subheadline, design: .default).weight(.medium))
                                .foregroundColor(.ccTextSecondary)
                        }
                        .padding(.vertical, 12)
                    }
                    .padding(.bottom, 8)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { showSettings = true }) {
                        Image(systemName: "gearshape")
                            .foregroundColor(.ccTextSecondary)
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showSaved) {
                SavedProgressionsView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct ModeCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let accentColor: Color
    let badge: String

    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(accentColor.opacity(0.15))
                        .frame(width: 52, height: 52)
                    Image(systemName: icon)
                        .font(.system(size: 24))
                        .foregroundColor(accentColor)
                }

                Spacer()

                Text(badge)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .foregroundColor(accentColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(accentColor.opacity(0.12))
                    .clipShape(Capsule())
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.ccHeadline(20))
                    .foregroundColor(.ccText)

                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(.ccTextSecondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Spacer()
                HStack(spacing: 4) {
                    Text("Get Started")
                        .font(.system(size: 13, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(accentColor)
            }
        }
        .padding(20)
        .background(Color.ccCard)
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(accentColor.opacity(0.2), lineWidth: 1)
        )
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.8), value: isPressed)
        .onTapGesture {
            withAnimation { isPressed = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation { isPressed = false }
            }
        }
    }
}
