// ════════════════════════════════════════════════════════════════
// Edge Function: ghl-bulk-post
//
// Acciones soportadas (campo `action` en el body):
//
//   1. action: 'list-accounts'
//      Body: { locationId }
//      Devuelve: { accounts: [{ id, platform, name, ... }] }
//      Lista las cuentas sociales conectadas a una Location.
//      Útil para construir marcas virtuales en el admin.
//
//   2. action: 'post' (default si se omite)
//      Body: { text, mediaUrls?, brands, scheduleDate?, type? }
//      brands: [{ locationId, accountIds?, name? }]
//        - Si accountIds está vacío/undefined: usa TODAS las cuentas de la location
//        - Si accountIds tiene valores: usa solo esas
//      Devuelve: { summary, results: [{ brandLabel, locationId, success, postId, accountsUsed, error }] }
//
//   Backwards-compat: si en lugar de `brands` viene `brandIds: ['xxx']`,
//   se traduce a `brands: [{ locationId: 'xxx' }]` (publica en todas las cuentas).
//
// Secret requerido: GHL_API_TOKEN (Private Integration con scope socialplanner)
// ════════════════════════════════════════════════════════════════

import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface BrandSpec {
  locationId: string;
  accountIds?: string[];
  name?: string;        // solo para labelling en la respuesta
}

interface PostRequest {
  action?: 'post' | 'list-accounts';
  // Para list-accounts:
  locationId?: string;
  // Para post:
  text?: string;
  mediaUrls?: string[];
  brands?: BrandSpec[];
  brandIds?: string[];   // legacy: lista de location IDs
  scheduleDate?: string;
  type?: 'post' | 'reel' | 'story';
  platforms?: string[];  // filtro extra por plataforma
}

interface BrandResult {
  brandLabel: string;
  locationId: string;
  success: boolean;
  postId?: string;
  accountsUsed?: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ─── AUTORIZACIÓN: solo admin/superadmin autenticado ──────────
  // Sin esto, cualquiera con la anon key (pública) podría publicar en
  // TODAS las redes conectadas. Se exige un JWT de usuario con rol admin.
  {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const callerToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { data: caller } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single();
    if (!caller || !['admin', 'superadmin'].includes(caller.role)) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  const token = Deno.env.get('GHL_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({
      error: 'GHL_API_TOKEN no configurado',
      hint: 'Crea Private Integration en GHL y guarda como secret: supabase secrets set GHL_API_TOKEN=...',
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body: PostRequest;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ghlHeaders = {
    'Authorization': `Bearer ${token}`,
    'Version': GHL_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ─── ACCIÓN: list-accounts ────────────────────────────────────
  if (body.action === 'list-accounts') {
    const locId = body.locationId;
    if (!locId) {
      return new Response(JSON.stringify({ error: 'locationId requerido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    try {
      const res = await fetch(`${GHL_API_BASE}/social-media-posting/${locId}/accounts`, { headers: ghlHeaders });
      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: `GHL API ${res.status}: ${err.slice(0, 400)}` }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const data = await res.json();
      const raw: any[] = data?.accounts || data?.data || data?.results || [];
      const accounts = raw.map((a: any) => ({
        id: a.id || a._id || a.accountId,
        platform: String(a.platform || a.type || a.provider || '').toLowerCase(),
        name: a.name || a.username || a.handle || a.displayName || a.id,
        avatar: a.avatar || a.profilePicture || a.imageUrl,
        connected: a.connected ?? a.isConnected ?? true,
      }));
      return new Response(JSON.stringify({ accounts, raw: data?.totalCount ? { totalCount: data.totalCount } : undefined }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  // ─── ACCIÓN: post (default) ───────────────────────────────────
  const { text, mediaUrls = [], scheduleDate, type = 'post', platforms } = body;

  if (!text?.trim() && mediaUrls.length === 0) {
    return new Response(JSON.stringify({ error: 'Se requiere texto o al menos 1 media' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Normalizar brands (legacy brandIds → brands)
  let brands: BrandSpec[] = Array.isArray(body.brands) ? body.brands : [];
  if (brands.length === 0 && Array.isArray(body.brandIds)) {
    brands = body.brandIds.map(id => ({ locationId: id }));
  }
  if (brands.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecciona al menos 1 marca' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Procesar marcas en paralelo
  const results: BrandResult[] = await Promise.all(brands.map(async (brand): Promise<BrandResult> => {
    const label = brand.name || brand.locationId;
    try {
      // Determinar qué accountIds usar
      let accountIds: string[] = [];

      if (brand.accountIds && brand.accountIds.length > 0) {
        // Marca con cuentas explícitas (marca virtual)
        accountIds = brand.accountIds;
      } else {
        // Cargar TODAS las cuentas de la location, posiblemente filtradas por platforms
        const acctRes = await fetch(`${GHL_API_BASE}/social-media-posting/${brand.locationId}/accounts`, { headers: ghlHeaders });
        if (!acctRes.ok) {
          const err = await acctRes.text();
          return { brandLabel: label, locationId: brand.locationId, success: false, error: `Accounts ${acctRes.status}: ${err.slice(0, 200)}` };
        }
        const acctJson = await acctRes.json();
        const allAccounts: any[] = acctJson?.accounts || acctJson?.data || [];
        const filtered = platforms && platforms.length > 0
          ? allAccounts.filter((a: any) => platforms.includes(String(a.platform || a.type || '').toLowerCase()))
          : allAccounts;
        accountIds = filtered.map((a: any) => a.id || a._id || a.accountId).filter(Boolean);
      }

      if (accountIds.length === 0) {
        return { brandLabel: label, locationId: brand.locationId, success: false, error: 'Sin cuentas conectadas para publicar' };
      }

      // Crear post
      const postBody: Record<string, unknown> = {
        summary: text,
        accountIds,
        type,
        status: scheduleDate ? 'scheduled' : 'in_review',
      };
      if (scheduleDate) postBody.scheduleDate = scheduleDate;
      if (mediaUrls.length > 0) {
        postBody.media = mediaUrls.map(url => ({
          url,
          type: url.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'image',
        }));
      }

      const postRes = await fetch(`${GHL_API_BASE}/social-media-posting/${brand.locationId}/posts`, {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify(postBody),
      });
      if (!postRes.ok) {
        const err = await postRes.text();
        return { brandLabel: label, locationId: brand.locationId, success: false, accountsUsed: accountIds.length, error: `Post ${postRes.status}: ${err.slice(0, 300)}` };
      }
      const postJson = await postRes.json();
      return {
        brandLabel: label,
        locationId: brand.locationId,
        success: true,
        postId: postJson?.id || postJson?.post?.id,
        accountsUsed: accountIds.length,
      };
    } catch (e: any) {
      return { brandLabel: label, locationId: brand.locationId, success: false, error: e?.message || 'Error desconocido' };
    }
  }));

  const successCount = results.filter(r => r.success).length;
  return new Response(JSON.stringify({
    summary: {
      total: brands.length,
      success: successCount,
      failed: brands.length - successCount,
    },
    results,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
