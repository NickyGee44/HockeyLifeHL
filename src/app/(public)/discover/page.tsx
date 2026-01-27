import { Suspense } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";
import { FilterPanel } from "@/components/discovery/FilterPanel";
import { LeagueCard, LeagueCardSkeleton, type LeagueCardData } from "@/components/discovery/LeagueCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

// Cache this page for 5 minutes
export const revalidate = 300;

interface DiscoverPageProps {
  searchParams: {
    q?: string;
    location?: string;
    sport?: string;
    distance?: string;
    page?: string;
  };
}

// Mock function - replace with actual server action
async function searchLeagues(params: DiscoverPageProps["searchParams"]) {
  // TODO: Implement actual search using the searchLeagues server action
  // This is a mock implementation for demonstration

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const mockLeagues: LeagueCardData[] = [
    {
      id: "1",
      name: "Toronto Sunday Night Beer League",
      slug: "toronto-sunday",
      sport: "hockey",
      description: "Competitive adult hockey league every Sunday night. All skill levels welcome!",
      logoUrl: "/images/leagues/toronto-logo.png",
      bannerUrl: "/images/leagues/toronto-banner.jpg",
      primaryColor: "#0066CC",
      secondaryColor: "#E31837",
      location: "Toronto, ON",
      distance: 5,
      teamCount: 12,
      playerCount: 180,
      status: "active",
      nextGameDate: "2026-02-01T19:00:00Z",
    },
    {
      id: "2",
      name: "Vancouver Rec Soccer League",
      slug: "vancouver-soccer",
      sport: "soccer",
      description: "Friday night soccer for adults. Co-ed teams, friendly competition.",
      primaryColor: "#00A651",
      secondaryColor: "#FDB913",
      location: "Vancouver, BC",
      distance: 12,
      teamCount: 8,
      playerCount: 120,
      status: "registration_open",
      nextGameDate: "2026-02-05T18:30:00Z",
    },
    {
      id: "3",
      name: "Calgary Drop-In Basketball",
      slug: "calgary-basketball",
      sport: "basketball",
      description: "Weekly basketball games. Drop-in format, no commitment required.",
      primaryColor: "#FF6B35",
      secondaryColor: "#004E89",
      location: "Calgary, AB",
      distance: 8,
      teamCount: 6,
      playerCount: 90,
      status: "active",
    },
    {
      id: "4",
      name: "Montreal Hockey Legends",
      slug: "montreal-legends",
      sport: "hockey",
      description: "For players 40+. Friendly competition and great camaraderie.",
      primaryColor: "#AF1E2D",
      secondaryColor: "#192168",
      location: "Montreal, QC",
      distance: 15,
      teamCount: 10,
      playerCount: 150,
      status: "active",
      nextGameDate: "2026-02-03T20:00:00Z",
    },
  ];

  // Apply filters
  let filteredLeagues = mockLeagues;

  if (params.q) {
    const query = params.q.toLowerCase();
    filteredLeagues = filteredLeagues.filter(
      (league) =>
        league.name.toLowerCase().includes(query) ||
        league.description?.toLowerCase().includes(query) ||
        league.sport.toLowerCase().includes(query)
    );
  }

  if (params.sport && params.sport !== "all") {
    filteredLeagues = filteredLeagues.filter((league) => league.sport === params.sport);
  }

  if (params.distance && params.distance !== "all" && params.location) {
    const maxDistance = parseInt(params.distance);
    filteredLeagues = filteredLeagues.filter(
      (league) => league.distance && league.distance <= maxDistance
    );
  }

  // Pagination
  const page = parseInt(params.page || "1");
  const perPage = 12;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedLeagues = filteredLeagues.slice(start, end);

  return {
    leagues: paginatedLeagues,
    total: filteredLeagues.length,
    page,
    totalPages: Math.ceil(filteredLeagues.length / perPage),
  };
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { leagues, total, page, totalPages } = await searchLeagues(searchParams);

  const hasActiveSearch = searchParams.q || searchParams.location || searchParams.sport || searchParams.distance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Leagues Near You</h1>
            <p className="text-lg md:text-xl text-blue-100">
              Find and join recreational sports leagues in your area
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <Suspense fallback={<div className="h-12 bg-white/20 rounded-lg animate-pulse" />}>
              <SearchBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
              <Suspense fallback={<div className="h-64 bg-white rounded-lg animate-pulse" />}>
                <FilterPanel />
              </Suspense>
            </aside>

            {/* Results */}
            <main className="lg:col-span-3">
              {/* Results Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {total === 0 ? "No leagues found" : `${total} league${total !== 1 ? "s" : ""}`}
                    </h2>
                    {hasActiveSearch && (
                      <p className="text-muted-foreground mt-1">
                        {searchParams.q && `Searching for "${searchParams.q}"`}
                        {searchParams.location && ` near ${searchParams.location}`}
                      </p>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                  )}
                </div>
              </div>

              {/* Results Grid */}
              {total === 0 ? (
                <EmptyState hasActiveSearch={!!hasActiveSearch} />
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {leagues.map((league) => (
                      <LeagueCard key={league.id} league={league} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      searchParams={searchParams}
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ hasActiveSearch }: { hasActiveSearch: boolean }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="mx-auto mb-4 bg-slate-100 p-4 rounded-full w-fit">
          <Search className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {hasActiveSearch ? "No leagues match your search" : "No leagues available"}
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {hasActiveSearch
            ? "Try adjusting your search criteria or filters to find more results."
            : "Check back later or create your own league to get started!"}
        </p>
        {hasActiveSearch && (
          <Button variant="outline" asChild>
            <a href="/discover">Clear filters</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function Pagination({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number;
  totalPages: number;
  searchParams: DiscoverPageProps["searchParams"];
}) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.location) params.set("location", searchParams.location);
    if (searchParams.sport) params.set("sport", searchParams.sport);
    if (searchParams.distance) params.set("distance", searchParams.distance);
    params.set("page", page.toString());
    return `/discover?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={currentPage === 1}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentPage === 1 ? (
          <span>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </span>
        ) : (
          <a href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </a>
        )}
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"}
              size="sm"
              asChild={currentPage !== pageNum}
              disabled={currentPage === pageNum}
              className="w-10"
            >
              {currentPage === pageNum ? (
                <span>{pageNum}</span>
              ) : (
                <a href={createPageUrl(pageNum)}>{pageNum}</a>
              )}
            </Button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        asChild
        disabled={currentPage === totalPages}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentPage === totalPages ? (
          <span>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        ) : (
          <a href={createPageUrl(currentPage + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        )}
      </Button>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="h-12 bg-white/20 rounded-lg animate-pulse mb-8" />
            <div className="h-12 bg-white/20 rounded-lg animate-pulse" />
          </div>
        </div>
      </section>
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 h-64 bg-white rounded-lg animate-pulse" />
            <div className="lg:col-span-3 grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <LeagueCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
