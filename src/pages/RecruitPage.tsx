import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Handshake, CreditCard, GraduationCap, Radio, Sparkles, ArrowRight, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { useSeo } from '../hooks/useSeo';

const ROLE_OPTS = [
  { v: 'artist', emoji: '🎺', label: 'Artista / Banda' },
  { v: 'dancer', emoji: '💃', label: 'Bailarín/a' },
  { v: 'dj', emoji: '🎧', label: 'DJ / Músico' },
  { v: 'venue', emoji: '🏛️', label: 'Dueño de local' },
  { v: 'promoter', emoji: '📣', label: 'Promotor' },
];

const FEATURES = [
  { icon: <Calendar className="w-5 h-5" />, t: 'Reservas', d: 'Tu calendario y reservas online, sin líos.' },
  { icon: <Handshake className="w-5 h-5" />, t: 'Zona de contratación', d: 'Recibe solicitudes y cierra bolos desde tu perfil.' },
  { icon: <CreditCard className="w-5 h-5" />, t: 'Pasarelas de pago', d: 'Cobra con tarjeta y PayPal, con escrow seguro.' },
  { icon: <GraduationCap className="w-5 h-5" />, t: 'Tus cursos', d: 'Publica y vende tus clases y cursos de baile.' },
  { icon: <Radio className="w-5 h-5" />, t: 'Transmisiones online', d: 'Directos y clases en vídeo para tu comunidad.' },
  { icon: <Sparkles className="w-5 h-5" />, t: 'Todo en uno', d: 'Todo lo que necesitas para conseguir eventos.' },
];

const RecruitPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  useSeo({
    title: 'Únete a BailaNow — tu panel de control para artistas, bailarines y locales',
    description: '¿Artista, bailarín, músico, dueño de local, promotor o partner de ciudad? BailaNow te crea tu panel: reservas, contratación, pagos, cursos y directos. Todo en uno.',
    path: '/unete',
  });

  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '', role: 'dancer', city: user?.city || '', portfolio: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const pickRole = (v: string) => { set('role', v); document.getElementById('solicitud')?.scrollIntoView({ behavior: 'smooth' }); };

  const submit = async () => {
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { addToast({ message: 'Pon tu nombre y un email válido', type: 'error' }); return; }
    setSending(true);
    const { error } = await supabase.from('creator_applications').insert({
      user_id: user?.id ?? null, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim() || null,
      role: form.role, city: form.city.trim() || null, portfolio_url: form.portfolio.trim() || null, message: form.message.trim() || null, status: 'pending',
    });
    setSending(false);
    if (error) { addToast({ message: error.message, type: 'error' }); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-fuchsia-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-2 text-fuchsia-300 font-black text-xs tracking-widest uppercase mb-4"><Sparkles className="w-4 h-4" /> Únete a BailaNow</span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            ¿Eres un apasionado del <span className="bg-brand-orange bg-clip-text text-transparent">baile y la música latina</span>?
          </h1>
          <p className="text-white/80 text-lg mt-5 max-w-2xl mx-auto">
            Artista, bailarín, músico, dueño de local, promotor… o quieres ser <b className="text-white">partner de tu ciudad</b> en BailaNow.
            Vuela y escríbenos: <b className="text-white">te creamos tu panel de control</b>. Con tus reservas, zona de contratación,
            pasarelas de pago, tus cursos y transmisiones online, y todo lo que necesitas para conseguir eventos. <b className="text-white">Todo en uno.</b>
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <button onClick={() => document.getElementById('solicitud')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-orange text-white font-bold rounded-xl px-6 py-3.5 inline-flex items-center gap-2">Solicitar unirme <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => navigate('/partner/aplicar')} className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl px-6 py-3.5">Ser partner de mi ciudad 🌎</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5">
        {/* Roles */}
        <h2 className="font-display font-black text-xl mb-3 text-center">¿Quién eres?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ROLE_OPTS.map(r => (
            <button key={r.v} onClick={() => pickRole(r.v)} className={`rounded-2xl ring-1 p-4 text-left transition ${form.role === r.v ? 'bg-fuchsia-500/15 ring-fuchsia-500' : 'bg-white/5 ring-white/10 hover:bg-white/10'}`}>
              <div className="text-3xl">{r.emoji}</div>
              <p className="font-bold mt-2 flex items-center gap-1">{r.label} <ArrowRight className="w-3.5 h-3.5 text-white/40" /></p>
            </button>
          ))}
        </div>

        {/* Panel */}
        <h2 className="font-display font-black text-xl mt-10 mb-3 text-center">Tu panel de control, todo en uno</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div key={f.t} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center">{f.icon}</div>
              <p className="font-bold mt-3">{f.t}</p>
              <p className="text-white/60 text-sm mt-0.5">{f.d}</p>
            </div>
          ))}
        </div>

        {/* Formulario de solicitud (con aprobación) */}
        <div id="solicitud" className="mt-12 max-w-lg mx-auto">
          {sent ? (
            <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
              <p className="font-display font-black text-xl">¡Solicitud enviada! 🎉</p>
              <p className="text-white/60 text-sm mt-2">Nuestro equipo la revisará y, tras la aprobación, te ayudamos a crear tu panel y tu perfil en BailaNow.</p>
              <button onClick={() => navigate('/')} className="mt-5 bg-white/10 hover:bg-white/20 font-bold rounded-xl px-6 py-2.5">Volver al inicio</button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
              <h2 className="font-display font-black text-xl mb-1">Solicita ser parte de BailaNow</h2>
              <p className="text-white/50 text-sm mb-4">Tu perfil se crea <b className="text-white">tras la aprobación</b> de nuestro equipo. Cuéntanos de ti:</p>
              <div className="space-y-2.5">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre / nombre artístico *" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                  <select value={form.role} onChange={e => set('role', e.target.value)} className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none">
                    {ROLE_OPTS.map(r => <option key={r.v} value={r.v} className="bg-gray-900">{r.emoji} {r.label}</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email *" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="WhatsApp / teléfono" className="rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                </div>
                <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Ciudad" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                <input value={form.portfolio} onChange={e => set('portfolio', e.target.value)} placeholder="Enlace a tu trabajo (Instagram, YouTube, web…)" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500" />
                <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="Cuéntanos sobre ti y qué ofreces" className="w-full rounded-xl bg-black/30 ring-1 ring-white/15 px-4 py-3 outline-none focus:ring-fuchsia-500 resize-none" />
                <button onClick={submit} disabled={sending} className="w-full inline-flex items-center justify-center gap-2 bg-brand-orange text-white font-bold rounded-xl py-3.5 disabled:opacity-60">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Enviar solicitud
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruitPage;
