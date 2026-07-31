import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Loader2, Plus, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Badge, EmptyState, Button } from '../components/ui';

type Post = {
  id: string;
  user: string;
  fullText: string;
  location: string;
  category: string;
  createdAt: string;
};

// Categorías temáticas del foro (id → etiqueta con emoji para el filtro y el composer)
const CATEGORIES: { id: string; label: string; short: string }[] = [
  { id: 'salir',       label: '💃 Salir a bailar',   short: 'Salir a bailar' },
  { id: 'bailarines',  label: '🕺 Bailarines',       short: 'Bailarines' },
  { id: 'cantantes',   label: '🎤 Cantantes',        short: 'Cantantes' },
  { id: 'musicos',     label: '🎹 Músicos',          short: 'Músicos' },
  { id: 'djs',         label: '🎧 DJs',              short: 'DJs' },
  { id: 'eventos',     label: '🎟️ Eventos',          short: 'Eventos' },
  { id: 'sugerencias', label: '💡 Sugerencias',      short: 'Sugerencias' },
];

const CATEGORY_LABELS: Record<string, string> = {
  salir: 'Salir a bailar',
  bailarines: 'Bailarines',
  cantantes: 'Cantantes',
  musicos: 'Músicos',
  djs: 'DJs',
  eventos: 'Eventos',
  sugerencias: 'Sugerencias',
  // compatibilidad con datos antiguos
  localidades: 'Locales',
  artistas: 'Artistas',
  comunidad: 'General',
};

const CATEGORY_COLORS: Record<string, 'orange' | 'blue' | 'green' | 'gray'> = {
  salir: 'orange',
  bailarines: 'orange',
  cantantes: 'blue',
  musicos: 'blue',
  djs: 'green',
  eventos: 'green',
  sugerencias: 'gray',
  localidades: 'blue',
  artistas: 'orange',
  comunidad: 'gray',
};

const isOferta = (text: string) =>
  /oferta|vendo|doy clases|comparto coche|entradas|descuento|organizo|taller|regalo/i.test(text);

const relativeTime = (iso: string): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
};

const ComunidadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('post');
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useUIStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'todas' | 'ofertas' | 'demandas'>('todas');
  const [cat, setCat] = useState<string>('todas');
  const [composerOpen, setComposerOpen] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('community_posts')
        .select('id, user_name, full_text, location, category, created_at')
        .eq('status', 'APROBADO')
        .order('created_at', { ascending: false })
        .limit(100);
      setPosts((data || []).map((p: any) => ({
        id: p.id,
        user: p.user_name,
        fullText: p.full_text,
        location: p.location || '',
        category: p.category || 'comunidad',
        createdAt: p.created_at,
      })));
    } catch { /* empty state honesto */ }
    setLoading(false);
  };

  useEffect(() => {
    const safety = setTimeout(() => setLoading(false), 8000);
    load().finally(() => clearTimeout(safety));
    return () => clearTimeout(safety);
  }, []);

  // Scroll al post resaltado si venimos de "Ruta de Hoy"
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, posts]);

  const filtered = useMemo(() => {
    return posts.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.fullText.toLowerCase().includes(q) ||
        p.user.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      const oferta = isOferta(p.fullText);
      const matchTab = tab === 'todas' || (tab === 'ofertas' && oferta) || (tab === 'demandas' && !oferta);
      const matchCat = cat === 'todas' || p.category === cat;
      return matchSearch && matchTab && matchCat;
    });
  }, [posts, search, tab, cat]);

  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'todas', label: '🔥 Todas' },
    { id: 'ofertas', label: '🎁 Ofertas' },
    { id: 'demandas', label: '🙋 Demandas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-950 to-black p-6 sm:p-8 text-white">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-52 h-52 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-pink-300">🔥 Comunidad</span>
              <h1 className="font-display font-black text-3xl sm:text-4xl mt-1.5 leading-tight">Comunidad latina</h1>
              <p className="text-white/70 mt-1.5 text-sm sm:text-base max-w-lg">Ofertas y demandas: busca pareja, grupo, entradas, clases y más</p>
            </div>
            <button onClick={() => isAuthenticated ? setComposerOpen(true) : navigate('/auth')}
              className="inline-flex items-center gap-1.5 bg-white text-gray-900 font-bold rounded-full px-5 py-2.5 hover:scale-105 transition flex-shrink-0">
              <Plus className="w-4 h-4" /> Publicar
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en la comunidad…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>

        {/* Tabs ofertas/demandas */}
        <div className="flex gap-2 mb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                tab === t.id
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-orange hover:text-brand-orange'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chips de categorías */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'todas', label: '🔥 Todas' }, ...CATEGORIES].map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                cat === c.id
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-pink-400 hover:text-pink-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Cargando comunidad…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💬"
            title={posts.length === 0 ? 'Aún no hay publicaciones' : 'Sin resultados'}
            description={posts.length === 0
              ? '¡Sé el primero en publicar una oferta o demanda!'
              : 'Prueba con otra búsqueda o filtro'}
            action={posts.length === 0
              ? <Button variant="orange" onClick={() => isAuthenticated ? setComposerOpen(true) : navigate('/auth')}>Publicar</Button>
              : <button onClick={() => { setSearch(''); setTab('todas'); }} className="text-brand-orange font-semibold text-sm">Limpiar filtros</button>}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(post => {
              const oferta = isOferta(post.fullText);
              const highlighted = post.id === highlightId;
              return (
                <div
                  key={post.id}
                  ref={highlighted ? highlightRef : undefined}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 transition-all ${
                    highlighted
                      ? 'border-brand-orange ring-2 ring-brand-orange/30'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user)}&background=F97316&color=fff&size=80&bold=true&rounded=true`}
                      alt={post.user}
                      className="w-11 h-11 rounded-full flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{post.user}</span>
                        <Badge variant={oferta ? 'green' : 'orange'}>{oferta ? 'Oferta' : 'Demanda'}</Badge>
                        <Badge variant={CATEGORY_COLORS[post.category] || 'gray'}>{CATEGORY_LABELS[post.category] || 'General'}</Badge>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mt-1.5 leading-snug">{post.fullText}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {post.location && (
                          <span className="flex items-center gap-1 text-brand-orange font-medium">
                            <MapPin className="w-3 h-3" /> {post.location}
                          </span>
                        )}
                        <span>{relativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {composerOpen && (
        <ComposerModal
          userName={user?.name || 'Usuario'}
          onClose={() => setComposerOpen(false)}
          onPosted={() => { setComposerOpen(false); addToast({ message: '✅ Tu publicación se revisará antes de aparecer', type: 'success' }); }}
        />
      )}
    </div>
  );
};

// ── Modal para publicar una nueva oferta/demanda ──
const ComposerModal: React.FC<{ userName: string; onClose: () => void; onPosted: () => void }> = ({ userName, onClose, onPosted }) => {
  const { addToast } = useUIStore();
  const [text, setText] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('salir');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (text.trim().length < 10) {
      addToast({ message: 'Escribe al menos 10 caracteres', type: 'error' });
      return;
    }
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { addToast({ message: 'Inicia sesión para publicar', type: 'error' }); setSending(false); return; }
      const { error } = await supabase.from('community_posts').insert({
        user_id: uid,
        user_name: userName,
        full_text: text.trim(),
        location: location.trim() || null,
        category,
        status: 'PENDIENTE',
      });
      if (error) throw error;
      onPosted();
    } catch {
      addToast({ message: 'No se pudo publicar. Inténtalo más tarde.', type: 'error' });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-black text-xl text-gray-900 dark:text-white">Nueva publicación</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          maxLength={280}
          placeholder="¿Qué ofreces o buscas? Ej: Busco pareja para social de bachata el sábado…"
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Ciudad (ej: Madrid)"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.short}</option>
            ))}
          </select>
        </div>
        <button
          onClick={submit}
          disabled={sending}
          className="w-full mt-4 bg-brand-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Publicar
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-2">Tu publicación se revisará antes de aparecer en la comunidad.</p>
      </div>
    </div>
  );
};

export default ComunidadPage;
