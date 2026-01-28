import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "League Rules - HockeyLifeHL",
  description: "Official rules and regulations for HockeyLifeHL recreational hockey league. Read the rules before you play.",
  openGraph: {
    title: "League Rules - HockeyLifeHL",
    description: "Official rules and regulations for HockeyLifeHL recreational hockey league.",
  },
};

export default function RulesPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">League Rules</h1>
        <p className="text-muted-foreground">Official rules and regulations for HockeyLifeHL</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Rules</CardTitle>
            <CardDescription>Basic league guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Sportsmanship
              </h3>
              <p className="text-muted-foreground">
                All players are expected to conduct themselves with respect and sportsmanship. 
                Unsportsmanlike conduct may result in penalties or suspension.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Equipment
              </h3>
              <p className="text-muted-foreground">
                All players must wear appropriate hockey equipment including helmet, gloves, skates, 
                shin pads, and stick. Goalies must wear full goalie equipment.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Attendance
              </h3>
              <p className="text-muted-foreground">
                Players are expected to attend all scheduled games. If unable to attend, notify your 
                captain as soon as possible. Consistent absences may affect future draft position.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game Rules</CardTitle>
            <CardDescription>On-ice regulations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                Game Length
              </h3>
              <p className="text-muted-foreground">
                Games consist of three periods. Exact timing is determined by ice time availability.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                Penalties
              </h3>
              <p className="text-muted-foreground">
                Standard hockey penalties apply. Severe infractions may result in game ejection and 
                league suspension.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">6</Badge>
                Scoring
              </h3>
              <p className="text-muted-foreground">
                Goals and assists are tracked for all players. Captains are responsible for entering 
                stats after each game, which must be verified by the opposing captain.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Draft & Season Rules</CardTitle>
            <CardDescription>League structure and drafts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">7</Badge>
                Draft Cycles
              </h3>
              <p className="text-muted-foreground">
                The league redrafts every 13 games. Player ratings are based on attendance, 
                performance, and stats from the previous cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">8</Badge>
                Player Ratings
              </h3>
              <p className="text-muted-foreground">
                Skaters are rated A-D based on attendance, games played, points, goals, and assists. 
                Goalies are rated based on attendance, games played, GAA, and save percentage.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">9</Badge>
                Draft Order
              </h3>
              <p className="text-muted-foreground">
                Snake draft format is used. Draft order is determined before each draft.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Code of Conduct</CardTitle>
            <CardDescription>Expected behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">10</Badge>
                Respect
              </h3>
              <p className="text-muted-foreground">
                Treat all players, officials, and staff with respect. Harassment, discrimination, 
                or abusive behavior will not be tolerated.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">11</Badge>
                Fair Play
              </h3>
              <p className="text-muted-foreground">
                Play to have fun and compete fairly. The spirit of the game is more important than winning.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">12</Badge>
                League Motto
              </h3>
              <p className="text-muted-foreground font-semibold text-canada-red">
                "For Fun, For Beers, For Glory" 🍁🏒🍺
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              League administrators reserve the right to modify rules as needed. Players will be notified 
              of any rule changes. For questions about rules, contact the league administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
