/**
 * Storefront Component
 *
 * Displays products from a connected account and allows customers to purchase them.
 * This is a public-facing page that anyone can access.
 *
 * NOTE: In production, you should use a more meaningful identifier than leagueId
 * in the URL (e.g., league slug, custom domain, etc.)
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  priceId: string;
  priceInCents: number;
  currency: string;
  formattedPrice: string;
}

interface StorefrontProps {
  leagueId: string;
}

export function Storefront({ leagueId }: StorefrontProps) {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [leagueId]);

  /**
   * Load products from the connected account
   */
  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stripe/connect/list-products?leagueId=${leagueId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load products');
      }

      setProducts(data.products || []);
      setLeagueName(data.leagueName || 'League');
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle product purchase
   * Creates a Stripe Checkout session and redirects to Stripe
   */
  async function handlePurchase(product: Product) {
    try {
      setPurchasing(product.id);
      setError(null);

      const response = await fetch('/api/stripe/connect/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          priceId: product.priceId,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (err) {
      console.error('Error creating checkout:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setPurchasing(null);
    }
  }

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Unable to Load Products</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button onClick={loadProducts} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
        <p className="text-muted-foreground max-w-md">
          This league hasn't added any products yet. Check back later!
        </p>
      </div>
    );
  }

  /**
   * Render products
   */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{leagueName} Store</h1>
        <p className="text-muted-foreground">
          Purchase league products and registrations
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="line-clamp-2">{product.name}</CardTitle>
              {product.description && (
                <CardDescription className="line-clamp-3">
                  {product.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4 mt-auto">
              {/* Price */}
              <div className="text-3xl font-bold text-primary">
                {product.formattedPrice}
              </div>

              {/* Purchase Button */}
              <Button
                onClick={() => handlePurchase(product)}
                disabled={purchasing === product.id}
                size="lg"
                className="w-full"
              >
                {purchasing === product.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Purchase
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          Secure checkout powered by{' '}
          <a
            href="https://stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Stripe
          </a>
        </p>
        <p className="mt-1">
          All payments are processed securely. Your payment information is never stored on our servers.
        </p>
      </div>
    </div>
  );
}
