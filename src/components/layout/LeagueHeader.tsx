"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { createClient, resetClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navLinks = [
  { href: "/standings", label: "Standings" },
  { href: "/schedule", label: "Schedule" },
  { href: "/stats", label: "Stats" },
  { href: "/teams", label: "Teams" },
];

interface LeagueHeaderProps {
  league: {
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
}

export function LeagueHeader({ league }: LeagueHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      resetClient();
      const result = await signOut();

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Signed out successfully");
      await router.push("/");
      router.refresh();
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
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

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md shadow-sm"
      style={{ borderBottomColor: league.primaryColor + '20' }}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            {league.logoUrl ? (
              <Image
                src={league.logoUrl}
                alt={league.name}
                width={40}
                height={40}
                className="h-10 w-auto drop-shadow-sm"
                style={{ width: "auto", height: "2.5rem" }}
                priority
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: league.primaryColor }}
              >
                {league.name[0]}
              </div>
            )}
          </motion.div>
          <span
            className="font-display text-xl font-bold hidden sm:inline group-hover:tracking-tight transition-all"
            style={{ color: league.primaryColor }}
          >
            {league.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 text-sm font-bold uppercase tracking-wide rounded-md transition-colors",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={
                pathname === link.href
                  ? { backgroundColor: league.primaryColor + '15' }
                  : {}
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth / User Menu */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
                    <AvatarFallback
                      className="text-white text-xs"
                      style={{ backgroundColor: league.primaryColor }}
                    >
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">
                      {profile?.full_name || "Player"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
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
              <Button
                className="text-white"
                style={{ backgroundColor: league.primaryColor }}
                asChild
              >
                <Link href="/register">Join League</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
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
                      <div className="border-t border-border pt-4 mt-4 mb-2 px-2">
                        <div className="flex items-center justify-center mb-2">
                          <ThemeToggle />
                        </div>
                        <p className="font-medium">
                          {profile?.full_name || "Player"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>

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
                      <div className="flex items-center justify-center mb-2">
                        <ThemeToggle />
                      </div>
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/login" onClick={() => setIsOpen(false)}>
                          Sign In
                        </Link>
                      </Button>
                      <Button
                        className="w-full text-white"
                        style={{ backgroundColor: league.primaryColor }}
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
