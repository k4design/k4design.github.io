import SwiftUI

/// Capacity, with the same tap-to-expand behaviour as the web app: tap a person
/// and their open work drops in beneath them, worst-first.
struct TeamView: View {
    @Environment(DashboardStore.self) private var store
    @State private var expanded: Set<String> = []

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                if let slice = store.slice {
                    SectionHeader(title: "Who is carrying what", detail: "open work, recurring excluded")

                    if slice.load.isEmpty {
                        EmptyPanel(message: "Nobody has open work.", icon: "person.2")
                    } else {
                        let max = slice.load.map(\.total).max() ?? 1
                        ForEach(slice.load) { row in
                            CapacityRow(
                                row: row,
                                maxTotal: max,
                                slot: row.person == "Unassigned" ? 0 : store.slot(for: row.person),
                                isExpanded: expanded.contains(row.person),
                                toggle: { toggle(row.person) }
                            )
                        }
                        legend
                        hygiene(slice)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }

    private func toggle(_ person: String) {
        if expanded.contains(person) { expanded.remove(person) } else { expanded.insert(person) }
    }

    private var legend: some View {
        FlowLayout(spacing: 12) {
            ForEach(
                [("idle", "Not started"), ("flight", "In progress"),
                 ("you", "With you"), ("stalled", "Blocked/waiting")],
                id: \.0
            ) { key, label in
                HStack(spacing: 5) {
                    RoundedRectangle(cornerRadius: 2).fill(Theme.lane(key)).frame(width: 9, height: 9)
                    Text(label).font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
        }
        .padding(.top, 6)
    }

    private func hygiene(_ slice: ScopeSlice) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Board hygiene", detail: "\(slice.hygiene.scoped) open items")
            Meter(label: "Has a due date", pct: slice.hygiene.dateCoverage)
            Meter(label: "Has an owner", pct: slice.hygiene.assignedCoverage)
            Meter(label: "Has a status", pct: slice.hygiene.statusCoverage)
        }
        .padding(.top, 8)
    }
}

struct CapacityRow: View {
    let row: LoadRow
    let maxTotal: Int
    let slot: Int
    let isExpanded: Bool
    let toggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: toggle) {
                HStack(spacing: 9) {
                    if slot > 0 {
                        Circle().fill(Theme.slotFill(slot)).frame(width: 8, height: 8)
                    }
                    Text(row.person)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(row.person == "Unassigned" ? .secondary : .primary)
                        .lineLimit(1)
                    if row.overloaded {
                        Image(systemName: "circle.fill")
                            .font(.system(size: 6))
                            .foregroundStyle(Theme.warning)
                    }
                    Spacer(minLength: 8)
                    bar
                        .frame(width: 90, height: 14)
                    Text("\(row.total)")
                        .font(.system(size: 13))
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                        .frame(width: 22, alignment: .trailing)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.vertical, 9)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isButton)
            .accessibilityHint(isExpanded ? "Hides this work" : "Shows \(row.total) open items")

            if isExpanded {
                VStack(spacing: 5) {
                    ForEach(row.items) { item in
                        ItemRow(item: item, showBoard: true, showStatus: true, hideOwner: true,
                                extraChips: lateChip(item))
                    }
                }
                .padding(.leading, 14)
                .padding(.bottom, 10)
            }

            Divider().opacity(0.4)
        }
        // Expanding is a deliberate, occasional action, so it earns a short
        // animation — but only opacity and offset, never a height tween.
        .animation(.easeOut(duration: 0.18), value: isExpanded)
    }

    private func lateChip(_ item: Item) -> [(String, String?)] {
        if item.overdue { return [("\(item.daysOverdue)d overdue", "critical")] }
        if item.daysToDue == 0 { return [("due today", "serious")] }
        return []
    }

    private var bar: some View {
        GeometryReader { geo in
            let width = geo.size.width * (Double(row.total) / Double(Swift.max(maxTotal, 1)))
            HStack(spacing: 2) {
                ForEach(row.buckets, id: \.key) { bucket in
                    Rectangle()
                        .fill(Theme.lane(bucket.key))
                        .frame(maxWidth: .infinity)
                        .layoutPriority(Double(bucket.count))
                }
            }
            .frame(width: Swift.max(width, 4))
            .clipShape(RoundedRectangle(cornerRadius: 3))
            .frame(maxHeight: .infinity, alignment: .center)
        }
    }
}

struct Meter: View {
    let label: String
    let pct: Int

    private var role: String {
        pct >= 90 ? "good" : pct >= 60 ? "warning" : "critical"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(label).font(.system(size: 13)).foregroundStyle(.secondary)
                Spacer()
                Text("\(pct)%").font(.system(size: 13, weight: .semibold)).monospacedDigit()
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.role(role).opacity(0.2))
                    Capsule().fill(Theme.role(role))
                        .frame(width: geo.size.width * Double(pct) / 100)
                }
            }
            .frame(height: 7)
        }
    }
}
