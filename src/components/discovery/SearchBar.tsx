"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("location", location);

    // Preserve existing filters
    const sport = searchParams.get("sport");
    const distance = searchParams.get("distance");
    if (sport) params.set("sport", sport);
    if (distance) params.set("distance", distance);

    router.push(`/discover?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search leagues by name, sport, or keyword..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        <div className="md:w-64 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="City or postal code"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        <Button type="submit" size="lg" className="md:w-32 bg-blue-600 hover:bg-blue-700">
          Search
        </Button>
      </div>
    </form>
  );
}
