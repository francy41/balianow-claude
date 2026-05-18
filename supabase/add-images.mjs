import pg from 'pg';
const client = new pg.Client({
  host: 'db.lpwwdjujxwxdvyoznehp.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '@Solfa11223344@',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const sql = `ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`;
await client.query(sql);

const updateSql = `
UPDATE public.categories SET image_url = CASE slug
  WHEN 'explorador' THEN 'https://picsum.photos/seed/explorer2024/800/400'
  WHEN 'localidades' THEN 'https://picsum.photos/seed/venues2024/800/400'
  WHEN 'eventos' THEN 'https://picsum.photos/seed/events2024/800/400'
  WHEN 'artistas' THEN 'https://picsum.photos/seed/artists2024/800/400'
  WHEN 'bailarines' THEN 'https://picsum.photos/seed/dancers2024/800/400'
  WHEN 'marketplace' THEN 'https://picsum.photos/seed/marketplace2024/800/400'
  WHEN 'clases-vivo' THEN 'https://picsum.photos/seed/classes2024/800/400'
  WHEN 'comunidad' THEN 'https://picsum.photos/seed/community2024/800/400'
  WHEN 'ruta-hoy' THEN 'https://picsum.photos/seed/route2024/800/400'
  WHEN 'proyectos' THEN 'https://picsum.photos/seed/projects2024/800/400'
  WHEN 'clasesenvivo' THEN 'https://picsum.photos/seed/live2024/800/400'
  WHEN 'ofertas' THEN 'https://picsum.photos/seed/offers2024/800/400'
  WHEN 'anuncios' THEN 'https://picsum.photos/seed/announcements2024/800/400'
  WHEN 'academia' THEN 'https://picsum.photos/seed/academy2024/800/400'
  WHEN 'comunidad-users' THEN 'https://picsum.photos/seed/communityusers2024/800/400'
  WHEN 'chat' THEN 'https://picsum.photos/seed/chat2024/800/400'
  ELSE 'https://picsum.photos/seed/category2024/800/400'
END;
`;
await client.query(updateSql);

console.log('✓ Columna image_url agregada');
console.log('✓ Imágenes actualizadas en todas las categorías');
await client.end();
