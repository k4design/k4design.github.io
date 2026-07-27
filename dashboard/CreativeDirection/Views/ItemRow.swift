import SwiftUI

/// A status chip. Colour never carries meaning alone — a role always brings its
/// icon along, matching the web dashboard.
struct Chip: View {
    let text: String
    var role: String? = nil
    var muted = false

    var body: some View {
        HStack(spacing: 3) {
            if let role, role != "neutral" {
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
            Capsule().fill(color.opacity(role == nil ? 0.08 : 0.14))
        )
        .overlay(Capsule().strokeBorder(color.opacity(role == nil ? 0.18 : 0.35), lineWidth: 0.5))
    }

    private var color: Color {
        if let role, role != "neutral" { return Theme.role(role) }
        return muted ? .secondary : .primary.opacity(0.75)
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
/// the board is still where you do the work.
struct ItemRow: View {
    @Environment(DashboardStore.self) private var store

    let item: Item
    var rank: Int? = nil
    var showReasons = false
    var showBoard = false
    var showStatus = false
    var hideOwner = false
    var extraChips: [(String, String?)] = []

    private var slot: Int { store.slot(for: item.owner) }

    var body: some View {
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
            if item.isSub, let parent = item.parentName {
                Chip(text: "in \(parent)", muted: true)
            }
            if showReasons, let reasons = item.reasons {
                ForEach(reasons.prefix(3), id: \.self) { r in
                    Chip(text: r.text, role: r.role)
                }
            }
            ForEach(Array(extraChips.enumerated()), id: \.offset) { _, pair in
                Chip(text: pair.0, role: pair.1)
            }
            if showStatus, let status = item.status {
                Chip(text: status, muted: true)
            }
            // Explain why this one isn't in the alert lists.
            if item.alertSuppressed == true, let temp = item.temperature {
                Chip(text: "\(temp) — no alerts", muted: true)
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
