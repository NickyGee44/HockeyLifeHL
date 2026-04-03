import SwiftUI

private enum StatsDestination: Hashable {
    case leaderboards
    case career
}

struct StatsRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let currentPlayer = appModel.currentPlayer, appModel.isPreviewLeague == false {
                        SurfaceCard(accent: appModel.currentLeague.primaryColor) {
                            VStack(alignment: .leading, spacing: 16) {
                                SectionHeaderView("Season line", eyebrow: "Player")

                                Text(currentPlayer.fullName)
                                    .font(.title2.weight(.black))
                                    .foregroundStyle(AppTheme.textPrimary)

                                HStack(spacing: 10) {
                                    MetricPill(value: "\(currentPlayer.goals)", label: "Goals")
                                    MetricPill(value: "\(currentPlayer.assists)", label: "Assists")
                                    MetricPill(value: "\(currentPlayer.points)", label: "Points")
                                }
                            }
                        }
                    } else {
                        EmptyStateCard(
                            title: "Stat profile not connected",
                            detail: "Switch to a joined league to see your player line, standings, and leaderboards.",
                            systemImage: "chart.bar.doc.horizontal"
                        )
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeaderView("Standings", eyebrow: "Table")

                        ForEach(appModel.currentLeagueStandings) { standing in
                            if let team = appModel.team(for: standing.teamID) {
                                SurfaceCard(accent: team.color) {
                                    HStack(spacing: 14) {
                                        TeamBadge(team: team)

                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(team.name)
                                                .font(.headline.weight(.black))
                                                .foregroundStyle(AppTheme.textPrimary)
                                            Text("Record \(team.record)")
                                                .font(.footnote.weight(.medium))
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }

                                        Spacer()

                                        MetricPill(value: "\(standing.points)", label: "PTS")
                                            .frame(width: 88)
                                    }
                                }
                            }
                        }
                    }

                    VStack(spacing: 12) {
                        NavigationLink(value: StatsDestination.leaderboards) {
                            statsLinkCard(
                                title: "Leaderboards",
                                subtitle: "Top scorers and point race across the current league.",
                                systemImage: "list.number",
                                accent: AppTheme.success
                            )
                        }
                        .buttonStyle(.plain)

                        NavigationLink(value: StatsDestination.career) {
                            statsLinkCard(
                                title: "Career stats",
                                subtitle: "A cleaner native replacement for the old career stat drill-down.",
                                systemImage: "chart.xyaxis.line",
                                accent: AppTheme.accentSecondary
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .navigationDestination(for: StatsDestination.self) { destination in
                switch destination {
                case .leaderboards:
                    LeaderboardsView()
                case .career:
                    CareerStatsView()
                }
            }
        }
    }

    private func statsLinkCard(title: String, subtitle: String, systemImage: String, accent: Color) -> some View {
        SurfaceCard(accent: accent) {
            HStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(accent)

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

struct LeaderboardsView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                ForEach(Array(appModel.leagueTopScorers.enumerated()), id: \.element.id) { index, player in
                    SurfaceCard(accent: appModel.team(for: player.teamID)?.color ?? AppTheme.accent) {
                        HStack(spacing: 14) {
                            Text("#\(index + 1)")
                                .font(.title3.weight(.black))
                                .foregroundStyle(AppTheme.textSecondary)
                                .frame(width: 42)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(player.fullName)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("\(appModel.teamName(for: player.teamID))  |  \(player.position)  |  #\(player.jerseyNumber)")
                                    .font(.footnote.weight(.medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }

                            Spacer()

                            MetricPill(value: "\(player.points)", label: "PTS")
                                .frame(width: 88)
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Leaderboards")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CareerStatsView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let player = appModel.currentPlayer {
                    SurfaceCard(accent: AppTheme.accentSecondary) {
                        VStack(alignment: .leading, spacing: 16) {
                            Text(player.fullName)
                                .font(.title2.weight(.black))
                                .foregroundStyle(AppTheme.textPrimary)

                            HStack(spacing: 10) {
                                MetricPill(value: "\(player.gamesPlayed)", label: "Games")
                                MetricPill(value: "\(player.plusMinus)", label: "+/-")
                                MetricPill(value: "\(player.points)", label: "Points")
                            }
                        }
                    }
                }

                SurfaceCard(accent: AppTheme.success) {
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeaderView("Season highlights", eyebrow: "Moments")

                        ForEach(appModel.highlights) { highlight in
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(highlight.opponent)  |  \(highlight.result)")
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text("\(highlight.goals) G, \(highlight.assists) A")
                                    .font(.footnote.weight(.medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Career Stats")
        .navigationBarTitleDisplayMode(.inline)
    }
}
