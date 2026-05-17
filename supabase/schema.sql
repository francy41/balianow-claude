-- ============================================================
-- BachaSalseros / RitmoLatino — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. PROFILES (extends Supabase auth.users) ───────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '',
  cover_photo TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','artist','dj','dancer','venue','admin')),
  city TEXT DEFAULT 'Madrid',
  country TEXT DEFAULT 'España',
  is_verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_plan TEXT DEFAULT NULL,
  wallet NUMERIC(10,2) DEFAULT 0,
  notifications INT DEFAULT 0,
  socials JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ARTISTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dj','dancer','singer','band','instructor')),
  genre TEXT[] DEFAULT '{}',
  avatar TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  rating NUMERIC(2,1) DEFAULT 0,
  reviews INT DEFAULT 0,
  followers INT DEFAULT 0,
  price_from NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  bio TEXT DEFAULT '',
  is_live BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  social JSONB DEFAULT '{}',
  social_followers JSONB DEFAULT '{}',
  availability TEXT[] DEFAULT '{}',
  completed_bookings INT DEFAULT 0,
  performance_style TEXT DEFAULT '',
  languages TEXT[] DEFAULT '{}',
  gallery JSONB DEFAULT '[]',
  packages JSONB DEFAULT '[]',
  featured_video TEXT DEFAULT '',
  featured_video_title TEXT DEFAULT '',
  response_time TEXT DEFAULT '',
  total_streams INT DEFAULT 0,
  total_stream_hours INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. VENUES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venues (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'club' CHECK (type IN ('club','bar','studio','restaurant','rooftop','lounge')),
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  rating NUMERIC(2,1) DEFAULT 0,
  reviews INT DEFAULT 0,
  capacity INT DEFAULT 0,
  is_open BOOLEAN DEFAULT FALSE,
  open_hours TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_premium BOOLEAN DEFAULT FALSE,
  amenities TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  price_range INT DEFAULT 2 CHECK (price_range BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. EVENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  venue_name TEXT DEFAULT '',
  city TEXT DEFAULT '',
  date DATE NOT NULL,
  time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  category TEXT[] DEFAULT '{}',
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  capacity INT DEFAULT 0,
  attending INT DEFAULT 0,
  is_online BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  artists TEXT[] DEFAULT '{}',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. SERVICES (Marketplace) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
  artist_name TEXT DEFAULT '',
  artist_avatar TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  price NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  delivery_days INT DEFAULT 1,
  rating NUMERIC(2,1) DEFAULT 0,
  reviews INT DEFAULT 0,
  orders INT DEFAULT 0,
  cover TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  includes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. BOOKINGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('event','service','class','private')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','refunded')),
  amount NUMERIC(10,2) DEFAULT 0,
  commission NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. REVIEWS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('artist','venue','event','service')),
  target_id TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_type TEXT DEFAULT 'general',
  qr_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid','used','expired','fraudulent','refunded')),
  buyer_name TEXT DEFAULT '',
  buyer_email TEXT DEFAULT '',
  price NUMERIC(10,2) DEFAULT 0,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. MESSAGES (Chat) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. FAVORITES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('artist','venue','event','service')),
  target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- ── 11. SITE CONFIG (hero, slider, etc.) ────────────────────
CREATE TABLE IF NOT EXISTS public.site_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default slider images
INSERT INTO public.site_config (key, value) VALUES
  ('hero_slider_images', '[
    {"id":"1","url":"https://picsum.photos/seed/slider-latin1/600/300","alt":"Bachata Night"},
    {"id":"2","url":"https://picsum.photos/seed/slider-latin2/600/300","alt":"Salsa Congress"},
    {"id":"3","url":"https://picsum.photos/seed/slider-latin3/600/300","alt":"Latin Festival"}
  ]'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- ── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_artists_city ON public.artists(city);
CREATE INDEX IF NOT EXISTS idx_artists_type ON public.artists(type);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON public.reviews(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

-- ── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'https://ui-avatars.com/api/?name=' || COALESCE(REPLACE(NEW.raw_user_meta_data->>'name', ' ', '+'), 'U') || '&background=F97316&color=fff&size=200',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Artists: public read, admin/own write
CREATE POLICY "Artists are viewable by everyone" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Artists can be created by auth users" ON public.artists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Artists can update own record" ON public.artists FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete artists" ON public.artists FOR DELETE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Venues: public read, admin/own write
CREATE POLICY "Venues are viewable by everyone" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Venues can be created by auth users" ON public.venues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Venues can update own record" ON public.venues FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Events: public read, admin write
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events can be created by auth users" ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Events can be updated by creator or admin" ON public.events FOR UPDATE USING (auth.uid() = created_by OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Services: public read
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services can be created by auth users" ON public.services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Services can be updated by artist owner" ON public.services FOR UPDATE USING (EXISTS(SELECT 1 FROM public.artists WHERE id = artist_id AND user_id = auth.uid()) OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bookings: own read/write
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Reviews: public read, own write
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tickets: own read, admin all
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Tickets can be updated" ON public.tickets FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Messages: participants only
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Favorites: own
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Site config: public read, admin write
CREATE POLICY "Site config is viewable by everyone" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Admin can update site config" ON public.site_config FOR UPDATE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can insert site config" ON public.site_config FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','artists','venues','events','services','bookings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END;
$$;

-- ── STORAGE BUCKETS ─────────────────────────────────────────
-- Run these in the Supabase Dashboard → Storage → Create bucket:
-- 1. "avatars"   (public)
-- 2. "covers"    (public)
-- 3. "gallery"   (public)
-- 4. "tickets"   (private)
