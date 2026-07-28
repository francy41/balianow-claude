import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Handshake, CreditCard, GraduationCap, Radio, Sparkles, ArrowRight } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';

const ROLES = [
  { emoji: '🎺', label: 'Artista / Banda', to: '/auth?role=artist' },
  { emoji: '💃', label: 'Bailarín/a', to: '/auth?role=dancer' },
  { emoji: '🎧', label: 'DJ / Músico', to: '/auth?role=dj' },
  { emoji: '🏛️', label: 'Dueño de local', to: '/auth?role=venue' },
  { emoji: '📣', label: 'Promotor', to: '/auth?role=promoter' },
  { emoji: '🌎', label: 'Partner de ciudad', to: '/partner/aplicar' },
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
  useSeo({
    title: 'Únete a BailaNow — tu panel de control para artistas, bailarines y locales',
    description: '¿Artista, bailarín, músico, dueño de local, promotor o partner de ciudad? BailaNow te crea tu panel: reservas, contratación, pagos, cursos y directos. Todo en uno.',
    path: '/unete',
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-fuchsia-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-2 text-fuchsia-300 font-black text-xs tracking-widest uppercase mb-4"><Sparkles className="w-4 h-4" /> Únete a BailaNow</span>
          <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight">
            ¿Eres un apasionado del <span className="bg-gradient-to-r from-orange-400 to-fuchsia-400 bg-clip-text text-transparent">baile y la música latina</span>?
          </h1>
          <p className="text-white/80 text-lg mt-5 max-w-2xl mx-auto">
            Artista, bailarín, músico, dueño de local, promotor… o quieres ser <b className="text-white">partner de tu ciudad</b> en BailaNow.
            Vuela y escríbenos: <b className="text-white">te creamos tu panel de control</b>. Con tus reservas, zona de contratación,
            pasarelas de pago, tus cursos y transmisiones online, y todo lo que necesitas para conseguir eventos. <b className="text-white">Todo en uno.</b>
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <button onClick={() => navigate('/auth?mode=register')} className="bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-6 py-3.5 inline-flex items-center gap-2">Crear mi panel gratis <ArrowRight className="w-4 h-4" /></button>
            <button onClick={() => navigate('/partner/aplicar')} className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl px-6 py-3.5">Ser partner de mi ciudad 🌎</button>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="max-w-4xl mx-auto px-5">
        <h2 className="font-display font-black text-xl mb-3 text-center">¿Quién eres?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ROLES.map(r => (
            <button key={r.label} onClick={() => navigate(r.to)} className="rounded-2xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10 p-4 text-left transition">
              <div className="text-3xl">{r.emoji}</div>
              <p className="font-bold mt-2 flex items-center gap-1">{r.label} <ArrowRight className="w-3.5 h-3.5 text-white/40" /></p>
            </button>
          ))}
        </div>

        {/* Lo que incluye tu panel */}
        <h2 className="font-display font-black text-xl mt-10 mb-3 text-center">Tu panel de control, todo en uno</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div key={f.t} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-600 flex items-center justify-center">{f.icon}</div>
              <p className="font-bold mt-3">{f.t}</p>
              <p className="text-white/60 text-sm mt-0.5">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button onClick={() => navigate('/auth?mode=register')} className="bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white font-bold rounded-xl px-8 py-4 text-lg inline-flex items-center gap-2">Vuela con BailaNow <ArrowRight className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

export default RecruitPage;
