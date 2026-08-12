import React from 'react';
import { Search, Copy } from 'lucide-react';
import { fixText } from '../lib/text';

/** Normaliza para comparar: arregla mojibake, minúsculas, sin acentos, sin dobles espacios. */
export const normKey = (s?: string | null): string =>
  fixText(s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** Devuelve el conjunto de claves que aparecen más de una vez (duplicadas). */
export function duplicateKeySet(keys: string[]): Set<string> {
  const counts = new Map<string, number>();
  keys.forEach(k => { if (k) counts.set(k, (counts.get(k) || 0) + 1); });
  const dupes = new Set<string>();
  counts.forEach((c, k) => { if (c > 1) dupes.add(k); });
  return dupes;
}

interface Props {
  query: string;
  setQuery: (s: string) => void;
  onlyDupes: boolean;
  setOnlyDupes: (b: boolean) => void;
  dupeCount: number;   // nº de filas que son duplicadas
  shown: number;       // filas visibles tras filtrar
  total: number;       // total sin filtrar
  placeholder?: string;
}

const AdminDupeToolbar: React.FC<Props> = ({ query, setQuery, onlyDupes, setOnlyDupes, dupeCount, shown, total, placeholder }) => (
  <div className="flex items-center gap-3 flex-wrap mb-4">
    <div className="relative flex-1 min-w-[200px]">
      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder || 'Buscar por nombre o ciudad…'}
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm"
      />
    </div>
    <button
      onClick={() => setOnlyDupes(!onlyDupes)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
        onlyDupes
          ? 'bg-brand-orange text-white border-brand-orange'
          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-pink-300'
      }`}
    >
      <Copy className="w-4 h-4" /> Solo duplicados
      {dupeCount > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${onlyDupes ? 'bg-white/25' : 'bg-red-100 text-red-600'}`}>{dupeCount}</span>
      )}
    </button>
    <span className="text-xs text-gray-400">{shown} de {total}</span>
  </div>
);

export default AdminDupeToolbar;
