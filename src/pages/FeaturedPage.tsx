import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSponsorsStore } from '../store/appStore';
import { usePageMeta } from '../hooks/usePageMeta';

const TYPE_LABEL: Record<string, string> = {
  venue: 'Local', artist: 'Artista', event: 'Evento', brand: 'Marca',
  profile: 'Perfil', company: 'Empresa', seller: 'Vendedor', package: 'Paquete',
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all',     label: 'Todos' },
  { id: 'event',   label: '🎉 Eventos' },
  { id: 'profile', label: '👤 Perfiles' },
  { id: 'venue',   label: '🏠 Locales' },
  { id: 'seller',  label: '🛍️ Vendedores' },
  { id: 'package', label: '📦 Paquetes' },
  { id: 'brand',   label: '🏢 Patrocinadores' },
];

const FeaturedPage: React.FC = () => {
  usePageMeta({
    title: 'Lo más destacado',
    description: 'Eventos, perfiles, locales, vendedores y patrocinadores destacados en BailaNow.',
  });
  const navigate = useNavigate();
  const allSponsors = useSponsorsStore(s => s.sponsors);
  const [filter, setFilter] = useState('all');

  const items = useMemo(() => {
    const active = allSponsors.filter(s => s.active && (s.placement ?? 'both') !== 'footer');
    if (filter === 'all') return active;
    if (filter === 'brand') return active.filter(s => s.type === 'brand' || s.type === 'company');
    return active.filter(s => s.type === filter);
  }, [allSponsors, filter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] py-6">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-pink-500 mb-3">← Volver</button>
        <h1 className="font-display font-black text-3xl text-gray-900 dark:text-white mb-1">🔥 Lo más destacado</h1>
        <p className="text-gray-400 text-sm mb-5">Eventos, perfiles, locales, vendedores y patrocinadores</p>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-brand-orange text-white shadow-md'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-bold text-gray-700 dark:text-gray-300">Nada destacado en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map(sp => (
              <button key={sp.id} onClick={() => navigate(sp.link)}
                className="group text-center bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-800 transition-all">
                <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 border border-gray-100 dark:border-gray-800"
                  style={{ boxShadow: `0 3px 14px ${sp.color}30` }}>
                  <img src={sp.logo} alt={sp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 group-hover:text-pink-500 transition-colors">{sp.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight line-clamp-1">{sp.city || TYPE_LABEL[sp.type] || ''}</p>
                {sp.badge && <span className="inline-block mt-1 text-[9px] bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-bold">{sp.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedPage;
