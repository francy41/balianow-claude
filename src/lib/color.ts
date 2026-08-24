/** Convierte un hex (#RRGGBB o #RGB) al formato "R G B" que usan las variables
 *  CSS de diseño en index.css (--brand, --accent, etc.), para que Tailwind
 *  pueda aplicarles opacidad con rgb(var(--x) / <alpha-value>). */
export function hexToRgbTriplet(hex: string): string | null {
  const clean = hex.trim().replace(/^#/, '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export interface BrandColors {
  brand?: string;          // color sólido principal (hex)
  brandSecondary?: string; // segundo punto de los degradados (hex)
  brandDeep?: string;      // magenta oscuro de las tarjetas unificadas (hex)
}

/** Aplica los colores de marca como variables CSS en <html>, en vivo — sin recargar.
 *  Usado tanto por el preview del admin en SuperAdmin → Diseño Web como por la
 *  carga inicial de la app (useSiteConfigLoader) para que se vea igual para todos. */
export function applyBrandColors(colors: BrandColors) {
  const root = document.documentElement.style;
  const map: [keyof BrandColors, string][] = [
    ['brand', '--brand'],
    ['brandSecondary', '--brand-secondary'],
    ['brandDeep', '--brand-dark'],
  ];
  for (const [key, cssVar] of map) {
    const hex = colors[key];
    if (!hex) continue;
    const triplet = hexToRgbTriplet(hex);
    if (triplet) root.setProperty(cssVar, triplet);
  }
}
