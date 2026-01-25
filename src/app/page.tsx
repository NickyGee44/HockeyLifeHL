import { getPlayerOfTheWeek } from "@/lib/stats/actions";
import { LandingPage } from "@/components/layout/LandingPage";

export default async function Home() {
  const { player: playerOfTheWeek } = await getPlayerOfTheWeek();
  
  return <LandingPage playerOfTheWeek={playerOfTheWeek} />;
}