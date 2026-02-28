'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import { searchDomains, purchaseDomain } from '@/lib/actions/domain';
import type { DomainSearchResult } from '@/lib/actions/domain';

interface DomainPurchaseProps {
  organizationId: string;
  onPurchase: (domain: string) => void;
}

export function DomainPurchase({ organizationId, onPurchase }: DomainPurchaseProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DomainSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [purchasingDomain, setPurchasingDomain] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      const result = await searchDomains(query.trim());
      setIsSearching(false);
      if (result.error) {
        setSearchError(result.error);
        setResults([]);
      } else {
        setResults(result.data ?? []);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handlePurchase = async (domain: string) => {
    setPurchasingDomain(domain);
    try {
      const result = await purchaseDomain(organizationId, domain);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Domain ${domain} purchased and configured!`);
        onPurchase(domain);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setPurchasingDomain(null);
    }
  };

  return (
    <Card className="bg-neutral-800/50 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-neutral-100 flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-rink-500" />
          Search &amp; Buy a Domain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search domains (e.g. mylocalleague)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-black/50 border-rink-500/30 text-neutral-100 placeholder-neutral-500 focus-visible:ring-rink-500/50"
        />

        {isSearching && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching domains...
          </div>
        )}

        {searchError && <p className="text-sm text-red-400">{searchError}</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.name}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  r.available
                    ? 'bg-neutral-900/50 border-white/10'
                    : 'bg-neutral-900/20 border-white/5 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  {r.available ? (
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                  )}
                  <span className="font-mono text-sm text-neutral-100">{r.name}</span>
                  {r.premium && (
                    <Badge
                      variant="outline"
                      className="text-xs border-yellow-500/50 text-yellow-400"
                    >
                      Premium
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {r.price > 0 && (
                    <span className="text-sm text-neutral-400">${r.price}/yr</span>
                  )}
                  {r.available ? (
                    <Button
                      size="sm"
                      onClick={() => handlePurchase(r.name)}
                      disabled={purchasingDomain !== null}
                      className="bg-rink-500 hover:bg-rink-600 text-black font-medium"
                    >
                      {purchasingDomain === r.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Buy
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-neutral-500">Taken</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearching &&
          !searchError &&
          query.trim().length >= 2 &&
          results.length === 0 && (
            <p className="text-sm text-neutral-500">
              No domains found for &quot;{query}&quot;.
            </p>
          )}

        <p className="text-xs text-neutral-500">
          Domains purchased at-cost (~$15/yr .ca, ~$20/yr .com). No markup. Vercel manages DNS automatically.
        </p>
      </CardContent>
    </Card>
  );
}
