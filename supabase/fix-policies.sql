DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payout_queue' AND policyname = 'Sellers see own payouts'
  ) THEN
    CREATE POLICY "Sellers see own payouts"
      ON public.payout_queue FOR SELECT
      USING (auth.uid() = seller_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payout_queue' AND policyname = 'Service role manages payouts'
  ) THEN
    CREATE POLICY "Service role manages payouts"
      ON public.payout_queue FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
