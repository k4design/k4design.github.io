import WebKit
import AppKit
// snap <url> <out.jpg> <freezeAtMs> <jpegQuality>
let a = CommandLine.arguments
let url = URL(string: a[1])!, out = a[2], freeze = a[3], q = Double(a[4])!
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)                       // never steals focus

let cfg = WKWebViewConfiguration()
cfg.mediaTypesRequiringUserActionForPlayback = []          // let the muted video start
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: 300, height: 250), configuration: cfg)
let win = NSWindow(contentRect: NSRect(x: -20000, y: -20000, width: 300, height: 250),
                   styleMask: .borderless, backing: .buffered, defer: false)
win.contentView = web
win.orderBack(nil)                                         // parked far off-screen

final class Nav: NSObject, WKNavigationDelegate {
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        let js = """
        (function(){
          var t=\(freeze);
          document.getAnimations().forEach(function(a){ if(a.animationName!=='kf_cta_bob'){ a.pause(); a.currentTime=t; } });
          var v=document.querySelector('video'); if(v){ v.pause(); v.currentTime=(t/1000)%v.duration; }
          return document.readyState;
        })()
        """
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            w.evaluateJavaScript(js) { _, _ in
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    let sc = WKSnapshotConfiguration()
                    sc.rect = CGRect(x: 0, y: 0, width: 300, height: 250)
                    sc.snapshotWidth = 300                  // 1x pixels, not Retina
                    w.takeSnapshot(with: sc) { img, err in
                        guard let img = img, let tiff = img.tiffRepresentation,
                              let rep = NSBitmapImageRep(data: tiff),
                              let jpg = rep.representation(using: .jpeg, properties: [.compressionFactor: q]) else {
                            print("snapshot failed: \(err.map { "\($0)" } ?? "nil")"); exit(1)
                        }
                        try! jpg.write(to: URL(fileURLWithPath: out))
                        print("\(out): \(rep.pixelsWide)x\(rep.pixelsHigh) \(jpg.count) bytes")
                        exit(0)
                    }
                }
            }
        }
    }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print("nav failed: \(e)"); exit(1) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print("nav failed: \(e)"); exit(1) }
}
let nav = Nav()
web.navigationDelegate = nav
web.load(URLRequest(url: url))
DispatchQueue.main.asyncAfter(deadline: .now() + 20) { print("timeout"); exit(2) }
app.run()
