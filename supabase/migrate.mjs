#!/usr/bin/env node
/**
 * Sistema de migraciones idempotente.
 * - Crea tabla public._migrations si no existe
 * - Aplica .sql nuevos por orden alfabético
 * - Tracking por hash sha256 (re-ejecuta si el contenido cambia con --force)
 *
 * Uso:
 *   npm run db:migrate                            # aplica todas las pendientes
 *   npm run db:migrate:dry                        # dry-run, no ejecuta
 *   npm run db:migrate -- --force file.sql        # re-aplica una concreta
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDb } from './_db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry') || args.includes('--dry-run');
const forceIdx = args.indexOf('--force');
const forceFile = forceIdx >= 0 ? args[forceIdx + 1] : null;

async function main() {
  const files = (await readdir(__dirname))
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No hay archivos .sql en supabase/.');
    return;
  }

  await withDb(async (db) => {
    // tracking table
    await db.query(`
      CREATE TABLE IF NOT EXISTS public._migrations (
        filename   text PRIMARY KEY,
        hash       text NOT NULL,
        applied_at timestamptz DEFAULT now()
      );
    `);

    const { rows } = await db.query('SELECT filename, hash FROM public._migrations');
    const applied = new Map(rows.map(r => [r.filename, r.hash]));

    let count = 0, skipped = 0, failed = 0;

    for (const file of files) {
      const fullPath = join(__dirname, file);
      const sql = await readFile(fullPath, 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const prev = applied.get(file);
      const isForced = forceFile === file;

      if (prev === hash && !isForced) {
        skipped++;
        continue;
      }

      const action = prev ? (isForced ? '🔁 re-apply' : '🔄 update') : '🆕 apply';
      console.log(`${action} → ${file}`);

      if (dryRun) {
        count++;
        continue;
      }

      try {
        await db.query('BEGIN');
        await db.query(sql);
        await db.query(
          `INSERT INTO public._migrations (filename, hash)
           VALUES ($1, $2)
           ON CONFLICT (filename) DO UPDATE SET hash = EXCLUDED.hash, applied_at = now()`,
          [file, hash]
        );
        await db.query('COMMIT');
        count++;
        console.log(`   ✓ OK`);
      } catch (err) {
        await db.query('ROLLBACK').catch(() => {});
        failed++;
        console.error(`   ✗ ERROR en ${file}:`, err.message);
      }
    }

    console.log(`\n${dryRun ? '[DRY-RUN] ' : ''}Aplicadas: ${count}  ·  Saltadas: ${skipped}  ·  Fallidas: ${failed}`);
    if (failed > 0) process.exit(1);
  });
}

main().catch(err => {
  console.error('Migración abortada:', err);
  process.exit(1);
});
