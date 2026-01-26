/**
 * Create Product Form Component
 *
 * Allows league admins to create products that can be sold via Stripe.
 * Products are created on the connected account, not the platform account.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, DollarSign } from 'lucide-react';

interface CreateProductFormProps {
  leagueId: string;
  onProductCreated?: () => void;
}

export function CreateProductForm({ leagueId, onProductCreated }: CreateProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  /**
   * Handle form submission
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    const priceValue = parseFloat(price);
    if (!price || isNaN(priceValue) || priceValue < 0.5) {
      setError('Price must be at least $0.50');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Convert dollars to cents
      const priceInCents = Math.round(priceValue * 100);

      const response = await fetch('/api/stripe/connect/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          name: name.trim(),
          description: description.trim() || undefined,
          priceInCents,
          currency: 'usd',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      // Success!
      setSuccess(true);

      // Reset form
      setName('');
      setDescription('');
      setPrice('');

      // Call callback
      onProductCreated?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
        <CardDescription>
          Add a new product that players can purchase (e.g., season registration, team jerseys).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Season Registration, Team Jersey"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Full season registration for Spring 2026"
              maxLength={500}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">
              Price <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0.50"
                step="0.01"
                className="pl-9"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum $0.50 USD
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Product created successfully!
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Product
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Tips for creating products:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Use clear, descriptive names</li>
            <li>• Set competitive prices</li>
            <li>• Add details in the description</li>
            <li>• You can edit products later in Stripe Dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
