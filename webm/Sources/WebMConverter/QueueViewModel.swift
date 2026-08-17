import Foundation
import SwiftUI

@MainActor
final class QueueViewModel: ObservableObject {
    @Published var jobs: [ConversionJob] = []
    @Published var isRunning = false

    /// Bumped whenever settings change or jobs are added; stale estimate passes bail out.
    private var estimateGeneration = 0

    var hasPendingJobs: Bool {
        jobs.contains { if case .queued = $0.state { return true }; return false }
    }

    func add(urls: [URL], defaults: ConversionSettings) {
        let videoExts: Set<String> = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "mxf", "mts", "m2ts", "wmv", "flv", "gif", "mpg", "mpeg"]
        for url in urls where videoExts.contains(url.pathExtension.lowercased()) {
            let job = ConversionJob(sourceURL: url)
            job.settings = defaults
            jobs.append(job)
        }
    }

    func remove(_ job: ConversionJob) {
        if case .queued = job.state { jobs.removeAll { $0.id == job.id } }
    }

    /// Re-estimate output sizes for all queued jobs (each with its own settings)
    /// using a short sample encode. A new call invalidates any pass still running.
    func updateEstimates() {
        estimateGeneration += 1
        let generation = estimateGeneration
        let pending = jobs.filter { if case .queued = $0.state { return true }; return false }
        guard !pending.isEmpty else { return }
        for job in pending { job.estimate = .estimating }

        Task.detached(priority: .utility) { [weak self] in
            for job in pending {
                let stillCurrent = { @MainActor in generation == self?.estimateGeneration }
                guard await stillCurrent() else { return }

                let source = job.sourceURL
                let duration: Double? = await MainActor.run { job.duration }
                    ?? FFmpegRunner.probeDuration(of: source)
                await MainActor.run { job.duration = duration }

                guard let duration else {
                    await MainActor.run { job.estimate = .unavailable }
                    continue
                }
                let jobSettings = await MainActor.run { job.settings }
                let bytes = FFmpegRunner.estimateSize(
                    source: source, settings: jobSettings, duration: duration,
                    isCancelled: {
                        DispatchQueue.main.sync { generation != self?.estimateGeneration }
                    }
                )
                guard await stillCurrent() else { return }
                await MainActor.run {
                    job.estimate = bytes.map { .ready(bytes: $0) } ?? .unavailable
                }
            }
        }
    }

    /// Arm all waiting jobs (each keeps its own settings) and start the queue.
    func start() {
        for job in jobs {
            if case .queued = job.state { job.isArmed = true }
        }
        processNextIfIdle()
    }

    func cancel(_ job: ConversionJob) {
        if case .converting = job.state {
            job.process?.terminate()
            job.state = .cancelled
        } else if case .queued = job.state {
            job.state = .cancelled
        }
    }

    func clearFinished() {
        jobs.removeAll { $0.state.isFinished }
    }

    private func processNextIfIdle() {
        guard !isRunning else { return }
        guard let job = jobs.first(where: { if case .queued = $0.state { return $0.isArmed }; return false }) else { return }
        isRunning = true
        job.state = .probing

        let source = job.sourceURL
        let settings = job.settings

        Task.detached { [weak self] in
            let duration = FFmpegRunner.probeDuration(of: source)
            let output = FFmpegRunner.outputURL(for: source, ext: settings.format.fileExtension)

            await MainActor.run { job.state = .converting(progress: 0) }

            do {
                let process = try FFmpegRunner.run(
                    source: source,
                    output: output,
                    settings: settings,
                    duration: duration,
                    onProgress: { pct in
                        Task { @MainActor in
                            if case .converting = job.state { job.state = .converting(progress: pct) }
                        }
                    },
                    onCompletion: { result in
                        Task { @MainActor in
                            if case .cancelled = job.state {
                                // user cancelled; leave state as-is
                            } else {
                                switch result {
                                case .success(let url): job.state = .done(outputURL: url)
                                case .failure(let error): job.state = .failed(message: error.localizedDescription)
                                }
                            }
                            self?.isRunning = false
                            self?.processNextIfIdle()
                        }
                    }
                )
                await MainActor.run { job.process = process }
            } catch {
                await MainActor.run {
                    job.state = .failed(message: error.localizedDescription)
                    self?.isRunning = false
                    self?.processNextIfIdle()
                }
            }
        }
    }
}
