"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/ui/team-logo";
import { currentLeague } from "@/lib/league-config";

interface LandingPageProps {
  playerOfTheWeek: any;
}

export function LandingPage({ playerOfTheWeek }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-arena flex flex-col">
      <Header />
      
      {/* Live Ticker */}
      <div className="bg-puck-black/80 border-b border-white/5 py-2 overflow-hidden whitespace-nowrap relative z-20">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-12 items-center text-xs font-bold uppercase tracking-widest text-gold/80"
        >
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex gap-8 items-center">
              <span>Next Games: Monday 8:00 PM • Rink A</span>
              <span className="text-white/20">•</span>
              <span>Draft Day: Feb 1st</span>
              <span className="text-white/20">•</span>
              <span className="text-canada-red">{currentLeague.slogan}</span>
              <span className="text-white/20">•</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex-1">
        {/* Hero Section */}
        <header className="relative overflow-hidden">
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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <Image
                  src="/logo2.png"
                  alt={currentLeague.name}
                  width={400}
                  height={400}
                  className="mx-auto h-48 md:h-64 w-auto drop-shadow-[0_0_30px_rgba(227,24,55,0.3)]"
                  priority
                />
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-ice-white text-xl md:text-2xl mb-2 font-medium drop-shadow-lg"
              >
                Men&apos;s Recreational Hockey League
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mt-8"
              >
                <Button size="lg" className="text-lg px-8 bg-canada-red hover:bg-canada-red-dark shadow-[0_0_20px_rgba(227,24,55,0.5)] transition-all hover:scale-105" asChild>
                  <Link href="/register">
                    Join the League 🏒
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 bg-background/80 backdrop-blur hover:bg-background/100 transition-all hover:scale-105" asChild>
                  <Link href="/standings">
                    View Standings
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Player of the Week */}
        {playerOfTheWeek && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-center mb-8">
                  <span className="text-foreground">Player of the </span>
                  <span className="text-gold">Week</span>
                </h2>
                
                <Card className="overflow-hidden border-gold/30 bg-gradient-to-br from-card via-card to-gold/10 group hover:border-gold/50 transition-all duration-500 relative">
                  {/* Holographic Shine Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-1000 pointer-events-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,215,0,0.4)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite_linear]" />
                  
                  <div className="flex flex-col md:flex-row relative z-10">
                    <div className="flex-shrink-0 p-6 md:p-8 flex flex-col items-center md:items-start gap-4 md:border-r border-border/50">
                      <div className="relative">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: 2 }}
                          className="relative"
                        >
                          <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-gold/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                            <AvatarImage src={playerOfTheWeek.avatarUrl || ""} />
                            <AvatarFallback className="bg-canada-red text-white text-4xl">
                              {playerOfTheWeek.fullName?.split(" ").map((n: string) => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-2 -right-2 bg-gold text-black rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg border-2 border-puck-black">
                            #{playerOfTheWeek.jerseyNumber || "?"}
                          </div>
                        </motion.div>
                      </div>
                      
                      <div className="text-center md:text-left">
                        <Link href={`/stats/${playerOfTheWeek.id}`} className="hover:underline">
                          <h3 className="text-2xl font-bold text-gradient-gold">{playerOfTheWeek.fullName}</h3>
                        </Link>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                          {playerOfTheWeek.position && (
                            <Badge variant="outline" className="border-gold/50 text-gold">{playerOfTheWeek.position}</Badge>
                          )}
                          <Badge variant="outline" className="bg-canada-red/10 border-canada-red/30 text-canada-red">Elite Performer</Badge>
                        </div>
                      </div>

                      {playerOfTheWeek.team && (
                        <div className="flex items-center gap-3 mt-2">
                          <TeamLogo 
                            team={{
                              id: playerOfTheWeek.team.id,
                              name: playerOfTheWeek.team.name,
                              short_name: playerOfTheWeek.team.shortName,
                              logo_url: playerOfTheWeek.team.logoUrl,
                              primary_color: playerOfTheWeek.team.primaryColor,
                              secondary_color: playerOfTheWeek.team.secondaryColor,
                            }} 
                            size="md" 
                            showName 
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                      <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-widest">
                        Weekly Performance
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Points", value: playerOfTheWeek.weeklyStats.points, color: "text-gold" },
                          { label: "Goals", value: playerOfTheWeek.weeklyStats.goals, color: "text-canada-red" },
                          { label: "Assists", value: playerOfTheWeek.weeklyStats.assists, color: "text-rink-blue" },
                          { label: "Games", value: playerOfTheWeek.weeklyStats.gamesPlayed, color: "text-white" },
                        ].map((stat, i) => (
                          <motion.div 
                            key={i}
                            whileHover={{ y: -5 }}
                            className="text-center p-4 bg-puck-black/40 rounded-lg border border-white/5"
                          >
                            <div className={`text-3xl md:text-4xl font-display font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[10px] uppercase tracking-tighter text-muted-foreground mt-1">{stat.label}</div>
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="mt-6 text-center md:text-left">
                        <Button asChild variant="outline" className="border-gold/50 hover:bg-gold/10 text-gold group">
                          <Link href={`/stats/${playerOfTheWeek.id}`} className="flex items-center gap-2">
                            View Full Career Profile <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </section>
        )}

        {/* Features Preview */}
        <section className="py-20 px-4 bg-arena relative overflow-hidden">
          <div className="absolute inset-0 bg-canada-red/5 pointer-events-none" />
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-16">
              <h2 className="mb-4">
                <span className="text-foreground">Everything You Need to </span>
                <span className="text-canada-red">Run the League</span>
              </h2>
              <div className="h-1 w-20 bg-canada-red mx-auto" />
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: "📊", title: "Stat Tracking", desc: "Goals, assists, shutouts, GAA - every stat tracked and verified." },
                { icon: "🎯", title: "Draft System", desc: "Every 13 games, redraft with our rating algorithm. A-D scale." },
                { icon: "✍️", title: "AI Game Recaps", desc: "Automatic articles written each week featuring top performers." },
                { icon: "👑", title: "League Admin", desc: "Full control for owners - seasons, playoffs, suspensions." },
                { icon: "🏆", title: "Historical Records", desc: "All-time stats and legendary performances preserved." },
                { icon: "💳", title: "Easy Payments", desc: "Collect league fees online via Stripe integration." },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="hover:border-canada-red/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(227,24,55,0.1)] h-full bg-card/40 backdrop-blur-sm group">
                    <CardHeader>
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                      <CardTitle className="group-hover:text-canada-red transition-colors">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 relative">
          <div className="container mx-auto max-w-3xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Card className="glass border-gold/20 overflow-hidden p-12">
                <div className="absolute inset-0 opacity-20">
                  <Image
                    src="/banner.png"
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl mb-6">
                    Ready to <span className="text-canada-red">Drop the Puck?</span>
                  </h2>
                  <p className="text-xl text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                    Join {currentLeague.name} today and experience recreational hockey like never before.
                  </p>
                  <Button className="btn-hockey-gold text-xl px-12 py-8 rounded-xl shadow-xl hover:shadow-gold/20" asChild>
                    <Link href="/register">
                      Get Started 🏒
                    </Link>
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
