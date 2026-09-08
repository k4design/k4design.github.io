import Foundation
import CoreText
import CoreGraphics
// usage: outline <PostScriptName> <size> <x> <baselineY> <text>  -> SVG path d (y down)
let a = CommandLine.arguments
let font = CTFontCreateWithName(a[1] as CFString, CGFloat(Double(a[2])!), nil)
let x0 = Double(a[3])!, y0 = Double(a[4])!, text = a[5...].joined(separator: " ")
let attr = NSAttributedString(string: text, attributes: [kCTFontAttributeName as NSAttributedString.Key: font])
let line = CTLineCreateWithAttributedString(attr)
var d = ""
func f(_ v: CGFloat) -> String { String(format: "%.2f", v) }
for run in CTLineGetGlyphRuns(line) as! [CTRun] {
    let n = CTRunGetGlyphCount(run)
    var glyphs = [CGGlyph](repeating: 0, count: n); var pos = [CGPoint](repeating: .zero, count: n)
    CTRunGetGlyphs(run, CFRangeMake(0, n), &glyphs); CTRunGetPositions(run, CFRangeMake(0, n), &pos)
    let rf = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName] as! CTFont
    for i in 0..<n {
        var t = CGAffineTransform(a: 1, b: 0, c: 0, d: -1, tx: CGFloat(x0) + pos[i].x, ty: CGFloat(y0) - pos[i].y)
        guard let p = CTFontCreatePathForGlyph(rf, glyphs[i], &t) else { continue }
        p.applyWithBlock { e in
            let pts = e.pointee.points
            switch e.pointee.type {
            case .moveToPoint: d += "M\(f(pts[0].x)) \(f(pts[0].y))"
            case .addLineToPoint: d += "L\(f(pts[0].x)) \(f(pts[0].y))"
            case .addQuadCurveToPoint: d += "Q\(f(pts[0].x)) \(f(pts[0].y)) \(f(pts[1].x)) \(f(pts[1].y))"
            case .addCurveToPoint: d += "C\(f(pts[0].x)) \(f(pts[0].y)) \(f(pts[1].x)) \(f(pts[1].y)) \(f(pts[2].x)) \(f(pts[2].y))"
            case .closeSubpath: d += "Z"
            @unknown default: break
            }
        }
    }
}
let w = CTLineGetTypographicBounds(line, nil, nil, nil)
FileHandle.standardError.write("advance \(w)\n".data(using: .utf8)!)
print(d)
