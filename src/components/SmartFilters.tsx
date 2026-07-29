import React, { useState, useEffect } from 'react';
import { Check, X, SlidersHorizontal } from 'lucide-react';

// ── FilterFacet ────────────────────────────────────────────────────────────
// Facet de filtro con MULTI-SELECCIÓN independiente + opción "todos" inteligente.
// - Seleccionar "Todos/Todas" limpia el resto de esa categoría.
// - Seleccionar una opción concreta quita "Todos".
// - Si te quedas sin selección, vuelve a "Todos".
export const FilterFacet: React.FC<{
  label: string;
  icon?: React.ReactNode;
  options: string[];          // options[0] debe ser la opción "todos" (Todos/Todas)
  selected: string[];
  onChange: (v: string[]) => void;
  collapsible?: boolean;      // colapsa si hay muchas opciones
  limit?: number;
}> = ({ label, icon, options, selected, onChange, collapsible = false, limit = 10 }) => {
  const allLabel = options[0];
  const isAll = selected.length === 0 || selected.includes(allLabel);
  const activeCount = isAll ? 0 : selected.filter(s => s !== allLabel).length;
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) => {
    if (opt === allLabel) { onChange([allLabel]); return; }
    let next = selected.filter(s => s !== allLabel);
    next = next.includes(opt) ? next.filter(s => s !== opt) : [...next, opt];
    onChange(next.length ? next : [allLabel]);
  };

  const visible = collapsible && !open ? options.slice(0, limit) : options;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
          {icon}{label}
        </span>
        {activeCount > 0 && (
          <span className="text-[10px] font-black bg-gradient-to-r from-brand-orange to-pink-500 text-white rounded-full px-1.5 py-[1px] min-w-[18px] text-center shadow-sm shadow-pink-500/40">
            {activeCount}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map(opt => {
          const active = opt === allLabel ? isAll : selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all duration-200 active:scale-95 ${
                active
                  ? 'bg-gradient-to-r from-brand-orange to-pink-500 text-white border-transparent shadow-lg shadow-pink-500/30 scale-[1.03]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-pink-400/60 hover:text-pink-500 hover:shadow-sm'
              }`}
            >
              {active && opt !== allLabel && <Check className="w-3.5 h-3.5" />}
              {opt}
            </button>
          );
        })}
        {collapsible && options.length > limit && (
          <button
            onClick={() => setOpen(o => !o)}
            className="px-3 py-2 rounded-full text-sm font-semibold text-brand-orange hover:bg-brand-orange/10 transition"
          >
            {open ? '− Menos' : `+ ${options.length - limit} más`}
          </button>
        )}
      </div>
    </div>
  );
};

// ── ActiveFilterBar ──────────────────────────────────────────────────────────
// Barra de filtros aplicados: pills quitables (una a una) + limpiar todo + contador.
export const ActiveFilterBar: React.FC<{
  chips: { label: string; onRemove: () => void }[];
  count: number;
  total: number;
  noun?: string;
  onClearAll?: () => void;
}> = ({ chips, count, total, noun = 'resultados', onClearAll }) => (
  <div className={`flex items-center gap-2 flex-wrap ${chips.length > 0 ? 'p-2.5 rounded-2xl bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-100' : 'py-1'}`}>
    <span className="text-sm font-black bg-gradient-to-r from-brand-orange to-pink-500 bg-clip-text text-transparent">
      {count}
      <span className="text-gray-400 font-normal"> / {total} {noun}</span>
    </span>
    {chips.length > 0 && <span className="w-px h-4 bg-pink-200 mx-1" />}
    {chips.map((c, i) => (
      <button
        key={i}
        onClick={c.onRemove}
        className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs font-bold bg-white text-pink-600 border border-pink-200 shadow-sm hover:bg-pink-50 hover:border-pink-300 transition"
      >
        {c.label}
        <X className="w-3 h-3" />
      </button>
    ))}
    {chips.length > 0 && onClearAll && (
      <button
        onClick={onClearAll}
        className="text-xs font-semibold text-gray-400 hover:text-red-500 transition ml-1"
      >
        Limpiar todo
      </button>
    )}
  </div>
);

// ── FilterPanel ──────────────────────────────────────────────────────────────
// Botón "Filtros" (con contador) que abre un panel deslizante estilo app.
// Los facets/sliders se pasan como children. Footer con Limpiar / Ver resultados.
export const FilterPanel: React.FC<{
  activeCount: number;
  resultCount?: number;
  onClear?: () => void;
  children: React.ReactNode;
  triggerClassName?: string;
}> = ({ activeCount, resultCount, onClear, children, triggerClassName = '' }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:border-pink-400/60 hover:text-pink-500 hover:shadow transition ${triggerClassName}`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
        {activeCount > 0 && (
          <span className="text-[10px] font-black bg-gradient-to-r from-brand-orange to-pink-500 text-white rounded-full px-1.5 py-[1px] min-w-[18px] text-center shadow-sm shadow-pink-500/40">
            {activeCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 z-[70] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-orange" />
            <h3 className="font-display font-black text-lg text-gray-900">Filtros</h3>
            {activeCount > 0 && (
              <span className="text-[11px] font-black bg-gradient-to-r from-brand-orange to-pink-500 text-white rounded-full px-2 py-[2px]">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={() => setOpen(false)} aria-label="Cerrar" className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {children}
        </div>

        <div className="bg-white border-t border-gray-100 p-4 flex items-center gap-3">
          <button
            onClick={() => onClear?.()}
            className="flex-1 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
          >
            Limpiar
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex-[2] py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-orange to-pink-500 shadow-lg shadow-pink-500/30 hover:opacity-95 transition"
          >
            {typeof resultCount === 'number' ? `Ver ${resultCount} resultados` : 'Ver resultados'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── PriceRange ───────────────────────────────────────────────────────────────
// Deslizador de precio de doble mango (min/max) con relleno degradado.
export const PriceRange: React.FC<{
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  currency?: string;
  step?: number;
}> = ({ min, max, value, onChange, currency = '€', step = 1 }) => {
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const pct = (v: number) => ((v - min) / span) * 100;
  const thumb =
    'pointer-events-none absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-transparent appearance-none ' +
    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pink-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pink-500 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Precio</span>
        <span className="text-sm font-bold text-gray-900">{lo}{currency} – {hi}{currency}{hi >= max ? '+' : ''}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-brand-orange to-pink-500"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])}
          className={thumb} aria-label="Precio mínimo"
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className={thumb} aria-label="Precio máximo"
        />
      </div>
    </div>
  );
};
