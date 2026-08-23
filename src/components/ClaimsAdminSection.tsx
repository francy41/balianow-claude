import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Phone, User, LinkIcon, CheckCircle, X, Loader2, AlertCircle, HelpCircle } from 'lucide-react';

interface ProfileClaim {
  id: string;
  claimant_id: string | null;
  claimant_email: string;
  claimant_name?: string | null;
  claimant_phone?: string | null;
  relationship?: string | null;
  evidence_url?: string | null;
  target_table: 'artists' | 'events' | 'venues' | 'services';
  target_id: string;
  target_name: string;
  message?: string;
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  status: 'pending' | 'needs_info' | 'approved' | 'rejected';
  created_at: string;
}

const RELATIONSHIP_LABEL: Record<string, string> = {
  owner: 'Es su negocio / es él o ella',
  manager: 'Representante / mánager',
  employee: 'Trabaja ahí / con esta persona',
  other: 'Otro',
};

interface Props {
  addToast: (opts: { message: string; type: 'success' | 'error' | 'warning' }) => void;
}

const ClaimsAdminSection: React.FC<Props> = ({ addToast }) => {
  const [claims, setClaims] = useState<ProfileClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

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

  // Envía el email de resultado; si Resend no está configurado en el proyecto
  // (notConfigured), no rompe el flujo — el estado ya quedó guardado igual.
  const notifyClaimant = async (claim: ProfileClaim, type: 'claim_approved' | 'claim_rejected' | 'claim_needs_info', reason?: string) => {
    try {
      await supabase.functions.invoke('send-email', {
        body: { to: claim.claimant_email, type, data: { targetName: claim.target_name, reason } },
      });
    } catch (e) {
      console.warn('[claims] email notify failed', e);
    }
  };

  const approveClaim = async (claim: ProfileClaim) => {
    if (!claim.claimant_id) {
      addToast({ message: 'Esta solicitud no tiene una cuenta de BailaNow vinculada (se envió sin haber iniciado sesión) — pídele al usuario que se registre/inicie sesión con ese correo y vuelva a enviar la solicitud.', type: 'warning' });
      return;
    }
    if (!confirm(`¿Aprobar reclamación de ${claim.claimant_email} para ${claim.target_name}? Esto le dará control total sobre "${claim.target_name}".`)) return;

    setProcessing(claim.id);

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Vincular de verdad el perfil al usuario que reclama — esto es lo que
    //    faltaba: antes solo se marcaba la solicitud como "approved" sin tocar
    //    la tabla del perfil, así que el usuario nunca quedaba como dueño real.
    const { error: ownerErr } = await supabase
      .from(claim.target_table)
      .update({ user_id: claim.claimant_id })
      .eq('id', claim.target_id);

    if (ownerErr) {
      addToast({ message: `Error al vincular el perfil: ${ownerErr.message}`, type: 'error' });
      setProcessing(null);
      return;
    }

    // 2. Marcar la solicitud como aprobada, con auditoría de quién y cuándo
    const { error: updateErr } = await supabase
      .from('profile_claims')
      .update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', claim.id);

    if (updateErr) {
      addToast({ message: `El perfil quedó vinculado, pero no se pudo actualizar el estado de la solicitud: ${updateErr.message}`, type: 'error' });
      setProcessing(null);
      return;
    }

    await notifyClaimant(claim, 'claim_approved');
    addToast({ message: `✅ Reclamación aprobada — "${claim.target_name}" ya pertenece a ${claim.claimant_email}`, type: 'success' });

    await loadClaims();
    setProcessing(null);
  };

  const rejectClaim = async (claim: ProfileClaim) => {
    const reason = noteDraft[claim.id]?.trim();
    if (!confirm(`¿Rechazar reclamación de ${claim.claimant_email}?`)) return;

    setProcessing(claim.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profile_claims')
      .update({ status: 'rejected', admin_note: reason || null, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', claim.id);

    if (error) {
      addToast({ message: `Error al rechazar: ${error.message}`, type: 'error' });
    } else {
      await notifyClaimant(claim, 'claim_rejected', reason);
      addToast({ message: '✅ Reclamación rechazada', type: 'success' });
      await loadClaims();
    }
    setProcessing(null);
  };

  const requestInfo = async (claim: ProfileClaim) => {
    const reason = noteDraft[claim.id]?.trim();
    if (!reason) {
      addToast({ message: 'Escribe qué información necesitas antes de pedirla.', type: 'warning' });
      return;
    }
    setProcessing(claim.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profile_claims')
      .update({ status: 'needs_info', admin_note: reason, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', claim.id);

    if (error) {
      addToast({ message: `Error: ${error.message}`, type: 'error' });
    } else {
      await notifyClaimant(claim, 'claim_needs_info', reason);
      addToast({ message: '✅ Se pidió más información al solicitante', type: 'success' });
      await loadClaims();
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">⏳ Pendiente</span>;
    if (status === 'needs_info') return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">✍️ Info pedida</span>;
    if (status === 'approved') return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">✅ Aprobado</span>;
    return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">❌ Rechazado</span>;
  };

  const pendingCount = claims.filter(c => c.status === 'pending' || c.status === 'needs_info').length;

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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', count: claims.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Pendientes', count: claims.filter(c => c.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Info pedida', count: claims.filter(c => c.status === 'needs_info').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
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
          {claims.map(claim => {
            const actionable = claim.status === 'pending' || claim.status === 'needs_info';
            return (
            <div key={claim.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="font-semibold text-gray-900">{claim.claimant_name || '(sin nombre)'}</p>
                    {getStatusBadge(claim.status)}
                    {!claim.claimant_id && (
                      <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-semibold" title="Se envió sin sesión iniciada — no se puede aprobar hasta que tenga cuenta">sin cuenta vinculada</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Quiere reclamar: <strong>{claim.target_name}</strong> ({claim.target_table})
                    {claim.relationship && <span className="text-gray-400"> · {RELATIONSHIP_LABEL[claim.relationship] || claim.relationship}</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mt-1">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {claim.claimant_email}</span>
                    {claim.claimant_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {claim.claimant_phone}</span>}
                    {claim.evidence_url && (
                      <a href={claim.evidence_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-pink-600 hover:underline">
                        <LinkIcon className="w-3 h-3" /> Ver evidencia
                      </a>
                    )}
                  </div>
                  {claim.message && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-2">
                      "{claim.message}"
                    </p>
                  )}
                  {claim.admin_note && (
                    <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                      <HelpCircle className="w-3 h-3 inline mr-1" /> {claim.admin_note}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Enviado: {new Date(claim.created_at).toLocaleString('es-ES')}
                    {claim.reviewed_at && <> · Revisado: {new Date(claim.reviewed_at).toLocaleString('es-ES')}</>}
                  </p>
                </div>

                {/* Actions */}
                {actionable && (
                  <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto sm:min-w-[220px]">
                    <textarea
                      value={noteDraft[claim.id] || ''}
                      onChange={e => setNoteDraft(prev => ({ ...prev, [claim.id]: e.target.value }))}
                      placeholder="Nota (motivo de rechazo o qué información falta)…"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveClaim(claim)}
                        disabled={processing === claim.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === claim.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => requestInfo(claim)}
                        disabled={processing === claim.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Pedir info
                      </button>
                      <button
                        onClick={() => rejectClaim(claim)}
                        disabled={processing === claim.id}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClaimsAdminSection;
