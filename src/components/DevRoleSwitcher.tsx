import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Music2, User, X, Settings, MapPin, Sparkles, Building, Headphones, Mic } from 'lucide-react';
import { useAuthStore, useUIStore, type UserRole } from '../store/appStore';

interface Profile {
  id: string;
  category: 'admin' | 'creator' | 'fan';
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  user: {
    id: string; name: string; email: string; avatar: string;
    role: UserRole; city: string;
    isVerified: boolean; isPremium: boolean;
    wallet: number; notifications: number;
  };
  goto: string;
}

const PROFILES: Profile[] = [
  // ── Admin ───────────────────────────────────────────────
  {
    id: 'admin', category: 'admin',
    label: 'Super Admin', desc: 'Solfa Mende · panel global',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-brand-orange text-white',
    user: {
      id: 'u_solfa', name: 'Solfa Mende', email: 'solfamende41@gmail.com',
      avatar: 'https://ui-avatars.com/api/?name=Solfa+Mende&background=EC4899&color=fff',
      role: 'admin', city: 'Madrid',
      isVerified: true, isPremium: true, wallet: 0, notifications: 0,
    },
    goto: '/admin',
  },
  // ── Vendedores / Creators ──────────────────────────────
  {
    id: 'dj', category: 'creator',
    label: 'DJ Mambo King', desc: 'DJ · Madrid',
    icon: <Headphones className="w-4 h-4" />,
    color: 'bg-pink-500 text-white',
    user: {
      id: 'a1', name: 'DJ Mambo King', email: 'dj@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=DJ+Mambo&background=A855F7&color=fff',
      role: 'dj', city: 'Madrid',
      isVerified: true, isPremium: true, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
  {
    id: 'dancer', category: 'creator',
    label: 'La Reina del Ritmo', desc: 'Bailarina · Barcelona',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-pink-400 text-white',
    user: {
      id: 'a2', name: 'La Reina del Ritmo', email: 'lareina@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=La+Reina&background=EC4899&color=fff',
      role: 'dancer', city: 'Barcelona',
      isVerified: true, isPremium: false, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
  {
    id: 'band', category: 'creator',
    label: 'Orquesta Tropical', desc: 'Banda / Artista · Valencia',
    icon: <Music2 className="w-4 h-4" />,
    color: 'bg-pink-500 text-white',
    user: {
      id: 'a3', name: 'Orquesta Tropical', email: 'orquesta@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=Orquesta+T&background=F59E0B&color=fff',
      role: 'artist', city: 'Valencia',
      isVerified: true, isPremium: false, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
  {
    id: 'instructor', category: 'creator',
    label: 'Marcos & Elena', desc: 'Instructores · Bilbao',
    icon: <Mic className="w-4 h-4" />,
    color: 'bg-red-500 text-white',
    user: {
      id: 'a4', name: 'Marcos & Elena Dance', email: 'instructores@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=Marcos+Elena&background=EF4444&color=fff',
      role: 'dancer', city: 'Bilbao',
      isVerified: true, isPremium: false, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
  {
    id: 'venue', category: 'creator',
    label: 'Tropical House', desc: 'Venue / Local · Madrid',
    icon: <Building className="w-4 h-4" />,
    color: 'bg-purple-600 text-white',
    user: {
      id: 'v1', name: 'Tropical House Madrid', email: 'venue@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=Tropical+H&background=7C3AED&color=fff',
      role: 'venue', city: 'Madrid',
      isVerified: true, isPremium: true, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
  // ── Comprador ──────────────────────────────────────────
  {
    id: 'fan', category: 'fan',
    label: 'Carlos (Fan)', desc: 'Comprador · Mis pedidos',
    icon: <User className="w-4 h-4" />,
    color: 'bg-gray-700 text-white',
    user: {
      id: 'u1', name: 'Carlos Rodríguez', email: 'carlos@bachasalseros.com',
      avatar: 'https://ui-avatars.com/api/?name=Carlos+R&background=9CA3AF&color=fff',
      role: 'user', city: 'Madrid',
      isVerified: false, isPremium: false, wallet: 0, notifications: 0,
    },
    goto: '/dashboard',
  },
];

const CATEGORIES = [
  { id: 'admin' as const,   label: '👑 Admin' },
  { id: 'creator' as const, label: '🎨 Vendedores' },
  { id: 'fan' as const,     label: '👤 Compradores' },
];

const DevRoleSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);

  const switchTo = (p: Profile) => {
    useAuthStore.setState({ user: p.user, isAuthenticated: true });
    addToast({ message: `Entraste como ${p.label}`, type: 'success' });
    setOpen(false);
    navigate(p.goto);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-[60] bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl px-4 py-2.5 flex items-center gap-2 text-xs font-bold"
        title="Cambiar de usuario rápidamente"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">DEV · {user?.role || 'guest'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-[60] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[80vh] flex flex-col">
          <div className="bg-gray-900 text-white p-3 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Modo desarrollo</p>
              <p className="text-sm font-bold">Cambiar de usuario</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
            {CATEGORIES.map(cat => (
              <div key={cat.id} className="mb-2 last:mb-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">{cat.label}</p>
                {PROFILES.filter(p => p.category === cat.id).map(p => {
                  const isCurrent = user?.email === p.user.email;
                  return (
                    <button
                      key={p.id}
                      onClick={() => switchTo(p)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all mb-0.5 ${
                        isCurrent ? 'bg-pink-50 border border-brand-orange' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${p.color}`}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-900 truncate">{p.label}</p>
                          {p.user.isPremium && <span className="text-[8px] bg-yellow-400 text-yellow-900 px-1 rounded font-black">PRO</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{p.desc}</p>
                      </div>
                      {isCurrent && <span className="text-[10px] bg-brand-orange text-white px-1.5 py-0.5 rounded-full font-bold">ACTUAL</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-2.5 bg-gray-50 text-[10px] text-gray-400 text-center flex-shrink-0">
            Click → cambias de rol al instante
          </div>
        </div>
      )}
    </>
  );
};

export default DevRoleSwitcher;
