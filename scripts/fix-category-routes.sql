-- Corrige las rutas de las categorías de "tipo de artista" del menú lateral.
-- Antes: DJs/Bailarines/Cantantes/Bandas/Instructores apuntaban a /artistas (sin filtrar),
-- por eso al entrar en Artistas se marcaban todas a la vez y ninguna filtraba.
-- Ahora cada una lleva su ?tipo= que la página de Artistas entiende (dj|dancer|singer|band|instructor).
--
-- Cómo aplicar: Supabase → SQL Editor → pega y Run. Luego recarga bailanow.com.

UPDATE public.categories SET route = '/artistas?tipo=dj'         WHERE lower(name) LIKE 'dj%';
UPDATE public.categories SET route = '/artistas?tipo=dancer'     WHERE lower(name) LIKE 'bailarin%' OR lower(name) LIKE 'bailarín%';
UPDATE public.categories SET route = '/artistas?tipo=singer'     WHERE lower(name) LIKE 'cantante%';
UPDATE public.categories SET route = '/artistas?tipo=band'       WHERE lower(name) LIKE 'banda%';
UPDATE public.categories SET route = '/artistas?tipo=instructor' WHERE lower(name) LIKE 'instructor%';

-- Verifica el resultado:
SELECT name, route, section FROM public.categories
WHERE lower(name) LIKE 'dj%' OR lower(name) LIKE 'bailarin%' OR lower(name) LIKE 'bailarín%'
   OR lower(name) LIKE 'cantante%' OR lower(name) LIKE 'banda%' OR lower(name) LIKE 'instructor%'
ORDER BY section, display_order;
