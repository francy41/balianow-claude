import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Calendar, MessageSquare, Settings, Bell, Edit3, CheckCircle } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Avatar, Badge, Button, Card, Tabs } from '../components/ui';
import { SERVICES, EVENTS } from '../data/mockData';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<'overview' | 'bookings' | 'services' | 'analytics'>('overview');

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mi Dashboard</h2>
          <p className="text-gray-400 mb-6">Inicia sesión para ver tu panel</p>
          <Button variant="orange" onClick={() => navigate('/auth')}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  const isArtist = ['artist', 'dj', 'dancer', 'instructor'].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="card-white rounded-3xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-brand-orange to-orange-400 opacity-10" />
          <div className="relative flex items-end gap-4">
            <Avatar src={user.avatar} name={user.name} size="xl" />
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-2xl text-gray-900">{user.name}</h1>
                {user.isVerified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                {user.isPremium && <Badge variant="orange">👑 PRO</Badge>}
              </div>
              <p className="text-gray-400 capitalize">{user.role} · {user.city}</p>
            </div>
            <Button variant="ghost" size="sm" icon={<Edit3 className="w-4 h-4" />}
              onClick={() => addToast({ message: 'Editor de perfil próximamente', type: 'info' })}>
              Editar
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { value: `€${user.wallet.toFixed(0)}`, label: 'Wallet' },
              { value: String(user.notifications), label: 'Notif.' },
              { value: isArtist ? '4.9' : '0', label: isArtist ? 'Rating' : 'Reservas' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <MessageSquare className="w-5 h-5" />, label: 'Mensajes', to: '/chat', count: user.notifications },
            { icon: <Calendar className="w-5 h-5" />, label: 'Eventos', to: '/eventos' },
            { icon: <Wallet className="w-5 h-5" />, label: 'Wallet', to: '/wallet' },
            { icon: <Settings className="w-5 h-5" />, label: 'Suscripción', to: '/subscripciones' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.to)}
              className="card-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-card-hover transition-all relative">
              <span className="text-brand-orange">{action.icon}</span>
              <span className="text-gray-700 text-sm font-semibold">{action.label}</span>
              {action.count ? (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {action.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Resumen' },
            { id: 'bookings', label: 'Bookings' },
            ...(isArtist ? [{ id: 'services', label: 'Servicios' }] : []),
            { id: 'analytics', label: 'Analytics' },
          ]}
          active={tab}
          onChange={(v) => setTab(v as typeof tab)}
          className="mb-6"
        />

        {tab === 'overview' && <OverviewTab user={user} navigate={navigate} addToast={addToast} />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'services' && isArtist && <ServicesTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
};

const OverviewTab: React.FC<{ user: any; navigate: ReturnType<typeof useNavigate>; addToast: any }> = ({ user, navigate, addToast }) => (
  <div className="space-y-4">
    {!user.isPremium && (
      <div className="card-white rounded-2xl p-4 border-l-4 border-brand-orange">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👑</span>
          <div className="flex-1">
            <p className="text-gray-900 font-semibold">Activa tu plan Premium</p>
            <p className="text-gray-400 text-xs">Visibilidad premium desde €9/mes</p>
          </div>
          <Button variant="orange" size="sm" onClick={() => navigate('/subscripciones')}>Ver planes</Button>
        </div>
      </div>
    )}

    <div className="card-white rounded-2xl p-4">
      <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4 text-brand-orange" /> Actividad reciente
      </h3>
      <div className="space-y-2">
        {[
          { icon: '💬', text: 'DJ Mambo King te envió un mensaje', time: 'Hace 2h', action: () => navigate('/chat') },
          { icon: '📅', text: 'Tienes una reserva el 7 de junio', time: 'Hace 5h', action: () => {} },
          { icon: '⭐', text: 'Nuevo comentario en tu perfil', time: 'Ayer', action: () => {} },
        ].map((item, i) => (
          <button key={i} onClick={item.action}
            className="w-full flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-colors text-left">
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1">
              <p className="text-gray-700 text-sm">{item.text}</p>
              <p className="text-gray-400 text-xs">{item.time}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className="card-white rounded-2xl p-4">
      <h3 className="text-gray-900 font-semibold mb-3">🎉 Eventos recomendados</h3>
      <div className="space-y-2">
        {EVENTS.slice(0, 3).map(event => (
          <button key={event.id} onClick={() => navigate(`/eventos/${event.id}`)}
            className="w-full flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-orange-50 transition-all text-left border border-transparent hover:border-orange-100">
            <img src={event.cover} alt="" className="w-12 h-10 object-cover rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate">{event.title}</p>
              <p className="text-gray-400 text-xs">{event.city} · {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
            </div>
            <span className="text-brand-orange font-bold text-sm flex-shrink-0">€{event.price}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const BookingsTab: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  return (
    <div className="space-y-3">
      {[
        { artist: 'DJ Mambo King',     date: '7 Jun 2026',  status: 'confirmed',  amount: 450 },
        { artist: 'La Reina del Ritmo', date: '24 May 2026', status: 'pending',    amount: 120 },
        { artist: 'Instructora Celia', date: '20 May 2026', status: 'completed',  amount: 80 },
      ].map((booking, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-semibold">{booking.artist}</p>
              <p className="text-gray-400 text-sm">{booking.date}</p>
            </div>
            <div className="text-right">
              <Badge variant={booking.status === 'confirmed' ? 'green' : booking.status === 'pending' ? 'blue' : 'gray'}>
                {booking.status === 'confirmed' ? '✅ Confirmado' : booking.status === 'pending' ? '⏳ Pendiente' : '✓ Completado'}
              </Badge>
              <p className="text-brand-orange font-bold mt-1">€{booking.amount}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/chat')} className="flex-1">💬 Chat</Button>
            {booking.status === 'pending' && (
              <Button variant="danger" size="sm" onClick={() => addToast({ message: 'Cancelación enviada', type: 'info' })}>Cancelar</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

const ServicesTab: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  return (
    <div className="space-y-3">
      <Button variant="orange" onClick={() => addToast({ message: 'Creación de servicios próximamente', type: 'info' })} className="w-full">
        + Crear Nuevo Servicio
      </Button>
      {SERVICES.slice(0, 3).map(service => (
        <Card key={service.id} className="p-4 cursor-pointer hover:shadow-card-hover" onClick={() => navigate(`/marketplace/${service.id}`)}>
          <div className="flex gap-3">
            <img src={service.cover} alt="" className="w-16 h-14 object-cover rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <p className="text-gray-900 font-medium text-sm">{service.title}</p>
              <p className="text-gray-400 text-xs mt-1">⭐ {service.rating} · {service.orders} pedidos</p>
              <p className="text-brand-orange font-bold mt-1">€{service.price}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const AnalyticsTab: React.FC = () => (
  <div className="space-y-4">
    {[
      { label: 'Visitas al perfil (este mes)', value: '1,247', change: '+23%', up: true },
      { label: 'Contactos recibidos',           value: '18',    change: '+8%',  up: true },
      { label: 'Bookings completados',           value: '4',     change: '0%',   up: true },
      { label: 'Ingresos del mes',               value: '€1,620', change: '+41%', up: true },
    ].map(stat => (
      <Card key={stat.label} className="p-4 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{stat.label}</p>
          <p className="text-gray-900 font-black text-2xl mt-0.5">{stat.value}</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${stat.up ? 'text-emerald-600' : 'text-red-500'}`}>
          <TrendingUp className="w-4 h-4" /> {stat.change}
        </div>
      </Card>
    ))}
    <div className="card-white rounded-2xl p-6 text-center border border-orange-100 bg-orange-50">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-gray-500 text-sm">Gráficos detallados disponibles en plan Premium</p>
      <button className="mt-3 btn-orange text-sm py-2 px-4 rounded-lg">Ver planes</button>
    </div>
  </div>
);

export default DashboardPage;
