-- Set is_platform_admin = true for the platform owner account.
-- nick@bridg3.io is the platform owner and needs unrestricted access
-- to all leagues, teams, and admin features across the platform.

UPDATE public.profiles
SET is_platform_admin = TRUE
WHERE email = 'nick@bridg3.io';
