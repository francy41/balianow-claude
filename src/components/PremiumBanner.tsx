import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';

// ── Banner principal ────────────────────────────────────────────────────────
// Lo que hacen Uber, Uber Eats, Airbnb y Booking en su portada no es enseñar
// más: es enseñar MENOS y con más peso. Una promesa, una acción, sin
// alternativas que repartan la atención.
//
// Por eso aquí hay UN solo botón grande. La tentación de poner cuatro es
// enorme y es justo lo que convierte una portada en un menú de aeropuerto:
// cuando todo pesa igual, no pesa nada.
//
// La acción es "Bailar esta noche" porque es la de mayor intención del
// producto: quien la pulsa ya quiere salir hoy. Las demás vías siguen a un
// toque en la barra de categorías que va justo debajo.
//
// El movimiento es lento y sutil a propósito. Un banner que parpadea parece
// una oferta de casino; uno que respira parece caro.

const PremiumBanner: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <section className="px-4 sm:px-6 mt-6">
    <div className="relative max-w-6xl mx-auto overflow-hidden rounded-[28px] bg-gray-950 isolate">

      {/* Luces de fondo. Dos manchas de color muy difuminadas sobre negro: es
          lo que da la sensación de profundidad sin cargar la pieza de dibujos. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 w-[32rem] h-[32rem] rounded-full bg-brand/30 blur-[90px]" />
        <div className="absolute -bottom-40 -right-20 w-[34rem] h-[34rem] rounded-full bg-brand-secondary/25 blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-fuchsia-600/15 blur-[80px]" />
      </div>

      {/* Retícula finísima. Casi no se ve, y es la diferencia entre "fondo de
          color" y "producto". */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Barrido de luz. Una sola pasada lenta, no un parpadeo. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="banner-brillo absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>

      <div className="relative px-6 py-10 sm:px-12 sm:py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
          </span>
          Hoy se baila
        </span>

        <h2 className="mt-5 font-display font-black text-white leading-[1.05] text-[2rem] sm:text-5xl lg:text-6xl">
          Esta noche hay dónde
          <br className="hidden sm:block" />{' '}
          <span className="bg-gradient-to-r from-brand via-fuchsia-400 to-brand-secondary bg-clip-text text-transparent">
            bailar cerca de ti
          </span>
        </h2>

        <p className="mt-4 text-white/65 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed">
          Locales abiertos, quién va esta noche y con quién puedes quedar.
          En tu ciudad y en otras veinte.
        </p>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/rutas')}
            className="group inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 sm:px-9 sm:py-5 text-gray-950 font-display font-black text-base sm:text-lg shadow-[0_8px_40px_-8px_rgba(255,255,255,0.35)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            <MapPin className="w-5 h-5 text-brand" />
            Bailar esta noche
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        <p className="mt-5 text-[11px] sm:text-xs text-white/40">
          Gratis · Sin esperar a que nadie te invite
        </p>
      </div>
    </div>
  </section>
);

export default PremiumBanner;
