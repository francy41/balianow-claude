import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Loader2, Check, X, Globe, Users, Video, DollarSign, MapPin, Save, Ban, RotateCcw, Shield,
} from 'lucide-react';

type Tab = 'solicitudes' | 'partners' | 'contenido' | 'retiros' | 'politicas';

interface AppRow { id: string; user_id: string; name: string | null; email: string | null; phone: string | null; city: string; is_content_creator: boolean; can_edit_video: boolean; portfolio_url: string | null; motivation: string | null; status: string; created_at: string; }
interface PartnerRow { user_id: string; display_name: string | null; cities: string[]; commission_percent: number; status: string; ghl_location_id?: string | null; }
interface TaskRow { partner_id: string; status: string; commission: number; }
interface WithdrawalRow { id: string; partner_id: string; method: string | null; amount: number; status: string; requested_at: string; }
interface ContentRow { id: string; partner_id: string; city: string | null; title: string; video_url: string | null; needs_editing: boolean; status: string; created_at: string; }
interface PolicyRow { max_rrpp_percent: number; max_promoter_percent: number; default_rrpp_percent: number; default_promoter_percent: number; }

const eur = (n: number) => `€${(Number(n) || 0).toFixed(2)}`;
const nowIso = () => new Date().toISOString();

const PartnerAdminSection: React.FC<{ addToast: (t: any) => void }> = ({ addToast }) => {
  const [tab, setTab] = useState<Tab>('solicitudes');
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [content, setContent] = useState<ContentRow[]>([]);
  const [policy, setPolicy] = useState<PolicyRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const safety = setTimeout(() => setLoading(false), 8000);
    const [a, p, t, w, c, pol] = await Promise.all([
      supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('partners').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_tasks').select('partner_id,status,commission'),
      supabase.from('partner_withdrawals').select('*').order('requested_at', { ascending: false }),
      supabase.from('partner_content').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_rep_policies').select('*').eq('id', 1).maybeSingle(),
    ]);
    setApps((a.data as AppRow[]) || []);
    setPartners((p.data as PartnerRow[]) || []);
    setTasks((t.data as TaskRow[]) || []);
    setWithdrawals((w.data as WithdrawalRow[]) || []);
    setContent((c.data as ContentRow[]) || []);
    setPolicy((pol.data as PolicyRow) || null);
    clearTimeout(safety);
    setLoading(false);
  }, []);

  const savePolicy = async (patch: Partial<PolicyRow>) => {
    const { error } = await supabase.from('partner_rep_policies').update({ ...patch, updated_at: nowIso() }).eq('id', 1);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Política actualizada', type: 'success' });
    load();
  };

  useEffect(() => { load(); }, [load]);

  // ── Aprobar / rechazar solicitud ──
  const approve = async (app: AppRow) => {
    const { error: e1 } = await supabase.from('profiles').update({ role: 'partner' }).eq('id', app.user_id);
    if (e1) { addToast({ message: `No se pudo cambiar el rol: ${e1.message}`, type: 'error' }); return; }
    const { error: e2 } = await supabase.from('partners').upsert({
      user_id: app.user_id, display_name: app.name, cities: app.city ? [app.city] : [],
      commission_percent: 10, status: 'active',
    }, { onConflict: 'user_id' });
    if (e2) { addToast({ message: e2.message, type: 'error' }); return; }
    await supabase.from('partner_applications').update({ status: 'approved', reviewed_at: nowIso() }).eq('id', app.id);
    addToast({ message: `${app.name || 'Partner'} aprobado ✔️`, type: 'success' });
    load();
  };

  const reject = async (app: AppRow) => {
    await supabase.from('partner_applications').update({ status: 'rejected', reviewed_at: nowIso() }).eq('id', app.id);
    addToast({ message: 'Solicitud rechazada', type: 'success' });
    load();
  };

  // ── Editar partner ──
  const savePartner = async (p: PartnerRow, patch: Partial<PartnerRow>) => {
    const { error } = await supabase.from('partners').update(patch).eq('user_id', p.user_id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: 'Partner actualizado', type: 'success' });
    load();
  };

  // ── Retiros ──
  const reviewWithdrawal = async (w: WithdrawalRow, status: 'paid' | 'rejected') => {
    const { error } = await supabase.from('partner_withdrawals').update({ status, reviewed_at: nowIso() }).eq('id', w.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    addToast({ message: status === 'paid' ? 'Retiro marcado como pagado' : 'Retiro rechazado', type: 'success' });
    load();
  };

  // ── Contenido ──
  const setContentStatus = async (c: ContentRow, status: string) => {
    const { error } = await supabase.from('partner_content').update({ status, updated_at: nowIso() }).eq('id', c.id);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    load();
  };

  const earningsByPartner = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { if (t.status === 'completed') map[t.partner_id] = (map[t.partner_id] || 0) + Number(t.commission || 0); });
    return map;
  }, [tasks]);

  const pendingApps = apps.filter(a => a.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const editQueue = content.filter(c => c.status === 'submitted' || c.status === 'in_editing');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'solicitudes', label: 'Solicitudes', icon: <Globe className="w-4 h-4" />, count: pendingApps.length },
    { id: 'partners',    label: 'Partners',    icon: <Users className="w-4 h-4" />, count: partners.length },
    { id: 'contenido',   label: 'Contenido central', icon: <Video className="w-4 h-4" />, count: editQueue.length },
    { id: 'retiros',     label: 'Retiros',     icon: <DollarSign className="w-4 h-4" />, count: pendingWithdrawals.length },
    { id: 'politicas',   label: 'Políticas RRPP', icon: <Shield className="w-4 h-4" /> },
  ];

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Partners por ciudad</h2>
        <p className="text-gray-500 text-sm">Solicitudes, comisiones, contenido y retiros de tus partners.</p>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${tab === t.id ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
            {t.icon} {t.label}
            {!!t.count && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/25' : 'bg-brand-orange/15 text-brand-orange'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* SOLICITUDES */}
      {tab === 'solicitudes' && (
        apps.length === 0 ? <Empty text="No hay solicitudes de partner todavía." /> : (
          <div className="space-y-3">
            {apps.map(a => (
              <div key={a.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{a.name || '—'} <span className="text-gray-400 font-normal text-sm">· {a.email}</span></p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {a.city} {a.phone && `· ${a.phone}`}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${a.is_content_creator ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{a.is_content_creator ? '✔ Creador de contenido' : 'No creador'}</span>
                      <span className={`px-2 py-0.5 rounded-full ${a.can_edit_video ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{a.can_edit_video ? '✔ Sabe editar' : '✂️ Edita la central'}</span>
                      {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 underline">Ver contenido</a>}
                    </div>
                    {a.motivation && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">"{a.motivation}"</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {a.status === 'pending' ? (
                      <>
                        <button onClick={() => approve(a)} className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5"><Check className="w-3.5 h-3.5" /> Aprobar</button>
                        <button onClick={() => reject(a)} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5"><X className="w-3.5 h-3.5" /> Rechazar</button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{a.status === 'approved' ? 'Aprobado' : 'Rechazado'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* PARTNERS */}
      {tab === 'partners' && (
        partners.length === 0 ? <Empty text="Aún no hay partners activos. Aprueba una solicitud para crear el primero." /> : (
          <div className="space-y-3">
            {partners.map(p => <PartnerCard key={p.user_id} p={p} earned={earningsByPartner[p.user_id] || 0} onSave={savePartner} />)}
          </div>
        )
      )}

      {/* CONTENIDO CENTRAL */}
      {tab === 'contenido' && (
        content.length === 0 ? <Empty text="No hay contenido enviado por partners." /> : (
          <div className="space-y-3">
            {content.map(c => (
              <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{c.title}</p>
                  <p className="text-sm text-gray-500">{c.city || '—'} {c.needs_editing && <span className="text-amber-600 font-bold">· ✂️ Necesita edición</span>}</p>
                  {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Abrir material</a>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <span className="text-[11px] text-center font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">{c.status}</span>
                  {c.status !== 'in_editing' && <button onClick={() => setContentStatus(c, 'in_editing')} className="text-xs font-bold bg-amber-500 text-white rounded-lg px-3 py-1.5">En edición</button>}
                  {c.status !== 'published' && <button onClick={() => setContentStatus(c, 'published')} className="text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5">Publicado</button>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* POLÍTICAS RRPP */}
      {tab === 'politicas' && <PolicyEditor policy={policy} onSave={savePolicy} />}

      {/* RETIROS */}
      {tab === 'retiros' && (
        withdrawals.length === 0 ? <Empty text="No hay retiros solicitados." /> : (
          <div className="space-y-3">
            {withdrawals.map(w => {
              const p = partners.find(x => x.user_id === w.partner_id);
              return (
                <div key={w.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{eur(w.amount)} <span className="text-gray-400 font-normal text-sm">· {p?.display_name || w.partner_id.slice(0, 8)}</span></p>
                    <p className="text-sm text-gray-500">{w.method} · {new Date(w.requested_at).toLocaleDateString('es')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {w.status === 'pending' ? (
                      <>
                        <button onClick={() => reviewWithdrawal(w, 'paid')} className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5"><Check className="w-3.5 h-3.5" /> Pagar</button>
                        <button onClick={() => reviewWithdrawal(w, 'rejected')} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5"><X className="w-3.5 h-3.5" /> Rechazar</button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${w.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{w.status === 'paid' ? 'Pagado' : 'Rechazado'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

const PartnerCard: React.FC<{ p: PartnerRow; earned: number; onSave: (p: PartnerRow, patch: Partial<PartnerRow>) => void }> = ({ p, earned, onSave }) => {
  const [commission, setCommission] = useState(String(p.commission_percent));
  const [cities, setCities] = useState((p.cities || []).join(', '));
  const [ghl, setGhl] = useState(p.ghl_location_id || '');

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{p.display_name || p.user_id.slice(0, 8)}</p>
          <p className="text-sm text-gray-500">Ganado (comisiones completadas): <b className="text-emerald-600">{eur(earned)}</b></p>
        </div>
        {p.status === 'suspended'
          ? <button onClick={() => onSave(p, { status: 'active' })} className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500 text-white rounded-lg px-3 py-1.5"><RotateCcw className="w-3.5 h-3.5" /> Reactivar</button>
          : <button onClick={() => onSave(p, { status: 'suspended' })} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-1.5"><Ban className="w-3.5 h-3.5" /> Suspender</button>}
      </div>
      <div className="grid sm:grid-cols-[1fr_120px_auto] gap-2.5 items-end">
        <div>
          <label className="text-xs font-bold text-gray-500">Ciudades (separadas por coma)</label>
          <input value={cities} onChange={e => setCities(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500">Comisión %</label>
          <input value={commission} onChange={e => setCommission(e.target.value)} type="number" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
        </div>
        <button
          onClick={() => onSave(p, { commission_percent: parseFloat(commission) || 0, cities: cities.split(',').map(c => c.trim()).filter(Boolean), ghl_location_id: ghl.trim() || null })}
          className="inline-flex items-center gap-1 text-sm font-bold bg-brand-orange text-white rounded-lg px-4 py-2"><Save className="w-4 h-4" /> Guardar</button>
      </div>
      <div className="mt-2.5">
        <label className="text-xs font-bold text-gray-500">GHL Location ID (para la bandeja de redes)</label>
        <input value={ghl} onChange={e => setGhl(e.target.value)} placeholder="p. ej. abc123XYZ..." className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
      </div>
    </div>
  );
};

const PolicyEditor: React.FC<{ policy: PolicyRow | null; onSave: (patch: Partial<PolicyRow>) => void }> = ({ policy, onSave }) => {
  const [maxR, setMaxR] = useState(String(policy?.max_rrpp_percent ?? 20));
  const [maxP, setMaxP] = useState(String(policy?.max_promoter_percent ?? 15));
  const [defR, setDefR] = useState(String(policy?.default_rrpp_percent ?? 10));
  const [defP, setDefP] = useState(String(policy?.default_promoter_percent ?? 8));

  const field = (label: string, value: string, set: (v: string) => void) => (
    <div>
      <label className="text-xs font-bold text-gray-500">{label}</label>
      <div className="flex items-center mt-1">
        <input value={value} onChange={e => set(e.target.value)} type="number" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm" />
        <span className="ml-2 text-gray-400">%</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl bg-brand-orange/5 border border-brand-orange/20 p-4 mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-200">Estos topes limitan la comisión que un partner puede asignar a sus RRPP y promotores. El sistema recorta automáticamente cualquier valor que los supere (se aplica también en base de datos).</p>
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50 space-y-4">
        <div>
          <p className="font-bold text-gray-900 dark:text-white mb-2">RRPP</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Comisión máxima', maxR, setMaxR)}
            {field('Comisión por defecto', defR, setDefR)}
          </div>
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white mb-2">Promotores</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Comisión máxima', maxP, setMaxP)}
            {field('Comisión por defecto', defP, setDefP)}
          </div>
        </div>
        <button
          onClick={() => onSave({
            max_rrpp_percent: parseFloat(maxR) || 0, max_promoter_percent: parseFloat(maxP) || 0,
            default_rrpp_percent: parseFloat(defR) || 0, default_promoter_percent: parseFloat(defP) || 0,
          })}
          className="inline-flex items-center gap-1.5 text-sm font-bold bg-brand-orange text-white rounded-lg px-4 py-2"><Save className="w-4 h-4" /> Guardar política</button>
      </div>
    </div>
  );
};

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="py-16 text-center text-gray-400">
    <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);

export default PartnerAdminSection;
