import AVFoundation
// psnr <ref.mp4 (352x288, cropped on the fly)> <test.mp4 (352x198)>
let a = CommandLine.arguments
let CROP_TOP = 44, H = 198

func frames(_ path: String) async throws -> [[UInt8]] {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    let t = try await asset.loadTracks(withMediaType: .video)[0]
    let r = try AVAssetReader(asset: asset)
    r.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: 14.6, preferredTimescale: 600))
    let o = AVAssetReaderTrackOutput(track: t, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
    r.add(o); r.startReading()
    var res: [[UInt8]] = []
    while let s = o.copyNextSampleBuffer(), let pb = CMSampleBufferGetImageBuffer(s) {
        CVPixelBufferLockBaseAddress(pb, .readOnly)
        let h = CVPixelBufferGetHeightOfPlane(pb, 0)
        let w = CVPixelBufferGetWidthOfPlane(pb, 0)
        let row = CVPixelBufferGetBytesPerRowOfPlane(pb, 0)
        let base = CVPixelBufferGetBaseAddressOfPlane(pb, 0)!.assumingMemoryBound(to: UInt8.self)
        let top = h > H ? CROP_TOP : 0
        var y = [UInt8](repeating: 0, count: w * H)
        for r2 in 0..<H { memcpy(&y[r2*w], base.advanced(by: (r2+top)*row), w) }
        CVPixelBufferUnlockBaseAddress(pb, .readOnly)
        res.append(y)
    }
    return res
}
let ref = try await frames(a[1]), test = try await frames(a[2])
let n = min(ref.count, test.count)
var mse = 0.0
for i in 0..<n {
    var s = 0.0
    for j in 0..<ref[i].count { let d = Double(ref[i][j]) - Double(test[i][j]); s += d*d }
    mse += s / Double(ref[i].count)
}
mse /= Double(n)
let psnr = 10 * log10(255*255/mse)
print(String(format: "%@  frames=%d  Y-PSNR vs source = %.2f dB", (a[2] as NSString).lastPathComponent, n, psnr))
