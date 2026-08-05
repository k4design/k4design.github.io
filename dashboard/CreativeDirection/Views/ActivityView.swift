import SwiftUI

/// The live feed, already humanised server-side, so the app just renders it.
struct ActivityView: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 2) {
                let entries = store.scopedActivity
                if entries.isEmpty {
                    EmptyPanel(message: "No board activity in the last two weeks.", icon: "clock")
                } else {
                    ForEach(entries.prefix(60)) { entry in
                        HStack(alignment: .top, spacing: 9) {
                            Circle()
                                .fill(tone(entry.tone))
                                .frame(width: 6, height: 6)
                                .padding(.top, 6)

                            Text(attributed(entry))
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)

                            Spacer(minLength: 6)

                            Text(Fmt.ago(entry.at))
                                .font(.system(size: 11))
                                .monospacedDigit()
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 4)
                        Divider().opacity(0.3)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }

    /// The actor's name is the one thing worth emphasising in a wall of changes.
    private func attributed(_ entry: ActivityEntry) -> AttributedString {
        var who = AttributedString(entry.who)
        who.font = .system(size: 13, weight: .semibold)
        who.foregroundColor = .primary
        var rest = AttributedString(" " + entry.text)
        rest.foregroundColor = .secondary
        return who + rest
    }

    private func tone(_ tone: String) -> Color {
        switch tone {
        case "new", "done": return Theme.good
        case "gone": return Theme.critical
        case "comment": return Theme.laneFlight
        default: return .secondary.opacity(0.5)
        }
    }
}

#if os(iOS)
struct SettingsView: View {
    @Environment(DashboardStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ""
    @State private var keyDraft = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("http://192.168.1.87:5180", text: $draft)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                } header: {
                    Text("Dashboard server")
                } footer: {
                    Text("The address of the machine running `node server.js`, or your Netlify URL. The monday token stays on the server — this app never sees it.")
                }

                Section {
                    Picker("Appearance", selection: Binding(
                        get: { store.appearance },
                        set: { store.appearance = $0 }
                    )) {
                        Text("System").tag("system")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Appearance")
                } footer: {
                    Text("System follows the phone's light/dark schedule.")
                }

                Section {
                    SecureField("Access key", text: $keyDraft)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Access key")
                } footer: {
                    Text("Required by a deployed server, which is reachable from the internet. Stored in the device Keychain and sent as a request header. A local server on your own machine doesn't need one.")
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
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.baseURL = draft
                        store.accessKey = keyDraft.trimmingCharacters(in: .whitespacesAndNewlines)
                        dismiss()
                        Task {
                            await store.load(force: true)
                            store.startTicker()
                        }
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                draft = store.baseURL
                keyDraft = store.accessKey
            }
        }
    }
}
#endif
