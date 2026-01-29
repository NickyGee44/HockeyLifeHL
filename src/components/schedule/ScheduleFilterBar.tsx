"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

/**
 * Schedule Filter Bar Component
 *
 * Provides filtering controls for the schedule view:
 * - Division filter
 * - Team filter
 * - Venue filter
 * - Clear all filters button
 *
 * Based on BMHL UI requirements (web-example1.png)
 * Filters update URL params for shareable links
 */

interface ScheduleFilterBarProps {
  // Current filter values
  selectedDivision?: string;
  selectedTeam?: string;
  selectedVenue?: string;

  // Available filter options
  divisions: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
  venues: Array<{ id: string; name: string }>;

  // Filter change handlers
  onDivisionChange: (divisionId: string | undefined) => void;
  onTeamChange: (teamId: string | undefined) => void;
  onVenueChange: (venueId: string | undefined) => void;
  onClearFilters: () => void;

  // Show active filter count
  activeFilterCount?: number;
}

export function ScheduleFilterBar({
  selectedDivision,
  selectedTeam,
  selectedVenue,
  divisions,
  teams,
  venues,
  onDivisionChange,
  onTeamChange,
  onVenueChange,
  onClearFilters,
  activeFilterCount = 0,
}: ScheduleFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
      {/* Division Filter */}
      <div className="flex-1 min-w-[200px]">
        <Select
          value={selectedDivision}
          onValueChange={(value) => onDivisionChange(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Divisions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((division) => (
              <SelectItem key={division.id} value={division.id}>
                {division.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Filter */}
      <div className="flex-1 min-w-[200px]">
        <Select
          value={selectedTeam}
          onValueChange={(value) => onTeamChange(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Venue Filter */}
      <div className="flex-1 min-w-[200px]">
        <Select
          value={selectedVenue}
          onValueChange={(value) => onVenueChange(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="All Venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Venues</SelectItem>
            {venues.map((venue) => (
              <SelectItem key={venue.id} value={venue.id}>
                {venue.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          onClick={onClearFilters}
          className="whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="h-4 w-4 mr-2" />
          Clear {activeFilterCount > 1 ? "Filters" : "Filter"}
        </Button>
      )}
    </div>
  );
}
