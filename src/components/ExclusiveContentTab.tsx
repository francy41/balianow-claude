import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import type { Artist } from '../data/mockData';
import { useAuthStore, useUIStore, usePerformerStore } from '../store/appStore';
import { supabase } from '../lib/supabase';

const FAN_PRICE = 4.99;

const BENEFITS = [
  'Contenido exclusivo solo para fans',
  'Vídeos entre bastidores y ensayos',
  'Coreografías y tips cada semana',
  'Insignia 👑 de fan en tu perfil',
  'Prioridad en respuestas y sorteos',
];

const ExclusiveContentTab: React.FC<{ artist: Artist }> = ({ artist }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const recordTransaction = usePerformerStore(s => s.recordTransaction);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ¿Ya es fan? (persiste tras recargar; fallback si la tabla no existe aún)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { if (!cancelled) setChecking(false); return; }
      const { data } = await supabase.from('content_access')
        .select('id').eq('creator_id', artist.id).eq('user_id', uid).maybeSingle();
      if (!cancelled) { if (data) setUnlocked(true); setChecking(false); }
    })().catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [artist.id]);

  const handleJoin = async () => {
    if (!isAuthenticated || !user) {
      addToast({ type: 'error', message: 'Inicia sesión para hacerte fan' });
      navigate('/auth');
      return;
    }
    setProcessing(true);
    recordTransaction({
      performerId: artist.id,
      performerName: artist.name,
      clientId: user.id,
      clientName: user.name,
      concept: `Membresía fan · ${artist.name}`,
      gross: FAN_PRICE,
      status: 'pending',
      source: 'course',
    });
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await supabase.from('content_access').insert({
          creator_id: artist.id, user_id: uid, amount: FAN_PRICE, currency: 'EUR',
        });
      }
    } catch { /* tabla puede no existir aún */ }
    setUnlocked(true);
    setProcessing(false);
    addToast({ type: 'success', message: `¡Ya eres fan de ${artist.name}! 👑` });
  };

  if (checking) {
    return <div className="py-16 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-brand-orange" /></div>;
  }

  // ── Ya es fan ──────────────────────────────────────────────────────────
  if (unlocked) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-lg leading-tight">Ya eres fan de {artist.name}</p>
            <p className="text-white/80 text-sm">Tienes acceso a todo su contenido exclusivo.</p>
          </div>
        </div>

        <div className="card-white rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-brand-orange mb-2" />
          <p className="font-bold text-gray-900">Aún no hay publicaciones exclusivas</p>
          <p className="text-gray-400 text-sm mt-1">
            Te avisaremos en cuanto {artist.name} publique contenido para fans.
          </p>
        </div>
      </div>
    );
  }

  // ── Muro de pago (paywall) ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <div className="card-white rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Contenido exclusivo</p>
          <h3 className="font-display font-black text-2xl mt-1">Hazte fan de {artist.name}</h3>
          <div className="mt-3 flex items-end justify-center gap-1">
            <span className="font-black text-4xl">€{FAN_PRICE.toFixed(2)}</span>
            <span className="text-white/80 mb-1 text-sm">/mes</span>
          </div>
        </div>

        <div className="p-6">
          <ul className="space-y-2.5 mb-5">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleJoin}
            disabled={processing}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            {processing ? 'Procesando…' : `Hazte fan · €${FAN_PRICE.toFixed(2)}/mes`}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-3">
            Pago seguro en escrow · cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExclusiveContentTab;
