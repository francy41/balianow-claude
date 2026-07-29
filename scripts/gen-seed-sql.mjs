// Genera scripts/seed-demo.sql a partir de los datos mock (ARTISTS/EVENTS/VENUES).
// Los registros se insertan SIN dueño (user_id / created_by = NULL) → "sin reclamar".
// Idempotente: ON CONFLICT (id) DO NOTHING. Uso: node scripts/gen-seed-sql.mjs
import { build } from 'esbuild'
import { writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const tmp = resolve('scripts/.mock.mjs')
await build({ entryPoints: ['src/data/mockData.ts'], outfile: tmp, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' })
const { ARTISTS, EVENTS, VENUES } = await import(pathToFileURL(tmp).href)

const s = (v) => (v === null || v === undefined) ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
const n = (v) => (v === null || v === undefined || isNaN(Number(v))) ? '0' : String(Number(v))
const b = (v) => (v ? 'TRUE' : 'FALSE')
const arr = (a) => (Array.isArray(a) && a.length) ? `ARRAY[${a.map(s).join(',')}]::text[]` : `'{}'::text[]`
const j = (o) => `'${JSON.stringify(o ?? {}).replace(/'/g, "''")}'::jsonb`

const venueIds = new Set(VENUES.map(v => v.id))
const ARTIST_TYPES = new Set(['dj', 'dancer', 'singer', 'band', 'instructor'])
const VENUE_TYPES = new Set(['club', 'bar', 'studio', 'restaurant', 'rooftop', 'lounge'])
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)

let sql = `-- ============================================================
-- BailaNow — Datos DEMO (perfiles "sin reclamar")
-- Generado automáticamente desde src/data/mockData.ts
-- Cómo ejecutar: Supabase → SQL Editor → New query → pegar → Run
-- Seguro y repetible: ON CONFLICT (id) DO NOTHING (no duplica ni borra nada).
-- Todos los registros van SIN dueño (user_id/created_by NULL) = solo escaparate,
-- reclamables; no pueden transaccionar hasta que un dueño real los reclame.
-- ============================================================

BEGIN;

-- ── VENUES (locales demo) ──────────────────────────────────
`
for (const v of VENUES) {
  const type = VENUE_TYPES.has(v.type) ? v.type : 'club'
  sql += `INSERT INTO public.venues (id, user_id, name, type, city, address, cover, avatar, rating, reviews, capacity, is_open, open_hours, description, is_premium, amenities, lat, lng, price_range) VALUES (${s(v.id)}, NULL, ${s(v.name)}, ${s(type)}, ${s(v.city)}, ${s(v.address)}, ${s(v.cover)}, ${s(v.avatar)}, ${n(v.rating)}, ${n(v.reviews)}, ${n(v.capacity)}, ${b(v.isOpen)}, ${s(v.openHours)}, ${s(v.description)}, ${b(v.isPremium)}, ${arr(v.amenities)}, ${n(v.lat)}, ${n(v.lng)}, ${[1,2,3,4].includes(v.priceRange) ? v.priceRange : 2}) ON CONFLICT (id) DO NOTHING;\n`
}

sql += `\n-- ── ARTISTS (artistas/DJs/bailarines demo) ─────────────────\n`
for (const a of ARTISTS) {
  const type = ARTIST_TYPES.has(a.type) ? a.type : 'dj'
  sql += `INSERT INTO public.artists (id, user_id, name, type, genre, avatar, cover, city, country, rating, reviews, followers, price_from, currency, bio, is_live, is_verified, is_premium, tags, social, availability, completed_bookings, performance_style, languages, featured_video, featured_video_title, response_time, total_streams, total_stream_hours) VALUES (${s(a.id)}, NULL, ${s(a.name)}, ${s(type)}, ${arr(a.genre)}, ${s(a.avatar)}, ${s(a.cover)}, ${s(a.city)}, ${s(a.country)}, ${n(a.rating)}, ${n(a.reviews)}, ${n(a.followers)}, ${n(a.priceFrom)}, ${s(a.currency || 'EUR')}, ${s(a.bio)}, ${b(a.isLive)}, ${b(a.isVerified)}, ${b(a.isPremium)}, ${arr(a.tags)}, ${j(a.social)}, ${arr(a.availability)}, ${n(a.completedBookings)}, ${s(a.performanceStyle || '')}, ${arr(a.languages)}, ${s(a.featuredVideo || '')}, ${s(a.featuredVideoTitle || '')}, ${s(a.responseTime || '')}, ${n(a.totalStreams)}, ${n(a.totalStreamHours)}) ON CONFLICT (id) DO NOTHING;\n`
}

sql += `\n-- ── EVENTS (eventos demo) ──────────────────────────────────\n`
let skipped = 0
for (const e of EVENTS) {
  if (!isDate(e.date)) { skipped++; continue } // events.date es NOT NULL DATE
  const venueId = venueIds.has(e.venueId) ? s(e.venueId) : 'NULL' // respeta FK a venues
  sql += `INSERT INTO public.events (id, title, description, venue_id, venue_name, city, date, time, end_time, cover, category, price, currency, capacity, attending, is_online, is_featured, is_premium, artists, lat, lng, created_by) VALUES (${s(e.id)}, ${s(e.title)}, ${s(e.description)}, ${venueId}, ${s(e.venueName)}, ${s(e.city)}, ${s(e.date.slice(0,10))}, ${s(e.time)}, ${s(e.endTime)}, ${s(e.cover)}, ${arr(e.category)}, ${n(e.price)}, ${s(e.currency || 'EUR')}, ${n(e.capacity)}, ${n(e.attending)}, ${b(e.isOnline)}, ${b(e.isFeatured)}, ${b(e.isPremium)}, ${arr(e.artists)}, ${n(e.lat)}, ${n(e.lng)}, NULL) ON CONFLICT (id) DO NOTHING;\n`
}

sql += `\nCOMMIT;\n\n-- Resumen: ${VENUES.length} venues, ${ARTISTS.length} artistas, ${EVENTS.length - skipped} eventos${skipped ? ` (${skipped} eventos omitidos por fecha inválida)` : ''}.\n`

await writeFile('scripts/seed-demo.sql', sql, 'utf8')
await rm(tmp, { force: true })
console.log(`OK → scripts/seed-demo.sql`)
console.log(`   ${VENUES.length} venues · ${ARTISTS.length} artistas · ${EVENTS.length - skipped} eventos${skipped ? ` (${skipped} omitidos)` : ''}`)
