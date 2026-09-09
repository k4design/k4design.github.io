import CoreText
let q = CommandLine.arguments.dropFirst().map { $0.lowercased() }
let names = (CTFontManagerCopyAvailablePostScriptNames() as! [String])
for term in q { let hits = names.filter { $0.lowercased().contains(term) }; print("\(term): " + (hits.isEmpty ? "NOT INSTALLED" : hits.joined(separator: ", "))) }
