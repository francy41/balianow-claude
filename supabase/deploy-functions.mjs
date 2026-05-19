/**
 * Deploy Supabase Edge Functions via Management API
 * Requiere SUPABASE_ACCESS_TOKEN (Personal Access Token)
 * Obtener en: https://supabase.com/dashboard/account/tokens
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'lpwwdjujxwxdvyoznehp';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!ACCESS_TOKEN || ACCESS_TOKEN === 'undefined') {
  console.error('\n❌ Falta SUPABASE_ACCESS_TOKEN');
  console.error('   Obtén tu token en: https://supabase.com/dashboard/account/tokens');
  console.error('   Uso: node deploy-functions.mjs <TU_ACCESS_TOKEN>\n');
  process.exit(1);
}

const FUNCTIONS = [
  'create-payment-intent',
  'stripe-webhook',
  'create-paypal-order',
  'capture-paypal-order',
];

async function deployFunction(name) {
  const fnDir = join(__dirname, 'functions', name);
  const code = readFileSync(join(fnDir, 'index.ts'), 'utf-8');

  // Incluir el shared cors helper inline
  const corsCode = readFileSync(join(__dirname, 'functions', '_shared', 'cors.ts'), 'utf-8');
  const fullCode = corsCode + '\n\n' + code.replace("import { corsHeaders } from '../_shared/cors.ts';", '');

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${name}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        slug: name,
        body: fullCode,
        verify_jwt: name === 'stripe-webhook' ? false : false,
        import_map: false,
      }),
    }
  );

  if (res.ok) {
    const data = await res.json();
    console.log(`  ✅ ${name} — desplegado (ID: ${data.id ?? 'ok'})`);
    return true;
  } else {
    const err = await res.text();
    console.log(`  ❌ ${name} — Error ${res.status}: ${err.substring(0, 120)}`);
    return false;
  }
}

console.log(`\n🚀 Desplegando ${FUNCTIONS.length} Edge Functions en proyecto ${PROJECT_REF}...\n`);
let ok = 0;
for (const fn of FUNCTIONS) {
  const success = await deployFunction(fn);
  if (success) ok++;
}

console.log(`\n🏁 ${ok}/${FUNCTIONS.length} funciones desplegadas`);
if (ok === FUNCTIONS.length) {
  console.log('\n✅ ¡Todo listo! Siguiente paso: añadir los secrets de Stripe/PayPal en:');
  console.log(`   https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions\n`);
}
