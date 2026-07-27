import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Video, Scissors, CheckCircle2, Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

const REQUISITOS = [
  { icon: <Video className="w-5 h-5" />, title: 'Creador de contenido', text: 'Grabas vídeos y fotos de los eventos y la escena de tu ciudad.' },
  { icon: <MapPin className="w-5 h-5" />, title: 'Conoces tu ciudad', text: 'Manejas los locales, artistas y eventos de danza latina de tu zona.' },
  { icon: <Scissors className="w-5 h-5" />, title: 'Editas (o no pasa nada)', text: 'Si no sabes editar, envías el material a la central de BailaNow y lo hacemos por ti.' },
];

const PartnerApplyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [isCreator, setIsCreator] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [portfolio, setPortfolio] = useState('');
  const [motivation, setMotivation] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      if (!isAuthenticated || !user) { setLoading(false); return; }
      setCity(user.city || '');
      const { data } = await supabase
        .from('partner_applications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) { setExisting(data || null); setLoading(false); }
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(safety); };
  }, [isAuthenticated, user]);

  const submit = async () => {
    if (!user) { navigate('/auth?redirect=/partner/aplicar'); return; }
    if (!city.trim()) { addToast({ message: 'Dinos de qué ciudad quieres ser partner', type: 'error' }); return; }
    if (!isCreator) { addToast({ message: 'Ser creador de contenido es un requisito para ser partner', type: 'error' }); return; }
    setSending(true);
    const { error } = await supabase.from('partner_applications').insert({
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: phone.trim() || null,
      city: city.trim(),
      is_content_creator: isCreator,
      can_edit_video: canEdit,
      portfolio_url: portfolio.trim() || null,
      motivation: motivation.trim() || null,
      status: 'pending',
    });
    setSending(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setSent(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" /></div>;
  }

  const alreadyApplied = sent || (existing && existing.status === 'pending');
  const alreadyPartner = existing && existing.status === 'approved';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-fuchsia-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-8 text-center">
          <span className="inline-flex items-center gap-2 text-fuchsia-300 font-black text-xs tracking-widest uppercase mb-4">
            <Sparkles className="w-4 h-4" /> Programa Partner
          </span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            ¿Quieres ser <span className="bg-gradient-to-r from-orange-400 to-fuchsia-400 bg-clip-text text-transparent">partner de BailaNow</span> en tu ciudad?
          </h1>
          <p className="text-white/70 mt-4 max-w-xl mx-auto">
            Conviértete en el representante de la danza latina de tu ciudad: gestiona eventos, sube contenido,
            gana comisiones por cada gestión y cobra tus ganancias. Con soporte directo de la central.
          </p>
        </div>
      </div>

      {/* Beneficios rápidos */}
      <div className="max-w-3xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
        {[
          { emoji: '🏙️', t: 'Tu ciudad' },
          { emoji: '💶', t: 'Comisiones' },
          { emoji: '🎬', t: 'Contenido' },
          { emoji: '💬', t: 'Soporte 1:1' },
        ].map(b => (
          <div key={b.t} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-center">
            <div className="text-2xl">{b.emoji}</div>
            <div className="text-xs font-bold text-white/80 mt-1">{b.t}</div>
          </div>
        ))}
      </div>

      {/* Requisitos */}
      <div className="max-w-3xl mx-auto px-5 mb-8">
        <h2 className="font-display font-black text-lg mb-3">Requisitos para ser partner</h2>
        <div className="space-y-2.5">
          {REQUISITOS.map(r => (
            <div key={r.title} className="flex gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">{r.icon}</div>
              <div>
                <p className="font-bold">{r.title}</p>
                <p className="text-white/60 text-sm">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estado / Formulario */}
      <div className="max-w-3xl mx-auto px-5">
        {alreadyPartner ? (
          <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-6 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <p className="font-black text-lg">¡Ya eres partner de BailaNow!</p>
            <button onClick={() => navigate('/partner')} className="mt-4 inline-flex items-center gap-2 bg-white text-gray-900 font-bold rounded-xl px-5 py-2.5">
              Ir a mi panel de partner <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : alreadyApplied ? (
          <div className="rounded-2xl bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 p-6 text-center">
            <Send className="w-10 h-10 mx-auto text-fuchsia-400 mb-2" />
            <p className="font-black text-lg">Solicitud enviada ✔️</p>
            <p className="text-white/60 text-sm mt-1 max-w-md mx-auto">
              Nuestro equipo revisará tu candidatura y te avisará. Mientras tanto, sigue creando contenido de tu ciudad.
            </p>
            <button onClick={() => navigate('/')} className="mt-4 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 font-bold rounded-xl px-5 py-2.5">
              Volver al inicio
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
            <h2 className="font-display font-black text-lg mb-4">Solicita tu plaza</h2>

            {!isAuthenticated && (
              <div className="mb-4 rounded-xl bg-orange-500/10 ring-1 ring-orange-500/30 p-3 text-sm text-orange-200">
                Necesitas una cuenta para solicitar. <button onClick={() => navigate('/auth?redirect=/partner/aplicar')} className="underline font-bold">Crear cuenta o entrar</button>.
              </div>
            )}

            <label className="block text-sm font-bold text-white/80 mb-1">Ciudad *</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ej. Madrid"
              className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 mb-4 outline-none focus:ring-fuchsia-500" />

            <label className="block text-sm font-bold text-white/80 mb-1">WhatsApp / teléfono</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 ..."
              className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 mb-4 outline-none focus:ring-fuchsia-500" />

            <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
              <button type="button" onClick={() => setIsCreator(v => !v)}
                className={`text-left rounded-xl p-3 ring-1 transition ${isCreator ? 'bg-fuchsia-500/15 ring-fuchsia-500' : 'bg-black/30 ring-white/15'}`}>
                <div className="flex items-center gap-2 font-bold"><Video className="w-4 h-4" /> Soy creador de contenido</div>
                <p className="text-white/50 text-xs mt-1">Grabo vídeos/fotos de eventos. (Requisito)</p>
              </button>
              <button type="button" onClick={() => setCanEdit(v => !v)}
                className={`text-left rounded-xl p-3 ring-1 transition ${canEdit ? 'bg-fuchsia-500/15 ring-fuchsia-500' : 'bg-black/30 ring-white/15'}`}>
                <div className="flex items-center gap-2 font-bold"><Scissors className="w-4 h-4" /> Sé editar vídeo</div>
                <p className="text-white/50 text-xs mt-1">Si no, la central edita por ti.</p>
              </button>
            </div>

            <label className="block text-sm font-bold text-white/80 mb-1">Enlace a tu contenido (Instagram, YouTube, TikTok…)</label>
            <input value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="https://..."
              className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 mb-4 outline-none focus:ring-fuchsia-500" />

            <label className="block text-sm font-bold text-white/80 mb-1">¿Por qué quieres ser partner?</label>
            <textarea value={motivation} onChange={e => setMotivation(e.target.value)} rows={3} placeholder="Cuéntanos sobre ti y la escena de tu ciudad…"
              className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 mb-5 outline-none focus:ring-fuchsia-500 resize-none" />

            <button onClick={submit} disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-6 py-3.5 hover:opacity-90 disabled:opacity-60 transition">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerApplyPage;
