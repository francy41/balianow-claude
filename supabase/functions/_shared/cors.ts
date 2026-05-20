/**
 * CORS headers for Supabase Edge Functions.
 * Restricts origins to known app domains — never wildcard on payment endpoints.
 */

const ALLOWED_ORIGINS = [
  'https://bailanow.com',
  'https://www.bailanow.com',
  'https://bailanow.vercel.app',
  // Add preview / staging domains as needed:
  // 'https://bailanow-staging.vercel.app',
];

// In local Supabase dev, also allow localhost
if (Deno.env.get('SUPABASE_ENV') !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:5173');
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Kept for backwards-compat in non-payment functions; prefer getCorsHeaders(req)
export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? 'https://bailanow.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
