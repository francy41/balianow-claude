import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, ChevronRight, MapPin, Star, Check, X, ArrowRight, LayoutDashboard, Wallet, Briefcase, Clock, Shield, DollarSign, Users, TrendingUp } from 'lucide-react';
import { ARTISTS, EVENTS, VENUES } from '../data/mockData';
import { useAuthStore, useSiteConfigStore, getYouTubeId, usePerformerStore, PLATFORM_COMMISSION_RATE, type HeroSliderImage } from '../store/appStore';
import { useCMSStore, visibleHomeModules, activeCategories } from '../store/cmsStore';
import { Avatar, StarRating, SearchBar } from '../components/ui';

// ── COMMUNITY POSTS (Ruta de Hoy) ────────────────────────────────────────
const COMMUNITY_POSTS = [
  { id: 1, user: 'Elena G.',  text: '"Primera vez en Madrid, busca un local c..."', status: 'APROBADO' },
  { id: 2, user: 'Miguel A.', text: '"¿Alguien para practicar ruedas de casino..."', status: 'APROBADO' },
  { id: 3, user: 'Sofía T.',  text: '"Tengo 2 entradas extra para el concierto..."', status: 'RECHAZAR' },
  { id: 4, user: 'Daniel C.', text: '"¿Cuál es la mejor discoteca latina abierta..."', status: 'APROBADO' },
  { id: 5, user: 'María V.',  text: '"Buscamos grupo para ir a Tropical House..."', status: 'APROBADO' },
  { id: 6, user: 'Pedro K.',  text: '"Mensaje de spam: compra criptomo..."', status: 'RECHAZAR' },
  { id: 7, user: 'Carlos M.', text: '"El viernes voy a Madrid, ¿donde puedo sal..."', status: 'APROBADO' },
  { id: 8, user: 'Laura S.',  text: '"Busco pareja para ir a la social de salsa..."', status: 'APROBADO' },
  { id: 9, user: 'David R.',  text: '"¿Algún evento de Kizomba..."', status: 'APROBADO' },
];

// ── CITIES ────────────────────────────────────────────────────────────────
const CITIES = [
  { name: 'Madrid',    venues: 12, events: 8,  img: 'https://picsum.photos/seed/madrid2024/800/400' },
  { name: 'Barcelona', venues: 8,  events: 5,  img: 'https://picsum.photos/seed/barcelona2024/800/400' },
  { name: 'Valencia',  venues: 5,  events: 3,  img: 'https://picsum.photos/seed/valencia2024/800/400' },
  { name: 'Medellín',  venues: 6,  events: 4,  img: 'https://picsum.photos/seed/medellin2024/800/400' },
  { name: 'Cali',      venues: 9,  events: 6,  img: 'https://picsum.photos/seed/cali2024/800/400' },
];

// ── CATEGORIES ────────────────────────────────────────────────────────────
const CATEGORY_CARDS = [
  {
    name: 'Conciertos y Música en Vivo',
    img: 'https://picsum.photos/seed/concert2024/800/500',
    to: '/eventos?cat=conciertos',
    btnColor: 'bg-brand-orange',
  },
  {
    name: 'Festivales y Congresos',
    img: 'https://picsum.photos/seed/festival2024/800/500',
    to: '/eventos?cat=festivales',
    btnColor: 'bg-purple-600',
  },
  {
    name: 'Noches de club',
    img: 'https://picsum.photos/seed/nightclub2024/800/500',
    to: '/eventos?cat=club',
    btnColor: 'bg-pink-500',
  },
];

// ── RADIO STATIONS ─────────────────────────────────────────────────────────
const RADIO_STATIONS = [
  {
    name: 'Radio Bachata',
    sub: 'En directo 24/7',
    img: 'https://picsum.photos/seed/bachata-radio/120/120',
  },
  {
    name: 'Radio Latina Variada',
    sub: 'En directo 24/7',
    img: 'https://picsum.photos/seed/latina-radio/120/120',
  },
];

// ── HERO SLIDER ──────────────────────────────────────────────────────────
const HeroSlider: React.FC<{ images: HeroSliderImage[] }> = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % images.length), 3500);
    return () => clearInterval(timerRef.current);
  }, [images.length]);

  return (
    <div className="mt-6 overflow-hidden rounded-xl relative" style={{ height: 80 }}>
      <div
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ width: `${images.length * 100}%`, transform: `translateX(-${(current * 100) / images.length}%)` }}
      >
        {images.map(img => (
          <img key={img.id} src={img.url} alt={img.alt} className="h-full object-cover flex-shrink-0" style={{ width: `${100 / images.length}%` }} />
        ))}
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-brand-orange w-4' : 'bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { heroMedia, heroSliderImages } = useSiteConfigStore();
  const cmsModules = useCMSStore(s => s.modules);
  const cmsCategories = useCMSStore(s => s.categories);
  const enabled = visibleHomeModules(cmsModules);
  const isModuleOn = (type: string) => enabled.some(m => m.type === type);
  const dynamicCats = activeCategories(cmsCategories);
  const { balanceFor, offers, classes, transactions, withdrawals, platformTotals } = usePerformerStore();
  const PERFORMER_ROLES = ['artist', 'dj', 'dancer', 'venue'];
  const isAdmin = !!user && user.role === 'admin';
  const isPerformer = !!user && PERFORMER_ROLES.includes(user.role);
  const isBuyer = !!user && user.role === 'user';
  const adminStats = isAdmin ? platformTotals() : null;
  const totalEscrow = isAdmin ? transactions.filter(t => t.status === 'pending').reduce((s, t) => s + t.gross, 0) : 0;
  const pendingWithdrawals = isAdmin ? withdrawals.filter(w => w.status === 'pending') : [];
  const creatorCount = isAdmin ? new Set(transactions.map(t => t.performerId)).size : 0;
  const performerId = isPerformer ? 'a1' : '';
  const myBalance = isPerformer ? balanceFor(performerId) : null;
  const pendingOffersCount = isPerformer ? offers.filter(o => o.performerId === performerId && o.status === 'pending').length : 0;
  const upcomingClassesCount = isPerformer ? classes.filter(c => c.performerId === performerId && c.status === 'scheduled').length : 0;
  const myPendingOrders = isBuyer ? transactions.filter(t => t.clientId === user.id && t.status === 'pending') : [];
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO — split layout ── */}
      <section className="mx-4 mt-4 rounded-3xl overflow-hidden flex flex-col sm:flex-row" style={{ minHeight: 420 }}>
        {/* Left black panel */}
        <div className="bg-black flex flex-col justify-center p-8 sm:p-12 sm:w-2/5 flex-shrink-0">
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white leading-tight mb-4">
            Encuentra tu<br />Pasión<br />
            <span className="text-brand-orange">Latina</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base mb-8 max-w-xs leading-relaxed">
            Explora la colección más exclusiva de locales, eventos y artistas latinos.
            Encuentra el lugar perfecto para vivir tu pasión.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/eventos')}
              className="btn-orange uppercase tracking-widest text-sm px-6 py-3"
            >
              Explorar Eventos
            </button>
            <button
              onClick={() => navigate('/artistas')}
              className="btn-dark uppercase tracking-widest text-sm px-6 py-3"
            >
              Ver Artistas
            </button>
          </div>
          {/* Hero Slider */}
          {heroSliderImages.length > 0 && <HeroSlider images={heroSliderImages} />}
        </div>

        {/* Right media */}
        <div className="flex-1 relative min-h-[220px] sm:min-h-[260px] bg-black">
          {heroMedia.type === 'youtube' ? (() => {
            const id = getYouTubeId(heroMedia.url);
            if (!id) return <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">URL de YouTube inválida</div>;
            const params = new URLSearchParams({
              autoplay: heroMedia.autoplay ? '1' : '0',
              mute: heroMedia.muted ? '1' : '0',
              loop: heroMedia.loop ? '1' : '0',
              playlist: heroMedia.loop ? id : '',
              controls: '1',
              modestbranding: '1',
              rel: '0',
            });
            return (
              <iframe
                src={`https://www.youtube.com/embed/${id}?${params.toString()}&playsinline=1`}
                title="Hero video"
                className="w-full h-full absolute inset-0"
                style={{ minHeight: 220 }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            );
          })() : heroMedia.type === 'video' ? (
            <video
              key={heroMedia.url}
              src={heroMedia.url}
              autoPlay={heroMedia.autoplay}
              muted={heroMedia.muted}
              loop={heroMedia.loop}
              playsInline
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={heroMedia.url}
              alt="Encuentra tu Pasión Latina"
              className="w-full h-full object-cover"
            />
          )}
          {/* Rating bubble */}
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-white rounded-2xl p-2.5 sm:p-4 shadow-xl flex items-center gap-2 sm:gap-3">
            <Star className="w-6 h-6 sm:w-8 sm:h-8 fill-brand-orange text-brand-orange flex-shrink-0" />
            <div>
              <p className="font-black text-lg sm:text-2xl text-gray-900 leading-none">4,9/5</p>
              <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5">Calificación global</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PANEL SUPERADMIN ── */}
      {isAdmin && adminStats && isModuleOn('admin-panel') && (
        <section className="mx-4 mt-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-5 sm:p-6 text-white shadow-card relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-orange/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-orange flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-brand-orange text-[10px] font-black uppercase tracking-widest">Superadministrador</p>
                  <h2 className="font-display font-black text-xl sm:text-2xl">Visión global de la plataforma</h2>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate('/admin')} className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Panel Admin
                </button>
                {pendingWithdrawals.length > 0 && (
                  <button onClick={() => navigate('/admin')} className="bg-yellow-500 text-gray-900 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5">
                    🔔 {pendingWithdrawals.length} retiro(s) por aprobar
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <DollarSign className="w-4 h-4 text-brand-orange mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Comisión 15%</p>
                <p className="text-xl font-black text-brand-orange">€{adminStats.totalCommission}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Ingresos plataforma</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <TrendingUp className="w-4 h-4 text-green-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Bruto total</p>
                <p className="text-xl font-black">€{adminStats.totalGross}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{adminStats.totalTransactions} tx</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Clock className="w-4 h-4 text-yellow-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">En escrow</p>
                <p className="text-xl font-black">€{Math.round(totalEscrow)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Sin confirmar</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Users className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Creators activos</p>
                <p className="text-xl font-black">{creatorCount}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Con transacciones</p>
              </button>
              <button onClick={() => navigate('/admin')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 text-left transition-all border border-white/10">
                <Wallet className="w-4 h-4 text-pink-400 mb-1" />
                <p className="text-[10px] text-white/60 uppercase font-bold">Retiros pendientes</p>
                <p className="text-xl font-black">{pendingWithdrawals.length}</p>
                <p className="text-[10px] text-white/50 mt-0.5">€{pendingWithdrawals.reduce((s, w) => s + w.amount, 0)}</p>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── MI PANEL (logged-in user) ── */}
      {isPerformer && myBalance && isModuleOn('creator-panel') && (
        <section className="mx-4 mt-4 bg-gradient-to-r from-brand-orange to-orange-500 rounded-3xl p-5 sm:p-6 text-white shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Mi Panel Creator</p>
              <h2 className="font-display font-black text-xl sm:text-2xl">Hola, {user!.name.split(' ')[0]} 👋</h2>
              <p className="text-white/80 text-xs mt-0.5">Comisión plataforma: {(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-brand-orange font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4" /> Abrir Dashboard
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Clock className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">En escrow</p>
              <p className="text-xl font-black">€{myBalance.inEscrow}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Wallet className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Disponible</p>
              <p className="text-xl font-black">€{myBalance.available}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Briefcase className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Ofertas pendientes</p>
              <p className="text-xl font-black">{pendingOffersCount}</p>
            </button>
            <button onClick={() => navigate('/dashboard')} className="bg-white/15 hover:bg-white/25 rounded-2xl p-3 text-left transition-all">
              <Star className="w-4 h-4 text-white/80 mb-1" />
              <p className="text-[10px] text-white/70 uppercase font-bold">Próximas clases</p>
              <p className="text-xl font-black">{upcomingClassesCount}</p>
            </button>
          </div>
        </section>
      )}

      {isBuyer && myPendingOrders.length > 0 && isModuleOn('buyer-alert') && (
        <section className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-3xl p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Tienes {myPendingOrders.length} pedido(s) por confirmar</p>
              <p className="text-xs text-gray-500">Confirma el servicio para liberar el pago al creador.</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-orange text-sm">Ver mis pedidos</button>
        </section>
      )}

      {/* ── RADIO BAR ── */}
      {isModuleOn('radio') && (
      <section className="mx-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RADIO_STATIONS.map((station, i) => (
          <div key={i} className="card-white flex items-center gap-4 p-4 rounded-2xl">
            <img
              src={station.img}
              alt={station.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{station.name}</p>
              <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                {station.sub}
              </p>
            </div>
            <button
              onClick={() => setPlaying(playing === i ? null : i)}
              className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white text-gray-500 flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-all flex-shrink-0"
            >
              {playing === i
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>
        ))}
      </section>
      )}

      {/* ── RUTA DE HOY ── */}
      {isModuleOn('ruta') && (
      <section className="mx-4 mt-6">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-brand-orange rounded-full" />
            <h2 className="font-display font-bold text-base text-gray-900 uppercase tracking-wide">La Ruta de Hoy</h2>
          </div>
          <button onClick={() => navigate('/comunidad')} className="section-link text-xs">Ver más rutas →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {COMMUNITY_POSTS.map(post => (
            <div key={post.id} className="flex-shrink-0 w-60 card-white p-3 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <Avatar
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.user)}&background=F97316&color=fff&size=80`}
                  name={post.user} size="xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-semibold text-xs">{post.user}</p>
                  <p className="text-gray-500 text-xs line-clamp-2 mt-0.5">{post.text}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className={`${post.status === 'APROBADO' ? 'tag-green' : 'tag-red'} text-[10px]`}>
                  {post.status}
                </span>
                {isAuthenticated && (
                  <>
                    <button className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 transition-colors font-semibold">
                      <Check className="w-3 h-3" /> Aprobar
                    </button>
                    <button className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-semibold">
                      <X className="w-3 h-3" /> Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── SEARCH ── */}
      <section className="mx-4 mt-6">
        <SearchBar
          placeholder="Buscar DJs, bailarines, eventos, ciudades..."
          value={search}
          onChange={setSearch}
          onSearch={() => navigate(`/explorar?q=${search}`)}
        />
      </section>

      {/* ── CATEGORÍAS (CMS-driven) ── */}
      {isModuleOn('categories') && (
      <section className="mx-4 mt-10">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-2xl text-gray-900">Categorías</h2>
          <p className="text-blue-500 text-sm mt-1">
            Descubre lo mejor de Madrid: eventos, artistas, vida nocturna y mucho más.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CATEGORY_CARDS.map(cat => (
            <button
              key={cat.name}
              onClick={() => navigate(cat.to)}
              className="relative rounded-2xl overflow-hidden group text-left"
              style={{ height: 220 }}
            >
              <img
                src={cat.img}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">CATEGORÍA</p>
                <p className="text-white font-display font-black text-lg leading-tight mb-3">{cat.name}</p>
                <span className={`inline-block ${cat.btnColor} text-white text-xs font-bold px-4 py-1.5 rounded-full`}>
                  VER MÁS
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* CMS dynamic categories (chips) — admin-managed extras */}
        {dynamicCats.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {dynamicCats.map(c => (
              <button key={c.id}
                onClick={() => navigate(`/eventos?cat=${c.slug}`)}
                className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all hover:scale-105"
                style={{ backgroundColor: c.color + '15', color: c.color, borderColor: c.color + '40' }}>
                <span className="mr-1">{c.icon}</span>{c.name}
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {/* ── LOCALIDADES ── */}
      <section className="mx-4 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-black text-lg text-gray-900">📍 Localidades</h2>
          <button onClick={() => navigate('/venues')} className="text-brand-orange text-sm font-semibold flex items-center gap-1">
            Ver más <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {VENUES.slice(0, 5).map(v => (
            <button key={v.id} onClick={() => navigate(`/venues/${v.id}`)}
              className="card-white rounded-xl overflow-hidden text-left hover:shadow-card-hover transition-all">
              <img src={v.cover} alt={v.name} className="w-full h-24 object-cover" />
              <div className="p-3">
                <p className="text-gray-900 font-semibold text-xs truncate">{v.name}</p>
                <p className="text-gray-400 text-[10px] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{v.city}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-600 font-medium">{v.rating}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── DONDE SALIR A BAILAR EN LA CIUDAD ── */}
      {isModuleOn('cities') && (
      <section className="mx-4 mt-10">
        <div className="section-head mb-4">
          <div>
            <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
              Donde Salir a Bailar en la Ciudad
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">Explora las mejores ciudades del mundo latino por su comunidad.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Row 1: 3 cities */}
          {CITIES.slice(0, 3).map(city => (
            <button
              key={city.name}
              onClick={() => navigate(`/venues?city=${city.name}`)}
              className="relative rounded-2xl overflow-hidden group"
              style={{ height: 160 }}
            >
              <img
                src={city.img}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-white font-display font-bold text-base leading-tight">{city.name}</p>
                <p className="text-white/70 text-xs mt-0.5">{city.venues} Localidades • {city.events} Eventos</p>
              </div>
            </button>
          ))}
          {/* Row 2: 2 cities + ver más */}
          {CITIES.slice(3, 5).map(city => (
            <button
              key={city.name}
              onClick={() => navigate(`/venues?city=${city.name}`)}
              className="relative rounded-2xl overflow-hidden group"
              style={{ height: 160 }}
            >
              <img
                src={city.img}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
              <div className="absolute bottom-3 left-3 text-left">
                <p className="text-white font-display font-bold text-base leading-tight">{city.name}</p>
                <p className="text-white/70 text-xs mt-0.5">{city.venues} Localidades • {city.events} Eventos</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => navigate('/venues')}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-orange transition-all group"
            style={{ height: 160 }}
          >
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 group-hover:bg-brand-orange/20 flex items-center justify-center mb-2 transition-all">
              <ArrowRight className="w-5 h-5 text-brand-orange" />
            </div>
            <p className="text-brand-orange text-xs font-bold text-center px-2 uppercase tracking-wide">Ver Más Ciudades</p>
          </button>
        </div>
      </section>
      )}

      {/* ── ARTISTAS Y BAILARINES ── */}
      {isModuleOn('artists') && (
      <section className="mx-4 mt-10">
        <div className="section-head mb-4">
          <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
            Artistas y Bailarines
          </h2>
          <button onClick={() => navigate('/artistas')} className="text-brand-orange text-sm font-bold hover:underline flex items-center gap-1">
            Ver Todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {ARTISTS.slice(0, 6).map(artist => (
            <ArtistCard key={artist.id} artist={artist} onClick={() => navigate(`/artistas/${artist.id}`)} />
          ))}
        </div>
      </section>
      )}

      {/* ── PRÓXIMOS EVENTOS (CTA module) ── */}
      {isModuleOn('cta') && (
      <section className="mx-4 mt-10 mb-12">
        <div className="section-head mb-4">
          <h2 className="font-display font-black text-lg text-gray-900 uppercase tracking-wide">
            Próximos Eventos
          </h2>
          <button onClick={() => navigate('/eventos')} className="text-brand-orange text-sm font-bold hover:underline flex items-center gap-1">
            Ver Todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {EVENTS.slice(0, 6).map(event => (
            <EventCard key={event.id} event={event} onClick={() => navigate(`/eventos/${event.id}`)} />
          ))}
        </div>
      </section>
      )}
    </div>
  );
};

// ── ARTIST CARD ─────────────────────────────────────────────────────────────
const ArtistCard: React.FC<{ artist: typeof ARTISTS[0]; onClick: () => void }> = ({ artist, onClick }) => (
  <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group rounded-2xl">
    <div className="relative overflow-hidden" style={{ height: 200 }}>
      <img
        src={artist.cover}
        alt={artist.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {artist.isPremium && (
        <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
          DESTACADO
        </span>
      )}
    </div>
    <div className="p-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-brand-orange text-xs font-bold uppercase tracking-wide">{artist.genre[0]}</p>
        <h3 className="font-display font-bold text-gray-900 text-sm mt-0.5 truncate">{artist.name}</h3>
        <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {artist.city}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Star className="w-3.5 h-3.5 fill-brand-orange text-brand-orange" />
          <span className="text-gray-700 text-xs font-semibold">{artist.rating}</span>
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onClick(); }}
        className="flex-shrink-0 border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:border-brand-orange hover:text-brand-orange transition-all whitespace-nowrap"
      >
        Ver Perfil
      </button>
    </div>
  </div>
);

// ── EVENT CARD ──────────────────────────────────────────────────────────────
const EventCard: React.FC<{ event: typeof EVENTS[0]; onClick: () => void }> = ({ event, onClick }) => {
  const d = new Date(event.date);
  const day = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }).toUpperCase();

  return (
    <div onClick={onClick} className="card-white overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group rounded-2xl">
      <div className="relative overflow-hidden" style={{ height: 180 }}>
        <img
          src={event.cover}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">{day}</span>
        </div>
        {event.isFeatured && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
            DESTACADO
          </span>
        )}
      </div>
      <div className="p-4">
        <span className="tag-orange text-[10px] mb-2 inline-block">{event.category[0] || 'Evento'}</span>
        <h3 className="font-display font-bold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">{event.title}</h3>
        <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {event.venueName}, {event.city}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-gray-700 text-sm font-semibold">Desde €{event.price}</p>
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            className="btn-orange text-xs px-3 py-1.5"
          >
            {event.price === 0 ? 'GRATIS' : 'ENTRADAS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
