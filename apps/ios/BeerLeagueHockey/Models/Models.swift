import Foundation
import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case home
    case schedule
    case discover
    case stats
    case team
    case captain
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .schedule: "Schedule"
        case .discover: "Discover"
        case .stats: "Stats"
        case .team: "Team"
        case .captain: "Captain"
        case .profile: "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house.fill"
        case .schedule: "calendar"
        case .discover: "location.magnifyingglass"
        case .stats: "chart.line.uptrend.xyaxis"
        case .team: "person.3.fill"
        case .captain: "shield.lefthalf.filled"
        case .profile: "person.crop.circle"
        }
    }
}

enum GameStatus: String, Hashable, CaseIterable {
    case upcoming = "Upcoming"
    case live = "Live"
    case final = "Final"

    var tint: Color {
        switch self {
        case .upcoming: AppTheme.accent
        case .live: AppTheme.success
        case .final: AppTheme.textSecondary
        }
    }
}

enum CheckInStatus: String, Hashable, CaseIterable, Identifiable {
    case confirmed = "In"
    case tentative = "Maybe"
    case out = "Out"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .confirmed: "checkmark"
        case .tentative: "questionmark"
        case .out: "xmark"
        }
    }

    var tint: Color {
        switch self {
        case .confirmed: AppTheme.success
        case .tentative: AppTheme.warning
        case .out: AppTheme.danger
        }
    }

    var foreground: Color {
        switch self {
        case .out: .white
        case .confirmed, .tentative: .black
        }
    }
}

enum CaptainTaskStatus: String, Hashable {
    case dueSoon = "Due Soon"
    case active = "Active"
    case waiting = "Waiting"

    var tint: Color {
        switch self {
        case .dueSoon: AppTheme.warning
        case .active: AppTheme.accent
        case .waiting: AppTheme.textSecondary
        }
    }
}

struct AvailabilitySummary: Hashable {
    var confirmed: Int
    var tentative: Int
    var out: Int
}

struct League: Identifiable, Hashable {
    let id: String
    let name: String
    let city: String
    let slug: String
    let skillBand: String
    let summary: String
    let primaryHex: String
    let secondaryHex: String

    var primaryColor: Color { Color(hex: primaryHex) }
    var secondaryColor: Color { Color(hex: secondaryHex) }
}

struct Team: Identifiable, Hashable {
    let id: String
    let leagueID: String
    let name: String
    let shortName: String
    let colorHex: String
    let record: String

    var color: Color { Color(hex: colorHex) }
}

struct Game: Identifiable, Hashable {
    let id: String
    let leagueID: String
    let scheduledAt: Date
    let rinkName: String
    let status: GameStatus
    let homeTeamID: String
    let awayTeamID: String
    let homeScore: Int?
    let awayScore: Int?
    let baseAvailability: AvailabilitySummary
}

struct Player: Identifiable, Hashable {
    let id: String
    let leagueID: String
    let teamID: String
    let fullName: String
    let position: String
    let jerseyNumber: Int
    let goals: Int
    let assists: Int
    let points: Int
    let plusMinus: Int
    let gamesPlayed: Int
    let role: String?
}

struct LeagueStanding: Identifiable, Hashable {
    let id: String
    let leagueID: String
    let teamID: String
    let wins: Int
    let losses: Int
    let points: Int
}

struct NotificationItem: Identifiable, Hashable {
    let id: String
    let title: String
    let detail: String
    let timeLabel: String
    let systemImage: String
    var isUnread: Bool
}

struct ChatMessage: Identifiable, Hashable {
    let id: String
    let teamID: String
    let sender: String
    let body: String
    let timestampLabel: String
    let isCurrentUser: Bool
}

struct CaptainTask: Identifiable, Hashable {
    let id: String
    let leagueID: String
    let title: String
    let detail: String
    let status: CaptainTaskStatus
    let systemImage: String
}

struct SeasonHighlight: Identifiable, Hashable {
    let id: String
    let opponent: String
    let result: String
    let goals: Int
    let assists: Int
}

struct PlayerProfile: Hashable {
    var displayName: String
    var emailAddress: String
    var favoritePosition: String
    var jerseyNumber: Int
    var hometown: String
    var isCaptain: Bool
}

struct AppSeed {
    let leagues: [League]
    let joinedLeagueIDs: Set<String>
    let teamMemberships: [String: String]
    let games: [Game]
    let teams: [Team]
    let players: [Player]
    let standings: [LeagueStanding]
    let notifications: [NotificationItem]
    let chatMessages: [ChatMessage]
    let captainTasks: [CaptainTask]
    let highlights: [SeasonHighlight]
    let currentPlayerID: String
    let profile: PlayerProfile
    let initialCheckIns: [String: CheckInStatus]
}
