// Supabase Edge Function — create-module-checkout
// POST /functions/v1/create-module-checkout
// Pago ÚNICO de un módulo de creador (20€) o del Pack Full (50€).
// Body: { moduleId, moduleName, price }  → { url } | { notConfigured }
// Requiere sesión (el creador). El webhook registra la compra al completar el pago.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://bailanow.com';

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  const rl = checkRateLimit(req, { max: 10, windowMs: 60_000, keyPrefix: 'module' });
  if (!rl.ok) return rl.response;
  if (!SECRET || SECRET.includes('XXXX')) return json({ notConfigured: true });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'No autorizado' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }
  const moduleId = String(body.moduleId ?? '');
  if (!moduleId) return json({ error: 'Datos no válidos' }, 400);

  // El precio NO viene del cliente. Antes se hacía `Number(body.price)` y se
  // cobraba eso: cualquiera podía comprar un módulo por un céntimo. El catálogo
  // ya estaba en la base de datos, solo faltaba mirarlo.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: fila } = await admin
    .from('module_catalog')
    .select('module_id, name, price, active')
    .eq('module_id', moduleId)
    .maybeSingle();
  if (!fila) return json({ error: 'Módulo no encontrado' }, 404);

  // Mismo cálculo del precio efectivo que usa la web: un ajuste para este
  // usuario manda sobre uno para su rol, y este sobre el del catálogo.
  const { data: perfil } = await admin
    .from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: ajustes } = await admin
    .from('module_overrides')
    .select('scope_type, scope_value, price, active')
    .eq('module_id', moduleId);

  const lista = ajustes ?? [];
  const porUsuario = lista.find(o => o.scope_type === 'user' && o.scope_value === user.id);
  const porRol = perfil?.role
    ? lista.find(o => o.scope_type === 'role' && o.scope_value === String(perfil.role))
    : undefined;
  const ajuste = porUsuario ?? porRol;

  const price = Number(ajuste?.price ?? fila.price);
  const activo = ajuste?.active ?? fila.active;
  if (activo === false) return json({ error: 'Módulo no disponible' }, 400);
  if (!Number.isFinite(price) || price <= 0) return json({ error: 'Módulo sin precio válido' }, 400);

  const moduleName = String(fila.name ?? 'Módulo');

  const stripe = new Stripe(SECRET, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: Math.round(price * 100), product_data: { name: `BailaNow · ${moduleName}` } } }],
      customer_email: user.email ?? undefined,
      metadata: { type: 'module', module_id: moduleId, creator_id: user.id, price: String(price) },
      success_url: `${APP_URL}/modulos?ok=1`,
      cancel_url: `${APP_URL}/modulos`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[create-module-checkout] stripe error');
    return json({ error: (err as Error).message || 'Error creando el pago' }, 400);
  }
});
