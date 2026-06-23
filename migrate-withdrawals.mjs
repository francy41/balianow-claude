import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.lpwwdjujxwxdvyoznehp',
  password: '1gs3d8foFR5aaj8D',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const statements = [
  `CREATE TABLE IF NOT EXISTS public.withdrawals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount       NUMERIC(10,2) NOT NULL,
    method       TEXT NOT NULL DEFAULT 'bank_transfer',
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
    notes        TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at  TIMESTAMPTZ,
    reviewed_by  UUID REFERENCES public.profiles(id)
  )`,
  `ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "withdrawals_own_read"  ON public.withdrawals`,
  `DROP POLICY IF EXISTS "withdrawals_admin_all" ON public.withdrawals`,
  `CREATE POLICY "withdrawals_own_read" ON public.withdrawals
    FOR SELECT USING (performer_id = auth.uid())`,
  `CREATE POLICY "withdrawals_admin_all" ON public.withdrawals
    FOR ALL USING (public.is_admin())`,
];

for (const sql of statements) {
  try {
    await client.query(sql);
    console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' '));
  } catch (e) {
    console.warn('SKIP:', e.message.slice(0, 80));
  }
}

await client.end();
console.log('Migration complete.');
