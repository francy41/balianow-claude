// ════════════════════════════════════════════════════════════════
// Edge Function: health
// Endpoint para monitoreo de status (Uptime Robot, Pingdom, etc.)
//
// GET /functions/v1/health
// Devuelve: { status, db, metrics, version, checked_at }
// Status 200 si todo OK, 503 si algo crítico falla.
// ════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const startTime = Date.now();
  const checks: Record<string, any> = { db: false };
  let metrics: any = null;

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await supabase.from('health_metrics').select('*').single();
    if (!error && data) {
      checks.db = true;
      metrics = data;
    } else {
      checks.db_error = error?.message;
    }
  } catch (e: any) {
    checks.db_error = e.message;
  }

  const healthy = checks.db;
  const responseTime = Date.now() - startTime;

  return new Response(JSON.stringify({
    status: healthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    response_time_ms: responseTime,
    checks,
    metrics,
    checked_at: new Date().toISOString(),
  }, null, 2), {
    status: healthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
