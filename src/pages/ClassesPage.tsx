/**
 * ClassesPage — listado de clases online disponibles
 * Cada clase muestra: vendedor, descripción, precio, próximas fechas disponibles
 * Click → abre modal de reserva con calendario
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Video, Star, Filter, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import SearchTriggerBar from '../components/SearchTriggerBar';
import ClassBookingModal from '../components/ClassBookingModal';

interface ClassOffering {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  category: string;
  style: string[];
  level: string;
  duration_minutes: number;
  price: number;
  currency: string;
  max_students: number;
  is_online: boolean;
  cover_image: string;
  vendor_name?: string;
  vendor_avatar?: string;
  next_slot?: { id: string; starts_at: string } | null;
  slots_count?: number;
}

const STYLES = ['Todos', 'Bachata', 'Salsa', 'Kizomba', 'Reggaeton', 'Merengue', 'Cumbia', 'Latin Mix'];
const LEVELS = ['Todos', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional'];

const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [classes, setClasses] = useState<ClassOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState('Todos');
  const [filterLevel, setFilterLevel] = useState('Todos');
  const [filterOnline, setFilterOnline] = useState<'all' | 'online' | 'presencial'>('all');
  const [selectedClass, setSelectedClass] = useState<ClassOffering | null>(null);

  // Load classes from Supabase — todo en paralelo con timeout
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) { console.warn('[classes] timeout'); setLoading(false); setClasses(SAMPLE_CLASSES); } }, 6000);

    (async () => {
      try {
        // 1) Cargar offerings sin join (más robusto)
        const { data, error } = await supabase
          .from('class_offerings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (cancelled) return;
        console.log('[classes] loaded:', { count: data?.length, error });

        if (error || !data || data.length === 0) {
          setClasses(SAMPLE_CLASSES);
          setLoading(false);
          clearTimeout(safety);
          return;
        }

        // 2) Cargar slots + vendors en paralelo
        const offeringIds = data.map((c: any) => c.id);
        const vendorIds = [...new Set(data.map((c: any) => c.vendor_id))];

        const [{ data: allSlots }, { data: allVendors }] = await Promise.all([
          supabase
            .from('availability_slots')
            .select('id, offering_id, starts_at')
            .in('offering_id', offeringIds)
            .eq('status', 'available')
            .gt('starts_at', new Date().toISOString())
            .order('starts_at'),
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', vendorIds),
        ]);

        if (cancelled) return;

        // 3) Mapear: para cada offering, encontrar su próximo slot + vendor
        const enriched: ClassOffering[] = data.map((c: any) => {
          const slots = (allSlots || []).filter((s: any) => s.offering_id === c.id);
          const vendor = (allVendors || []).find((v: any) => v.id === c.vendor_id);
          return {
            ...c,
            vendor_name: vendor?.full_name || 'Profesor',
            vendor_avatar: vendor?.avatar_url || '',
            next_slot: slots[0] || null,
            slots_count: slots.length,
          };
        });

        setClasses(enriched);
      } catch (err) {
        console.error('[classes] catch:', err);
        if (!cancelled) setClasses(SAMPLE_CLASSES);
      } finally {
        if (!cancelled) { setLoading(false); clearTimeout(safety); }
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  const filtered = useMemo(() => classes.filter(c => {
    if (filterStyle !== 'Todos' && !c.style?.some(s => s.toLowerCase() === filterStyle.toLowerCase())) return false;
    if (filterLevel !== 'Todos' && c.level?.toLowerCase() !== filterLevel.toLowerCase() && c.level !== 'all') return false;
    if (filterOnline === 'online' && !c.is_online) return false;
    if (filterOnline === 'presencial' && c.is_online) return false;
    return true;
  }), [classes, filterStyle, filterLevel, filterOnline]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Hero */}
      <div className="bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 text-white px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs uppercase font-black tracking-widest opacity-90">🔴 EN DIRECTO</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">Clases y workshops en vivo</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-xl">
            Conecta en directo con los mejores profesores. Elige fecha, paga seguro y baila desde casa.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 max-w-2xl">
            {[
              { icon: '📅', label: 'Reserva', desc: 'Elige fecha' },
              { icon: '💳', label: 'Paga seguro', desc: 'Escrow garantizado' },
              { icon: '🎥', label: 'Conéctate', desc: 'Sala en vivo' },
            ].map(s => (
              <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <span className="text-lg">{s.icon}</span>
                <p className="text-white font-bold text-xs mt-0.5">{s.label}</p>
                <p className="text-white/70 text-[10px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-3 relative z-10">
        <SearchTriggerBar placeholder="🔍 Buscar clases, profesores, estilos…" />
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 mt-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STYLES.map(s => (
            <button key={s} onClick={() => setFilterStyle(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterStyle === s
                  ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setFilterLevel(l)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filterLevel === l
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}>
              🎯 {l}
            </button>
          ))}
          {(['all','online','presencial'] as const).map(o => (
            <button key={o} onClick={() => setFilterOnline(o)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filterOnline === o
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}>
              {o === 'all' ? '🌍 Todo' : o === 'online' ? '🎥 Online' : '📍 Presencial'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de clases */}
      <div className="max-w-6xl mx-auto px-4 mt-5">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-sm mt-3">Cargando clases…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📚</p>
            <p className="font-bold text-gray-700 dark:text-gray-300">No hay clases con esos filtros</p>
            <button onClick={() => { setFilterStyle('Todos'); setFilterLevel('Todos'); setFilterOnline('all'); }}
              className="mt-3 bg-pink-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
              Quitar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <ClassCard key={c.id} cls={c} onClick={() => setSelectedClass(c)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal de reserva */}
      {selectedClass && (
        <ClassBookingModal
          offering={selectedClass}
          onClose={() => setSelectedClass(null)}
          onBooked={() => { setSelectedClass(null); navigate('/dashboard?tab=classes'); }}
        />
      )}
    </div>
  );
};

// ── Tarjeta de clase ────────────────────────────────────────────────────
const ClassCard: React.FC<{ cls: ClassOffering; onClick: () => void }> = ({ cls, onClick }) => {
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  return (
    <article onClick={onClick}
      className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.99] transition-all">
      {/* Cover */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-pink-100 to-purple-200">
        {cls.cover_image && <img src={cls.cover_image} alt={cls.title} className="w-full h-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {cls.is_online && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Video className="w-3 h-3" />En vivo</span>}
          {cls.style?.slice(0, 2).map(s => (
            <span key={s} className="bg-white/95 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-black">
          €{cls.price}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-black text-sm text-gray-900 dark:text-white leading-tight line-clamp-2">{cls.title}</h3>
        </div>

        {cls.vendor_name && (
          <div className="flex items-center gap-2 mb-2">
            {cls.vendor_avatar
              ? <img src={cls.vendor_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white text-[10px] font-black">{cls.vendor_name[0]}</div>
            }
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{cls.vendor_name}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.duration_minutes}min</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />Max {cls.max_students}</span>
          <span className="flex items-center gap-1">🎯 {cls.level}</span>
        </div>

        {cls.next_slot ? (
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-pink-600 dark:text-pink-300">Próxima clase</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white">{fmtDate(cls.next_slot.starts_at)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-pink-500" />
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-gray-500">Disponibilidad bajo demanda</p>
          </div>
        )}
      </div>
    </article>
  );
};

// ── Datos de muestra (cuando BD está vacía) ─────────────────────────────
const SAMPLE_CLASSES: ClassOffering[] = [
  {
    id: 'sample-1', vendor_id: 'demo-1',
    title: 'Bachata Sensual — Nivel Intermedio',
    description: 'Clase intensiva de bachata sensual con técnica de conexión y musicalidad',
    category: 'class', style: ['Bachata'], level: 'Intermedio',
    duration_minutes: 60, price: 25, currency: 'EUR', max_students: 1,
    is_online: true,
    cover_image: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=600&h=375&fit=crop',
    vendor_name: 'Daniel & Desiree', vendor_avatar: '',
    next_slot: { id: 's1', starts_at: new Date(Date.now() + 86400000 * 2).toISOString() },
  },
  {
    id: 'sample-2', vendor_id: 'demo-2',
    title: 'Salsa On1 desde cero — Principiantes',
    description: 'Aprende salsa estilo Los Angeles paso a paso',
    category: 'class', style: ['Salsa'], level: 'Principiante',
    duration_minutes: 60, price: 18, currency: 'EUR', max_students: 5,
    is_online: true,
    cover_image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=375&fit=crop',
    vendor_name: 'Grupo Niche', vendor_avatar: '',
    next_slot: { id: 's2', starts_at: new Date(Date.now() + 86400000 * 1).toISOString() },
  },
  {
    id: 'sample-3', vendor_id: 'demo-3',
    title: 'Kizomba Fusion — Workshop intensivo',
    description: 'Workshop de 90 min con técnica y figuras avanzadas',
    category: 'workshop', style: ['Kizomba'], level: 'Avanzado',
    duration_minutes: 90, price: 35, currency: 'EUR', max_students: 8,
    is_online: true,
    cover_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=375&fit=crop',
    vendor_name: 'Masa & Polina', vendor_avatar: '',
    next_slot: { id: 's3', starts_at: new Date(Date.now() + 86400000 * 4).toISOString() },
  },
];

export default ClassesPage;
