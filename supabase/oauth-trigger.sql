-- ============================================================
-- BailaNow — OAuth & Email Auth: auto-create profile trigger
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ⚠️  Run AFTER schema.sql
-- ============================================================
-- This trigger fires on every new auth.users row (email signup
-- AND Google/OAuth signup). It creates the corresponding row in
-- public.profiles using metadata from Supabase auth.
-- ============================================================

-- 1. Add 'vendor' to the role check constraint if not already there
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user','artist','dj','dancer','venue','admin','vendor'));

-- 2. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name    TEXT;
  _avatar  TEXT;
  _role    TEXT;
  _city    TEXT;
  _email   TEXT;
BEGIN
  -- Extract from auth metadata (works for both email+password and OAuth)
  _email  := COALESCE(NEW.email, '');

  -- Google sets full_name / avatar_url in raw_user_meta_data
  -- Email signup sets name / role / city via options.data
  _name   := COALESCE(
    NEW.raw_user_meta_data->>'full_name',   -- Google OAuth
    NEW.raw_user_meta_data->>'name',        -- Email signup
    split_part(_email, '@', 1),             -- Fallback: part before @
    'Usuario'
  );

  _avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',  -- Google OAuth
    NEW.raw_user_meta_data->>'picture',     -- Google alt key
    ''
  );

  _role   := COALESCE(
    NEW.raw_user_meta_data->>'role',        -- Email signup role
    'user'
  );

  -- Validate role — prevent privilege escalation via metadata
  IF _role NOT IN ('user','artist','dj','dancer','venue','vendor') THEN
    _role := 'user';
  END IF;

  _city   := COALESCE(
    NEW.raw_user_meta_data->>'city',
    'Madrid'
  );

  -- Insert profile. ON CONFLICT does nothing — idempotent.
  INSERT INTO public.profiles (
    id,
    name,
    email,
    avatar,
    role,
    city,
    is_verified,
    is_premium,
    wallet,
    notifications,
    socials,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    _name,
    _email,
    _avatar,
    _role,
    _city,
    -- Google accounts are pre-verified; email accounts need confirmation
    CASE WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN TRUE ELSE FALSE END,
    FALSE,
    0,
    0,
    '{}'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Verify the trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
