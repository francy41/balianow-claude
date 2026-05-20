/**
 * AuthCallbackPage — Landing page after OAuth (Google) redirect or email confirmation link.
 *
 * Supabase redirects here with a `code` query param (PKCE) or a hash token.
 * The Supabase JS client handles the exchange automatically via onAuthStateChange.
 * We just wait for the session to be ready and redirect.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/appStore';
import { supabase } from '../lib/supabase';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Supabase automatically exchanges the code/hash in the URL.
    // We subscribe to auth changes so we know when it's done.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Small delay to let the Zustand store update via useSupabaseAuthListener
        setTimeout(() => navigate('/dashboard', { replace: true }), 300);
      }
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked a reset-password link — send them to the reset form
        setTimeout(() => navigate('/auth/reset', { replace: true }), 300);
      }
    });

    // If session already set (e.g. email confirmation link followed)
    // check immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTimeout(() => navigate('/dashboard', { replace: true }), 500);
      }
    });

    // Detect error params from Supabase (e.g. expired link)
    const errorDesc = searchParams.get('error_description') || searchParams.get('error');
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
    }

    // Safety timeout: if nothing happens in 8s, redirect to auth
    const timeout = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enlace inválido o expirado</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl text-sm"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 animate-ping opacity-30" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/40">
            <span className="text-2xl">🎵</span>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">Verificando tu cuenta…</p>
        <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Un momento, por favor</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
