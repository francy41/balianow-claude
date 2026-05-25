/**
 * migrate.mjs — Sistema de migraciones automáticas con tracking
 *
 * Funcionamiento:
 *  1. Crea (si no existe) la tabla `public._migrations` para llevar el registro
 *  2. Recorre todos los `.sql` de la carpeta supabase/ en orden alfabético
 *  3. Aplica solo los que aún no se hayan ejecutado
 *  4. Cada migración se guarda con hash + timestamp
 *
 * Re-ejecutable: solo aplica lo nuevo. Ideal para CI o para llamar antes
 * de importar perfiles de otras webs.
 *
 * Uso:
 *   npm run db:migrate                        # aplica todas las pendientes
 *   npm run db:migrate -- --dry-run           # solo lista lo que haría
 *   npm run db:migrate -- --force <file.sql>  # re-aplica un fichero concreto
 */
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createDbClient } from './_db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_DIR = __dirname;

// Migraciones que NO deben ejecutarse automáticamente (seeds, datos de prueba, etc.)
const SKIP = new Set([
  // El schema base se aplica una sola vez al crear el proyecto
  // 'schema.sql' lo incluimos PERO solo si no se ha ejecutado nunca
]);

// Orden recomendado (si dos ficheros se llaman igual alfabéticamente,
// este orden gana). Cualquier .sql nuevo se aplica después de estos.
const RECOMMENDED_ORDER = [
  'schema.sql',
  'fix-schema.sql',
  'fix-columns.sql',
  'fix-policies.sql',
  'oauth-trigger.sql',
  'rls-security.sql',
  'payments-schema.sql',
  'fix-payments.sql',
  'categories-schema.sql',
  'add-category-columns.sql',
  'add-category-images.sql',
  'superadmin-setup.sql',
  'add-profile-geo.sql',
  'live-sessions-schema.sql',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceIdx = args.indexOf('--force');
const forceFile = forceIdx >= 0 ? args[forceIdx + 1] : null;

function hashContent(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let inDollar = false;
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inDollar) continue;
    if (trimmed.includes('$$')) {
      const count = (trimmed.match(/\$\$/g) || []).length;
      if (count % 2 === 1) inDollar = !inDollar;
    }
    current += line + '\n';
    if (!inDollar && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') stmts.push(stmt);
      current = '';
    }
  }
  if (current.trim()) stmts.push(current.trim());
  return stmts;
}

function listMigrations() {
  const files = readdirSync(SUPABASE_DIR)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !SKIP.has(f));

  // Orden: primero los del RECOMMENDED_ORDER (en su orden), luego el resto alfabético
  const recommended = RECOMMENDED_ORDER.filter(f => files.includes(f));
  const others = files.filter(f => !RECOMMENDED_ORDER.includes(f)).sort();
  return [...recommended, ...others];
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._migrations (
      filename   TEXT PRIMARY KEY,
      hash       TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      ok_count   INT,
      fail_count INT,
      duration_ms INT
    );
  `);
}

async function appliedSet(client) {
  const { rows } = await client.query(`SELECT filename, hash FROM public._migrations`);
  const map = new Map();
  for (const r of rows) map.set(r.filename, r.hash);
  return map;
}

async function applyMigration(client, file) {
  const path = join(SUPABASE_DIR, file);
  const sql = readFileSync(path, 'utf-8');
  const hash = hashContent(sql);
  const stmts = splitStatements(sql);
  const t0 = Date.now();
  let ok = 0, fail = 0;
  const errors = [];

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.substring(0, 70).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      ok++;
    } catch (err) {
      const msg = err.message;
      // Estos son "errores" benignos en migraciones idempotentes
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('does not exist, skipping')
      ) {
        ok++;
      } else {
        fail++;
        errors.push({ idx: i + 1, msg: msg.slice(0, 200), preview });
      }
    }
  }

  const duration = Date.now() - t0;
  await client.query(
    `INSERT INTO public._migrations (filename, hash, ok_count, fail_count, duration_ms)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (filename) DO UPDATE
       SET hash=EXCLUDED.hash, applied_at=NOW(),
           ok_count=EXCLUDED.ok_count, fail_count=EXCLUDED.fail_count,
           duration_ms=EXCLUDED.duration_ms`,
    [file, hash, ok, fail, duration]
  );

  return { ok, fail, duration, errors };
}

const client = createDbClient();

try {
  await client.connect();
  await ensureMigrationsTable(client);

  const applied = await appliedSet(client);
  const all = listMigrations();
  const pending = forceFile
    ? [forceFile]
    : all.filter(f => !applied.has(f) || applied.get(f) !== hashContent(readFileSync(join(SUPABASE_DIR, f), 'utf-8')));

  console.log(`\n📦 Migraciones detectadas: ${all.length}`);
  console.log(`✅ Ya aplicadas:           ${all.length - pending.length}`);
  console.log(`⏳ Pendientes:             ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('🎉 Todo al día. No hay nada que aplicar.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN — no se ejecuta nada:');
    pending.forEach(f => console.log(`  • ${f}`));
    process.exit(0);
  }

  for (const file of pending) {
    process.stdout.write(`▶ ${file}...`);
    const { ok, fail, duration, errors } = await applyMigration(client, file);
    if (fail === 0) {
      console.log(` ✅ ${ok} statements OK (${duration}ms)`);
    } else {
      console.log(` ⚠ ${ok} OK, ${fail} fallos (${duration}ms)`);
      errors.slice(0, 5).forEach(e => {
        console.log(`     [${e.idx}] ${e.msg}`);
        console.log(`         SQL: ${e.preview}`);
      });
    }
  }

  console.log('\n🏁 Migración completa.');
} catch (err) {
  console.error('\n❌ Error fatal:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
