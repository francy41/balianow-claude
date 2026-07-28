# CLAUDE.md — BailaNow (bailanow.com)

## Identidad del proyecto
- Nombre: BailaNow
- Descripción: Ecosistema SaaS de danza latina — artistas, venues, eventos, marketplace, radio en vivo, suscripciones premium
- Stack: React 18 + Vite 6 + TypeScript + Tailwind CSS + Zustand + Supabase + Cloudflare (Workers) + Capacitor (Android)
- Propietario: Solfa Mende / solfamendez41@gmail.com (superadmin)
- Repo: github.com/francy41/balianow-claude · rama: master
- Dominio producción: bailanow.com

## Comandos esenciales
- Desarrollo: `npm run dev` (puerto 3000)
- Build: `npm run build`
- Typecheck: `npx tsc --noEmit`
- Deploy: **automático** — todo push/merge a `master` en GitHub dispara build + deploy en Cloudflare Workers (~1-2 min). NO hay comando manual (ya no se usa Vercel).
- Ver despliegues: panel Cloudflare → proyecto `balianow-claude` → pestaña "Despliegues"
- Gestor de paquetes: npm (no usar pnpm/yarn)

## Hosting / Deploy (Cloudflare Workers)
- Web servida como assets estáticos SPA por Cloudflare Workers. GitHub conectado → deploy automático desde `master`.
- Config en `wrangler.jsonc`: `assets.not_found_handling: single-page-application` (fallback SPA sin `404.html`), `nodejs_compat`.
- Build command: `npm run build` · salida: `dist/` · Vite usa `@cloudflare/vite-plugin`.
- Dominios personalizados en el Worker: `bailanow.com` + `www.bailanow.com` (DNS + SSL gestionados por Cloudflare). Registros MX/TXT del correo (Amazon SES/Resend) intactos.
- Sitemap: `scripts/gen-sitemap.mjs` genera `public/sitemap.xml` en build tomando la Edge Function `sitemap` de Supabase (envía `VITE_SUPABASE_ANON_KEY` por si hay verify_jwt). Es no-fatal: si falla, el build continúa.
- Variables `VITE_*` viven en el panel de Cloudflare (Settings → Environment variables), no en Vercel.

## Reglas de arquitectura (no deducibles leyendo el código)
- Supabase directo (ENOTFOUND en Postgres): toda migración SQL usa el Management API REST `/v1/projects/{ref}/database/query`
- `ref` del proyecto Supabase: `lpwwdjujxwxdvyoznehp`
- RLS: la función `public.is_admin()` verifica `role IN ('admin','superadmin')` — usarla en TODAS las políticas admin
- Admin multi-rol: superadmin y admin comparten las mismas políticas RLS
- PowerShell es el shell principal (Bash pierde grep/cat/node esporádicamente en este entorno Windows)
- Commits: mensajes simples `-m "..."` — los here-strings PS con `@'...'@` rompen si el mensaje contiene paréntesis o comillas

## Estructura crítica
- `src/pages/AdminPage.tsx` — panel superadmin (~3500 líneas), cada sección es un componente separado
- `src/store/appStore.ts` — stores Zustand (auth, UI, cart, wallet, siteConfig)
- `src/lib/supabase.ts` — cliente Supabase singleton
- `src/data/mockData.ts` — datos mock de fallback (reducir su uso progresivamente)
- `src/components/AdminEditModal.tsx` — modal edición genérica con `KEY_ALIASES` para mapear camelCase→snake_case

## Carpetas que NUNCA se deben tocar
- `node_modules/`, `dist/`, `.wrangler/`, `.vercel/` (heredada, ya sin uso), `android/` (Capacitor, solo tocar con comandos específicos)

## Convenciones de código
- Componentes: PascalCase, en `src/components/` o `src/pages/`
- Sin comentarios de código salvo WHY no obvio
- Sin datos mock nuevos — si una sección necesita datos, cargarlos de Supabase con estado loading + empty state honesto
- Antes de marcar tarea completa: `npx tsc --noEmit` y `npm run build` deben pasar sin errores

## Identidad visual
- Colores: brand-orange (#F97316), grays oscuros, fondo blanco/gris-50
- Fuente display: Nunito (font-display font-black)
- NO cambiar paleta de colores ni estructura de layout sin instrucción explícita

## Idioma
- Comunicación siempre en español
- Código y comentarios en inglés

## Compact Instructions
Cuando resumas esta conversación conserva:
- Todos los cambios de esquema de BD y su razón
- Errores de RLS y sus soluciones aplicadas
- Lista de archivos modificados en la sesión
- Estado de secciones admin: cuáles usan datos reales vs mock
- Credenciales y referencias mencionadas (PAT Supabase, ref proyecto)
- Decisiones de arquitectura y por qué se tomaron
