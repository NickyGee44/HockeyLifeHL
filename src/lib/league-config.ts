export const currentLeague = {
  name: "HockeyLifeHL",
  shortName: "HLHL",
  slogan: "For Fun, For Beers, For Glory",
  logo: "/logo.png",
  colors: {
    primary: "#E31837", // Canada Red
    secondary: "#0066CC", // Rink Blue
    accent: "#FFD700", // Gold
  },
  features: {
    standings: true,
    schedule: true,
    stats: true,
    teams: true,
    news: true,
    captainTools: true,
    adminPanel: true,
  },
  roles: {
    adminLabel: "Admin",
    captainLabel: "Captain",
    playerLabel: "Player",
  },
  // Social links or contact info could go here
  contact: {
    email: "commissioner@hockeylifehl.com",
  },
};

export const platformConfig = {
  name: "Beer League Hockey",
  domain: "beerleaguehockey.ca",
  slogan: "Built for the leagues we actually play in.",
  logo: "/BLH-logo.png",
  fontLogo: "/BLH-text-logo.png",
  icon: "/BLH-icon.png",
  banner: "/BLH-banner.png",
  colors: {
    iceWhite: "#F7FAFC",
    rinkBlue: "#1F4FD8",
    goalRed: "#D72638",
    midnight: "#0B1220",
    slate: "#7B8794",
    frostGrey: "#E6EBF2",
  }
};

export type LeagueConfig = typeof currentLeague;
export type PlatformConfig = typeof platformConfig;
