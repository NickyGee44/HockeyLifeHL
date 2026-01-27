# Venue Management System

Production-grade venue management for multi-tenant hockey league platform.

## Overview

The venue management system provides CRUD operations for ice rinks and arenas where games are played. It enforces strict multi-tenant isolation, input validation, and authorization controls.

## Architecture

### Domain Invariants

1. **Venue names must be unique within a league** (enforced by `UNIQUE(league_id, name)` constraint)
2. **Only league owners/admins can create/update/delete venues** (enforced by authorization and RLS)
3. **All league members can view venues** (enforced by RLS policy)
4. **Venues belong to exactly one league** (enforced by `NOT NULL` constraint on `league_id`)
5. **RLS policies provide defense-in-depth** (tenant isolation guaranteed even if application code fails)

### Database Schema

```sql
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Venue Information
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',

  -- Contact
  phone TEXT,
  website TEXT,

  -- Facilities
  number_of_rinks INTEGER DEFAULT 1,
  parking_info TEXT,
  amenities TEXT[], -- Array: ['WiFi', 'Locker Rooms', 'Parking', ...]

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(league_id, name),
  CHECK (number_of_rinks >= 1 AND number_of_rinks <= 10),
  CHECK (phone IS NULL OR char_length(phone) BETWEEN 10 AND 20),
  CHECK (website IS NULL OR website ~* '^https?://')
);

-- RLS Policies
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view venues in their leagues"
  ON venues FOR SELECT
  USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "League owners/admins can manage venues"
  ON venues FOR ALL
  USING (league_id IN (
    SELECT league_id FROM league_memberships
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ));
```

### Indexes

```sql
-- Primary tenant isolation
CREATE INDEX idx_venues_league_id ON venues(league_id);

-- Case-insensitive name lookups
CREATE INDEX idx_venues_league_name_lower ON venues(league_id, LOWER(name));

-- City/state filtering
CREATE INDEX idx_venues_league_city_state ON venues(league_id, city, state_province)
  WHERE city IS NOT NULL;

-- Amenities search (GIN index for array containment)
CREATE INDEX idx_venues_amenities ON venues USING GIN(amenities)
  WHERE amenities IS NOT NULL;
```

## API Reference

### Server Actions

All actions are located in `src/lib/venues/actions.ts`.

#### `getAllVenues()`

Fetch all venues for the active league.

**Authorization:** Any authenticated league member

**Returns:**
```typescript
Promise<{
  error?: string;
  venues: Venue[];
}>
```

**Example:**
```typescript
const { venues, error } = await getAllVenues();
if (error) {
  console.error(error);
  return;
}

console.log(`Found ${venues.length} venues`);
venues.forEach(v => console.log(`- ${v.name} (${v.city})`));
```

---

#### `getVenueById(venueId: string)`

Fetch a single venue by ID.

**Authorization:** Any authenticated league member

**Security:** Verifies venue belongs to user's active league

**Returns:**
```typescript
Promise<{
  error?: string;
  venue: Venue | null;
}>
```

**Example:**
```typescript
const { venue, error } = await getVenueById('venue-uuid');
if (error) {
  console.error(error);
  return;
}

console.log(`Venue: ${venue.name}`);
console.log(`Address: ${venue.address}, ${venue.city}`);
console.log(`Amenities: ${venue.amenities?.join(', ')}`);
```

---

#### `createVenue(formData: FormData)`

Create a new venue.

**Authorization:** League owner or admin only

**Form Fields:**
- `name` (required): Venue name, 3-100 characters
- `address` (optional): Street address
- `city` (optional): City
- `stateProvince` (optional): State or province
- `postalCode` (optional): ZIP or postal code
- `country` (optional, default: "USA"): Country
- `phone` (optional): Phone number (validated format)
- `website` (optional): Website URL (must be http/https)
- `numberOfRinks` (optional, default: "1"): Number of ice rinks (1-10)
- `parkingInfo` (optional): Parking instructions
- `amenities` (optional, multiple): Array of amenity strings
- `amenitiesJson` (optional): JSON string of amenities array

**Validation:**
- Name: 3-100 characters, required
- Phone: 10-20 characters, format validated
- Website: Must start with `http://` or `https://`
- Number of rinks: 1-10
- All text inputs are HTML-sanitized

**Returns:**
```typescript
Promise<{
  error?: string;
  success?: boolean;
  venue?: Venue;
}>
```

**Example:**
```typescript
const formData = new FormData();
formData.set('name', 'Scotiabank Arena');
formData.set('address', '40 Bay Street');
formData.set('city', 'Toronto');
formData.set('stateProvince', 'ON');
formData.set('postalCode', 'M5J 2X2');
formData.set('country', 'Canada');
formData.set('phone', '(416) 815-5500');
formData.set('website', 'https://www.scotiabankarena.com');
formData.set('numberOfRinks', '1');
formData.append('amenities', 'Locker Rooms');
formData.append('amenities', 'Parking');
formData.append('amenities', 'Concessions');
formData.append('amenities', 'Pro Shop');

const result = await createVenue(formData);
if (result.error) {
  console.error(result.error);
  return;
}

console.log(`Venue created: ${result.venue.name}`);
```

---

#### `updateVenue(venueId: string, formData: FormData)`

Update an existing venue.

**Authorization:** League owner or admin only

**Security:** Verifies venue belongs to user's league before update

**Form Fields:** Same as `createVenue()`

**Returns:**
```typescript
Promise<{
  error?: string;
  success?: boolean;
  venue?: Venue;
}>
```

**Example:**
```typescript
const formData = new FormData();
formData.set('name', 'Updated Arena Name');
formData.set('phone', '(555) 123-4567');

const result = await updateVenue('venue-uuid', formData);
if (result.error) {
  console.error(result.error);
  return;
}

console.log(`Venue updated: ${result.venue.name}`);
```

---

#### `deleteVenue(venueId: string)`

Delete a venue.

**Authorization:** League owner or admin only

**Security:**
- Verifies venue belongs to user's league before deletion
- Checks if venue is referenced by games (prevents orphaned data)

**Returns:**
```typescript
Promise<{
  error?: string;
  success?: boolean;
}>
```

**Example:**
```typescript
const result = await deleteVenue('venue-uuid');
if (result.error) {
  console.error(result.error);
  return;
}

console.log('Venue deleted successfully');
```

---

#### `getVenuesWithStats()`

Fetch venues with game count statistics.

**Authorization:** League owner or admin

**Returns:**
```typescript
Promise<{
  error?: string;
  venues: Array<Venue & { game_count?: number }>;
}>
```

**Example:**
```typescript
const { venues, error } = await getVenuesWithStats();
if (error) {
  console.error(error);
  return;
}

venues.forEach(v => {
  console.log(`${v.name}: ${v.game_count || 0} games`);
});
```

---

### Common Amenities Constant

Predefined list of common amenities for UI dropdowns/checkboxes:

```typescript
export const COMMON_AMENITIES = [
  "Locker Rooms",
  "Parking",
  "Concessions",
  "Pro Shop",
  "Viewing Area",
  "WiFi",
  "Heated Locker Rooms",
  "Skate Sharpening",
  "Equipment Rental",
  "Restaurant/Bar",
] as const;
```

## Input Validation

All text inputs are sanitized using the following utilities from `@/lib/input-sanitization`:

- `stripHtml()`: Removes HTML tags to prevent XSS
- `sanitizePhone()`: Validates and normalizes phone numbers
- `sanitizeUrl()`: Validates URLs and blocks dangerous protocols (javascript:, data:)
- `sanitizeText()`: Sanitizes multi-line text, limits length

### Phone Number Validation

Accepts common formats:
- `(555) 123-4567`
- `555-123-4567`
- `+1 555 123 4567`
- `5551234567`

Must be 10-15 digits (excluding formatting characters).

### Website URL Validation

- Must start with `http://` or `https://`
- Blocks dangerous protocols (`javascript:`, `data:`, etc.)
- Returns `null` if invalid

## Error Handling

### Common Errors

| Error Message | Cause | Resolution |
|--------------|-------|------------|
| `Venue name must be at least 3 characters` | Name too short | Provide longer name |
| `Venue name cannot exceed 100 characters` | Name too long | Shorten name |
| `A venue with this name already exists in your league` | Duplicate name | Choose different name |
| `Invalid phone number format` | Phone format invalid | Use format like (555) 123-4567 |
| `Invalid website URL` | URL format invalid | Use http:// or https:// prefix |
| `Number of rinks must be between 1 and 10` | Invalid rink count | Adjust to valid range |
| `Venue not found or does not belong to your league` | Unauthorized access | Verify venue ID and league membership |
| `Cannot delete venue because it is used by games` | Foreign key reference | Delete or update games first |
| `Not authenticated` | User not logged in | Redirect to login |
| `No active league selected` | No active league context | Select a league |
| `Unauthorized - requires owner or admin` | Insufficient permissions | Contact league owner/admin |

### Error Codes

PostgreSQL error codes handled:
- `23505` (unique_violation): Duplicate venue name
- `23503` (foreign_key_violation): Venue referenced by games

## Multi-Tenant Isolation

All queries are scoped by `league_id` to enforce tenant isolation:

1. **Application-level filtering**: All queries include `.eq('league_id', leagueId)`
2. **Row Level Security (RLS)**: Database policies enforce league membership check
3. **Authorization checks**: `requireLeagueRole()` verifies user's role before allowing operations

### Defense-in-Depth

Even if application code has a bug, RLS policies guarantee:
- Users can only see venues from leagues they're members of
- Users can only modify venues if they're owners/admins of that league

## Cache Invalidation

After mutations (create/update/delete), the following routes are revalidated:

- `/admin/venues` - Admin venue management page
- `/venues` - Public venue listing
- `/venues/[id]` - Individual venue page (for updates)
- `/games` - Games page (venues displayed in game details)

## Performance

### Query Patterns

1. **List all venues for a league**: Uses `idx_venues_league_id` index
   - Complexity: O(log n) + O(k) where k = venues in league
   - Expected: <10ms for 100 venues

2. **Get single venue**: Uses primary key + league_id filter
   - Complexity: O(log n)
   - Expected: <5ms

3. **Check duplicate name**: Uses `idx_venues_league_name_lower` index
   - Complexity: O(log n)
   - Expected: <5ms

4. **Search by amenities**: Uses GIN index `idx_venues_amenities`
   - Complexity: O(log n) for index lookup
   - Expected: <10ms

### Caching Strategy

- **Server-side**: Next.js automatic caching with `revalidatePath()`
- **Client-side**: Use SWR or React Query with 5-minute stale time
- **Static generation**: Consider ISR for public venue listings

## Integration Points

### Games Table

Current implementation:
- Games table has `location TEXT` field
- No foreign key constraint to venues

**Future enhancement:**
```sql
-- Add venue_id foreign key to games table
ALTER TABLE games ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Migrate existing data
UPDATE games SET venue_id = (
  SELECT id FROM venues
  WHERE venues.league_id = games.league_id
    AND LOWER(venues.name) = LOWER(games.location)
  LIMIT 1
);

-- Create index
CREATE INDEX idx_games_venue_id ON games(venue_id);
```

### UI Components (to be implemented)

- `VenueForm`: Create/edit venue form with validation
- `VenueList`: Paginated venue listing with search
- `VenueCard`: Display venue details with amenities
- `VenueSelector`: Dropdown for game creation

## Testing

See `__tests__/actions.test.ts` for comprehensive test suite covering:

- Input validation
- Multi-tenant isolation
- Authorization checks
- Error handling
- Database constraints
- Amenities handling
- Cache invalidation

## Monitoring

Key metrics to track:

1. **Venue CRUD operation counts** (by league)
2. **Error rates** (unique violations, unauthorized access)
3. **RLS policy execution time** (should be <10ms)
4. **Duplicate name collision rate**

## Security Considerations

1. **XSS Prevention**: All text inputs are HTML-sanitized
2. **SQL Injection**: Prevented by parameterized queries (Supabase client)
3. **CSRF**: Protected by Next.js server actions
4. **Authorization**: Enforced at both application and database (RLS) levels
5. **Tenant Isolation**: Guaranteed by RLS policies

## Migration History

- `20260125_create_core_multi_tenant_tables.sql`: Initial venues table creation
- `20260127_enhance_venues_table.sql`: Add constraints, indexes, and helper functions

## Future Enhancements

1. **Venue availability/booking system**
   - Track rink availability by time slot
   - Prevent double-booking conflicts

2. **Venue photos/images**
   - Add `images TEXT[]` column for Supabase Storage URLs
   - Display gallery in venue details

3. **Venue ratings/reviews**
   - Allow players to rate venues
   - Track facility quality metrics

4. **Geographic search**
   - Add latitude/longitude columns
   - Implement "find venues near me" feature

5. **Venue capacity tracking**
   - Track spectator capacity
   - Implement waitlist for sold-out games

6. **Integration with scheduling**
   - Check venue availability when scheduling games
   - Auto-suggest available time slots

## Support

For issues or questions, contact the development team or file an issue in the project repository.
