"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/stats", label: "Stats" },
  { href: "/teams", label: "Teams" },
  { href: "/news", label: "News" },
];

// Dashboard navigation items
const playerNav = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/team", label: "My Team", icon: "🏒" },
  { href: "/dashboard/stats", label: "My Stats", icon: "📈" },
  { href: "/dashboard/schedule", label: "Schedule", icon: "📅" },
  { href: "/dashboard/profile", label: "Profile", icon: "👤" },
];

const captainNav = [
  { href: "/captain", label: "Dashboard", icon: "🏠" },
  { href: "/captain/team", label: "Team Management", icon: "👥" },
  { href: "/captain/stats", label: "Enter Stats", icon: "✏️" },
  { href: "/captain/draft", label: "Draft Board", icon: "🎯" },
];

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: "👑" },
  { href: "/admin/teams", label: "Teams", icon: "🏆" },
  { href: "/admin/players", label: "Players", icon: "⛸️" },
  { href: "/admin/games", label: "Games", icon: "🎮" },
  { href: "/admin/seasons", label: "Seasons", icon: "📆" },
  { href: "/admin/suspensions", label: "Suspensions", icon: "🚫" },
  { href: "/admin/articles", label: "Articles", icon: "✍️" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, profile, loading, isOwner, isCaptain } = useAuth();
  const pathname = usePathname();

  // Check if we're in a dashboard area
  const isInDashboard = pathname?.startsWith("/dashboard");
  const isInCaptain = pathname?.startsWith("/captain");
  const isInAdmin = pathname?.startsWith("/admin");
  const isInAnyDashboard = isInDashboard || isInCaptain || isInAdmin;

  // Only render Sheet on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "??";
  };

  const getRoleBadge = () => {
    if (isOwner) return "👑";
    if (isCaptain) return "🏒";
    return "⛸️";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="HockeyLifeHL"
            width={48}
            height={48}
            className="h-12 w-auto"
            style={{ width: "auto", height: "3rem" }}
            priority
          />
          <span className="font-display text-xl font-bold text-gradient-canada hidden sm:inline">
            HockeyLifeHL
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Public Links */}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === link.href 
                  ? "bg-muted text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Dashboard Navigation for Authenticated Users */}
          {user && (
            <>
              <div className="h-4 w-px bg-border mx-2" />
              
              {/* Player Dashboard Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant={isInDashboard ? "secondary" : "ghost"} 
                    size="sm"
                    className={cn(
                      "gap-1",
                      isInDashboard && "bg-rink-blue text-white hover:bg-rink-blue/90"
                    )}
                  >
                    ⛸️ Player
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Player Dashboard</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {playerNav.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className={cn(
                        "w-full cursor-pointer",
                        pathname === item.href && "bg-muted"
                      )}>
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Captain Dropdown */}
              {(isCaptain || isOwner) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={isInCaptain ? "secondary" : "ghost"} 
                      size="sm"
                      className={cn(
                        "gap-1",
                        isInCaptain && "bg-canada-red text-white hover:bg-canada-red/90"
                      )}
                    >
                      🏒 Captain
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>Captain Tools</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {captainNav.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className={cn(
                          "w-full cursor-pointer",
                          pathname === item.href && "bg-muted"
                        )}>
                          <span className="mr-2">{item.icon}</span>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Admin Dropdown */}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant={isInAdmin ? "secondary" : "ghost"} 
                      size="sm"
                      className={cn(
                        "gap-1",
                        isInAdmin && "bg-gold text-puck-black hover:bg-gold/90"
                      )}
                    >
                      👑 Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>League Admin</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {adminNav.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className={cn(
                          "w-full cursor-pointer",
                          pathname === item.href && "bg-muted"
                        )}>
                          <span className="mr-2">{item.icon}</span>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </nav>

        {/* Auth / User Menu */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
                    <AvatarFallback className="bg-canada-red text-white text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">
                      {getRoleBadge()} {profile?.full_name || "Player"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                {isCaptain && (
                  <DropdownMenuItem asChild>
                    <Link href="/captain">Captain Tools</Link>
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button className="bg-canada-red hover:bg-canada-red-dark" asChild>
                <Link href="/register">Join League</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu - Only render on client to avoid hydration mismatch */}
          {mounted && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto px-6">
                <nav className="flex flex-col gap-2 mt-8 px-2">
                  {/* Public Navigation */}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    League
                  </p>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "px-3 py-2 rounded-md text-base font-medium transition-colors",
                        pathname === link.href 
                          ? "bg-muted text-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  {user ? (
                    <>
                      {/* User Info */}
                      <div className="border-t border-border pt-4 mt-4 mb-2 px-2">
                        <p className="font-medium">
                          {getRoleBadge()} {profile?.full_name || "Player"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>

                      {/* Player Dashboard */}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-4 mb-1">
                        ⛸️ Player
                      </p>
                      {playerNav.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center gap-2",
                            pathname === item.href 
                              ? "bg-rink-blue/20 text-rink-blue" 
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <span>{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}

                      {/* Captain Tools */}
                      {(isCaptain || isOwner) && (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-4 mb-1">
                            🏒 Captain
                          </p>
                          {captainNav.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center gap-2",
                                pathname === item.href 
                                  ? "bg-canada-red/20 text-canada-red" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <span>{item.icon}</span>
                              {item.label}
                            </Link>
                          ))}
                        </>
                      )}

                      {/* Admin Panel */}
                      {isOwner && (
                        <>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-4 mb-1">
                            👑 Admin
                          </p>
                          {adminNav.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "px-3 py-2 rounded-md text-base font-medium transition-colors flex items-center gap-2",
                                pathname === item.href 
                                  ? "bg-gold/20 text-gold" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <span>{item.icon}</span>
                              {item.label}
                            </Link>
                          ))}
                        </>
                      )}

                      {/* Sign Out */}
                      <div className="border-t border-border pt-4 mt-4">
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={() => {
                            setIsOpen(false);
                            handleSignOut();
                          }}
                        >
                          Sign Out
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="border-t border-border pt-4 mt-4 flex flex-col gap-2">
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/login" onClick={() => setIsOpen(false)}>
                          Sign In
                        </Link>
                      </Button>
                      <Button
                        className="w-full bg-canada-red hover:bg-canada-red-dark"
                        asChild
                      >
                        <Link href="/register" onClick={() => setIsOpen(false)}>
                          Join League
                        </Link>
                      </Button>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
          {/* Fallback button for SSR - hidden on desktop, shown on mobile until mounted */}
          {!mounted && (
            <Button variant="ghost" size="icon" className="md:hidden" disabled>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
