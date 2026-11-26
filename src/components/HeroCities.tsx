import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ── Las ciudades del hero ───────────────────────────────────────────────────
// Sustituye a los contadores del catálogo ("83 Locales · 66 Eventos · 52
// Artistas · 23 Ciudades · 6 Clases").
//
// POR QUÉ SE QUITAN LOS NÚMEROS
// Un contador solo impresiona cuando la cifra es grande. "6 Clases" en portada
// anuncia que el proyecto acaba de empezar, y además mete a la empresa en una
// trampa: o infla las cifras, o enseña lo vacía que está. El día que BailaNow
// tenga 10.000 locales el contador será un acierto; hasta entonces, juega en
// contra.
//
// Los MISMOS datos contados de otra forma dicen lo contrario. "23 ciudades"
// suena pequeño; "Madrid · La Habana · Nueva York · París · Cali" suena a
// mapamundi. Y no envejece: la tira se ve igual de bien con 15 ciudades que
// con 300.
//
// Las ciudades son REALES, salen de `venues` y se ordenan por número de
// locales. Nada inventado: si mañana se añade Tokio, aparece sola.
//
// Y no es decorado: cada ciudad lleva a su listado. Un contador no se puede
// pulsar; esto es además una forma de entrar al producto.

type Ciudad = { nombre: string; locales: number };

// Las ciudades se guardan con su nombre local ("New York", "Paris"). En una
// portada en español se leen mejor traducidas, y es la misma ciudad: no se
// inventa nada. El enlace sigue usando el nombre tal cual está en la base.
const EN_ESPANOL: Record<string, string> = {
  'New York': 'Nueva York',
  'Paris': 'París',
  'London': 'Londres',
  'Berlin': 'Berlín',
  'Milan': 'Milán',
  'Lisbon': 'Lisboa',
  'Rome': 'Roma',
  'Brussels': 'Bruselas',
  'Zurich': 'Zúrich',
  'Geneva': 'Ginebra',
  'Munich': 'Múnich',
  'Moscow': 'Moscú',
  'Athens': 'Atenas',
  'Copenhagen': 'Copenhague',
};

// Mínimo de ciudades para que la tira tenga sentido. Con menos, una marquesina
// de tres nombres girando queda pobre: mejor no enseñar nada.
const MINIMO = 5;

const HeroCities: React.FC = () => {
  const navigate = useNavigate();
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  useEffect(() => {
    let cancelado = false;
    // Una sola consulta y el recuento en el cliente: son decenas de filas, no
    // compensa una vista ni una función para esto.
    supabase.from('venues').select('city').is('deleted_at', null)
      .then(({ data }) => {
        if (cancelado || !data) return;
        const cuenta = new Map<string, number>();
        for (const fila of data as { city: string | null }[]) {
          // "Madrid, España" y "Madrid" son la misma ciudad.
          const nombre = String(fila.city ?? '').split(',')[0].trim();
          if (!nombre) continue;
          cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
        }
        const lista = [...cuenta.entries()]
          .map(([nombre, locales]) => ({ nombre, locales }))
          .sort((a, b) => b.locales - a.locales || a.nombre.localeCompare(b.nombre))
          .slice(0, 18);
        setCiudades(lista);
      }, () => {});
    return () => { cancelado = true; };
  }, []);

  if (ciudades.length < MINIMO) return null;

  // Triplicada: el keyframe desplaza un tercio, así el bucle no da tirón.
  const tira = [...ciudades, ...ciudades, ...ciudades];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-tertiary">
          Se baila en
        </span>
      </div>

      {/* El degradado de los bordes hace que la tira "entre y salga" en vez de
          cortarse en seco. Va en `style` porque Tailwind descarta las clases
          arbitrarias que llevan % y # dentro. */}
      <div
        className="relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        }}
      >
        {/* Teletipo, no botones con caja: en la columna del hero solo caben dos
            o tres píldoras, y entonces la tira dice "tres ciudades" — justo lo
            contrario de lo que se quiere contar. Así entran el doble y se lee
            como un titular, no como una botonera. */}
        {/* Velocidad normal (30 s), no la lenta: con la lenta la lista entera
            tarda casi 17 s en pasar y quien mira tres segundos ve dos nombres.
            La sensación de "muchas ciudades" la da el movimiento, no cuántas
            caben a la vez. Al pasar el ratón se detiene. */}
        <div className="flex items-center whitespace-nowrap animate-marquee-left w-max">
          {tira.map((c, i) => (
            <span key={`${c.nombre}-${i}`} className="flex items-center flex-shrink-0">
              <button
                onClick={() => navigate(`/venues?city=${encodeURIComponent(c.nombre)}`)}
                // Solo el primer tercio es "real" para los lectores de pantalla;
                // las copias existen para el bucle y se ocultan.
                aria-hidden={i >= ciudades.length}
                tabIndex={i >= ciudades.length ? -1 : 0}
                className="font-display font-black text-[15px] sm:text-base text-ink-primary hover:text-accent transition-colors"
              >
                {EN_ESPANOL[c.nombre] ?? c.nombre}
              </button>
              <span aria-hidden="true" className="mx-3 text-accent/40 select-none">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroCities;
