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
      {/* Capa de gradient base (rosa de marca, visible) */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-100/70 via-pink-50/50 to-fuchsia-100/60 dark:from-gray-900/80 dark:via-[#0a0a0a] dark:to-purple-950/30" />

      {/* Blob 1 — rosa de marca top-right */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-40 dark:opacity-15 blur-3xl animate-bn-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(229,18,125,0.8) 0%, transparent 70%)' }}
      />

      {/* Blob 2 — magenta oscuro bottom-left */}
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-35 dark:opacity-12 blur-3xl animate-bn-float-slower"
        style={{ background: 'radial-gradient(circle, rgba(131,24,67,0.7) 0%, transparent 70%)' }}
      />

      {/* Blob 3 — rosa intenso center */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-10 blur-3xl animate-bn-float"
        style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.6) 0%, transparent 70%)' }}
      />

      {/* Blob 4 — fucsia top-left (más sutil) */}
      <div
        className="absolute top-40 -left-20 w-[300px] h-[300px] rounded-full opacity-25 dark:opacity-8 blur-3xl animate-bn-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.6) 0%, transparent 70%)' }}
      />

      {/* Patrón de puntos sutil (noise visual) */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

export default HomeBackground;
