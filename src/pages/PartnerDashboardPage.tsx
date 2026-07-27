import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ListChecks, Video, CreditCard, Crown, LifeBuoy,
  Loader2, Plus, CheckCircle2, Clock, MapPin, Send, Trash2, ArrowUpRight,
  Inbox, Copy, Instagram, Facebook, Music2, MessageCircle, ArrowLeft, Check, UsersRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import { AD_PLANS } from '../data/adPlans';
import { SupportThread } from './ChatPage';

type Tab = 'resumen' | 'bandeja' | 'ganancias' | 'gestiones' | 'equipo' | 'contenido' | 'pagos' | 'planes' | 'soporte';

interface PartnerRow { user_id: string; display_name: string | null; cities: string[]; commission_percent: number; status: string; bio: string | null; }
interface TaskRow { id: string; city: string | null; title: string; type: string; status: string; amount: number; commission: number; notes: string | null; due_date: string | null; created_at: string; completed_at: string | null; rep_id: string | null; }
interface PayoutRow { id: string; type: string; label: string | null; details: string | null; is_default: boolean; }
interface WithdrawalRow { id: string; method: string | null; amount: number; status: string; requested_at: string; }
interface ContentRow { id: string; city: string | null; title: string; video_url: string | null; needs_editing: boolean; status: string; created_at: string; }
interface InquiryRow { id: string; city: string | null; channel: string; contact_name: string | null; contact_handle: string | null; contact_email: string | null; message: string; status: string; created_at: string; }
interface SocialRow { id: string; provider: string; handle: string | null; connected: boolean; }
interface RepRow { id: string; role: string; name: string; contact: string | null; city: string | null; commission_percent: number; status: string; }
interface PolicyRow { max_rrpp_percent: number; max_promoter_percent: number; default_rrpp_percent: number; default_promoter_percent: number; }

const eur = (n: number) => `€${(Number(n) || 0).toFixed(2)}`;
const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada', paid: 'Pagado', rejected: 'Rechazado', submitted: 'Enviado', in_editing: 'En edición', published: 'Publicado' };

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',   label: 'Resumen',        icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'bandeja',   label: 'Bandeja',        icon: <Inbox className="w-4 h-4" /> },
  { id: 'ganancias', label: 'Ganancias',      icon: <Wallet className="w-4 h-4" /> },
  { id: 'gestiones', label: 'Gestiones',      icon: <ListChecks className="w-4 h-4" /> },
  { id: 'equipo',    label: 'Equipo (RRPP)',  icon: <UsersRound className="w-4 h-4" /> },
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
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [reps, setReps] = useState<RepRow[]>([]);
  const [policy, setPolicy] = useState<PolicyRow | null>(null);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const safety = setTimeout(() => setLoading(false), 8000);
    const [p, t, m, w, c, inq, soc, rp, pol] = await Promise.all([
      supabase.from('partners').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('partner_tasks').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_payout_methods').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_withdrawals').select('*').eq('partner_id', uid).order('requested_at', { ascending: false }),
      supabase.from('partner_content').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_inquiries').select('*').eq('partner_id', uid).order('last_activity_at', { ascending: false }),
      supabase.from('partner_social_connections').select('*').eq('partner_id', uid),
      supabase.from('partner_reps').select('*').eq('partner_id', uid).order('created_at', { ascending: false }),
      supabase.from('partner_rep_policies').select('*').eq('id', 1).maybeSingle(),
    ]);
    setPartner((p.data as PartnerRow) || null);
    setTasks((t.data as TaskRow[]) || []);
    setMethods((m.data as PayoutRow[]) || []);
    setWithdrawals((w.data as WithdrawalRow[]) || []);
    setContent((c.data as ContentRow[]) || []);
    setInquiries((inq.data as InquiryRow[]) || []);
    setSocials((soc.data as SocialRow[]) || []);
    setReps((rp.data as RepRow[]) || []);
    setPolicy((pol.data as PolicyRow) || null);
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
          {partner?.cities?.[0] && <DirectLink city={partner.cities[0]} addToast={addToast} />}
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

        {tab === 'resumen'   && <Resumen earned={earned} available={available} pendingComm={pendingComm} openCount={openTasks.length} doneCount={doneTasks.length} newInquiries={inquiries.filter(i => i.status === 'new').length} onGo={setTab} />}
        {tab === 'bandeja'   && <Bandeja uid={uid!} partner={partner} inquiries={inquiries} socials={socials} reload={load} addToast={addToast} />}
        {tab === 'ganancias' && <Ganancias earned={earned} available={available} pendingComm={pendingComm} withdrawn={withdrawn} tasks={tasks} />}
        {tab === 'gestiones' && <Gestiones uid={uid!} partner={partner} tasks={tasks} openTasks={openTasks} doneTasks={doneTasks} reps={reps} reload={load} addToast={addToast} />}
        {tab === 'equipo'    && <Equipo uid={uid!} partner={partner} reps={reps} tasks={tasks} policy={policy} reload={load} addToast={addToast} />}
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

const DirectLink: React.FC<{ city: string; addToast: (t: any) => void }> = ({ city, addToast }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bailanow.com';
  const url = `${origin}/${encodeURIComponent(city)}`;
  const pretty = url.replace(/^https?:\/\//, '');
  const copy = () => {
    navigator.clipboard?.writeText(url).then(
      () => addToast({ message: 'Enlace copiado ✔️', type: 'success' }),
      () => addToast({ message: url, type: 'info' }),
    );
  };
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/15 pl-3 pr-1.5 py-1.5">
      <span className="text-xs text-white/50">Tu enlace:</span>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm font-bold text-fuchsia-300">{pretty}</a>
      <button onClick={copy} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"><Copy className="w-3.5 h-3.5" /></button>
    </div>
  );
};

const Resumen: React.FC<{ earned: number; available: number; pendingComm: number; openCount: number; doneCount: number; newInquiries: number; onGo: (t: Tab) => void }> = ({ earned, available, pendingComm, openCount, doneCount, newInquiries, onGo }) => (
  <div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Disponible" value={eur(available)} sub="Listo para retirar" grad="from-emerald-500 to-green-600" />
      <Stat label="Ganado total" value={eur(earned)} sub="Comisiones completadas" grad="from-orange-500 to-fuchsia-600" />
      <Stat label="Por cobrar" value={eur(pendingComm)} sub="Gestiones en curso" grad="from-fuchsia-500 to-purple-600" />
      <Stat label="Gestiones" value={`${openCount + doneCount}`} sub={`${openCount} pendientes · ${doneCount} hechas`} grad="from-sky-500 to-blue-600" />
    </div>
    <div className="grid sm:grid-cols-3 gap-3 mt-4">
      <button onClick={() => onGo('bandeja')} className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 hover:bg-white/10 transition relative">
        {newInquiries > 0 && <span className="absolute top-3 right-3 text-[10px] font-black bg-fuchsia-500 rounded-full px-2 py-0.5">{newInquiries} nuevas</span>}
        <Inbox className="w-6 h-6 text-fuchsia-400" />
        <p className="font-bold mt-2">Bandeja de entrada</p>
        <p className="text-white/50 text-sm">Preguntas de tu ciudad y redes sociales, todo en un chat.</p>
      </button>
      <button onClick={() => onGo('gestiones')} className="text-left rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 hover:bg-white/10 transition">
        <ListChecks className="w-6 h-6 text-sky-400" />
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

const Gestiones: React.FC<{ uid: string; partner: PartnerRow | null; tasks: TaskRow[]; openTasks: TaskRow[]; doneTasks: TaskRow[]; reps: RepRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, partner, openTasks, doneTasks, reps, reload, addToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('event');
  const [amount, setAmount] = useState('');
  const [city, setCity] = useState(partner?.cities?.[0] || '');
  const [repId, setRepId] = useState('');
  const [saving, setSaving] = useState(false);
  const commPct = partner?.commission_percent ?? 10;
  const activeReps = reps.filter(r => r.status === 'active');

  const add = async () => {
    if (!title.trim()) { addToast({ message: 'Ponle un título a la gestión', type: 'error' }); return; }
    setSaving(true);
    const amt = parseFloat(amount) || 0;
    const { error } = await supabase.from('partner_tasks').insert({
      partner_id: uid, title: title.trim(), type, city: city.trim() || null,
      amount: amt, commission: Math.round(amt * commPct) / 100, status: 'pending',
      rep_id: repId || null,
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setTitle(''); setAmount(''); setRepId(''); setShowForm(false);
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
          {activeReps.length > 0 && (
            <div>
              <label className="text-white/50 text-xs">¿Traída por un RRPP/Promotor?</label>
              <select value={repId} onChange={e => setRepId(e.target.value)} className="w-full mt-1 rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none">
                <option value="" className="bg-gray-900">— Directa (yo) —</option>
                {activeReps.map(r => <option key={r.id} value={r.id} className="bg-gray-900">{r.name} ({r.role === 'promoter' ? 'Promotor' : 'RRPP'} · {r.commission_percent}%)</option>)}
              </select>
            </div>
          )}
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

// ── EQUIPO · RRPP y Promotores de la ciudad (comisión acotada por BailaNow) ──
const REP_ROLES = [{ v: 'rrpp', l: 'RRPP' }, { v: 'promoter', l: 'Promotor' }];

const Equipo: React.FC<{ uid: string; partner: PartnerRow | null; reps: RepRow[]; tasks: TaskRow[]; policy: PolicyRow | null; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, partner, reps, tasks, policy, reload, addToast }) => {
  const maxRrpp = policy?.max_rrpp_percent ?? 20;
  const maxPromoter = policy?.max_promoter_percent ?? 15;
  const maxFor = (role: string) => (role === 'promoter' ? maxPromoter : maxRrpp);
  const defFor = (role: string) => (role === 'promoter' ? (policy?.default_promoter_percent ?? 8) : (policy?.default_rrpp_percent ?? 10));

  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState('rrpp');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [commission, setCommission] = useState(String(defFor('rrpp')));
  const [saving, setSaving] = useState(false);

  const onRole = (r: string) => { setRole(r); setCommission(String(defFor(r))); };

  const earnedByRep = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { if (t.rep_id && t.status === 'completed') { const r = reps.find(x => x.id === t.rep_id); if (r) map[r.id] = (map[r.id] || 0) + Number(t.amount || 0) * Number(r.commission_percent || 0) / 100; } });
    return map;
  }, [tasks, reps]);

  const create = async () => {
    if (!name.trim()) { addToast({ message: 'Escribe el nombre del RRPP/Promotor', type: 'error' }); return; }
    const pct = Math.min(parseFloat(commission) || 0, maxFor(role));
    setSaving(true);
    const { error } = await supabase.from('partner_reps').insert({
      partner_id: uid, role, name: name.trim(), contact: contact.trim() || null,
      city: partner?.cities?.[0] || null, commission_percent: pct, status: 'active',
    });
    setSaving(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setName(''); setContact(''); setRole('rrpp'); setCommission(String(defFor('rrpp'))); setShowForm(false);
    addToast({ message: `${name.trim()} añadido al equipo`, type: 'success' });
    reload();
  };

  const saveCommission = async (r: RepRow, value: string) => {
    const pct = Math.min(parseFloat(value) || 0, maxFor(r.role));
    const { error } = await supabase.from('partner_reps').update({ commission_percent: pct }).eq('id', r.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: `Comisión guardada (${pct}%)`, type: 'success' });
    reload();
  };
  const toggle = async (r: RepRow) => { await supabase.from('partner_reps').update({ status: r.status === 'active' ? 'suspended' : 'active' }).eq('id', r.id); reload(); };
  const remove = async (r: RepRow) => { await supabase.from('partner_reps').delete().eq('id', r.id); reload(); };

  return (
    <div>
      {/* Política de BailaNow */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-4">
        <p className="text-white/70 text-sm">📋 Tope de comisión fijado por <b className="text-white">BailaNow</b>:
          <span className="ml-1">RRPP hasta <b className="text-fuchsia-300">{maxRrpp}%</b> · Promotores hasta <b className="text-fuchsia-300">{maxPromoter}%</b>.</span>
        </p>
        <p className="text-white/40 text-xs mt-1">Puedes asignar la comisión que quieras hasta ese máximo; el sistema no permite superarlo.</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">Tu equipo en la ciudad</h3>
        <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 rounded-xl px-3.5 py-2"><Plus className="w-4 h-4" /> Añadir</button>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <select value={role} onChange={e => onRole(e.target.value)} className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none">
              {REP_ROLES.map(r => <option key={r.v} value={r.v} className="bg-gray-900">{r.l}</option>)}
            </select>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          </div>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contacto (email / teléfono / @)" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
          <div>
            <label className="text-white/50 text-xs">Comisión % (máx {maxFor(role)}% para {role === 'promoter' ? 'Promotor' : 'RRPP'})</label>
            <input value={commission} onChange={e => setCommission(e.target.value)} type="number" max={maxFor(role)} min={0}
              className="w-full mt-1 rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
            {(parseFloat(commission) || 0) > maxFor(role) && <p className="text-amber-400 text-xs mt-1">Se ajustará a {maxFor(role)}% (tope de BailaNow).</p>}
          </div>
          <button onClick={create} disabled={saving} className="w-full bg-white text-gray-900 font-bold rounded-xl py-2.5 disabled:opacity-60">{saving ? 'Guardando…' : 'Añadir al equipo'}</button>
        </div>
      )}

      {reps.length === 0 ? (
        <div className="py-14 text-center text-white/40">
          <UsersRound className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aún no tienes RRPP ni promotores. Añádelos para que traigan eventos y clientes a tu ciudad.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reps.map(r => <RepCard key={r.id} r={r} max={maxFor(r.role)} earned={earnedByRep[r.id] || 0} onSave={saveCommission} onToggle={toggle} onRemove={remove} />)}
        </div>
      )}
    </div>
  );
};

const RepCard: React.FC<{ r: RepRow; max: number; earned: number; onSave: (r: RepRow, v: string) => void; onToggle: (r: RepRow) => void; onRemove: (r: RepRow) => void }> = ({ r, max, earned, onSave, onToggle, onRemove }) => {
  const [val, setVal] = useState(String(r.commission_percent));
  return (
    <div className={`rounded-2xl ring-1 p-4 ${r.status === 'active' ? 'bg-white/[0.03] ring-white/10' : 'bg-white/[0.02] ring-white/5 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{r.name} <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded ${r.role === 'promoter' ? 'bg-sky-500/20 text-sky-300' : 'bg-fuchsia-500/20 text-fuchsia-300'}`}>{r.role === 'promoter' ? 'PROMOTOR' : 'RRPP'}</span></p>
          <p className="text-white/40 text-xs">{r.contact || '—'} · {r.city || ''}</p>
          <p className="text-emerald-400 text-xs font-bold mt-1">Generado: {eur(earned)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => onToggle(r)} className="text-xs font-bold bg-white/10 rounded-lg px-2.5 py-1.5">{r.status === 'active' ? 'Suspender' : 'Activar'}</button>
          <button onClick={() => onRemove(r)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex items-end gap-2 mt-3">
        <div className="flex-1">
          <label className="text-white/40 text-xs">Comisión % (máx {max}%)</label>
          <input value={val} onChange={e => setVal(e.target.value)} type="number" max={max} min={0} className="w-full mt-1 rounded-lg bg-black/30 ring-1 ring-white/15 px-3 py-2 text-sm outline-none focus:ring-fuchsia-500" />
        </div>
        <button onClick={() => onSave(r, val)} className="inline-flex items-center gap-1 text-sm font-bold bg-brand-orange text-white rounded-lg px-3.5 py-2">Guardar</button>
      </div>
    </div>
  );
};

// ── BANDEJA UNIFICADA (preguntas directas + redes sociales) ──
const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  web:       { label: 'Web',       icon: <Inbox className="w-3.5 h-3.5" />,         color: 'bg-fuchsia-500' },
  instagram: { label: 'Instagram', icon: <Instagram className="w-3.5 h-3.5" />,     color: 'bg-pink-600' },
  facebook:  { label: 'Facebook',  icon: <Facebook className="w-3.5 h-3.5" />,      color: 'bg-blue-600' },
  whatsapp:  { label: 'WhatsApp',  icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'bg-emerald-600' },
  tiktok:    { label: 'TikTok',    icon: <Music2 className="w-3.5 h-3.5" />,        color: 'bg-gray-900' },
};
const chan = (c: string) => CHANNEL_META[c] || CHANNEL_META.web;

interface ThreadMsg { id: string; from_partner: boolean; text: string; created_at: string; }

const Bandeja: React.FC<{ uid: string; partner: PartnerRow | null; inquiries: InquiryRow[]; socials: SocialRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, partner, inquiries, socials, reload, addToast }) => {
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState<InquiryRow | null>(null);
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.channel === filter);
  const channelsInUse = Array.from(new Set(inquiries.map(i => i.channel)));

  const openThread = async (i: InquiryRow) => {
    setOpen(i); setThread([]); setReply('');
    const { data } = await supabase.from('partner_inquiry_messages').select('*').eq('inquiry_id', i.id).order('created_at', { ascending: true });
    setThread((data as ThreadMsg[]) || []);
  };

  const sendReply = async () => {
    if (!open || !reply.trim()) return;
    setSending(true);
    const text = reply.trim();
    const { error } = await supabase.from('partner_inquiry_messages').insert({ inquiry_id: open.id, from_partner: true, text });
    if (!error) await supabase.from('partner_inquiries').update({ status: 'answered', last_activity_at: new Date().toISOString() }).eq('id', open.id);

    // Si el mensaje llegó por una red social, intentamos entregarlo por esa red (best-effort).
    let deliveryNote = '';
    if (!error && open.channel !== 'web') {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('ghl-send', { body: { inquiry_id: open.id, text } });
        if (fnErr || (data && data.delivered === false)) deliveryNote = `Respuesta guardada. Para entregarla en ${open.channel} conecta la integración de esa red.`;
      } catch { deliveryNote = `Respuesta guardada (envío a ${open.channel} pendiente de configurar).`; }
    }

    setSending(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setReply('');
    setThread(t => [...t, { id: Math.random().toString(), from_partner: true, text, created_at: new Date().toISOString() }]);
    if (deliveryNote) addToast({ message: deliveryNote, type: 'info' });
    reload();
  };

  const close = async (i: InquiryRow) => { await supabase.from('partner_inquiries').update({ status: 'closed' }).eq('id', i.id); setOpen(null); reload(); };

  // Vista de conversación
  if (open) {
    const m = chan(open.channel);
    return (
      <div>
        <button onClick={() => setOpen(null)} className="inline-flex items-center gap-1.5 text-sm text-white/60 mb-3"><ArrowLeft className="w-4 h-4" /> Volver a la bandeja</button>
        <div className="rounded-2xl ring-1 ring-white/10 overflow-hidden">
          <div className="p-4 bg-white/[0.04] flex items-center justify-between">
            <div>
              <p className="font-bold">{open.contact_name || 'Contacto'} <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-black text-white px-1.5 py-0.5 rounded ${m.color}`}>{m.icon}{m.label}</span></p>
              <p className="text-white/40 text-xs">{open.contact_handle || '—'} · {open.city || ''}</p>
            </div>
            <button onClick={() => close(open)} className="text-xs font-bold text-white/50 hover:text-white bg-white/5 rounded-lg px-2.5 py-1.5">Cerrar</button>
          </div>
          <div className="p-4 space-y-3 max-h-[45vh] overflow-y-auto">
            <div className="max-w-[80%]">
              <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm">{open.message}</div>
              <p className="text-white/30 text-[10px] mt-1">{new Date(open.created_at).toLocaleString('es')}</p>
            </div>
            {thread.map(t => (
              <div key={t.id} className={`max-w-[80%] ${t.from_partner ? 'ml-auto text-right' : ''}`}>
                <div className={`inline-block rounded-2xl px-3.5 py-2.5 text-sm ${t.from_partner ? 'rounded-tr-sm bg-gradient-to-r from-orange-500 to-fuchsia-600' : 'rounded-tl-sm bg-white/10'}`}>{t.text}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Escribe tu respuesta…" className="flex-1 rounded-xl bg-black/30 ring-1 ring-white/15 px-3.5 py-2.5 outline-none focus:ring-fuchsia-500" />
            <button onClick={sendReply} disabled={sending} className="inline-flex items-center gap-1.5 font-bold bg-gradient-to-r from-orange-500 to-fuchsia-600 rounded-xl px-4 disabled:opacity-60">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
          </div>
        </div>
        {open.channel !== 'web' && (
          <p className="text-white/30 text-xs mt-2">💡 Este mensaje llegó por {m.label}. Tu respuesta queda registrada aquí; para enviarla al usuario en {m.label} necesitas la integración conectada (ver abajo, en Redes).</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Redes uid={uid} socials={socials} reload={reload} addToast={addToast} />

      {/* Filtros de canal */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {['all', ...channelsInUse].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${filter === c ? 'bg-white text-gray-900' : 'bg-white/5 text-white/60'}`}>
            {c === 'all' ? 'Todos' : <>{chan(c).icon} {chan(c).label}</>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-white/40">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Sin mensajes todavía. Comparte tu enlace de ciudad y conecta tus redes para recibir preguntas aquí.</p>
        </div>
      ) : (
        <div className="rounded-2xl ring-1 ring-white/10 divide-y divide-white/5 overflow-hidden">
          {filtered.map(i => {
            const m = chan(i.channel);
            return (
              <button key={i.id} onClick={() => openThread(i)} className="w-full text-left flex items-center gap-3 p-3.5 bg-white/[0.03] hover:bg-white/[0.06] transition">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${m.color}`}>{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{i.contact_name || i.contact_handle || 'Contacto'} <span className="text-white/30 font-normal">· {m.label}</span></p>
                  <p className="text-white/50 text-xs truncate">{i.message}</p>
                </div>
                {i.status === 'new' && <span className="text-[10px] font-black bg-fuchsia-500 rounded-full px-2 py-0.5 flex-shrink-0">NUEVO</span>}
                {i.status === 'answered' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PROVIDERS = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, ph: '@tucuenta' },
  { id: 'facebook',  label: 'Facebook',  icon: <Facebook className="w-4 h-4" />,  ph: 'tu página' },
  { id: 'whatsapp',  label: 'WhatsApp',  icon: <MessageCircle className="w-4 h-4" />, ph: '+34...' },
  { id: 'tiktok',    label: 'TikTok',    icon: <Music2 className="w-4 h-4" />,    ph: '@tucuenta' },
];

const Redes: React.FC<{ uid: string; socials: SocialRow[]; reload: () => Promise<void>; addToast: (t: any) => void }> = ({ uid, socials, reload, addToast }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const byProvider = (p: string) => socials.find(s => s.provider === p);

  const connect = async (provider: string) => {
    const handle = (drafts[provider] ?? byProvider(provider)?.handle ?? '').trim();
    if (!handle) { addToast({ message: 'Escribe tu usuario/número primero', type: 'error' }); return; }
    const { error } = await supabase.from('partner_social_connections')
      .upsert({ partner_id: uid, provider, handle, connected: true }, { onConflict: 'partner_id,provider' });
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: `${provider} conectado`, type: 'success' });
    reload();
  };
  const disconnect = async (provider: string) => {
    await supabase.from('partner_social_connections').update({ connected: false }).eq('partner_id', uid).eq('provider', provider);
    reload();
  };

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 mb-4">
      <p className="font-bold text-sm mb-1">Redes conectadas</p>
      <p className="text-white/40 text-xs mb-3">Conecta tus redes para recibir sus mensajes en esta misma bandeja.</p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {PROVIDERS.map(p => {
          const conn = byProvider(p.id);
          const on = conn?.connected;
          return (
            <div key={p.id} className={`rounded-xl p-3 ring-1 ${on ? 'bg-emerald-500/10 ring-emerald-500/40' : 'bg-black/20 ring-white/10'}`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-2">{p.icon} {p.label} {on && <span className="text-[10px] text-emerald-400 ml-auto">CONECTADO</span>}</div>
              <div className="flex gap-1.5">
                <input defaultValue={conn?.handle || ''} onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))} placeholder={p.ph}
                  className="flex-1 min-w-0 rounded-lg bg-black/30 ring-1 ring-white/15 px-2.5 py-1.5 text-sm outline-none focus:ring-fuchsia-500" />
                {on
                  ? <button onClick={() => disconnect(p.id)} className="text-xs font-bold bg-white/10 rounded-lg px-2.5">Quitar</button>
                  : <button onClick={() => connect(p.id)} className="text-xs font-bold bg-white text-gray-900 rounded-lg px-2.5">Conectar</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerDashboardPage;
