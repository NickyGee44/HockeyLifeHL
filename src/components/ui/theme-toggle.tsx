"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return skeleton during SSR to prevent layout shift
  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="h-5 w-5" />;
    } else if (theme === "dark") {
      return <Moon className="h-5 w-5" />;
    } else {
      return <Monitor className="h-5 w-5" />;
    }
  };

  const getLabel = () => {
    if (theme === "light") {
      return "Switch to dark mode";
    } else if (theme === "dark") {
      return "Switch to system theme";
    } else {
      return "Switch to light mode";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={getLabel()}
      title={getLabel()}
      className="transition-transform hover:scale-110"
    >
      {getIcon()}
    </Button>
  );
}
