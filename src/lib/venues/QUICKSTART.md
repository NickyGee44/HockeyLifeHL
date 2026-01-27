# Venue Management Quick Start

Get started with the venue management system in 5 minutes.

## Step 1: Run the Migration

```bash
cd D:/B3/dev/HockeyLeague/HockeyLifeHL

# Apply the venue enhancements migration
npx supabase migration up --local
npx supabase db push
```

## Step 2: Import the Actions

```typescript
import {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  COMMON_AMENITIES,
} from '@/lib/venues/actions';
```

## Step 3: Use in Your Components

### List All Venues (Server Component)

```typescript
// app/admin/venues/page.tsx
import { getAllVenues } from '@/lib/venues/actions';

export default async function VenuesPage() {
  const { venues, error } = await getAllVenues();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Venues ({venues.length})</h1>
      <ul>
        {venues.map(venue => (
          <li key={venue.id}>
            {venue.name} - {venue.city}, {venue.state_province}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Create Venue Form (Server Action)

```typescript
// app/admin/venues/new/page.tsx
import { createVenue, COMMON_AMENITIES } from '@/lib/venues/actions';
import { redirect } from 'next/navigation';

async function handleSubmit(formData: FormData) {
  'use server';

  const result = await createVenue(formData);

  if (result.error) {
    // Handle error (you'd want to use a state management solution)
    console.error(result.error);
    return;
  }

  redirect('/admin/venues');
}

export default function NewVenuePage() {
  return (
    <form action={handleSubmit}>
      <input type="text" name="name" required placeholder="Venue Name" />
      <input type="text" name="address" placeholder="Address" />
      <input type="text" name="city" placeholder="City" />
      <input type="text" name="stateProvince" placeholder="State/Province" />
      <input type="text" name="phone" placeholder="(555) 123-4567" />
      <input type="url" name="website" placeholder="https://example.com" />

      <h3>Amenities</h3>
      {COMMON_AMENITIES.map(amenity => (
        <label key={amenity}>
          <input type="checkbox" name="amenities" value={amenity} />
          {amenity}
        </label>
      ))}

      <button type="submit">Create Venue</button>
    </form>
  );
}
```

### Update Venue

```typescript
// app/admin/venues/[id]/edit/page.tsx
import { getVenueById, updateVenue } from '@/lib/venues/actions';
import { redirect } from 'next/navigation';

export default async function EditVenuePage({ params }: { params: { id: string } }) {
  const { venue, error } = await getVenueById(params.id);

  if (error || !venue) {
    return <div>Venue not found</div>;
  }

  async function handleUpdate(formData: FormData) {
    'use server';

    const result = await updateVenue(params.id, formData);

    if (result.error) {
      console.error(result.error);
      return;
    }

    redirect('/admin/venues');
  }

  return (
    <form action={handleUpdate}>
      <input type="text" name="name" defaultValue={venue.name} required />
      <input type="text" name="address" defaultValue={venue.address || ''} />
      <input type="text" name="city" defaultValue={venue.city || ''} />
      {/* ... other fields ... */}

      <button type="submit">Update Venue</button>
    </form>
  );
}
```

### Delete Venue

```typescript
import { deleteVenue } from '@/lib/venues/actions';

async function handleDelete(venueId: string) {
  'use server';

  const result = await deleteVenue(venueId);

  if (result.error) {
    // Handle error
    console.error(result.error);
    return;
  }

  // Success - venue deleted
  redirect('/admin/venues');
}
```

## Common Patterns

### Venue Selector for Game Creation

```typescript
// components/VenueSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import { getAllVenues } from '@/lib/venues/actions';
import type { Venue } from '@/types/database';

export function VenueSelector({ onChange }: { onChange: (venue: Venue | null) => void }) {
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    getAllVenues().then(({ venues }) => setVenues(venues || []));
  }, []);

  return (
    <select onChange={(e) => {
      const venue = venues.find(v => v.id === e.target.value) || null;
      onChange(venue);
    }}>
      <option value="">Select a venue...</option>
      {venues.map(venue => (
        <option key={venue.id} value={venue.id}>
          {venue.name} - {venue.city}
        </option>
      ))}
    </select>
  );
}
```

### Error Handling

```typescript
const result = await createVenue(formData);

if (result.error) {
  // Handle specific errors
  if (result.error.includes('already exists')) {
    // Show duplicate name error
  } else if (result.error.includes('Unauthorized')) {
    // Show permission error
  } else if (result.error.includes('Invalid phone')) {
    // Show phone validation error
  } else {
    // Generic error
  }
}
```

### Using with React Hook Form

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { createVenue } from '@/lib/venues/actions';
import { useRouter } from 'next/navigation';

export function VenueForm() {
  const { register, handleSubmit } = useForm();
  const router = useRouter();

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => formData.append(key, v));
      } else {
        formData.set(key, value as string);
      }
    });

    const result = await createVenue(formData);

    if (result.error) {
      alert(result.error);
      return;
    }

    router.push('/admin/venues');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} />
      {/* ... */}
    </form>
  );
}
```

## Validation Rules Reference

Quick reference for form validation:

```typescript
// Name
minLength: 3
maxLength: 100
required: true

// Phone (optional)
pattern: /^\+?\d{10,15}$/  // After removing formatting
formats: "(555) 123-4567", "555-123-4567", "+1 555 123 4567"

// Website (optional)
pattern: /^https?:\/\//
example: "https://example.com"

// Number of Rinks
min: 1
max: 10
default: 1
```

## Authorization Quick Check

```typescript
// Who can do what?
const permissions = {
  view: ['owner', 'admin', 'captain', 'scorekeeper', 'player'],
  create: ['owner', 'admin'],
  update: ['owner', 'admin'],
  delete: ['owner', 'admin'],
};
```

## Need Help?

- 📖 **Full Documentation:** `src/lib/venues/README.md`
- 💡 **Examples:** `src/lib/venues/examples.ts`
- 🧪 **Tests:** `src/lib/venues/__tests__/actions.test.ts`
- 📊 **Summary:** `VENUE_IMPLEMENTATION_SUMMARY.md`

## Common Issues

### "Venue not found or does not belong to your league"

**Cause:** Trying to access venue from different league
**Fix:** Verify you're in the correct league context

### "A venue with this name already exists"

**Cause:** Duplicate venue name within league
**Fix:** Choose a different name or update the existing venue

### "Cannot delete venue because it is used by games"

**Cause:** Venue is referenced by existing games
**Fix:** Update or delete those games first

### "Unauthorized - requires owner or admin"

**Cause:** Insufficient permissions
**Fix:** You need owner or admin role to create/update/delete venues

## What's Next?

1. Build your UI components using the examples above
2. Customize the amenities list in `COMMON_AMENITIES`
3. Add search/filter functionality
4. Integrate with game creation workflow
5. Add venue statistics to admin dashboard

Happy coding! 🏒
