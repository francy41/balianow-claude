import React, { useState, useEffect } from 'react';
import { Flag, X, CheckCircle, Loader2, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';

type TargetTable = 'artists' | 'events' | 'venues' | 'services';

interface Props {
  targetTable: TargetTable;
  targetId: string;
  targetName: string;
  /** Si ya tiene dueño, no mostramos el botón */
  hasOwner?: boolean;
  /** Ocupa todo el ancho (para tarjetas del listado) */
  fullWidth?: boolean;
}

const TABLE_LABEL: Record<TargetTable, string> = {
  artists: 'artista / bailarín',
  events: 'evento',
  venues: 'local',
  services: 'servicio',
};

const ClaimProfileButton: React.FC<Props> = ({ targetTable, targetId, targetName, hasOwner, fullWidth }) => {
  const { addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Al abrir, si hay sesión, prellenar con el email de la cuenta
  useEffect(() => {
    if (!open) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(prev => prev || session.user.email!);
    });
  }, [open]);

  if (hasOwner) return null;

  const submit = async () => {
    if (!email.trim()) {
      addToast({ type: 'warning', message: 'Por favor ingresa tu correo.' });
      return;
    }

    setSubmitting(true);
    // Si el usuario está logueado, vinculamos la reclamación a su cuenta (claimant_id).
    // Así, al aprobarla el admin, la propiedad del perfil se asigna automáticamente.
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('profile_claims').insert({
      claimant_id: session?.user?.id ?? null,
      claimant_email: email.trim(),
      target_table: targetTable,
      target_id: targetId,
      target_name: targetName,
      message: message.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        addToast({ type: 'warning', message: 'Ya existe una solicitud para este perfil con ese correo.' });
        return;
      }
      addToast({ type: 'error', message: `Error al enviar: ${error.message}` });
      return;
    }

    addToast({ type: 'success', message: '✅ Solicitud enviada. Recibirás un correo cuando sea aprobada.' });
    setSubmitted(true);
    setTimeout(() => setOpen(false), 2000);
  };


  return (
    <>
      <button
        onClick={() => { setOpen(true); setSubmitted(false); }}
        className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-fuchsia-500/40 hover:shadow-fuchsia-500/60 hover:scale-[1.03] active:scale-95 transition-all ${fullWidth ? 'w-full justify-center' : ''}`}
      >
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 ring-2 ring-white" />
        </span>
        <Flag className="w-3.5 h-3.5" /> ¿Es tu perfil? Reclamarlo
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 z-10">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-black text-xl text-gray-900 mb-2">¡Solicitud enviada!</h3>
                <p className="text-sm text-gray-600">Te notificaremos por correo cuando tu solicitud sea aprobada.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-6 w-full bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-black text-xl text-gray-900">Reclamar perfil</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Solicita ser reconocido como dueño de este {TABLE_LABEL[targetTable]}
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Perfil objetivo */}
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-5">
                  <p className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-1">Perfil a reclamar</p>
                  <p className="font-black text-gray-900">{targetName}</p>
                  <p className="text-xs text-gray-400">{TABLE_LABEL[targetTable]}</p>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tu correo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                {/* Mensaje opcional */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Información adicional <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Cuéntanos cómo verificar: redes sociales, email de contacto, etc."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full bg-brand-orange text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  El equipo revisará en 24–48h y te enviará un correo de verificación
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ClaimProfileButton;
