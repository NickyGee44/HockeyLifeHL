-- ==============================================================================
-- FIX: Update handle_new_user() trigger function
-- ==============================================================================
-- Problem: The trigger is trying to insert a 'user_id' column that doesn't exist
-- Solution: Remove user_id from the INSERT statement
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new profile with just id, email, and full_name
  -- The 'id' column in profiles table IS the user_id
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;  -- Changed from user_id to id

  RETURN NEW;
END;
$$;

-- Recreate the trigger (in case it was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger exists
SELECT
  'Trigger fixed!' as status,
  trigger_name,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Test that we can now create users
SELECT 'Trigger function updated - try creating a user now!' as message;
