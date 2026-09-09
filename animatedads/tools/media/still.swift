import AVFoundation
import AppKit
// still <video> <out.jpg> <seconds> <jpegQuality 0-1>
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let img = try await gen.image(at: CMTime(seconds: Double(a[3])!, preferredTimescale: 600)).image
let rep = NSBitmapImageRep(cgImage: img)
let data = rep.representation(using: .jpeg, properties: [.compressionFactor: Double(a[4])!])!
try data.write(to: URL(fileURLWithPath: a[2]))
print("\(a[2]): \(img.width)x\(img.height) \(data.count) bytes")
