"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useRef } from "react";

/**
 * Day Tabs Component
 *
 * Horizontal scrollable date navigation for schedule view.
 * Shows dates with day names, highlights selected date and today.
 *
 * Based on BMHL UI requirements (web-example1.png)
 * Features:
 * - Horizontal scrollable day list
 * - Left/right navigation arrows
 * - Highlights current day and selected day
 * - Smooth scroll animation
 */

interface DayTabsProps {
  // Array of dates to display
  dates: Date[];

  // Currently selected date
  selectedDate: Date;

  // Callback when date is clicked
  onDateSelect: (date: Date) => void;

  // Optional: Show "Today" label for current date
  showTodayLabel?: boolean;
}

export function DayTabs({
  dates,
  selectedDate,
  onDateSelect,
  showTodayLabel = true,
}: DayTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex items-center gap-2 bg-white border-y border-slate-200 py-3">
      {/* Left Scroll Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={scrollLeft}
        className="shrink-0 h-9 w-9 rounded-full hover:bg-slate-100"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Scrollable Date Tabs */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-2 px-2">
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);

            return (
              <button
                key={date.toISOString()}
                onClick={() => onDateSelect(date)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[80px] px-4 py-2 rounded-lg transition-all border-2",
                  isSelected
                    ? "bg-[var(--league-primary-color)] text-white border-[var(--league-primary-color)] shadow-md"
                    : isToday
                    ? "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                {/* Day of Week */}
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isSelected ? "text-white" : "text-slate-500"
                  )}
                >
                  {format(date, "EEE")}
                </span>

                {/* Date */}
                <span className="text-2xl font-bold mt-1">
                  {format(date, "d")}
                </span>

                {/* Month */}
                <span
                  className={cn(
                    "text-xs font-medium",
                    isSelected ? "text-white" : "text-slate-500"
                  )}
                >
                  {format(date, "MMM")}
                </span>

                {/* Today Label */}
                {showTodayLabel && isToday && !isSelected && (
                  <span className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-wider">
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Scroll Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={scrollRight}
        className="shrink-0 h-9 w-9 rounded-full hover:bg-slate-100"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
