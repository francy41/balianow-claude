import { createDbClient } from './_db.mjs';

const client = createDbClient();

// We need to check column types first, then fix id columns that are UUID instead of TEXT
async function run() {
  await client.connect();
  console.log('✅ Connected\n');

  // Check id column types
  const { rows: cols } = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'id'
    AND table_name IN ('venues','events','services','artists')
    ORDER BY table_name
  `);
  console.log('Column types:');
  cols.forEach(c => console.log(`  ${c.table_name}.${c.column_name} = ${c.data_type}`));

  // For UUID tables, we'll use gen_random_uuid() style deterministic UUIDs
  // Using uuid_generate_v5 with a namespace to make them reproducible
  const uuidMap = {};

  // Generate deterministic UUIDs from simple IDs
  for (const table of ['venues', 'events', 'services']) {
    const col = cols.find(c => c.table_name === table);
    if (col && col.data_type === 'uuid') {
      console.log(`\n  🔄 ${table}: UUID type — generating UUIDs...`);
    }
  }

  // Venues with real UUIDs
  const venues = [
    { name: 'Tropical House Madrid', type: 'club', city: 'Madrid', address: 'Calle Gran Vía 42', cover: 'https://picsum.photos/seed/tropical-house/800/400', avatar: 'https://picsum.photos/seed/th-avatar/200', rating: 4.7, reviews: 523, capacity: 450, is_open: true, open_hours: 'Jue-Dom 23:00-06:00', description: 'El templo de la salsa y bachata en Madrid. 3 pistas de baile.', is_premium: true, amenities: '{Pista principal,VIP,Terraza,Guardarropa}', lat: 40.4200, lng: -3.7025, price_range: 3 },
    { name: 'La Clave Cubana', type: 'bar', city: 'Madrid', address: 'Calle Huertas 18', cover: 'https://picsum.photos/seed/clave-cubana/800/400', avatar: 'https://picsum.photos/seed/cc-avatar/200', rating: 4.5, reviews: 289, capacity: 150, is_open: true, open_hours: 'Mar-Dom 20:00-03:00', description: 'Bar con música cubana en vivo. Mojitos auténticos.', is_premium: false, amenities: '{Escenario,Terraza,Cocina}', lat: 40.4140, lng: -3.6980, price_range: 2 },
    { name: 'Salsa Factory BCN', type: 'club', city: 'Barcelona', address: 'Carrer Marina 25', cover: 'https://picsum.photos/seed/salsa-factory/800/400', avatar: 'https://picsum.photos/seed/sf-avatar/200', rating: 4.8, reviews: 412, capacity: 600, is_open: true, open_hours: 'Vie-Sáb 23:00-06:00', description: 'La fábrica del baile en Barcelona. Eventos internacionales.', is_premium: true, amenities: '{2 Pistas,Rooftop,VIP,Parking}', lat: 41.3920, lng: 2.1890, price_range: 3 },
    { name: 'Estudio Ritmo Latino', type: 'studio', city: 'Madrid', address: 'Calle Alcalá 120', cover: 'https://picsum.photos/seed/estudio-ritmo/800/400', avatar: 'https://picsum.photos/seed/er-avatar/200', rating: 4.9, reviews: 678, capacity: 80, is_open: true, open_hours: 'Lun-Sáb 10:00-22:00', description: 'Escuela de baile con los mejores profesores de España.', is_premium: true, amenities: '{3 Salas,Espejos,Sonido Pro,Vestuarios}', lat: 40.4235, lng: -3.6760, price_range: 2 },
    { name: 'Azúcar Rooftop', type: 'rooftop', city: 'Valencia', address: 'Plaza del Ayuntamiento 5', cover: 'https://picsum.photos/seed/azucar-roof/800/400', avatar: 'https://picsum.photos/seed/ar-avatar/200', rating: 4.6, reviews: 198, capacity: 200, is_open: true, open_hours: 'Jue-Dom 21:00-04:00', description: 'Terraza con vistas, cócteles tropicales y baile bajo las estrellas.', is_premium: false, amenities: '{Vistas,Cócteles,DJ booth}', lat: 39.4700, lng: -0.3760, price_range: 3 },
  ];

  const venueIds = [];
  for (const v of venues) {
    try {
      const { rows } = await client.query(`INSERT INTO public.venues (name,type,city,address,cover,avatar,rating,reviews,capacity,is_open,open_hours,description,is_premium,amenities,lat,lng,price_range)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
        [v.name, v.type, v.city, v.address, v.cover, v.avatar, v.rating, v.reviews, v.capacity, v.is_open, v.open_hours, v.description, v.is_premium, v.amenities, v.lat, v.lng, v.price_range]);
      venueIds.push(rows[0].id);
      console.log(`  📍 Venue: ${v.name} → ${rows[0].id}`);
    } catch (e) {
      console.log(`  ⚠️ Venue ${v.name}: ${e.message.substring(0,60)}`);
      venueIds.push(null);
    }
  }

  // Events
  const events = [
    { title: 'Noche de Salsa & Bachata', description: 'La mejor noche salsera de Madrid con DJ Mambo King.', venue_idx: 0, city: 'Madrid', date: '2026-06-15', time: '23:00', end_time: '06:00', cover: 'https://picsum.photos/seed/salsa-night/800/400', category: '{Salsa,Bachata}', price: 15, capacity: 450, attending: 320, is_featured: true, is_premium: true, artists: '{a1,a6}', lat: 40.4200, lng: -3.7025 },
    { title: 'Bachata Sensual Festival', description: '3 días de puro baile. Workshops + shows + social.', venue_idx: 2, city: 'Barcelona', date: '2026-07-20', time: '10:00', end_time: '04:00', cover: 'https://picsum.photos/seed/bachata-fest/800/400', category: '{Bachata,Festival,Workshops}', price: 89, capacity: 600, attending: 480, is_featured: true, is_premium: true, artists: '{a3,a8,a6}', lat: 41.3920, lng: 2.1890 },
    { title: 'Reggaeton Summer Party', description: 'La fiesta urbana más grande del verano.', venue_idx: 4, city: 'Valencia', date: '2026-08-10', time: '22:00', end_time: '05:00', cover: 'https://picsum.photos/seed/reggaeton-party/800/400', category: '{Reggaeton,Urbano}', price: 20, capacity: 200, attending: 185, is_featured: false, is_premium: false, artists: '{a2,a7}', lat: 39.4700, lng: -0.3760 },
    { title: 'Cuban Night Live', description: 'Orquesta Havana Club en vivo + clase de rueda de casino.', venue_idx: 1, city: 'Madrid', date: '2026-06-28', time: '21:00', end_time: '03:00', cover: 'https://picsum.photos/seed/cuban-night/800/400', category: '{Son,Timba,Live}', price: 12, capacity: 150, attending: 130, is_featured: true, is_premium: false, artists: '{a4}', lat: 40.4140, lng: -3.6980 },
    { title: 'Kizomba & Afro Fusion', description: 'Noche de kizomba, urban kiz y afrobeats.', venue_idx: 0, city: 'Madrid', date: '2026-07-05', time: '23:00', end_time: '05:00', cover: 'https://picsum.photos/seed/kizomba-night/800/400', category: '{Kizomba,Afrobeats}', price: 15, capacity: 450, attending: 210, is_featured: false, is_premium: false, artists: '{a5,a8}', lat: 40.4200, lng: -3.7025 },
    { title: 'Masterclass Bachata Sensual', description: 'Workshop intensivo con Carlos & María.', venue_idx: 3, city: 'Madrid', date: '2026-06-22', time: '11:00', end_time: '14:00', cover: 'https://picsum.photos/seed/masterclass/800/400', category: '{Bachata,Workshop,Clases}', price: 35, capacity: 40, attending: 38, is_featured: true, is_premium: true, artists: '{a3}', lat: 40.4235, lng: -3.6760 },
  ];

  for (const e of events) {
    const venueId = venueIds[e.venue_idx] || null;
    const venueName = venues[e.venue_idx]?.name || '';
    try {
      const { rows } = await client.query(`INSERT INTO public.events (title,description,venue_id,venue_name,city,date,time,end_time,cover,category,price,capacity,attending,is_featured,is_premium,artists,lat,lng)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [e.title, e.description, venueId, venueName, e.city, e.date, e.time, e.end_time, e.cover, e.category, e.price, e.capacity, e.attending, e.is_featured, e.is_premium, e.artists, e.lat, e.lng]);
      console.log(`  🎉 Event: ${e.title} → ${rows[0].id}`);
    } catch (e2) { console.log(`  ⚠️ Event ${e.title}: ${e2.message.substring(0,80)}`); }
  }

  // Services
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
      console.log(`  💼 Service: ${s.title} → ${rows[0].id}`);
    } catch (e) { console.log(`  ⚠️ Service ${s.title}: ${e.message.substring(0,80)}`); }
  }

  console.log('\n🏁 All seed data inserted!');
  await client.end();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
