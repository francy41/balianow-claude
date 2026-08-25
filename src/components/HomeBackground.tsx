/**
 * HomeBackground — fondo de la HomePage
 *
 * El rosa fuerte se reserva para la cabecera y los acentos (hero TV/Radio,
 * panel de Planes de baile, botones). El resto de la página vive sobre un
 * rosa muy claro, casi blanco, para que las fotos de las tarjetas destaquen
 * y la página respire.
 * - Posicionado absolute detrás del contenido, no interactivo
 * - Respeta dark mode
 */
import React from 'react';

const HomeBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Base clara: un velo rosa muy suave sobre blanco. */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50 via-white to-pink-50/60 dark:from-gray-900 dark:via-[#0a0a0a] dark:to-brand-deep/40" />

      {/* Halo rosa arriba: liga visualmente con la cabecera y el hero. */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand/15 to-transparent dark:from-brand-deep/30" />

      {/* Manchas de color muy diluidas, solo para dar profundidad al blanco. */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-20 blur-3xl animate-bn-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(229,18,125,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-35 dark:opacity-20 blur-3xl animate-bn-float-slower"
        style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.14) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/3 w-[420px] h-[420px] rounded-full opacity-30 dark:opacity-10 blur-3xl animate-bn-float"
        style={{ background: 'radial-gradient(circle, rgba(229,18,125,0.12) 0%, transparent 70%)' }}
      />
    </div>
  );
};

export default HomeBackground;
