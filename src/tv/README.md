# src/tv — Módulo BailaNow TV

Todo el código de **BailaNow TV** (el streaming de baile latino) vive aquí, aislado
del resto de la app pero **compartiendo** la infraestructura del ecosistema
(Supabase, Auth, Stripe, wallet).

## Contenido

- `TVHomePage.tsx` — catálogo tipo Netflix (`/tv`)
- `TVTitlePage.tsx` — ficha + reproductor con acceso por plan (`/tv/:id`)
- `TVCreatorPage.tsx` — estudio de creador (`/tv/estudio`)
- `TVAdminPage.tsx` — superadmin: moderación + regalías (`/tv/admin`)

## Relacionado (fuera de esta carpeta, por convención del repo)

- Esquema de BD: `supabase/bailanow-tv-schema.sql`
- Arquitectura y roadmap: `docs/bailanow-tv/ARCHITECTURE.md`
- Rutas: registradas en `src/App.tsx`

## Regla

BailaNow TV NO duplica auth/pagos/BD: reutiliza `../lib/supabase`, `../store/appStore`
y el Stripe existente. Mantener esa dependencia en una sola dirección (este módulo
usa lo compartido, no al revés).
