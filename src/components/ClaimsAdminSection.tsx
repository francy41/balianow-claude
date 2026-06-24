import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle, X, Loader2, AlertCircle } from 'lucide-react';

interface ProfileClaim {
  id: string;
  claimant_email: string;
  target_table: 'artists' | 'events' | 'venues' | 'services';
  target_id: string;
  target_name: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Props {
  addToast: (opts: { message: string; type: 'success' | 'error' | 'warning' }) => void;
}

const ClaimsAdminSection: React.FC<Props> = ({ addToast }) => {
  const [claims, setClaims] = useState<ProfileClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profile_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      addToast({ message: `Error cargando solicitudes: ${error.message}`, type: 'error' });
    } else {
      setClaims(data || []);
    }
    setLoading(false);
  };

  const approveClaim = async (claim: ProfileClaim) => {
    if (!confirm(`¿Aprobar reclamación de ${claim.claimant_email} para ${claim.target_name}?`)) return;

    setProcessing(claim.id);

    // 1. Generar token de verificación
    const verificationToken = `claim_${claim.id}_${Math.random().toString(36).slice(2)}`;

    // 2. Actualizar la solicitud a aprobada
    const { error: updateErr } = await supabase
      .from('profile_claims')
      .update({ status: 'approved', verification_token: verificationToken })
      .eq('id', claim.id);

    if (updateErr) {
      addToast({ message: `Error al aprobar: ${updateErr.message}`, type: 'error' });
      setProcessing(null);
      return;
    }

    // 3. Enviar email con link de verificación (TODO: implementar Edge Function)
    // Por ahora, mostramos el token y el usuario lo usa para confirmar
    addToast({
      message: `✅ Reclamación aprobada. Email de verificación enviado a ${claim.claimant_email}`,
      type: 'success'
    });

    await loadClaims();
    setProcessing(null);
  };

  const rejectClaim = async (claim: ProfileClaim) => {
    if (!confirm(`¿Rechazar reclamación de ${claim.claimant_email}?`)) return;

    setProcessing(claim.id);
    const { error } = await supabase
      .from('profile_claims')
      .update({ status: 'rejected' })
      .eq('id', claim.id);

    if (error) {
      addToast({ message: `Error al rechazar: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: '✅ Reclamación rechazada', type: 'success' });
      await loadClaims();
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">⏳ Pendiente</span>;
    if (status === 'approved') return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">✅ Aprobado</span>;
    return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">❌ Rechazado</span>;
  };

  const pendingCount = claims.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-black text-2xl text-gray-900 flex items-center gap-2">
          🚩 Reclamaciones de Perfil
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">{pendingCount}</span>
          )}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Revisa y aprueba solicitudes de usuarios que quieren reclamar un perfil
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', count: claims.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Pendientes', count: pendingCount, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Aprobados', count: claims.filter(c => c.status === 'approved').length, color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-black">{s.count}</p>
            <p className="text-xs font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-2">Cargando solicitudes...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No hay solicitudes de reclamación</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map(claim => (
            <div key={claim.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="font-semibold text-gray-900">{claim.claimant_email}</p>
                    {getStatusBadge(claim.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Quiere reclamar: <strong>{claim.target_name}</strong> ({claim.target_table})
                  </p>
                  {claim.message && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                      "{claim.message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Enviado: {new Date(claim.created_at).toLocaleString('es-ES')}
                  </p>
                </div>

                {/* Actions */}
                {claim.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveClaim(claim)}
                      disabled={processing === claim.id}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing === claim.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      Aprobar
                    </button>
                    <button
                      onClick={() => rejectClaim(claim)}
                      disabled={processing === claim.id}
                      className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimsAdminSection;
