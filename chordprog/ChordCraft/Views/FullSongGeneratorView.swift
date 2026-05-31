import SwiftUI

struct FullSongGeneratorView: View {
    @StateObject private var vm = FullSongViewModel()

    var body: some View {
        ZStack {
            Color.ccBackground.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    parametersSection
                    generateButton

                    if let structure = vm.songStructure {
                        SongStructureView(
                            structure: structure,
                            onFavorite: { vm.toggleFavorite(progression: $0) }
                        )
                        .transition(.asymmetric(
                            insertion: .move(edge: .bottom).combined(with: .opacity),
                            removal: .opacity
                        ))
                    } else if !vm.isLoading {
                        emptyState
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 40)
                .animation(.spring(response: 0.5, dampingFraction: 0.8), value: vm.songStructure != nil)
            }

            if vm.isLoading {
                LoadingOverlay(message: "Composing your song…")
                    .transition(.opacity)
            }
        }
        .navigationTitle("Build Full Song")
        .navigationBarTitleDisplayMode(.large)
        .alert("Error", isPresented: $vm.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "An unknown error occurred.")
        }
    }

    // MARK: - Subviews

    private var parametersSection: some View {
        VStack(spacing: 16) {
            // Key and Scale row
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Key", systemImage: "key.horizontal")
                        .font(.system(.caption, design: .default).weight(.semibold))
                        .foregroundColor(.ccTextSecondary)

                    Menu {
                        ForEach(vm.keys, id: \.self) { key in
                            Button(key) { vm.selectedKey = key }
                        }
                    } label: {
                        HStack {
                            Text(vm.selectedKey)
                                .font(.system(.body, design: .rounded).weight(.semibold))
                                .foregroundColor(.ccText)
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(.ccTextSecondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color.ccCard)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ccBorder))
                    }
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 8) {
                    Label("Scale", systemImage: "music.note")
                        .font(.system(.caption, design: .default).weight(.semibold))
                        .foregroundColor(.ccTextSecondary)

                    Menu {
                        ForEach(vm.scales, id: \.self) { scale in
                            Button(scale) { vm.selectedScale = scale }
                        }
                    } label: {
                        HStack {
                            Text(vm.selectedScale)
                                .font(.system(.body, design: .rounded).weight(.semibold))
                                .foregroundColor(.ccText)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(.ccTextSecondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(Color.ccCard)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ccBorder))
                    }
                }
                .frame(maxWidth: .infinity)
            }

            // Genre
            VStack(alignment: .leading, spacing: 8) {
                Label("Genre", systemImage: "guitars")
                    .font(.system(.caption, design: .default).weight(.semibold))
                    .foregroundColor(.ccTextSecondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(vm.genres, id: \.self) { genre in
                            let isSelected = vm.selectedGenre == genre
                            Button(genre) {
                                vm.selectedGenre = genre
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            }
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundColor(isSelected ? .black : .ccText)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(isSelected ? Color.ccAccent : Color.ccCard)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(isSelected ? Color.clear : Color.ccBorder, lineWidth: 1)
                            )
                            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
                        }
                    }
                }
            }

            // Mood / Feel
            VStack(alignment: .leading, spacing: 8) {
                Label("Mood / Feel (optional)", systemImage: "heart.text.square")
                    .font(.system(.caption, design: .default).weight(.semibold))
                    .foregroundColor(.ccTextSecondary)

                TextField("e.g. melancholic and driving", text: $vm.emotionalVibe)
                    .font(.system(.body))
                    .foregroundColor(.ccText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(Color.ccCard)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ccBorder))
            }
        }
        .padding(16)
        .cardStyle()
    }

    private var generateButton: some View {
        Button(action: {
            Task { await vm.generate() }
        }) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                Text("Generate Full Song")
                    .font(.system(.body, design: .default).weight(.semibold))
            }
            .foregroundColor(.black)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.ccAccent)
            .cornerRadius(14)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "music.note.house")
                .font(.system(size: 56))
                .foregroundColor(.ccTextSecondary.opacity(0.4))
            Text("Set your parameters and\ngenerate a complete song structure")
                .font(.system(.body))
                .foregroundColor(.ccTextSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}
