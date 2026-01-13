import Image from "next/image";
import Link from "next/link";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-arena flex flex-col">
      <Header />
      <div className="flex-1">
      {/* Hero Section with Banner */}
      <header className="relative overflow-hidden">
        {/* Banner Background */}
        <div className="absolute inset-0">
          <Image
            src="/banner2.png"
            alt="HockeyLifeHL Banner"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        </div>
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/logo2.png"
                alt="HockeyLifeHL"
                width={400}
                height={400}
                className="mx-auto h-48 md:h-64 w-auto drop-shadow-2xl"
                priority
              />
            </div>
            
            <p className="text-ice-white text-xl md:text-2xl mb-2 font-medium drop-shadow-lg">
              Men&apos;s Recreational Hockey League
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" className="text-lg px-8 bg-canada-red hover:bg-canada-red-dark shadow-lg" asChild>
                <Link href="/register">
                  Join the League 🏒
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 bg-background/80 backdrop-blur" asChild>
                <Link href="/standings">
                  View Standings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Preview Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-center mb-12">
            <span className="text-foreground">Season </span>
            <span className="text-canada-red">Highlights</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="stat-box">
              <div className="stat-value">127</div>
              <div className="stat-label">Goals Scored</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">48</div>
              <div className="stat-label">Players</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">6</div>
              <div className="stat-label">Teams</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">13</div>
              <div className="stat-label">Games Played</div>
            </div>
          </div>
        </div>
      </section>

      {/* Player Ratings Demo */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-center mb-4">
            <span className="text-foreground">Player </span>
            <span className="text-gold">Ratings</span>
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Our algorithm rates every player from A to D based on performance
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center hover:border-gold/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-16 h-16 rounded-full rating-a flex items-center justify-center mx-auto text-2xl font-bold">
                  A
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Elite</CardTitle>
                <CardDescription>Top performers, sniper status</CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:border-border/80 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-16 h-16 rounded-full rating-b flex items-center justify-center mx-auto text-2xl font-bold">
                  B
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Solid</CardTitle>
                <CardDescription>Reliable two-way players</CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:border-border/80 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-16 h-16 rounded-full rating-c flex items-center justify-center mx-auto text-2xl font-bold">
                  C
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Grinder</CardTitle>
                <CardDescription>Heart and hustle</CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center hover:border-border/80 transition-colors">
              <CardHeader className="pb-2">
                <div className="w-16 h-16 rounded-full rating-d flex items-center justify-center mx-auto text-2xl font-bold">
                  D
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Rookie</CardTitle>
                <CardDescription>Still finding their game</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center mb-12">
            <span className="text-foreground">Everything You Need to </span>
            <span className="text-canada-red">Run the League</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">📊</div>
                <CardTitle>Stat Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Goals, assists, shutouts, GAA - every stat tracked and verified by both team captains.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">🎯</div>
                <CardTitle>Draft System</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Every 13 games, redraft with our rating algorithm. A-D scale based on real performance.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">✍️</div>
                <CardTitle>AI Game Recaps</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Automatic articles written each week featuring top performers and epic rivalries.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">👑</div>
                <CardTitle>League Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Full control for league owners - seasons, playoffs, suspensions, player movements.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">🏆</div>
                <CardTitle>Historical Records</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  All-time stats, season archives, and legendary performances preserved forever.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="hover:border-canada-red/30 transition-colors">
              <CardHeader>
                <div className="text-4xl mb-2">💳</div>
                <CardTitle>Easy Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Collect league fees online. No more chasing down payments at the rink.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Role Badges */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-4">
            <span className="text-foreground">Built for </span>
            <span className="text-rink-blue">Everyone</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Different dashboards for different roles
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="text-lg px-6 py-2 border-gold text-gold">
              👑 League Owner
            </Badge>
            <Badge variant="outline" className="text-lg px-6 py-2 border-canada-red text-canada-red">
              🏒 Team Captain
            </Badge>
            <Badge variant="outline" className="text-lg px-6 py-2 border-rink-blue text-rink-blue">
              ⛸️ Player
            </Badge>
            <Badge variant="outline" className="text-lg px-6 py-2">
              👀 Fan
            </Badge>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Card className="glass border-gold/20 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <Image
                src="/banner.png"
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <CardHeader className="relative">
              <CardTitle className="text-3xl">
                Ready to <span className="text-canada-red">Drop the Puck?</span>
              </CardTitle>
              <CardDescription className="text-lg">
                Join HockeyLifeHL and take your beer league to the next level.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button className="btn-hockey-gold text-lg" asChild>
                <Link href="/register">
                  Get Started 🏒
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      </div>
      <Footer />
    </div>
  );
}
