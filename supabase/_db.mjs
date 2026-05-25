// Helper único para conectar a Postgres usando credenciales del entorno.
// Lee desde .env.local (no commiteado). Nunca hardcodear contraseñas.
import dotenv from 'dotenv';
import pg from 'pg';

// Load .env.local first (project convention), then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const { Client } = pg;

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  const host = process.env.DB_HOST;
  const password = process.env.DB_PASSWORD;
  if (!host || !password) {
    console.error('❌ Falta DB_HOST o DB_PASSWORD en .env.local');
    console.error('   Copia .env.example a .env.local y rellena las credenciales.');
    process.exit(1);
  }
  return {
    host,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password,
    ssl: { rejectUnauthorized: false },
  };
}

export async function connect() {
  const client = new Client(buildConfig());
  await client.connect();
  return client;
}

export async function withDb(fn) {
  const client = await connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
