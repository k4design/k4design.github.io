import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    @AppStorage("anthropic_api_key") private var apiKey = ""
    @State private var draftKey = ""
    @State private var showKey = false
    @State private var showCopied = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.ccBackground.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 24) {
                        apiKeySection
                        aboutSection
                    }
                    .padding(20)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(.ccAccent)
                }
            }
            .onAppear { draftKey = apiKey }
        }
    }

    private var apiKeySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("Anthropic API Key", systemImage: "key.horizontal.fill")
                .font(.system(.headline, design: .default).weight(.semibold))
                .foregroundColor(.ccText)

            Text("Required to generate chord progressions. Get your key at console.anthropic.com.")
                .font(.system(size: 13))
                .foregroundColor(.ccTextSecondary)
                .lineSpacing(3)

            HStack(spacing: 8) {
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
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(draftKey.isEmpty ? Color.ccBorder : Color.ccAccent.opacity(0.4))
            )

            HStack(spacing: 10) {
                Button(action: {
                    apiKey = draftKey.trimmingCharacters(in: .whitespacesAndNewlines)
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    dismiss()
                }) {
                    Text("Save Key")
                        .font(.system(.body).weight(.semibold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(draftKey.isEmpty ? Color.ccAccent.opacity(0.3) : Color.ccAccent)
                        .cornerRadius(12)
                }
                .disabled(draftKey.isEmpty)

                if !apiKey.isEmpty {
                    Button(action: {
                        apiKey = ""
                        draftKey = ""
                        UINotificationFeedbackGenerator().notificationOccurred(.warning)
                    }) {
                        Text("Clear")
                            .font(.system(.body).weight(.medium))
                            .foregroundColor(.red)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 16)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }
                }
            }

            if !apiKey.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.system(size: 13))
                    Text("API key configured")
                        .font(.system(size: 13))
                        .foregroundColor(.ccTextSecondary)
                }
            }
        }
        .padding(16)
        .cardStyle()
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("About", systemImage: "info.circle")
                .font(.system(.headline, design: .default).weight(.semibold))
                .foregroundColor(.ccText)

            VStack(spacing: 8) {
                InfoRow(label: "App", value: "ChordCraft")
                InfoRow(label: "Model", value: "claude-sonnet-4-20250514")
                InfoRow(label: "Version", value: "1.0.0")
            }
        }
        .padding(16)
        .cardStyle()
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(.subheadline))
                .foregroundColor(.ccTextSecondary)
            Spacer()
            Text(value)
                .font(.system(.subheadline, design: .monospaced).weight(.medium))
                .foregroundColor(.ccText)
        }
    }
}
