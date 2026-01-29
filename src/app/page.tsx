import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { IceRinkDivider } from "@/components/marketing/IceRinkDivider";
import { Check, ArrowRight, Trophy, Users, BarChart3, CreditCard, Calendar, Sparkles, Mail, Phone, Building } from "lucide-react";
import { platformConfig } from "@/lib/league-config";
import { AuroraText } from "@/components/magicui/aurora-text";
import Safari_01 from "@/components/ui/safari-01";

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col text-[#0B1220] relative overflow-hidden">
      {/* Background Ice Texture Image */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/web-bg2.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.15]"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/80" />
      </div>

      <MarketingHeader />

      <main className="flex-1 relative z-10">
        {/* Hero Section - With Background Video */}
        <section className="relative min-h-[90vh] py-24 md:pb-32 lg:pb-36 lg:pt-48 overflow-hidden">
          {/* Background Video */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl border border-black/10 dark:border-white/5">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="size-full object-cover opacity-60 dark:opacity-50"
              src="/hero-video.mp4"></video>
            {/* Light gradient overlay for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40 dark:from-black/40 dark:via-transparent dark:to-black/40" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Two-column layout on large screens, stacked on mobile */}
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">

              {/* Left side - Text content */}
              <div className="flex-1 text-center lg:text-left max-w-2xl">
                <Badge variant="outline" className="mb-8 px-5 py-2 border-[#1F4FD8]/30 text-[#1F4FD8] bg-[#1F4FD8]/5 font-semibold text-base">
                  🏒 Built for Beer Leaguers, By Beer Leaguers
                </Badge>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight mb-8 leading-[0.95]">
                  Run Your Hockey League{" "}
                  <AuroraText
                    className="block mt-4"
                    colors={["#1F4FD8", "#D72638", "#FFD700", "#1F4FD8"]}
                    speed={1.5}
                  >
                    Like a Pro
                  </AuroraText>
                </h1>
                <p className="text-xl md:text-2xl text-[#7B8794] mb-12 leading-relaxed font-light dark:text-gray-300">
                  Modern drafts, real-time stats, and seamless payments.
                  Everything you need to focus on the game, not the paperwork.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                  <Button size="lg" className="text-xl h-16 px-12 bg-[#1F4FD8] hover:bg-[#1F4FD8]/90 text-white shadow-2xl hover:shadow-3xl transition-all font-bold" asChild>
                    <Link href="#contact">
                      Get Started <ArrowRight className="ml-2 h-6 w-6" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="text-xl h-16 px-12 bg-white border-2 border-[#E6EBF2] hover:border-[#1F4FD8]/50 hover:bg-[#F7FAFC] font-semibold" asChild>
                    <Link href="https://pilot.beerleaguehockey.ca">
                      View Demo League
                    </Link>
                  </Button>
                </div>

                {/* Floating accent elements */}
                <div className="mt-16 flex gap-4 justify-center lg:justify-start flex-wrap">
                  <div className="bg-[#16C784] text-white px-5 py-2.5 rounded-full text-sm md:text-base font-bold shadow-lg">
                    🏒 Professional Tools
                  </div>
                  <div className="bg-[#1F4FD8] text-white px-5 py-2.5 rounded-full text-sm md:text-base font-bold shadow-lg">
                    ⚡ Setup in Minutes
                  </div>
                </div>
              </div>

              {/* Right side - Safari browser preview */}
              <div className="flex-1 w-full max-w-3xl">
                <Link
                  href="https://pilot.beerleaguehockey.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                >
                  <Safari_01
                    image="/pilot_league.png"
                    className="shadow-2xl border-2 border-zinc-300/50 dark:border-zinc-700/50 hover:shadow-3xl transition-shadow"
                  />
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Blue Line Divider */}
        <IceRinkDivider color="blue" />

        {/* Social Proof / Testimonials */}
        <section className="py-24 bg-gradient-to-b from-white to-[#F7FAFC]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 px-3 py-1 border-[#16C784]/30 text-[#16C784] bg-[#16C784]/5">
                ⭐ Loved by League Organizers
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Leagues Choose Us
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  quote: "Finally, a platform that actually understands beer league hockey. The draft feature alone saved us hours of headache.",
                  author: "Mike L.",
                  role: "League Commissioner",
                  league: "Ottawa Valley Hockey"
                },
                {
                  quote: "Players love checking their stats after games. The AI recaps are hilarious and spot-on. It's become part of our league culture.",
                  author: "Sarah K.",
                  role: "Captain",
                  league: "Toronto Sunday Night League"
                },
                {
                  quote: "Getting paid on time was always a nightmare. Now everyone pays through Stripe and I can focus on organizing games, not chasing players.",
                  author: "James T.",
                  role: "League Owner",
                  league: "Calgary Adult Hockey"
                }
              ].map((testimonial, i) => (
                <Card key={i} className="bg-white border-[#E6EBF2] shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex mb-4 text-[#FFD700]">
                      {'★★★★★'.split('').map((star, j) => <span key={j}>{star}</span>)}
                    </div>
                    <p className="text-[#0B1220] mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-[#E6EBF2]">
                      <div className="flex-1">
                        <div className="font-semibold text-[#0B1220]">{testimonial.author}</div>
                        <div className="text-sm text-[#7B8794]">{testimonial.role}</div>
                        <div className="text-xs text-[#1F4FD8] mt-1">{testimonial.league}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Red Line Divider */}
        <IceRinkDivider color="red" />

        {/* Features Section - Redesigned */}
        <section id="features" className="py-28 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1 border-[#1F4FD8]/30 text-[#1F4FD8] bg-[#1F4FD8]/5">
                🏒 Full Feature Set
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything Your League Needs</h2>
              <p className="text-xl text-[#7B8794] max-w-2xl mx-auto">
                Built for the game we love. Professional tools without the complexity.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  icon: <Trophy className="h-12 w-12 text-[#1F4FD8]" />,
                  title: "Live Snake Drafts",
                  desc: "Real-time draft board with player rankings, stats, and auto-pick timers. Make draft night legendary.",
                  highlight: "Most Popular"
                },
                {
                  icon: <BarChart3 className="h-12 w-12 text-[#1F4FD8]" />,
                  title: "Advanced Stats",
                  desc: "Goals, assists, +/-, GAA, save %. Track everything with live scorekeeper entry and automatic calculations.",
                  highlight: null
                },
                {
                  icon: <CreditCard className="h-12 w-12 text-[#16C784]" />,
                  title: "Stripe Payments",
                  desc: "No more chasing players for league fees. Automated reminders, secure payments, instant confirmation.",
                  highlight: null
                },
                {
                  icon: <Users className="h-12 w-12 text-[#1F4FD8]" />,
                  title: "Team Management",
                  desc: "Captains manage rosters, set lines, and communicate. Players join teams with simple invite codes.",
                  highlight: null
                },
                {
                  icon: <Sparkles className="h-12 w-12 text-[#D72638]" />,
                  title: "AI Game Recaps",
                  desc: "Automated game recaps and weekly newsletters. Every goal, save, and chirp gets the spotlight it deserves.",
                  highlight: "Fan Favorite"
                },
                {
                  icon: <Calendar className="h-12 w-12 text-[#1F4FD8]" />,
                  title: "Smart Scheduling",
                  desc: "Automated season schedules with playoff brackets. Players get notifications for upcoming games.",
                  highlight: null
                },
              ].map((feature, i) => (
                <Card key={i} className="relative bg-white border-2 border-[#E6EBF2] hover:border-[#1F4FD8]/50 hover:shadow-xl transition-all group">
                  {feature.highlight && (
                    <div className="absolute -top-3 left-4 bg-[#1F4FD8] text-white px-3 py-1 rounded-full text-xs font-bold">
                      {feature.highlight}
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="mb-3 p-3 bg-[#F7FAFC] rounded-lg w-fit group-hover:bg-[#1F4FD8]/10 transition-colors">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-[#7B8794] leading-relaxed">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Blue Line Divider */}
        <IceRinkDivider color="blue" />

        {/* How It Works */}
        <section className="py-28 bg-gradient-to-b from-[#F7FAFC] to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1 border-[#1F4FD8]/30 text-[#1F4FD8] bg-[#1F4FD8]/5">
                🚀 Getting Started
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Setup in Minutes, Not Hours</h2>
              <p className="text-xl text-[#7B8794] max-w-2xl mx-auto">
                From signup to your first game in 3 simple steps
              </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "Create Your League",
                    desc: "Sign up in 30 seconds. Add your league name, logo, and colors. Invite your captains.",
                    icon: "📋"
                  },
                  {
                    step: "2",
                    title: "Build Your Teams",
                    desc: "Run a live draft or let captains build rosters. Players join with simple invite codes.",
                    icon: "⚡"
                  },
                  {
                    step: "3",
                    title: "Start Playing",
                    desc: "Schedule games, track stats live, and let the AI write your recaps. Focus on hockey.",
                    icon: "🏒"
                  }
                ].map((step, i) => (
                  <div key={i} className="relative">
                    <div className="text-center">
                      <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-br from-[#1F4FD8] to-[#0B1220] rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {step.step}
                      </div>
                      <div className="text-4xl mb-4">{step.icon}</div>
                      <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                      <p className="text-[#7B8794] leading-relaxed">{step.desc}</p>
                    </div>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#1F4FD8]/50 to-transparent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Red Line Divider */}
        <IceRinkDivider color="red" />

        {/* Contact / Pricing Section */}
        <section id="contact" className="py-28 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-4 py-2 border-[#1F4FD8]/30 text-[#1F4FD8] bg-[#1F4FD8]/5 text-base font-semibold">
                📞 Let's Talk Hockey
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">Get Your League Started</h2>
              <p className="text-xl md:text-2xl text-[#7B8794] max-w-3xl mx-auto leading-relaxed">
                Custom pricing tailored to your league's needs. Fill out the form and we'll get back to you within 24 hours.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* What's Included */}
              <div>
                <h3 className="text-3xl font-bold mb-8">What's Included</h3>
                <div className="space-y-6">
                  {[
                    { icon: <Trophy className="h-6 w-6" />, title: "Live Snake Drafts", desc: "Professional-style real-time drafts with player rankings" },
                    { icon: <BarChart3 className="h-6 w-6" />, title: "Complete Stats Tracking", desc: "Goals, assists, +/-, GAA, save % - everything automated" },
                    { icon: <CreditCard className="h-6 w-6" />, title: "Stripe Payments", desc: "Seamless fee collection with automated reminders" },
                    { icon: <Users className="h-6 w-6" />, title: "Team Management", desc: "Captain tools, rosters, lines, and communication" },
                    { icon: <Sparkles className="h-6 w-6" />, title: "AI Game Recaps", desc: "Automated game summaries and weekly newsletters" },
                    { icon: <Calendar className="h-6 w-6" />, title: "Smart Scheduling", desc: "Season generation, playoff brackets, notifications" },
                    { icon: <Building className="h-6 w-6" />, title: "Custom Branding", desc: "Your logo, colors, and domain (yourdomain.com)" },
                    { icon: <Mail className="h-6 w-6" />, title: "White-Label Options", desc: "Complete customization for your organization" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-[#1F4FD8]/10 rounded-lg flex items-center justify-center text-[#1F4FD8]">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                        <p className="text-[#7B8794]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <Card className="border-2 border-[#1F4FD8] shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">Request a Quote</CardTitle>
                    <CardDescription className="text-base">
                      Tell us about your league and we'll create a custom package for you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-base">Full Name</Label>
                        <Input id="name" placeholder="Wayne Gretzky" className="h-12" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base">Email</Label>
                        <Input id="email" type="email" placeholder="wayne@hockeyleague.com" className="h-12" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-base">Phone (Optional)</Label>
                        <Input id="phone" type="tel" placeholder="(555) 123-4567" className="h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leagueName" className="text-base">League Name</Label>
                        <Input id="leagueName" placeholder="Ottawa Valley Hockey League" className="h-12" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teams" className="text-base">Number of Teams</Label>
                        <Input id="teams" type="number" placeholder="8" className="h-12" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-base">Additional Details</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us about your league, any specific needs, or questions you have..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <Button type="submit" className="w-full h-14 text-lg bg-[#1F4FD8] hover:bg-[#1F4FD8]/90 font-bold shadow-lg">
                        <Mail className="mr-2 h-5 w-5" />
                        Get Your Custom Quote
                      </Button>
                      <p className="text-xs text-center text-[#7B8794]">
                        We typically respond within 24 hours. No commitment required.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Blue Line Divider */}
        <IceRinkDivider color="blue" />

        {/* Final CTA Section */}
        <section className="py-32 bg-gradient-to-br from-[#0B1220] via-[#1F4FD8] to-[#0B1220] text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#16C784] rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="inline-block mb-8 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-lg font-semibold">
                🏒 Join 50+ Active Leagues
              </div>
              <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                Ready to Elevate Your <br className="hidden md:block" />
                Hockey League?
              </h2>
              <p className="text-2xl md:text-3xl text-white/90 mb-14 max-w-3xl mx-auto leading-relaxed">
                Custom pricing for your league. Professional tools without the complexity.
                Let's talk hockey.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center mb-10">
                <Button size="lg" className="text-xl h-18 px-14 bg-white text-[#0B1220] hover:bg-[#F7FAFC] shadow-2xl hover:shadow-3xl transition-all font-bold" asChild>
                  <Link href="#contact">
                    Get Your Custom Quote <ArrowRight className="ml-2 h-6 w-6" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-xl h-18 px-14 bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold" asChild>
                  <Link href="https://pilot.beerleaguehockey.ca">
                    See Demo League
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-8 text-base text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>24-hour response time</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>Custom features available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>No commitment required</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E6EBF2] py-16 bg-white relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image src={platformConfig.logo} alt="Beer League Hockey" width={40} height={40} />
                <span className="font-display text-xl font-bold">Beer League Hockey</span>
              </div>
              <p className="text-[#7B8794] text-sm leading-relaxed">
                Built for the leagues we actually play in. By beer leaguers, for beer leaguers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-bold text-[#0B1220] mb-4">Product</h3>
              <ul className="space-y-2.5 text-sm text-[#7B8794]">
                <li><Link href="/#features" className="hover:text-[#1F4FD8] transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-[#1F4FD8] transition-colors">Pricing</Link></li>
                <li><Link href="https://pilot.beerleaguehockey.ca" className="hover:text-[#1F4FD8] transition-colors">Demo</Link></li>
                <li><Link href="/about" className="hover:text-[#1F4FD8] transition-colors">About Us</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-bold text-[#0B1220] mb-4">Support</h3>
              <ul className="space-y-2.5 text-sm text-[#7B8794]">
                <li><Link href="/contact" className="hover:text-[#1F4FD8] transition-colors">Contact</Link></li>
                <li><Link href="/terms" className="hover:text-[#1F4FD8] transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-[#1F4FD8] transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Newsletter/Social */}
            <div>
              <h3 className="font-bold text-[#0B1220] mb-4">Stay Connected</h3>
              <p className="text-sm text-[#7B8794] mb-4">Get updates on new features and hockey tips</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 text-sm border border-[#E6EBF2] rounded-lg focus:outline-none focus:border-[#1F4FD8]"
                />
                <Button size="sm" className="bg-[#1F4FD8]">Join</Button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E6EBF2] text-center text-sm text-[#7B8794]">
            <p>© {new Date().getFullYear()} Beer League Hockey. Made with 🏒 in Canada.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
