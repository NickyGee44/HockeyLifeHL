"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth/actions";
import { toast } from "sonner";

const navLinks = [
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/stats", label: "Stats" },
  { href: "/teams", label: "Teams" },
  { href: "/news", label: "News" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, profile, loading, isOwner, isCaptain } = useAuth();
  const router = useRouter();

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
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {/* Dashboard Links for Authenticated Users */}
          {user && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard" className="text-sm">
                  ⛸️ Dashboard
                </Link>
              </Button>
              {isCaptain && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/captain" className="text-sm">
                    🏒 Captain
                  </Link>
                </Button>
              )}
              {isOwner && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="opacity-20 hover:opacity-100 transition-opacity"
                  title="Admin Panel"
                >
                  <Link href="/admin" className="text-sm">
                    👑
                  </Link>
                </Button>
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
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium text-foreground hover:text-canada-red transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-border pt-4 mt-4">
                    {user ? (
                      <>
                        <div className="mb-4">
                          <p className="font-medium">
                            {getRoleBadge()} {profile?.full_name || "Player"}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className="block text-lg font-medium text-foreground hover:text-canada-red transition-colors mb-4"
                        >
                          Dashboard
                        </Link>
                        {isCaptain && (
                          <Link
                            href="/captain"
                            onClick={() => setIsOpen(false)}
                            className="block text-lg font-medium text-foreground hover:text-canada-red transition-colors mb-4"
                          >
                            Captain Tools
                          </Link>
                        )}
                        {isOwner && (
                          <Link
                            href="/admin"
                            onClick={() => setIsOpen(false)}
                            className="block text-lg font-medium text-foreground hover:text-canada-red transition-colors mb-4"
                          >
                            Admin Panel
                          </Link>
                        )}
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
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
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
                  </div>
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
