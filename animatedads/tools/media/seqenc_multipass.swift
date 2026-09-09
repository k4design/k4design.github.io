import AVFoundation
import AppKit
// seqenc2 <framesDir> <prefix> <out.mp4> <fps> <kbps>  - PNG sequence -> silent H.264, MULTI-PASS when the encoder allows it
let a = CommandLine.arguments
let dir = a[1], prefix = a[2], dst = URL(fileURLWithPath: a[3]), fps = Int(a[4])!, kbps = Int(a[5])!
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasPrefix(prefix) && $0.hasSuffix(".png") }.sorted()
guard let first = NSImage(contentsOfFile: dir + "/" + files[0]), let rep0 = first.representations.first else { print("no frames"); exit(1) }
let W = rep0.pixelsWide, H = rep0.pixelsHigh
try? FileManager.default.removeItem(at: dst)
let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoMaxKeyFrameIntervalKey: 600,
        AVVideoAllowFrameReorderingKey: false,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: fps,
    ],
    AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
                                AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
                                AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2]])
input.expectsMediaDataInRealTime = false
input.performsMultiPassEncodingIfSupported = true
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
writer.add(input); writer.shouldOptimizeForNetworkUse = true
writer.startWriting(); writer.startSession(atSourceTime: .zero)

// decode every frame once, keep them in memory so each pass can re-feed the same buffers
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
var buffers: [CVPixelBuffer] = []
for f in files {
    guard let img = NSImage(contentsOfFile: dir + "/" + f), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    var pb: CVPixelBuffer?
    CVPixelBufferCreate(nil, W, H, kCVPixelFormatType_32BGRA, [kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary] as CFDictionary, &pb)
    CVPixelBufferLockBaseAddress(pb!, [])
    let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!), space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
    CVPixelBufferUnlockBaseAddress(pb!, [])
    buffers.append(pb!)
}
func time(_ i: Int) -> CMTime { CMTime(value: CMTimeValue(i), timescale: CMTimeScale(fps)) }

var passes = 0
let done = DispatchSemaphore(value: 0)
let q = DispatchQueue(label: "enc")
input.respondToEachPassDescription(on: q) {
    guard let pass = input.currentPassDescription else { input.markAsFinished(); done.signal(); return }
    passes += 1
    let ranges = pass.sourceTimeRanges.map { $0.timeRangeValue }
    for (i, pb) in buffers.enumerated() {
        let t = time(i)
        if !ranges.contains(where: { $0.containsTime(t) }) { continue }
        while !input.isReadyForMoreMediaData { usleep(1000) }
        adaptor.append(pb, withPresentationTime: t)
    }
    input.markCurrentPassAsFinished()
}
done.wait()
await writer.finishWriting()
let size = try FileManager.default.attributesOfItem(atPath: a[3])[.size] as! Int
print(String(format: "%@  %dx%d  %d frames @%dfps = %.2fs  %d kbps  %d pass(es)  ->  %.1f KB", dst.lastPathComponent, W, H, buffers.count, fps, Double(buffers.count)/Double(fps), kbps, passes, Double(size)/1024))
