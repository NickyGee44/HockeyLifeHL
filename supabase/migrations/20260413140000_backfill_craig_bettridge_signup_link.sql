DO $$
DECLARE
  v_auth_user_id UUID;
  v_merge_result jsonb;
BEGIN
  SELECT id
  INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = 'craig@jcbcontrols.com'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Craig Bettridge auth user not found for craig@jcbcontrols.com';
  END IF;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_auth_user_id, 'craig@jcbcontrols.com', 'Craig Bettridge')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = 'b5d81479-3a04-40f0-951c-3eb75bc1d13b'
      AND id <> v_auth_user_id
  ) THEN
    v_merge_result := public.merge_legacy_profile(
      v_auth_user_id,
      'b5d81479-3a04-40f0-951c-3eb75bc1d13b'
    );

    IF COALESCE((v_merge_result->>'success')::boolean, false) = FALSE THEN
      RAISE EXCEPTION 'Craig Bettridge merge failed: %', COALESCE(v_merge_result->>'error', 'unknown error');
    END IF;
  END IF;
END;
$$;
