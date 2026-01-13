import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  league: [
    { href: "/standings", label: "Standings" },
    { href: "/schedule", label: "Schedule" },
    { href: "/stats", label: "Player Stats" },
    { href: "/teams", label: "Teams" },
  ],
  info: [
    { href: "/news", label: "News" },
    { href: "/rules", label: "League Rules" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt="HockeyLifeHL"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="font-display text-2xl font-bold text-gradient-canada">
                HockeyLifeHL
              </span>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              The ultimate men&apos;s recreational hockey league. 
              Where legends are made, rivalries are born, and beers are earned.
            </p>
            <p className="text-gold font-semibold">
              🍁 For Fun, For Beers, For Glory 🍺
            </p>
          </div>

          {/* League Links */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">League</h3>
            <ul className="space-y-2">
              {footerLinks.league.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info Links */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Info</h3>
            <ul className="space-y-2">
              {footerLinks.info.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HockeyLifeHL. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
