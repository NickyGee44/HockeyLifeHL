import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">About </span>
            <span className="text-rink-blue">HockeyLifeHL</span>
          </h1>
          <p className="text-muted-foreground">
            Men&apos;s recreational hockey league
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <Image
                src="/logo.png"
                alt="HockeyLifeHL"
                width={64}
                height={64}
                className="h-16 w-auto"
              />
              <div>
                <CardTitle className="text-2xl">HockeyLifeHL</CardTitle>
                <CardDescription className="text-lg">
                  For Fun, For Beers, For Glory 🍁🏒
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Our Mission</h3>
              <p className="text-muted-foreground">
                HockeyLifeHL is a men&apos;s recreational hockey league dedicated to bringing 
                players together for competitive, fun hockey. We believe in the spirit of 
                Canadian hockey - where competition meets camaraderie, and every game is 
                played with heart.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">What We Offer</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Regular season games with full stat tracking</li>
                <li>13-game cycles with redrafting for balanced competition</li>
                <li>Comprehensive player statistics and leaderboards</li>
                <li>AI-generated game recaps and weekly articles</li>
                <li>Team management tools for captains</li>
                <li>Mobile-friendly PWA for on-the-go access</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">The League</h3>
              <p className="text-muted-foreground">
                Our league operates on a unique 13-game cycle system. After every 13 games, 
                teams are redrafted based on player performance ratings, ensuring competitive 
                balance and giving everyone a fresh start. Player ratings are calculated based 
                on attendance, games played, goals, assists, and for goalies, goals against average.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Join Us</h3>
              <p className="text-muted-foreground">
                Ready to drop the puck?{" "}
                <a href="/register" className="text-canada-red hover:underline font-medium">
                  Join the league
                </a>{" "}
                and become part of the HockeyLifeHL family. Whether you&apos;re a seasoned 
                veteran or new to the game, there&apos;s a place for you on the ice.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
