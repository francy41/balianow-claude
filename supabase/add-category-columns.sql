-- Add missing columns to categories table
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS route TEXT DEFAULT '/'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'main'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_start TEXT DEFAULT '#EC407A'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_mid TEXT DEFAULT '#FF1493'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_end TEXT DEFAULT '#C2185B'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS shadow_color TEXT DEFAULT 'rgba(236, 64, 122, 0.4)'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Update existing rows
UPDATE public.categories SET
  section = 'main',
  display_order = ROW_NUMBER() OVER (ORDER BY created_at),
  color_start = '#EC407A',
  color_mid = '#FF1493',
  color_end = '#C2185B',
  shadow_color = 'rgba(236, 64, 122, 0.4)',
  active = TRUE
WHERE section IS NULL OR section = '';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_section ON public.categories(section);
CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order);

-- Create RLS policies if not exist
DO $$ BEGIN
  CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can manage categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can update categories" ON public.categories FOR UPDATE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin can delete categories" ON public.categories FOR DELETE USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert default categories
INSERT INTO public.categories (name, icon, slug, route, section, color_start, color_mid, color_end, shadow_color, display_order, active) VALUES
('Explorador', '🧭', 'explorador', '/explorar', 'main', '#EC407A', '#FF1493', '#C2185B', 'rgba(236, 64, 122, 0.4)', 1, true),
('Localidades', '📍', 'localidades', '/venues', 'main', '#F06292', '#FF69B4', '#EC407A', 'rgba(240, 98, 146, 0.4)', 2, true),
('Eventos', '🎉', 'eventos', '/eventos', 'main', '#D81B60', '#F50057', '#C2185B', 'rgba(216, 27, 96, 0.4)', 3, true),
('Artistas', '🎧', 'artistas', '/artistas', 'main', '#FF6B9D', '#FF1493', '#EC407A', 'rgba(255, 107, 157, 0.4)', 4, true),
('Bailarines', '💃', 'bailarines', '/artistas?tipo=dancer', 'main', '#E91E63', '#F06292', '#F48FB1', 'rgba(233, 30, 99, 0.4)', 5, true),
('Marketplace', '🏪', 'marketplace', '/marketplace', 'main', '#AD1457', '#E91E63', '#C2185B', 'rgba(173, 20, 87, 0.4)', 6, true),
('Clases en vivo', '🎥', 'clases-vivo', '/live', 'main', '#FF6B9D', '#FF1493', '#FF69B4', 'rgba(255, 107, 157, 0.4)', 7, true),
('Comunidad', '💬', 'comunidad', '/chat', 'main', '#E91E63', '#F06292', '#AD1457', 'rgba(233, 30, 99, 0.4)', 8, true),
('Ruta de Hoy', '📍', 'ruta-hoy', '/eventos?type=featured', 'mercado', '#FF5252', '#FF1493', '#FF1493', 'rgba(255, 82, 82, 0.4)', 1, true),
('Proyectos', '🚀', 'proyectos', '/marketplace?cat=Producción', 'mercado', '#FF6B9D', '#F06292', '#F06292', 'rgba(255, 107, 157, 0.4)', 2, true),
('Clasesenvivo', '🎬', 'clasesenvivo', '/live', 'mercado', '#E91E63', '#AD1457', '#AD1457', 'rgba(233, 30, 99, 0.4)', 3, true),
('Ofertas', '⭐', 'ofertas', '/eventos?featured=true', 'mercado', '#D81B60', '#C2185B', '#C2185B', 'rgba(216, 27, 96, 0.4)', 4, true),
('Anuncios', '📢', 'anuncios', '/chat', 'comunidad', '#FF1493', '#FF69B4', '#FF69B4', 'rgba(255, 20, 147, 0.4)', 1, true),
('Academia', '🎓', 'academia', '/marketplace?cat=Clases', 'comunidad', '#F06292', '#EC407A', '#EC407A', 'rgba(240, 98, 146, 0.4)', 2, true),
('Comunidad', '👥', 'comunidad-users', '/chat', 'comunidad', '#EC407A', '#E91E63', '#E91E63', 'rgba(236, 64, 122, 0.4)', 3, true),
('Chat', '💬', 'chat', '/chat', 'comunidad', '#AD1457', '#D81B60', '#D81B60', 'rgba(173, 20, 87, 0.4)', 4, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  section = EXCLUDED.section,
  color_start = EXCLUDED.color_start,
  color_mid = EXCLUDED.color_mid,
  color_end = EXCLUDED.color_end,
  shadow_color = EXCLUDED.shadow_color,
  active = EXCLUDED.active;
