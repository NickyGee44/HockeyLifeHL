import SwiftUI

private enum CaptainRoute: Hashable {
    case availability
    case invites
    case notes
}

struct CaptainRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    SurfaceCard(accent: AppTheme.warning) {
                        VStack(alignment: .leading, spacing: 14) {
                            SectionHeaderView(
                                "Captain desk",
                                eyebrow: "Operations",
                                subtitle: "A native replacement for the captain tab and its action stack."
                            )

                            if let nextGame = appModel.nextGame {
                                Text("Next action window: \(BLHFormatters.gameDate(nextGame.scheduledAt))")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }

                    ForEach(appModel.currentCaptainTasks) { task in
                        SurfaceCard(accent: task.status.tint) {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Label(task.title, systemImage: task.systemImage)
                                        .font(.headline.weight(.black))
                                        .foregroundStyle(AppTheme.textPrimary)
                                    Spacer()
                                    Text(task.status.rawValue)
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(.black)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(task.status.tint)
                                        .clipShape(Capsule())
                                }

                                Text(task.detail)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }

                    VStack(spacing: 12) {
                        NavigationLink(value: CaptainRoute.availability) {
                            captainLink(title: "Game availability", subtitle: "Review check-ins and roster count.", systemImage: "checklist")
                        }
                        .buttonStyle(.plain)

                        NavigationLink(value: CaptainRoute.invites) {
                            captainLink(title: "Invite players", subtitle: "Recruit subs and keep a bench list ready.", systemImage: "person.badge.plus")
                        }
                        .buttonStyle(.plain)

                        NavigationLink(value: CaptainRoute.notes) {
                            captainLink(title: "Lineup notes", subtitle: "Track units, matchups, and room reminders.", systemImage: "square.and.pencil")
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .navigationDestination(for: CaptainRoute.self) { route in
                switch route {
                case .availability:
                    GameAvailabilityView()
                case .invites:
                    InvitePlayersView()
                case .notes:
                    LineupNotesView()
                }
            }
        }
    }

    private func captainLink(title: String, subtitle: String, systemImage: String) -> some View {
        SurfaceCard(accent: AppTheme.accentSecondary) {
            HStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(AppTheme.accent)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline.weight(.black))
                        .foregroundStyle(AppTheme.textPrimary)

                    Text(subtitle)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Spacer()
            }
        }
    }
}

struct GameAvailabilityView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let nextGame = appModel.nextGame {
                    let summary = appModel.availabilitySummary(for: nextGame)

                    SurfaceCard(accent: AppTheme.success) {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Availability for \(appModel.opponentName(for: nextGame))")
                                .font(.headline.weight(.black))
                                .foregroundStyle(AppTheme.textPrimary)

                            HStack(spacing: 10) {
                                MetricPill(value: "\(summary.confirmed)", label: "In")
                                MetricPill(value: "\(summary.tentative)", label: "Maybe")
                                MetricPill(value: "\(summary.out)", label: "Out")
                            }
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Availability")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct InvitePlayersView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                EmptyStateCard(
                    title: "Sub list migration placeholder",
                    detail: "This is where spare skater pools, invite workflows, and availability shortcuts can move once the backend port starts.",
                    systemImage: "person.badge.plus"
                )
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: AppTheme.warning))
        .navigationTitle("Invite Players")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LineupNotesView: View {
    @State private var notes = "Unit 1: Nick / Luca / Ethan\nUnit 2: Mason with rotating winger\nGoalie: Noah\n\nBring dark jerseys and extra tape."

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                TextEditor(text: $notes)
                    .frame(minHeight: 320)
                    .padding(16)
                    .background(AppTheme.surface)
                    .overlay {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(AppTheme.stroke, lineWidth: 1)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: AppTheme.accentSecondary))
        .navigationTitle("Lineup Notes")
        .navigationBarTitleDisplayMode(.inline)
    }
}
