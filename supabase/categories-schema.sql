-- ── CATEGORIES TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎉',
  slug TEXT UNIQUE NOT NULL,
  route TEXT DEFAULT '/',
  section TEXT NOT NULL CHECK (section IN ('main', 'mercado', 'comunidad')),
  color_start TEXT DEFAULT '#EC407A',
  color_mid TEXT DEFAULT '#FF1493',
  color_end TEXT DEFAULT '#C2185B',
  shadow_color TEXT DEFAULT 'rgba(236, 64, 122, 0.4)',
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (active = true);
CREATE POLICY "Admin can manage categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can update categories" ON public.categories FOR UPDATE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can delete categories" ON public.categories FOR DELETE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_categories_section ON public.categories(section);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order);

-- ── SEED DEFAULT CATEGORIES ────────────────────────────────────────────
INSERT INTO public.categories (name, icon, slug, route, section, color_start, color_mid, color_end, shadow_color, display_order) VALUES
-- Main (8 categories)
('Explorador', '🧭', 'explorador', '/explorar', 'main', '#EC407A', '#FF1493', '#C2185B', 'rgba(236, 64, 122, 0.4)', 1),
('Localidades', '📍', 'localidades', '/venues', 'main', '#F06292', '#FF69B4', '#EC407A', 'rgba(240, 98, 146, 0.4)', 2),
('Eventos', '🎉', 'eventos', '/eventos', 'main', '#D81B60', '#F50057', '#C2185B', 'rgba(216, 27, 96, 0.4)', 3),
('Artistas', '🎧', 'artistas', '/artistas', 'main', '#FF6B9D', '#FF1493', '#EC407A', 'rgba(255, 107, 157, 0.4)', 4),
('Bailarines', '💃', 'bailarines', '/artistas?tipo=dancer', 'main', '#E91E63', '#F06292', '#F48FB1', 'rgba(233, 30, 99, 0.4)', 5),
('Marketplace', '🏪', 'marketplace', '/marketplace', 'main', '#AD1457', '#E91E63', '#C2185B', 'rgba(173, 20, 87, 0.4)', 6),
('Clases en vivo', '🎥', 'clases-vivo', '/live', 'main', '#FF6B9D', '#FF1493', '#FF69B4', 'rgba(255, 107, 157, 0.4)', 7),
('Comunidad', '💬', 'comunidad', '/chat', 'main', '#E91E63', '#F06292', '#AD1457', 'rgba(233, 30, 99, 0.4)', 8),

-- Mercado (4 categories)
('Ruta de Hoy', '📍', 'ruta-hoy', '/eventos?type=featured', 'mercado', '#FF5252', '#FF1493', '#FF1493', 'rgba(255, 82, 82, 0.4)', 1),
('Proyectos', '🚀', 'proyectos', '/marketplace?cat=Producción', 'mercado', '#FF6B9D', '#F06292', '#F06292', 'rgba(255, 107, 157, 0.4)', 2),
('Clasesenvivo', '🎬', 'clasesenvivo', '/live', 'mercado', '#E91E63', '#AD1457', '#AD1457', 'rgba(233, 30, 99, 0.4)', 3),
('Ofertas', '⭐', 'ofertas', '/eventos?featured=true', 'mercado', '#D81B60', '#C2185B', '#C2185B', 'rgba(216, 27, 96, 0.4)', 4),

-- Comunidad (4 categories)
('Anuncios', '📢', 'anuncios', '/chat', 'comunidad', '#FF1493', '#FF69B4', '#FF69B4', 'rgba(255, 20, 147, 0.4)', 1),
('Academia', '🎓', 'academia', '/marketplace?cat=Clases', 'comunidad', '#F06292', '#EC407A', '#EC407A', 'rgba(240, 98, 146, 0.4)', 2),
('Comunidad', '👥', 'comunidad-users', '/chat', 'comunidad', '#EC407A', '#E91E63', '#E91E63', 'rgba(236, 64, 122, 0.4)', 3),
('Chat', '💬', 'chat', '/chat', 'comunidad', '#AD1457', '#D81B60', '#D81B60', 'rgba(173, 20, 87, 0.4)', 4);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_categories()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_categories ON public.categories;
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_categories();
