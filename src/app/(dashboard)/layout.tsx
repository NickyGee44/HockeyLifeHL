"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth/actions";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

const sidebarNav = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: "📊",
  },
  {
    title: "My Team",
    href: "/dashboard/team",
    icon: "🏒",
  },
  {
    title: "My Stats",
    href: "/dashboard/stats",
    icon: "📈",
  },
  {
    title: "Schedule",
    href: "/dashboard/schedule",
    icon: "📅",
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: "👤",
  },
];

const captainNav = [
  {
    title: "Team Management",
    href: "/captain/team",
    icon: "👥",
  },
  {
    title: "Enter Stats",
    href: "/captain/stats",
    icon: "✏️",
  },
  {
    title: "Draft Board",
    href: "/captain/draft",
    icon: "🎯",
  },
];

const adminNav = [
  {
    title: "League Dashboard",
    href: "/admin",
    icon: "👑",
  },
  {
    title: "Manage Teams",
    href: "/admin/teams",
    icon: "🏆",
  },
  {
    title: "Manage Players",
    href: "/admin/players",
    icon: "⛸️",
  },
  {
    title: "Manage Games",
    href: "/admin/games",
    icon: "🎮",
  },
  {
    title: "Seasons",
    href: "/admin/seasons",
    icon: "📆",
  },
  {
    title: "Suspensions",
    href: "/admin/suspensions",
    icon: "🚫",
  },
  {
    title: "Articles",
    href: "/admin/articles",
    icon: "✍️",
  },
  {
    title: "Payments",
    href: "/admin/payments",
    icon: "💳",
  },
];

function SidebarContent({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const { profile, loading, isOwner, isCaptain } = useAuth();

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
    return "??";
  };

  const getRoleLabel = () => {
    if (isOwner) return "League Owner";
    if (isCaptain) return "Team Captain";
    return "Player";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("p-6", isCollapsed && "px-3")}>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="HockeyLifeHL"
            width={32}
            height={32}
            className="h-8 w-auto"
            style={{ width: "auto", height: "2rem" }}
            priority
          />
          {!isCollapsed && (
            <span className="font-display text-xl font-bold text-gradient-canada">
              HockeyLifeHL
            </span>
          )}
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <div className={cn("flex-1 overflow-hidden py-4", isCollapsed ? "px-2" : "px-4")}>
        <ScrollArea className="h-full">
        <div className="space-y-6">
          {/* Show only relevant dashboard based on current route */}
          {pathname.startsWith("/admin") && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  👑 League Owner
                </h3>
              )}
              <nav className="space-y-1">
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      pathname === item.href || pathname.startsWith(item.href + "/")
                        ? "bg-gold text-puck-black font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {pathname.startsWith("/captain") && (isCaptain || isOwner) && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  🏒 Team Captain
                </h3>
              )}
              <nav className="space-y-1">
                <Link
                  href="/captain"
                  className={cn(
                    "flex items-center rounded-lg text-sm transition-colors",
                    isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    pathname === "/captain"
                      ? "bg-canada-red text-white font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={isCollapsed ? "Captain Dashboard" : undefined}
                >
                  <span className="text-lg">🏠</span>
                  {!isCollapsed && <span>Captain Dashboard</span>}
                </Link>
                {captainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      pathname === item.href || pathname.startsWith(item.href + "/")
                        ? "bg-canada-red text-white font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {!pathname.startsWith("/admin") && !pathname.startsWith("/captain") && (
            <div>
              {!isCollapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ⛸️ Player Dashboard
                </h3>
              )}
              <nav className="space-y-1">
                {sidebarNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-lg text-sm transition-colors",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      pathname === item.href || pathname.startsWith(item.href + "/")
                        ? "bg-rink-blue text-white font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Dashboard Switcher */}
          {(isOwner || isCaptain) && (
            <div className="pt-4 border-t">
              {!isCollapsed && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Switch Dashboard
                </h3>
              )}
              <nav className="space-y-1">
                {!pathname.startsWith("/admin") && isOwner && (
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
                    )}
                    title={isCollapsed ? "League Admin" : undefined}
                  >
                    <span className="text-lg">👑</span>
                    {!isCollapsed && <span>League Admin</span>}
                  </Link>
                )}
                {!pathname.startsWith("/captain") && (isCaptain || isOwner) && (
                  <Link
                    href="/captain"
                    className={cn(
                      "flex items-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
                    )}
                    title={isCollapsed ? "Captain Dashboard" : undefined}
                  >
                    <span className="text-lg">🏒</span>
                    {!isCollapsed && <span>Captain Dashboard</span>}
                  </Link>
                )}
                {!pathname.startsWith("/dashboard") && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      "flex items-center rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"
                    )}
                    title={isCollapsed ? "Player Dashboard" : undefined}
                  >
                    <span className="text-lg">⛸️</span>
                    {!isCollapsed && <span>Player Dashboard</span>}
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* User */}
      <div className={cn("p-4", isCollapsed && "px-2")}>
        {loading ? (
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
            <Skeleton className="h-10 w-10 rounded-full" />
            {!isCollapsed && (
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn("flex flex-col items-center gap-2", isCollapsed ? "" : "flex-row gap-3")}>
            <Avatar>
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-canada-red text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || "Player"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {getRoleLabel()}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className={isCollapsed ? "w-full" : ""}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-card transition-all duration-300",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        {/* Collapse Toggle Button */}
        <div className="absolute -right-3 top-20 z-10">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-background border shadow-md hover:bg-muted"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 transition-all duration-300", isCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background px-4">
          <Sheet>
            <SheetTrigger asChild>
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
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent isCollapsed={false} />
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="HockeyLifeHL"
              width={24}
              height={24}
              className="h-6 w-auto"
              style={{ width: "auto", height: "1.5rem" }}
              priority
            />
            <span className="font-display text-lg font-bold">HockeyLifeHL</span>
          </Link>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
