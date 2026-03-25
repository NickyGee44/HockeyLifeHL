These files were moved out of `supabase/migrations` because they used short date-only
versions that caused Supabase CLI to treat multiple files as the same migration version.

Canonical replacements now live in `supabase/migrations` with exact 14-digit versions
such as `20260125000000_*`, `20260211000000_*`, and `20260309000000_*`.

Each canonical file was generated from the statements stored in
`supabase_migrations.schema_migrations` so the repo matches the actual applied history
instead of guessing file order from the old split files.
