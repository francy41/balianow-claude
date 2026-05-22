CREATE TABLE IF NOT EXISTS class_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'class',
  style TEXT[],
  level TEXT DEFAULT 'all',
  duration_minutes INTEGER DEFAULT 60,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  max_students INTEGER DEFAULT 1,
  is_online BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  cover_image TEXT,
  trailer_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offering_id UUID REFERENCES class_offerings(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  booked_count INTEGER DEFAULT 0,
  max_students INTEGER DEFAULT 1,
  jitsi_room TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES class_offerings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  platform_fee NUMERIC(10,2),
  payment_id TEXT,
  jitsi_room TEXT,
  notes TEXT,
  rating INTEGER,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offerings_vendor ON class_offerings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_slots_vendor ON availability_slots(vendor_id);
CREATE INDEX IF NOT EXISTS idx_slots_starts ON availability_slots(starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON class_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor ON class_bookings(vendor_id);

ALTER TABLE class_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read offerings" ON class_offerings;
CREATE POLICY "Public read offerings" ON class_offerings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendor manage offerings" ON class_offerings;
CREATE POLICY "Vendor manage offerings" ON class_offerings FOR ALL USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Public read slots" ON availability_slots;
CREATE POLICY "Public read slots" ON availability_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendor manage slots" ON availability_slots;
CREATE POLICY "Vendor manage slots" ON availability_slots FOR ALL USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "User read own bookings" ON class_bookings;
CREATE POLICY "User read own bookings" ON class_bookings FOR SELECT USING (auth.uid() = student_id OR auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Student create booking" ON class_bookings;
CREATE POLICY "Student create booking" ON class_bookings FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Parties update booking" ON class_bookings;
CREATE POLICY "Parties update booking" ON class_bookings FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = vendor_id);
