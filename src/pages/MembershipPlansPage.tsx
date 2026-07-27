import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Users, Video, Plus, Trash2, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { createSubscriptionCheckout } from '../lib/payments';
import { DANCE_PLANS, planById, MEMBERSHIP_PLAN_IDS, DancePlan } from '../data/dancePlans';
import { useSeo } from '../hooks/useSeo';

interface Sub { id: string; plan: string; plan_name: string; status: string; }
interface Member { id: string; email: string; member_id: string | null; status: string; }

const MembershipPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  useSeo({ title: 'BailaNow TV — el Netflix del baile · Planes Individual, Pareja y Familiar', description: 'Suscríbete a BailaNow TV y accede a todo el catálogo de clases de baile en vídeo. Con los planes Pareja y Familiar practicáis juntos por videocámara.', path: '/membresias' });

  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Sub | null>(null);
  const [memberOf, setMemberOf] = useState<{ owner_id: string; plan: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user) { setLoading(false); return; }
    await supabase.rpc('claim_memberships').then(() => {}, () => {}); // vincula invitaciones por email
    const [sub, mem, asMember] = await Promise.all([
      supabase.from('subscriptions').select('id,plan,plan_name,status').eq('user_id', user.id).eq('status', 'active').in('plan', MEMBERSHIP_PLAN_IDS).order('started_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('plan_members').select('id,email,member_id,status').eq('owner_id', user.id).neq('status', 'removed'),
      supabase.from('plan_members').select('owner_id,plan').eq('member_id', user.id).eq('status', 'active').limit(1).maybeSingle(),
    ]);
    setMine((sub.data as Sub) || null);
    setMembers((mem.data as Member[]) || []);
    setMemberOf((asMember.data as any) || null);
    setLoading(false);
  }, [isAuthenticated, user]);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const subscribe = async (plan: DancePlan) => {
    if (!isAuthenticated || !user) { navigate('/auth?redirect=/membresias'); return; }
    setBusy(plan.id);
    const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
    const { data: row, error } = await supabase.from('subscriptions').insert({
      user_id: user.id, plan: plan.id, plan_name: `BailaNow ${plan.name}`, price: plan.price, currency: 'EUR',
      period: 'monthly', status: 'pending', provider: 'stripe', started_at: now.toISOString(), current_period_end: end.toISOString(),
    }).select('id').single();
    if (error || !row) { setBusy(null); addToast({ message: error?.message || 'No se pudo registrar', type: 'error' }); return; }
    try {
      const res = await createSubscriptionCheckout({ planId: plan.id, planName: `BailaNow ${plan.name}`, price: plan.price, period: 'monthly', currency: 'eur', subscriptionRowId: row.id });
      if (res.url) { window.location.href = res.url; return; }
      addToast({ message: 'Los pagos estarán disponibles muy pronto 🙌', type: 'info' });
    } catch (e) { addToast({ message: (e as Error).message, type: 'error' }); }
    setBusy(null);
  };

  const seats = mine ? (planById(mine.plan)?.seats ?? 1) : 1;
  const canInvite = mine && seats > 1 && members.length < seats - 1;

  const invite = async () => {
    if (!user || !mine) return;
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { addToast({ message: 'Email no válido', type: 'error' }); return; }
    const { error } = await supabase.from('plan_members').insert({ owner_id: user.id, plan: mine.plan, email: e, status: 'invited' });
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setEmail(''); addToast({ message: `Invitación enviada a ${e}`, type: 'success' }); load();
  };
  const removeMember = async (id: string) => { await supabase.from('plan_members').update({ status: 'removed' }).eq('id', id); load(); };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;

  const hasPlan = mine || memberOf;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      <div className="bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <h1 className="font-display font-black text-3xl sm:text-5xl">BailaNow TV · el Netflix del baile</h1>
          <p className="text-white/90 mt-3 max-w-2xl mx-auto">Todo el catálogo de clases de baile en vídeo, cuando quieras. Con los planes <b>Pareja</b> y <b>Familiar</b> practicáis juntos por videocámara, estéis donde estéis.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6">
        {/* Panel de mi plan */}
        {hasPlan && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><Crown className="w-5 h-5 text-brand-orange" /><h2 className="font-display font-black text-lg text-gray-900 dark:text-white">
              {mine ? `Tu plan: ${planById(mine.plan)?.name}` : `Eres miembro de un plan ${memberOf?.plan}`}
            </h2></div>

            {mine && seats > 1 && (
              <>
                <p className="text-gray-500 text-sm mb-3">Puedes añadir hasta {seats - 1} {seats - 1 === 1 ? 'persona' : 'personas'} más ({members.length}/{seats - 1} usadas).</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email de la persona a invitar" className="flex-1 min-w-[200px] rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white" />
                  <button onClick={invite} disabled={!canInvite} className="inline-flex items-center gap-1.5 bg-brand-orange text-white font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-50"><Plus className="w-4 h-4" /> Invitar</button>
                </div>
                {members.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-700 dark:text-gray-200">{m.email} <span className={`text-[10px] font-bold ml-1 ${m.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>{m.status === 'active' ? 'ACTIVO' : 'PENDIENTE'}</span></span>
                        <button onClick={() => removeMember(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/tv')} className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl px-5 py-2.5 text-sm"><Video className="w-4 h-4" /> Ver BailaNow TV</button>
              {((mine && seats > 1) || memberOf) && (
                <button onClick={() => navigate(`/practicar/${mine ? user!.id : memberOf!.owner_id}`)} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-5 py-2.5 text-sm"><Users className="w-4 h-4" /> Practicar juntos (cámaras)</button>
              )}
            </div>
          </div>
        )}

        {/* Planes */}
        {!mine && (
          <div className="grid sm:grid-cols-3 gap-4 mt-2">
            {DANCE_PLANS.map(p => (
              <div key={p.id} className={`rounded-3xl p-6 text-white bg-gradient-to-br ${p.gradient} relative ${p.popular ? 'ring-4 ring-white/30 sm:scale-105' : ''}`}>
                {p.popular && <span className="absolute top-4 right-4 text-[10px] font-black bg-white/25 rounded-full px-2.5 py-1">POPULAR</span>}
                <div className="text-4xl">{p.emoji}</div>
                <h3 className="font-display font-black text-2xl mt-2">{p.name}</h3>
                <p className="font-black text-4xl mt-1">{p.price}€<span className="text-base font-normal opacity-80">/mes</span></p>
                <p className="text-white/80 text-sm mt-1">{p.seats === 1 ? '1 persona' : `Hasta ${p.seats} personas`}</p>
                <ul className="mt-4 space-y-2">
                  {p.features.map(f => <li key={f} className="flex items-start gap-2 text-sm text-white/90"><Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> {f}</li>)}
                </ul>
                <button onClick={() => subscribe(p)} disabled={busy === p.id} className="w-full mt-5 bg-white text-gray-900 font-bold rounded-xl py-3 disabled:opacity-70 flex items-center justify-center gap-2">
                  {busy === p.id ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Suscribirme
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">Pago seguro con Stripe · cancela cuando quieras</p>
      </div>
    </div>
  );
};

export default MembershipPlansPage;
