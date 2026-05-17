-- Fix: Add missing columns to tables that were created without them

-- Events: add missing city and created_by columns
DO $$ BEGIN
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
  ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Venues: add missing user_id
DO $$ BEGIN
  ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Services: add missing artist_id column
DO $$ BEGIN
  ALTER TABLE public.services ADD COLUMN IF NOT EXISTS artist_id TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Reviews: add missing user_id
DO $$ BEGIN
  ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Messages: add missing conversation_id
DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id TEXT DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Tickets: add missing qr_token
DO $$ BEGIN
  ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT '';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Bookings table (create fresh)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id TEXT DEFAULT NULL,
  event_id TEXT DEFAULT NULL,
  service_id TEXT DEFAULT NULL,
  type TEXT NOT NULL DEFAULT 'event' CHECK (type IN ('event','service','class','private')),
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

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Missing indexes
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- Missing policies
CREATE POLICY "Venues can update own record" ON public.venues FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Events can be updated by creator or admin" ON public.events FOR UPDATE USING (auth.uid() = created_by OR EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Services can be updated by artist owner" ON public.services FOR UPDATE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Auth users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at triggers
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
