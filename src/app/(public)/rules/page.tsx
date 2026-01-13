import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2">
            <span className="text-foreground">League </span>
            <span className="text-canada-red">Rules</span>
          </h1>
          <p className="text-muted-foreground">
            Rules and regulations for HockeyLifeHL
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>League Rules & Regulations</CardTitle>
            <CardDescription>
              For Fun, For Beers, For Glory 🍁🏒
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">General Rules</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>All games follow standard hockey rules</li>
                <li>Respect for opponents, officials, and teammates is mandatory</li>
                <li>Unsportsmanlike conduct will result in suspensions</li>
                <li>All players must be registered and have paid league fees</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Stat Tracking</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Team captains are responsible for entering stats after each game</li>
                <li>Both captains must verify stats before they become official</li>
                <li>Only verified games count toward standings and player stats</li>
                <li>Stats include goals, assists, and goalie statistics</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Draft System</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>League resets every 13 games with a new draft</li>
                <li>Player ratings (A-D) are calculated based on performance</li>
                <li>Draft order is determined by team standings</li>
                <li>All players are eligible to be drafted</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Suspensions</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Suspensions are tracked by games remaining</li>
                <li>Suspended players cannot play until suspension is served</li>
                <li>League owner manages all suspensions</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                For questions about rules or to report issues, please{" "}
                <Link href="/contact" className="text-canada-red hover:underline">
                  contact the league
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
