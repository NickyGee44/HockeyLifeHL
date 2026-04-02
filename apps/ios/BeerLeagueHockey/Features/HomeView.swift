import SwiftUI

struct HomeView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header

                    if appModel.isPreviewLeague {
                        EmptyStateCard(
                            title: "Preview mode is active",
                            detail: "You can inspect the league, but check-ins and roster tools unlock once you join.",
                            systemImage: "sparkles.rectangle.stack"
                        )
                    }

                    nextGameSection
                    quickActions
                    recentResults
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

    private var header: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 14) {
                LeagueSwitchMenu()

                Button {
                    appModel.selectedTab = .profile
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bell")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(AppTheme.textPrimary)
                            .frame(width: 48, height: 48)
                            .background(AppTheme.elevatedSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                        NotificationBubble(count: appModel.unreadNotificationCount)
                            .offset(x: 8, y: -8)
                    }
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Native iOS rebuild")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.textSecondary)
                    .tracking(1.2)

                Text("League-first player companion")
                    .font(.system(size: 30, weight: .black, design: .rounded))
                    .foregroundStyle(AppTheme.textPrimary)

                Text(appModel.currentLeague.summary)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
    }

    private var nextGameSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeaderView("Next Game", eyebrow: "Game Day", subtitle: "Availability and matchup focus")

            if let nextGame = appModel.nextGame {
                NavigationLink(value: nextGame) {
                    SurfaceCard(accent: appModel.currentLeague.primaryColor) {
                        VStack(alignment: .leading, spacing: 18) {
                            HStack {
                                StatusBadge(status: nextGame.status)
                                Spacer()
                                Text(BLHFormatters.gameDate(nextGame.scheduledAt))
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }

                            matchupRow(for: nextGame)

                            Label(nextGame.rinkName, systemImage: "mappin.and.ellipse")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(AppTheme.textSecondary)

                            if appModel.isPreviewLeague {
                                Text("Join this league to unlock player check-ins.")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(AppTheme.textSecondary)
                            } else {
                                CheckInSelector(
                                    selected: appModel.checkInStatus(for: nextGame),
                                    isEnabled: true
                                ) { status in
                                    appModel.setCheckIn(status, for: nextGame)
                                }

                                let summary = appModel.availabilitySummary(for: nextGame)
                                Text("\(summary.confirmed) in  |  \(summary.tentative) maybe  |  \(summary.out) out")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
            } else {
                EmptyStateCard(
                    title: "No upcoming games",
                    detail: "Schedule updates will land here as soon as the league posts them.",
                    systemImage: "calendar"
                )
            }
        }
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeaderView("Quick Actions", eyebrow: "Jump", subtitle: "Move through the native app shell")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ActionTile(title: "Full schedule", subtitle: "See every league game and open detail cards.", systemImage: "calendar.badge.clock", accent: AppTheme.accent) {
                    appModel.selectedTab = .schedule
                }

                ActionTile(title: "Team hub", subtitle: "Roster, chat, and team detail all live here.", systemImage: "person.3.sequence.fill", accent: AppTheme.accentSecondary) {
                    appModel.selectedTab = .team
                }

                ActionTile(title: "Discover leagues", subtitle: "Preview nearby divisions and switch context fast.", systemImage: "location.magnifyingglass", accent: AppTheme.warning) {
                    appModel.selectedTab = .discover
                }

                ActionTile(title: "Stat boards", subtitle: "Track scoring race, standings, and your season line.", systemImage: "chart.bar.xaxis", accent: AppTheme.success) {
                    appModel.selectedTab = .stats
                }
            }
        }
    }

    private var recentResults: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeaderView("Recent Results", eyebrow: "Momentum", subtitle: "Latest finished games in this league")

            ForEach(appModel.recentResults) { game in
                NavigationLink(value: game) {
                    SurfaceCard(accent: AppTheme.accentSecondary) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text(BLHFormatters.shortDate(game.scheduledAt))
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Spacer()
                                Text(scoreline(for: game))
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.textPrimary)
                            }

                            Text("\(appModel.teamName(for: game.awayTeamID)) at \(appModel.teamName(for: game.homeTeamID))")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(AppTheme.textPrimary)

                            Text(game.rinkName)
                                .font(.footnote.weight(.medium))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func matchupRow(for game: Game) -> some View {
        HStack(spacing: 16) {
            if let awayTeam = appModel.team(for: game.awayTeamID) {
                VStack(spacing: 8) {
                    TeamBadge(team: awayTeam, size: 60)
                    Text(awayTeam.name)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }

            Text("VS")
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.textSecondary)

            if let homeTeam = appModel.team(for: game.homeTeamID) {
                VStack(spacing: 8) {
                    TeamBadge(team: homeTeam, size: 60)
                    Text(homeTeam.name)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(AppTheme.textPrimary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func scoreline(for game: Game) -> String {
        guard let away = game.awayScore, let home = game.homeScore else { return "--" }
        return "\(away)-\(home)"
    }
}
