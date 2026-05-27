// ════════════════════════════════════════════════════════════════
// Edge Function: health
// Endpoint para monitoreo de status (Uptime Robot, Pingdom, etc.)
//
// GET /functions/v1/health
// Devuelve: { status, db, metrics, version, checked_at }
// Status 200 si todo OK, 503 si algo crítico falla.
// ════════════════════════════════════════════════════════════════

// Health check — usa fetch directo a Supabase REST (sin SDK, sin boot-error)
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
  const checks: Record<string, unknown> = { db: false };
  let metrics: unknown = null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/health_metrics?select=*`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: 'application/json',
      },
    });
    if (res.ok) {
      const rows = await res.json();
      checks.db = true;
      metrics = Array.isArray(rows) ? rows[0] : rows;
    } else {
      checks.db_error = `HTTP ${res.status}`;
    }
  } catch (e) {
    checks.db_error = (e as Error).message;
  }

  const healthy = checks.db === true;
  return new Response(JSON.stringify({
    status: healthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    response_time_ms: Date.now() - startTime,
    checks,
    metrics,
    checked_at: new Date().toISOString(),
  }, null, 2), {
    status: healthy ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
