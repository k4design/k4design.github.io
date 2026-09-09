import AVFoundation
let a=CommandLine.arguments
for p in a.dropFirst() {
  let asset=AVURLAsset(url:URL(fileURLWithPath:p))
  let d=try await asset.load(.duration)
  let t=try await asset.loadTracks(withMediaType:.video)[0]
  print(String(format:"%@  dur=%.4fs  fps=%.4f", (p as NSString).lastPathComponent, CMTimeGetSeconds(d), try await t.load(.nominalFrameRate)))
}
