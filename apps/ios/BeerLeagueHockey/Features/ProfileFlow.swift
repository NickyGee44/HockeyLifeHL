import SwiftUI

private enum ProfileRoute: Hashable {
    case edit
    case notifications
    case settings
}

struct ProfileRootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    SurfaceCard(accent: appModel.currentLeague.primaryColor) {
                        VStack(alignment: .leading, spacing: 14) {
                            Text(appModel.profile.displayName)
                                .font(.system(size: 30, weight: .black, design: .rounded))
                                .foregroundStyle(AppTheme.textPrimary)

                            Text("\(appModel.profile.favoritePosition)  |  #\(appModel.profile.jerseyNumber)  |  \(appModel.profile.hometown)")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(AppTheme.textSecondary)

                            Text(appModel.profile.emailAddress)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                    }

                    NavigationLink(value: ProfileRoute.notifications) {
                        profileCard(
                            title: "Notifications",
                            subtitle: "\(appModel.unreadNotificationCount) unread items",
                            systemImage: "bell.badge.fill",
                            accent: AppTheme.warning
                        )
                    }
                    .buttonStyle(.plain)

                    NavigationLink(value: ProfileRoute.edit) {
                        profileCard(
                            title: "Edit profile",
                            subtitle: "Update display name, position, and hometown.",
                            systemImage: "square.and.pencil",
                            accent: AppTheme.accent
                        )
                    }
                    .buttonStyle(.plain)

                    NavigationLink(value: ProfileRoute.settings) {
                        profileCard(
                            title: "Notification settings",
                            subtitle: "Choose reminders, roster alerts, and league updates.",
                            systemImage: "gearshape.fill",
                            accent: AppTheme.accentSecondary
                        )
                    }
                    .buttonStyle(.plain)
                }
                .padding(20)
            }
            .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
            .navigationDestination(for: ProfileRoute.self) { route in
                switch route {
                case .edit:
                    EditProfileView()
                case .notifications:
                    NotificationsView()
                case .settings:
                    NotificationSettingsView()
                }
            }
        }
    }

    private func profileCard(title: String, subtitle: String, systemImage: String, accent: Color) -> some View {
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

struct NotificationsView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Button("Mark all read") {
                    appModel.markAllNotificationsRead()
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.black)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(AppTheme.accent)
                .clipShape(Capsule())
                .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(appModel.notifications) { item in
                    SurfaceCard(accent: item.isUnread ? AppTheme.warning : AppTheme.accentSecondary) {
                        HStack(alignment: .top, spacing: 14) {
                            Image(systemName: item.systemImage)
                                .font(.title3.weight(.bold))
                                .foregroundStyle(item.isUnread ? AppTheme.warning : AppTheme.accentSecondary)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(AppTheme.textPrimary)
                                Text(item.detail)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(AppTheme.textSecondary)
                                Text(item.timeLabel)
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(AppTheme.textMuted)
                            }

                            Spacer()
                        }
                    }
                }
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct EditProfileView: View {
    @Environment(AppModel.self) private var appModel
    @Environment(\.dismiss) private var dismiss

    @State private var displayName = ""
    @State private var emailAddress = ""
    @State private var favoritePosition = ""
    @State private var hometown = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                field("Display name", text: $displayName)
                field("Email", text: $emailAddress)
                field("Favorite position", text: $favoritePosition)
                field("Hometown", text: $hometown)

                Button("Save profile") {
                    appModel.updateProfile(
                        displayName: displayName,
                        emailAddress: emailAddress,
                        favoritePosition: favoritePosition,
                        hometown: hometown
                    )
                    dismiss()
                }
                .font(.headline.weight(.black))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: appModel.currentLeague.primaryColor))
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if displayName.isEmpty {
                displayName = appModel.profile.displayName
                emailAddress = appModel.profile.emailAddress
                favoritePosition = appModel.profile.favoritePosition
                hometown = appModel.profile.hometown
            }
        }
    }

    private func field(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.footnote.weight(.bold))
                .foregroundStyle(AppTheme.textSecondary)

            TextField(title, text: text)
                .textInputAutocapitalization(.words)
                .padding(.horizontal, 14)
                .padding(.vertical, 14)
                .background(AppTheme.surface)
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(AppTheme.stroke, lineWidth: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .foregroundStyle(AppTheme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct NotificationSettingsView: View {
    @State private var gameReminders = true
    @State private var rosterUpdates = true
    @State private var leagueNews = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                settingsToggle("Game reminders", systemImage: "bell.badge", isOn: $gameReminders)
                settingsToggle("Roster updates", systemImage: "person.2.badge.gearshape", isOn: $rosterUpdates)
                settingsToggle("League news", systemImage: "newspaper.fill", isOn: $leagueNews)
            }
            .padding(20)
        }
        .background(ArenaBackground(accent: AppTheme.accentSecondary))
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func settingsToggle(_ title: String, systemImage: String, isOn: Binding<Bool>) -> some View {
        SurfaceCard(accent: isOn.wrappedValue ? AppTheme.success : AppTheme.textMuted) {
            Toggle(isOn: isOn) {
                Label(title, systemImage: systemImage)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(AppTheme.textPrimary)
            }
            .tint(AppTheme.accent)
        }
    }
}
