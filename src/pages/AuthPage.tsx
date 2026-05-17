import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, MapPin } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import type { UserRole } from '../store/appStore';
import { Button, Input } from '../components/ui';
import { supabaseLogin, supabaseRegister } from '../hooks/useSupabaseAuth';

const ROLES: { id: UserRole; label: string; icon: string; desc: string }[] = [
  { id: 'user',    label: 'Fanático / Asistente', icon: '🎉', desc: 'Descubre eventos y artistas' },
  { id: 'dj',      label: 'DJ',                   icon: '🎧', desc: 'Promociona tus sets y consigue bookings' },
  { id: 'dancer',  label: 'Bailarín/a',            icon: '💃', desc: 'Muestra tu arte y consigue shows' },
  { id: 'artist',  label: 'Artista / Banda',       icon: '🎺', desc: 'Publica tus servicios y actúa' },
  { id: 'venue',   label: 'Venue / Local',         icon: '🏛️', desc: 'Gestiona tu espacio y eventos' },
];

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get('tab') === 'register' ? 'register' : 'login';
  const initialRole = (params.get('role') as UserRole) || 'user';

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const { login, register, isLoading } = useAuthStore();
  const { addToast } = useUIStore();

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { addToast({ message: 'Completa todos los campos', type: 'error' }); return; }
    // Try Supabase first, fall back to demo login
    const supa = await supabaseLogin(loginEmail, loginPassword);
    if (supa.success) {
      addToast({ message: '¡Bienvenido de vuelta!', type: 'success' });
      navigate('/dashboard');
      return;
    }
    // Fallback to demo
    const ok = await login(loginEmail, loginPassword);
    if (ok) {
      addToast({ message: '¡Bienvenido! (modo demo)', type: 'success' });
      navigate('/dashboard');
    }
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPassword) { addToast({ message: 'Completa todos los campos requeridos', type: 'error' }); return; }
    // Try Supabase first
    const supa = await supabaseRegister(regEmail, regPassword, { name: regName, role: selectedRole, city: regCity || 'Madrid' });
    if (supa.success) {
      addToast({ message: '¡Cuenta creada! Revisa tu email para confirmar.', type: 'success' });
      navigate('/dashboard');
      return;
    }
    // Fallback to demo
    const ok = await register({ name: regName, email: regEmail, city: regCity || 'Madrid', role: selectedRole, password: regPassword });
    if (ok) {
      addToast({ message: '¡Cuenta creada! (modo demo)', type: 'success' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-50 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🎵</span>
          <h1 className="font-display font-black text-3xl text-gray-900 mt-3">
            ¡Ritmo <span className="text-brand-orange">Latino!</span>
          </h1>
          <p className="text-gray-400 mt-1">El ecosistema latino #1</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-card-hover border border-gray-100">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white text-brand-orange shadow-card' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <div className="space-y-4">
              <Input label="Email" type="email" placeholder="tu@email.com"
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />} />
              <div className="relative">
                <Input label="Contraseña" type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />} />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button variant="orange" className="w-full" loading={isLoading} onClick={handleLogin}>
                Entrar
              </Button>

              <div className="text-center">
                <button className="text-brand-orange text-xs hover:text-brand-orange-dark">¿Olvidaste tu contraseña?</button>
              </div>

              {/* Quick access buttons */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <p className="text-gray-400 text-xs font-semibold text-center py-2 bg-gray-50 border-b border-gray-100">
                  ⚡ Acceso rápido
                </p>
                <button
                  onClick={async () => {
                    setLoginEmail('solfamende41@gmail.com');
                    setLoginPassword('Solfa11111111@');
                    const ok = await login('solfamende41@gmail.com', 'Solfa11111111@');
                    if (ok) { addToast({ message: '¡Bienvenida, Super Admin!', type: 'success' }); navigate('/admin'); }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black">SM</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-gray-800 text-xs font-bold">Solfa Mende — Super Admin</p>
                    <p className="text-gray-400 text-[10px]">Click aquí para entrar directo al panel admin</p>
                  </div>
                  <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
                </button>
                <button
                  onClick={() => { setLoginEmail('dj@bachasalseros.com'); setLoginPassword('demo'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black">DJ</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-gray-800 text-xs font-bold">DJ Mambo King — Artista</p>
                    <p className="text-gray-400 text-[10px]">dj@bachasalseros.com</p>
                  </div>
                  <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold">DJ</span>
                </button>
                <button
                  onClick={() => { setLoginEmail('carlos@bachasalseros.com'); setLoginPassword('demo'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black">CR</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-gray-800 text-xs font-bold">Carlos Rodríguez — Fan</p>
                    <p className="text-gray-400 text-[10px]">carlos@bachasalseros.com</p>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">FAN</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-gray-600 text-sm font-medium block mb-2">¿Quién eres?</label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${
                        selectedRole === role.id
                          ? 'border-brand-orange bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-brand-orange/50'
                      }`}
                    >
                      <span className="text-2xl">{role.icon}</span>
                      <div className="flex-1">
                        <p className="text-gray-800 font-semibold text-sm">{role.label}</p>
                        <p className="text-gray-400 text-xs">{role.desc}</p>
                      </div>
                      {selectedRole === role.id && (
                        <span className="text-brand-orange font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Nombre completo *" type="text" placeholder="Tu nombre"
                value={regName} onChange={e => setRegName(e.target.value)} icon={<User className="w-4 h-4" />} />
              <Input label="Email *" type="email" placeholder="tu@email.com"
                value={regEmail} onChange={e => setRegEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} />
              <Input label="Ciudad" type="text" placeholder="Madrid, Barcelona..."
                value={regCity} onChange={e => setRegCity(e.target.value)} icon={<MapPin className="w-4 h-4" />} />

              <div className="relative">
                <Input label="Contraseña *" type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres" value={regPassword}
                  onChange={e => setRegPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button variant="orange" className="w-full" loading={isLoading} onClick={handleRegister}>
                Crear Cuenta Gratis
              </Button>

              <p className="text-gray-400 text-xs text-center">
                Al registrarte aceptas nuestros Términos de Servicio y Política de Privacidad
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-300 text-xs">Próximamente: Entrar con Google · Apple · Facebook</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
