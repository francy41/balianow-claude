import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Users } from 'lucide-react';
import { DANCE_PLANS, planById, MEMBERSHIP_PLAN_IDS } from '../data/dancePlans';

interface SubRow { plan: string; price: number; user_id: string; created_at: string; }
interface MemberRow { id: string; owner_id: string; plan: string; email: string; status: string; }

const eur = (n: number) => `€${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MembershipsAdminSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, m] = await Promise.all([
      supabase.from('subscriptions').select('plan,price,user_id').in('plan', MEMBERSHIP_PLAN_IDS).eq('status', 'active'),
      supabase.from('plan_members').select('id,owner_id,plan,email,status').neq('status', 'removed').order('created_at', { ascending: false }).limit(100),
    ]);
    setSubs((s.data as SubRow[]) || []);
    setMembers((m.data as MemberRow[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const byPlan = useMemo(() => {
    const map: Record<string, { count: number; mrr: number }> = {};
    subs.forEach(s => { map[s.plan] = map[s.plan] || { count: 0, mrr: 0 }; map[s.plan].count++; map[s.plan].mrr += Number(s.price || 0); });
    return map;
  }, [subs]);
  const totalMrr = subs.reduce((a, s) => a + Number(s.price || 0), 0);
  const activeMembers = members.filter(m => m.status === 'active').length;

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-brand-orange" /></div>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white">Membresías de baile</h2>
        <p className="text-gray-500 text-sm">Suscriptores de BailaNow TV por plan (Individual / Pareja / Familiar).</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white">
          <p className="text-white/85 text-xs font-bold uppercase">MRR total</p>
          <p className="font-display font-black text-2xl mt-1">{eur(totalMrr)}</p>
        </div>
        {DANCE_PLANS.map(p => (
          <div key={p.id} className="rounded-2xl p-5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 text-xs font-bold uppercase">{p.emoji} {p.name}</p>
            <p className="font-display font-black text-2xl mt-1 text-gray-900 dark:text-white">{byPlan[p.id]?.count || 0}</p>
            <p className="text-gray-400 text-xs">{eur(byPlan[p.id]?.mrr || 0)}/mes</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Users className="w-4 h-4" /> Miembros invitados en planes Pareja/Familiar · {activeMembers} activos de {members.length}
      </div>
      {members.length === 0 ? (
        <p className="text-gray-400 text-sm">Aún no hay miembros invitados.</p>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/40">
              <span className="text-sm text-gray-700 dark:text-gray-200">{m.email} <span className="text-gray-400 text-xs">· plan {planById(m.plan)?.name || m.plan}</span></span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status === 'active' ? 'ACTIVO' : 'PENDIENTE'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembershipsAdminSection;
