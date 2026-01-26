"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeagueStatusBadge } from "./LeagueStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface League {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  updated_at: string;
  sport: string;
  stats?: {
    members: number;
    teams: number;
    games: number;
  };
}

interface LeagueTableProps {
  leagues: League[];
}

type SortField = 'name' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

/**
 * Sortable and filterable table of leagues
 * Used in admin leagues overview page
 */
export function LeagueTable({ leagues }: LeagueTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter leagues
  const filteredLeagues = leagues.filter((league) => {
    const matchesSearch = league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         league.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || league.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort leagues
  const sortedLeagues = [...filteredLeagues].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search leagues by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedLeagues.length} of {leagues.length} leagues
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon field="name" />
              </TableHead>
              <TableHead>Domain</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Games</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                Created <SortIcon field="created_at" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeagues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No leagues found
                </TableCell>
              </TableRow>
            ) : (
              sortedLeagues.map((league) => (
                <TableRow key={league.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/leagues/${league.id}`}
                      className="hover:underline"
                    >
                      {league.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{league.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {league.custom_domain ? (
                        <div>
                          <div className="font-medium">{league.custom_domain}</div>
                          {league.custom_domain_verified && (
                            <div className="text-xs text-green-600">✓ Verified</div>
                          )}
                          {!league.custom_domain_verified && (
                            <div className="text-xs text-yellow-600">⏳ Pending</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          {league.subdomain}.beerleaguehockey.ca
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <LeagueStatusBadge status={league.status} />
                  </TableCell>
                  <TableCell>{league.stats?.members || 0}</TableCell>
                  <TableCell>{league.stats?.teams || 0}</TableCell>
                  <TableCell>{league.stats?.games || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(league.created_at).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/leagues/${league.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
