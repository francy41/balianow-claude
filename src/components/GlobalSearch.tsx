/**
 * GlobalSearch — Super buscador omnipresente
 * Busca en venues, eventos, artistas, bailarines, DJs, ciudades.
 * Se invoca en cualquier página y abre como modal/overlay.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Calendar, Music, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Result {
  id: string;
  type: 'venue' | 'event' | 'artist' | 'dancer' | 'dj' | 'city' | 'live' | 'profile';
  title: string;
  subtitle?: string;
  img?: string;
  to: string;
}

const TYPE_META = {
  venue:   { label: 'Local',     emoji: '🏛️', color: 'bg-pink-500' },
  event:   { label: 'Evento',    emoji: '🎉', color: 'bg-orange-500' },
  artist:  { label: 'Artista',   emoji: '🎤', color: 'bg-purple-500' },
  dancer:  { label: 'Bailarín',  emoji: '💃', color: 'bg-green-500' },
  dj:      { label: 'DJ',        emoji: '🎧', color: 'bg-cyan-500' },
  city:    { label: 'Ciudad',    emoji: '🏙️', color: 'bg-blue-500' },
  live:    { label: 'En vivo',   emoji: '🔴', color: 'bg-red-500' },
  profile: { label: 'Perfil',    emoji: '👤', color: 'bg-fuchsia-500' },
};

const POPULAR_CITIES = ['Madrid','Barcelona','Valencia','Sevilla','Paris','Miami','New York','Cali','Medellín','La Habana','Berlín','Roma','Londres'];
const POPULAR_QUERIES = ['Bachata','Salsa','Kizomba','Reggaeton','Festival 2026','DJ Madrid','Romeo Santos','Bilbao'];

interface Props {
  open: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore recent searches
  useEffect(() => {
    if (open) {
      try { setRecent(JSON.parse(localStorage.getItem('bn-search-recent') || '[]')); } catch {}
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery(''); setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const all: Result[] = [];
      const q = `%${query}%`;

      try {
        const [venuesRes, eventsRes, artistsRes, profilesRes, livesRes] = await Promise.all([
          supabase.from('venues').select('id,name,city,country,image_url,cover,avatar').ilike('name', q).limit(6),
          supabase.from('events').select('id,title,city,country,date,image_url,cover').ilike('title', q).limit(6),
          supabase.from('artists').select('id,name,city,type,avatar').ilike('name', q).limit(6),
          supabase.from('profiles').select('id,full_name,role,city,location,avatar_url,styles').ilike('full_name', q).limit(8),
          supabase.from('live_sessions_enriched').select('id,title,city,status,pricing_mode,cover_url,host_avatar,host_name').ilike('title', q).limit(4),
        ]);

        venuesRes.data?.forEach((v: any) => all.push({
          id: v.id, type: 'venue', title: v.name,
          subtitle: `${v.city || ''}${v.country ? ', ' + v.country : ''}`,
          img: v.image_url || v.cover || v.avatar, to: `/venues/${v.id}`,
        }));
        eventsRes.data?.forEach((e: any) => all.push({
          id: e.id, type: 'event', title: e.title,
          subtitle: `${e.city || ''} · ${e.date || ''}`,
          img: e.image_url || e.cover, to: `/eventos/${e.id}`,
        }));
        artistsRes.data?.forEach((a: any) => {
          const t: Result['type'] = a.type === 'dancer' ? 'dancer' : a.type === 'dj' ? 'dj' : 'artist';
          all.push({ id: a.id, type: t, title: a.name, subtitle: a.city, img: a.avatar, to: `/artistas/${a.id}` });
        });

        // PROFILES (perfiles importados o creados por usuarios)
        profilesRes.data?.forEach((p: any) => {
          const role = String(p.role || '').toLowerCase();
          if (role === 'admin' || role === 'superadmin') return;
          const t: Result['type'] =
            role === 'dj'     ? 'dj' :
            role === 'dancer' ? 'dancer' :
            (role === 'venue' || role === 'business') ? 'venue' :
            'profile';
          all.push({
            id: p.id, type: t, title: p.full_name || 'Usuario',
            subtitle: [p.city || p.location, role].filter(Boolean).join(' · '),
            img: p.avatar_url, to: `/p/${p.id}`,
          });
        });

        // LIVE SESSIONS
        livesRes.data?.forEach((l: any) => {
          all.push({
            id: l.id, type: 'live', title: l.title,
            subtitle: `${l.host_name || ''}${l.status === 'live' ? ' · 🔴 EN VIVO' : ' · programado'}`,
            img: l.cover_url || l.host_avatar, to: `/live/session/${l.id}`,
          });
        });

        // City matches
        POPULAR_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase())).forEach(c =>
          all.push({ id: `city-${c}`, type: 'city', title: c, subtitle: 'Ciudad', to: `/cerca?city=${encodeURIComponent(c)}` })
        );
      } catch (err) {
        console.error('Search error:', err);
      }
      setResults(all);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (r: Result) => {
    // Save recent
    const newRecent = [r.title, ...recent.filter(x => x !== r.title)].slice(0, 6);
    setRecent(newRecent);
    localStorage.setItem('bn-search-recent', JSON.stringify(newRecent));
    navigate(r.to);
    onClose();
  };

  const grouped = useMemo(() => {
    const g: Record<string, Result[]> = {};
    results.forEach(r => { (g[r.type] ||= []).push(r); });
    return g;
  }, [results]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-start justify-center p-3 pt-12 sm:pt-20" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">

        {/* Search input */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-shrink-0">
          <Search className="w-5 h-5 text-pink-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar locales, eventos, artistas, ciudades…"
            className="flex-1 bg-transparent focus:outline-none text-base text-gray-900 dark:text-white placeholder-gray-400"
          />
          {loading && <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3">
          {!query ? (
            <div className="space-y-4">
              {recent.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2 px-2">Recientes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map(r => (
                      <button key={r} onClick={() => setQuery(r)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20">
                        🕐 {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2 px-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tendencias
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_QUERIES.map(q => (
                    <button key={q} onClick={() => setQuery(q)}
                      className="px-3 py-1.5 bg-brand-orange dark:from-pink-900/20 dark:to-fuchsia-900/20 rounded-full text-xs font-bold text-pink-700 dark:text-pink-300 hover:scale-105 transition-transform">
                      🔥 {q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2 px-2">Ciudades populares</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {POPULAR_CITIES.slice(0, 8).map(c => (
                    <button key={c} onClick={() => { navigate(`/cerca?city=${encodeURIComponent(c)}`); onClose(); }}
                      className="px-2 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 flex items-center gap-1 justify-center">
                      <MapPin className="w-3 h-3 text-pink-500 flex-shrink-0" />
                      <span className="truncate">{c}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">🔍</p>
              <p className="font-bold text-gray-700 dark:text-gray-300">Sin resultados para "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Prueba con otra palabra</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([type, items]) => {
                const meta = TYPE_META[type as keyof typeof TYPE_META];
                return (
                  <div key={type}>
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-1.5 px-2 flex items-center gap-1">
                      <span>{meta.emoji}</span> {meta.label} ({items.length})
                    </p>
                    <div className="space-y-1">
                      {items.map(r => (
                        <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)}
                          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-all text-left active:scale-[0.98]">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            {r.img ? <img src={r.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                              : <div className={`w-full h-full ${meta.color} flex items-center justify-center text-base`}>{meta.emoji}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{r.title}</p>
                            {r.subtitle && <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>}
                          </div>
                          <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${meta.color} flex-shrink-0`}>
                            {meta.emoji}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 flex justify-between flex-shrink-0">
          <span>Esc para cerrar</span>
          <span className="text-pink-500 font-bold">BailaNow Search</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
