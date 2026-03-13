'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, Loader2, Search, ShoppingCart, XCircle } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { toast } from 'sonner';
import { purchaseLeagueDomain, searchDomains } from '@/lib/actions/domain';

interface DomainPurchaseCapability {
  searchEnabled: boolean;
  purchaseEnabled: boolean;
  vercelProjectConfigured: boolean;
  message: string | null;
}

interface DomainPurchaseProps {
  leagueId: string;
  capability: DomainPurchaseCapability;
  onPurchase: (domain: string, verified: boolean) => void;
}

type DomainSearchResult = {
  name: string;
  price: number;
  available: boolean;
  premium: boolean;
};

export function DomainPurchase({ leagueId, capability, onPurchase }: DomainPurchaseProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DomainSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [purchasingDomain, setPurchasingDomain] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!capability.purchaseEnabled || !query.trim() || query.trim().length < 2) {
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
        return;
      }

      setResults(result.data ?? []);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [capability.purchaseEnabled, query]);

  const handlePurchase = async (domain: string) => {
    setPurchasingDomain(domain);
    try {
      const result = await purchaseLeagueDomain(leagueId, domain);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || `${domain} is ready to use.`);
      onPurchase(domain, Boolean(result.verified));
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setPurchasingDomain(null);
    }
  };

  if (!capability.purchaseEnabled) {
    return (
      <Card className="bg-neutral-800/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-neutral-100 flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-rink-500" />
            Search &amp; Buy a Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">
            {capability.message || 'Domain purchase is not available right now. You can still connect a domain you already own.'}
          </p>
        </CardContent>
      </Card>
    );
  }

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
          placeholder="Search domains (e.g. barriemenshockey)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
            {results.map((result) => (
              <div
                key={result.name}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-lg border',
                  result.available
                    ? 'bg-neutral-900/50 border-white/10'
                    : 'bg-neutral-900/20 border-white/5 opacity-60'
                )}
              >
                <div className="flex items-center gap-3">
                  {result.available ? (
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-500 shrink-0" />
                  )}
                  <span className="font-mono text-sm text-neutral-100">{result.name}</span>
                  {result.premium && (
                    <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
                      Premium
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {result.price > 0 && (
                    <span className="text-sm text-neutral-400">${result.price}/yr</span>
                  )}
                  {result.available ? (
                    <Button
                      size="sm"
                      onClick={() => handlePurchase(result.name)}
                      disabled={purchasingDomain !== null}
                      className="bg-rink-500 hover:bg-rink-600 text-black font-medium"
                    >
                      {purchasingDomain === result.name ? (
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

        {!isSearching && !searchError && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm text-neutral-500">No domains found for &quot;{query}&quot;.</p>
        )}

        <div className="space-y-1 text-xs text-neutral-500">
          <p>If the purchase succeeds, BLH still verifies the domain/project attachment before marking it as fully connected.</p>
          <p>Bring-your-own-domain remains available if you would rather manage the registration yourself.</p>
        </div>
      </CardContent>
    </Card>
  );
}
