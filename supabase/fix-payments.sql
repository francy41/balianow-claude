-- Fix payout_queue (sin FK a transactions para evitar el problema de tipo TEXT vs UUID)
CREATE TABLE IF NOT EXISTS public.payout_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT,
  seller_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed')),
  provider TEXT DEFAULT 'stripe',
  payout_id TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payout_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Sellers see own payouts"
  ON public.payout_queue FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY IF NOT EXISTS "Service role manages payouts"
  ON public.payout_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_payout_seller ON public.payout_queue(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON public.payout_queue(status);
CREATE INDEX IF NOT EXISTS idx_payout_transaction ON public.payout_queue(transaction_id);
