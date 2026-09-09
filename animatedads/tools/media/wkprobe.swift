import WebKit
import AppKit
// wkprobe <url> <waitMs> <block|allow> <W> <H> <out.jpg>  - loads in WKWebView (Safari engine), optionally with autoplay BLOCKED
// (emulating Low Power Mode / "Never Auto-Play"), waits, dumps runtime state as JSON and saves a real (un-frozen) snapshot.
let a = CommandLine.arguments
let url = URL(string: a[1])!, wait = Double(a[2])! / 1000, block = a[3] == "block", W = Int(a[4])!, H = Int(a[5])!, out = a[6]
let app = NSApplication.shared; app.setActivationPolicy(.prohibited)
let cfg = WKWebViewConfiguration()
cfg.mediaTypesRequiringUserActionForPlayback = block ? .all : []
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
let win = NSWindow(contentRect: NSRect(x: -20000, y: -20000, width: W, height: H), styleMask: .borderless, backing: .buffered, defer: false)
win.contentView = web; win.orderBack(nil)
final class Nav: NSObject, WKNavigationDelegate {
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        var js = """
        (function(){ var g=function(s){var e=document.querySelector(s);return e?getComputedStyle(e).display:'-'};
          var v=document.querySelector('video'); var ad=document.getElementById('ad'); var tr=document.getElementById('track');
          var dots=[].slice.call(document.querySelectorAll('#dots button')).map(function(d){return d.className}).join('|');
          var f1=document.getElementById('f1'); var anim=(f1&&f1.getAnimations)?f1.getAnimations().length:-1;
          return JSON.stringify({adClass:ad&&ad.className, video:v?{paused:v.paused,t:v.currentTime,rs:v.readyState,display:g('video'),err:v.error&&v.error.code}:null,
            track:tr?getComputedStyle(tr).transform:null, trackDisplay:g('#track'), prev:g('#prev'), dots:dots, f1Anims:anim,
            imgs:[].slice.call(document.querySelectorAll('#track img')).map(function(i){return i.naturalWidth}).join(',')}); })()
        """
        if a.count > 7 { js = try! String(contentsOfFile: a[7]) }
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
            w.evaluateJavaScript(js) { r, e in
                print(r as? String ?? "js error: \(e.map{"\($0)"} ?? "")")
                let sc = WKSnapshotConfiguration(); sc.rect = CGRect(x: 0, y: 0, width: W, height: H); sc.snapshotWidth = NSNumber(value: W)
                w.takeSnapshot(with: sc) { img, _ in
                    if let img = img, let t = img.tiffRepresentation, let rep = NSBitmapImageRep(data: t), let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) { try! jpg.write(to: URL(fileURLWithPath: out)) }
                    exit(0)
                }
            }
        }
    }
}
let nav = Nav(); web.navigationDelegate = nav; web.load(URLRequest(url: url))
DispatchQueue.main.asyncAfter(deadline: .now() + 40) { print("timeout"); exit(2) }
app.run()
