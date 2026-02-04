// Static client for use in generateStaticParams and other build-time functions
// This doesn't use cookies since it runs outside of a request context

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@hockey-life/database/types';

// Create a client for static generation (no cookies needed)
export function createStaticClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
