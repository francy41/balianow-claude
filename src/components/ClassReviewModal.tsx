/**
 * ClassReviewModal — Modal para que el estudiante valore una clase
 * Aparece automáticamente cuando ve una clase pasada sin valorar
 */
import React, { useState } from 'react';
import { Star, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

interface Props {
  open: boolean;
  booking: {
    id: string;
    student_id: string;
    vendor_id: string;
    offering_id: string;
    offering?: { title?: string };
  };
  onClose: () => void;
  onSubmitted?: () => void;
}

const ClassReviewModal: React.FC<Props> = ({ open, booking, onClose, onSubmitted }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (rating === 0) { addToast({ message: '⚠ Elige al menos 1 estrella', type: 'error' }); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sin sesión');
      const { error } = await supabase.from('class_reviews').insert({
        booking_id: booking.id,
        student_id: session.user.id,
        vendor_id: booking.vendor_id,
        offering_id: booking.offering_id,
        rating, comment: comment.trim() || null,
      });
      if (error) throw error;
      addToast({ message: '⭐ ¡Gracias por tu valoración!', type: 'success' });
      onSubmitted?.();
      onClose();
    } catch (e: any) {
      addToast({ message: `❌ ${e.message}`, type: 'error' });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 text-white p-5 text-center">
          <div className="text-5xl mb-2">⭐</div>
          <h2 className="font-black text-xl">¿Cómo fue tu clase?</h2>
          <p className="text-white/90 text-sm mt-1 line-clamp-1">{booking.offering?.title || 'Tu reserva'}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Stars */}
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map(n => {
              const active = (hover || rating) >= n;
              return (
                <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
                  className="transition-transform active:scale-90 hover:scale-110">
                  <Star className={`w-12 h-12 ${active ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`} />
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-bold text-gray-700 dark:text-gray-300">
              {rating === 5 ? '🤩 ¡Espectacular!' : rating === 4 ? '😊 Muy bien' : rating === 3 ? '👍 Bien' : rating === 2 ? '😐 Mejorable' : '😞 Mal'}
            </p>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Comentario (opcional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={300}
              placeholder="¿Qué te gustó? ¿Recomendarías al profesor?"
              className="w-full mt-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none" />
            <p className="text-[10px] text-gray-400 text-right mt-1">{comment.length}/300</p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold py-2.5 rounded-xl text-sm">
              Cerrar
            </button>
            <button onClick={submit} disabled={saving || rating === 0}
              className="flex-1 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black py-2.5 rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassReviewModal;
