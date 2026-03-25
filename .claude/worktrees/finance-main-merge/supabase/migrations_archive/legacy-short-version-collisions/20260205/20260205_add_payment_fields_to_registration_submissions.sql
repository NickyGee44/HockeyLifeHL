-- =============================================================================
-- Migration: Add Payment Fields to registration_submissions
-- =============================================================================
-- Description: Adds fee amount and currency tracking to registration_submissions
--              to support Stripe Checkout payment flow for team registration fees
-- Author: Security Team
-- Date: 2026-02-05
-- =============================================================================

-- Add fee amount column (required for payment calculation)
ALTER TABLE registration_submissions
ADD COLUMN IF NOT EXISTS fee_amount_cents INTEGER DEFAULT 0 CHECK (fee_amount_cents >= 0);

-- Add currency field
ALTER TABLE registration_submissions
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd' CHECK (currency IN ('usd', 'cad'));

-- Add checkout session tracking (for idempotency)
ALTER TABLE registration_submissions
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Update payment_status check constraint to include 'partial' status
ALTER TABLE registration_submissions
DROP CONSTRAINT IF EXISTS registration_submissions_payment_status_check;

ALTER TABLE registration_submissions
ADD CONSTRAINT registration_submissions_payment_status_check
CHECK (payment_status IN ('not_required', 'pending', 'partial', 'completed', 'failed', 'refunded'));

-- Add index for payment tracking queries
CREATE INDEX IF NOT EXISTS idx_reg_submissions_payment_status
ON registration_submissions(payment_status)
WHERE payment_status != 'not_required';

-- Add index for Stripe session lookups
CREATE INDEX IF NOT EXISTS idx_reg_submissions_checkout_session
ON registration_submissions(stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN registration_submissions.fee_amount_cents IS 'Registration fee amount in cents at time of registration. Immutable once set to handle fee changes.';
COMMENT ON COLUMN registration_submissions.currency IS 'Currency for the registration fee (usd or cad)';
COMMENT ON COLUMN registration_submissions.stripe_checkout_session_id IS 'Stripe Checkout Session ID for idempotency and tracking';

-- =============================================================================
-- Atomic webhook processing function for registration payments
-- =============================================================================

CREATE OR REPLACE FUNCTION process_registration_payment_webhook(
  p_registration_id UUID,
  p_checkout_session_id TEXT,
  p_payment_intent_id TEXT,
  p_amount_paid_cents INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration registration_submissions%ROWTYPE;
  v_already_processed BOOLEAN := FALSE;
  v_new_status TEXT;
  v_result JSON;
BEGIN
  -- Fetch registration with row lock (prevents concurrent updates)
  SELECT * INTO v_registration
  FROM registration_submissions
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration not found'
    );
  END IF;

  -- Check if already processed (idempotency - webhook delivered 2x)
  IF v_registration.stripe_payment_intent_id = p_payment_intent_id THEN
    RETURN json_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Payment already recorded for this registration'
    );
  END IF;

  -- Update payment tracking atomically
  UPDATE registration_submissions
  SET
    amount_paid_cents = COALESCE(amount_paid_cents, 0) + p_amount_paid_cents,
    stripe_payment_intent_id = p_payment_intent_id,
    stripe_checkout_session_id = p_checkout_session_id,
    payment_status = CASE
      WHEN (COALESCE(amount_paid_cents, 0) + p_amount_paid_cents) >= fee_amount_cents THEN 'completed'
      WHEN (COALESCE(amount_paid_cents, 0) + p_amount_paid_cents) > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = p_registration_id
  RETURNING payment_status INTO v_new_status;

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'already_processed', false,
    'message', 'Payment processed successfully',
    'new_status', v_new_status,
    'new_amount_paid_cents', v_registration.amount_paid_cents + p_amount_paid_cents
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'process_registration_payment_webhook error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_registration_payment_webhook TO authenticated, service_role;

-- Comment
COMMENT ON FUNCTION process_registration_payment_webhook IS 'Atomically processes registration payment webhook events with idempotency protection';

-- =============================================================================
-- Atomic refund processing function for registration payments
-- =============================================================================

CREATE OR REPLACE FUNCTION process_registration_refund(
  p_registration_id UUID,
  p_refund_amount_cents INTEGER,
  p_refund_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration registration_submissions%ROWTYPE;
  v_new_amount_paid INTEGER;
  v_new_status TEXT;
BEGIN
  -- Fetch registration with row lock
  SELECT * INTO v_registration
  FROM registration_submissions
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration not found'
    );
  END IF;

  -- Calculate new amount after refund
  v_new_amount_paid := GREATEST(0, COALESCE(v_registration.amount_paid_cents, 0) - p_refund_amount_cents);

  -- Determine new status
  IF v_new_amount_paid = 0 THEN
    v_new_status := 'refunded';
  ELSIF v_new_amount_paid >= v_registration.fee_amount_cents THEN
    v_new_status := 'completed';
  ELSIF v_new_amount_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Update payment tracking atomically
  UPDATE registration_submissions
  SET
    amount_paid_cents = v_new_amount_paid,
    payment_status = v_new_status,
    updated_at = NOW()
  WHERE id = p_registration_id;

  RETURN json_build_object(
    'success', true,
    'new_status', v_new_status,
    'new_amount_paid_cents', v_new_amount_paid,
    'refund_amount_cents', p_refund_amount_cents
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'process_registration_refund error: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_registration_refund TO authenticated, service_role;

-- Comment
COMMENT ON FUNCTION process_registration_refund IS 'Atomically processes refunds for registration payments';
