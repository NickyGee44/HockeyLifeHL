import SwiftUI

private enum TeamRoute: Hashable {
    case detail
    case chat
}

struct TeamRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let currentTeam = appModel.currentTeam {
                        SurfaceCard(accent: currentTeam.color) {
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    TeamBadge(team: currentTeam, size: 68)

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(currentTeam.name)
                                            .font(.title2.weight(.black))
                                            .foregroundStyle(AppTheme.textPrimary)
                                        Text("Record \(currentTeam.record)")
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(AppTheme.textSecondary)
                                    }

                                    Spacer()
                                }

                                HStack(spacing: 10) {
                                    NavigationLink(value: TeamRoute.detail) {
                                        teamActionLabel(title: "Team detail", systemImage: "person.3.sequence.fill", accent: currentTeam.color)
                                    }
                                    .buttonStyle(.plain)

                                    NavigationLink(value: TeamRoute.chat) {
                                        teamActionLabel(title: "Team chat", systemImage: "bubble.left.and.bubble.right.fill", accent: AppTheme.accent)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeaderView("Roster", eyebrow: "Bench")

                            ForEach(appModel.currentLeagueRoster) { player in
                                NavigationLink(value: player) {
                                    SurfaceCard(accent: currentTeam.color) {
                                        HStack(spacing: 14) {
                                            Text("#\(player.jerseyNumber)")
                                                .font(.headline.weight(.black))
                                                .foregroundStyle(AppTheme.textSecondary)
                                                .frame(width: 38)

                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(player.fullName)
                                                    .font(.headline.weight(.black))
                                                    .foregroundStyle(AppTheme.textPrimary)

                                                Text("\(player.position)  |  \(player.points) points")
                                                    .font(.footnote.weight(.medium))
                                                    .foregroundStyle(AppTheme.textSecondary)
                                            }

                                            Spacer()

                                            if let role = player.role {
                                                Text(role)
                                                    .font(.caption.weight(.bold))
                                                    .foregroundStyle(.black)
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 6)
                                                    .background(AppTheme.warning)
                                                    .clipShape(Capsule())
                                            }
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    } else {
                        EmptyStateCard(
                            title: "No team attached to this league",
                            detail: "Switch to a joined league to see roster, team detail, and chat.",
                            systemImage: "person.3.sequence.fill"
                        )
                    }
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .navigationDestination(for: TeamRoute.self) { route in
                switch route {
                case .detail:
                    TeamDetailView()
                case .chat:
                    TeamChatView()
                }
            }
            .navigationDestination(for: Player.self) { player in
                PlayerDetailView(player: player)
            }
        }
    }

    private func teamActionLabel(title: String, systemImage: String, accent: Color) -> some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .foregroundStyle(accent)
            Text(title)
                .font(.subheadline.weight(.black))
                .foregroundStyle(AppTheme.textPrimary)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(AppTheme.elevatedSurface)
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(AppTheme.stroke, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct TeamDetailView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let currentTeam = appModel.currentTeam {
                    SurfaceCard(accent: currentTeam.color) {
                        VStack(alignment: .leading, spacing: 14) {
                            Text(currentTeam.name)
                                .font(.title2.weight(.black))
                                .foregroundStyle(AppTheme.textPrimary)

                            Text("This native detail screen replaces the oversized React Native team detail view with smaller sections and cleaner routing.")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(AppTheme.textSecondary)

                            HStack(spacing: 10) {
                                MetricPill(value: currentTeam.record, label: "Record")
                                MetricPill(value: "\(appModel.currentLeagueRoster.count)", label: "Skaters")
                            }
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Team Detail")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PlayerDetailView: View {
    let player: Player

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                SurfaceCard(accent: AppTheme.accentSecondary) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(player.fullName)
                            .font(.title2.weight(.black))
                            .foregroundStyle(AppTheme.textPrimary)

                        Text("\(player.position)  |  #\(player.jerseyNumber)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(AppTheme.textSecondary)

                        HStack(spacing: 10) {
                            MetricPill(value: "\(player.goals)", label: "Goals")
                            MetricPill(value: "\(player.assists)", label: "Assists")
                            MetricPill(value: "\(player.points)", label: "Points")
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: AppTheme.accentSecondary))
        .navigationTitle("Player Card")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TeamChatView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(appModel.currentTeamMessages) { message in
                    HStack {
                        if message.isCurrentUser == false { Spacer(minLength: 40) }

                        VStack(alignment: .leading, spacing: 6) {
                            Text(message.sender)
                                .font(.caption.weight(.bold))
                                .foregroundStyle(AppTheme.textSecondary)

                            Text(message.body)
                                .font(.body.weight(.medium))
                                .foregroundStyle(AppTheme.textPrimary)

                            Text(message.timestampLabel)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(AppTheme.textMuted)
                        }
                        .padding(16)
                        .background(message.isCurrentUser ? AppTheme.accentSecondary.opacity(0.35) : AppTheme.surface)
                        .overlay {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(AppTheme.stroke, lineWidth: 1)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                        if message.isCurrentUser { Spacer(minLength: 40) }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Team Chat")
        .navigationBarTitleDisplayMode(.inline)
    }
}
