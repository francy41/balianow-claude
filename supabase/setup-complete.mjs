import { createDbClient } from './_db.mjs';

const client = createDbClient();

// ── SEED DATA ────────────────────────────────────────────────
const ARTISTS = [
  { id: 'a1', name: 'DJ Mambo King', type: 'dj', genre: '{Salsa,Bachata,Merengue}', avatar: 'https://picsum.photos/seed/mambo/200', cover: 'https://picsum.photos/seed/mambo-cover/800/400', city: 'Madrid', country: 'España', rating: 4.9, reviews: 234, followers: 15200, price_from: 250, bio: 'El rey del mambo madrileño. 15 años moviendo pistas.', is_verified: true, is_premium: true, tags: '{Salsa,Mambo,Timba}', social: '{"instagram":"@mambokingdj","youtube":"MamboKingDJ"}' },
  { id: 'a2', name: 'La Reina del Flow', type: 'singer', genre: '{Reggaeton,Cumbia}', avatar: 'https://picsum.photos/seed/reina/200', cover: 'https://picsum.photos/seed/reina-cover/800/400', city: 'Barcelona', country: 'España', rating: 4.8, reviews: 189, followers: 28400, price_from: 500, bio: 'Voz poderosa del reggaeton español.', is_verified: true, is_premium: true, tags: '{Reggaeton,Perreo,Urbano}', social: '{"instagram":"@reinadelflow","tiktok":"@reinaflow"}' },
  { id: 'a3', name: 'Carlos & María Dance', type: 'dancer', genre: '{Bachata,Salsa}', avatar: 'https://picsum.photos/seed/carlos-maria/200', cover: 'https://picsum.photos/seed/dance-cover/800/400', city: 'Madrid', country: 'España', rating: 4.95, reviews: 312, followers: 45000, price_from: 300, bio: 'Pareja de baile profesional. Campeones mundiales de bachata sensual.', is_verified: true, is_premium: true, tags: '{Bachata,Sensual,Shows}', social: '{"instagram":"@carlosymaria","youtube":"CarlosMariaDance"}' },
  { id: 'a4', name: 'Orquesta Havana Club', type: 'band', genre: '{Timba,Salsa,Son}', avatar: 'https://picsum.photos/seed/havana/200', cover: 'https://picsum.photos/seed/havana-cover/800/400', city: 'Sevilla', country: 'España', rating: 4.7, reviews: 156, followers: 8900, price_from: 1200, bio: '12 músicos en vivo. Son cubano auténtico.', is_verified: true, is_premium: false, tags: '{Son,Timba,Live}', social: '{"instagram":"@havanaclubband"}' },
  { id: 'a5', name: 'DJ Tropicana', type: 'dj', genre: '{Cumbia,Reggaeton,Afrobeats}', avatar: 'https://picsum.photos/seed/tropicana/200', cover: 'https://picsum.photos/seed/tropi-cover/800/400', city: 'Valencia', country: 'España', rating: 4.6, reviews: 98, followers: 6200, price_from: 150, bio: 'Mezclas tropicales que hacen vibrar cualquier fiesta.', is_verified: false, is_premium: false, tags: '{Tropical,Cumbia,Mix}', social: '{"instagram":"@djtropicana"}' },
  { id: 'a6', name: 'Profesor Ritmo', type: 'instructor', genre: '{Salsa,Bachata,Merengue}', avatar: 'https://picsum.photos/seed/profesor/200', cover: 'https://picsum.photos/seed/prof-cover/800/400', city: 'Madrid', country: 'España', rating: 4.85, reviews: 420, followers: 12300, price_from: 40, bio: 'Instructor certificado. +5000 alumnos. Clases para todos los niveles.', is_verified: true, is_premium: true, tags: '{Clases,Principiantes,Avanzados}', social: '{"instagram":"@profesorritmo","youtube":"ProfesorRitmo"}' },
  { id: 'a7', name: 'MC Latino Fire', type: 'singer', genre: '{Reggaeton,Dembow}', avatar: 'https://picsum.photos/seed/mclatino/200', cover: 'https://picsum.photos/seed/mc-cover/800/400', city: 'Barcelona', country: 'España', rating: 4.5, reviews: 67, followers: 9800, price_from: 350, bio: 'MC y cantante urbano latino.', is_verified: false, is_premium: false, tags: '{Urbano,Dembow,Shows}', social: '{"instagram":"@mclatinofire"}' },
  { id: 'a8', name: 'Sara Kizomba', type: 'dancer', genre: '{Kizomba,Afrobeats}', avatar: 'https://picsum.photos/seed/sarakiz/200', cover: 'https://picsum.photos/seed/sara-cover/800/400', city: 'Paris', country: 'Francia', rating: 4.9, reviews: 201, followers: 34000, price_from: 200, bio: 'Bailarina y coreógrafa de kizomba y urban kiz.', is_verified: true, is_premium: true, tags: '{Kizomba,UrbanKiz,Shows}', social: '{"instagram":"@sarakizomba","tiktok":"@sarakiz"}' },
];

const VENUES = [
  { id: 'v1', name: 'Tropical House Madrid', type: 'club', city: 'Madrid', address: 'Calle Gran Vía 42', cover: 'https://picsum.photos/seed/tropical-house/800/400', avatar: 'https://picsum.photos/seed/th-avatar/200', rating: 4.7, reviews: 523, capacity: 450, is_open: true, open_hours: 'Jue-Dom 23:00-06:00', description: 'El templo de la salsa y bachata en Madrid. 3 pistas de baile.', is_premium: true, amenities: '{Pista principal,VIP,Terraza,Guardarropa}', lat: 40.4200, lng: -3.7025, price_range: 3 },
  { id: 'v2', name: 'La Clave Cubana', type: 'bar', city: 'Madrid', address: 'Calle Huertas 18', cover: 'https://picsum.photos/seed/clave-cubana/800/400', avatar: 'https://picsum.photos/seed/cc-avatar/200', rating: 4.5, reviews: 289, capacity: 150, is_open: true, open_hours: 'Mar-Dom 20:00-03:00', description: 'Bar con música cubana en vivo. Mojitos auténticos.', is_premium: false, amenities: '{Escenario,Terraza,Cocina}', lat: 40.4140, lng: -3.6980, price_range: 2 },
  { id: 'v3', name: 'Salsa Factory BCN', type: 'club', city: 'Barcelona', address: 'Carrer Marina 25', cover: 'https://picsum.photos/seed/salsa-factory/800/400', avatar: 'https://picsum.photos/seed/sf-avatar/200', rating: 4.8, reviews: 412, capacity: 600, is_open: true, open_hours: 'Vie-Sáb 23:00-06:00', description: 'La fábrica del baile en Barcelona. Eventos internacionales.', is_premium: true, amenities: '{2 Pistas,Rooftop,VIP,Parking}', lat: 41.3920, lng: 2.1890, price_range: 3 },
  { id: 'v4', name: 'Estudio Ritmo Latino', type: 'studio', city: 'Madrid', address: 'Calle Alcalá 120', cover: 'https://picsum.photos/seed/estudio-ritmo/800/400', avatar: 'https://picsum.photos/seed/er-avatar/200', rating: 4.9, reviews: 678, capacity: 80, is_open: true, open_hours: 'Lun-Sáb 10:00-22:00', description: 'Escuela de baile con los mejores profesores de España.', is_premium: true, amenities: '{3 Salas,Espejos,Sonido Pro,Vestuarios}', lat: 40.4235, lng: -3.6760, price_range: 2 },
  { id: 'v5', name: 'Azúcar Rooftop', type: 'rooftop', city: 'Valencia', address: 'Plaza del Ayuntamiento 5', cover: 'https://picsum.photos/seed/azucar-roof/800/400', avatar: 'https://picsum.photos/seed/ar-avatar/200', rating: 4.6, reviews: 198, capacity: 200, is_open: true, open_hours: 'Jue-Dom 21:00-04:00', description: 'Terraza con vistas, cócteles tropicales y baile bajo las estrellas.', is_premium: false, amenities: '{Vistas,Cócteles,DJ booth}', lat: 39.4700, lng: -0.3760, price_range: 3 },
];

const EVENTS = [
  { id: 'e1', title: 'Noche de Salsa & Bachata', description: 'La mejor noche salsera de Madrid con DJ Mambo King.', venue_id: 'v1', venue_name: 'Tropical House Madrid', city: 'Madrid', date: '2026-06-15', time: '23:00', end_time: '06:00', cover: 'https://picsum.photos/seed/salsa-night/800/400', category: '{Salsa,Bachata}', price: 15, capacity: 450, attending: 320, is_featured: true, is_premium: true, artists: '{a1,a6}', lat: 40.4200, lng: -3.7025 },
  { id: 'e2', title: 'Bachata Sensual Festival', description: '3 días de puro baile. Workshops + shows + social.', venue_id: 'v3', venue_name: 'Salsa Factory BCN', city: 'Barcelona', date: '2026-07-20', time: '10:00', end_time: '04:00', cover: 'https://picsum.photos/seed/bachata-fest/800/400', category: '{Bachata,Festival,Workshops}', price: 89, capacity: 600, attending: 480, is_featured: true, is_premium: true, artists: '{a3,a8,a6}', lat: 41.3920, lng: 2.1890 },
  { id: 'e3', title: 'Reggaeton Summer Party', description: 'La fiesta urbana más grande del verano.', venue_id: 'v5', venue_name: 'Azúcar Rooftop', city: 'Valencia', date: '2026-08-10', time: '22:00', end_time: '05:00', cover: 'https://picsum.photos/seed/reggaeton-party/800/400', category: '{Reggaeton,Urbano}', price: 20, capacity: 200, attending: 185, is_featured: false, is_premium: false, artists: '{a2,a7}', lat: 39.4700, lng: -0.3760 },
  { id: 'e4', title: 'Cuban Night Live', description: 'Orquesta Havana Club en vivo + clase de rueda de casino.', venue_id: 'v2', venue_name: 'La Clave Cubana', city: 'Madrid', date: '2026-06-28', time: '21:00', end_time: '03:00', cover: 'https://picsum.photos/seed/cuban-night/800/400', category: '{Son,Timba,Live}', price: 12, capacity: 150, attending: 130, is_featured: true, is_premium: false, artists: '{a4}', lat: 40.4140, lng: -3.6980 },
  { id: 'e5', title: 'Kizomba & Afro Fusion', description: 'Noche de kizomba, urban kiz y afrobeats.', venue_id: 'v1', venue_name: 'Tropical House Madrid', city: 'Madrid', date: '2026-07-05', time: '23:00', end_time: '05:00', cover: 'https://picsum.photos/seed/kizomba-night/800/400', category: '{Kizomba,Afrobeats}', price: 15, capacity: 450, attending: 210, is_featured: false, is_premium: false, artists: '{a5,a8}', lat: 40.4200, lng: -3.7025 },
  { id: 'e6', title: 'Masterclass Bachata Sensual', description: 'Workshop intensivo con Carlos & María.', venue_id: 'v4', venue_name: 'Estudio Ritmo Latino', city: 'Madrid', date: '2026-06-22', time: '11:00', end_time: '14:00', cover: 'https://picsum.photos/seed/masterclass/800/400', category: '{Bachata,Workshop,Clases}', price: 35, capacity: 40, attending: 38, is_featured: true, is_premium: true, artists: '{a3}', lat: 40.4235, lng: -3.6760 },
];

const SERVICES = [
  { id: 's1', artist_id: 'a1', artist_name: 'DJ Mambo King', artist_avatar: 'https://picsum.photos/seed/mambo/200', title: 'DJ Set para tu fiesta latina', description: 'Set completo de 4h con todo el equipo de sonido.', category: 'DJ Set', price: 350, delivery_days: 3, rating: 4.9, reviews: 89, orders: 156, cover: 'https://picsum.photos/seed/djset-service/800/400', tags: '{Fiesta,DJ,Sonido}', includes: '{Equipo sonido,Iluminación básica,4h DJ set,Playlist personalizada}' },
  { id: 's2', artist_id: 'a6', artist_name: 'Profesor Ritmo', artist_avatar: 'https://picsum.photos/seed/profesor/200', title: 'Clases particulares de Salsa', description: 'Clase personalizada 1-on-1 o en pareja.', category: 'Clases', price: 40, delivery_days: 1, rating: 4.85, reviews: 234, orders: 420, cover: 'https://picsum.photos/seed/clase-salsa/800/400', tags: '{Salsa,Clases,Privado}', includes: '{1h clase,Sala privada,Video resumen,Plan personalizado}' },
  { id: 's3', artist_id: 'a3', artist_name: 'Carlos & María Dance', artist_avatar: 'https://picsum.photos/seed/carlos-maria/200', title: 'Show de bachata para eventos', description: 'Coreografía espectacular para tu evento especial.', category: 'Show Baile', price: 600, delivery_days: 7, rating: 4.95, reviews: 67, orders: 89, cover: 'https://picsum.photos/seed/show-bachata/800/400', tags: '{Show,Bachata,Evento}', includes: '{Coreografía,Vestuario,Ensayo previo,15min show}' },
  { id: 's4', artist_id: 'a2', artist_name: 'La Reina del Flow', artist_avatar: 'https://picsum.photos/seed/reina/200', title: 'Actuación en vivo + DJ', description: 'Show de 1h con cantante + DJ set complementario.', category: 'Música en Vivo', price: 800, delivery_days: 5, rating: 4.8, reviews: 45, orders: 62, cover: 'https://picsum.photos/seed/live-show/800/400', tags: '{Concierto,Live,Reggaeton}', includes: '{1h actuación,DJ set 30min,Técnico sonido,Rider incluido}' },
  { id: 's5', artist_id: 'a6', artist_name: 'Profesor Ritmo', artist_avatar: 'https://picsum.photos/seed/profesor/200', title: 'Curso online Bachata 0 a Pro', description: 'Curso completo en video de bachata para todos los niveles.', category: 'Clases Online', price: 79, delivery_days: 1, rating: 4.9, reviews: 567, orders: 1230, cover: 'https://picsum.photos/seed/curso-online/800/400', tags: '{Online,Bachata,Curso}', includes: '{40 videos HD,Material PDF,Acceso ilimitado,Grupo privado}' },
];

async function run() {
  await client.connect();
  console.log('✅ Connected\n');

  // Insert artists
  for (const a of ARTISTS) {
    try {
      await client.query(`INSERT INTO public.artists (id,name,type,genre,avatar,cover,city,country,rating,reviews,followers,price_from,bio,is_verified,is_premium,tags,social)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.name, a.type, a.genre, a.avatar, a.cover, a.city, a.country, a.rating, a.reviews, a.followers, a.price_from, a.bio, a.is_verified, a.is_premium, a.tags, a.social]);
      console.log(`  🎧 Artist: ${a.name}`);
    } catch (e) { console.log(`  ⚠️ Artist ${a.name}: ${e.message.substring(0,60)}`); }
  }

  // Insert venues
  for (const v of VENUES) {
    try {
      await client.query(`INSERT INTO public.venues (id,name,type,city,address,cover,avatar,rating,reviews,capacity,is_open,open_hours,description,is_premium,amenities,lat,lng,price_range)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (id) DO NOTHING`,
        [v.id, v.name, v.type, v.city, v.address, v.cover, v.avatar, v.rating, v.reviews, v.capacity, v.is_open, v.open_hours, v.description, v.is_premium, v.amenities, v.lat, v.lng, v.price_range]);
      console.log(`  📍 Venue: ${v.name}`);
    } catch (e) { console.log(`  ⚠️ Venue ${v.name}: ${e.message.substring(0,60)}`); }
  }

  // Insert events
  for (const e of EVENTS) {
    try {
      await client.query(`INSERT INTO public.events (id,title,description,venue_id,venue_name,city,date,time,end_time,cover,category,price,capacity,attending,is_featured,is_premium,artists,lat,lng)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT (id) DO NOTHING`,
        [e.id, e.title, e.description, e.venue_id, e.venue_name, e.city, e.date, e.time, e.end_time, e.cover, e.category, e.price, e.capacity, e.attending, e.is_featured, e.is_premium, e.artists, e.lat, e.lng]);
      console.log(`  🎉 Event: ${e.title}`);
    } catch (e2) { console.log(`  ⚠️ Event ${e.title}: ${e2.message.substring(0,60)}`); }
  }

  // Insert services
  for (const s of SERVICES) {
    try {
      await client.query(`INSERT INTO public.services (id,artist_id,artist_name,artist_avatar,title,description,category,price,delivery_days,rating,reviews,orders,cover,tags,includes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.artist_id, s.artist_name, s.artist_avatar, s.title, s.description, s.category, s.price, s.delivery_days, s.rating, s.reviews, s.orders, s.cover, s.tags, s.includes]);
      console.log(`  💼 Service: ${s.title}`);
    } catch (e) { console.log(`  ⚠️ Service ${s.title}: ${e.message.substring(0,60)}`); }
  }

  // Create storage buckets via SQL (Supabase storage is managed via storage schema)
  const buckets = ['avatars', 'covers', 'gallery', 'tickets'];
  for (const b of buckets) {
    try {
      await client.query(`INSERT INTO storage.buckets (id, name, public) VALUES ($1, $1, $2) ON CONFLICT (id) DO NOTHING`, [b, b !== 'tickets']);
      console.log(`  📦 Bucket: ${b} (${b === 'tickets' ? 'private' : 'public'})`);
    } catch (e) { console.log(`  ⚠️ Bucket ${b}: ${e.message.substring(0,60)}`); }
  }

  // Storage RLS policies — allow public read on public buckets, auth upload
  try {
    // Public read for avatars, covers, gallery
    for (const b of ['avatars', 'covers', 'gallery']) {
      await client.query(`
        DO $$ BEGIN
          CREATE POLICY "Public read ${b}" ON storage.objects FOR SELECT USING (bucket_id = '${b}');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await client.query(`
        DO $$ BEGIN
          CREATE POLICY "Auth upload ${b}" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${b}' AND auth.uid() IS NOT NULL);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
    // Tickets: only owner reads
    await client.query(`
      DO $$ BEGIN
        CREATE POLICY "Auth read tickets" ON storage.objects FOR SELECT USING (bucket_id = 'tickets' AND auth.uid() IS NOT NULL);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE POLICY "Auth upload tickets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tickets' AND auth.uid() IS NOT NULL);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('  🔐 Storage policies created');
  } catch (e) { console.log(`  ⚠️ Storage policies: ${e.message.substring(0,80)}`); }

  console.log('\n🏁 Seed complete!');
  await client.end();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
