# Utility Scripts

This directory contains administrative and debugging scripts for managing the Hockey League platform.

## User Management Scripts

### `list-all-users.mjs`
Lists all users in the system with their confirmation status.

```bash
node scripts/list-all-users.mjs
```

**Output:**
- User email
- Email confirmation status (✅/❌)
- Last sign-in date
- Summary statistics

### `check-user-profile.mjs`
Checks a specific user's profile and league memberships.

```bash
node scripts/check-user-profile.mjs <email>

# Example:
node scripts/check-user-profile.mjs user@example.com
```

**Output:**
- Auth record details
- Profile data (name, jersey, position, skill level, etc.)
- League memberships
- Free agent status

### `confirm-user-email.mjs`
Manually confirms a user's email (bypasses email verification).

```bash
node scripts/confirm-user-email.mjs <email>

# Example:
node scripts/confirm-user-email.mjs user@example.com
```

**Use cases:**
- Email delivery issues during development
- SMTP not configured yet
- Manual user account activation

### `manually-confirm-email.mjs` *(Legacy)*
Original email confirmation script using Supabase client.
**Prefer using `confirm-user-email.mjs` instead** (more robust).

## Database Management Scripts

### `create-signup-function-simple.mjs`
Creates the `add_user_to_league_on_signup` database function for adding users to leagues during signup.

```bash
node scripts/create-signup-function-simple.mjs
```

### `apply-signup-migration.mjs`
Applies the signup helper function migration to the database.

```bash
node scripts/apply-signup-migration.mjs
```

### `check-league-memberships-table.mjs`
Checks the league_memberships table structure and tests inserting a membership.

```bash
node scripts/check-league-memberships-table.mjs
```

## Additional Scripts

### `confirm-email-via-db.mjs`
Direct database email confirmation script (uses postgres library).

```bash
node scripts/confirm-email-via-db.mjs <email>
```

### `list-users.mjs`
Alternative user listing script using direct database access.

```bash
node scripts/list-users.mjs
```

## Environment Setup

All scripts require environment variables from `.env.local`:

```bash
# Required for all scripts
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for database scripts (create-signup-function, etc.)
SUPABASE_DB_URL=postgresql://...
```

## Common Tasks

### Reset a user's email confirmation
```bash
node scripts/confirm-user-email.mjs user@example.com
```

### Check why a user can't log in
```bash
node scripts/check-user-profile.mjs user@example.com
```

### See all unconfirmed users
```bash
node scripts/list-all-users.mjs
# Look for ❌ in the output
```

### Verify database migrations applied
```bash
node scripts/create-signup-function-simple.mjs
# Should show "Function created successfully"
```

## Troubleshooting

### Error: "Missing required environment variables"
Make sure `.env.local` exists in the project root with all required variables.

### Error: "Tenant or user not found"
The database connection string may have special characters that need URL encoding.
Use the Supabase client-based scripts (`confirm-user-email.mjs`) instead of direct postgres connection scripts.

### Error: "User not found with email: ..."
Double-check the email address spelling. List all users with `list-all-users.mjs` to see available accounts.
