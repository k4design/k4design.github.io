import Foundation

enum OutputFormat: String, CaseIterable, Identifiable, Codable {
    case webmVP9 = "WebM · VP9"
    case webmAV1 = "WebM · AV1"
    case gif = "GIF"
    case webp = "Animated WebP"

    var id: String { rawValue }

    var fileExtension: String {
        switch self {
        case .webmVP9, .webmAV1: return "webm"
        case .gif: return "gif"
        case .webp: return "webp"
        }
    }

    var supportsAudio: Bool {
        switch self {
        case .webmVP9, .webmAV1: return true
        case .gif, .webp: return false
        }
    }

    var supportsAlpha: Bool {
        switch self {
        case .webmVP9, .webp, .gif: return true
        case .webmAV1: return false
        }
    }
}

enum Preset: String, CaseIterable, Identifiable, Codable {
    case webOptimized = "Web Optimized"
    case highQuality = "High Quality"
    case smallestSize = "Smallest Size"
    case transparent = "Transparent (Alpha)"

    var id: String { rawValue }

    func apply(to s: inout ConversionSettings) {
        switch self {
        case .webOptimized:
            s.crf = 32; s.cpuUsed = 3; s.alpha = false
            s.useTargetBitrate = false; s.audioEnabled = true; s.audioBitrate = 96
        case .highQuality:
            s.crf = 22; s.cpuUsed = 1; s.alpha = false
            s.useTargetBitrate = false; s.audioEnabled = true; s.audioBitrate = 160
        case .smallestSize:
            s.crf = 42; s.cpuUsed = 4; s.alpha = false
            s.useTargetBitrate = false; s.audioEnabled = true; s.audioBitrate = 64
        case .transparent:
            s.crf = 28; s.cpuUsed = 2; s.alpha = true
            s.useTargetBitrate = false; s.audioEnabled = false
        }
    }
}

enum ResolutionScale: String, CaseIterable, Identifiable, Codable {
    case original = "Original"
    case p2160 = "4K (2160p)"
    case p1080 = "1080p"
    case p720 = "720p"
    case p480 = "480p"
    case half = "50%"

    var id: String { rawValue }

    /// ffmpeg scale filter expression, or nil for original size.
    var scaleFilter: String? {
        switch self {
        case .original: return nil
        case .p2160: return "scale=-2:'min(2160,ih)'"
        case .p1080: return "scale=-2:'min(1080,ih)'"
        case .p720: return "scale=-2:'min(720,ih)'"
        case .p480: return "scale=-2:'min(480,ih)'"
        case .half: return "scale=trunc(iw/4)*2:trunc(ih/4)*2"
        }
    }
}

struct ConversionSettings: Codable, Equatable {
    var format: OutputFormat = .webmVP9
    var preset: Preset = .webOptimized

    // Video
    var crf: Double = 32            // VP9 0-63, AV1 0-63, WebP 0-100 quality mapped
    var useTargetBitrate = false
    var targetBitrateKbps: Double = 2000
    var resolution: ResolutionScale = .original
    var fpsOverride: Double = 0     // 0 = keep source fps
    var cpuUsed: Double = 3         // vp9/av1 speed knob
    var alpha = false

    // Audio
    var audioEnabled = true
    var audioBitrate: Double = 96   // kbps opus

    // GIF / WebP
    var loopForever = true
}

enum JobState: Equatable {
    case queued
    case probing
    case converting(progress: Double)  // 0...1
    case done(outputURL: URL)
    case failed(message: String)
    case cancelled

    var isFinished: Bool {
        switch self {
        case .done, .failed, .cancelled: return true
        default: return false
        }
    }
}

enum SizeEstimate: Equatable {
    case none
    case estimating
    case ready(bytes: Int64)
    case unavailable
}

final class ConversionJob: Identifiable, ObservableObject {
    let id = UUID()
    let sourceURL: URL
    /// Per-job settings: seeded from the defaults when added, editable until conversion starts.
    @Published var settings = ConversionSettings()
    /// Set when the user hits Convert; unarmed queued jobs wait for the next press.
    var isArmed = false
    @Published var state: JobState = .queued
    @Published var estimate: SizeEstimate = .none
    /// Cached source duration in seconds, probed once.
    var duration: Double?
    var process: Process?

    init(sourceURL: URL) {
        self.sourceURL = sourceURL
    }
}
