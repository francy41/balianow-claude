import { connect } from './_db.mjs';
const client = await connect();

async function run() {
  // Check what columns services has that have NOT NULL
  const { rows } = await client.query(`SELECT column_name, is_nullable, data_type, column_default FROM information_schema.columns WHERE table_name='services' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('Services columns:');
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} ${r.is_nullable === 'NO' ? 'NOT NULL' : ''} default=${r.column_default || 'none'}`));

  // Fix: make name nullable or add default, then insert
  try {
    await client.query(`ALTER TABLE public.services ALTER COLUMN name DROP NOT NULL`);
    console.log('\n✅ Fixed: name column now nullable');
  } catch(e) { console.log('name fix:', e.message.substring(0,60)); }

  const services = [
    { artist_id: 'a1', artist_name: 'DJ Mambo King', artist_avatar: 'https://picsum.photos/seed/mambo/200', title: 'DJ Set para tu fiesta latina', description: 'Set completo de 4h con todo el equipo de sonido.', category: 'DJ Set', price: 350, delivery_days: 3, rating: 4.9, reviews: 89, orders: 156, cover: 'https://picsum.photos/seed/djset-service/800/400', tags: '{Fiesta,DJ,Sonido}', includes: '{Equipo sonido,Iluminación básica,4h DJ set,Playlist personalizada}' },
    { artist_id: 'a6', artist_name: 'Profesor Ritmo', artist_avatar: 'https://picsum.photos/seed/profesor/200', title: 'Clases particulares de Salsa', description: 'Clase personalizada 1-on-1 o en pareja.', category: 'Clases', price: 40, delivery_days: 1, rating: 4.85, reviews: 234, orders: 420, cover: 'https://picsum.photos/seed/clase-salsa/800/400', tags: '{Salsa,Clases,Privado}', includes: '{1h clase,Sala privada,Video resumen,Plan personalizado}' },
    { artist_id: 'a3', artist_name: 'Carlos & María Dance', artist_avatar: 'https://picsum.photos/seed/carlos-maria/200', title: 'Show de bachata para eventos', description: 'Coreografía espectacular para tu evento especial.', category: 'Show Baile', price: 600, delivery_days: 7, rating: 4.95, reviews: 67, orders: 89, cover: 'https://picsum.photos/seed/show-bachata/800/400', tags: '{Show,Bachata,Evento}', includes: '{Coreografía,Vestuario,Ensayo previo,15min show}' },
    { artist_id: 'a2', artist_name: 'La Reina del Flow', artist_avatar: 'https://picsum.photos/seed/reina/200', title: 'Actuación en vivo + DJ', description: 'Show de 1h con cantante + DJ set complementario.', category: 'Música en Vivo', price: 800, delivery_days: 5, rating: 4.8, reviews: 45, orders: 62, cover: 'https://picsum.photos/seed/live-show/800/400', tags: '{Concierto,Live,Reggaeton}', includes: '{1h actuación,DJ set 30min,Técnico sonido,Rider incluido}' },
    { artist_id: 'a6', artist_name: 'Profesor Ritmo', artist_avatar: 'https://picsum.photos/seed/profesor/200', title: 'Curso online Bachata 0 a Pro', description: 'Curso completo en video de bachata para todos los niveles.', category: 'Clases Online', price: 79, delivery_days: 1, rating: 4.9, reviews: 567, orders: 1230, cover: 'https://picsum.photos/seed/curso-online/800/400', tags: '{Online,Bachata,Curso}', includes: '{40 videos HD,Material PDF,Acceso ilimitado,Grupo privado}' },
  ];

  for (const s of services) {
    try {
      const { rows } = await client.query(`INSERT INTO public.services (artist_id,artist_name,artist_avatar,title,description,category,price,delivery_days,rating,reviews,orders,cover,tags,includes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [s.artist_id, s.artist_name, s.artist_avatar, s.title, s.description, s.category, s.price, s.delivery_days, s.rating, s.reviews, s.orders, s.cover, s.tags, s.includes]);
      console.log(`  💼 ${s.title} → ${rows[0].id}`);
    } catch (e) { console.log(`  ❌ ${s.title}: ${e.message.substring(0,80)}`); }
  }

  await client.end();
}
run();
