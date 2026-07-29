import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

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
          <span className="text-[10px] font-black bg-brand-orange text-white rounded-full px-1.5 py-[1px] min-w-[18px] text-center">
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
                  ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/30'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange/60 hover:text-brand-orange'
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
  <div className="flex items-center gap-2 flex-wrap py-1">
    <span className="text-sm font-bold text-gray-900">
      {count}
      <span className="text-gray-400 font-normal"> / {total} {noun}</span>
    </span>
    {chips.length > 0 && <span className="w-px h-4 bg-gray-200 mx-1" />}
    {chips.map((c, i) => (
      <button
        key={i}
        onClick={c.onRemove}
        className="inline-flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange/20 transition"
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
