import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - HockeyLifeHL",
  description: "Learn about HockeyLifeHL - The ultimate recreational men's hockey league platform. For Fun, For Beers, For Glory.",
  openGraph: {
    title: "About Us - HockeyLifeHL",
    description: "Learn about HockeyLifeHL and our mission to bring recreational hockey to everyone.",
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">About HockeyLifeHL</h1>
        <p className="text-muted-foreground">For Fun, For Beers, For Glory 🍁🏒🍺</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
            <CardDescription>What we're all about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              HockeyLifeHL is a recreational men's hockey league dedicated to bringing together players
              of all skill levels for competitive, fun, and community-focused hockey. We believe in the
              spirit of the game, camaraderie, and creating lasting memories on and off the ice.
            </p>
            <p className="text-muted-foreground">
              Whether you're a seasoned veteran or picking up a stick for the first time, our league
              provides a welcoming environment where everyone can enjoy the greatest game on earth.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Makes Us Unique</CardTitle>
            <CardDescription>The HockeyLifeHL difference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-canada-red mt-1">🔄</Badge>
              <div>
                <h3 className="font-semibold mb-1">13-Game Draft Cycles</h3>
                <p className="text-muted-foreground text-sm">
                  Every 13 games, teams are redrafted to keep things fresh and balanced. No season-long
                  dynasties, just constant competition and new teammates.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-canada-red mt-1">📊</Badge>
              <div>
                <h3 className="font-semibold mb-1">Complete Stat Tracking</h3>
                <p className="text-muted-foreground text-sm">
                  All goals, assists, and goalie stats are tracked and verified. View leaderboards,
                  career stats, and game-by-game breakdowns for every player.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-canada-red mt-1">🤖</Badge>
              <div>
                <h3 className="font-semibold mb-1">AI-Powered Content</h3>
                <p className="text-muted-foreground text-sm">
                  Automatic game recaps, weekly wrap-ups, and draft grade articles keep everyone
                  engaged and informed.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-canada-red mt-1">⚖️</Badge>
              <div>
                <h3 className="font-semibold mb-1">Fair Player Ratings</h3>
                <p className="text-muted-foreground text-sm">
                  Players are rated A-D based on attendance, performance, and stats. This ensures
                  balanced drafts and competitive games.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Our Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-canada-red mb-1">🎉 Fun First</h3>
              <p className="text-muted-foreground text-sm">
                While we play to win, we never forget that hockey should be enjoyable. Leave your
                stress at the door and have a great time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-canada-red mb-1">🤝 Respect & Sportsmanship</h3>
              <p className="text-muted-foreground text-sm">
                Every player deserves respect. We maintain a positive, inclusive environment both
                on and off the ice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-canada-red mb-1">🏆 Competitive Spirit</h3>
              <p className="text-muted-foreground text-sm">
                We play hard and compete fairly. The thrill of competition makes every game exciting.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-canada-red mb-1">🍺 Post-Game Camaraderie</h3>
              <p className="text-muted-foreground text-sm">
                Some of the best moments happen after the final whistle. Grab a beer and share
                stories with your opponents-turned-friends.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get Involved</CardTitle>
            <CardDescription>Join the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Interested in playing? Check out our current season and see if there's room for new
              players. We welcome everyone who loves the game and wants to be part of something special.
            </p>
            <p className="text-muted-foreground">
              Have questions? Contact the league administrator through the contact page.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-canada-red/10 to-transparent border-canada-red/20">
          <CardContent className="py-8 text-center">
            <p className="text-2xl font-bold text-canada-red mb-2">
              "For Fun, For Beers, For Glory"
            </p>
            <p className="text-muted-foreground">
              That's not just a motto—it's a way of life. 🍁🏒🍺
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
