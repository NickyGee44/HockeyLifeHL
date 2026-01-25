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

export type LeagueConfig = typeof currentLeague;
