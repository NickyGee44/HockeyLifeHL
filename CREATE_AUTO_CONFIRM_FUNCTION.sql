-- Create function to auto-confirm user emails
-- Run this ONCE in Supabase SQL Editor

CREATE OR REPLACE FUNCTION confirm_user_email(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user in auth.users to mark email as confirmed
  UPDATE auth.users
  SET
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated, anon;

COMMENT ON FUNCTION confirm_user_email IS
'Auto-confirms a user email address, allowing them to log in without email verification.
Use with caution - only for trusted signup flows.';
