/**
 * HomeBackground — fondo decorativo flotante para toda la HomePage
 *
 * - SVG blobs animados con gradient brand (pink/purple/orange)
 * - Posicionado absolute detrás del contenido
 * - Respeta dark mode
 * - No interactivo (pointer-events: none)
 * - Optimizado: <2KB, GPU-aceleradas (transform animations)
 */
import React from 'react';

const HomeBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Capa base: rosa de marca a plena intensidad — el Home entero vive sobre
          rosa, con las tarjetas blancas flotando encima (mismo lenguaje que el
          panel de "Planes de baile"). Usa los tokens de marca, así que el color
          se puede cambiar desde SuperAdmin → Diseño Web. */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand via-brand to-brand-deep dark:from-gray-900 dark:via-[#0a0a0a] dark:to-brand-deep" />

      {/* Sobre el rosa base, halos de luz/sombra para dar profundidad — ya no son
          manchas de color (el fondo YA es rosa), sino brillos claros y oscuros. */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-15 blur-3xl animate-bn-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-45 dark:opacity-20 blur-3xl animate-bn-float-slower"
        style={{ background: 'radial-gradient(circle, rgba(131,24,67,0.65) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-10 blur-3xl animate-bn-float"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-40 -left-20 w-[300px] h-[300px] rounded-full opacity-30 dark:opacity-10 blur-3xl animate-bn-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 70%)' }}
      />

      {/* Patrón de puntos sutil (noise visual) */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

export default HomeBackground;
