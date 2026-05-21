import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, MapPin, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import type { UserRole } from '../store/appStore';
import { Button, Input } from '../components/ui';
import {
  supabaseLogin,
  supabaseLoginWithGoogle,
  supabaseRegister,
  supabaseResetPassword,
  supabaseResendVerification,
} from '../hooks/useSupabaseAuth';

// ── Constants ────────────────────────────────────────────────────────────────
const ROLES: { id: UserRole; label: string; icon: string; desc: string; badge?: string }[] = [
  { id: 'user',    label: 'Fanático / Asistente', icon: '🎉', desc: 'Descubre eventos y artistas' },
  { id: 'dj',      label: 'DJ',                   icon: '🎧', desc: 'Promociona tus sets y consigue bookings' },
  { id: 'dancer',  label: 'Bailarín/a',            icon: '💃', desc: 'Muestra tu arte y consigue shows' },
  { id: 'artist',  label: 'Artista / Banda',       icon: '🎺', desc: 'Publica tus servicios y actúa' },
  { id: 'venue',   label: 'Venue / Local',         icon: '🏛️', desc: 'Gestiona tu espacio y eventos' },
  { id: 'vendor',  label: 'Vendedor',              icon: '🏪', desc: 'Vende servicios, cursos y productos latinos', badge: 'NUEVO' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const ALLOWED_ROLES: UserRole[] = ['user', 'dj', 'dancer', 'artist', 'venue', 'vendor'];

const CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga',
  'Zaragoza', 'Murcia', 'Palma', 'Las Palmas', 'Tenerife', 'Alicante',
  'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'A Coruña',
  'Vitoria', 'Oviedo', 'Pamplona', 'Santander', 'Almería', 'Burgos',
  'Miami', 'Nueva York', 'Los Ángeles', 'Ciudad de México', 'Bogotá',
  'Buenos Aires', 'Lima', 'Santiago', 'Caracas', 'La Habana',
  'Londres', 'París', 'Berlín', 'Ámsterdam', 'Bruselas',
];

// ── Google SVG Icon ──────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Divider ──────────────────────────────────────────────────────────────────
const OrDivider = () => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-gray-400 text-xs font-semibold">o continúa con email</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
type AuthView = 'login' | 'register' | 'forgot' | 'verify';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get('tab') === 'register' ? 'register' : 'login';
  const rawRole = params.get('role') as UserRole;
  const initialRole: UserRole = ALLOWED_ROLES.includes(rawRole) ? rawRole : 'user';

  // ── State ──────────────────────────────────────────────────
  const [view, setView] = useState<AuthView>(initialTab === 'register' ? 'register' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Pending verify email
  const [pendingEmail, setPendingEmail] = useState('');

  const { login, register, isLoading } = useAuthStore();
  const { addToast } = useUIStore();

  // ── Helpers ────────────────────────────────────────────────
  const goAfterLogin = () => {
    const redirect = params.get('redirect');
    navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Google OAuth ───────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await supabaseLoginWithGoogle();
    if (!result.success) {
      addToast({ message: result.error ?? 'Error al conectar con Google', type: 'error' });
      setGoogleLoading(false);
    }
    // On success the browser navigates away — no need to setGoogleLoading(false)
  };

  // ── Email login ────────────────────────────────────────────
  const handleLogin = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email || !loginPassword) { addToast({ message: 'Completa todos los campos', type: 'error' }); return; }
    if (!EMAIL_RE.test(email)) { addToast({ message: 'El email no es válido', type: 'error' }); return; }

    const supa = await supabaseLogin(email, loginPassword);
    if (supa.success) {
      addToast({ message: '¡Bienvenido de vuelta!', type: 'success' });
      const { user: loggedUser } = useAuthStore.getState();
      if (loggedUser?.role === 'admin' || loggedUser?.role === 'superadmin') {
        navigate('/admin');
      } else {
        goAfterLogin();
      }
      return;
    }
    if (supa.needsVerification) {
      setPendingEmail(email);
      setView('verify');
      return;
    }
    // Demo fallback (local dev / mock users)
    const ok = await login(email, loginPassword);
    if (ok) {
      addToast({ message: '¡Bienvenido!', type: 'success' });
      const { user: loggedUser } = useAuthStore.getState();
      if (loggedUser?.role === 'admin' || loggedUser?.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      addToast({ message: supa.error ?? 'Email o contraseña incorrectos', type: 'error' });
    }
  };

  // ── Register ───────────────────────────────────────────────
  const handleRegister = async () => {
    const email = regEmail.trim().toLowerCase();
    const name  = regName.trim().slice(0, 100);

    if (!name || !email || !regPassword) { addToast({ message: 'Completa todos los campos requeridos', type: 'error' }); return; }
    if (!EMAIL_RE.test(email)) { addToast({ message: 'El email no es válido', type: 'error' }); return; }
    if (!PASSWORD_RE.test(regPassword)) {
      addToast({ message: 'La contraseña debe tener al menos 8 caracteres, una letra y un número', type: 'error' });
      return;
    }
    if (!ALLOWED_ROLES.includes(selectedRole)) { addToast({ message: 'Tipo de cuenta no válido', type: 'error' }); return; }

    const supa = await supabaseRegister(email, regPassword, { name, role: selectedRole, city: regCity.trim() || 'Madrid' });
    if (supa.success) {
      if (supa.needsVerification) {
        setPendingEmail(email);
        setView('verify');
      } else {
        addToast({ message: '¡Cuenta creada! Revisa tu email.', type: 'success' });
        goAfterLogin();
      }
      return;
    }
    // Demo fallback
    const ok = await register({ name, email, city: regCity.trim() || 'Madrid', role: selectedRole, password: regPassword });
    if (ok) {
      addToast({ message: '¡Cuenta creada! (modo demo)', type: 'success' });
      navigate('/dashboard');
    }
  };

  // ── Forgot password ────────────────────────────────────────
  const handleForgot = async () => {
    const email = forgotEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { addToast({ message: 'Introduce un email válido', type: 'error' }); return; }
    const result = await supabaseResetPassword(email);
    if (result.success) {
      setForgotSent(true);
    } else {
      // Generic message — never confirm if account exists
      setForgotSent(true);
    }
  };

  // ── Resend verification ────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;
    setResendLoading(true);
    await supabaseResendVerification(pendingEmail);
    setResendLoading(false);
    startResendCooldown();
    addToast({ message: 'Correo reenviado. Revisa tu bandeja de entrada.', type: 'success' });
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 py-12">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-pink-100 dark:bg-pink-950/30 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🎵</span>
          <h1 className="font-display font-black text-3xl text-gray-900 dark:text-white mt-3">
            ¡Ritmo <span className="text-brand-orange">Latino!</span>
          </h1>
          <p className="text-gray-400 mt-1">El ecosistema latino #1</p>
        </div>

        {/* ── VERIFY EMAIL VIEW ── */}
        {view === 'verify' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-card-hover border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-pink-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Verifica tu email</h2>
            <p className="text-gray-500 text-sm mb-1">Enviamos un enlace de confirmación a:</p>
            <p className="font-bold text-gray-800 dark:text-gray-200 mb-6 break-all">{pendingEmail}</p>
            <p className="text-gray-400 text-xs mb-6">
              Abre el correo y pulsa el enlace para activar tu cuenta. Si no lo encuentras, revisa la carpeta de spam.
            </p>
            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar correo'}
            </button>
            <button
              onClick={() => setView('login')}
              className="text-brand-orange text-sm font-semibold hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === 'forgot' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-card-hover border border-gray-100 dark:border-gray-800">
            <button onClick={() => setView('login')} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-5 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">¡Correo enviado!</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
                  Revisa también la carpeta de spam.
                </p>
                <button onClick={() => { setView('login'); setForgotSent(false); setForgotEmail(''); }}
                  className="text-brand-orange font-semibold text-sm hover:underline">
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-1">Recuperar contraseña</h3>
                <p className="text-gray-400 text-sm mb-5">Introduce tu email y te enviamos un enlace para crear una nueva contraseña.</p>
                <div className="space-y-4">
                  <Input label="Email" type="email" placeholder="tu@email.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />} />
                  <Button variant="orange" className="w-full" onClick={handleForgot}>
                    Enviar enlace
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LOGIN / REGISTER VIEW ── */}
        {(view === 'login' || view === 'register') && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-card-hover border border-gray-100 dark:border-gray-800">

            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
              {(['login', 'register'] as const).map(t => (
                <button key={t} onClick={() => setView(t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    view === t
                      ? 'bg-white dark:bg-gray-700 text-brand-orange shadow-card'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  {t === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </button>
              ))}
            </div>

            {/* ── Google button — always visible ── */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 transition-all font-semibold text-gray-700 dark:text-gray-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {googleLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <GoogleIcon />
              )}
              {view === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}
            </button>

            <OrDivider />

            {/* ── LOGIN FORM ── */}
            {view === 'login' && (
              <div className="space-y-4">
                <Input label="Email" type="email" placeholder="tu@email.com"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />} />

                <div className="relative">
                  <Input label="Contraseña" type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña" value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button variant="orange" className="w-full" loading={isLoading} onClick={handleLogin}>
                  Entrar
                </Button>

                <div className="text-center">
                  <button onClick={() => setView('forgot')}
                    className="text-brand-orange text-xs hover:underline font-semibold">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Demo accounts — development only */}
                {import.meta.env.DEV && (
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <p className="text-gray-400 text-xs font-semibold text-center py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      ⚡ Demo (solo en desarrollo)
                    </p>
                    {[
                      { email: 'dj@bachasalseros.com', label: 'DJ Mambo King', role: 'DJ', color: 'bg-pink-500' },
                      { email: 'carlos@bachasalseros.com', label: 'Carlos Rodríguez', role: 'FAN', color: 'bg-purple-500' },
                    ].map((d, i) => (
                      <button key={d.email}
                        onClick={() => { setLoginEmail(d.email); setLoginPassword('demo'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i === 0 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                        <div className={`w-8 h-8 rounded-full ${d.color} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-black">{d.role.slice(0,2)}</span>
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-gray-800 dark:text-gray-200 text-xs font-bold">{d.label}</p>
                          <p className="text-gray-400 text-[10px]">contraseña: demo</p>
                        </div>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">{d.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {view === 'register' && (
              <div className="space-y-4">
                {/* Role picker */}
                <div>
                  <label className="text-gray-600 dark:text-gray-400 text-sm font-medium block mb-2">¿Quién eres?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ROLES.map(role => (
                      <button key={role.id} onClick={() => setSelectedRole(role.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left border ${
                          selectedRole === role.id
                            ? 'border-brand-orange bg-pink-50 dark:bg-pink-950/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-orange/50'
                        }`}>
                        <span className="text-2xl">{role.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm">{role.label}</p>
                            {role.badge && (
                              <span className="text-[9px] font-black bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-1.5 py-0.5 rounded-full">
                                {role.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-xs">{role.desc}</p>
                        </div>
                        {selectedRole === role.id && <span className="text-brand-orange font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Nombre completo *" type="text" placeholder="Tu nombre"
                  value={regName} onChange={e => setRegName(e.target.value)} icon={<User className="w-4 h-4" />} />
                <Input label="Email *" type="email" placeholder="tu@email.com"
                  value={regEmail} onChange={e => setRegEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} />
                {/* City combobox */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ciudad</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Escribe o selecciona tu ciudad..."
                      value={citySearch || regCity}
                      onFocus={() => { setCityOpen(true); setCitySearch(''); }}
                      onChange={e => { setCitySearch(e.target.value); setRegCity(e.target.value); setCityOpen(true); }}
                      onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  {cityOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {CITIES.filter(c => c.toLowerCase().includes((citySearch || regCity).toLowerCase()))
                        .map(city => (
                          <button
                            key={city}
                            type="button"
                            onMouseDown={() => { setRegCity(city); setCitySearch(''); setCityOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            {city}
                          </button>
                        ))}
                      {CITIES.filter(c => c.toLowerCase().includes((citySearch || regCity).toLowerCase())).length === 0 && (
                        <div className="px-4 py-2 text-xs text-gray-400">
                          Presiona Enter para usar "{citySearch || regCity}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Input label="Contraseña *" type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres, letras y números"
                    value={regPassword} onChange={e => setRegPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />} />
                  <button onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {regPassword.length > 0 && (
                  <div className="space-y-1 -mt-2">
                    {[
                      { ok: regPassword.length >= 8, label: 'Mínimo 8 caracteres' },
                      { ok: /[A-Za-z]/.test(regPassword), label: 'Al menos una letra' },
                      { ok: /\d/.test(regPassword), label: 'Al menos un número' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${r.ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                        <span className={`text-[10px] ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="orange" className="w-full" loading={isLoading} onClick={handleRegister}>
                  Crear Cuenta Gratis
                </Button>

                <p className="text-gray-400 dark:text-gray-500 text-xs text-center">
                  Al registrarte aceptas nuestros{' '}
                  <Link to="/legal/terminos" className="text-brand-orange hover:underline">Términos</Link>
                  {' '}y{' '}
                  <Link to="/legal/privacidad" className="text-brand-orange hover:underline">Privacidad</Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        {(view === 'login' || view === 'register') && (
          <p className="mt-4 text-center text-gray-400 dark:text-gray-600 text-xs">
            Tus datos están seguros · Nunca compartimos tu información
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
