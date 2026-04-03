import Foundation

extension AppSeed {
    static let sample: AppSeed = {
        let downtown = League(
            id: "blh-downtown",
            name: "BLH Downtown",
            city: "Toronto",
            slug: "downtown",
            skillBand: "C / C+",
            summary: "Fast weeknight hockey built around player availability, standings, and captain tools.",
            primaryHex: "#4FD8FF",
            secondaryHex: "#7A8CFF"
        )

        let midtown = League(
            id: "blh-midtown",
            name: "BLH Midtown",
            city: "Toronto",
            slug: "midtown",
            skillBand: "D / C-",
            summary: "Balanced skill levels, lighter travel, and a strong social league atmosphere.",
            primaryHex: "#6AE3C2",
            secondaryHex: "#2B7FFF"
        )

        let west = League(
            id: "blh-west",
            name: "BLH West End",
            city: "Etobicoke",
            slug: "west-end",
            skillBand: "C+ / B-",
            summary: "Late-slot competitive hockey with tighter parity and deeper team rosters.",
            primaryHex: "#F08A4B",
            secondaryHex: "#F05A67"
        )

        let teams = [
            Team(id: "wrecking-crew", leagueID: downtown.id, name: "Wrecking Crew", shortName: "WRC", colorHex: "#28B8FF", record: "4-2"),
            Team(id: "ice-dogs", leagueID: downtown.id, name: "Ice Dogs", shortName: "DOG", colorHex: "#3F6BFF", record: "4-2"),
            Team(id: "grinders", leagueID: downtown.id, name: "Grinders", shortName: "GRN", colorHex: "#EF5D73", record: "1-5"),
            Team(id: "night-shift", leagueID: midtown.id, name: "Night Shift", shortName: "NSH", colorHex: "#6AE3C2", record: "5-1"),
            Team(id: "rink-rats", leagueID: midtown.id, name: "Rink Rats", shortName: "RAT", colorHex: "#2B7FFF", record: "3-3"),
            Team(id: "breakaway", leagueID: midtown.id, name: "Breakaway", shortName: "BRK", colorHex: "#A071FF", record: "2-4"),
            Team(id: "blue-steel", leagueID: west.id, name: "Blue Steel", shortName: "BST", colorHex: "#57B3FF", record: "4-1"),
            Team(id: "red-line", leagueID: west.id, name: "Red Line", shortName: "RDL", colorHex: "#F05A67", record: "3-2"),
            Team(id: "puckheads", leagueID: west.id, name: "Puckheads", shortName: "PUK", colorHex: "#F4B75F", record: "1-4")
        ]

        let downtownGames = [
            Game(id: "g1", leagueID: downtown.id, scheduledAt: .blh(2026, 1, 7, 21, 0), rinkName: "North Rink", status: .final, homeTeamID: "wrecking-crew", awayTeamID: "ice-dogs", homeScore: 5, awayScore: 2, baseAvailability: .init(confirmed: 11, tentative: 2, out: 1)),
            Game(id: "g2", leagueID: downtown.id, scheduledAt: .blh(2026, 1, 14, 20, 45), rinkName: "South Arena", status: .final, homeTeamID: "ice-dogs", awayTeamID: "grinders", homeScore: 3, awayScore: 4, baseAvailability: .init(confirmed: 10, tentative: 2, out: 2)),
            Game(id: "g3", leagueID: downtown.id, scheduledAt: .blh(2026, 1, 21, 21, 15), rinkName: "North Rink", status: .final, homeTeamID: "grinders", awayTeamID: "wrecking-crew", homeScore: 1, awayScore: 2, baseAvailability: .init(confirmed: 12, tentative: 1, out: 1)),
            Game(id: "g4", leagueID: downtown.id, scheduledAt: .blh(2026, 1, 28, 20, 30), rinkName: "West Iceplex", status: .final, homeTeamID: "grinders", awayTeamID: "ice-dogs", homeScore: 2, awayScore: 6, baseAvailability: .init(confirmed: 10, tentative: 3, out: 1)),
            Game(id: "g5", leagueID: downtown.id, scheduledAt: .blh(2026, 2, 24, 20, 30), rinkName: "North Rink", status: .live, homeTeamID: "ice-dogs", awayTeamID: "wrecking-crew", homeScore: 3, awayScore: 3, baseAvailability: .init(confirmed: 11, tentative: 1, out: 2)),
            Game(id: "g6", leagueID: downtown.id, scheduledAt: .blh(2026, 3, 2, 21, 0), rinkName: "South Arena", status: .upcoming, homeTeamID: "wrecking-crew", awayTeamID: "grinders", homeScore: nil, awayScore: nil, baseAvailability: .init(confirmed: 8, tentative: 2, out: 3)),
            Game(id: "g7", leagueID: downtown.id, scheduledAt: .blh(2026, 3, 9, 20, 45), rinkName: "West Iceplex", status: .upcoming, homeTeamID: "grinders", awayTeamID: "ice-dogs", homeScore: nil, awayScore: nil, baseAvailability: .init(confirmed: 7, tentative: 4, out: 2)),
            Game(id: "g8", leagueID: downtown.id, scheduledAt: .blh(2026, 3, 16, 21, 15), rinkName: "North Rink", status: .upcoming, homeTeamID: "ice-dogs", awayTeamID: "wrecking-crew", homeScore: nil, awayScore: nil, baseAvailability: .init(confirmed: 9, tentative: 2, out: 2))
        ]

        let previewGames = [
            Game(id: "g9", leagueID: midtown.id, scheduledAt: .blh(2026, 3, 5, 20, 15), rinkName: "Midtown Pad 2", status: .upcoming, homeTeamID: "night-shift", awayTeamID: "rink-rats", homeScore: nil, awayScore: nil, baseAvailability: .init(confirmed: 9, tentative: 2, out: 1)),
            Game(id: "g10", leagueID: west.id, scheduledAt: .blh(2026, 3, 12, 22, 0), rinkName: "West Arena", status: .upcoming, homeTeamID: "blue-steel", awayTeamID: "red-line", homeScore: nil, awayScore: nil, baseAvailability: .init(confirmed: 10, tentative: 1, out: 2))
        ]

        let players = [
            Player(id: "player-nick", leagueID: downtown.id, teamID: "wrecking-crew", fullName: "Nick Grossi", position: "F", jerseyNumber: 14, goals: 8, assists: 7, points: 15, plusMinus: 6, gamesPlayed: 6, role: "Captain"),
            Player(id: "player-luca", leagueID: downtown.id, teamID: "wrecking-crew", fullName: "Luca Marino", position: "F", jerseyNumber: 19, goals: 6, assists: 5, points: 11, plusMinus: 3, gamesPlayed: 6, role: nil),
            Player(id: "player-ethan", leagueID: downtown.id, teamID: "wrecking-crew", fullName: "Ethan Blake", position: "D", jerseyNumber: 4, goals: 2, assists: 6, points: 8, plusMinus: 5, gamesPlayed: 6, role: nil),
            Player(id: "player-mason", leagueID: downtown.id, teamID: "wrecking-crew", fullName: "Mason Rivera", position: "D", jerseyNumber: 22, goals: 1, assists: 4, points: 5, plusMinus: 2, gamesPlayed: 6, role: nil),
            Player(id: "player-noah", leagueID: downtown.id, teamID: "wrecking-crew", fullName: "Noah Penn", position: "G", jerseyNumber: 30, goals: 0, assists: 1, points: 1, plusMinus: 0, gamesPlayed: 6, role: nil),
            Player(id: "player-cole", leagueID: downtown.id, teamID: "ice-dogs", fullName: "Cole Turner", position: "F", jerseyNumber: 11, goals: 9, assists: 6, points: 15, plusMinus: 5, gamesPlayed: 6, role: nil),
            Player(id: "player-jake", leagueID: downtown.id, teamID: "ice-dogs", fullName: "Jake Olin", position: "F", jerseyNumber: 7, goals: 7, assists: 5, points: 12, plusMinus: 4, gamesPlayed: 6, role: nil),
            Player(id: "player-ben", leagueID: downtown.id, teamID: "ice-dogs", fullName: "Ben Kline", position: "D", jerseyNumber: 3, goals: 3, assists: 6, points: 9, plusMinus: 2, gamesPlayed: 6, role: nil),
            Player(id: "player-ryan", leagueID: downtown.id, teamID: "grinders", fullName: "Ryan Holt", position: "F", jerseyNumber: 10, goals: 8, assists: 4, points: 12, plusMinus: 1, gamesPlayed: 6, role: nil),
            Player(id: "player-aiden", leagueID: downtown.id, teamID: "grinders", fullName: "Aiden Quill", position: "F", jerseyNumber: 17, goals: 5, assists: 6, points: 11, plusMinus: -2, gamesPlayed: 6, role: nil),
            Player(id: "player-owen", leagueID: downtown.id, teamID: "grinders", fullName: "Owen Rush", position: "D", jerseyNumber: 2, goals: 2, assists: 4, points: 6, plusMinus: -3, gamesPlayed: 6, role: nil)
        ]

        let standings = [
            LeagueStanding(id: "standings-1", leagueID: downtown.id, teamID: "ice-dogs", wins: 4, losses: 2, points: 8),
            LeagueStanding(id: "standings-2", leagueID: downtown.id, teamID: "wrecking-crew", wins: 4, losses: 2, points: 8),
            LeagueStanding(id: "standings-3", leagueID: downtown.id, teamID: "grinders", wins: 1, losses: 5, points: 2),
            LeagueStanding(id: "standings-4", leagueID: midtown.id, teamID: "night-shift", wins: 5, losses: 1, points: 10),
            LeagueStanding(id: "standings-5", leagueID: midtown.id, teamID: "rink-rats", wins: 3, losses: 3, points: 6),
            LeagueStanding(id: "standings-6", leagueID: midtown.id, teamID: "breakaway", wins: 2, losses: 4, points: 4),
            LeagueStanding(id: "standings-7", leagueID: west.id, teamID: "blue-steel", wins: 4, losses: 1, points: 8),
            LeagueStanding(id: "standings-8", leagueID: west.id, teamID: "red-line", wins: 3, losses: 2, points: 6),
            LeagueStanding(id: "standings-9", leagueID: west.id, teamID: "puckheads", wins: 1, losses: 4, points: 2)
        ]

        let notifications = [
            NotificationItem(id: "notice-1", title: "Game reminder", detail: "Wrecking Crew vs Grinders starts Monday at 9:00 PM.", timeLabel: "12m ago", systemImage: "calendar.badge.clock", isUnread: true),
            NotificationItem(id: "notice-2", title: "Captain task due", detail: "Finalize lines for the March 2 game before 6:00 PM.", timeLabel: "1h ago", systemImage: "shield", isUnread: true),
            NotificationItem(id: "notice-3", title: "Availability updated", detail: "Luca changed his status from Maybe to In.", timeLabel: "Yesterday", systemImage: "checkmark.circle", isUnread: false),
            NotificationItem(id: "notice-4", title: "League update", detail: "Midtown registration is open for spring overflow teams.", timeLabel: "2d ago", systemImage: "sparkles", isUnread: false)
        ]

        let chatMessages = [
            ChatMessage(id: "chat-1", teamID: "wrecking-crew", sender: "Nick", body: "Bring dark jerseys on Monday. Opponent is wearing white.", timestampLabel: "9:14 AM", isCurrentUser: true),
            ChatMessage(id: "chat-2", teamID: "wrecking-crew", sender: "Luca", body: "I am in. Can someone grab pucks from storage?", timestampLabel: "9:18 AM", isCurrentUser: false),
            ChatMessage(id: "chat-3", teamID: "wrecking-crew", sender: "Mason", body: "I can get there early and open the room.", timestampLabel: "9:25 AM", isCurrentUser: false),
            ChatMessage(id: "chat-4", teamID: "wrecking-crew", sender: "Nick", body: "Perfect. I will post lines after work.", timestampLabel: "9:33 AM", isCurrentUser: true)
        ]

        let captainTasks = [
            CaptainTask(id: "task-1", leagueID: downtown.id, title: "Finalize check-ins", detail: "3 roster spots are still unresolved for the next game.", status: .dueSoon, systemImage: "checklist"),
            CaptainTask(id: "task-2", leagueID: downtown.id, title: "Post line combinations", detail: "Share units once Ethan confirms he can make warmup.", status: .active, systemImage: "square.grid.3x3.topleft.filled"),
            CaptainTask(id: "task-3", leagueID: downtown.id, title: "Invite spare skater", detail: "You may need one winger if two maybes fall through.", status: .waiting, systemImage: "person.badge.plus")
        ]

        let highlights = [
            SeasonHighlight(id: "highlight-1", opponent: "Ice Dogs", result: "Live 3-3", goals: 1, assists: 1),
            SeasonHighlight(id: "highlight-2", opponent: "Grinders", result: "W 2-1", goals: 1, assists: 0),
            SeasonHighlight(id: "highlight-3", opponent: "Ice Dogs", result: "W 5-2", goals: 2, assists: 1)
        ]

        return AppSeed(
            leagues: [downtown, midtown, west],
            joinedLeagueIDs: [downtown.id],
            teamMemberships: [downtown.id: "wrecking-crew"],
            games: downtownGames + previewGames,
            teams: teams,
            players: players,
            standings: standings,
            notifications: notifications,
            chatMessages: chatMessages,
            captainTasks: captainTasks,
            highlights: highlights,
            currentPlayerID: "player-nick",
            profile: PlayerProfile(
                displayName: "Nick Grossi",
                emailAddress: "nick@bridg3.io",
                favoritePosition: "Forward",
                jerseyNumber: 14,
                hometown: "Toronto",
                isCaptain: true
            ),
            initialCheckIns: [
                "g6": .tentative,
                "g8": .confirmed
            ]
        )
    }()
}

private extension Date {
    static func blh(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int) -> Date {
        var components = DateComponents()
        components.calendar = Calendar(identifier: .gregorian)
        components.timeZone = TimeZone(identifier: "America/Toronto")
        components.year = year
        components.month = month
        components.day = day
        components.hour = hour
        components.minute = minute
        return components.date ?? .now
    }
}
