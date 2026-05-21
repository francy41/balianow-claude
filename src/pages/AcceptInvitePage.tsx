import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

type Status = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'accepting' | 'success' | 'error';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  used_at: string | null;
}

const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<Status>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');

  // Verify the token on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    setStatus('loading');
    const { data, error } = await supabase
      .from('admin_invitations')
      .select('id, email, role, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) { setStatus('invalid'); return; }
    if (data.used_at) { setStatus('used'); return; }
    if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return; }
    setInvitation(data);
    setStatus('valid');
  };

  const handleAccept = async () => {
    if (!isAuthenticated || !user || !invitation) return;

    // Make sure the logged-in email matches the invitation
    if (user.email !== invitation.email) {
      setError(`Esta invitación es para ${invitation.email}. Estás conectado como ${user.email}.`);
      return;
    }

    setStatus('accepting');
    try {
      // Update profile role
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: invitation.role, is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      // Mark invitation as used
      await supabase
        .from('admin_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      setStatus('success');
      setTimeout(() => navigate('/admin'), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Error al aceptar la invitación');
      setStatus('error');
    }
  };

  const roleLabel = invitation?.role === 'superadmin' ? 'Super Administrador' : 'Administrador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 shadow-lg mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-black text-2xl text-gray-900">BailaNow</h1>
          <p className="text-gray-400 text-sm">Invitación de Administrador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">

          {/* LOADING */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Verificando invitación...</p>
            </div>
          )}

          {/* VALID - ready to accept */}
          {status === 'valid' && invitation && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pink-50 mb-3">
                  <Shield className="w-7 h-7 text-brand-orange" />
                </div>
                <h2 className="font-bold text-xl text-gray-900 mb-1">¡Invitación válida!</h2>
                <p className="text-gray-500 text-sm">
                  Has sido invitado como <strong className="text-brand-orange">{roleLabel}</strong>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email de invitación</span>
                  <span className="text-gray-900 font-medium">{invitation.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rol asignado</span>
                  <span className="text-brand-orange font-semibold">{roleLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Caduca</span>
                  <span className="text-gray-600">{new Date(invitation.expires_at).toLocaleString('es-ES')}</span>
                </div>
              </div>

              {!isAuthenticated ? (
                <div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-sm text-yellow-800">
                    <strong>⚠️ Debes iniciar sesión</strong> con la cuenta <strong>{invitation.email}</strong> para aceptar esta invitación.
                  </div>
                  <button
                    onClick={() => navigate(`/auth?redirect=/aceptar-invitacion?token=${token}`)}
                    className="w-full btn-orange flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4" /> Iniciar sesión para continuar
                  </button>
                </div>
              ) : user?.email !== invitation.email ? (
                <div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-800">
                    ❌ Esta invitación es para <strong>{invitation.email}</strong>.<br />
                    Actualmente estás conectado como <strong>{user?.email}</strong>.
                  </div>
                  <button
                    onClick={() => navigate('/auth')}
                    className="w-full btn-outline text-sm">
                    Cambiar cuenta
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAccept}
                  className="w-full btn-orange flex items-center justify-center gap-2 text-base font-bold">
                  <CheckCircle className="w-5 h-5" /> Aceptar y convertirme en {roleLabel}
                </button>
              )}
            </div>
          )}

          {/* ACCEPTING */}
          {status === 'accepting' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Activando permisos de administrador...</p>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="font-bold text-xl text-gray-900 mb-2">¡Bienvenido al equipo! 🎉</h2>
              <p className="text-gray-500 text-sm mb-6">
                Eres {roleLabel} de BailaNow. Redirigiendo al panel de control...
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-brand-orange h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* INVALID */}
          {(status === 'invalid' || status === 'error') && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="font-bold text-lg text-gray-900 mb-2">
                {status === 'invalid' ? 'Enlace inválido' : 'Error'}
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                {status === 'invalid'
                  ? 'Este enlace de invitación no existe o es incorrecto.'
                  : error}
              </p>
              <button onClick={() => navigate('/')} className="btn-outline text-sm mt-4">
                Volver al inicio
              </button>
            </div>
          )}

          {/* EXPIRED */}
          {status === 'expired' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-yellow-500" />
              </div>
              <h2 className="font-bold text-lg text-gray-900 mb-2">Invitación caducada</h2>
              <p className="text-gray-500 text-sm">Este enlace ha expirado (válido 48h). Pide que te envíen una nueva invitación.</p>
              <button onClick={() => navigate('/')} className="btn-outline text-sm mt-4">
                Volver al inicio
              </button>
            </div>
          )}

          {/* USED */}
          {status === 'used' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-blue-500" />
              </div>
              <h2 className="font-bold text-lg text-gray-900 mb-2">Invitación ya usada</h2>
              <p className="text-gray-500 text-sm">Esta invitación ya fue aceptada anteriormente.</p>
              <button onClick={() => navigate('/admin')} className="btn-orange text-sm mt-4">
                Ir al panel Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
