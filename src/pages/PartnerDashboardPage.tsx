import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ListChecks, Video, CreditCard, Crown, LifeBuoy,
  Loader2, Plus, CheckCircle2, Clock, MapPin, Send, Trash2, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import { AD_PLANS } from '../data/adPlans';
import { SupportThread } from './ChatPage';

type Tab = 'resumen' | 'ganancias' | 'gestiones' | 'contenido' | 'pagos' | 'planes' | 'soporte';

interface PartnerRow { user_id: string; display_name: string | null; cities: string[]; commission_percent: number; status: string; bio: string | null; }
interface TaskRow { id: string; city: string | null; title: string; type: string; status: string; amount: number; commission: number; notes: string | null; due_date: string | null; created_at: string; completed_at: string | null; }
interface PayoutRow { id: string; type: string; label: string | null; details: string | null; is_default: boolean; }
interface WithdrawalRow { id: string; method: string | null; amount: number; status: string; requested_at: string; }
interface ContentRow { id: string; city: string | null; title: string; video_url: string | null; needs_editing: boolean; status: string; created_at: string; }

const eur = (n: number) => `€${(Number(n) || 0).toFixed(2)}`;
const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada', paid: 'Pagado', rejected: 'Rechazado', submitted: 'Enviado', in_editing: 'En edición', published: 'Publicado' };

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',   label: 'Resumen',        icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'ganancias', label: 'Ganancias',      icon: <Wallet className="w-4 h-4" /> },
  { id: 'gestiones', label: 'Gestiones',      icon: <ListChecks className="w-4 h-4" /> },
  { id: 'contenido', label: 'Contenido',      icon: <Video className="w-4 h-4" /> },
  { id: 'pagos',     label: 'Pagos y retiros',icon: <CreditCard className="w-4 h-4" /> },
  { id: 'planes',    label: 'Planes y política', icon: <Crown className="w-4 h-4" /> },
  { id: 'soporte',   label: 'Soporte',        icon: <LifeBuoy className="w-4 h-4" /> },
];

const PartnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const uid = user?.id;

  const [tab, setTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [methods, setMethods] = useState<PayoutRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [content, setContent] = useState<ContentRow[]>([]);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const safety = setTimeout(() => setLoading(false), 8000);
    const [p, t, m, w, c] = await Promise.all([
      supabase.from('partners').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('partner_tasks').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_payout_methods').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_withdrawals').select('*').eq('partner_id', uid).order('requested_at', { ascending: false }),
      supabase.from('partner_content').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
    ]);
    setPartner((p.data as PartnerRow) || null);
    setTasks((t.data as TaskRow[]) || []);
    setMethods((m.data as PayoutRow[]) || []);
    setWithdrawals((w.data as WithdrawalRow[]) || []);
    setContent((c.data as ContentRow[]) || []);
    clearTimeout(safety);
    setLoading(false);
  }, [uid]);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  // ── Métricas de ganancias ──
  const earned = useMemo(() => tasks.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.commission || 0), 0), [tasks]);
  const pendingComm = useMemo(() => tasks.filter(t => t.status !== 'completed').reduce((s, t) => s + Number(t.commission || 0), 0), [tasks]);
  const withdrawn = useMemo(() => withdrawals.filter(w => w.status !== 'rejected').reduce((s, w) => s + Number(w.amount || 0), 0), [withdrawals]);
  const available = Math.max(0, earned - withdrawn);
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const doneTasks = tasks.filter(t => t.status === 'completed');

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-5 py-7">
          <p className="text-fuchsia-300 font-black text-xs tracking-widest uppercase">Panel Partner</p>
          <h1 className="font-display font-black text-2xl sm:text-3xl mt-1">Hola, {partner?.display_name || user?.name} 👋</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-white/60">
            <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {partner?.cities?.length ? partner.cities.join(', ') : 'Sin ciudad asignada'}</span>
            <span className="opacity-40">·</span>
            <span>Comisión: <b className="text-white">{partner?.commission_percent ?? 10}%</b></span>
            {partner?.status === 'suspended' && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-bold">Suspendido</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-3 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition ${tab === t.id ? 'border-fuchsia-500 text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 pt-6">
        {!partner && (
          <div className="mb-6 rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/30 p-4 text-sm text-orange-200">
            Aún no tienes ficha de partner cargada. Si acabas de ser aprobado, recarga en unos minutos o escríbenos por Soporte.
          </div>
        )}

        {tab === 'resumen'   && <Resumen earned={earned} available={available} pendingComm={pendingComm} openCount={openTasks.length} doneCount={doneTasks.length} onGo={setTab} />}
        {tab === 'ganancias' && <Ganancias earned={earned} available={available} pendingComm={pendingComm} withdrawn={withdrawn} tasks={tasks} />}
        {tab === 'gestiones' && <Gestiones uid={uid!} partner={partner} tasks={tasks} openTasks={openTasks} doneTasks={doneTasks} reload={load} addToast={addToast} />}
        {tab === 'contenido' && <Contenido uid={uid!} partner={partner} content={content} reload={load} addToast={addToast} />}
        {tab === 'pagos'     && <Pagos uid={uid!} available={available} methods={methods} withdrawals={withdrawals} reload={load} addToast={addToast} />}
        {tab === 'planes'    && <Planes navigate={navigate} />}
        {tab === 'soporte'   && user && <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 h-[70vh]"><SupportThread user={user} onBack={() => setTab('resumen')} /></div>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: string; sub?: string; grad: string }> = ({ label, value, sub, grad }) => (
  <div className={`rounded-2xl p-4 bg-gradient-to-br ${grad}`}>
    <p className="text-white/80 text-xs font-bold uppercase tracking-wide">{label}</p>
    <p className="font-display font-black text-2xl mt-1">{value}</p>
    {sub && <p className="text-white/70 text-xs mt-0.5">{sub}</p>}
  </div>
);

const Resumen: React.FC<{ earned: number; available: number; pendingComm: number; openCount: number; doneCount: number; onGo: (t: Tab) => void }> = ({ earned, available, pendingComm, openCount, doneCount, onGo }) => (
  <div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Disponible" value={eur(available)} sub="Listo para retirar" grad="from-emerald-500 to-green-600" />
      <Stat label="Ganado total" value={eur(earned)} sub="Comisiones completadas" grad="from-orange-500 to-fuchsia-600" />
      <Stat label="Por cobrar" value={eur(pendingComm)} sub="Gestiones en curso" grad="from-fuchsia-500 to-purple-600" />
      <Stat label="Gestiones" value={`${openCount + doneCount}`} sub={`${openCount} pendientes · ${doneCount} hechas`} grad="from-sky-500 to-blue-600" />
    </div>
    <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <button onClick={() => onGo('gestiones')} className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 hover:bg-white/10 transition">
        <ListChecks className="w-6 h-6 text-fuchsia-400" />
        <p className="font-bold mt-2">Tus gestiones</p>
        <p className="text-white/50 text-sm">Trabajos pendientes y completados de tu ciudad.</p>
      </button>
      <button onClick={() => onGo('contenido')} className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 hover:bg-white/10 transition">
        <Video className="w-6 h-6 text-orange-400" />
        <p className="font-bold mt-2">Enviar contenido</p>
        <p className="text-white/50 text-sm">Sube tus grabaciones o mándalas a la central para editar.</p>
      </button>
    </div>
  </div>
);

const Ganancias: React.FC<{ earned: number; available: number; pendingComm: number; withdrawn: number; tasks: TaskRow[] }> = ({ earned, available, pendingComm, withdrawn, tasks }) => {
  const commissioned = tasks.filter(t => Number(t.commission) > 0);
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Disponible" value={eur(available)} grad="from-emerald-500 to-green-600" />
        <Stat label="Ganado total" value={eur(earned)} grad="from-orange-500 to-fuchsia-600" />
        <Stat label="Por cobrar" value={eur(pendingComm)} grad="from-fuchsia-500 to-purple-600" />
        <Stat label="Retirado" value={eur(withdrawn)} grad="from-gray-600 to-gray-700" />
      </div>
      <h3 className="font-bold mb-2">Detalle de comisiones</h3>
      {commissioned.length === 0 ? (
        <p className="text-white/50 text-sm">Aún no tienes comisiones registradas. Cada gestión que traigas a tu ciudad genera comisión.</p>
      ) : (
        <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
          {commissioned.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3.5 bg-white/[0.03]">
              <div>
                <p className="font-bold text-sm">{t.title}</p>
                <p className="text-white/40 text-xs">{t.city || '—'} · {STATUS_LABEL[t.status] || t.status}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-400">{eur(t.commission)}</p>
                <p className="text-white/40 text-xs">de {eur(t.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TASK_TYPES = [
  { v: 'event', l: 'Evento' }, { v: 'venue', l: 'Local' }, { v: 'artist', l: 'Artista' },
  { v: 'content', l: 'Contenido' }, { v: 'promo', l: 'Promoción' }, { v: 'other', l: 'Otro' },
];

const Gestiones: React.FC<{ uid: string; partner: PartnerRow | null; tasks: TaskRow[]; openTasks: TaskRow[]; doneTasks: TaskRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, partner, openTasks, doneTasks, reload, addToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('event');
  const [amount, setAmount] = useState('');
  const [city, setCity] = useState(partner?.cities?.[0] || '');
  const [saving, setSaving] = useState(false);
  const commPct = partner?.commission_percent ?? 10;

  const add = async () => {
    if (!title.trim()) { addToast({ message: 'Ponle un título a la gestión', type: 'error' }); return; }
    setSaving(true);
    const amt = parseFloat(amount) || 0;
    const { error } = await supabase.from('partner_tasks').insert({
      partner_id: uid, title: title.trim(), type, city: city.trim() || null,
      amount: amt, commission: Math.round(amt * commPct) / 100, status: 'pending',
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setTitle(''); setAmount(''); setShowForm(false);
    addToast({ message: 'Gestión creada', type: 'success' });
    reload();
  };

  const setStatus = async (t: TaskRow, status: string) => {
    const patch: any = { status };
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from('partner_tasks').update(patch).eq('id', t.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    reload();
  };

  const del = async (t: TaskRow) => {
    await supabase.from('partner_tasks').delete().eq('id', t.id);
    reload();
  };

  const Item: React.FC<{ t: TaskRow }> = ({ t }) => (
    <div className="flex items-center justify-between p-3.5 bg-white/[0.03] gap-3">
      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{t.title}</p>
        <p className="text-white/40 text-xs">{TASK_TYPES.find(x => x.v === t.type)?.l} · {t.city || '—'} · comisión {eur(t.commission)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {t.status !== 'completed' ? (
          <>
            {t.status === 'pending' && <button onClick={() => setStatus(t, 'in_progress')} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300">Empezar</button>}
            <button onClick={() => setStatus(t, 'completed')} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">Completar</button>
            <button onClick={() => del(t)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Hecha</span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Gestiones de tu ciudad</h3>
        <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 rounded-xl px-3.5 py-2"><Plus className="w-4 h-4" /> Nueva</button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-4 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ej. Evento salsa sábado en Sala X)" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          <div className="grid sm:grid-cols-3 gap-2.5">
            <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none">
              {TASK_TYPES.map(x => <option key={x.v} value={x.v} className="bg-gray-900">{x.l}</option>)}
            </select>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Valor €" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          </div>
          <p className="text-white/40 text-xs">Tu comisión ({commPct}%): <b className="text-emerald-400">{eur((parseFloat(amount) || 0) * commPct / 100)}</b></p>
          <button onClick={add} disabled={saving} className="w-full bg-white text-gray-900 font-bold rounded-xl py-2.5 disabled:opacity-60">{saving ? 'Guardando…' : 'Crear gestión'}</button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-white/50 mb-2"><Clock className="w-4 h-4" /> Pendientes ({openTasks.length})</div>
      {openTasks.length === 0 ? <p className="text-white/40 text-sm mb-5">No tienes gestiones pendientes. 🎉</p> : (
        <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden mb-5">{openTasks.map(t => <Item key={t.id} t={t} />)}</div>
      )}

      <div className="flex items-center gap-2 text-sm text-white/50 mb-2"><CheckCircle2 className="w-4 h-4" /> Completadas ({doneTasks.length})</div>
      {doneTasks.length === 0 ? <p className="text-white/40 text-sm">Aún no has completado gestiones.</p> : (
        <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">{doneTasks.map(t => <Item key={t.id} t={t} />)}</div>
      )}
    </div>
  );
};

const Contenido: React.FC<{ uid: string; partner: PartnerRow | null; content: ContentRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, partner, content, reload, addToast }) => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [needsEditing, setNeedsEditing] = useState(false);
  const [city, setCity] = useState(partner?.cities?.[0] || '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) { addToast({ message: 'Ponle título al contenido', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('partner_content').insert({
      partner_id: uid, title: title.trim(), video_url: videoUrl.trim() || null,
      needs_editing: needsEditing, city: city.trim() || null,
      status: needsEditing ? 'submitted' : 'submitted',
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setTitle(''); setVideoUrl(''); setNeedsEditing(false);
    addToast({ message: needsEditing ? 'Enviado a la central para editar ✔️' : 'Contenido enviado ✔️', type: 'success' });
    reload();
  };

  return (
    <div>
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-5 space-y-3">
        <h3 className="font-bold">Enviar contenido de tu ciudad</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ej. Aftermovie social bachata Madrid)" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
        <div className="grid sm:grid-cols-2 gap-2.5">
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Enlace del vídeo (Drive, YouTube…)" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
        </div>
        <button type="button" onClick={() => setNeedsEditing(v => !v)} className={`w-full text-left rounded-xl p-3 ring-1 transition ${needsEditing ? 'bg-orange-500/15 ring-orange-500' : 'bg-black/30 ring-white/15'}`}>
          <span className="font-bold text-sm">✂️ No sé editar — enviar a la central</span>
          <p className="text-white/50 text-xs mt-0.5">El equipo de BailaNow editará tu material y lo publicará.</p>
        </button>
        <button onClick={submit} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-fuchsia-600 font-bold rounded-xl py-2.5 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
        </button>
      </div>

      <h3 className="font-bold mb-2">Tus envíos</h3>
      {content.length === 0 ? <p className="text-white/40 text-sm">Aún no has enviado contenido.</p> : (
        <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
          {content.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3.5 bg-white/[0.03]">
              <div>
                <p className="font-bold text-sm">{c.title}</p>
                <p className="text-white/40 text-xs">{c.city || '—'} {c.needs_editing && '· ✂️ edición central'}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-white/70">{STATUS_LABEL[c.status] || c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Pagos: React.FC<{ uid: string; available: number; methods: PayoutRow[]; withdrawals: WithdrawalRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, available, methods, withdrawals, reload, addToast }) => {
  const [type, setType] = useState('paypal');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [requesting, setRequesting] = useState(false);

  const addMethod = async () => {
    if (!details.trim()) { addToast({ message: 'Escribe los datos de cobro', type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('partner_payout_methods').insert({
      partner_id: uid, type, details: details.trim(),
      label: type === 'paypal' ? 'PayPal' : type === 'bank' ? 'Transferencia' : 'Otro',
      is_default: methods.length === 0,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setDetails('');
    addToast({ message: 'Forma de pago añadida', type: 'success' });
    reload();
  };

  const delMethod = async (id: string) => { await supabase.from('partner_payout_methods').delete().eq('id', id); reload(); };

  const requestWithdrawal = async () => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { addToast({ message: 'Indica un importe', type: 'error' }); return; }
    if (amt > available) { addToast({ message: 'No puedes retirar más de tu saldo disponible', type: 'error' }); return; }
    if (methods.length === 0) { addToast({ message: 'Añade una forma de pago primero', type: 'error' }); return; }
    setRequesting(true);
    const def = methods.find(m => m.is_default) || methods[0];
    const { error } = await supabase.from('partner_withdrawals').insert({
      partner_id: uid, amount: amt, method: def.label || def.type, status: 'pending',
    });
    setRequesting(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setAmount('');
    addToast({ message: 'Solicitud de retiro enviada', type: 'success' });
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-5">
        <p className="text-white/80 text-xs font-bold uppercase">Saldo disponible</p>
        <p className="font-display font-black text-3xl">{eur(available)}</p>
      </div>

      {/* Formas de pago */}
      <div>
        <h3 className="font-bold mb-2">Formas de pago</h3>
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 space-y-3">
          <div className="grid sm:grid-cols-[140px_1fr] gap-2.5">
            <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none">
              <option value="paypal" className="bg-gray-900">PayPal</option>
              <option value="bank" className="bg-gray-900">Transferencia</option>
              <option value="other" className="bg-gray-900">Otro</option>
            </select>
            <input value={details} onChange={e => setDetails(e.target.value)} placeholder={type === 'paypal' ? 'Email de PayPal' : type === 'bank' ? 'IBAN' : 'Datos de cobro'} className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          </div>
          <button onClick={addMethod} disabled={saving} className="inline-flex items-center gap-1.5 text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl px-3.5 py-2 disabled:opacity-60"><Plus className="w-4 h-4" /> Añadir</button>
        </div>
        {methods.length > 0 && (
          <div className="mt-2 rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
            {methods.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-white/[0.03]">
                <span className="text-sm">{m.label} · <span className="text-white/50">{m.details}</span> {m.is_default && <span className="text-[10px] font-bold text-emerald-400 ml-1">DEFECTO</span>}</span>
                <button onClick={() => delMethod(m.id)} className="p-1.5 text-white/40 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retirar */}
      <div>
        <h3 className="font-bold mb-2">Retirar ganancias</h3>
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 flex flex-col sm:flex-row gap-2.5">
          <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder={`Importe (máx. ${eur(available)})`} className="flex-1 rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          <button onClick={requestWithdrawal} disabled={requesting} className="inline-flex items-center justify-center gap-1.5 font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 rounded-xl px-5 py-2.5 disabled:opacity-60"><ArrowUpRight className="w-4 h-4" /> Solicitar retiro</button>
        </div>
      </div>

      {/* Historial */}
      <div>
        <h3 className="font-bold mb-2">Historial de retiros</h3>
        {withdrawals.length === 0 ? <p className="text-white/40 text-sm">Sin retiros todavía.</p> : (
          <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3.5 bg-white/[0.03]">
                <div>
                  <p className="font-bold text-sm">{eur(w.amount)}</p>
                  <p className="text-white/40 text-xs">{w.method} · {new Date(w.requested_at).toLocaleDateString('es')}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${w.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : w.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{STATUS_LABEL[w.status] || w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Planes: React.FC<{ navigate: (p: string) => void }> = ({ navigate }) => (
  <div className="space-y-8">
    <div>
      <h3 className="font-bold mb-1">Planes de suscripción</h3>
      <p className="text-white/50 text-sm mb-3">Los planes que puedes ofrecer y explicar a los artistas y usuarios de tu ciudad.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SUBSCRIPTION_PLANS.map((p: any) => (
          <div key={p.id} className={`rounded-2xl p-4 bg-gradient-to-br ${p.color} ${p.popular ? 'ring-2 ring-white/40' : ''}`}>
            {p.popular && <span className="text-[10px] font-black bg-white/20 rounded-full px-2 py-0.5">POPULAR</span>}
            <p className="font-display font-black text-lg mt-1">{p.name}</p>
            <p className="font-black text-2xl">€{p.price}<span className="text-sm font-normal opacity-70">/{p.period}</span></p>
            <p className="text-white/70 text-xs mt-1">{p.description}</p>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="font-bold mb-1">Planes para negocios</h3>
      <p className="text-white/50 text-sm mb-3">Para locales y escuelas que quieran promocionarse.</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {AD_PLANS.map(p => (
          <div key={p.id} className={`rounded-2xl p-4 bg-gradient-to-br ${p.gradient} ${p.popular ? 'ring-2 ring-white/40' : ''}`}>
            <span className="text-2xl">{p.icon}</span>
            <p className="font-display font-black text-lg mt-1">{p.name}</p>
            <p className="font-black text-2xl">€{p.price}<span className="text-sm font-normal opacity-70">{p.period}</span></p>
            <p className="text-white/70 text-xs mt-1">{p.tagline}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
      <h3 className="font-bold mb-1">Política de la app</h3>
      <p className="text-white/50 text-sm mb-3">Como partner representas a BailaNow: revisa y respeta nuestras condiciones y privacidad.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => navigate('/legal')} className="text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2">Términos y política</button>
        <button onClick={() => navigate('/precios')} className="text-sm font-bold bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2">Ver precios completos</button>
      </div>
    </div>
  </div>
);

export default PartnerDashboardPage;
