import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Calendar, QrCode, ShoppingBag, Wine, BarChart3, Radio, MessageSquare, TrendingUp } from 'lucide-react';
import { AD_PLANS, AD_BOOST } from '../data/adPlans';

const TOOLS = [
  { icon: <Calendar className="w-5 h-5" />,   title: 'Reservas con seña',  desc: 'Cobra un depósito y el resto en el local' },
  { icon: <QrCode className="w-5 h-5" />,      title: 'Código QR propio',   desc: 'A tu perfil, reservas o enlace, para imprimir' },
  { icon: <ShoppingBag className="w-5 h-5" />, title: 'Ventas online',      desc: 'Tu tienda dentro de BailaNow' },
  { icon: <Wine className="w-5 h-5" />,        title: 'Mesas VIP',          desc: 'Bottle service y palcos en tus eventos' },
  { icon: <BarChart3 className="w-5 h-5" />,   title: 'Estadísticas',       desc: 'Métricas y ganancias de tu negocio' },
  { icon: <Radio className="w-5 h-5" />,       title: 'Directos de pago',   desc: 'Cobra por masterclass y shows en vivo (PPV)' },
];

const STEPS = [
  { n: 1, title: 'Elige tu plan', desc: 'Destacado, Patrocinador o Top Premium según lo que necesites.' },
  { n: 2, title: 'Confirma por chat', desc: 'Nos escribes, confirmas el pago y activamos en menos de 24h.' },
  { n: 3, title: 'Empieza a operar', desc: 'Reservas, QR, ventas y visibilidad funcionando desde el día 1.' },
];

const FAQ = [
  { q: '¿Hay permanencia?', a: 'No. La facturación es mensual y cancelas cuando quieras.' },
  { q: '¿Cómo se paga?', a: 'Confirmas el plan por chat y te pasamos el enlace de pago seguro. Activamos en menos de 24h.' },
  { q: '¿Necesito cuenta de negocio?', a: 'El alta de tu escuela, local o marca es gratis. El plan solo desbloquea las herramientas de pago.' },
  { q: '¿Puedo cambiar de plan?', a: 'Sí, subes o bajas de plan cuando quieras según cómo vaya tu negocio.' },
];

const BusinessPricingPage: React.FC = () => {
  const navigate = useNavigate();

  const contratar = (name: string, price: number, period: string) =>
    navigate(`/chat?asunto=${encodeURIComponent(`Quiero el plan ${name} (€${price}${period})`)}`);

  const activarGratis = () =>
    navigate(`/chat?asunto=${encodeURIComponent('Quiero activar mi cuenta de negocio (gratis)')}`);

  const destacarAnuncio = () =>
    navigate(`/chat?asunto=${encodeURIComponent('Quiero destacar mi anuncio (desde €5/mes)')}`);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20 transition-colors">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-black">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-20 text-center">
          <span className="inline-block bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Para negocios
          </span>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-white leading-tight">
            Haz crecer tu negocio <span className="bg-brand-orange bg-clip-text text-transparent">de baile</span>
          </h1>
          <p className="text-white/70 text-sm sm:text-lg mt-4 max-w-2xl mx-auto">
            Reservas, ventas, código QR, mesas VIP y visibilidad ante miles de bailarines.
            Activación inmediata, facturación mensual, sin permanencia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <button onClick={activarGratis} className="bg-white text-gray-900 font-bold text-sm rounded-xl px-5 py-3 hover:bg-gray-100 transition-all flex items-center gap-1.5">
              Activa tu cuenta gratis <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#planes" className="text-white/80 font-bold text-sm rounded-xl px-5 py-3 border border-white/20 hover:bg-white/10 transition-all">
              Ver planes
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Planes */}
        <section id="planes" className="mt-12 scroll-mt-6">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white">Elige tu plan</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Precios por mes · sin permanencia</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            {AD_PLANS.map(plan => (
              <div key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.popular
                    ? 'bg-white dark:bg-gray-900 shadow-2xl shadow-fuchsia-500/10 ring-2 ring-fuchsia-400 sm:-mt-3'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                }`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                    ⚡ Más popular
                  </span>
                )}
                <div className="text-center mb-4">
                  <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-2xl mb-2`}>
                    {plan.icon}
                  </div>
                  <h3 className="font-display font-black text-lg text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400">{plan.tagline}</p>
                  <div className="mt-3 flex items-end justify-center gap-0.5">
                    <span className="font-display font-black text-4xl text-gray-900 dark:text-white">€{plan.price}</span>
                    <span className="text-xs mb-1.5 text-gray-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-fuchsia-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => contratar(plan.name, plan.price, plan.period)}
                  className={`w-full font-bold text-sm rounded-xl py-3 transition-all flex items-center justify-center gap-1.5 ${
                    plan.popular
                      ? 'bg-brand-orange text-white hover:opacity-90'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                  }`}>
                  Contratar <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-[11px] mt-5">
            💬 Activamos tu campaña en menos de 24h tras confirmar el pago por chat.
          </p>
        </section>

        {/* Destaca tu anuncio — usuarios y ofertantes */}
        <section className="mt-10">
          <div className="rounded-3xl border-2 border-dashed border-fuchsia-300 dark:border-fuchsia-800 bg-white dark:bg-gray-900 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 text-center sm:text-left">
                <span className="inline-block bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                  Para usuarios y ofertantes
                </span>
                <h3 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white">Destaca tu anuncio</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md">
                  ¿No tienes un negocio pero quieres que te vean? Sube tu publicación o anuncio a los <strong className="text-gray-700 dark:text-gray-200">primeros lugares durante un mes</strong>. Simple y sin complicaciones.
                </p>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="flex items-end justify-center gap-1">
                  <span className="text-xs text-gray-400 mb-1">desde</span>
                  <span className="font-display font-black text-5xl text-gray-900 dark:text-white">€{AD_BOOST.price}</span>
                  <span className="text-xs text-gray-400 mb-1.5">{AD_BOOST.period}</span>
                </div>
                <button
                  onClick={destacarAnuncio}
                  className="mt-3 bg-brand-orange text-white font-bold rounded-xl px-6 py-3 hover:opacity-90 transition-all inline-flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> Destacar mi anuncio
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Qué incluye */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white">Todo lo que puedes hacer</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Herramientas que se activan con tu plan</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map(t => (
              <div key={t.title} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-brand-orange flex items-center justify-center text-white mb-3">
                  {t.icon}
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{t.title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white">Cómo funciona</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map(s => (
              <div key={s.n} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-brand-orange text-white font-black flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{s.title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white">Preguntas frecuentes</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ.map(f => (
              <div key={f.q} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{f.q}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-16 bg-gray-800 rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <h3 className="font-display font-black text-xl sm:text-2xl text-white mb-2">¿Listo para empezar?</h3>
            <p className="text-gray-400 text-sm mb-5 max-w-md mx-auto">
              Da de alta tu negocio gratis y elige un plan cuando quieras desbloquear reservas, ventas y más.
            </p>
            <button onClick={activarGratis} className="bg-brand-orange text-white font-bold rounded-xl px-6 py-3 hover:opacity-90 transition-all inline-flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Activa tu cuenta gratis
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BusinessPricingPage;
