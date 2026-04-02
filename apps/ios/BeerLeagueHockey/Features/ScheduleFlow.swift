import SwiftUI

struct ScheduleRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    topBar

                    if appModel.liveGames.isEmpty == false {
                        scheduleSection(
                            title: "Live now",
                            eyebrow: "Live",
                            games: appModel.liveGames,
                            accent: AppTheme.success
                        )
                    }

                    scheduleSection(
                        title: "Upcoming",
                        eyebrow: "Queue",
                        games: appModel.upcomingGames,
                        accent: appModel.currentLeague.primaryColor
                    )

                    scheduleSection(
                        title: "Finals",
                        eyebrow: "Archive",
                        games: appModel.recentResults,
                        accent: AppTheme.accentSecondary
                    )
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Game.self) { game in
                GameDetailView(game: game)
            }
        }
    }

    private var topBar: some View {
        VStack(alignment: .leading, spacing: 16) {
            LeagueSwitchMenu()

            VStack(alignment: .leading, spacing: 8) {
                Text("Game calendar")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.textSecondary)
                    .tracking(1.2)

                Text("Every matchup, one native flow")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.textPrimary)

                Text("This stack replaces the old React Navigation schedule flow with SwiftUI NavigationStack.")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }

    private func scheduleSection(title: String, eyebrow: String, games: [Game], accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeaderView(title, eyebrow: eyebrow)

            if games.isEmpty {
                EmptyStateCard(
                    title: "Nothing here yet",
                    detail: "Once the league posts games for this state, they will appear in this stack automatically.",
                    systemImage: "calendar.badge.exclamationmark"
                )
            } else {
                ForEach(games) { game in
                    NavigationLink(value: game) {
                        SurfaceCard(accent: accent) {
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    StatusBadge(status: game.status)
                                    Spacer()
                                    Text(BLHFormatters.gameDate(game.scheduledAt))
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(AppTheme.textSecondary)
                                }

                                Text("\(appModel.teamName(for: game.awayTeamID)) at \(appModel.teamName(for: game.homeTeamID))")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.textPrimary)

                                HStack(spacing: 10) {
                                    MetricPill(value: BLHFormatters.gameTime(game.scheduledAt), label: "Puck drop")
                                    MetricPill(value: game.rinkName, label: "Rink")
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct GameDetailView: View {
    @Environment(AppModel.self) private var appModel

    let game: Game

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                SurfaceCard(accent: appModel.currentLeague.primaryColor) {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack {
                            StatusBadge(status: game.status)
                            Spacer()
                            Text(BLHFormatters.gameDate(game.scheduledAt))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(AppTheme.textSecondary)
                        }

                        matchup

                        HStack(spacing: 12) {
                            MetricPill(value: game.rinkName, label: "Venue")
                            MetricPill(value: appModel.opponentName(for: game), label: "Opponent")
                        }
                    }
                }

                if appModel.isPreviewLeague {
                    EmptyStateCard(
                        title: "League preview",
                        detail: "Join this league to unlock check-ins, chat, and captain workflows.",
                        systemImage: "lock.rectangle.stack"
                    )
                } else {
                    SurfaceCard(accent: AppTheme.success) {
                        VStack(alignment: .leading, spacing: 14) {
                            SectionHeaderView("Availability", eyebrow: "Roster")

                            CheckInSelector(
                                selected: appModel.checkInStatus(for: game),
                                isEnabled: true
                            ) { status in
                                appModel.setCheckIn(status, for: game)
                            }

                            let summary = appModel.availabilitySummary(for: game)
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
        .navigationTitle("Game")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var matchup: some View {
        HStack(spacing: 16) {
            teamColumn(teamID: game.awayTeamID, score: game.awayScore)
            Text("VS")
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.textSecondary)
            teamColumn(teamID: game.homeTeamID, score: game.homeScore)
        }
    }

    private func teamColumn(teamID: String, score: Int?) -> some View {
        VStack(spacing: 10) {
            if let team = appModel.team(for: teamID) {
                TeamBadge(team: team, size: 72)
                Text(team.name)
                    .font(.headline.weight(.black))
                    .foregroundStyle(AppTheme.textPrimary)
                    .multilineTextAlignment(.center)
            }

            if let score {
                Text("\(score)")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.textPrimary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}
