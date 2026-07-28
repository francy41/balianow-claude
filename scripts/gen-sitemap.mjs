// Genera public/sitemap.xml en tiempo de build tomando el contenido de la
// Edge Function `sitemap` de Supabase. Vite copia public/ a la salida, así que
// el archivo queda servido en https://bailanow.com/sitemap.xml como XML real.
//
// Diseño defensivo: si la descarga falla, NO rompe el build. Simplemente no se
// actualiza el sitemap y el resto del despliegue continúa con normalidad.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lpwwdjujxwxdvyoznehp.supabase.co'
const SITEMAP_FN = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/sitemap`
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sitemap.xml')

// La clave anónima (pública) va en el entorno de build de Cloudflare. Si la
// Edge Function tiene verify_jwt activo, esta cabecera la deja pasar; si es
// pública, se ignora sin efecto. Se ignora cualquier placeholder de .env.local.
const ANON = process.env.VITE_SUPABASE_ANON_KEY || ''
const headers = { Accept: 'application/xml' }
if (ANON && !/^placeh/i.test(ANON)) {
  headers.apikey = ANON
  headers.Authorization = `Bearer ${ANON}`
}

try {
  const res = await fetch(SITEMAP_FN, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  if (!/<urlset|<sitemapindex/i.test(xml)) throw new Error('la respuesta no parece un sitemap XML')
  await writeFile(OUT, xml, 'utf8')
  console.log(`[sitemap] OK · ${xml.length} bytes escritos en public/sitemap.xml`)
} catch (err) {
  console.warn(`[sitemap] AVISO: no se pudo generar (${err.message}). El build continúa sin actualizar el sitemap.`)
}
