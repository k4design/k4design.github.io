import AVFoundation
import CoreImage
import AppKit
// mp4frames <src> <outDir> <prefix> <N> <W> <H>  - N evenly spaced frames, cover-cropped to WxH with Lanczos, as PNG
let a = CommandLine.arguments
let src = URL(fileURLWithPath: a[1]), outDir = a[2], prefix = a[3], N = Int(a[4])!, W = Int(a[5])!, H = Int(a[6])!
let asset = AVURLAsset(url: src)
let dur = CMTimeGetSeconds(try await asset.load(.duration))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.appliesPreferredTrackTransform = true
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, .outputColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
for i in 0..<N {
    let t = min(Double(i) * dur / Double(N - 1), dur - 0.03)
    let cg = try await gen.image(at: CMTime(seconds: t, preferredTimescale: 600)).image
    var img = CIImage(cgImage: cg)
    let sw = img.extent.width, sh = img.extent.height
    let s = max(CGFloat(W) / sw, CGFloat(H) / sh)                      // object-fit: cover
    let lanczos = CIFilter(name: "CILanczosScaleTransform")!
    lanczos.setValue(img, forKey: kCIInputImageKey); lanczos.setValue(s, forKey: kCIInputScaleKey); lanczos.setValue(1.0, forKey: kCIInputAspectRatioKey)
    img = lanczos.outputImage!
    let ox = (img.extent.width - CGFloat(W)) / 2, oy = (img.extent.height - CGFloat(H)) / 2
    let cx = floor(img.extent.minX + ox), cy = floor(img.extent.minY + oy)
    img = img.cropped(to: CGRect(x: cx, y: cy, width: CGFloat(W), height: CGFloat(H))).transformed(by: CGAffineTransform(translationX: -cx, y: -cy))
    guard let out = ctx.createCGImage(img, from: CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H))) else { print("render fail \(i)"); exit(1) }
    let rep = NSBitmapImageRep(cgImage: out)
    try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(outDir)/\(prefix)\(String(format: "%04d", i)).png"))
}
print("\(N) frames -> \(outDir)  (\(W)x\(H), Lanczos, source \(dur)s)")
