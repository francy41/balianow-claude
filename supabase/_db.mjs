/**
 * _db.mjs — Configuración compartida de conexión Postgres
 *
 * Lee credenciales de variables de entorno (.env). NUNCA hardcodear aquí.
 *
 * Variables esperadas (definidas en .env.local o .env):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * O alternativamente:
 *   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
 */
import pg from 'pg';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Carga .env.local primero (prioritario), luego .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
for (const f of ['.env.local', '.env']) {
  const p = join(root, f);
  if (existsSync(p)) loadEnv({ path: p, override: false });
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Falta la variable de entorno ${name}`);
    console.error('   Define DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en .env.local');
    console.error('   o DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require');
    process.exit(1);
  }
  return v;
}

export function createDbClient() {
  if (process.env.DATABASE_URL) {
    return new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return new pg.Client({
    host:     requireEnv('DB_HOST'),
    port:     Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user:     process.env.DB_USER || 'postgres',
    password: requireEnv('DB_PASSWORD'),
    ssl: { rejectUnauthorized: false },
  });
}
