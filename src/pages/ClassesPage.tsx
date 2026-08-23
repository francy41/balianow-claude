/**
 * ClassesPage — listado de clases online disponibles
 * Cada clase muestra: vendedor, descripción, precio, próximas fechas disponibles
 * Click → abre modal de reserva con calendario
 */
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Video, Star, Filter, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import ClassBookingModal from '../components/ClassBookingModal';
import ClassPackageBookingModal from '../components/ClassPackageBookingModal';
import LiveFab from '../components/LiveFab';
import { useDanceStyles } from '../lib/danceStyles';

const DanceStudio = lazy(() => import('../components/DanceStudio'));

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

const LEVELS = ['Todos', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional'];

const ClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [classes, setClasses] = useState<ClassOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState('Todos');
  const [filterLevel, setFilterLevel] = useState('Todos');
  const danceStyles = useDanceStyles();
  const STYLES = ['Todos', ...danceStyles];
  const [filterOnline, setFilterOnline] = useState<'all' | 'online' | 'presencial'>('all');
  const [selectedClass, setSelectedClass] = useState<ClassOffering | null>(null);
  const [practiceClass, setPracticeClass] = useState<ClassOffering | null>(null);
  const [packageClass, setPackageClass] = useState<ClassOffering | null>(null);

  // Load classes from Supabase — todo en paralelo con timeout
  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) { console.warn('[classes] timeout'); setLoading(false); } }, 6000);

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
          setClasses([]);
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
        if (!cancelled) setClasses([]);
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
      <div className="bg-gradient-to-br from-pink-500 via-fuchsia-600 to-fuchsia-700 text-white px-4 pt-6 pb-8 relative overflow-hidden">
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

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 mt-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {STYLES.map(s => (
            <button key={s} onClick={() => setFilterStyle(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterStyle === s
                  ? 'bg-brand-orange text-white shadow-lg'
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
                  ? 'bg-fuchsia-600 text-white'
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
        ) : classes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📚</p>
            <p className="font-bold text-gray-700 dark:text-gray-300">Aún no hay clases publicadas</p>
            <p className="text-gray-400 text-sm mt-1">Los profesores pueden ofrecer sus clases desde su perfil. ¡Pronto habrá clases aquí!</p>
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
              <ClassCard key={c.id} cls={c} onClick={() => setSelectedClass(c)} onPractice={() => setPracticeClass(c)} onPackage={() => setPackageClass(c)} />
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

      {/* Modal de paquetes de clase */}
      {packageClass && (
        <ClassPackageBookingModal
          artist={{
            id: packageClass.vendor_id,
            name: packageClass.vendor_name || 'Instructor',
            avatar: packageClass.vendor_avatar,
            classPackages: (packageClass as any).classPackages || [],
          }}
          onClose={() => setPackageClass(null)}
        />
      )}

      {/* Práctica interactiva IA — módulo a pantalla completa */}
      {practiceClass && (
        <Suspense fallback={null}>
          <DanceStudio
            genre={practiceClass.style?.[0] || practiceClass.category || 'Bachata'}
            level={practiceClass.level || 'principiante'}
            teacherName={practiceClass.vendor_name || 'Tu profe'}
            teacherAvatarUrl={practiceClass.vendor_avatar || null}
            choreographerId={practiceClass.vendor_id}
            userId={user?.id}
            userName={user?.name || 'crack'}
            onClose={() => setPracticeClass(null)}
          />
        </Suspense>
      )}

      <LiveFab defaultCategory="class" label="Iniciar Clase Live" />
    </div>
  );
};

// ── Tarjeta de clase ────────────────────────────────────────────────────
const ClassCard: React.FC<{ cls: ClassOffering; onClick: () => void; onPractice?: () => void; onPackage?: () => void }> = ({ cls, onClick, onPractice, onPackage }) => {
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  return (
    <article onClick={onClick}
      className="bg-surface-elevated rounded-3xl overflow-hidden shadow-elevation-2 hover:shadow-elevation-3 border border-hairline/10 cursor-pointer active:scale-[0.99] transition-all duration-200">
      {/* Cover */}
      <div className="relative aspect-[16/10] bg-brand-orange">
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
          <h3 className="font-black text-sm text-ink-primary leading-tight line-clamp-2">{cls.title}</h3>
        </div>

        {cls.vendor_name && (
          <div className="flex items-center gap-2 mb-2">
            {cls.vendor_avatar
              ? <img src={cls.vendor_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              : <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center text-white text-[10px] font-black">{cls.vendor_name[0]}</div>
            }
            <span className="text-xs font-bold text-ink-secondary truncate">{cls.vendor_name}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-ink-tertiary mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.duration_minutes}min</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />Max {cls.max_students}</span>
          <span className="flex items-center gap-1">🎯 {cls.level}</span>
        </div>

        {cls.next_slot ? (
          <div className="bg-brand-orange dark:from-pink-900/20 dark:to-pink-900/20 rounded-xl px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-black text-pink-600 dark:text-pink-300">Próxima clase</p>
              <p className="text-xs font-bold text-ink-primary">{fmtDate(cls.next_slot.starts_at)}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-pink-500" />
          </div>
        ) : (
          <div className="bg-surface-elevated-2 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-ink-tertiary">Disponibilidad bajo demanda</p>
          </div>
        )}

        {/* Botón reserva de paquetes */}
        {onPackage && (
          <button
            onClick={(e) => { e.stopPropagation(); onPackage(); }}
            className="w-full mt-2 bg-brand-orange text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
            📦 Ver paquetes de clase
          </button>
        )}
        {/* Práctica interactiva IA (clases online) */}
        {cls.is_online && onPractice && (
          <button
            onClick={(e) => { e.stopPropagation(); onPractice(); }}
            className="w-full mt-2 bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
            🎮 Practicar ahora con IA
          </button>
        )}
      </div>
    </article>
  );
};

export default ClassesPage;
