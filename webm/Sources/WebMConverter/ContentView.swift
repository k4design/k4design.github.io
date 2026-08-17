import SwiftUI
import UniformTypeIdentifiers
import AppKit

struct ContentView: View {
    @StateObject private var queue = QueueViewModel()
    @AppStorage("settingsJSON") private var settingsJSON: String = ""
    @State private var defaults = ConversionSettings()
    @State private var selectedJobID: UUID?
    @State private var showAdvanced = false
    @State private var isDropTargeted = false
    @State private var estimateDebounce: Task<Void, Never>?

    /// The queued job whose settings the panel is editing, if one is selected.
    private var selectedJob: ConversionJob? {
        guard let id = selectedJobID,
              let job = queue.jobs.first(where: { $0.id == id }),
              case .queued = job.state else { return nil }
        return job
    }

    var body: some View {
        HSplitView {
            Group {
                if let job = selectedJob {
                    JobSettingsPane(job: job, showAdvanced: $showAdvanced,
                                    onEdit: scheduleEstimates,
                                    onApplyAll: {
                                        let current = job.settings
                                        for other in queue.jobs {
                                            if case .queued = other.state { other.settings = current }
                                        }
                                        scheduleEstimates()
                                    })
                } else {
                    SettingsForm(
                        title: "Default Settings",
                        subtitle: "Applied to newly added files",
                        s: Binding(
                            get: { defaults },
                            set: { new in
                                defaults = new
                                saveSettings(new)
                                scheduleEstimates()
                            }
                        ),
                        showAdvanced: $showAdvanced,
                        onApplyAll: nil
                    )
                }
            }
            .frame(minWidth: 260, maxWidth: 320)
            queuePane
                .frame(minWidth: 380, maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(minWidth: 700, minHeight: 460)
        .onAppear(perform: loadSettings)
    }


    // MARK: - Queue pane

    private var queuePane: some View {
        VStack(spacing: 0) {
            if queue.jobs.isEmpty {
                dropZone
            } else {
                List(selection: $selectedJobID) {
                    ForEach(queue.jobs) { job in
                        JobRow(job: job, queue: queue)
                            .tag(job.id)
                    }
                }
                .listStyle(.inset)
            }

            Divider()
            HStack(spacing: 12) {
                Button {
                    pickFiles()
                } label: {
                    Label("Add Files…", systemImage: "plus")
                }
                if queue.jobs.contains(where: { $0.state.isFinished }) {
                    Button("Clear Finished") { queue.clearFinished() }
                }
                Spacer()
                Button {
                    queue.start()
                } label: {
                    Label(queue.isRunning ? "Converting…" : "Convert", systemImage: "play.fill")
                        .frame(minWidth: 110)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .keyboardShortcut(.defaultAction)
                .disabled(!queue.hasPendingJobs || queue.isRunning)
            }
            .padding(10)
        }
        .onDrop(of: [.fileURL], isTargeted: $isDropTargeted, perform: handleDrop)
        .overlay {
            if isDropTargeted {
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color.accentColor, style: StrokeStyle(lineWidth: 3, dash: [8]))
                    .padding(6)
            }
        }
    }

    private var dropZone: some View {
        VStack(spacing: 12) {
            Image(systemName: "arrow.down.doc")
                .font(.system(size: 44))
                .foregroundStyle(.secondary)
            Text("Drop video files here")
                .font(.title3)
            Text("or click Add Files…")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        var urls: [URL] = []
        let group = DispatchGroup()
        for provider in providers {
            group.enter()
            _ = provider.loadObject(ofClass: URL.self) { url, _ in
                if let url { urls.append(url) }
                group.leave()
            }
        }
        group.notify(queue: .main) {
            queue.add(urls: urls, defaults: defaults)
            queue.updateEstimates()
        }
        return true
    }

    private func pickFiles() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.movie, .video, .mpeg4Movie, .quickTimeMovie, .gif]
        if panel.runModal() == .OK {
            queue.add(urls: panel.urls, defaults: defaults)
            queue.updateEstimates()
        }
    }

    /// Debounce slider drags so we don't spawn an encode per tick.
    private func scheduleEstimates() {
        estimateDebounce?.cancel()
        estimateDebounce = Task {
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            queue.updateEstimates()
        }
    }

    // MARK: - Settings persistence

    private func loadSettings() {
        guard let data = settingsJSON.data(using: .utf8),
              let saved = try? JSONDecoder().decode(ConversionSettings.self, from: data) else { return }
        defaults = saved
    }

    private func saveSettings(_ s: ConversionSettings) {
        if let data = try? JSONEncoder().encode(s), let json = String(data: data, encoding: .utf8) {
            settingsJSON = json
        }
    }
}

struct JobRow: View {
    @ObservedObject var job: ConversionJob
    let queue: QueueViewModel

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 3) {
                Text(job.sourceURL.lastPathComponent)
                    .lineLimit(1)
                subtitle
            }
            Spacer()
            trailing
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder private var subtitle: some View {
        switch job.state {
        case .queued:
            HStack(spacing: 4) {
                Text(job.settings.format.rawValue)
                switch job.estimate {
                case .none: EmptyView()
                case .estimating:
                    Text("· estimating size…").foregroundStyle(.tertiary)
                case .ready(let bytes):
                    Text("· ≈ \(ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file))")
                        .fontWeight(.medium)
                case .unavailable:
                    Text("· size unknown").foregroundStyle(.tertiary)
                }
            }
            .font(.caption).foregroundStyle(.secondary)
        case .probing: Text("Preparing…").font(.caption).foregroundStyle(.secondary)
        case .converting(let p):
            ProgressView(value: p).progressViewStyle(.linear).frame(maxWidth: 260)
        case .done(let url): Text(url.lastPathComponent).font(.caption).foregroundStyle(.secondary)
        case .failed(let msg): Text(msg).font(.caption).foregroundStyle(.red).lineLimit(2)
        case .cancelled: Text("Cancelled").font(.caption).foregroundStyle(.secondary)
        }
    }

    @ViewBuilder private var trailing: some View {
        switch job.state {
        case .queued:
            Button {
                queue.remove(job)
            } label: {
                Image(systemName: "trash").foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        case .probing, .converting:
            Button {
                queue.cancel(job)
            } label: {
                Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        case .done(let url):
            Button("Reveal") {
                NSWorkspace.shared.activateFileViewerSelecting([url])
            }
        case .failed, .cancelled:
            EmptyView()
        }
    }

    private var icon: String {
        switch job.state {
        case .queued: return "clock"
        case .probing, .converting: return "gearshape.2"
        case .done: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.triangle.fill"
        case .cancelled: return "slash.circle"
        }
    }

    private var iconColor: Color {
        switch job.state {
        case .done: return .green
        case .failed: return .red
        default: return .secondary
        }
    }
}

/// Wrapper that observes a job so the form re-renders when its settings change.
struct JobSettingsPane: View {
    @ObservedObject var job: ConversionJob
    @Binding var showAdvanced: Bool
    var onEdit: () -> Void
    var onApplyAll: () -> Void

    var body: some View {
        SettingsForm(
            title: "File Settings",
            subtitle: job.sourceURL.lastPathComponent,
            s: Binding(
                get: { job.settings },
                set: { new in
                    job.settings = new
                    onEdit()
                }
            ),
            showAdvanced: $showAdvanced,
            onApplyAll: onApplyAll
        )
    }
}

struct SettingsForm: View {
    let title: String
    let subtitle: String
    let s: Binding<ConversionSettings>
    @Binding var showAdvanced: Bool
    let onApplyAll: (() -> Void)?

    /// Selecting a preset also applies its values in the same write.
    private var presetBinding: Binding<Preset> {
        Binding(
            get: { s.wrappedValue.preset },
            set: { p in
                var copy = s.wrappedValue
                copy.preset = p
                p.apply(to: &copy)
                s.wrappedValue = copy
            }
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }

                Picker("Format", selection: s.format) {
                    ForEach(OutputFormat.allCases) { f in Text(f.rawValue).tag(f) }
                }

                Picker("Preset", selection: presetBinding) {
                    ForEach(Preset.allCases) { p in Text(p.rawValue).tag(p) }
                }

                if s.wrappedValue.preset == .transparent && !s.wrappedValue.format.supportsAlpha {
                    Label("This format doesn't support transparency — use WebM · VP9 or WebP.", systemImage: "exclamationmark.triangle")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                DisclosureGroup("Advanced", isExpanded: $showAdvanced) {
                    VStack(alignment: .leading, spacing: 12) {
                        if s.wrappedValue.format == .webmVP9 || s.wrappedValue.format == .webmAV1 {
                            Toggle("Target bitrate instead of quality", isOn: s.useTargetBitrate)
                            if s.wrappedValue.useTargetBitrate {
                                labeledSlider("Bitrate: \(Int(s.wrappedValue.targetBitrateKbps)) kbps",
                                              value: s.targetBitrateKbps, in: 250...12000, step: 250)
                            } else {
                                labeledSlider("Quality (CRF): \(Int(s.wrappedValue.crf)) — lower is better",
                                              value: s.crf, in: 0...63, step: 1)
                            }
                            labeledSlider("Speed (cpu-used): \(Int(s.wrappedValue.cpuUsed)) — higher is faster",
                                          value: s.cpuUsed, in: 0...5, step: 1)
                        }
                        if s.wrappedValue.format == .webp {
                            labeledSlider("Quality (CRF-style): \(Int(s.wrappedValue.crf)) — lower is better",
                                          value: s.crf, in: 0...63, step: 1)
                        }

                        Picker("Resolution", selection: s.resolution) {
                            ForEach(ResolutionScale.allCases) { r in Text(r.rawValue).tag(r) }
                        }

                        labeledSlider(s.wrappedValue.fpsOverride > 0 ? "Frame rate: \(Int(s.wrappedValue.fpsOverride)) fps" : "Frame rate: source",
                                      value: s.fpsOverride, in: 0...60, step: 1)

                        if s.wrappedValue.format.supportsAlpha {
                            Toggle("Preserve transparency (alpha)", isOn: s.alpha)
                        }

                        if s.wrappedValue.format.supportsAudio {
                            Toggle("Include audio (Opus)", isOn: s.audioEnabled)
                            if s.wrappedValue.audioEnabled {
                                labeledSlider("Audio bitrate: \(Int(s.wrappedValue.audioBitrate)) kbps",
                                              value: s.audioBitrate, in: 32...320, step: 16)
                            }
                        } else {
                            Toggle("Loop forever", isOn: s.loopForever)
                        }
                    }
                    .padding(.top, 6)
                }

                if let onApplyAll {
                    Button("Apply to All Queued Files", action: onApplyAll)
                        .font(.caption)
                }

                Spacer()
            }
            .padding(16)
        }
    }

    private func labeledSlider(_ label: String, value: Binding<Double>, in range: ClosedRange<Double>, step: Double) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption)
            Slider(value: value, in: range, step: step)
        }
    }
}
