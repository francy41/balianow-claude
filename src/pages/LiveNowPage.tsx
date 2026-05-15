import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Radio, Eye, Heart, Share2, MessageCircle, X } from 'lucide-react';
import { LIVE_STREAMS, ARTISTS } from '../data/mockData';
import { Avatar, Badge, SectionHeader } from '../components/ui';
import { useAuthStore, useUIStore } from '../store/appStore';

const LiveNowPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const stream = id ? LIVE_STREAMS.find(s => s.id === id) : null;
  if (stream) return <StreamViewer stream={stream} onClose={() => navigate('/live')} />;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display font-black text-3xl text-gray-900">📡 Live Now</h1>
            <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {LIVE_STREAMS.filter(s => s.isLive).length} en vivo
            </div>
          </div>
          <p className="text-gray-400">DJs, bailarines y artistas transmitiendo ahora mismo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
          {LIVE_STREAMS.map(stream => (
            <StreamCard key={stream.id} stream={stream} onClick={() => navigate(`/live/${stream.id}`)} />
          ))}
        </div>

        <SectionHeader title="🎧 Artistas que transmiten" subtitle="Síguelos para recibir notificaciones" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {ARTISTS.map(artist => (
            <div key={artist.id} className="card-white rounded-2xl p-4 text-center cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all"
              onClick={() => navigate(`/artistas/${artist.id}`)}>
              <Avatar src={artist.avatar} name={artist.name} size="lg" isLive={artist.isLive} className="mx-auto mb-3" />
              <p className="text-gray-900 font-semibold text-sm">{artist.name}</p>
              <p className="text-gray-400 text-xs capitalize mt-0.5">{artist.type}</p>
              {artist.isLive ? (
                <button onClick={e => { e.stopPropagation(); navigate('/live'); }}
                  className="mt-3 w-full bg-red-500 text-white text-xs font-bold py-1.5 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5">
                  <Radio className="w-3 h-3" /> Ver en Vivo
                </button>
              ) : (
                <button className="mt-3 w-full border border-gray-200 text-gray-500 text-xs py-1.5 rounded-xl hover:border-brand-orange hover:text-brand-orange transition-colors">
                  + Seguir
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StreamCard: React.FC<{ stream: typeof LIVE_STREAMS[0]; onClick: () => void }> = ({ stream, onClick }) => {
  const [viewers, setViewers] = useState(stream.viewers);
  useEffect(() => {
    const t = setInterval(() => setViewers(v => Math.max(0, v + Math.floor(Math.random() * 10 - 4))), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-card-hover hover:scale-[1.02] transition-all duration-200">
      <div className="relative h-44 overflow-hidden bg-gray-900">
        <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <Badge variant="live" className="absolute top-2 left-2">🔴 LIVE</Badge>
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
          <Eye className="w-3 h-3" /> {viewers.toLocaleString()}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-2">
            <Avatar src={stream.artistAvatar} name={stream.artistName} size="sm" isLive />
            <div>
              <p className="text-white text-xs font-semibold">{stream.artistName}</p>
              <p className="text-white/60 text-[10px]">{stream.genre} · {stream.city}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-gray-900 text-sm font-semibold line-clamp-2">{stream.title}</p>
        <p className="text-gray-400 text-xs mt-1">Empezó a las {stream.startedAt}</p>
      </div>
    </div>
  );
};

const StreamViewer: React.FC<{ stream: typeof LIVE_STREAMS[0]; onClose: () => void }> = ({ stream, onClose }) => {
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [viewers, setViewers] = useState(stream.viewers);
  const [messages, setMessages] = useState([
    { id: 1, user: 'Maria_B',  text: '¡Qué mix tan bueno! 🔥',              time: '21:42' },
    { id: 2, user: 'Carlos_D', text: 'Saludos desde Madrid! 💃',             time: '21:43' },
    { id: 3, user: 'DJ_Fan_01',text: 'Esto es lo mejor que he escuchado hoy',time: '21:44' },
    { id: 4, user: 'SalsaLover',text: '❤️❤️❤️',                              time: '21:44' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setViewers(v => Math.max(0, v + Math.floor(Math.random() * 5 - 1))), 2000);
    return () => clearInterval(t);
  }, []);

  const sendMessage = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), user: 'Tú', text: chatInput, time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col lg:flex-row">
      {/* Stream */}
      <div className="flex-1 relative bg-black">
        <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 text-9xl animate-pulse">🎵</div>
        </div>

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="live">🔴 LIVE</Badge>
            <div className="bg-black/60 text-white text-sm px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Eye className="w-4 h-4" /> {viewers.toLocaleString()} viendo
            </div>
          </div>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-xl text-white hover:bg-white/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/60 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={stream.artistAvatar} name={stream.artistName} size="md" isLive />
                <div>
                  <p className="text-white font-bold">{stream.artistName}</p>
                  <p className="text-white/60 text-sm">{stream.title}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setLiked(!liked)}
                  className={`flex flex-col items-center gap-0.5 transition-colors ${liked ? 'text-red-400' : 'text-white/60 hover:text-red-400'}`}>
                  <Heart className={`w-6 h-6 ${liked ? 'fill-red-400' : ''}`} />
                  <span className="text-xs">Like</span>
                </button>
                <button onClick={() => addToast({ message: 'Enlace copiado', type: 'success' })}
                  className="flex flex-col items-center gap-0.5 text-white/60 hover:text-white transition-colors">
                  <Share2 className="w-6 h-6" />
                  <span className="text-xs">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Chat Panel */}
      <div className="w-full lg:w-80 flex flex-col bg-white border-l border-gray-100 h-64 lg:h-auto">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-orange" />
          <h3 className="text-gray-900 font-semibold">Chat en Vivo</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                {msg.user[0]}
              </div>
              <div>
                <span className="text-brand-orange text-xs font-semibold">{msg.user}</span>
                <p className="text-gray-700 text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2 bg-white">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={isAuthenticated ? 'Escribe algo...' : 'Inicia sesión para chatear'}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange text-sm" />
          <button onClick={sendMessage} className="bg-brand-orange hover:bg-brand-orange-dark text-white px-3 py-2 rounded-xl transition-colors text-sm font-medium">
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveNowPage;
