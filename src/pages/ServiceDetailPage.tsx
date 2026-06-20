import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ShoppingBag, CheckCircle, Shield, MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, StarRating, Badge, Button } from '../components/ui';
import { useAuthStore, useUIStore, useCartStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import BookingModal from '../components/BookingModal';
import PaymentGateway from '../components/payment/PaymentGateway';

type SvcDetail = {
  id: string; title: string; cover: string; category: string; description: string;
  artistId: string; artistName: string; artistAvatar: string;
  price: number; rating: number; reviews: number; orders: number;
  tags: string[]; includes: string[]; deliveryDays: number;
};

function normalize(r: any): SvcDetail {
  return {
    id: r.id, title: r.title || r.name || '',
    cover: r.cover || r.image_url || '',
    category: r.category || '',
    description: r.description || '',
    artistId: r.artist_id || r.owner_id || '',
    artistName: r.artist_name || '',
    artistAvatar: r.artist_avatar || '',
    price: Number(r.price) || 0,
    rating: Number(r.rating) || 0,
    reviews: Number(r.reviews) || 0,
    orders: Number(r.orders) || 0,
    tags: Array.isArray(r.tags) ? r.tags : [],
    includes: Array.isArray(r.includes) ? r.includes : [],
    deliveryDays: Number(r.delivery_days) || 1,
  };
}

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const { addItem, clearCart } = useCartStore();
  const [service, setService] = useState<SvcDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('services').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => { setService(data ? normalize(data) : null); setLoading(false); });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (!service) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl">💼</p>
      <h2 className="font-display font-black text-xl text-gray-900">Servicio no encontrado</h2>
      <p className="text-gray-400 text-sm">Este servicio ya no existe o fue eliminado.</p>
      <button onClick={() => navigate('/marketplace')} className="btn-orange px-6 py-2">Ver marketplace</button>
    </div>
  );

  const platform = Math.round(service.price * 0.15);

  const handleOrder = () => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    // Add this service to cart (clear first for single-item checkout)
    clearCart();
    addItem({
      serviceId: service.id,
      sellerId: service.artistId,
      sellerName: service.artistName,
      sellerAvatar: service.artistAvatar,
      title: service.title,
      price: service.price,
      extras: [],
      currency: 'EUR',
    });
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="relative h-64 overflow-hidden">
        <img src={service.cover} alt={service.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-6 left-4 bg-white/90 text-gray-700 text-sm px-3 py-1.5 rounded-xl font-medium hover:bg-white">← Volver</button>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-white rounded-2xl p-5">
              <Badge variant="gray" className="mb-3">{service.category}</Badge>
              <h1 className="font-display font-black text-2xl text-gray-900 mb-3">{service.title}</h1>

              <div className="flex items-center gap-3 mb-4">
                <Avatar src={service.artistAvatar} name={service.artistName} size="sm" />
                <button onClick={() => navigate(`/artistas/${service.artistId}`)} className="text-brand-orange font-medium text-sm hover:text-brand-orange-dark transition-colors">
                  {service.artistName}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <StarRating rating={service.rating} count={service.reviews} size="md" />
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4" /> {service.orders} pedidos
                </span>
              </div>
            </div>

            <div className="card-white rounded-2xl p-5">
              <h3 className="text-gray-900 font-semibold mb-3">Descripción</h3>
              <p className="text-gray-500 leading-relaxed">{service.description}</p>
            </div>

            <div className="card-white rounded-2xl p-5">
              <h3 className="text-gray-900 font-semibold mb-3">¿Qué incluye?</h3>
              <ul className="space-y-2">
                {service.includes.map(item => (
                  <li key={item} className="flex items-center gap-2 text-gray-600 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-white rounded-2xl p-5">
              <h3 className="text-gray-900 font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {service.tags.map(tag => (
                  <span key={tag} className="bg-pink-50 text-brand-orange border border-pink-100 px-3 py-1 rounded-full text-sm">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Order card */}
          <div className="space-y-4">
            <div className="card-white rounded-2xl p-5 sticky top-20 shadow-card-hover">
              <div className="mb-4">
                <p className="text-gray-400 text-sm">Precio del servicio</p>
                <p className="text-4xl font-black text-gray-900">€{service.price}</p>
                <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                  <Clock className="w-4 h-4" />
                  {service.deliveryDays === 1 ? 'Entrega hoy' : `Entrega en ${service.deliveryDays} días`}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2 border border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Precio servicio</span>
                  <span className="text-gray-900">€{service.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Comisión plataforma</span>
                  <span className="text-gray-400">€{platform} (15%)</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-brand-orange">€{service.price}</span>
                </div>
              </div>

              <Button variant="orange" className="w-full" onClick={handleOrder}>
                🛒 Contratar Ahora
              </Button>

              <Button variant="outline" className="w-full mt-2" onClick={() => { if (!isAuthenticated) { navigate('/auth'); return; } navigate('/chat'); }}>
                <MessageSquare className="w-4 h-4" /> Contactar antes
              </Button>

              <div className="mt-4 space-y-2">
                {[
                  { icon: <Shield className="w-4 h-4 text-emerald-500" />, text: 'Pago seguro con escrow' },
                  { icon: <CheckCircle className="w-4 h-4 text-blue-500" />, text: 'Artista verificado' },
                  { icon: <Clock className="w-4 h-4 text-yellow-500" />, text: 'Respuesta en < 24h' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2 text-gray-400 text-xs">
                    {item.icon} {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        providerId={service.artistId}
        providerName={service.artistName}
        source="offer"
        defaultConcept={service.title}
        defaultPrice={service.price}
        helperText={`Servicio: ${service.category}`}
      />

      <PaymentGateway
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </div>
  );
};

export default ServiceDetailPage;
