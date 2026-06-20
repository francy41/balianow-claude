# CLAUDE.md — BailaNow (bailanow.com)

## Identidad del proyecto
- Nombre: BailaNow
- Descripción: Ecosistema SaaS de danza latina — artistas, venues, eventos, marketplace, radio en vivo, suscripciones premium
- Stack: React 18 + Vite 6 + TypeScript + Tailwind CSS + Zustand + Supabase + Vercel + Capacitor (Android)
- Propietario: Solfa Mende / solfamendez41@gmail.com (superadmin)
- Repo: github.com/francy41/balianow-claude · rama: master
- Dominio producción: bailanow.com

## Comandos esenciales
- Desarrollo: `npm run dev` (puerto 3000)
- Build: `npm run build`
- Typecheck: `npx tsc --noEmit`
- Deploy: `npm run build && npx vercel --prod --yes` → luego `npx vercel alias set <url> bailanow.com`
- Gestor de paquetes: npm (no usar pnpm/yarn)

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
- `node_modules/`, `dist/`, `.vercel/`, `android/` (Capacitor, solo tocar con comandos específicos)

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
