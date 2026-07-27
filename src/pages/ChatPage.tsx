import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Lock, Briefcase, Check, X, Shield } from 'lucide-react';
import { useChatStore, useAuthStore, useUIStore, SUPPORT_CONV_ID } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { conversations, activeConvId, setActiveConv } = useChatStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Interno</h2>
          <p className="text-gray-400 mb-6">Inicia sesión para acceder a tus mensajes</p>
          <button onClick={() => navigate('/auth')} className="btn-orange">Iniciar Sesión</button>
        </div>
      </div>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="h-[calc(100vh-56px)] flex bg-white">
      {/* Conversations list */}
      <div className={`${activeConvId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 flex-col border-r border-gray-100`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg text-gray-900">Mensajes</h2>
          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Solo comunicación interna
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Chat Soporte — siempre fijo arriba */}
          {(() => {
            const support = conversations.find(c => c.id === SUPPORT_CONV_ID);
            if (!support) return null;
            return (
              <button
                onClick={() => setActiveConv(support.id)}
                className={`w-full flex items-center gap-3 p-4 transition-colors text-left border-b border-gray-100 ${activeConvId === support.id ? 'bg-pink-50 border-r-2 border-brand-orange' : 'hover:bg-gray-50'}`}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-900 font-bold text-sm truncate">Soporte BailaNow</span>
                    <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">OFICIAL</span>
                  </div>
                  <p className="text-gray-400 text-xs truncate mt-0.5">{support.lastMessage}</p>
                </div>
              </button>
            );
          })()}

          {conversations.filter(c => c.id !== SUPPORT_CONV_ID).length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-400 text-sm">No tienes otros mensajes aún</p>
            </div>
          ) : (
            conversations.filter(c => c.id !== SUPPORT_CONV_ID).map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${activeConvId === conv.id ? 'bg-pink-50 border-r-2 border-brand-orange' : ''}`}
              >
                <Avatar src={conv.participantAvatar} name={conv.participantName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-semibold text-sm truncate">{conv.participantName}</span>
                    <span className="text-gray-300 text-xs flex-shrink-0">
                      {formatDistanceToNow(conv.lastMessageTime, { locale: es, addSuffix: false })}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-brand-orange rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${activeConvId ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
        {activeConvId === SUPPORT_CONV_ID ? (
          <SupportThread user={user} onBack={() => setActiveConv('')} />
        ) : activeConv ? (
          <ChatWindow conv={activeConv} user={user} onBack={() => setActiveConv('')} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-6xl mb-4">💬</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Selecciona una conversación</h3>
              <p className="text-gray-400">Todo el contacto es interno y seguro.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatWindow: React.FC<{
  conv: ReturnType<typeof useChatStore.getState>['conversations'][0];
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  onBack: () => void;
}> = ({ conv, user, onBack }) => {
  const { sendMessage, sendOffer, respondOffer } = useChatStore();
  const { addToast } = useUIStore();
  const [input, setInput] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDays, setOfferDays] = useState('3');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(conv.id, input.trim(), user);
    setInput('');
  };

  const handleSendOffer = () => {
    const price = parseFloat(offerPrice);
    if (!offerTitle.trim() || !price || !offerDesc.trim()) {
      addToast({ message: 'Completa título, precio y descripción', type: 'error' });
      return;
    }
    sendOffer(conv.id, {
      title: offerTitle.trim(),
      price,
      description: offerDesc.trim(),
      deliveryDays: parseInt(offerDays) || 3
    }, user);
    setOfferTitle(''); setOfferPrice(''); setOfferDesc(''); setOfferDays('3');
    setShowOfferModal(false);
    addToast({ message: 'Oferta enviada por chat', type: 'success' });
  };

  return (
    <>
      <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="sm:hidden text-gray-400 hover:text-gray-600 p-1">←</button>
        <Avatar src={conv.participantAvatar} name={conv.participantName} size="md" />
        <div>
          <p className="text-gray-900 font-semibold">{conv.participantName}</p>
          <p className="text-gray-400 text-xs">Artista verificado · Chat interno</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {conv.messages.map(msg => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && <Avatar src={msg.senderAvatar} name={msg.senderName} size="xs" />}
              <div className={`max-w-xs lg:max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {msg.type === 'offer' && msg.offer ? (
                  <div className="bg-white rounded-2xl border-2 border-brand-orange/40 shadow-sm overflow-hidden w-72">
                    <div className="bg-gradient-to-r from-brand-orange to-pink-500 px-4 py-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-white" />
                      <span className="text-white font-bold text-xs uppercase tracking-wide">Oferta personalizada</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="font-bold text-gray-900 text-sm">{msg.offer.title}</p>
                      <p className="text-gray-600 text-xs leading-relaxed">{msg.offer.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-2xl font-black text-brand-orange">€{msg.offer.price}</span>
                        {msg.offer.deliveryDays && (
                          <span className="text-gray-400 text-xs">⏱ {msg.offer.deliveryDays} días</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                        <Shield className="w-3 h-3" /> Pago en escrow · 15% comisión plataforma
                      </p>
                      {msg.offer.status === 'pending' ? (
                        !isMe ? (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => respondOffer(conv.id, msg.id, true)}
                              className="flex-1 bg-brand-orange text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-brand-orange-dark"
                            >
                              <Check className="w-3 h-3" /> Aceptar
                            </button>
                            <button
                              onClick={() => respondOffer(conv.id, msg.id, false)}
                              className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-200"
                            >
                              <X className="w-3 h-3" /> Rechazar
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-gray-400 text-xs font-semibold pt-2">⏳ Esperando respuesta</p>
                        )
                      ) : msg.offer.status === 'accepted' ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                          <p className="text-green-700 text-xs font-bold">✅ Oferta aceptada</p>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                          <p className="text-red-600 text-xs font-bold">❌ Oferta rechazada</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-brand-orange text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                  }`}>
                    {msg.text}
                  </div>
                )}
                <span className="text-gray-300 text-[10px] px-1">
                  {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-100 p-4">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowOfferModal(true)}
            title="Enviar oferta personalizada"
            className="w-10 h-10 bg-gradient-to-br from-brand-orange to-pink-500 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-all flex-shrink-0"
          >
            <Briefcase className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 text-sm transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-brand-orange-dark transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-300 text-[10px] text-center mt-2 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Comunicación interna cifrada — Sin emails ni teléfonos públicos
        </p>
      </div>

      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowOfferModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-brand-orange" />
              <h3 className="font-display font-black text-lg text-gray-900">Nueva oferta personalizada</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-gray-600 text-xs font-semibold block mb-1">Título</label>
                <input
                  value={offerTitle}
                  onChange={e => setOfferTitle(e.target.value)}
                  placeholder="Ej: Set DJ 2h para boda"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 text-xs font-semibold block mb-1">Precio (€)</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={e => setOfferPrice(e.target.value)}
                    placeholder="350"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="text-gray-600 text-xs font-semibold block mb-1">Días entrega</label>
                  <input
                    type="number"
                    value={offerDays}
                    onChange={e => setOfferDays(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-xs font-semibold block mb-1">Descripción</label>
                <textarea
                  value={offerDesc}
                  onChange={e => setOfferDesc(e.target.value)}
                  rows={3}
                  placeholder="Detalla lo que incluye la oferta..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange resize-none"
                />
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
                <p className="text-xs text-gray-700 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
                  <span>Pago retenido en escrow. La plataforma cobra 15% de comisión al completarse el servicio.</span>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendOffer}
                  className="flex-1 bg-brand-orange text-white font-bold py-2.5 rounded-xl text-sm hover:bg-brand-orange-dark"
                >
                  Enviar oferta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── SUPPORT THREAD (lado usuario) — persiste en support_messages, lo lee el superadmin ──
export const SupportThread: React.FC<{
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  onBack: () => void;
}> = ({ user, onBack }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => { load(); }, [user.id]);

  // Realtime: nuevos mensajes (respuestas del soporte) aparecen al instante
  useEffect(() => {
    const channel = supabase
      .channel(`support-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMessages(prev => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    const { error } = await supabase.from('support_messages').insert({
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      text,
      is_admin: false,
    });
    setSending(false);
    if (error) { setInput(text); return; }
    load();
  };

  return (
    <>
      <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="sm:hidden text-gray-400 hover:text-gray-600 p-1">←</button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-gray-900 font-semibold">Soporte BailaNow</p>
          <p className="text-gray-400 text-xs">Equipo oficial · Te responderemos pronto</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {/* Mensaje de bienvenida fijo */}
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="max-w-xs lg:max-w-sm bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm text-gray-700">¡Hola {user.name}! 👋 Escríbenos tu duda sobre pagos, reservas, perfiles o publicidad y el equipo te responderá lo antes posible.</p>
          </div>
        </div>
        {messages.map(msg => {
          const isMe = !msg.is_admin;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 shadow-sm ${isMe ? 'bg-brand-orange text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-100 p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Escribe tu mensaje al soporte…"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white rounded-xl p-2.5 disabled:opacity-40">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};

export default ChatPage;
