import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Users, Heart, Images, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/appStore';

// ── Primeros pasos ──────────────────────────────────────────────────────────
// BailaNow tiene 71 rutas. Alguien que entra por primera vez no sabe por dónde
// empezar, y la pantalla de inicio no se lo dice: le enseña de todo a la vez.
//
// Esto no es un tour de la aplicación. Son cuatro pantallas que cuentan UNA
// historia —la que de verdad distingue a BailaNow— y terminan empujando a la
// única acción que hace que lo demás cobre sentido: marcarse en un local.
//
// Se enseña una sola vez y solo con sesión iniciada: a quien aún está mirando
// no se le interrumpe, y antes de registrarse nada de esto le sirve.

const CLAVE = 'bn_primeros_pasos_v1';

// Guardado tolerante a fallos: en navegación privada o con el almacenamiento
// bloqueado, `localStorage` lanza. Preferimos repetir el saludo antes que
// romper la aplicación por un recuerdo.
const yaVisto = (): boolean => {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return true; }
};
const marcarVisto = () => {
  try { localStorage.setItem(CLAVE, '1'); } catch { /* da igual */ }
};

type Paso = {
  icono: React.ReactNode;
  emoji: string;
  titulo: string;
  texto: string;
};

const PASOS: Paso[] = [
  {
    icono: <MapPin className="w-7 h-7" />,
    emoji: '📍',
    titulo: 'Encuentra dónde se baila',
    texto: 'Locales, eventos y clases de tu ciudad. Quién abre esta noche y qué suena en cada sitio.',
  },
  {
    icono: <Users className="w-7 h-7" />,
    emoji: '💃',
    titulo: 'Marca que estás allí',
    texto: 'Al llegar al local, pulsa "Estoy aquí". Verás a quién más vino esa noche — y solo te ve quien también se marcó.',
  },
  {
    icono: <Heart className="w-7 h-7" />,
    emoji: '💞',
    titulo: '¿Bailaste con alguien y te fuiste sin saber su nombre?',
    texto: 'Búscalo entre quienes estuvieron allí. Si os interesáis los dos, hacéis match y podéis hablar para quedar en otro sitio.',
  },
  {
    icono: <Images className="w-7 h-7" />,
    emoji: '📸',
    titulo: 'Cuenta tus noches',
    texto: 'Sube fotos y vídeos al muro, sigue a bailarines y locales, y deja reseñas a quien baila bien.',
  },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (isAuthenticated && !yaVisto()) setAbierto(true);
  }, [isAuthenticated]);

  const cerrar = () => { marcarVisto(); setAbierto(false); };
  const terminar = () => { cerrar(); navigate('/venues'); };

  if (!abierto) return null;

  const actual = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="card-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand via-brand-secondary to-fuchsia-700 px-6 pt-6 pb-8 text-white text-center">
          <button onClick={cerrar} aria-label="Saltar"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-3">
            {actual.icono}
          </div>
          <p className="text-4xl mb-1">{actual.emoji}</p>
        </div>

        <div className="px-6 py-5 text-center">
          <h2 className="font-display font-black text-xl text-ink-primary leading-tight">{actual.titulo}</h2>
          <p className="text-ink-secondary text-sm mt-2 leading-relaxed">{actual.texto}</p>

          <div className="flex justify-center gap-1.5 mt-5">
            {PASOS.map((_, i) => (
              <button key={i} onClick={() => setPaso(i)} aria-label={`Paso ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === paso ? 'w-6 bg-brand-orange' : 'w-1.5 bg-hairline/40'
                }`} />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button onClick={cerrar} className="flex-1 py-2.5 text-sm font-bold text-ink-tertiary">
              Saltar
            </button>
            <button
              onClick={() => (ultimo ? terminar() : setPaso(p => p + 1))}
              className="flex-[2] btn-orange py-2.5 text-sm flex items-center justify-center gap-1.5">
              {ultimo ? 'Ver locales cerca' : 'Siguiente'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
