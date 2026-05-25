import { createDbClient } from './_db.mjs';

const client = createDbClient();
await client.connect();
const uid = '273f624b-a67d-47fc-ae4d-8af48805a055';
const { rows } = await client.query(
  `INSERT INTO public.profiles (id, full_name, email, role, verified, status, avatar_url)
   VALUES ($1, $2, $3, $4, $5, $6, $7)
   ON CONFLICT (id) DO UPDATE SET role='admin', verified=true, full_name='Solfa Mende'
   RETURNING id, full_name, email, role, verified`,
  [uid, 'Solfa Mende', 'solfamendez41@gmail.com', 'admin', true, 'active', 'https://ui-avatars.com/api/?name=Solfa+Mende&background=F97316&color=fff&size=200']
);
console.log('✅ Admin creado:', JSON.stringify(rows[0]));
await client.end();
