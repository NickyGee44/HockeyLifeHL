import SwiftUI

struct DiscoverRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 16) {
                        SectionHeaderView(
                            "Find the right league",
                            eyebrow: "Discover",
                            subtitle: "Preview nearby divisions or jump back into a joined league."
                        )

                        if appModel.joinedLeagues.isEmpty == false {
                            joinedStrip
                        }
                    }

                    ForEach(appModel.leagues) { league in
                        NavigationLink(value: league) {
                            SurfaceCard(accent: league.primaryColor) {
                                VStack(alignment: .leading, spacing: 14) {
                                    HStack(alignment: .top) {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(league.name)
                                                .font(.headline.weight(.black))
                                                .foregroundStyle(AppTheme.textPrimary)

                                            Text("\(league.city)  |  \(league.skillBand)")
                                                .font(.subheadline.weight(.semibold))
                                                .foregroundStyle(AppTheme.textSecondary)
                                        }

                                        Spacer()

                                        Text(appModel.joinedLeagueIDs.contains(league.id) ? "Joined" : "Preview")
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(.black)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(appModel.joinedLeagueIDs.contains(league.id) ? AppTheme.success : AppTheme.warning)
                                            .clipShape(Capsule())
                                    }

                                    Text(league.summary)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(AppTheme.textSecondary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .navigationDestination(for: League.self) { league in
                LeagueDetailView(league: league)
            }
        }
    }

    private var joinedStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(appModel.joinedLeagues) { league in
                    Button {
                        appModel.openLeague(league)
                    } label: {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(league.primaryColor)
                                .frame(width: 10, height: 10)

                            Text(league.name)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(AppTheme.textPrimary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(AppTheme.elevatedSurface)
                        .overlay {
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(AppTheme.stroke, lineWidth: 1)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct LeagueDetailView: View {
    @Environment(AppModel.self) private var appModel

    let league: League

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                SurfaceCard(accent: league.primaryColor) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(league.name)
                            .font(.system(size: 30, weight: .black, design: .rounded))
                            .foregroundStyle(AppTheme.textPrimary)

                        Text("\(league.city)  |  \(league.skillBand)")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(AppTheme.textSecondary)

                        Text(league.summary)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(AppTheme.textSecondary)
                    }
                }

                SurfaceCard(accent: league.secondaryColor) {
                    VStack(alignment: .leading, spacing: 14) {
                        SectionHeaderView("League snapshot", eyebrow: "Fit")

                        HStack(spacing: 10) {
                            MetricPill(value: "\(appModel.teams.filter { $0.leagueID == league.id }.count)", label: "Teams")
                            MetricPill(value: "\(appModel.games.filter { $0.leagueID == league.id }.count)", label: "Games seeded")
                        }
                    }
                }

                Button {
                    appModel.openLeague(league)
                } label: {
                    Text(appModel.joinedLeagueIDs.contains(league.id) ? "Open league" : "Preview this league")
                        .font(.headline.weight(.black))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(league.primaryColor)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }
                .buttonStyle(.plain)
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: league.primaryColor))
        .navigationTitle("League")
        .navigationBarTitleDisplayMode(.inline)
    }
}
