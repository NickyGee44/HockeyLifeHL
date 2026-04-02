import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    var selectedTab: AppTab = .home
    var selectedLeagueID: String
    var notifications: [NotificationItem]
    var profile: PlayerProfile
    var checkInStatuses: [String: CheckInStatus]

    let leagues: [League]
    let joinedLeagueIDs: Set<String>
    let teamMemberships: [String: String]
    let games: [Game]
    let teams: [Team]
    let players: [Player]
    let standings: [LeagueStanding]
    let chatMessages: [ChatMessage]
    let captainTasks: [CaptainTask]
    let highlights: [SeasonHighlight]
    let currentPlayerID: String

    private let initialCheckInStatuses: [String: CheckInStatus]

    init(seed: AppSeed) {
        leagues = seed.leagues
        joinedLeagueIDs = seed.joinedLeagueIDs
        teamMemberships = seed.teamMemberships
        games = seed.games
        teams = seed.teams
        players = seed.players
        standings = seed.standings
        chatMessages = seed.chatMessages
        captainTasks = seed.captainTasks
        highlights = seed.highlights
        currentPlayerID = seed.currentPlayerID
        notifications = seed.notifications
        profile = seed.profile
        initialCheckInStatuses = seed.initialCheckIns
        checkInStatuses = seed.initialCheckIns
        selectedLeagueID = seed.leagues.first?.id ?? ""
    }

    var visibleTabs: [AppTab] {
        if profile.isCaptain {
            return [.home, .schedule, .discover, .stats, .team, .captain, .profile]
        }

        return [.home, .schedule, .discover, .stats, .team, .profile]
    }

    var currentLeague: League {
        league(for: selectedLeagueID) ?? leagues[0]
    }

    var currentPlayer: Player? {
        players.first(where: { $0.id == currentPlayerID })
    }

    var currentTeam: Team? {
        guard let teamID = teamMemberships[selectedLeagueID] else { return nil }
        return team(for: teamID)
    }

    var isPreviewLeague: Bool {
        joinedLeagueIDs.contains(selectedLeagueID) == false
    }

    var unreadNotificationCount: Int {
        notifications.filter(\.isUnread).count
    }

    var joinedLeagues: [League] {
        leagues.filter { joinedLeagueIDs.contains($0.id) }
    }

    var currentLeagueGames: [Game] {
        games
            .filter { $0.leagueID == selectedLeagueID }
            .sorted { $0.scheduledAt < $1.scheduledAt }
    }

    var nextGame: Game? {
        currentLeagueGames.first(where: { $0.status == .live || $0.status == .upcoming })
    }

    var recentResults: [Game] {
        currentLeagueGames
            .filter { $0.status == .final }
            .sorted { $0.scheduledAt > $1.scheduledAt }
            .prefix(3)
            .map { $0 }
    }

    var upcomingGames: [Game] {
        currentLeagueGames.filter { $0.status == .upcoming }
    }

    var liveGames: [Game] {
        currentLeagueGames.filter { $0.status == .live }
    }

    var currentLeagueStandings: [LeagueStanding] {
        standings
            .filter { $0.leagueID == selectedLeagueID }
            .sorted {
                if $0.points == $1.points {
                    return $0.wins > $1.wins
                }
                return $0.points > $1.points
            }
    }

    var currentLeagueRoster: [Player] {
        guard let currentTeam else { return [] }
        return players
            .filter { $0.teamID == currentTeam.id }
            .sorted { lhs, rhs in
                if lhs.position == rhs.position {
                    return lhs.jerseyNumber < rhs.jerseyNumber
                }
                return lhs.position < rhs.position
            }
    }

    var leagueTopScorers: [Player] {
        players
            .filter { $0.leagueID == selectedLeagueID }
            .sorted {
                if $0.points == $1.points {
                    return $0.goals > $1.goals
                }
                return $0.points > $1.points
            }
            .prefix(8)
            .map { $0 }
    }

    var currentTeamMessages: [ChatMessage] {
        guard let currentTeam else { return [] }
        return chatMessages.filter { $0.teamID == currentTeam.id }
    }

    var currentCaptainTasks: [CaptainTask] {
        captainTasks.filter { $0.leagueID == selectedLeagueID }
    }

    func team(for id: String) -> Team? {
        teams.first(where: { $0.id == id })
    }

    func league(for id: String) -> League? {
        leagues.first(where: { $0.id == id })
    }

    func opponentName(for game: Game) -> String {
        guard let currentTeam else { return "Unknown opponent" }
        let opponentID = currentTeam.id == game.homeTeamID ? game.awayTeamID : game.homeTeamID
        return team(for: opponentID)?.name ?? "Unknown opponent"
    }

    func teamName(for id: String) -> String {
        team(for: id)?.name ?? id
    }

    func availabilitySummary(for game: Game) -> AvailabilitySummary {
        var summary = game.baseAvailability
        let original = initialCheckInStatuses[game.id]
        let current = checkInStatuses[game.id]

        if original != current {
            adjust(&summary, status: original, delta: -1)
            adjust(&summary, status: current, delta: 1)
        }

        return summary
    }

    func checkInStatus(for game: Game) -> CheckInStatus? {
        checkInStatuses[game.id]
    }

    func setCheckIn(_ status: CheckInStatus, for game: Game) {
        guard isPreviewLeague == false else { return }
        checkInStatuses[game.id] = status
    }

    func selectLeague(_ league: League) {
        selectedLeagueID = league.id
    }

    func openLeague(_ league: League) {
        selectedLeagueID = league.id
        selectedTab = .home
    }

    func markAllNotificationsRead() {
        notifications = notifications.map {
            var item = $0
            item.isUnread = false
            return item
        }
    }

    func updateProfile(displayName: String, emailAddress: String, favoritePosition: String, hometown: String) {
        profile.displayName = displayName
        profile.emailAddress = emailAddress
        profile.favoritePosition = favoritePosition
        profile.hometown = hometown
    }

    private func adjust(_ summary: inout AvailabilitySummary, status: CheckInStatus?, delta: Int) {
        guard let status else { return }

        switch status {
        case .confirmed:
            summary.confirmed = max(0, summary.confirmed + delta)
        case .tentative:
            summary.tentative = max(0, summary.tentative + delta)
        case .out:
            summary.out = max(0, summary.out + delta)
        }
    }
}
