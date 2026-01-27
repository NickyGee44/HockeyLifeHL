import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { IceRinkDivider } from "@/components/marketing/IceRinkDivider";
import {
  Trophy, Users, BarChart3, CreditCard, Calendar, Sparkles,
  ArrowRight, Check, Zap, Shield, Globe, Smartphone, Mail, Settings
} from "lucide-react";
import { platformConfig } from "@/lib/league-config";
import Image from "next/image";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col text-[#0B1220]">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-[#1F4FD8] via-[#0B1220] to-[#1F4FD8] text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 px-4 py-2 border-white/30 text-white bg-white/10">
                🚀 Everything You Need
              </Badge>
              <h1 className="text-5xl md:text-7xl font-display font-black mb-6">
                Powerful Features for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#16C784]">
                  Modern Leagues
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8">
                Professional-grade tools built specifically for beer league sports.
                Everything from drafts to payments, all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg h-14 px-10 bg-white text-[#0B1220] hover:bg-[#F7FAFC]" asChild>
                  <Link href="#contact">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg h-14 px-10 bg-transparent border-2 border-white text-white hover:bg-white/10" asChild>
                  <Link href="/discover">
                    Discover Leagues
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1 border-[#1F4FD8]/30 text-[#1F4FD8] bg-[#1F4FD8]/5">
                🏒 Core Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Built for How You Actually Play
              </h2>
              <p className="text-xl text-[#7B8794] max-w-3xl mx-auto">
                Every feature designed with real beer leaguers in mind
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {coreFeatures.map((feature, i) => (
                <Card key={i} className="border-2 border-[#E6EBF2] hover:border-[#1F4FD8]/50 hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="mb-4 w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${feature.color}20` }}>
                      <div style={{ color: feature.color }}>
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Check className="h-5 w-5 text-[#16C784] shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <IceRinkDivider color="blue" />

        {/* Platform Features */}
        <section className="py-24 bg-gradient-to-b from-[#F7FAFC] to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 px-3 py-1 border-[#16C784]/30 text-[#16C784] bg-[#16C784]/5">
                ⚡ Platform Power
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Enterprise Features, Beer League Pricing
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
              {platformFeatures.map((section, i) => (
                <div key={i} className={`${i % 2 === 1 ? 'md:order-last' : ''}`}>
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: `${section.color}20` }}>
                      <div style={{ color: section.color }}>
                        {section.icon}
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold mb-3">{section.title}</h3>
                    <p className="text-lg text-[#7B8794] mb-6">{section.description}</p>
                    <ul className="space-y-3">
                      {section.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${section.color}20` }}>
                            <Check className="h-4 w-4" style={{ color: section.color }} />
                          </div>
                          <span className="text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <IceRinkDivider color="red" />

        {/* CTA Section */}
        <section className="py-32 bg-gradient-to-br from-[#0B1220] via-[#1F4FD8] to-[#0B1220] text-white">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-bold mb-8">
                Ready to Transform Your League?
              </h2>
              <p className="text-2xl md:text-3xl text-white/90 mb-12">
                Join 50+ leagues already using our platform
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center mb-10">
                <Button size="lg" className="text-xl h-16 px-12 bg-white text-[#0B1220] hover:bg-[#F7FAFC]" asChild>
                  <Link href="/#contact">
                    Get Your Custom Quote <ArrowRight className="ml-2 h-6 w-6" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-xl h-16 px-12 bg-transparent border-2 border-white text-white hover:bg-white/10" asChild>
                  <Link href="https://pilot.beerleaguehockey.ca">
                    View Demo League
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap justify-center gap-8 text-base text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>Setup in minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>No long-term contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-[#16C784]" />
                  <span>Dedicated support</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E6EBF2] py-8 bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-[#7B8794]">
          <p>© {new Date().getFullYear()} {platformConfig.name}. Made with 🏒 in Canada.</p>
        </div>
      </footer>
    </div>
  );
}

const coreFeatures = [
  {
    icon: <Trophy className="h-7 w-7" />,
    title: "Live Snake Drafts",
    description: "Run professional-style drafts with real-time updates",
    color: "#FFD700",
    benefits: [
      "Real-time draft board with auto-refresh",
      "Player rankings and stats integration",
      "Auto-pick timers and notifications",
      "Mobile-friendly for draft parties",
    ],
  },
  {
    icon: <BarChart3 className="h-7 w-7" />,
    title: "Advanced Stats Tracking",
    description: "Track every goal, assist, and save automatically",
    color: "#1F4FD8",
    benefits: [
      "Live scorekeeper entry during games",
      "Goals, assists, +/-, GAA, save percentage",
      "Season and career leaderboards",
      "Automatic standings calculations",
    ],
  },
  {
    icon: <CreditCard className="h-7 w-7" />,
    title: "Stripe Payments",
    description: "Collect league fees securely and automatically",
    color: "#16C784",
    benefits: [
      "Secure payment processing via Stripe",
      "Automated payment reminders",
      "Custom pricing per team or player",
      "Instant confirmation emails",
    ],
  },
  {
    icon: <Users className="h-7 w-7" />,
    title: "Team Management",
    description: "Give captains the tools they need",
    color: "#1F4FD8",
    benefits: [
      "Roster management and line setting",
      "Team messaging and announcements",
      "Simple invite codes for players",
      "Jersey number assignment",
    ],
  },
  {
    icon: <Sparkles className="h-7 w-7" />,
    title: "AI Game Recaps",
    description: "Automated summaries that capture every moment",
    color: "#D72638",
    benefits: [
      "AI-generated game recaps",
      "Weekly newsletter automation",
      "Highlight top performers",
      "Share-worthy content for social media",
    ],
  },
  {
    icon: <Calendar className="h-7 w-7" />,
    title: "Smart Scheduling",
    description: "Automated season and playoff generation",
    color: "#1F4FD8",
    benefits: [
      "Auto-generate balanced schedules",
      "Playoff bracket creation",
      "Game notifications to players",
      "iCal export for calendars",
    ],
  },
];

const platformFeatures = [
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Custom Branding & Domains",
    description: "Your league, your brand, your domain",
    color: "#1F4FD8",
    features: [
      "Custom logo, colors, and fonts",
      "Your own subdomain (yourleague.beerleaguehockey.ca)",
      "Optional custom domain (yourleague.com)",
      "White-label options available",
    ],
  },
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: "Mobile-First Design",
    description: "Perfect on any device, anywhere",
    color: "#16C784",
    features: [
      "Responsive design for phones and tablets",
      "Fast loading on slow connections",
      "Works offline for scorekeeper entry",
      "Progressive web app (PWA) support",
    ],
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Security & Privacy",
    description: "Enterprise-grade security for your data",
    color: "#D72638",
    features: [
      "SOC 2 compliant infrastructure",
      "End-to-end encryption",
      "GDPR and privacy law compliance",
      "Regular security audits",
    ],
  },
  {
    icon: <Settings className="h-8 w-8" />,
    title: "Admin Control Center",
    description: "Complete league management in one dashboard",
    color: "#1F4FD8",
    features: [
      "User and role management",
      "Game and season administration",
      "Payment and subscription tracking",
      "Analytics and reporting tools",
    ],
  },
];
