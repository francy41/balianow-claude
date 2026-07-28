/**
 * ResetPasswordPage — Shown after user clicks the reset-password link in their email.
 * Supabase sets a temporary session (PASSWORD_RECOVERY event), so we can call updateUser.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useUIStore } from '../store/appStore';
import { supabaseUpdatePassword } from '../hooks/useSupabaseAuth';
import { supabase } from '../lib/supabase';

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [hasSession, setHasSession]   = useState(false);
  const [checking, setChecking]       = useState(true);

  // Detect Supabase recovery token from URL hash or existing session
  useEffect(() => {
    // Check URL hash for type=recovery (Supabase puts tokens in hash)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (type === 'recovery' && accessToken) {
      // Manually set session from hash tokens so Supabase can process the recovery
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
        .then(({ error }) => {
          if (!error) setHasSession(true);
        })
        .finally(() => setChecking(false));
      return;
    }

    // Also handle PKCE flow (code in query params)
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (!error) setHasSession(true);
        })
        .finally(() => setChecking(false));
      return;
    }

    // Fallback: check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setHasSession(true); setChecking(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!PASSWORD_RE.test(password)) {
      addToast({ message: 'La contraseña debe tener al menos 8 caracteres, una letra y un número', type: 'error' });
      return;
    }
    if (password !== confirm) {
      addToast({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    setLoading(true);
    const result = await supabaseUpdatePassword(password);
    setLoading(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    } else {
      addToast({ message: result.error ?? 'No se pudo actualizar la contraseña. El enlace puede haber expirado.', type: 'error' });
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🔐</div>
          <p className="text-gray-400 text-sm">Verificando enlace…</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enlace inválido o expirado</h2>
          <p className="text-gray-400 text-sm mb-6">
            Este enlace de recuperación ya no es válido. Solicita uno nuevo desde la página de inicio de sesión.
          </p>
          <button onClick={() => navigate('/auth')}
            className="bg-brand-orange text-white font-bold px-6 py-3 rounded-xl text-sm">
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-100 dark:bg-pink-950/20 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🎵</span>
          <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white mt-3">
            Nueva <span className="text-brand-orange">contraseña</span>
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-card-hover border border-gray-100 dark:border-gray-800">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">¡Contraseña actualizada!</h3>
              <p className="text-gray-400 text-sm">Redirigiendo a tu cuenta…</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-black text-gray-900 dark:text-white text-lg mb-1">Crea una nueva contraseña</h2>
                <p className="text-gray-400 text-sm">Elige una contraseña segura para tu cuenta de BailaNow.</p>
              </div>

              <div className="relative">
                <Input label="Nueva contraseña" type={showPass ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres" value={password}
                  onChange={e => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} />
                <button onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength */}
              {password.length > 0 && (
                <div className="space-y-1 -mt-2">
                  {[
                    { ok: password.length >= 8, label: 'Mínimo 8 caracteres' },
                    { ok: /[A-Za-z]/.test(password), label: 'Al menos una letra' },
                    { ok: /\d/.test(password), label: 'Al menos un número' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${r.ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                      <span className={`text-[10px] ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Input label="Repetir contraseña" type={showConfirm ? 'text' : 'password'}
                  placeholder="Repite tu nueva contraseña" value={confirm}
                  onChange={e => setConfirm(e.target.value)} icon={<Lock className="w-4 h-4" />} />
                <button onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirm.length > 0 && password !== confirm && (
                <p className="text-red-500 text-xs -mt-2">Las contraseñas no coinciden</p>
              )}

              <Button variant="orange" className="w-full" loading={loading} onClick={handleReset}
                disabled={!PASSWORD_RE.test(password) || password !== confirm}>
                Guardar nueva contraseña
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
