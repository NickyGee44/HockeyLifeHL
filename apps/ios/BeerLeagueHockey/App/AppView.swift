import SwiftUI

struct AppView: View {
    @State private var appModel = AppModel(seed: .sample)

    var body: some View {
        @Bindable var appModel = appModel

        TabView(selection: $appModel.selectedTab) {
            ForEach(appModel.visibleTabs) { tab in
                tabContent(for: tab)
                    .tabItem {
                        Label(tab.title, systemImage: tab.systemImage)
                    }
                    .tag(tab)
            }
        }
        .tint(appModel.currentLeague.primaryColor)
        .environment(appModel)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView()
        case .schedule:
            ScheduleRootView()
        case .discover:
            DiscoverRootView()
        case .stats:
            StatsRootView()
        case .team:
            TeamRootView()
        case .captain:
            CaptainRootView()
        case .profile:
            ProfileRootView()
        }
    }
}
