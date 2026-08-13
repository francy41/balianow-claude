import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { LifeBuoy, MessageCircle, Phone, Send, Loader2, CheckCircle, HelpCircle } from 'lucide-react';
import CallBookingModal from './CallBookingModal';

const FAQS = [
  { q: '¿Cómo edito mi perfil público?', a: 'Entra a tu Dashboard → botón "Editar perfil" arriba, o desde tu perfil público → "Editar perfil" (solo lo ves tú).' },
  { q: '¿Cómo recibo el pago de mis ventas/reservas?', a: 'Configura tu método de cobro en Dashboard → Cobrar. Los pagos quedan disponibles según la comisión de la plataforma.' },
  { q: '¿Cómo activo las reservas en mi local?', a: 'Si tu perfil es un local, ve a Dashboard → Reservas y configura horarios y productos.' },
  { q: '¿Puedo comprar flyers o vídeos para promocionarme?', a: 'Sí, en Dashboard → Comprar servicios tienes flyers, edición de vídeo y campañas publicitarias.' },
];

const SupportTab: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [chatWidgetReady, setChatWidgetReady] = useState(false);

  useEffect(() => {
    supabase.from('site_config').select('value').eq('key', 'ghl_chat_widget_id').maybeSingle().then(({ data }) => {
      const id = data?.value?.id || data?.value;
      setChatWidgetReady(typeof id === 'string' && id.trim().length > 5);
    }, () => {});
  }, []);

  const send = async () => {
    if (!message.trim()) { addToast({ message: 'Escribe tu mensaje', type: 'error' }); return; }
    setSending(true);
    const { error } = await supabase.from('service_orders').insert({
      buyer_id: user?.id, service_name: 'Soporte', price: 0, currency: 'EUR',
      status: 'pending', payment_status: 'unpaid', request_description: message.trim(),
    });
    setSending(false);
    if (error) { addToast({ message: `No se pudo enviar: ${error.message}`, type: 'error' }); return; }
    setSent(true);
    setMessage('');
  };

  const openChat = () => {
    const w = (window as any).leadConnectorChatWidget;
    if (w?.open) { w.open(); return; }
    addToast({ message: 'El chat en vivo no está disponible ahora mismo. Usa el formulario o reserva una llamada.', type: 'warning' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-brand-orange" /> Soporte</h2>
        <p className="text-gray-500 text-sm mt-1">¿Tienes dudas o un problema? Estamos aquí para ayudarte.</p>
      </div>

      {/* Vías de contacto rápido */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={openChat} className="card-white rounded-2xl p-5 text-left hover:shadow-md transition-shadow">
          <span className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 grid place-items-center text-2xl mb-2">💬</span>
          <p className="font-black text-gray-900 dark:text-white">Chat en vivo</p>
          <p className="text-gray-400 text-xs mt-1">{chatWidgetReady ? 'Habla ahora con nuestro equipo' : 'Próximamente'}</p>
        </button>
        <button onClick={() => setCallOpen(true)} className="card-white rounded-2xl p-5 text-left hover:shadow-md transition-shadow">
          <span className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-500/10 grid place-items-center text-2xl mb-2">📞</span>
          <p className="font-black text-gray-900 dark:text-white">Reservar llamada</p>
          <p className="text-gray-400 text-xs mt-1">Agenda una llamada con soporte</p>
        </button>
      </div>

      {/* Formulario de mensaje */}
      <div className="card-white rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> Envíanos un mensaje</h3>
        {sent ? (
          <div className="flex items-center gap-2 text-green-600 text-sm py-3"><CheckCircle className="w-5 h-5" /> Mensaje enviado. Te responderemos pronto.</div>
        ) : (
          <>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Cuéntanos tu duda o problema…"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent" />
            <button onClick={send} disabled={sending} className="btn-orange mt-3 px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
            </button>
          </>
        )}
      </div>

      {/* FAQs */}
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> Preguntas frecuentes</h3>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <details key={i} className="card-white rounded-xl p-3.5 group">
              <summary className="font-semibold text-gray-800 dark:text-gray-200 text-sm cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <p className="text-gray-500 text-sm mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <CallBookingModal open={callOpen} onClose={() => setCallOpen(false)} />
    </div>
  );
};

export default SupportTab;
