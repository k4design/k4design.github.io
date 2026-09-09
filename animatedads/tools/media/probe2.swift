import AVFoundation
let a=CommandLine.arguments; let asset=AVURLAsset(url:URL(fileURLWithPath:a[1]))
let d=try await asset.load(.duration); let t=try await asset.loadTracks(withMediaType:.video)[0]
let sz=try await t.load(.naturalSize); let fps=try await t.load(.nominalFrameRate); let br=try await t.load(.estimatedDataRate)
let au=try await asset.loadTracks(withMediaType:.audio).count
print(String(format:"%.0fx%.0f  %.3fs  %.2f fps  %.0f kbps  audio tracks: %d", sz.width, sz.height, CMTimeGetSeconds(d), fps, br/1000, au))
