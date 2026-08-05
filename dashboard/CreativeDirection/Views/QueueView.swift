import SwiftUI

/// Your approval queue and everything stuck. These are the two lists where the
/// next action is yours, which is what makes them worth a phone screen.
struct QueueView: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if let slice = store.slice {
                    reviewSection(slice)
                    stalledSection(slice)
                    deadlineSection(slice)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }

    private func reviewSection(_ slice: ScopeSlice) -> some View {
        let items = store.filtered(slice.review)
        let t = store.snapshot?.thresholds
        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Your approval queue", detail: items.isEmpty ? nil : "\(items.count)")
            if items.isEmpty {
                EmptyPanel(message: "Nothing is waiting on you.")
            } else {
                ForEach(items) { item in
                    let days = item.daysStale ?? 0
                    let role = days >= (t?.reviewWaitCriticalDays ?? 5) ? "critical"
                             : days >= (t?.reviewWaitWarnDays ?? 2) ? "warning" : nil
                    ItemRow(
                        item: item,
                        showBoard: true,
                        extraChips: [(days > 0 ? "\(days)d waiting" : "just now", role)]
                    )
                }
            }
        }
    }

    private func stalledSection(_ slice: ScopeSlice) -> some View {
        let items = store.filtered(slice.stalled)
        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Stalled — who to chase", detail: items.isEmpty ? nil : "\(items.count)")
            if items.isEmpty {
                EmptyPanel(message: "Nothing is stuck.")
            } else {
                ForEach(items) { item in
                    ItemRow(
                        item: item,
                        extraChips: [
                            (item.status ?? item.laneLabel, item.lane == "blocked" ? "critical" : "serious")
                        ]
                    )
                }
            }
        }
    }

    private func deadlineSection(_ slice: ScopeSlice) -> some View {
        let groups: [(String, String?, [Item])] = [
            ("Overdue", "critical", store.filtered(slice.deadlines.overdue)),
            ("Due today", "serious", store.filtered(slice.deadlines.today)),
            ("Next 7 days", nil, store.filtered(slice.deadlines.thisWeek)),
        ]
        let total = groups.reduce(0) { $0 + $1.2.count }

        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Deadlines", detail: total > 0 ? "\(total)" : nil)

            if !slice.datesTracked {
                // Saying "nothing is due" here would be a lie — this board has
                // no date column at all.
                EmptyPanel(message: "This board has no due-date column.", icon: "calendar.badge.exclamationmark")
            } else if total == 0 {
                EmptyPanel(message: "Nothing dated is coming up.", icon: "calendar")
            } else {
                ForEach(Array(groups.enumerated()), id: \.offset) { _, group in
                    if !group.2.isEmpty {
                        Text(group.0.uppercased())
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(0.7)
                            .foregroundStyle(group.1 == nil ? .secondary : Theme.role(group.1))
                            .padding(.top, 4)
                        ForEach(group.2) { item in
                            ItemRow(item: item, showStatus: true, showDueAlert: true)
                        }
                    }
                }
            }
        }
    }

}
