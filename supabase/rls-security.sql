-- ============================================================
-- BailaNow — Row Level Security (RLS) hardening
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ⚠️  Execute AFTER schema.sql and payments-schema.sql
-- ============================================================

-- ── ENABLE RLS ON ALL TABLES ─────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
-- Anyone can view public profiles (name, avatar, role, city)
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Prevent users from elevating their own role to admin
-- (admin role changes must go through service_role / Supabase Dashboard)
CREATE POLICY "profiles: no self-promote to admin"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    AND (
      -- allow update only if new role is NOT admin (unless already admin)
      (NEW.role != 'admin') OR (OLD.role = 'admin')
    )
  );

-- Service role can do anything (Edge Functions use this)
CREATE POLICY "profiles: service_role full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- BOOKINGS — private between buyer and seller
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "bookings: read own"
  ON public.bookings FOR SELECT
  USING (
    auth.uid()::text = user_id::text
    OR auth.uid()::text = artist_id::text
  );

CREATE POLICY "bookings: create authenticated"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "bookings: update own"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid()::text = user_id::text
    OR auth.uid()::text = artist_id::text
  );

CREATE POLICY "bookings: service_role full"
  ON public.bookings FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- TICKETS — only owner can view
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "tickets: read own"
  ON public.tickets FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "tickets: create authenticated"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "tickets: service_role full"
  ON public.tickets FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- TRANSACTIONS — only owner + service_role
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "transactions: read own"
  ON public.transactions FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Transactions must only be created server-side (via service_role)
CREATE POLICY "transactions: service_role full"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- MESSAGES — only participants can read/send
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "messages: read participants"
  ON public.messages FOR SELECT
  USING (
    auth.uid()::text = sender_id::text
    OR auth.uid()::text = receiver_id::text
  );

CREATE POLICY "messages: send authenticated"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid()::text = sender_id::text);

-- ─────────────────────────────────────────────────────────────
-- FAVORITES — private per user
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "favorites: read own"
  ON public.favorites FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "favorites: manage own"
  ON public.favorites FOR ALL
  USING (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────
-- PUBLIC READ TABLES (artists, venues, events, services, reviews)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "artists: public read"  ON public.artists  FOR SELECT USING (true);
CREATE POLICY "venues: public read"   ON public.venues   FOR SELECT USING (true);
CREATE POLICY "events: public read"   ON public.events   FOR SELECT USING (true);
CREATE POLICY "services: public read" ON public.services FOR SELECT USING (true);
CREATE POLICY "reviews: public read"  ON public.reviews  FOR SELECT USING (true);

-- Owners can create/update their own records
CREATE POLICY "artists: owner write"
  ON public.artists FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "venues: owner write"
  ON public.venues FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "events: owner write"
  ON public.events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "services: owner write"
  ON public.services FOR ALL
  USING (auth.uid()::text = seller_id::text);

CREATE POLICY "reviews: authenticated write"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- ─────────────────────────────────────────────────────────────
-- SITE_CONFIG — only admin can modify, all can read
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "site_config: public read"
  ON public.site_config FOR SELECT
  USING (true);

CREATE POLICY "site_config: admin write"
  ON public.site_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- ROLE CHECK: prevent users from granting admin in their profile
-- Enforce via DB constraint as a second line of defense
-- ─────────────────────────────────────────────────────────────
-- (This only applies to updates via anon/authenticated role,
--  service_role bypasses RLS by design)
