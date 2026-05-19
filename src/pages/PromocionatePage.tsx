import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, ShoppingBag, Star, CheckCircle, Clock, ChevronRight, TrendingUp, Shield, Users, Eye, Send } from 'lucide-react';
import { PROMO_SERVICES, PROMO_SELLERS } from '../data/mockData';
import type { PromoService, PromoSeller } from '../data/mockData';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar, StarRating, Badge, SearchBar } from '../components/ui';
import BookingModal from '../components/BookingModal';

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: '🔥' },
  { id: 'redes-sociales', label: 'Redes Sociales', icon: '📱' },
  { id: 'spotify-playlists', label: 'Spotify & Playlists', icon: '🎧' },
  { id: 'video-promo', label: 'Video Promo', icon: '🎬' },
  { id: 'influencers', label: 'Influencers', icon: '⭐' },
  { id: 'prensa-blogs', label: 'Prensa & Blogs', icon: '📰' },
];

const formatFollowers = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};

/* ── Seller Profile Card ── */
const SellerCard: React.FC<{ seller: PromoSeller; onClick: () => void }> = ({ seller, onClick }) => (
  <button onClick={onClick} className="card-white rounded-2xl p-4 text-left hover:shadow-lg transition-all w-full">
    <div className="flex items-center gap-3 mb-3">
      <div className="relative">
        <img src={seller.avatar} alt={seller.name} className="w-12 h-12 rounded-full object-cover" />
        {seller.isVerified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm text-gray-900 truncate">{seller.name}</p>
          {seller.isPro && <span className="text-[8px] bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-1.5 py-0.5 rounded font-black">PRO</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StarRating rating={seller.rating} count={seller.reviews} />
          <span className="text-[10px] text-gray-400">· {seller.orders} ventas</span>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {seller.socialProof.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
          {s.icon} {formatFollowers(s.followers)}
        </span>
      ))}
    </div>
  </button>
);

/* ── Service Card ── */
const PromoServiceCard: React.FC<{ service: PromoService; onBuy: () => void; onChat: () => void }> = ({ service, onBuy, onChat }) => {
  const totalFollowers = service.platforms.reduce((sum, p) => sum + p.totalFollowers, 0);
  const totalAccounts = service.platforms.reduce((sum, p) => sum + p.accounts, 0);

  return (
    <div className="card-white rounded-2xl overflow-hidden hover:shadow-lg transition-all">
      {/* Cover */}
      <div className="relative">
        <img src={service.cover} alt={service.title} className="w-full h-44 object-cover" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full font-bold">
            {service.categoryLabel}
          </span>
          {service.price <= 10 && (
            <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
              🔥 DESDE {service.price}€
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl">
          <span className="font-black text-lg">€{service.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Seller */}
        <div className="flex items-center gap-2 mb-3">
          <img src={service.sellerAvatar} alt={service.sellerName} className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{service.sellerName}</p>
            <StarRating rating={service.rating} count={service.reviews} />
          </div>
          <span className="text-[10px] text-gray-400">{service.orders} ventas</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 leading-snug">{service.title}</h3>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {service.platforms.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-lg font-semibold border border-pink-100">
              {p.icon} {p.accounts > 1 ? `${p.accounts} cuentas` : p.name} · {formatFollowers(p.totalFollowers)}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {formatFollowers(totalFollowers)} seguidores</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {totalAccounts} cuentas</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.deliveryDays}d</span>
        </div>

        {/* Includes preview */}
        <div className="space-y-1 mb-4">
          {service.includes.slice(0, 3).map((inc, i) => (
            <p key={i} className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {inc}
            </p>
          ))}
          {service.includes.length > 3 && (
            <p className="text-[10px] text-pink-500 font-semibold">+{service.includes.length - 3} más incluidos</p>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {service.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{tag}</span>
          ))}
        </div>

        {/* Comisión */}
        <div className="bg-gray-50 rounded-lg p-2 mb-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Comisión plataforma ({service.platformFee}%)</span>
          <span className="text-[10px] font-bold text-gray-500">€{(service.price * service.platformFee / 100).toFixed(2)}</span>
        </div>

        {/* Extras */}
        {service.extras.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Extras opcionales</p>
            {service.extras.map((extra, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-[11px]">
                <span className="text-gray-600">+ {extra.label}</span>
                <span className="text-pink-500 font-bold">+€{extra.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={onChat} className="flex-1 flex items-center justify-center gap-1.5 border-2 border-pink-500 text-pink-500 font-bold rounded-xl py-2.5 text-xs hover:bg-pink-500 hover:text-white transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button onClick={onBuy} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-xl py-2.5 text-xs hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25">
            <ShoppingBag className="w-3.5 h-3.5" /> Contratar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Seller Detail Modal ── */
const SellerModal: React.FC<{ seller: PromoSeller; onClose: () => void }> = ({ seller, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img src={seller.avatar} alt={seller.name} className="w-16 h-16 rounded-2xl object-cover" />
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg text-gray-900">{seller.name}</h2>
              {seller.isPro && <span className="text-[9px] bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-black">PRO</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StarRating rating={seller.rating} count={seller.reviews} size="md" />
              <span className="text-xs text-gray-400">Desde {seller.memberSince}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{seller.bio}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-gray-900">{seller.orders}</p>
            <p className="text-[10px] text-gray-400">Ventas</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-gray-900">{seller.rating}</p>
            <p className="text-[10px] text-gray-400">Rating</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-pink-500">{seller.responseTime}</p>
            <p className="text-[10px] text-gray-400">Respuesta</p>
          </div>
        </div>

        <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-pink-500" /> Redes Sociales & Métricas
        </h3>
        <div className="space-y-2 mb-4">
          {seller.socialProof.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-900">{s.platform}</p>
                  <p className="text-[10px] text-gray-400">{s.handle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-pink-500">{formatFollowers(s.followers)}</p>
                <p className="text-[10px] text-gray-400">{formatFollowers(s.monthlyReach)}/mes alcance</p>
              </div>
            </div>
          ))}
        </div>

        {seller.metricsScreenshots.length > 0 && (
          <>
            <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-pink-500" /> Capturas de Métricas
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {seller.metricsScreenshots.map((ss, i) => (
                <img key={i} src={ss} alt={`Métricas ${i + 1}`} className="w-48 h-32 object-cover rounded-xl flex-shrink-0 border border-gray-100" />
              ))}
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-4 btn-outline text-sm">Cerrar</button>
      </div>
    </div>
  </div>
);

/* ── Main Page ── */
const PromocionatePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [search, setSearch] = useState(params.get('q') || '');
  const [activeTab, setActiveTab] = useState(params.get('cat') || 'all');
  const [selectedSeller, setSelectedSeller] = useState<PromoSeller | null>(null);
  const [bookingService, setBookingService] = useState<PromoService | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return PROMO_SERVICES.filter(s => {
      const matchCat = activeTab === 'all' || s.category === activeTab;
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.sellerName.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) || s.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeTab]);

  const handleBuy = (service: PromoService) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingService(service);
  };

  const handleChat = (service: PromoService) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    addToast({ message: `Chat iniciado con ${service.sellerName}`, type: 'success' });
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20 transition-colors">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">📢</span>
            <Badge variant="live" className="text-[10px]">NUEVO</Badge>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">Promociónate</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-xl mb-4">
            Promociona tu música, evento, escuela o marca en las redes sociales más grandes de la escena latina.
            Vendedores verificados, métricas reales y pagos seguros.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: '📱', label: '32+ cuentas', desc: 'Redes sociales' },
              { icon: '👥', label: '5M+', desc: 'Seguidores combinados' },
              { icon: '🔒', label: 'Pago seguro', desc: 'Escrow garantizado' },
              { icon: '💬', label: 'Chat directo', desc: 'Con vendedores' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-white font-bold text-xs">{stat.label}</p>
                <p className="text-white/60 text-[10px]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* How it works */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 -mt-5 relative z-10 mb-6">
          {[
            { step: '1', icon: '🔍', title: 'Elige', desc: 'Servicio ideal' },
            { step: '2', icon: '💬', title: 'Contacta', desc: 'Chat con vendedor' },
            { step: '3', icon: '💳', title: 'Paga', desc: 'Escrow seguro' },
            { step: '4', icon: '📊', title: 'Resultados', desc: 'Métricas reales' },
          ].map(s => (
            <div key={s.step} className="card-white rounded-xl p-2.5 sm:p-4 text-center shadow-lg">
              <span className="text-xl sm:text-2xl">{s.icon}</span>
              <p className="text-gray-900 font-bold text-[10px] sm:text-xs mt-1">{s.title}</p>
              <p className="text-gray-400 text-[8px] sm:text-[10px]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Busca servicios de promoción, vendedores, plataformas..."
          value={search}
          onChange={setSearch}
        />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4" style={{ scrollbarWidth: 'none' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Top Sellers */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-pink-500" /> Vendedores Verificados
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {PROMO_SELLERS.map(seller => (
              <div key={seller.id} className="flex-shrink-0 w-72">
                <SellerCard seller={seller} onClick={() => setSelectedSeller(seller)} />
              </div>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{filtered.length}</span> servicios disponibles
          </p>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(service => (
            <PromoServiceCard
              key={service.id}
              service={service}
              onBuy={() => handleBuy(service)}
              onChat={() => handleChat(service)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-gray-900 font-bold text-lg">No encontramos servicios</p>
            <p className="text-gray-400 text-sm mt-1">Prueba con otra búsqueda o categoría</p>
            <button onClick={() => { setSearch(''); setActiveTab('all'); }} className="btn-outline text-sm mt-4">Ver todos</button>
          </div>
        )}

        {/* CTA bottom */}
        <div className="mt-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <span className="text-4xl">🚀</span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-white mt-2 mb-2">¿Quieres vender tus servicios de promoción?</h3>
            <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
              Si tienes cuentas con audiencia latina, únete como vendedor y empieza a ganar dinero promocionando artistas y eventos.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-orange">
              <Send className="w-4 h-4 inline mr-1" /> Conviértete en Vendedor
            </button>
          </div>
        </div>
      </div>

      {/* Seller Modal */}
      {selectedSeller && <SellerModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />}

      {/* Booking Modal */}
      {bookingService && (
        <BookingModal
          open={!!bookingService}
          onClose={() => setBookingService(null)}
          providerId={bookingService.sellerId}
          providerName={bookingService.sellerName}
          source="offer"
          defaultConcept={bookingService.title}
          defaultPrice={bookingService.price}
          helperText={`Comisión plataforma: ${bookingService.platformFee}%`}
        />
      )}
    </div>
  );
};

export default PromocionatePage;
