import { getPlayerOfTheWeek } from "@/lib/stats/actions";
import { LandingPage } from "@/components/layout/LandingPage";
import { getLeagueSponsors, getPlatformSponsors } from "@/lib/sponsors/actions";

export default async function Home() {
  const [
    { player: playerOfTheWeek },
    { sponsors: leagueSponsors },
    { sponsors: platformSponsors }
  ] = await Promise.all([
    getPlayerOfTheWeek(),
    getLeagueSponsors('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), // Legacy league ID
    getPlatformSponsors()
  ]);
  
  return (
    <LandingPage 
      playerOfTheWeek={playerOfTheWeek} 
      leagueSponsors={leagueSponsors}
      platformSponsors={platformSponsors}
    />
  );
}