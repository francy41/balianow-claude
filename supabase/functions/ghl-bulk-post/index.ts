// ════════════════════════════════════════════════════════════════
// Edge Function: ghl-bulk-post
// Publica un post simultáneamente en múltiples sub-cuentas (Locations) de GHL.
//
// Flujo:
//  1. Cliente envía: { text, mediaUrls, brandIds, platforms?, scheduleDate? }
//  2. Para cada brandId (= Location ID):
//     a. GET /social-media-posting/{locationId}/accounts → cuentas conectadas
//     b. Filtra por platforms si se pasan (facebook, instagram, tiktok, youtube...)
//     c. POST /social-media-posting/{locationId}/posts con summary + media + accountIds
//  3. Devuelve resumen { brandId, success, postId?, error? }[]
//
// Secret requerido en Supabase env:
//   GHL_API_TOKEN  → Agency Settings → API Keys → Private Integration (scope social-media-posting)
// ════════════════════════════════════════════════════════════════

import { getCorsHeaders } from '../_shared/cors.ts';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface BulkPostRequest {
  text: string;
  mediaUrls?: string[];
  brandIds: string[];          // Location IDs de GHL
  platforms?: string[];        // ['facebook','instagram','tiktok','youtube',...] - opcional
  scheduleDate?: string;       // ISO 8601 - opcional, si no se posta inmediato
  type?: 'post' | 'reel' | 'story';
}

interface BrandResult {
  brandId: string;
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

  const token = Deno.env.get('GHL_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({
      error: 'GHL_API_TOKEN no configurado en Supabase secrets',
      hint: 'Crea un Private Integration Token en GHL (scope social-media-posting.write) y guárdalo: supabase secrets set GHL_API_TOKEN=...',
    }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body: BulkPostRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { text, mediaUrls = [], brandIds = [], platforms, scheduleDate, type = 'post' } = body;

  if (!text?.trim() && mediaUrls.length === 0) {
    return new Response(JSON.stringify({ error: 'Se requiere texto o al menos 1 media' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (!Array.isArray(brandIds) || brandIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Selecciona al menos 1 marca' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ghlHeaders = {
    'Authorization': `Bearer ${token}`,
    'Version': GHL_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Procesar cada marca en paralelo
  const results: BrandResult[] = await Promise.all(brandIds.map(async (brandId): Promise<BrandResult> => {
    try {
      // 1) Obtener cuentas sociales conectadas en esta location
      const acctRes = await fetch(`${GHL_API_BASE}/social-media-posting/${brandId}/accounts`, {
        headers: ghlHeaders,
      });
      if (!acctRes.ok) {
        const err = await acctRes.text();
        return { brandId, success: false, error: `Accounts API ${acctRes.status}: ${err.slice(0, 200)}` };
      }
      const acctJson = await acctRes.json();
      const allAccounts: any[] = acctJson?.accounts || acctJson?.data || [];

      // 2) Filtrar por platforms si se pidió
      const accounts = platforms && platforms.length > 0
        ? allAccounts.filter((a: any) => platforms.includes(String(a.platform || a.type || '').toLowerCase()))
        : allAccounts;

      if (accounts.length === 0) {
        return { brandId, success: false, error: 'Esta marca no tiene cuentas sociales conectadas en GHL (o ninguna coincide con las plataformas seleccionadas)' };
      }

      const accountIds = accounts.map((a: any) => a.id || a._id || a.accountId).filter(Boolean);

      // 3) Crear el post
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

      const postRes = await fetch(`${GHL_API_BASE}/social-media-posting/${brandId}/posts`, {
        method: 'POST',
        headers: ghlHeaders,
        body: JSON.stringify(postBody),
      });

      if (!postRes.ok) {
        const err = await postRes.text();
        return { brandId, success: false, accountsUsed: accountIds.length, error: `Post API ${postRes.status}: ${err.slice(0, 300)}` };
      }
      const postJson = await postRes.json();
      return {
        brandId,
        success: true,
        postId: postJson?.id || postJson?.post?.id,
        accountsUsed: accountIds.length,
      };
    } catch (e: any) {
      return { brandId, success: false, error: e?.message || 'Error desconocido' };
    }
  }));

  const successCount = results.filter(r => r.success).length;
  return new Response(JSON.stringify({
    summary: {
      total: brandIds.length,
      success: successCount,
      failed: brandIds.length - successCount,
    },
    results,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
