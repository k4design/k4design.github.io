import SwiftUI

/// The hero number, the four failure modes, then the ranked list. A phone gets
/// the triage surface only — the desktop keeps the deep panels.
struct TodayView: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if let slice = store.slice {
                    hero(slice)
                    kpiGrid(slice)
                    focusList(slice)
                } else if store.isLoading {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 60)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }

    // MARK: - Hero

    private func hero(_ slice: ScopeSlice) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Waiting on your review")
                .font(.system(size: 13, weight: .semibold))
            Text("\(slice.headline.needsReview)")
                .font(.system(size: 60, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(slice.headline.needsReview == 0 ? .secondary : .primary)
            Text(reviewFoot(slice))
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: Theme.corner)
                .fill(Theme.warning.opacity(0.08))
        )
        .overlay(alignment: .leading) {
            Rectangle().fill(Theme.warning).frame(width: 3)
                .clipShape(RoundedRectangle(cornerRadius: 2))
        }
        .clipShape(RoundedRectangle(cornerRadius: Theme.corner))
    }

    private func reviewFoot(_ slice: ScopeSlice) -> String {
        guard let oldest = slice.review.first else { return "Queue is clear" }
        return "oldest waiting \(oldest.daysStale ?? 0)d — \(oldest.name)"
    }

    // MARK: - KPIs

    private func kpiGrid(_ slice: ScopeSlice) -> some View {
        let h = slice.headline
        return LazyVGrid(
            columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
            spacing: 10
        ) {
            KPITile(label: "Overdue", value: h.overdue, role: "critical",
                    foot: slice.deadlines.overdue.first.map { "worst \($0.daysOverdue)d late" } ?? "nothing past due")
            KPITile(label: "Stalled", value: h.blocked, role: "serious",
                    foot: "blocked or waiting")
            KPITile(label: "Going stale", value: h.rotting, role: "warning",
                    foot: "untouched \(store.snapshot?.thresholds.staleWarnDays ?? 14)+ days")
            KPITile(label: "New requests", value: slice.intake.count, role: nil,
                    foot: h.untriaged > 0 ? "\(h.untriaged) untriaged" : "all fresh")
        }
    }

    // MARK: - Focus

    private func focusList(_ slice: ScopeSlice) -> some View {
        let items = store.filtered(slice.focus)
        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(
                title: "What to touch next",
                detail: items.isEmpty ? nil : "ranked by urgency"
            )
            if items.isEmpty {
                EmptyPanel(message: "Nothing is urgent. Genuinely.")
            } else {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    ItemRow(item: item, rank: i + 1, showReasons: true, showBoard: true)
                }
            }
        }
    }
}

struct KPITile: View {
    let label: String
    let value: Int
    let role: String?
    let foot: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 12)).foregroundStyle(.secondary)
            Text("\(value)")
                .font(.system(size: 30, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(value == 0 ? .secondary : .primary)
            Text(foot).font(.system(size: 11)).foregroundStyle(.tertiary).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Color.primary.opacity(0.04)))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(role == nil ? Color.secondary.opacity(0.35) : Theme.role(role))
                .frame(width: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: Theme.corner))
    }
}

struct SectionHeader: View {
    let title: String
    var detail: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(.secondary)
            if let detail {
                Spacer()
                Text(detail).font(.system(size: 11)).foregroundStyle(.tertiary)
            }
        }
        .padding(.top, 6)
    }
}
