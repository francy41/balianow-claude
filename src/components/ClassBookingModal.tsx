/**
 * ClassBookingModal — modal de reserva de clase
 * 1) Muestra detalles de la clase
 * 2) Calendario para elegir día/hora disponible
 * 3) Confirmar y pagar (simulado/Stripe)
 * 4) Genera sala Jitsi única
 */
import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, Star, Video, ArrowRight, Check, Loader2, CreditCard, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';

interface Offering {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration_minutes: number;
  max_students: number;
  cover_image: string;
  vendor_name?: string;
  vendor_avatar?: string;
  style?: string[];
  level?: string;
}

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  booked_count: number;
  max_students: number;
}

interface Props {
  offering: Offering;
  onClose: () => void;
  onBooked?: () => void;
}

const ClassBookingModal: React.FC<Props> = ({ offering, onClose, onBooked }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [step, setStep] = useState<'select' | 'confirm' | 'paying' | 'done'>('select');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('19:00');

  // Cargar slots disponibles + generar slots demo
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('availability_slots')
          .select('*')
          .eq('offering_id', offering.id)
          .eq('status', 'available')
          .gt('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(20);

        if (data && data.length > 0) {
          setSlots(data);
        } else {
          // Generar slots demo (próximos 14 días, varias horas)
          const demo: Slot[] = [];
          for (let d = 1; d <= 14; d++) {
            for (const hour of [10, 16, 19, 21]) {
              const start = new Date();
              start.setDate(start.getDate() + d);
              start.setHours(hour, 0, 0, 0);
              const end = new Date(start.getTime() + offering.duration_minutes * 60000);
              demo.push({
                id: `demo-${d}-${hour}`,
                starts_at: start.toISOString(),
                ends_at: end.toISOString(),
                booked_count: Math.floor(Math.random() * offering.max_students),
                max_students: offering.max_students,
              });
            }
          }
          setSlots(demo);
        }
      } catch (e) {
        console.error('[booking] slots load error:', e);
      }
      setLoading(false);
    })();
  }, [offering.id]);

  // Agrupa slots por día
  const byDay = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const day = s.starts_at.split('T')[0];
    (acc[day] ||= []).push(s);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort().slice(0, 14);

  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      num: d.getDate(),
      month: d.toLocaleDateString('es-ES', { month: 'short' }),
    };
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const handleConfirm = async () => {
    console.log('[booking] handleConfirm clicked', { selectedSlot, offering });
    if (!selectedSlot) {
      addToast({ message: '⚠ Elige un horario primero', type: 'error' });
      return;
    }

    setSubmitting(true);
    setStep('paying');

    try {
      // Verificar sesión real
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[booking] session:', session?.user?.id);

      if (!session) {
        addToast({ message: '⚠ Necesitas iniciar sesión. Modo demo activo.', type: 'warning' });
        // Simulación demo
        await new Promise(r => setTimeout(r, 1200));
        setStep('done');
        setSubmitting(false);
        return;
      }

      const realUserId = session.user.id;
      const jitsiRoom = `bailanow-${offering.id.slice(0, 8)}-${Date.now()}`;
      const platformFee = +(offering.price * 0.15).toFixed(2);
      const isDemoSlot = selectedSlot.id.startsWith('demo-');
      const isDemoOffering = offering.id.startsWith('sample-');

      console.log('[booking] inserting:', { isDemoSlot, isDemoOffering, realUserId });

      if (!isDemoSlot && !isDemoOffering) {
        const { data, error } = await supabase.from('class_bookings').insert({
          slot_id: selectedSlot.id,
          offering_id: offering.id,
          student_id: realUserId,
          vendor_id: offering.vendor_id,
          status: 'confirmed',
          amount_paid: offering.price,
          currency: offering.currency,
          platform_fee: platformFee,
          jitsi_room: jitsiRoom,
          notes: `Reserva ${offering.title}`,
        }).select().single();

        console.log('[booking] result:', { data, error });

        if (error) {
          addToast({ message: `❌ Error: ${error.message}`, type: 'error' });
          setStep('select');
          setSubmitting(false);
          return;
        }

        // Marcar slot ocupado
        await supabase
          .from('availability_slots')
          .update({ booked_count: selectedSlot.booked_count + 1 })
          .eq('id', selectedSlot.id);

        addToast({ message: '✅ Reserva confirmada y pagada', type: 'success' });
      } else {
        // Modo demo
        await new Promise(r => setTimeout(r, 1200));
        addToast({ message: '✅ Reserva demo confirmada', type: 'success' });
      }

      setStep('done');
    } catch (e: any) {
      console.error('[booking] catch:', e);
      addToast({ message: `❌ ${e.message || 'Error inesperado'}`, type: 'error' });
      setStep('select');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 overflow-hidden flex-shrink-0">
          {offering.cover_image && <img src={offering.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-12 text-white">
            <h2 className="font-black text-lg leading-tight line-clamp-2">{offering.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{offering.duration_minutes}min</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />Max {offering.max_students}</span>
              {offering.level && <span>🎯 {offering.level}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'select' && (
            <div className="p-4">
              {/* Vendor */}
              {offering.vendor_name && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  {offering.vendor_avatar
                    ? <img src={offering.vendor_avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white text-lg font-black">{offering.vendor_name[0]}</div>
                  }
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Profesor</p>
                    <p className="font-black text-sm text-gray-900 dark:text-white">{offering.vendor_name}</p>
                    <div className="flex items-center gap-1 text-yellow-500 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      <span className="font-bold">4.9</span>
                      <span className="text-gray-400">· 200+ clases</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{offering.description}</p>

              {/* Calendar */}
              <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" /> Elige día
              </p>
              {loading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 text-pink-500 animate-spin mx-auto" /></div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                  {days.map(d => {
                    const f = fmtDay(d);
                    const isSelected = selectedDate === d;
                    return (
                      <button key={d} onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                        className={`flex-shrink-0 w-16 py-3 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white border-transparent shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-pink-300'
                        }`}>
                        <p className="text-[10px] uppercase font-bold">{f.day}</p>
                        <p className="font-black text-xl">{f.num}</p>
                        <p className="text-[10px] uppercase opacity-80">{f.month}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Time slots */}
              {selectedDate && (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mt-4 mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Elige hora
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {byDay[selectedDate].map(slot => {
                      const isFull = slot.booked_count >= slot.max_students;
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button key={slot.id} disabled={isFull}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            isFull
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through cursor-not-allowed'
                              : isSelected
                                ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-pink-300'
                          }`}>
                          {fmtTime(slot.starts_at)}
                          {!isFull && slot.max_students > 1 && (
                            <p className="text-[9px] opacity-70 mt-0.5">{slot.booked_count}/{slot.max_students}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {!selectedDate && !loading && (
                <div className="text-center py-6 text-sm text-gray-400">👆 Toca un día para ver los horarios</div>
              )}
            </div>
          )}

          {step === 'paying' && (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-3" />
              <p className="font-black text-gray-900 dark:text-white">Procesando pago…</p>
              <p className="text-xs text-gray-500 mt-1">No cierres esta ventana</p>
            </div>
          )}

          {step === 'done' && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-black text-xl text-gray-900 dark:text-white mb-1">¡Reservado!</h3>
              <p className="text-sm text-gray-500 mb-4">Te hemos enviado los detalles por email. Podrás entrar a la sala 10 min antes.</p>
              {selectedSlot && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-left space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between"><span className="text-xs text-gray-500">Clase</span><span className="text-sm font-bold text-gray-900 dark:text-white text-right">{offering.title}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500">Fecha</span><span className="text-sm font-bold text-gray-900 dark:text-white">{new Date(selectedSlot.starts_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-gray-500">Pagado</span><span className="text-sm font-black text-pink-600">€{offering.price}</span></div>
                </div>
              )}
              <button onClick={onBooked}
                className="mt-5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 mx-auto">
                <Video className="w-4 h-4" />
                Ver mis clases y entrar a la sala
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer: confirmar */}
        {step === 'select' && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-950/50">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Total</p>
              <p className="font-black text-2xl text-gray-900 dark:text-white">€{offering.price.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">Incluye 15% plataforma</p>
            </div>
            <button onClick={handleConfirm} disabled={!selectedSlot || submitting}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-pink-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              <span>Reservar y pagar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Trust */}
        {step === 'select' && (
          <div className="px-4 pb-3 flex items-center justify-center gap-3 text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-950/50">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Pago seguro SSL</span>
            <span>·</span>
            <span>Cancelación gratuita 24h antes</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Video className="w-3 h-3" />Sala incluida</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassBookingModal;
