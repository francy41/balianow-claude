import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Instagram, Youtube, Music, Calendar, MessageSquare, Share2, Heart, Play } from 'lucide-react';
import { ARTISTS, SERVICES } from '../data/mockData';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar, Badge, StarRating, Modal, Button, Card } from '../components/ui';

const ArtistProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();

  const artist = ARTISTS.find(a => a.id === id) || ARTISTS[0];
  const artistServices = SERVICES.filter(s => s.artistId === artist.id);
  const [showBooking, setShowBooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'gallery' | 'reviews'>('about');
  const [liked, setLiked] = useState(false);

  const handleContact = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    navigate('/chat');
    addToast({ message: `Chat iniciado con ${artist.name}`, type: 'success' });
  };

  const handleBook = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setShowBooking(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* COVER */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img src={artist.cover} alt={artist.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />

        <button onClick={() => navigate(-1)}
          className="absolute top-6 left-4 bg-white/90 text-gray-700 text-sm px-3 py-1.5 rounded-xl font-medium hover:bg-white">
          ← Volver
        </button>

        <div className="absolute top-6 right-4 flex gap-2">
          <button onClick={() => { setLiked(!liked); addToast({ message: liked ? 'Eliminado de favoritos' : 'Añadido a favoritos', type: 'success' }); }}
            className={`bg-white/90 p-2 rounded-xl transition-colors ${liked ? 'text-red-500' : 'text-gray-600'}`}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-500' : ''}`} />
          </button>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); addToast({ message: 'Enlace copiado', type: 'success' }); }}
            className="bg-white/90 p-2 rounded-xl text-gray-600 hover:text-gray-900 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {artist.isLive && (
          <div className="absolute bottom-4 left-4">
            <button onClick={() => navigate('/live')}
              className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
              <Play className="w-4 h-4 fill-white" /> Ver en Vivo
            </button>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative">
        {/* Artist Info Card */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-card-hover border border-gray-100">
          <div className="flex items-start gap-4">
            <Avatar src={artist.avatar} name={artist.name} size="xl" isLive={artist.isLive} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-2xl text-gray-900">{artist.name}</h1>
                {artist.isVerified && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                {artist.isPremium && <Badge variant="orange">👑 PRO</Badge>}
                {artist.isLive && <Badge variant="live">🔴 LIVE</Badge>}
              </div>
              <p className="text-gray-400 capitalize mt-0.5">{artist.type} · {artist.genre.join(', ')}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="text-gray-400 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{artist.city}, {artist.country}</span>
                <span className="text-gray-400 text-sm flex items-center gap-1"><Users className="w-3.5 h-3.5" />{artist.followers.toLocaleString()} seguidores</span>
                <span className="text-gray-400 text-sm">✅ {artist.completedBookings} bookings</span>
              </div>
              <StarRating rating={artist.rating} count={artist.reviews} size="md" className="mt-2" />
            </div>
          </div>

          {/* Social links */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {artist.social.instagram && (
              <a href={`https://instagram.com/${artist.social.instagram}`} target="_blank" rel="noopener noreferrer"
                className="bg-gray-50 border border-gray-200 text-gray-600 hover:text-pink-500 hover:border-pink-200 text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                <Instagram className="w-4 h-4" /> @{artist.social.instagram}
              </a>
            )}
            {artist.social.tiktok && (
              <a href={`https://tiktok.com/@${artist.social.tiktok}`} target="_blank" rel="noopener noreferrer"
                className="bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                🎵 TikTok
              </a>
            )}
            {artist.social.youtube && (
              <a href={`https://youtube.com/@${artist.social.youtube}`} target="_blank" rel="noopener noreferrer"
                className="bg-gray-50 border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-200 text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                <Youtube className="w-4 h-4" /> YouTube
              </a>
            )}
            {artist.social.spotify && (
              <a href={`https://open.spotify.com/artist/${artist.social.spotify}`} target="_blank" rel="noopener noreferrer"
                className="bg-gray-50 border border-gray-200 text-gray-600 hover:text-green-500 hover:border-green-200 text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
                <Music className="w-4 h-4" /> Spotify
              </a>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <Button variant="orange" className="flex-1" onClick={handleBook} icon={<Calendar className="w-4 h-4" />}>
              Contratar / Booking
            </Button>
            <Button variant="outline" onClick={handleContact} icon={<MessageSquare className="w-4 h-4" />}>
              Chat
            </Button>
          </div>

          <p className="text-center text-gray-300 text-xs mt-3">
            Solo comunicación interna — Sin emails ni teléfonos públicos
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(['about', 'services', 'gallery', 'reviews'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                activeTab === tab ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'about' ? 'Sobre mí' : tab === 'services' ? 'Servicios' : tab === 'gallery' ? 'Galería' : 'Reseñas'}
            </button>
          ))}
        </div>

        {activeTab === 'about' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-gray-900 font-semibold mb-2">Sobre {artist.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{artist.bio}</p>
            </Card>
            <Card className="p-4">
              <h3 className="text-gray-900 font-semibold mb-3">Géneros & Estilos</h3>
              <div className="flex flex-wrap gap-2">
                {artist.genre.map(g => (
                  <span key={g} className="bg-orange-50 text-brand-orange border border-orange-100 px-3 py-1 rounded-full text-sm">{g}</span>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-gray-900 font-semibold mb-3">Disponibilidad</h3>
              <div className="flex flex-wrap gap-2">
                {artist.availability.map(day => (
                  <span key={day} className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full text-sm">{day}</span>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            {artistServices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">📦</p>
                <p>Este artista aún no tiene servicios publicados</p>
                <Button variant="outline" className="mt-4" onClick={handleContact}>Contactar para presupuesto</Button>
              </div>
            ) : (
              artistServices.map(service => (
                <Card key={service.id} className="p-4 hover:shadow-card-hover transition-all cursor-pointer" onClick={() => navigate(`/marketplace/${service.id}`)}>
                  <div className="flex gap-4">
                    <img src={service.cover} alt={service.title} className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-semibold text-sm">{service.title}</h4>
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{service.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <StarRating rating={service.rating} count={service.reviews} />
                        <span className="text-brand-orange font-bold">€{service.price}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl">
                <img src={`https://picsum.photos/seed/${artist.id}${i}/400/400`} alt="Gallery"
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 cursor-pointer" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-black text-gray-900">{artist.rating.toFixed(1)}</p>
                  <StarRating rating={artist.rating} className="mt-1 justify-center" />
                  <p className="text-gray-400 text-xs mt-1">{artist.reviews} reseñas</p>
                </div>
                <div className="flex-1 space-y-2">
                  {[5,4,3,2,1].map(n => (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-4">{n}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-orange rounded-full" style={{ width: `${n === 5 ? 70 : n === 4 ? 20 : n === 3 ? 7 : 2}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            {[
              { name: 'María G.', rating: 5, text: '¡Increíble! DJ Mambo King hizo que nuestra boda fuera perfecta. Todos bailaron toda la noche. 100% recomendado.', ago: '2 semanas' },
              { name: 'Carlos P.', rating: 5, text: 'Profesional, puntual y con una selección musical espectacular. Lo contrataré de nuevo sin dudarlo.', ago: '1 mes' },
              { name: 'Ana M.', rating: 4, text: 'Muy buena actuación. El equipo de sonido era excelente. Solo mejoraría la comunicación previa al evento.', ago: '2 meses' },
            ].map((review, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-brand-orange font-bold flex-shrink-0">
                    {review.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-semibold text-sm">{review.name}</span>
                      <span className="text-gray-300 text-xs">Hace {review.ago}</span>
                    </div>
                    <StarRating rating={review.rating} className="mt-1" />
                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">{review.text}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showBooking} onClose={() => setShowBooking(false)} title={`Contratar a ${artist.name}`} size="md">
        <BookingForm artist={artist} onClose={() => setShowBooking(false)} />
      </Modal>
    </div>
  );
};

const BookingForm: React.FC<{ artist: typeof ARTISTS[0]; onClose: () => void }> = ({ artist, onClose }) => {
  const { addToast } = useUIStore();
  const [date, setDate] = useState('');
  const [hours, setHours] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = artist.priceFrom * hours;
  const platform = Math.round(total * 0.15);

  const handleSubmit = async () => {
    if (!date) { addToast({ message: 'Selecciona una fecha', type: 'error' }); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    onClose();
    addToast({ message: `Solicitud enviada a ${artist.name}. Te contactará pronto.`, type: 'success' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-gray-600 text-sm block mb-1">Fecha del evento</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" />
      </div>
      <div>
        <label className="text-gray-600 text-sm block mb-1">Horas de actuación: {hours}h</label>
        <input type="range" min={1} max={8} value={hours} onChange={e => setHours(Number(e.target.value))}
          className="w-full accent-brand-orange" />
        <div className="flex justify-between text-gray-400 text-xs mt-1"><span>1h</span><span>8h</span></div>
      </div>
      <div>
        <label className="text-gray-600 text-sm block mb-1">Notas adicionales</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Tipo de evento, temática, requerimientos especiales..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange resize-none" />
      </div>
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
        <div className="flex justify-between text-sm"><span className="text-gray-400">Precio base ({hours}h)</span><span className="text-gray-900">€{total}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-400">Comisión plataforma (15%)</span><span className="text-gray-400">€{platform}</span></div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold"><span className="text-gray-900">Total a pagar</span><span className="text-brand-orange">€{total}</span></div>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button variant="orange" onClick={handleSubmit} loading={submitting} className="flex-1">Enviar Solicitud</Button>
      </div>
      <p className="text-gray-400 text-xs text-center">El pago se gestiona de forma segura con escrow. Solo se libera al completar el evento.</p>
    </div>
  );
};

export default ArtistProfilePage;
