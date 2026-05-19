-- ============================================================
-- BailaNow — Payments Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. TRANSACTIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,                          -- Stripe PI id o PayPal capture id
  user_id UUID REFERENCES public.profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'        -- pending | completed | failed | refunded
    CHECK (status IN ('pending','completed','failed','refunded')),
  provider TEXT NOT NULL DEFAULT 'stripe'       -- stripe | paypal | wallet
    CHECK (provider IN ('stripe','paypal','wallet')),
  provider_id TEXT,                             -- Payment Intent ID / PayPal Order ID
  seller_breakdown JSONB DEFAULT '[]',          -- [{sellerId, gross, commission, net}]
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. PAYOUT_QUEUE ─────────────────────────────────────────
-- Cola de pagos pendientes a vendedores
CREATE TABLE IF NOT EXISTS public.payout_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT REFERENCES public.transactions(id),
  seller_id UUID REFERENCES public.profiles(id),
  amount NUMERIC(10,2) NOT NULL,               -- neto a pagar (después de comisión)
  currency TEXT DEFAULT 'eur',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed')),
  provider TEXT DEFAULT 'stripe',
  payout_id TEXT,                              -- Stripe payout ID cuando se procesa
  scheduled_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days', -- pago a los 7 días
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Función: add_to_wallet ────────────────────────────────
-- Añade saldo al wallet de un usuario (llamada desde webhook)
CREATE OR REPLACE FUNCTION public.add_to_wallet(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET wallet = COALESCE(wallet, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Row Level Security ────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_queue ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propias transacciones
CREATE POLICY "Users see own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el service_role puede insertar/actualizar transacciones
CREATE POLICY "Service role manages transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Los vendedores ven sus propios payouts
CREATE POLICY "Sellers see own payouts"
  ON public.payout_queue FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Service role manages payouts"
  ON public.payout_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ── 5. Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_payout_seller ON public.payout_queue(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON public.payout_queue(status);

-- ── 6. Trigger: auto-poblar payout_queue tras transacción ────
CREATE OR REPLACE FUNCTION public.auto_create_payouts()
RETURNS TRIGGER AS $$
DECLARE
  seller JSONB;
BEGIN
  IF NEW.status = 'completed' THEN
    FOR seller IN SELECT * FROM jsonb_array_elements(NEW.seller_breakdown)
    LOOP
      INSERT INTO public.payout_queue (transaction_id, seller_id, amount, currency, provider)
      VALUES (
        NEW.id,
        (seller->>'sellerId')::UUID,
        (seller->>'net')::NUMERIC,
        NEW.currency,
        NEW.provider
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_payouts
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_payouts();
