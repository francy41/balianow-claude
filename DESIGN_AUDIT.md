# DESIGN_AUDIT.md — Auditoría previa al upgrade visual

Generada por grep sobre `src/**/*.{ts,tsx,css}` antes de tocar nada. Objetivo: cuantificar la dispersión actual para poder reducirla a un sistema de tokens.

## Color — hex hardcodeados más repetidos

| Hex | Ocurrencias | Uso aparente |
|---|---|---|
| `#ff3e6c` | 40 | rosa/rojo alternativo (no es el brand `#EC4899`) |
| `#ff8c42` | 33 | naranja/coral — ya funciona como acento secundario de facto |
| `#0a0a0a` | 32 | negro casi puro (fondo oscuro) |
| `#0a0a0f` | 25 | variante de negro con tinte frío |
| `#EC4899` | 24 | **brand pink oficial** |
| `#1a1a2e`, `#0f0f1e`, `#060608`, `#0e0e14`, `#0a0a18`, `#0e0e1a`, `#1a0033` | 4–9 c/u | ~7 variantes distintas de "fondo oscuro", todas ligeramente distintas, sin nombre común |
| `#3B82F6` (info), `#F59E0B` (warning), `#10B981` (success), `#ef4444`/`#E11D48` (error) | 4–8 c/u | semánticos ya usados pero no centralizados |
| `#8B5CF6`, `#7C3AED`, `#a855f7`, `#06B6D4`, `#fbbf24` | 4–7 c/u | acentos sueltos sin sistema |

**Conclusión**: hay al menos **8 tonos de "negro/fondo oscuro" distintos** compitiendo entre sí y **más de 15 acentos de color** sin relación entre ellos. El rosa de marca (`#EC4899`) es minoritario frente a variantes no oficiales (`#ff3e6c`). Esto es la causa principal de que la app no se perciba coherente.

## Radios

`rounded-full` (665), `rounded-xl` (657), `rounded-lg` (492), `rounded-2xl` (474), `rounded-3xl` (100), + variantes sueltas (`rounded-t`, `rounded-md`, `rounded-bl`, etc.)

**Conclusión**: prácticamente toda la escala de Tailwind está en uso simultáneamente sin criterio (xl/lg/2xl mezclados en contextos similares). Se reduce a 3 niveles con significado fijo: `rounded-lg` (inputs/controles pequeños), `rounded-2xl` (tarjetas/paneles), `rounded-full` (pills/avatares/FABs).

## Sombras

`shadow-lg` (126), `shadow-sm` (73), `shadow-2xl` (72), `shadow-pink` (54), `shadow-card` (35), `shadow-md` (30), `shadow-xl` (25), + 10 sombras de color sueltas (`shadow-fuchsia`, `shadow-purple`, `shadow-orange`, `shadow-emerald`, `shadow-amber`, `shadow-rose`, `shadow-red`, `shadow-green`, `shadow-cyan`, `shadow-violet`, `shadow-blue`, `shadow-black`).

**Conclusión**: 12 sombras de color distintas para lo que debería ser un único acento con tinte. Ya existen `shadow-card`/`shadow-card-hover`/`shadow-pink` bien definidas en `tailwind.config.js` — el problema es que conviven con sombras Tailwind por defecto sin tinte.

## Tipografía

- Familias ya declaradas: `sans: Inter` (cuerpo), `display: Montserrat` (titulares) — **esto ya cumple** la regla de "dos familias distintas" del brief, no hace falta cambiarlo.
- **610 usos** de tamaños de fuente arbitrarios fuera de la escala de Tailwind (`text-[13px]`, `text-[15px]`, etc.) — la escala tipográfica no está fijada en ningún sitio.

## Iconografía

- **Lucide ya es el set dominante** (140 archivos lo importan) — no hace falta migrar de librería, solo disciplina de uso.
- **64 archivos** usan emojis como icono dentro de JSX (`🎤`, `🎵`, `💃`, etc.), mezclados con Lucide en los mismos componentes.

## Modo oscuro

- Ya existe infraestructura real: `darkMode: 'class'` en Tailwind + **86 archivos** usan variantes `dark:`. El toggle vive en `appStore.ts`. No hay que construir nada nuevo, solo formalizar los tokens para que luzcan igual de cuidados en ambos modos.

---

## Plan derivado (orden de ejecución)

1. **Tokens base** (`tailwind.config.js` + `src/index.css`) — este commit.
2. Botones (primario/secundario/terciario/destructivo + estados).
3. Tarjetas (eventos/artistas/venues/clases).
4. Navegación (bottom nav móvil + navbar).
5. Formularios/filtros + estados vacíos + skeletons.
6. Iconografía: sustituir emojis-como-icono por Lucide donde no sean el set propio de categorías de baile.
7. Set SVG propio para categorías de baile (salsa/bachata/kizomba/etc.).
8. Micro-animaciones de entrada + `prefers-reduced-motion`.
9. Suelo de calidad: contraste AA, safe-areas, CLS, foco de teclado.

Cada punto se entrega en un commit/PR independiente, con capturas antes/después, siguiendo la regla de oro: **cero cambios de lógica, rutas, textos o datos**.
