import SwiftUI

struct ArenaBackground: View {
    let accent: Color

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.background, AppTheme.backgroundSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(accent.opacity(0.26))
                .frame(width: 280, height: 280)
                .blur(radius: 80)
                .offset(x: -120, y: -220)

            Circle()
                .fill(AppTheme.accentSecondary.opacity(0.24))
                .frame(width: 320, height: 320)
                .blur(radius: 92)
                .offset(x: 150, y: 240)

            RoundedRectangle(cornerRadius: 36)
                .stroke(Color.white.opacity(0.04), lineWidth: 1)
                .padding(16)
        }
        .ignoresSafeArea()
    }
}

struct SurfaceCard<Content: View>: View {
    private let accent: Color
    private let content: Content

    init(accent: Color = AppTheme.accent, @ViewBuilder content: () -> Content) {
        self.accent = accent
        self.content = content()
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(AppTheme.surface)
                .overlay {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(AppTheme.strongStroke, lineWidth: 1)
                }

            LinearGradient(
                colors: [accent.opacity(0.22), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))

            content
                .padding(20)
        }
    }
}

struct SectionHeaderView: View {
    let eyebrow: String
    let title: String
    let subtitle: String?

    init(_ title: String, eyebrow: String, subtitle: String? = nil) {
        self.title = title
        self.eyebrow = eyebrow
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow.uppercased())
                .font(.caption.weight(.bold))
                .foregroundStyle(AppTheme.textSecondary)
                .tracking(1.2)

            Text(title)
                .font(.title3.weight(.black))
                .foregroundStyle(AppTheme.textPrimary)

            if let subtitle {
                Text(subtitle)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct LeagueSwitchMenu: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        Menu {
            ForEach(appModel.leagues) { league in
                Button {
                    appModel.selectLeague(league)
                } label: {
                    HStack {
                        Text(league.name)
                        Spacer()
                        if appModel.selectedLeagueID == league.id {
                            Image(systemName: "checkmark")
                        } else if appModel.joinedLeagueIDs.contains(league.id) {
                            Text("Joined")
                        } else {
                            Text("Preview")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(appModel.currentLeague.name)
                        .font(.subheadline.weight(.black))
                        .foregroundStyle(AppTheme.textPrimary)
                        .lineLimit(1)

                    Text(appModel.isPreviewLeague ? "Preview league" : "Active league")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(AppTheme.elevatedSurface)
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(AppTheme.stroke, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }
}

struct TeamBadge: View {
    let team: Team
    let size: CGFloat

    init(team: Team, size: CGFloat = 52) {
        self.team = team
        self.size = size
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(team.color.opacity(0.24))
            Circle()
                .stroke(team.color.opacity(0.8), lineWidth: 1.5)

            Text(team.shortName)
                .font(.system(size: size * 0.24, weight: .black, design: .rounded))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(width: size, height: size)
    }
}

struct StatusBadge: View {
    let status: GameStatus

    var body: some View {
        Text(status.rawValue)
            .font(.caption.weight(.bold))
            .foregroundStyle(status == .final ? AppTheme.textPrimary : .black)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(status.tint)
            .clipShape(Capsule())
    }
}

struct MetricPill: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(AppTheme.textPrimary)
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.elevatedSurface)
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(AppTheme.stroke, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct ActionTile: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let accent: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: systemImage)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(accent)

                Text(title)
                    .font(.headline.weight(.black))
                    .foregroundStyle(AppTheme.textPrimary)

                Text(subtitle)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(AppTheme.surface)
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(AppTheme.stroke, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct CheckInSelector: View {
    let selected: CheckInStatus?
    let isEnabled: Bool
    let onSelect: (CheckInStatus) -> Void

    var body: some View {
        HStack(spacing: 10) {
            ForEach(CheckInStatus.allCases) { status in
                Button {
                    onSelect(status)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: status.icon)
                            .font(.caption.weight(.black))
                        Text(status.rawValue)
                            .font(.subheadline.weight(.black))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(selected == status ? status.tint : AppTheme.elevatedSurface)
                    .foregroundStyle(selected == status ? status.foreground : AppTheme.textSecondary)
                    .overlay {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(selected == status ? status.tint : AppTheme.stroke, lineWidth: 1)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(isEnabled == false)
                .opacity(isEnabled ? 1 : 0.5)
            }
        }
    }
}

struct EmptyStateCard: View {
    let title: String
    let detail: String
    let systemImage: String

    var body: some View {
        SurfaceCard(accent: AppTheme.accentSecondary) {
            VStack(alignment: .leading, spacing: 14) {
                Image(systemName: systemImage)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppTheme.accent)

                Text(title)
                    .font(.headline.weight(.black))
                    .foregroundStyle(AppTheme.textPrimary)

                Text(detail)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct NotificationBubble: View {
    let count: Int

    var body: some View {
        if count > 0 {
            Text("\(min(count, 9))")
                .font(.caption2.weight(.black))
                .foregroundStyle(.black)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(AppTheme.accent)
                .clipShape(Capsule())
        }
    }
}
