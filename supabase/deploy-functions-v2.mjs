/**
 * Deploy múltiples Edge Functions via Management API
 * Uso: SUPABASE_ACCESS_TOKEN=sbp_... node deploy-functions-v2.mjs [fn1 fn2 ...]
 * Si no se pasan args, despliega todas las funciones en supabase/functions/
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'lpwwdjujxwxdvyoznehp';
const SB_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!SB_TOKEN || !SB_TOKEN.startsWith('sbp_')) {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN (sbp_...)');
  process.exit(1);
}

const args = process.argv.slice(SB_TOKEN === process.argv[2] ? 3 : 2);
const FN_DIR = join(__dirname, 'functions');
const ALL = readdirSync(FN_DIR).filter(d => !d.startsWith('_') && existsSync(join(FN_DIR, d, 'index.ts')));
const TARGETS = args.length > 0 ? args : ALL;

const headers = {
  'Authorization': `Bearer ${SB_TOKEN}`,
  'Content-Type': 'application/json',
};

async function deploy(fnName) {
  console.log(`\n📦 ${fnName}`);
  let body = readFileSync(join(FN_DIR, fnName, 'index.ts'), 'utf-8');
  // Inline _shared/cors.ts if imported
  const corsPath = join(FN_DIR, '_shared', 'cors.ts');
  if (body.includes("'../_shared/cors.ts'") && existsSync(corsPath)) {
    const cors = readFileSync(corsPath, 'utf-8').replace(/export\s+/g, '');
    body = body.replace(/import\s*\{[^}]+\}\s*from\s*['"]\.\.\/_shared\/cors\.ts['"];?\s*/g, cors + '\n\n');
  }

  const payload = { slug: fnName, name: fnName, body, verify_jwt: false };

  let res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  if (res.status === 409 || res.status === 400) {
    res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${fnName}`, {
      method: 'PATCH', headers, body: JSON.stringify({ body, verify_jwt: false }),
    });
  }
  if (!res.ok) {
    const err = await res.text();
    console.error(`   ✗ ${res.status}: ${err.slice(0, 300)}`);
    return false;
  }
  const out = await res.json();
  console.log(`   ✓ Deployed (${out.id || 'ok'})`);
  return true;
}

(async () => {
  let ok = 0, fail = 0;
  for (const fn of TARGETS) {
    if (await deploy(fn)) ok++; else fail++;
  }
  console.log(`\n${ok} deployed · ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})();
