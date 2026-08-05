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
                    HStack(alignment: .firstTextBaseline) {
                        SectionHeader(
                            title: "Who is carrying what",
                            detail: store.showRecurring ? "recurring included" : "recurring hidden"
                        )
                        Spacer()
                        Button {
                            store.showRecurring.toggle()
                        } label: {
                            Text("Recurring")
                                .font(.system(size: 10, weight: .semibold))
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(
                                    Capsule().fill(store.showRecurring
                                        ? Theme.laneRecurring.opacity(0.25)
                                        : Color.primary.opacity(0.06))
                                )
                                .foregroundStyle(store.showRecurring ? .primary : .secondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Include recurring weekly work")
                        .accessibilityAddTraits(store.showRecurring ? [.isSelected] : [])
                    }

                    let rows = slice.load.filter { $0.visibleTotal(includeRecurring: store.showRecurring) > 0 }
                    if rows.isEmpty {
                        EmptyPanel(message: "Nobody has open work.", icon: "person.2")
                    } else {
                        let max = rows.map { $0.visibleTotal(includeRecurring: store.showRecurring) }.max() ?? 1
                        ForEach(rows) { row in
                            CapacityRow(
                                row: row,
                                maxTotal: max,
                                slot: row.person == "Unassigned" ? 0 : store.slot(for: row.person),
                                showRecurring: store.showRecurring,
                                isExpanded: expanded.contains(row.person),
                                toggle: { toggle(row.person) }
                            )
                        }
                        legend
                        hygiene(slice)
                        backBurner(slice)
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
                 ("you", "With you"), ("stalled", "Blocked/waiting")]
                    + (store.showRecurring ? [("recurring", "Recurring")] : []),
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

    private func backBurner(_ slice: ScopeSlice) -> some View {
        let items = store.filtered(slice.shelved)
        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(
                title: "Back burner",
                detail: items.isEmpty ? "no alerts, no stats" : "\(items.count) · no alerts, no stats"
            )
            if items.isEmpty {
                EmptyPanel(message: "Nothing is on the back burner.", icon: "tray")
            } else {
                ForEach(items) { item in
                    ItemRow(
                        item: item,
                        showStatus: true,
                        extraChips: (item.daysStale ?? 0) > 0 ? [("\(item.daysStale!)d untouched", nil)] : []
                    )
                }
            }
        }
        .padding(.top, 8)
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
    var showRecurring = false
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
                    Text("\(row.visibleTotal(includeRecurring: showRecurring))")
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
            .accessibilityHint(isExpanded ? "Hides this work" : "Shows \(row.visibleTotal(includeRecurring: showRecurring)) open items")

            if isExpanded {
                VStack(spacing: 5) {
                    ForEach(row.items.filter { showRecurring || $0.lane != "recurring" }) { item in
                        ItemRow(item: item, showBoard: true, showStatus: true,
                                showDueAlert: true, hideOwner: true)
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


    private var bar: some View {
        GeometryReader { geo in
            // Each segment's width must be computed from its share explicitly.
            // (layoutPriority does NOT proportion an HStack — it only orders who
            // is offered space, so the largest bucket swallowed the whole bar
            // and every other category rendered at zero width.)
            let buckets = row.buckets(includeRecurring: showRecurring)
            // visibleTotal, not row.total: segments must always sum to the bar.
            let visible = Double(Swift.max(row.visibleTotal(includeRecurring: showRecurring), 1))
            let barWidth = Swift.max(geo.size.width * (visible / Double(Swift.max(maxTotal, 1))), 4)
            let gaps = Double(Swift.max(buckets.count - 1, 0)) * 2
            let usable = Swift.max(barWidth - gaps, Double(buckets.count) * 2)
            let total = visible

            HStack(spacing: 2) {
                ForEach(buckets, id: \.key) { bucket in
                    Rectangle()
                        .fill(Theme.lane(bucket.key))
                        // floor of 2pt so a 1-item slice stays visible
                        .frame(width: Swift.max(usable * Double(bucket.count) / total, 2))
                }
            }
            .frame(width: barWidth, alignment: .leading)
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


/// The R&D scope's entire content: a plain list of tagged projects grouped by
/// assignee. Exploration, not pipeline — no KPIs, no tabs, no queues.
struct RnDView: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 6) {
                let groups = (store.slice?.rndGroups ?? [])
                    .map { g in (g.person, store.filtered(g.items)) }
                    .filter { !$0.1.isEmpty }

                SectionHeader(
                    title: "R&D projects",
                    detail: groups.isEmpty ? nil : "\(groups.reduce(0) { $0 + $1.1.count }) · grouped by assignee"
                )

                if groups.isEmpty {
                    EmptyPanel(message: "Nothing is tagged R&D yet.", icon: "flask")
                } else {
                    ForEach(groups, id: \.0) { person, items in
                        HStack(spacing: 7) {
                            let slot = person == "Unassigned" ? 0 : store.slot(for: person)
                            Text(person == "Unassigned" ? "—" : Fmt.initials(person))
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(Theme.slotInk(slot))
                                .frame(width: 18, height: 18)
                                .background(Circle().fill(Theme.slotFill(slot)))
                            Text(person).font(.system(size: 13, weight: .semibold))
                            Text("\(items.count)").font(.system(size: 12)).foregroundStyle(.tertiary)
                        }
                        .padding(.top, 10)

                        ForEach(items) { item in
                            ItemRow(
                                item: item,
                                showStatus: true,
                                hideOwner: true,
                                extraChips: (item.daysStale ?? 0) > 0 ? [("\(item.daysStale!)d untouched", nil)] : []
                            )
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }
}
