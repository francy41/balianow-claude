import { connect } from './_db.mjs';
const client = await connect();

async function run() {
  console.log('✅ Connected\n');

  // Check if admin profile exists
  const { rows } = await client.query(`SELECT * FROM public.profiles LIMIT 5`);
  console.log(`Existing profiles: ${rows.length}`);
  rows.forEach(r => console.log(`  - ${r.name} (${r.email}) role=${r.role}`));

  // Verify tables have data
  for (const table of ['artists', 'venues', 'events', 'services', 'site_config', 'bookings', 'reviews', 'tickets', 'messages', 'favorites']) {
    const { rows: [{ count }] } = await client.query(`SELECT COUNT(*) as count FROM public.${table}`);
    console.log(`  📊 ${table}: ${count} rows`);
  }

  // Verify storage buckets
  const { rows: buckets } = await client.query(`SELECT id, name, public FROM storage.buckets`);
  console.log('\nStorage buckets:');
  buckets.forEach(b => console.log(`  📦 ${b.name} (${b.public ? 'public' : 'private'})`));

  console.log('\n✅ Database setup complete!');
  console.log('\n📝 To create your admin account:');
  console.log('   1. Go to the app: https://resplendent-florentine-a72794.netlify.app/auth?tab=register');
  console.log('   2. Register with solfamende41@gmail.com');
  console.log('   3. Then run this to promote to admin:');
  console.log("   UPDATE public.profiles SET role='admin', is_verified=true, is_premium=true WHERE email='solfamende41@gmail.com';");

  await client.end();
}
run();
