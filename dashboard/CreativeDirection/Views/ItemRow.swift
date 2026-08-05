import SwiftUI

/// A status chip. Colour never carries meaning alone — a role always brings its
/// icon along, matching the web dashboard.
struct Chip: View {
    let text: String
    var role: String? = nil
    var muted = false
    /// Explicit SF Symbol, for chips whose meaning needs an icon without a
    /// severity role — e.g. the snowflake on Cold listings.
    var icon: String? = nil
    /// A slow breathing glow, for the one alert that should catch the eye from
    /// across the room: something due in two days or less.
    var pulse = false

    @State private var lit = false
    /// Motion is the signal here, so honour the system setting: with Reduce
    /// Motion on, the chip holds the bright end of the pulse instead of
    /// animating. Still unmistakable, just still.
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 3) {
            if let icon {
                Image(systemName: icon)
                    .font(.system(size: 8, weight: .semibold))
            } else if let role, role != "neutral" {
                Image(systemName: Theme.roleIcon(role))
                    .font(.system(size: 7, weight: .bold))
            }
            Text(text)
        }
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(color)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(
            Capsule().fill(color.opacity(role == nil ? 0.08 : (pulse ? 0.20 : 0.14)))
        )
        .overlay(Capsule().strokeBorder(color.opacity(role == nil ? 0.18 : 0.35), lineWidth: 0.5))
        .modifier(PulseGlow(active: pulse, color: color, lit: lit || reduceMotion))
        .onAppear {
            guard pulse, !reduceMotion else { return }
            // ~1.6s each way: a breath, not a blink. Fast flashing on a card
            // that sits on screen all day would be unusable.
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                lit = true
            }
        }
    }

    private var color: Color {
        if let role, role != "neutral" { return Theme.role(role) }
        return muted ? .secondary : .primary.opacity(0.75)
    }
}

/// The glow behind an urgent chip. Only opacity animates — no layout, no blur
/// radius changes — so a chip can breathe indefinitely without costing frames.
private struct PulseGlow: ViewModifier {
    let active: Bool
    let color: Color
    let lit: Bool

    func body(content: Content) -> some View {
        if active {
            // The halo is built from concentric rings with a decaying opacity
            // rather than a blur or a shadow. Both of those are dropped by
            // SwiftUI's offscreen rasteriser, so the effect could never be
            // checked in a snapshot; rings render identically everywhere and
            // animate on opacity alone.
            content
                .background(
                    ZStack {
                        Capsule().strokeBorder(color, lineWidth: 2)
                            .opacity(lit ? 0.50 : 0.04).padding(-2)
                        Capsule().strokeBorder(color, lineWidth: 3)
                            .opacity(lit ? 0.26 : 0.02).padding(-5)
                        Capsule().strokeBorder(color, lineWidth: 4)
                            .opacity(lit ? 0.12 : 0.0).padding(-9)
                    }
                )
                .overlay(
                    Capsule()
                        .strokeBorder(color, lineWidth: 1)
                        .opacity(lit ? 1.0 : 0.25)
                )
                // Kept as well: on a real screen this softens the ring falloff
                // into a true bloom. Purely additive to the rings above.
                .shadow(color: color.opacity(lit ? 0.7 : 0.05), radius: 6)
        } else {
            content
        }
    }
}

/// Initials inside the assignee's colour, name beside it. This pairing is what
/// makes identity unambiguous — the hue alone can't be trusted to separate five
/// people, so it's a scanning aid and the label is the truth.
struct OwnerChip: View {
    let people: [String]
    let slot: Int

    var body: some View {
        if people.isEmpty {
            Chip(text: "Unassigned", role: "warning")
        } else {
            HStack(spacing: 5) {
                Text(Fmt.initials(people[0]))
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(Theme.slotInk(slot))
                    .frame(width: 16, height: 16)
                    .background(Circle().fill(Theme.slotFill(slot)))
                Text(people[0])
                    .font(.system(size: 11, weight: .medium))
                if people.count > 1 {
                    Text("+\(people.count - 1)")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.leading, 2)
            .padding(.trailing, 7)
            .padding(.vertical, 2)
            .background(Capsule().fill(Color.primary.opacity(0.05)))
        }
    }
}

/// One project row. Tapping opens it in monday — the app is a triage surface,
/// the board is still where you do the work. Parents with subtasks gain a
/// toggle bar that drops the children down beneath the card.
struct ItemRow: View {
    @Environment(DashboardStore.self) private var store

    let item: Item
    var rank: Int? = nil
    var showReasons = false
    var showBoard = false
    var showStatus = false
    /// Show this item's date alert (late / due today / due in Nd), pulsing red
    /// when it falls inside the two-day window.
    var showDueAlert = false
    var hideOwner = false
    var insideParent = false
    var extraChips: [(String, String?)] = []

    @State private var subsOpen = false

    private var slot: Int { store.slot(for: item.owner) }
    private var children: [Item] { insideParent ? [] : (item.children ?? []) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            card
            if !children.isEmpty {
                subToggle
                if subsOpen {
                    VStack(spacing: 4) {
                        ForEach(children) { child in
                            ItemRow(item: child, showStatus: true, insideParent: true)
                        }
                    }
                    .padding(.leading, 14)
                    .overlay(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 1)
                            .fill(Color.primary.opacity(0.1))
                            .frame(width: 2)
                    }
                    .padding(.top, 4)
                }
            }
        }
        // opening the drop-down is deliberate and occasional — brief and flat
        .animation(.easeOut(duration: 0.16), value: subsOpen)
    }

    private var subToggle: some View {
        Button {
            subsOpen.toggle()
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 8, weight: .semibold))
                    .rotationEffect(.degrees(subsOpen ? 90 : 0))
                let total = item.subCount ?? children.count
                let open = item.openSubCount ?? 0
                Text("\(total) subtask\(total == 1 ? "" : "s")" + (open != total ? " · \(open) open" : ""))
                Spacer(minLength: 0)
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 11)
            .padding(.vertical, 5)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityHint(subsOpen ? "Hides the subtasks" : "Shows the subtasks")
    }

    private var card: some View {
        Link(destination: URL(string: item.url) ?? URL(string: "https://monday.com")!) {
            HStack(alignment: .top, spacing: 10) {
                // Assignee edge bar — the scanning channel.
                RoundedRectangle(cornerRadius: 2)
                    .fill(slot == 0 ? Color.clear : Theme.slotFill(slot))
                    .frame(width: 3)

                VStack(alignment: .leading, spacing: 7) {
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        if let rank {
                            Text("\(rank)")
                                .font(.system(size: 11, weight: .semibold))
                                .monospacedDigit()
                                .foregroundStyle(.tertiary)
                        }
                        Text(item.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.up.forward")
                            .font(.system(size: 9))
                            .foregroundStyle(.tertiary)
                    }

                    chips
                }
            }
            .padding(.vertical, 9)
            .padding(.horizontal, 11)
            .background(RoundedRectangle(cornerRadius: Theme.cardCorner).fill(Color.primary.opacity(0.035)))
        }
        .buttonStyle(.plain)
    }

    private var chips: some View {
        // A wrapping flow: chip counts vary a lot per panel and a phone is narrow.
        FlowLayout(spacing: 5) {
            if item.isSub, let parent = item.parentName, !insideParent {
                Chip(text: "in \(parent)", muted: true)
            }
            if showReasons, let reasons = item.reasons {
                ForEach(reasons.prefix(3), id: \.self) { r in
                    // A date reason inside the two-day window is the urgent
                    // case, whatever severity the server assigned it.
                    let urgent = (r.kind == "overdue" || r.kind == "due") && item.dueUrgent
                    Chip(text: r.text, role: urgent ? "critical" : r.role, pulse: urgent)
                }
            }
            if showDueAlert, let alert = item.dueAlert {
                Chip(text: alert.text, role: alert.role, pulse: alert.pulse)
            }
            ForEach(Array(extraChips.enumerated()), id: \.offset) { _, pair in
                Chip(text: pair.0, role: pair.1)
            }
            // A stamped status carries its moment with it, and is worth showing
            // even in panels that otherwise hide the status column — the point
            // of "Proofs Sent" is when it was sent.
            if let status = item.status, showStatus || item.statusSetAt != nil {
                if let when = Fmt.stamp(item.statusSetAt) {
                    Chip(text: "\(status) · \(when)", muted: true, icon: "clock")
                } else {
                    Chip(text: status, muted: true)
                }
            }
            // Explain why this one isn't in the alert lists. The snowflake is
            // the identity channel; the ice hue in the bar is the scanning aid.
            // Explains an otherwise puzzling gap: four rows under "2 subtasks".
            if item.step == true {
                Chip(text: "step — not counted", muted: true, icon: "number")
            }
            if item.alertSuppressed == true, let temp = item.temperature {
                Chip(text: "\(temp) — no alerts", muted: true, icon: "snowflake")
            }
            if showBoard {
                Chip(text: item.boardLabel, muted: true)
            }
            if !hideOwner, !(item.reasons?.contains(where: { $0.kind == "unassigned" }) ?? false) {
                OwnerChip(people: item.people, slot: slot)
            }
        }
    }
}

/// Minimal wrapping stack. SwiftUI has no built-in flow layout, and chips must
/// wrap rather than clip or squeeze on a narrow screen.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth == .infinity ? x : maxWidth, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

/// Distinguishes "nothing is wrong" from "your filter hid it" — the same
/// wayfinding rule as the web app, so an empty screen is never a dead end.
struct EmptyPanel: View {
    @Environment(DashboardStore.self) private var store
    let message: String
    var icon = "checkmark"

    var body: some View {
        VStack(spacing: 9) {
            if store.filter.isEmpty {
                Image(systemName: icon).font(.system(size: 20)).foregroundStyle(.tertiary)
                Text(message).font(.system(size: 13)).foregroundStyle(.secondary)
            } else {
                Image(systemName: "magnifyingglass").font(.system(size: 20)).foregroundStyle(.tertiary)
                Text("Nothing here matches “\(store.filter)”.")
                    .font(.system(size: 13)).foregroundStyle(.secondary)
                Button("Show everything") { store.filter = "" }
                    .font(.system(size: 13, weight: .medium))
            }
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
    }
}
