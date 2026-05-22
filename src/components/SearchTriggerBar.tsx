/**
 * SearchTriggerBar — barra de búsqueda visual que abre el GlobalSearch
 * Se usa en todas las páginas de listado para acceso rápido al super buscador.
 */
import React from 'react';
import { Search, Command } from 'lucide-react';

interface Props {
  placeholder?: string;
  className?: string;
}

const SearchTriggerBar: React.FC<Props> = ({ placeholder = 'Buscar en todo BailaNow…', className = '' }) => {
  const open = () => window.dispatchEvent(new Event('bn:open-search'));

  return (
    <button
      onClick={open}
      className={`w-full bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md border border-gray-100 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-500 hover:shadow-lg active:scale-[0.99] transition-all text-left ${className}`}
    >
      <Search className="w-4 h-4 text-pink-500 flex-shrink-0" />
      <span className="flex-1 text-sm text-gray-400 truncate">{placeholder}</span>
      <span className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md font-mono flex-shrink-0">
        <Command className="w-3 h-3" /> K
      </span>
    </button>
  );
};

export default SearchTriggerBar;
