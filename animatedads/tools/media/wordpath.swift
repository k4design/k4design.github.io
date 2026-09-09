import CoreText
import AppKit
// wordpath <postscript-font> <size> <word...>  -> JSON per word: svg path (baseline y=0, x from 0, y down), advance, metrics
let a = CommandLine.arguments
let font = CTFontCreateWithName(a[1] as CFString, CGFloat(Double(a[2])!), nil)
func svg(_ p: CGPath) -> String {
    var d = ""; func f(_ v: CGFloat) -> String { String(format: "%.2f", v) }
    p.applyWithBlock { e in
        let pts = e.pointee.points
        switch e.pointee.type {
        case .moveToPoint: d += "M\(f(pts[0].x)) \(f(-pts[0].y))"
        case .addLineToPoint: d += "L\(f(pts[0].x)) \(f(-pts[0].y))"
        case .addQuadCurveToPoint: d += "Q\(f(pts[0].x)) \(f(-pts[0].y)) \(f(pts[1].x)) \(f(-pts[1].y))"
        case .addCurveToPoint: d += "C\(f(pts[0].x)) \(f(-pts[0].y)) \(f(pts[1].x)) \(f(-pts[1].y)) \(f(pts[2].x)) \(f(-pts[2].y))"
        case .closeSubpath: d += "Z"
        @unknown default: break
        }
    }
    return d
}
var out: [String] = []
for word in a[3...] {
    let attr = NSAttributedString(string: word, attributes: [.font: font as Any, .kern: 0])
    let line = CTLineCreateWithAttributedString(attr)
    let path = CGMutablePath()
    for run in CTLineGetGlyphRuns(line) as! [CTRun] {
        let n = CTRunGetGlyphCount(run)
        var glyphs = [CGGlyph](repeating: 0, count: n), pos = [CGPoint](repeating: .zero, count: n)
        CTRunGetGlyphs(run, CFRangeMake(0, n), &glyphs); CTRunGetPositions(run, CFRangeMake(0, n), &pos)
        for i in 0..<n {
            var t = CGAffineTransform(translationX: pos[i].x, y: pos[i].y)
            if let g = CTFontCreatePathForGlyph(font, glyphs[i], &t) { path.addPath(g) }
        }
    }
    let adv = CTLineGetTypographicBounds(line, nil, nil, nil)
    let bb = path.boundingBoxOfPath
    out.append(String(format: "{\"word\":\"%@\",\"advance\":%.2f,\"bbox\":[%.2f,%.2f,%.2f,%.2f],\"d\":\"%@\"}", word, adv, bb.minX, -bb.maxY, bb.maxX, -bb.minY, svg(path)))
}
print(String(format: "{\"font\":\"%@\",\"size\":%@,\"xHeight\":%.2f,\"capHeight\":%.2f,\"ascent\":%.2f,\"descent\":%.2f,\"words\":[%@]}",
             a[1], a[2], CTFontGetXHeight(font), CTFontGetCapHeight(font), CTFontGetAscent(font), CTFontGetDescent(font), out.joined(separator: ",")))
