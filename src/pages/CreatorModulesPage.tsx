import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Plus, Copy, Share2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { createModuleCheckout } from '../lib/payments';
import { CREATOR_MODULES, FULL_PACK, MODULE_PRICE, FULL_PACK_PRICE } from '../data/creatorModules';
import { useSeo } from '../hooks/useSeo';

const CreatorModulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  useSeo({ title: 'Módulos para tu panel — BailaNow', description: 'Añade módulos a tu panel de creador: reservas, contratación, pagos, cursos y directos. 20€ por módulo o 50€ el Pack Full. Pago único.', path: '/modulos' });

  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user) { setLoading(false); return; }
    const { data } = await supabase.from('creator_module_purchases').select('module_id').eq('creator_id', user.id).eq('status', 'active');
    setOwned(new Set((data || []).map((r: any) => r.module_id)));
    setLoading(false);
  }, [isAuthenticated, user]);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  const hasFull = owned.has('full');
  const has = (id: string) => hasFull || owned.has(id);

  const buy = async (moduleId: string, moduleName: string, price: number) => {
    if (!isAuthenticated || !user) { navigate('/auth?redirect=/modulos'); return; }
    setBuying(moduleId);
    try {
      const res = await createModuleCheckout({ moduleId, moduleName, price });
      if (res.notConfigured) { addToast({ message: 'Los pagos se activarán muy pronto 🙌', type: 'info' }); setBuying(null); return; }
      if (res.url) { window.location.href = res.url; return; }
      throw new Error(res.error || 'sin url');
    } catch (e) {
      console.error('[módulo]', e);
      addToast({ message: 'Ahora mismo no podemos procesar el pago. Inténtalo en unos minutos 🙏', type: 'info' });
      setBuying(null);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bailanow.com';
  const myLink = user ? `${origin}/p/${user.id}` : `${origin}/`;
  const copyLink = () => navigator.clipboard?.writeText(myLink).then(() => addToast({ message: 'Enlace copiado ✔️', type: 'success' }), () => {});

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      <div className="bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
          <span className="inline-flex items-center gap-2 text-white/85 font-black text-xs tracking-widest uppercase mb-3"><Sparkles className="w-4 h-4" /> Tu panel a tu medida</span>
          <h1 className="font-display font-black text-3xl sm:text-5xl">Añade módulos a tu panel</h1>
          <p className="text-white/90 mt-3 max-w-xl mx-auto">Activa solo lo que necesitas. <b>{MODULE_PRICE}€ por módulo</b> o el <b>Pack Full por {FULL_PACK_PRICE}€</b> (todo incluido). Pago único, sin cuotas.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
        {/* Pack Full */}
        <div className={`rounded-3xl p-6 mb-6 text-white bg-gradient-to-br from-fuchsia-600 to-purple-700 shadow-lg ${hasFull ? 'ring-4 ring-emerald-400' : ''}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2"><span className="text-3xl">{FULL_PACK.emoji}</span><h2 className="font-display font-black text-2xl">{FULL_PACK.name}</h2></div>
              <p className="text-white/85 text-sm mt-1">{FULL_PACK.desc}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-3xl">{FULL_PACK_PRICE}€</p>
              {hasFull
                ? <span className="inline-flex items-center gap-1 text-sm font-bold bg-emerald-500/30 rounded-lg px-3 py-1.5"><Check className="w-4 h-4" /> Activo</span>
                : <button onClick={() => buy(FULL_PACK.id, FULL_PACK.name, FULL_PACK_PRICE)} disabled={buying === 'full'} className="bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60">{buying === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Conseguir todo</button>}
            </div>
          </div>
        </div>

        {/* Módulos individuales */}
        <div className="grid sm:grid-cols-2 gap-3">
          {CREATOR_MODULES.map(m => {
            const active = has(m.id);
            return (
              <div key={m.id} className={`rounded-2xl p-5 border bg-white dark:bg-gray-800/50 ${active ? 'border-emerald-400 dark:border-emerald-500' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><span className="text-2xl">{m.emoji}</span><p className="font-bold text-gray-900 dark:text-white">{m.name}</p></div>
                    <p className="text-gray-500 text-sm mt-1">{m.desc}</p>
                  </div>
                  <p className="font-black text-lg text-gray-900 dark:text-white flex-shrink-0">{m.price}€</p>
                </div>
                <div className="mt-4">
                  {active
                    ? <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600"><Check className="w-4 h-4" /> {hasFull ? 'Incluido en tu Pack Full' : 'Activo en tu panel'}</span>
                    : <button onClick={() => buy(m.id, m.name, m.price)} disabled={buying === m.id} className="inline-flex items-center gap-1.5 bg-brand-orange text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-60">{buying === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Añadir · {m.price}€</button>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enlace personalizado */}
        <div className="mt-8 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-display font-black text-lg text-gray-900 dark:text-white flex items-center gap-2"><Share2 className="w-5 h-5 text-brand-orange" /> Tu enlace personalizado</h3>
          <p className="text-gray-500 text-sm mt-1">Comparte tu perfil en redes sociales para que te reserven y contraten.</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <code className="flex-1 min-w-0 truncate bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200">{myLink.replace(/^https?:\/\//, '')}</code>
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-lg px-4 py-2.5 text-sm"><Copy className="w-4 h-4" /> Copiar</button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">Pago único y seguro con Stripe · sin cuotas mensuales</p>
      </div>
    </div>
  );
};

export default CreatorModulesPage;
