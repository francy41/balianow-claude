/**
 * Deploy ghl-bulk-post + set GHL_API_TOKEN secret
 * Versión 2: usa endpoint v1/projects/.../functions con JSON simple
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'lpwwdjujxwxdvyoznehp';

const SB_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];
const GHL_TOKEN = process.env.GHL_API_TOKEN || process.argv[3];

if (!SB_TOKEN || !GHL_TOKEN) {
  console.error('Faltan tokens. Uso: node deploy-ghl-bulk.mjs <sbp_TOKEN> <pit_TOKEN>');
  process.exit(1);
}

const FN_NAME = 'ghl-bulk-post';

// Leer index.ts y INLINE la dependencia de _shared/cors.ts
let FN_BODY = readFileSync(join(__dirname, 'functions', FN_NAME, 'index.ts'), 'utf-8');
const CORS_BODY = readFileSync(join(__dirname, 'functions', '_shared', 'cors.ts'), 'utf-8');

// Sustituir el import de _shared/cors.ts por el código inline
FN_BODY = FN_BODY.replace(
  /import\s*\{\s*getCorsHeaders\s*\}\s*from\s*['"]\.\.\/_shared\/cors\.ts['"];?\s*/,
  CORS_BODY.replace(/export\s+/g, '') + '\n\n'
);

const headers = {
  'Authorization': `Bearer ${SB_TOKEN}`,
  'Content-Type': 'application/json',
};

async function setSecret() {
  console.log('🔐 Guardando GHL_API_TOKEN como secret...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    method: 'POST',
    headers,
    body: JSON.stringify([{ name: 'GHL_API_TOKEN', value: GHL_TOKEN }]),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Secret error ${res.status}: ${err}`);
  }
  console.log('   ✓ Secret guardado');
}

async function deployFunction() {
  console.log(`📦 Desplegando function ${FN_NAME}...`);

  // JSON body con source code (v1 API)
  const payload = {
    slug: FN_NAME,
    name: FN_NAME,
    body: FN_BODY,
    verify_jwt: false,
  };

  // POST primero (crear). Si ya existe -> 409 -> PATCH.
  let res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 409 || res.status === 400) {
    console.log('   (ya existe, actualizando...)');
    res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${FN_NAME}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body: FN_BODY, verify_jwt: false }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deploy ${res.status}: ${err}`);
  }
  const out = await res.json();
  console.log(`   ✓ Function: ${out?.name || FN_NAME} (id: ${out?.id || '?'})`);
  return out;
}

(async () => {
  try {
    await setSecret();
    await deployFunction();
    console.log('\n✅ TODO LISTO. Probando endpoint...');
    // Test ping
    const testUrl = `https://${PROJECT_REF}.supabase.co/functions/v1/${FN_NAME}`;
    const test = await fetch(testUrl, { method: 'OPTIONS', headers: { 'Origin': 'https://bailanow.com' } });
    console.log(`   Endpoint: ${test.status} ${test.statusText}`);
    console.log('\n🎉 El botón "Publicar en varias" en /redes ya debería funcionar.');
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  }
})();
