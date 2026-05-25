-- ════════════════════════════════════════════════════════════════
-- Subcategorías: añade parent_id a categories para jerarquía
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories (parent_id);

-- Vista con conteo de hijos (útil para superadmin)
CREATE OR REPLACE VIEW public.categories_with_children AS
SELECT
  c.*,
  COALESCE((SELECT count(*) FROM public.categories WHERE parent_id = c.id), 0) AS children_count
FROM public.categories c;
