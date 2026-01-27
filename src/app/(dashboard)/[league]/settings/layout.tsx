"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const settingsNav = [
  { name: "General", href: "/settings/general" },
  { name: "Branding", href: "/settings/branding" },
  { name: "Divisions", href: "/settings/divisions" },
  { name: "Venues", href: "/settings/venues" },
  { name: "Scorekeepers", href: "/settings/scorekeepers" },
  { name: "Sponsors", href: "/settings/sponsors" },
  { name: "Subscription", href: "/settings/subscription" },
  { name: "Features", href: "/settings/features" },
  { name: "Members", href: "/settings/members" },
  { name: "Danger Zone", href: "/settings/danger", variant: "destructive" },
];

export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  const pathname = usePathname();
  // Client components receive params as is (not awaited)
  // TypeScript in Next.js 15 expects Promise type even for client components
  const leagueParam = (params as any).league || '';

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">League Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage your league preferences and configuration.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
              {settingsNav.map((item) => {
                // Construct the correct href based on current params
                const href = `/${leagueParam}${item.href}`;
                const isActive = pathname === href;
                
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "justify-start text-sm font-medium transition-colors hover:text-primary px-4 py-2 rounded-md",
                      isActive
                        ? "bg-muted hover:bg-muted"
                        : "hover:bg-transparent hover:underline",
                      item.variant === "destructive" && "text-destructive hover:text-destructive"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
