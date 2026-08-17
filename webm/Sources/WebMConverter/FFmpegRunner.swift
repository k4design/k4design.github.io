import Foundation

enum FFmpeg {
    /// Bundled binary first, Homebrew fallback for dev runs.
    static var executableURL: URL? {
        if let bundled = Bundle.main.url(forResource: "ffmpeg", withExtension: nil),
           FileManager.default.isExecutableFile(atPath: bundled.path) {
            return bundled
        }
        for path in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"] {
            if FileManager.default.isExecutableFile(atPath: path) {
                return URL(fileURLWithPath: path)
            }
        }
        return nil
    }
}

struct FFmpegRunner {

    /// Probe the source duration in seconds by parsing ffmpeg's stderr banner.
    static func probeDuration(of url: URL) -> Double? {
        guard let ffmpeg = FFmpeg.executableURL else { return nil }
        let p = Process()
        p.executableURL = ffmpeg
        p.arguments = ["-hide_banner", "-i", url.path]
        let err = Pipe()
        p.standardError = err
        p.standardOutput = Pipe()
        do { try p.run() } catch { return nil }
        let data = err.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        guard let text = String(data: data, encoding: .utf8) else { return nil }
        // "  Duration: 00:01:23.45, start: ..."
        guard let range = text.range(of: #"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)"#, options: .regularExpression) else { return nil }
        let parts = text[range].replacingOccurrences(of: "Duration: ", with: "").split(separator: ":")
        guard parts.count == 3,
              let h = Double(parts[0]), let m = Double(parts[1]), let s = Double(parts[2]) else { return nil }
        return h * 3600 + m * 60 + s
    }

    /// Pick an output URL next to the source that doesn't clobber existing files.
    static func outputURL(for source: URL, ext: String) -> URL {
        let dir = source.deletingLastPathComponent()
        let base = source.deletingPathExtension().lastPathComponent
        var candidate = dir.appendingPathComponent("\(base).\(ext)")
        var n = 2
        while FileManager.default.fileExists(atPath: candidate.path) {
            candidate = dir.appendingPathComponent("\(base)-\(n).\(ext)")
            n += 1
        }
        return candidate
    }

    /// Build the ffmpeg argument list for a job.
    /// `sample` encodes only a slice (start, length) — used for size estimation.
    static func arguments(source: URL, output: URL, settings s: ConversionSettings,
                          sample: (start: Double, length: Double)? = nil) -> [String] {
        var args: [String] = ["-hide_banner", "-y"]
        if let sample {
            args += ["-ss", String(format: "%.2f", sample.start)]
        }
        args += ["-i", source.path]
        if let sample {
            args += ["-t", String(format: "%.2f", sample.length)]
        }

        // Video filters
        var filters: [String] = []
        if let scale = s.resolution.scaleFilter { filters.append(scale) }
        if s.fpsOverride > 0 { filters.append("fps=\(Int(s.fpsOverride))") }

        switch s.format {
        case .webmVP9:
            args += ["-c:v", "libvpx-vp9"]
            if s.useTargetBitrate {
                args += ["-b:v", "\(Int(s.targetBitrateKbps))k"]
            } else {
                args += ["-crf", "\(Int(s.crf))", "-b:v", "0"]
            }
            args += ["-cpu-used", "\(Int(s.cpuUsed))", "-row-mt", "1"]
            if s.alpha {
                args += ["-pix_fmt", "yuva420p", "-auto-alt-ref", "0"]
            } else {
                args += ["-pix_fmt", "yuv420p"]
            }
            if !filters.isEmpty { args += ["-vf", filters.joined(separator: ",")] }
            args += s.audioEnabled ? ["-c:a", "libopus", "-b:a", "\(Int(s.audioBitrate))k"] : ["-an"]

        case .webmAV1:
            args += ["-c:v", "libsvtav1"]
            if s.useTargetBitrate {
                args += ["-b:v", "\(Int(s.targetBitrateKbps))k"]
            } else {
                args += ["-crf", "\(Int(s.crf))"]
            }
            // Map 0-5 speed knob to SVT-AV1 presets (0-13)
            args += ["-preset", "\(min(Int(s.cpuUsed) * 2 + 3, 13))", "-pix_fmt", "yuv420p"]
            if !filters.isEmpty { args += ["-vf", filters.joined(separator: ",")] }
            args += s.audioEnabled ? ["-c:a", "libopus", "-b:a", "\(Int(s.audioBitrate))k"] : ["-an"]

        case .gif:
            // Single-command two-pass palette for quality GIFs.
            var chain = filters
            if s.fpsOverride <= 0 { chain.append("fps=15") }
            let pre = chain.isEmpty ? "" : chain.joined(separator: ",") + ","
            let graph = "\(pre)split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle"
            args += ["-vf", graph, "-loop", s.loopForever ? "0" : "-1", "-an"]

        case .webp:
            args += ["-c:v", "libwebp"]
            // Map CRF (0-63, lower=better) to webp quality (0-100, higher=better)
            let quality = max(0, min(100, Int(100 - s.crf * 100 / 63)))
            args += ["-quality", "\(quality)", "-compression_level", "4"]
            args += ["-loop", s.loopForever ? "0" : "1", "-an"]
            if s.alpha { filters.append("format=rgba") }
            if !filters.isEmpty { args += ["-vf", filters.joined(separator: ",")] }
        }

        args += ["-progress", "pipe:1", "-nostats", output.path]
        return args
    }

    /// Estimate output size by encoding a short sample from the middle of the file
    /// with the real settings, then extrapolating to full duration. Blocking.
    static func estimateSize(source: URL, settings: ConversionSettings, duration: Double,
                             isCancelled: @escaping () -> Bool) -> Int64? {
        guard let ffmpeg = FFmpeg.executableURL, duration > 0 else { return nil }

        let sampleLen = min(3.0, duration)
        let start = duration > sampleLen ? (duration - sampleLen) / 2 : 0

        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("webm-estimate-\(UUID().uuidString).\(settings.format.fileExtension)")
        defer { try? FileManager.default.removeItem(at: tmp) }

        let p = Process()
        p.executableURL = ffmpeg
        p.arguments = arguments(source: source, output: tmp, settings: settings,
                                sample: (start: start, length: sampleLen))
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { return nil }
        while p.isRunning {
            if isCancelled() { p.terminate(); return nil }
            usleep(100_000)
        }
        guard p.terminationStatus == 0,
              let attrs = try? FileManager.default.attributesOfItem(atPath: tmp.path),
              let bytes = attrs[.size] as? Int64, bytes > 0 else { return nil }

        return Int64(Double(bytes) * duration / sampleLen)
    }

    /// Run the conversion. Progress callbacks arrive on an arbitrary queue.
    /// Returns the process so callers can cancel it.
    @discardableResult
    static func run(
        source: URL,
        output: URL,
        settings: ConversionSettings,
        duration: Double?,
        onProgress: @escaping (Double) -> Void,
        onCompletion: @escaping (Result<URL, Error>) -> Void
    ) throws -> Process {
        guard let ffmpeg = FFmpeg.executableURL else {
            throw NSError(domain: "WebMConverter", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "ffmpeg binary not found"])
        }
        let p = Process()
        p.executableURL = ffmpeg
        p.arguments = arguments(source: source, output: output, settings: settings)

        let out = Pipe()
        let err = Pipe()
        p.standardOutput = out
        p.standardError = err

        var errBuffer = Data()
        err.fileHandleForReading.readabilityHandler = { h in
            errBuffer.append(h.availableData)
        }

        out.fileHandleForReading.readabilityHandler = { h in
            guard let text = String(data: h.availableData, encoding: .utf8) else { return }
            // -progress emits "out_time_ms=1234567" lines (microseconds despite the name)
            for line in text.split(separator: "\n") {
                if line.hasPrefix("out_time_ms="), let us = Double(line.dropFirst("out_time_ms=".count)),
                   let dur = duration, dur > 0 {
                    onProgress(min(us / 1_000_000 / dur, 1.0))
                }
            }
        }

        p.terminationHandler = { proc in
            out.fileHandleForReading.readabilityHandler = nil
            err.fileHandleForReading.readabilityHandler = nil
            if proc.terminationStatus == 0 {
                onCompletion(.success(output))
            } else {
                let msg = String(data: errBuffer, encoding: .utf8)?
                    .split(separator: "\n").suffix(4).joined(separator: "\n") ?? "ffmpeg failed"
                try? FileManager.default.removeItem(at: output)
                onCompletion(.failure(NSError(domain: "WebMConverter", code: Int(proc.terminationStatus),
                                              userInfo: [NSLocalizedDescriptionKey: msg])))
            }
        }

        try p.run()
        return p
    }
}
