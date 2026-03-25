-- Add columns to leagues table for tracking Stripe account requirements and capabilities

-- Requirements tracking (v2.core.account[requirements].updated)
ALTER TABLE public.leagues
ADD COLUMN IF NOT EXISTS stripe_requirements_currently_due jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_requirements_past_due jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_requirements_eventually_due jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stripe_requirements_updated_at timestamp with time zone;

-- Customer capability tracking (v2.core.account[configuration.customer].capability_status_updated)
-- Stores whether the platform can charge subscriptions to this connected account
ALTER TABLE public.leagues
ADD COLUMN IF NOT EXISTS stripe_customer_capability_status text,
ADD COLUMN IF NOT EXISTS stripe_customer_capability_updated_at timestamp with time zone;

-- Add comments for documentation
COMMENT ON COLUMN public.leagues.stripe_requirements_currently_due IS 'Array of requirement fields currently due for Stripe account verification';
COMMENT ON COLUMN public.leagues.stripe_requirements_past_due IS 'Array of requirement fields past due for Stripe account verification';
COMMENT ON COLUMN public.leagues.stripe_requirements_eventually_due IS 'Array of requirement fields that will eventually be due';
COMMENT ON COLUMN public.leagues.stripe_requirements_updated_at IS 'Last time requirements were updated from Stripe webhook';
COMMENT ON COLUMN public.leagues.stripe_customer_capability_status IS 'Status of customer capability (inactive, pending, active, restricted, suspended)';
COMMENT ON COLUMN public.leagues.stripe_customer_capability_updated_at IS 'Last time customer capability status was updated';
