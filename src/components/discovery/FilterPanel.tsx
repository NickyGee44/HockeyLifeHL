"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const SPORTS = [
  { value: "all", label: "All Sports" },
  { value: "hockey", label: "Hockey" },
  { value: "soccer", label: "Soccer" },
  { value: "basketball", label: "Basketball" },
  { value: "baseball", label: "Baseball" },
  { value: "softball", label: "Softball" },
  { value: "volleyball", label: "Volleyball" },
  { value: "other", label: "Other" },
];

const DISTANCES = [
  { value: "all", label: "Any Distance" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
  { value: "50", label: "Within 50 km" },
  { value: "100", label: "Within 100 km" },
];

export function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSport = searchParams.get("sport") || "all";
  const currentDistance = searchParams.get("distance") || "all";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/discover?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    const location = searchParams.get("location");

    if (q) params.set("q", q);
    if (location) params.set("location", location);

    router.push(`/discover?${params.toString()}`);
  };

  const hasActiveFilters = currentSport !== "all" || currentDistance !== "all";

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sport Filter */}
        <div className="space-y-3">
          <Label htmlFor="sport-filter" className="text-sm font-semibold">
            Sport
          </Label>
          <Select value={currentSport} onValueChange={(value) => updateFilter("sport", value)}>
            <SelectTrigger id="sport-filter" className="w-full">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((sport) => (
                <SelectItem key={sport.value} value={sport.value}>
                  {sport.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Distance Filter */}
        <div className="space-y-3">
          <Label htmlFor="distance-filter" className="text-sm font-semibold">
            Distance
          </Label>
          <Select
            value={currentDistance}
            onValueChange={(value) => updateFilter("distance", value)}
          >
            <SelectTrigger id="distance-filter" className="w-full">
              <SelectValue placeholder="Select distance" />
            </SelectTrigger>
            <SelectContent>
              {DISTANCES.map((distance) => (
                <SelectItem key={distance.value} value={distance.value}>
                  {distance.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!searchParams.get("location") && currentDistance !== "all" && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Enter a location in the search bar to use distance filters
            </p>
          )}
        </div>

        <Separator />

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {currentSport !== "all" && (
                <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                  {SPORTS.find((s) => s.value === currentSport)?.label}
                  <button
                    onClick={() => updateFilter("sport", "all")}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {currentDistance !== "all" && (
                <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                  {DISTANCES.find((d) => d.value === currentDistance)?.label}
                  <button
                    onClick={() => updateFilter("distance", "all")}
                    className="hover:text-blue-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
