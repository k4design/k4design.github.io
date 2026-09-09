import AVFoundation
import CoreImage
import AppKit

// bgenc <src> <out.mp4> <startSec> <durSec> <kbps> <targetDurSec|0=keep> [outW outH]
//
// Crops the source's 352x288 frames to 352x198 (16:9 - the only band the ads
// ever show through object-fit:cover), optionally rescales, retimes the clip to
// a target length so it loops in lockstep with the ad, and re-encodes H.264.
let a = CommandLine.arguments
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
let start = Double(a[3])!, dur = Double(a[4])!, kbps = Int(a[5])!
let retimeTo = Double(a[6])!
let CROP_TOP = a.count > 10 ? Int(a[9])! : 44
let CROP_H = a.count > 10 ? Int(a[10])! : 198

let asset = AVURLAsset(url: src)
let track = try await asset.loadTracks(withMediaType: .video)[0]
let SRC_W = Int(try await track.load(.naturalSize).width)
let OUT_W = a.count > 8 ? Int(a[7])! : SRC_W
let OUT_H = a.count > 8 ? Int(a[8])! : CROP_H
let scaling = (OUT_W != SRC_W || OUT_H != CROP_H)

let reader = try AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                               duration: CMTime(seconds: dur, preferredTimescale: 600))
let fmt = scaling ? kCVPixelFormatType_32BGRA : kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: fmt])
out.alwaysCopiesSampleData = false
reader.add(out)

try? FileManager.default.removeItem(at: dst)
let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: OUT_W, AVVideoHeightKey: OUT_H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoMaxKeyFrameIntervalKey: 600,      // one GOP: it is a looping bed
        AVVideoAllowFrameReorderingKey: true,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: 15,
    ],
    AVVideoColorPropertiesKey: [
        AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
        AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
        AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
    ],
])
input.expectsMediaDataInRealTime = false
writer.add(input)
writer.shouldOptimizeForNetworkUse = true

var pool: CVPixelBufferPool?
CVPixelBufferPoolCreate(nil, nil, [
    kCVPixelBufferPixelFormatTypeKey: fmt,
    kCVPixelBufferWidthKey: OUT_W, kCVPixelBufferHeightKey: OUT_H,
    kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary,
] as CFDictionary, &pool)
let ci = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.itur_709)!])

func makeSample(_ pb: CVPixelBuffer, _ pt: CMTime, _ d: CMTime) -> CMSampleBuffer {
    var f: CMFormatDescription?
    CMVideoFormatDescriptionCreateForImageBuffer(allocator: nil, imageBuffer: pb, formatDescriptionOut: &f)
    var t = CMSampleTimingInfo(duration: d, presentationTimeStamp: pt, decodeTimeStamp: .invalid)
    var s: CMSampleBuffer?
    CMSampleBufferCreateReadyWithImageBuffer(allocator: nil, imageBuffer: pb,
        formatDescription: f!, sampleTiming: &t, sampleBufferOut: &s)
    return s!
}

reader.startReading()
writer.startWriting()
writer.startSession(atSourceTime: .zero)

// pass 1 is implicit: we know the trim is uniform 15fps, so lay frames out evenly
var pending: [(CVPixelBuffer, CMTime, CMTime)] = []
while let s = out.copyNextSampleBuffer(), let sb = CMSampleBufferGetImageBuffer(s) {
    var db: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool!, &db)
    let d = db!
    if scaling {
        let img = CIImage(cvPixelBuffer: sb)
            .cropped(to: CGRect(x: 0, y: CGFloat(CROP_TOP), width: CGFloat(SRC_W), height: CGFloat(CROP_H)))
            .transformed(by: CGAffineTransform(translationX: 0, y: -CGFloat(CROP_TOP)))
            .transformed(by: CGAffineTransform(scaleX: CGFloat(OUT_W)/CGFloat(SRC_W),
                                               y: CGFloat(OUT_H)/CGFloat(CROP_H)))
        ci.render(img, to: d)
    } else {
        CVPixelBufferLockBaseAddress(sb, .readOnly); CVPixelBufferLockBaseAddress(d, [])
        for (plane, div) in [(0, 1), (1, 2)] {
            let sRow = CVPixelBufferGetBytesPerRowOfPlane(sb, plane)
            let dRow = CVPixelBufferGetBytesPerRowOfPlane(d, plane)
            let sBase = CVPixelBufferGetBaseAddressOfPlane(sb, plane)!
            let dBase = CVPixelBufferGetBaseAddressOfPlane(d, plane)!
            for r in 0..<(OUT_H/div) {
                memcpy(dBase.advanced(by: r*dRow), sBase.advanced(by: (r + CROP_TOP/div)*sRow), min(sRow, dRow))
            }
        }
        CVPixelBufferUnlockBaseAddress(d, []); CVPixelBufferUnlockBaseAddress(sb, .readOnly)
        CVBufferPropagateAttachments(sb, d)
    }
    pending.append((d, CMSampleBufferGetPresentationTimeStamp(s), CMSampleBufferGetDuration(s)))
}

let n = pending.count
let step = retimeTo > 0 ? retimeTo/Double(n) : CMTimeGetSeconds(pending[1].1) - CMTimeGetSeconds(pending[0].1)
for (i, p) in pending.enumerated() {
    while !input.isReadyForMoreMediaData { usleep(2000) }
    let pt = CMTime(seconds: Double(i)*step, preferredTimescale: 90000)
    let d  = CMTime(seconds: step, preferredTimescale: 90000)
    if !input.append(makeSample(p.0, pt, d)) { print("append failed: \(writer.error!)"); break }
}
input.markAsFinished()
await writer.finishWriting()

let size = try! FileManager.default.attributesOfItem(atPath: a[2])[.size] as! Int
let d2 = try await AVURLAsset(url: dst).load(.duration)
print(String(format: "%-22@ %dx%-9@ %3d frames  %6.3fs  %5.1f KB   (%d kbps target)",
    dst.lastPathComponent as NSString, OUT_W, "\(OUT_H)" as NSString, n,
    CMTimeGetSeconds(d2), Double(size)/1024, kbps))
