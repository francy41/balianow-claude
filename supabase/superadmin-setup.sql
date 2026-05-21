-- ============================================================
-- BailaNow - Superadmin setup + Admin Invitations
-- Run in: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- 1. Add 'superadmin' value to user_role enum (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype
      AND enumlabel = 'superadmin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'superadmin';
  END IF;
END
$$;

-- 2. Make solfamendez41@gmail.com a superadmin
UPDATE public.profiles
SET role = 'superadmin'::user_role,
    is_verified = true,
    updated_at = NOW()
WHERE email = 'solfamendez41@gmail.com';

-- 3. Create admin_invitations table
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  invited_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role        TEXT        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS on admin_invitations
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Superadmins can do everything
CREATE POLICY "superadmin_full_access_invitations"
  ON public.admin_invitations
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin', 'admin')
    )
  );

-- Anyone can read an invitation by token (for the accept page)
CREATE POLICY "public_read_invitation_by_token"
  ON public.admin_invitations
  FOR SELECT
  USING (true);

-- 5. Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token
  ON public.admin_invitations(token);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email
  ON public.admin_invitations(email);

-- 6. Update Navbar/AdminPage admin check: treat superadmin as admin
-- (handled in frontend, but here's a view for convenience)
CREATE OR REPLACE VIEW public.v_admins AS
  SELECT id, name, email, avatar, role, city, created_at
  FROM public.profiles
  WHERE role IN ('admin', 'superadmin')
  ORDER BY role DESC, name ASC;

-- 7. Verify
SELECT email, role FROM public.profiles WHERE email = 'solfamendez41@gmail.com';
SELECT COUNT(*) AS invitations_table_exists FROM public.admin_invitations LIMIT 1;
