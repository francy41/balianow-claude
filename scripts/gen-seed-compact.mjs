// Versión COMPACTA del seed (multi-fila, columnas esenciales) para pegar fácil.
// Mantiene todos los registros pero mucho más pequeño. Sin dueño = "sin reclamar".
import { build } from 'esbuild'
import { writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const tmp = resolve('scripts/.mock2.mjs')
await build({ entryPoints: ['src/data/mockData.ts'], outfile: tmp, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const { ARTISTS, EVENTS, VENUES } = await import(pathToFileURL(tmp).href)

const s = (v) => (v === null || v === undefined) ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
const n = (v) => (v === null || v === undefined || isNaN(Number(v))) ? '0' : String(Number(v))
const b = (v) => (v ? 'true' : 'false')
const arr = (a) => (Array.isArray(a) && a.length) ? `'{${a.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(',')}}'` : `'{}'`
const venueIds = new Set(VENUES.map(v => v.id))
const AT = new Set(['dj', 'dancer', 'singer', 'band', 'instructor'])
const VT = new Set(['club', 'bar', 'studio', 'restaurant', 'rooftop', 'lounge'])
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)

let sql = `-- BailaNow · datos DEMO compactos (sin reclamar). Pegar en Supabase SQL Editor y Correr.\nBEGIN;\n`

sql += `\nINSERT INTO public.venues (id,user_id,name,type,city,cover,avatar,rating,reviews,capacity,is_open,is_premium,price_range) VALUES\n`
sql += VENUES.map(v => `(${s(v.id)},NULL,${s(v.name)},${s(VT.has(v.type) ? v.type : 'club')},${s(v.city)},${s(v.cover)},${s(v.avatar)},${n(v.rating)},${n(v.reviews)},${n(v.capacity)},${b(v.isOpen)},${b(v.isPremium)},${[1,2,3,4].includes(v.priceRange) ? v.priceRange : 2})`).join(',\n')
sql += `\nON CONFLICT (id) DO NOTHING;\n`

sql += `\nINSERT INTO public.artists (id,user_id,name,type,genre,avatar,cover,city,country,rating,reviews,followers,price_from,is_verified,is_premium) VALUES\n`
sql += ARTISTS.map(a => `(${s(a.id)},NULL,${s(a.name)},${s(AT.has(a.type) ? a.type : 'dj')},${arr(a.genre)},${s(a.avatar)},${s(a.cover)},${s(a.city)},${s(a.country)},${n(a.rating)},${n(a.reviews)},${n(a.followers)},${n(a.priceFrom)},${b(a.isVerified)},${b(a.isPremium)})`).join(',\n')
sql += `\nON CONFLICT (id) DO NOTHING;\n`

const evs = EVENTS.filter(e => isDate(e.date))
sql += `\nINSERT INTO public.events (id,title,venue_id,venue_name,city,date,time,cover,category,price,capacity,attending,is_featured,is_premium,created_by) VALUES\n`
sql += evs.map(e => `(${s(e.id)},${s(e.title)},${venueIds.has(e.venueId) ? s(e.venueId) : 'NULL'},${s(e.venueName)},${s(e.city)},${s(e.date.slice(0,10))},${s(e.time)},${s(e.cover)},${arr(e.category)},${n(e.price)},${n(e.capacity)},${n(e.attending)},${b(e.isFeatured)},${b(e.isPremium)},NULL)`).join(',\n')
sql += `\nON CONFLICT (id) DO NOTHING;\n`

sql += `\nCOMMIT;\n`

await writeFile('scripts/seed-demo-compact.sql', sql, 'utf8')
await rm(tmp, { force: true })
console.log(`OK compact: ${Buffer.byteLength(sql)} bytes · ${VENUES.length} venues, ${ARTISTS.length} artistas, ${evs.length} eventos`)
