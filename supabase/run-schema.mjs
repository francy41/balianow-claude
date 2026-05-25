/**
 * run-schema.mjs — Ejecuta un fichero SQL contra la BD
 *
 * Uso:
 *   node supabase/run-schema.mjs <fichero.sql>
 *
 * Ej:
 *   node supabase/run-schema.mjs add-profile-geo.sql
 *
 * Para aplicar TODAS las migraciones pendientes, usa:
 *   npm run db:migrate
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createDbClient } from './_db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || 'schema.sql';
const sql = readFileSync(join(__dirname, file), 'utf-8');

const client = createDbClient();

// Split SQL into individual statements, respecting $$ blocks
function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let inDollar = false;
  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inDollar) {
      continue;
    }
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

try {
  await client.connect();
  console.log('✅ Connected to PostgreSQL\n');

  const statements = splitStatements(sql);
  let ok = 0, fail = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      ok++;
      console.log(`  ✅ [${i+1}/${statements.length}] ${preview}...`);
    } catch (err) {
      fail++;
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`  ⚠️ [${i+1}/${statements.length}] Already exists — skipped`);
      } else {
        console.log(`  ❌ [${i+1}/${statements.length}] ${err.message.substring(0, 100)}`);
        console.log(`     Statement: ${preview}`);
      }
    }
  }

  console.log(`\n🏁 Done: ${ok} succeeded, ${fail} skipped/failed`);
} catch (err) {
  console.error('❌ Connection error:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
