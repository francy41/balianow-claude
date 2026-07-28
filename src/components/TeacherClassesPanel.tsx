/**
 * TeacherClassesPanel — Panel del profesor para gestionar:
 *  - Sus class_offerings (crear, editar, eliminar)
 *  - Disponibilidad (slots de fechas/horas)
 *  - Reservas recibidas (bookings de estudiantes)
 *
 * Se inserta en DashboardPage como tab "Clases Online" (rol artist/dj/dancer/instructor).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit3, Trash2, Calendar as CalIcon, Clock, Users, Euro,
  Video, X, Save, Loader2, CheckCircle, BookOpen, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { uploadImage } from '../lib/uploadHelper';

type Offering = {
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
  status: string;
};

type Slot = {
  id: string;
  vendor_id: string;
  offering_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  booked_count: number;
  max_students: number;
};

type Booking = {
  id: string;
  slot_id: string;
  offering_id: string;
  student_id: string;
  status: string;
  amount_paid: number;
  jitsi_room: string;
  created_at: string;
  student_name?: string;
  offering_title?: string;
  starts_at?: string;
};

const STYLES = ['Bachata', 'Bachata Dominicana', 'Bachata Moderna', 'Bachata Sensual', 'Bachata Urbana', 'Salsa', 'Salsa Cubana', 'Salsa Colombiana (Caleña)', 'Cha-cha-chá', 'Cumbia', 'Reparto Cubano', 'Kizomba', 'Reggaeton', 'Merengue', 'Latin Mix'];
const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional', 'all'];
const CATEGORIES = [
  { id: 'class', label: 'Clase regular' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'private', label: 'Clase privada' },
  { id: 'event', label: 'Evento online' },
];

const TeacherClassesPanel: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'offerings' | 'slots' | 'bookings'>('offerings');
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffering, setEditingOffering] = useState<Partial<Offering> | null>(null);
  const [showSlotEditor, setShowSlotEditor] = useState<string | null>(null); // offering_id

  // ── Load all data ─────────────────────────────────────────────
  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const vendorId = session?.user?.id || user.id;

      const [offRes, slotRes, bookRes] = await Promise.all([
        supabase.from('class_offerings').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
        supabase.from('availability_slots').select('*').eq('vendor_id', vendorId).order('starts_at'),
        supabase.from('class_bookings').select('*, class_offerings(title), availability_slots(starts_at), profiles!class_bookings_student_id_fkey(full_name)').eq('vendor_id', vendorId).order('created_at', { ascending: false }),
      ]);

      setOfferings(offRes.data || []);
      setSlots(slotRes.data || []);

      const bs = (bookRes.data || []).map((b: any) => ({
        ...b,
        student_name: b.profiles?.full_name,
        offering_title: b.class_offerings?.title,
        starts_at: b.availability_slots?.starts_at,
      }));
      setBookings(bs);
    } catch (e) {
      console.error('[teacher] reload error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, [user?.id]);

  // ── Save offering (create or update) ──────────────────────────
  const saveOffering = async (data: Partial<Offering>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { addToast({ message: '⚠ Inicia sesión', type: 'error' }); return; }

      const payload = {
        vendor_id: session.user.id,
        title: data.title || 'Nueva clase',
        description: data.description || '',
        category: data.category || 'class',
        style: data.style || [],
        level: data.level || 'all',
        duration_minutes: data.duration_minutes || 60,
        price: data.price || 0,
        currency: 'EUR',
        max_students: data.max_students || 1,
        is_online: data.is_online !== false,
        cover_image: data.cover_image || '',
        status: 'active',
      };

      if (data.id) {
        const { error } = await supabase.from('class_offerings').update(payload).eq('id', data.id);
        if (error) throw error;
        addToast({ message: '✅ Clase actualizada', type: 'success' });
      } else {
        const { error } = await supabase.from('class_offerings').insert(payload);
        if (error) throw error;
        addToast({ message: '✅ Clase creada', type: 'success' });
      }
      setEditingOffering(null);
      reload();
    } catch (e: any) {
      console.error('[teacher] save error:', e);
      addToast({ message: `❌ ${e.message}`, type: 'error' });
    }
  };

  const deleteOffering = async (id: string) => {
    if (!confirm('¿Eliminar esta clase? También se borrarán sus horarios.')) return;
    try {
      const { error } = await supabase.from('class_offerings').delete().eq('id', id);
      if (error) throw error;
      addToast({ message: 'Clase eliminada', type: 'info' });
      reload();
    } catch (e: any) {
      addToast({ message: `❌ ${e.message}`, type: 'error' });
    }
  };

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalOfferings: offerings.length,
    activeOfferings: offerings.filter(o => o.status === 'active').length,
    totalSlots: slots.length,
    availableSlots: slots.filter(s => s.status === 'available' && new Date(s.starts_at) > new Date()).length,
    totalBookings: bookings.length,
    upcomingBookings: bookings.filter(b => b.starts_at && new Date(b.starts_at) > new Date()).length,
    totalEarnings: bookings.reduce((sum, b) => sum + (b.amount_paid * 0.85), 0),
  }), [offerings, slots, bookings]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
        <p className="text-sm text-gray-400 mt-2">Cargando tu panel…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Mis clases', val: stats.activeOfferings, icon: '🎓', color: 'from-pink-500 to-fuchsia-600' },
          { label: 'Horarios libres', val: stats.availableSlots, icon: '📅', color: 'from-purple-500 to-violet-600' },
          { label: 'Reservas', val: stats.totalBookings, icon: '👥', color: 'from-blue-500 to-indigo-600' },
          { label: 'Ganado (85%)', val: `€${stats.totalEarnings.toFixed(0)}`, icon: '💰', color: 'from-green-500 to-emerald-600' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-2xl p-3`}>
            <span className="text-xl">{s.icon}</span>
            <p className="font-black text-xl mt-1">{s.val}</p>
            <p className="text-[10px] uppercase font-bold tracking-wide opacity-90">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card-white rounded-2xl p-1.5 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'offerings', label: 'Mis clases', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'slots',     label: 'Horarios',   icon: <CalIcon className="w-4 h-4" /> },
          { id: 'bookings',  label: `Reservas (${stats.totalBookings})`, icon: <Users className="w-4 h-4" /> },
        ].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Mis clases */}
      {tab === 'offerings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" /> Mis clases
            </h3>
            <button onClick={() => setEditingOffering({ duration_minutes: 60, max_students: 1, is_online: true, price: 25, currency: 'EUR', style: [] })}
              className="bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95">
              <Plus className="w-3.5 h-3.5" /> Nueva clase
            </button>
          </div>

          {offerings.length === 0 ? (
            <div className="card-white p-10 text-center text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm mb-1 font-bold text-gray-700">Aún no tienes clases creadas</p>
              <p className="text-xs mb-4">Crea tu primera clase para que los estudiantes puedan reservar</p>
              <button onClick={() => setEditingOffering({ duration_minutes: 60, max_students: 1, is_online: true, price: 25, currency: 'EUR', style: [] })}
                className="bg-brand-orange text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                + Crear mi primera clase
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offerings.map(o => {
                const oSlots = slots.filter(s => s.offering_id === o.id && new Date(s.starts_at) > new Date());
                return (
                  <div key={o.id} className="card-white overflow-hidden flex flex-col">
                    {o.cover_image && (
                      <div className="aspect-[16/9] bg-gray-100 relative">
                        <img src={o.cover_image} alt={o.title} className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">€{o.price}</span>
                      </div>
                    )}
                    <div className="p-3 flex-1 flex flex-col">
                      <h4 className="font-black text-sm text-gray-900 line-clamp-2 mb-1">{o.title}</h4>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {o.style?.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] bg-pink-50 text-pink-600 font-bold px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                        <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded-full">{o.level}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 mb-3">
                        <span><Clock className="w-3 h-3 inline" /> {o.duration_minutes}min</span>
                        <span>•</span>
                        <span><Users className="w-3 h-3 inline" /> max {o.max_students}</span>
                        <span>•</span>
                        <span>📅 {oSlots.length} horarios</span>
                      </div>
                      <div className="flex gap-1 mt-auto">
                        <button onClick={() => setShowSlotEditor(o.id)}
                          className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                          <CalIcon className="w-3.5 h-3.5" /> Horarios
                        </button>
                        <button onClick={() => setEditingOffering(o)}
                          className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-2 rounded-lg">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteOffering(o.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Horarios */}
      {tab === 'slots' && (
        <SlotsTab offerings={offerings} slots={slots} onReload={reload} />
      )}

      {/* TAB: Reservas */}
      {tab === 'bookings' && (
        <div className="space-y-3">
          <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" /> Reservas recibidas
          </h3>
          {bookings.length === 0 ? (
            <div className="card-white p-10 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Todavía no tienes reservas.</p>
              <p className="text-xs mt-1">Aparecerán aquí cuando un estudiante reserve una de tus clases.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => {
                const startsAt = b.starts_at ? new Date(b.starts_at) : null;
                const minutesUntil = startsAt ? Math.round((startsAt.getTime() - Date.now()) / 60000) : null;
                const canJoin = minutesUntil !== null && minutesUntil <= 15 && minutesUntil >= -120;
                return (
                  <div key={b.id} className="card-white p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {(b.student_name || 'E')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{b.student_name || 'Estudiante'}</p>
                      <p className="text-xs text-gray-500 truncate">{b.offering_title || 'Clase'}</p>
                      {startsAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          📅 {startsAt.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-pink-600 font-black text-sm">€{b.amount_paid}</span>
                      {canJoin ? (
                        <button onClick={() => navigate(`/clase/${b.id}`)}
                          className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                          <Video className="w-3 h-3" /> EN VIVO
                        </button>
                      ) : (
                        <button onClick={() => navigate(`/clase/${b.id}`)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full">
                          Ver sala
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Editor de clase */}
      {editingOffering && (
        <OfferingEditor
          initial={editingOffering}
          onClose={() => setEditingOffering(null)}
          onSave={saveOffering}
        />
      )}

      {/* Editor de horarios */}
      {showSlotEditor && (
        <SlotEditor
          offering={offerings.find(o => o.id === showSlotEditor)!}
          existingSlots={slots.filter(s => s.offering_id === showSlotEditor)}
          onClose={() => setShowSlotEditor(null)}
          onReload={reload}
        />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
//   OFFERING EDITOR (modal de crear/editar clase)
// ═════════════════════════════════════════════════════════════════
const OfferingEditor: React.FC<{
  initial: Partial<Offering>;
  onClose: () => void;
  onSave: (data: Partial<Offering>) => void;
}> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<Offering>>(initial);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useUIStore();

  const handleCover = async (file: File) => {
    setUploading(true);
    const r = await uploadImage(file, 'classes');
    if (r.url) setForm(f => ({ ...f, cover_image: r.url! }));
    else addToast({ message: `❌ ${r.error}`, type: 'error' });
    setUploading(false);
  };

  const toggleStyle = (s: string) => {
    const cur = form.style || [];
    setForm(f => ({ ...f, style: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] }));
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-brand-orange text-white">
          <h2 className="font-black text-base">{form.id ? '✏️ Editar clase' : '✨ Nueva clase'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Título *</label>
            <input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Bachata Sensual Nivel Intermedio"
              className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Descripción</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              placeholder="Describe tu clase…"
              className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Categoría</label>
              <select value={form.category || 'class'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Nivel</label>
              <select value={form.level || 'all'} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm">
                {LEVELS.map(l => <option key={l} value={l}>{l === 'all' ? 'Todos los niveles' : l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Estilos</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {STYLES.map(s => {
                const isActive = (form.style || []).includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleStyle(s)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                      isActive ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                    {isActive && '✓ '}{s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Duración (min)</label>
              <input type="number" value={form.duration_minutes || 60} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Max alumnos</label>
              <input type="number" value={form.max_students || 1} onChange={e => setForm(f => ({ ...f, max_students: +e.target.value }))}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Precio (€)</label>
              <input type="number" value={form.price || 0} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Imagen de portada</label>
            {form.cover_image ? (
              <div className="relative mt-1 rounded-xl overflow-hidden h-32">
                <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm(f => ({ ...f, cover_image: '' }))}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="mt-1 block w-full border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-xl py-6 text-center cursor-pointer">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-pink-500 mx-auto" /> : (
                  <>
                    <p className="text-xs font-bold text-pink-600">📷 Subir imagen</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP — max 10MB</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCover(f); }} />
              </label>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex items-center justify-end gap-2 flex-shrink-0 bg-gray-50 dark:bg-gray-950">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600">Cancelar</button>
          <button onClick={() => onSave(form)} disabled={!form.title}
            className="bg-brand-orange text-white text-sm font-black px-5 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 disabled:opacity-40">
            <Save className="w-4 h-4" /> {form.id ? 'Guardar cambios' : 'Crear clase'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
//   SLOT EDITOR (gestionar horarios de UNA clase)
// ═════════════════════════════════════════════════════════════════
const SlotEditor: React.FC<{
  offering: Offering;
  existingSlots: Slot[];
  onClose: () => void;
  onReload: () => void;
}> = ({ offering, existingSlots, onClose, onReload }) => {
  const [newDate, setNewDate] = useState('');
  const [newTimes, setNewTimes] = useState(['10:00', '16:00', '19:00', '21:00']);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();

  const addSlots = async () => {
    if (!newDate) { addToast({ message: '⚠ Elige una fecha', type: 'error' }); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión');
      const inserts = newTimes.map(t => {
        const [h, m] = t.split(':').map(Number);
        const start = new Date(newDate);
        start.setHours(h, m, 0, 0);
        return {
          vendor_id: session.user.id,
          offering_id: offering.id,
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + offering.duration_minutes * 60000).toISOString(),
          status: 'available',
          max_students: offering.max_students,
        };
      });
      const { error } = await supabase.from('availability_slots').insert(inserts);
      if (error) throw error;
      addToast({ message: `✅ ${inserts.length} horarios añadidos`, type: 'success' });
      setNewDate('');
      onReload();
    } catch (e: any) {
      addToast({ message: `❌ ${e.message}`, type: 'error' });
    }
    setSaving(false);
  };

  const removeSlot = async (id: string) => {
    try {
      await supabase.from('availability_slots').delete().eq('id', id);
      addToast({ message: 'Horario eliminado', type: 'info' });
      onReload();
    } catch (e: any) {
      addToast({ message: `❌ ${e.message}`, type: 'error' });
    }
  };

  const upcoming = existingSlots.filter(s => new Date(s.starts_at) > new Date());

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-brand-orange text-white">
          <div>
            <h2 className="font-black text-base">📅 Horarios disponibles</h2>
            <p className="text-xs opacity-90 truncate">{offering.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Añadir nuevos */}
          <div className="bg-brand-orange dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-3 space-y-2">
            <p className="text-xs font-black uppercase text-gray-500 tracking-wider">➕ Añadir horarios</p>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-1.5">
              {['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => {
                const active = newTimes.includes(t);
                return (
                  <button key={t} onClick={() => setNewTimes(arr => active ? arr.filter(x => x !== t) : [...arr, t])}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                      active ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                    {active && '✓ '}{t}
                  </button>
                );
              })}
            </div>
            <button onClick={addSlots} disabled={saving || !newDate || newTimes.length === 0}
              className="w-full bg-brand-orange text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Añadir {newTimes.length} horario{newTimes.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Horarios existentes */}
          <div>
            <p className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">Próximos {upcoming.length} horarios</p>
            {upcoming.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-6">Aún no has añadido horarios futuros</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {upcoming.map(s => {
                  const d = new Date(s.starts_at);
                  const isBooked = s.booked_count >= s.max_students;
                  return (
                    <div key={s.id} className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                      isBooked ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'
                    }`}>
                      <CalIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-bold flex-1 text-gray-700 dark:text-gray-300">
                        {d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' • '}
                        {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isBooked ? (
                        <span className="text-[10px] bg-green-500 text-white font-black px-2 py-0.5 rounded-full">RESERVADO</span>
                      ) : (
                        <button onClick={() => removeSlot(s.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════
//   SLOTS TAB (vista global de todos los horarios)
// ═════════════════════════════════════════════════════════════════
const SlotsTab: React.FC<{ offerings: Offering[]; slots: Slot[]; onReload: () => void }> = ({ offerings, slots, onReload }) => {
  const upcoming = slots.filter(s => new Date(s.starts_at) > new Date()).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const byDay = upcoming.reduce<Record<string, Slot[]>>((acc, s) => {
    const k = s.starts_at.split('T')[0];
    (acc[k] ||= []).push(s);
    return acc;
  }, {});
  const offeringMap = Object.fromEntries(offerings.map(o => [o.id, o]));

  return (
    <div className="space-y-3">
      <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
        <CalIcon className="w-4 h-4 text-pink-500" /> Mi calendario
      </h3>
      {upcoming.length === 0 ? (
        <div className="card-white p-10 text-center text-gray-400">
          <CalIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tienes horarios futuros</p>
          <p className="text-xs mt-1">Crea una clase y añade horarios desde el botón "Horarios"</p>
        </div>
      ) : (
        Object.entries(byDay).map(([day, daySlots]) => (
          <div key={day} className="card-white p-3">
            <p className="font-black text-sm text-gray-900 mb-2">
              {new Date(day).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="space-y-1">
              {daySlots.map(s => {
                const o = offeringMap[s.offering_id];
                const isBooked = s.booked_count >= s.max_students;
                return (
                  <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                    <span className="font-black text-pink-600 w-12">{new Date(s.starts_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex-1 truncate font-bold text-gray-700 dark:text-gray-300">{o?.title || 'Clase'}</span>
                    {isBooked && <span className="text-[10px] bg-green-500 text-white font-black px-2 py-0.5 rounded-full">{s.booked_count}/{s.max_students}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TeacherClassesPanel;
