import WebKit
import AppKit
// jseval <url> <waitMs> <W> <H> <jsFile>  - loads a page in a real WKWebView at WxH,
// waits, evaluates the JavaScript in <jsFile> and prints its JSON result.
// Exists because a headless/hidden browser gives every element a zero rect: layout
// needs a real viewport. Used to measure the deck's own mockups (bsq_check_deck.py).
let a = CommandLine.arguments
let url = URL(string: a[1])!, wait = Double(a[2])! / 1000, W = Int(a[3])!, H = Int(a[4])!
let js = try! String(contentsOfFile: a[5], encoding: .utf8)
let app = NSApplication.shared; app.setActivationPolicy(.prohibited)
let cfg = WKWebViewConfiguration()
cfg.mediaTypesRequiringUserActionForPlayback = []
let web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
let win = NSWindow(contentRect: NSRect(x: -20000, y: -20000, width: W, height: H),
                   styleMask: .borderless, backing: .buffered, defer: false)
win.contentView = web; win.orderBack(nil)
final class Nav: NSObject, WKNavigationDelegate {
    let js: String, wait: Double
    init(_ j: String, _ w: Double) { js = j; wait = w }
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
            w.evaluateJavaScript("JSON.stringify((function(){\(self.js)})())") { r, e in
                if let s = r as? String { print(s); exit(0) }
                print("js failed: \(e.map { "\($0)" } ?? "nil")"); exit(1)
            }
        }
    }
    func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print("nav failed: \(e)"); exit(1) }
    func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print("nav failed: \(e)"); exit(1) }
}
let nav = Nav(js, wait)
web.navigationDelegate = nav
web.load(URLRequest(url: url))
DispatchQueue.main.asyncAfter(deadline: .now() + 40) { print("timeout"); exit(2) }
app.run()
