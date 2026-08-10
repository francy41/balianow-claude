import React, { useState, useMemo, useEffect } from 'react';
import { safeSocialUrl } from '../lib/security';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Wallet, BookOpen, Calendar as CalIcon, Video, Briefcase,
  Plus, Trash2, Edit3, CheckCircle, X, Check, ExternalLink, Clock,
  TrendingUp, Users, Star, DollarSign, Eye, Play, AlertCircle, CreditCard, Shield
} from 'lucide-react';
import {
  useAuthStore, useUIStore, usePerformerStore, useSiteConfigStore, useOrdersStore,
  PLATFORM_COMMISSION_RATE, splitAmount, computeCommissionRate,
  type Course, type OfferRequest, type Withdrawal, type PayoutMethod
} from '../store/appStore';
import { Avatar, Badge, Button } from '../components/ui';
import PaymentMethodsPanel from '../components/PaymentMethodsPanel';
import TicketSalesTab from '../components/TicketSalesTab';
import ProfileEditModal from '../components/ProfileEditModal';
import { BuyerTable, QRScanner } from '../components/BuyerManagement';
import { QrCode, Scan } from 'lucide-react';
import TeacherClassesPanel from '../components/TeacherClassesPanel';
import ClassReviewModal from '../components/ClassReviewModal';
import { QRCodeCanvas, downloadTicketQR } from '../components/QRTicket';

type TabId = 'overview' | 'earnings' | 'payouts' | 'payments' | 'courses' | 'calendar' | 'classes' | 'offers' | 'buyers' | 'scanner' | 'events' | 'ventas';

// Tabs "core" (financieros/operativos) — siempre visibles, no se controlan por módulos.
// Tabs con `module` se muestran solo si el módulo global está activo (Admin → Categorías).
const TABS: { id: TabId; label: string; icon: React.ReactNode; module?: string }[] = [
  { id: 'overview', label: 'Resumen',       icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'earnings', label: 'Ganancias',     icon: <Wallet className="w-4 h-4" />,     module: 'earnings' },
  { id: 'payouts',  label: 'Cobrar',        icon: <DollarSign className="w-4 h-4" />, module: 'payouts' },
  { id: 'payments', label: 'Pagar',         icon: <CreditCard className="w-4 h-4" />, module: 'payments' },
  { id: 'buyers',   label: 'Compradores',   icon: <Users className="w-4 h-4" />,      module: 'buyers' },
  { id: 'scanner',  label: 'Escanear QR',   icon: <QrCode className="w-4 h-4" />,     module: 'scanner' },
  { id: 'courses',  label: 'Cursos',        icon: <BookOpen className="w-4 h-4" />,  module: 'courses' },
  { id: 'calendar', label: 'Calendario',    icon: <CalIcon className="w-4 h-4" />,   module: 'calendar' },
  { id: 'classes',  label: 'Clases Online', icon: <Video className="w-4 h-4" />,     module: 'classes' },
  { id: 'events',   label: 'Eventos',       icon: <CalIcon className="w-4 h-4" />,    module: 'events' },
  { id: 'ventas',   label: 'Ventas entradas', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'offers',   label: 'Ofertas',       icon: <Briefcase className="w-4 h-4" />, module: 'offers' },
];

const PERFORMER_ROLES = ['artist', 'dj', 'dancer', 'venue', 'instructor', 'admin', 'superadmin', 'business', 'promoter'];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [tab, setTab] = useState<TabId>(initialTab);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
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

  const isPerformer = PERFORMER_ROLES.includes(user.role);
  const performerId = user.id;

  // Filtra tabs por módulos globales (Admin → Categorías). Core tabs siempre visibles.
  const { profileModules } = useSiteConfigStore();
  const isModuleOn = (modId?: string) => !modId || profileModules.find(m => m.id === modId)?.enabled !== false;
  const visibleTabs = TABS.filter(t => isModuleOn(t.module));

  // Si el tab activo queda oculto al desactivar un módulo, vuelve a Resumen
  useEffect(() => {
    if (!visibleTabs.some(t => t.id === tab)) setTab('overview');
  }, [profileModules]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header con portada */}
        <div className="card-white rounded-3xl mb-6 relative overflow-hidden">
          <div className="relative h-32 sm:h-40 bg-brand-orange overflow-hidden">
            {user.coverPhoto && <img src={user.coverPhoto} alt="" className="w-full h-full object-cover" />}
            <button onClick={() => setShowProfileEdit(true)}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
              <Edit3 className="w-3.5 h-3.5" /> Editar perfil
            </button>
          </div>
          <div className="p-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
              <div className="ring-4 ring-white rounded-full">
                <Avatar src={user.avatar} name={user.name} size="xl" />
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display font-black text-2xl text-gray-900">{user.name}</h1>
                  {user.isVerified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                  {user.isPremium && <Badge variant="orange">👑 PRO</Badge>}
                  {isPerformer && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase">Panel Creator</span>}
                </div>
                <p className="text-gray-400 capitalize">{user.role} · {user.city}{user.country ? `, ${user.country}` : ''}</p>
                {user.bio && <p className="text-gray-600 text-sm mt-2 max-w-2xl">{user.bio}</p>}
                {user.socials && Object.values(user.socials).some(v => v) && (
                  <div className="flex gap-2 mt-2">
                    {Object.entries(user.socials).filter(([, v]) => v).map(([k, v]) => {
                      const url = safeSocialUrl(k, v);
                      if (!url) return null;
                      return (
                        <a key={k} href={url}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[10px] bg-gray-100 hover:bg-brand-orange hover:text-white text-gray-700 font-bold px-2 py-0.5 rounded transition-colors uppercase">
                          {k}
                        </a>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  💰 Comisión plataforma: <span className="font-bold text-brand-orange">{(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%</span> en todas las transacciones
                </p>
              </div>
              {isPerformer && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/artistas/${user.id}`)}>
                  Ver perfil público
                </Button>
              )}
            </div>
          </div>
        </div>

        <ProfileEditModal open={showProfileEdit} onClose={() => setShowProfileEdit(false)} />

        {isPerformer ? (
          <>
            {/* Tabs */}
            <div className="card-white rounded-2xl p-1.5 mb-6 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {visibleTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    tab === t.id
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === 'overview' && <OverviewTab performerId={performerId} onNavigate={setTab} />}
            {tab === 'earnings' && <EarningsTab performerId={performerId} performerName={user.name} />}
            {tab === 'payouts'  && <PayoutsTab  performerId={performerId} performerName={user.name} />}
            {tab === 'payments' && (
              <PaymentMethodsPanel
                userId={user.id}
                holderDefault={user.name}
                title="Mis métodos de pago"
                subtitle="Tarjetas y cuentas que usarás para reservar servicios, clases y eventos."
              />
            )}
            {tab === 'courses'  && <CoursesTab  performerId={performerId} />}
            {tab === 'calendar' && <CalendarTab performerId={performerId} />}
            {tab === 'classes'  && <TeacherClassesPanel />}
            {tab === 'offers'   && <OffersTab   performerId={performerId} />}
            {tab === 'buyers'   && (
              <div>
                <h2 className="font-display font-black text-xl text-gray-900 mb-1">👥 Compradores y Reservas</h2>
                <p className="text-gray-400 text-sm mb-4">Gestiona los compradores de tus eventos</p>
                <div className="mb-4">
                  <select className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white">
                    <option value="e1">Salsa & Bachata Night — Gran Gala</option>
                    <option value="e3">Festival Latino BCN 2026</option>
                  </select>
                </div>
                <BuyerTable eventId="e1" />
              </div>
            )}
            {tab === 'scanner'  && (
              <div>
                <h2 className="font-display font-black text-xl text-gray-900 mb-1">📷 Escanear Entradas</h2>
                <p className="text-gray-400 text-sm mb-4">Valida tickets QR en la puerta del evento</p>
                <QRScanner eventId="e1" />
              </div>
            )}
            {tab === 'events'   && <EventsManagerTab performerId={performerId} />}
            {tab === 'ventas'   && <TicketSalesTab performerId={performerId} />}
          </>
        ) : (
          <FanDashboard userId={user.id} userName={user.name} />
        )}
      </div>
    </div>
  );
};

// ── EVENTOS ───────────────────────────────────────────────────────────────
const EventsManagerTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.from('events').select('id,title,city,date,price,attending,capacity,image_url,cover')
      .or(`user_id.eq.${performerId},owner_id.eq.${performerId}`)
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(data || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [performerId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-black text-xl text-gray-900 mb-1">🎉 Mis Eventos</h2>
          <p className="text-gray-400 text-sm">Crea y gestiona los eventos que organizas</p>
        </div>
        <Button variant="orange" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/eventos')}>
          Ver eventos
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-brand-orange border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="card-white rounded-2xl p-10 text-center">
          <div className="text-5xl mb-3">🎫</div>
          <p className="font-bold text-gray-700">Aún no tienes eventos</p>
          <p className="text-gray-400 text-sm mt-1">Cuando organices un evento aparecerá aquí para que gestiones entradas y asistentes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => {
            const pct = ev.capacity ? Math.round(((ev.attending || 0) / ev.capacity) * 100) : 0;
            return (
              <button key={ev.id} onClick={() => navigate(`/eventos/${ev.id}`)}
                className="card-white rounded-2xl overflow-hidden text-left hover:shadow-card-hover transition-all">
                <div className="h-28 bg-gray-100 overflow-hidden">
                  {(ev.image_url || ev.cover) && <img src={ev.image_url || ev.cover} alt={ev.title} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-sm truncate">{ev.title}</p>
                  <p className="text-[11px] text-gray-400">{ev.city} · {ev.date ? new Date(ev.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">{ev.attending || 0}/{ev.capacity || '∞'} asistentes</span>
                    <span className="font-bold text-brand-orange">€{ev.price || 0}</span>
                  </div>
                  {ev.capacity ? (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                      <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-brand-orange'}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── OVERVIEW ──────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ performerId: string; onNavigate: (t: TabId) => void }> = ({ performerId, onNavigate }) => {
  const { totalsFor, courses, offers, classes } = usePerformerStore();
  const totals = totalsFor(performerId);
  const myCourses = courses.filter(c => c.performerId === performerId);
  const pendingOffers = offers.filter(o => o.performerId === performerId && o.status === 'pending');
  const upcoming = classes.filter(c => c.performerId === performerId && c.status === 'scheduled');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Neto este mes" value={`€${totals.netThisMonth}`} sub={`Bruto €${totals.grossThisMonth}`} icon={<TrendingUp className="w-5 h-5" />} color="green" />
        <StatCard label="Comisión 15%" value={`€${totals.commissionThisMonth}`} sub="Pagado a plataforma" icon={<DollarSign className="w-5 h-5" />} color="orange" />
        <StatCard label="Cursos" value={String(myCourses.length)} sub={`${myCourses.reduce((s, c) => s + c.enrolledCount, 0)} alumnos`} icon={<BookOpen className="w-5 h-5" />} color="purple" />
        <StatCard label="Ofertas pendientes" value={String(pendingOffers.length)} sub="Por responder" icon={<Briefcase className="w-5 h-5" />} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Próximas clases online</h3>
            <button onClick={() => onNavigate('classes')} className="text-brand-orange text-xs font-semibold">Ver todas →</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No tienes clases programadas</p>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.topic}</p>
                    <p className="text-xs text-gray-400">{c.clientName} · {new Date(c.scheduledAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-orange">€{c.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Ofertas pendientes</h3>
            <button onClick={() => onNavigate('offers')} className="text-brand-orange text-xs font-semibold">Ver todas →</button>
          </div>
          {pendingOffers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No tienes ofertas nuevas</p>
          ) : (
            <div className="space-y-2">
              {pendingOffers.slice(0, 3).map(o => (
                <div key={o.id} className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                  <Avatar src={o.clientAvatar} name={o.clientName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{o.title}</p>
                    <p className="text-xs text-gray-400">{o.clientName} · {o.date}</p>
                  </div>
                  <span className="text-sm font-black text-brand-orange">€{o.proposedPrice}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode; color: 'green' | 'orange' | 'purple' | 'pink' }> = ({ label, value, sub, icon, color }) => {
  const colors = {
    green:  'bg-green-50 text-green-600',
    orange: 'bg-pink-50 text-brand-orange',
    purple: 'bg-purple-50 text-purple-600',
    pink:   'bg-pink-50 text-pink-600',
  };
  return (
    <div className="card-white p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

// ── PAYOUTS TAB (Stripe Connect / PayPal / Bank) ──────────────────────────
const PayoutsTab: React.FC<{ performerId: string; performerName: string }> = ({ performerId, performerName }) => {
  const { payoutMethods, addPayoutMethod, removePayoutMethod, verifyPayoutMethod, setDefaultPayoutMethod } = usePerformerStore();
  const { addToast } = useUIStore();
  const mine = payoutMethods.filter(p => p.performerId === performerId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'paypal' as PayoutMethod['type'], account: '', holderName: performerName });

  const submit = () => {
    if (!form.account.trim()) { addToast({ message: 'Introduce la cuenta', type: 'error' }); return; }
    addPayoutMethod({
      performerId, type: form.type,
      account: form.account.trim(),
      holderName: form.holderName.trim() || performerName,
      isDefault: mine.length === 0,
    });
    addToast({ message: 'Método de pago añadido. Verificación pendiente.', type: 'success' });
    setShowForm(false);
    setForm({ type: 'paypal', account: '', holderName: performerName });
  };

  const TYPE_INFO: Record<PayoutMethod['type'], { icon: string; label: string; placeholder: string }> = {
    stripe: { icon: '💳', label: 'Stripe Connect',         placeholder: 'acct_xxxxx (ID Stripe Connect)' },
    paypal: { icon: '🅿️', label: 'PayPal',                 placeholder: 'tu-email@paypal.com' },
    bank:   { icon: '🏦', label: 'Transferencia bancaria', placeholder: 'IBAN ESxx xxxx xxxx xxxx' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-black text-xl text-gray-900">Métodos de payout</h2>
          <p className="text-gray-400 text-sm">Configura dónde quieres recibir tus ganancias. Necesitarás un método verificado para retirar.</p>
        </div>
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Añadir método'}
        </Button>
      </div>

      {showForm && (
        <div className="card-white p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['stripe', 'paypal', 'bank'] as const).map(t => (
              <button key={t} onClick={() => setForm({ ...form, type: t })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  form.type === t ? 'border-brand-orange bg-pink-50' : 'border-gray-200 bg-white hover:border-brand-orange/50'
                }`}>
                <div className="text-2xl mb-1">{TYPE_INFO[t].icon}</div>
                <p className="text-sm font-bold text-gray-900">{TYPE_INFO[t].label}</p>
              </button>
            ))}
          </div>
          <input value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })}
            placeholder="Titular de la cuenta" className="input-field" />
          <input value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}
            placeholder={TYPE_INFO[form.type].placeholder} className="input-field" />
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-gray-700 flex items-start gap-2">
            <Shield className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            Tu identidad será verificada por la plataforma antes de habilitar retiros (KYC).
          </div>
          <Button variant="orange" className="w-full" onClick={submit}>Guardar método</Button>
        </div>
      )}

      <div className="space-y-3">
        {mine.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no tienes métodos de payout configurados.</p>
          </div>
        )}
        {mine.map(m => (
          <div key={m.id} className="card-white p-5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="text-3xl">{TYPE_INFO[m.type].icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900">{TYPE_INFO[m.type].label}</p>
                {m.isDefault && <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold uppercase">Default</span>}
                {m.verified
                  ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">✓ Verificado</span>
                  : <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase">Pendiente KYC</span>
                }
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{m.holderName}</p>
              <p className="text-xs text-gray-400 font-mono">{m.account}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!m.verified && (
                <button onClick={() => { verifyPayoutMethod(m.id); addToast({ message: 'Método verificado (mock KYC)', type: 'success' }); }}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-bold px-3 py-1.5 rounded-lg">Verificar</button>
              )}
              {!m.isDefault && (
                <button onClick={() => setDefaultPayoutMethod(performerId, m.id)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg">Hacer default</button>
              )}
              <button onClick={() => { removePayoutMethod(m.id); addToast({ message: 'Método eliminado', type: 'info' }); }}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-bold p-1.5 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── EARNINGS ──────────────────────────────────────────────────────────────
const EarningsTab: React.FC<{ performerId: string; performerName: string }> = ({ performerId, performerName }) => {
  const { transactions, withdrawals, totalsFor, balanceFor, requestWithdrawal, monthlyRevenue } = usePerformerStore();
  const { addToast } = useUIStore();
  const tx = transactions.filter(t => t.performerId === performerId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const totals = totalsFor(performerId);
  const balance = balanceFor(performerId);
  const myWithdrawals = withdrawals.filter(w => w.performerId === performerId).sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
  const [showForm, setShowForm] = useState(false);
  const [wAmount, setWAmount] = useState('');
  const [wMethod, setWMethod] = useState<Withdrawal['method']>('paypal');

  const submitWithdraw = () => {
    const amt = parseFloat(wAmount);
    if (!amt || amt <= 0) { addToast({ message: 'Importe inválido', type: 'error' }); return; }
    if (amt > balance.available) { addToast({ message: 'Importe mayor al disponible', type: 'error' }); return; }
    const ok = requestWithdrawal(performerId, performerName, amt, wMethod);
    if (ok) {
      addToast({ message: `Retiro de €${amt} solicitado. Aprobación admin pendiente.`, type: 'success' });
      setShowForm(false); setWAmount('');
    }
  };

  const statusLabels = {
    pending:   { label: 'En escrow',  cls: 'bg-yellow-50 text-yellow-700' },
    released:  { label: 'Disponible', cls: 'bg-green-50 text-green-700' },
    withdrawn: { label: 'Retirado',   cls: 'bg-gray-100 text-gray-600' },
    refunded:  { label: 'Reembolsado',cls: 'bg-red-50 text-red-600' },
  };

  const sourceLabels: Record<string, string> = {
    booking: '📅 Reserva', course: '🎓 Curso', class: '🎥 Clase online', offer: '💼 Oferta', tip: '💝 Propina'
  };

  return (
    <div className="space-y-4">
      {/* Balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="En escrow"        value={`€${balance.inEscrow}`}  sub="Esperando confirmación del comprador" icon={<Clock className="w-5 h-5" />} color="orange" />
        <StatCard label="Disponible"       value={`€${balance.available}`} sub="Listo para retirar"                   icon={<Wallet className="w-5 h-5" />} color="green" />
        <StatCard label="Retirado"         value={`€${balance.withdrawn}`} sub="Histórico"                            icon={<DollarSign className="w-5 h-5" />} color="purple" />
        <StatCard label="Comisión mes"     value={`€${totals.commissionThisMonth}`} sub="Plataforma (mes actual)"     icon={<TrendingUp className="w-5 h-5" />} color="pink" />
      </div>

      {/* Monthly chart */}
      {(() => {
        const data = monthlyRevenue(performerId, 6);
        const max = Math.max(...data.map(d => d.gross), 1);
        return (
          <div className="card-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Ingresos mensuales</h3>
              <span className="text-xs text-gray-400">Últimos 6 meses</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {data.map(d => (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t-lg flex-1 flex items-end overflow-hidden">
                    <div className="w-full bg-brand-orange rounded-t-lg" style={{ height: `${(d.gross / max) * 100}%`, minHeight: d.gross > 0 ? 4 : 0 }} />
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold">{d.month}</span>
                  <span className="text-[10px] text-gray-400">€{Math.round(d.net)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Retiro */}
      <div className="card-white p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Retirar mis ganancias</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Solo se libera el dinero cuando el comprador confirma que el servicio fue OK.
              Disponible ahora: <span className="font-bold text-green-600">€{balance.available}</span>
            </p>
          </div>
          <Button variant="orange" disabled={balance.available <= 0} onClick={() => setShowForm(v => !v)} icon={<DollarSign className="w-4 h-4" />}>
            {showForm ? 'Cancelar' : 'Solicitar retiro'}
          </Button>
        </div>
        {showForm && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <input type="number" placeholder={`Importe (max €${balance.available})`} value={wAmount} onChange={e => setWAmount(e.target.value)} className="input-field" />
            <select value={wMethod} onChange={e => setWMethod(e.target.value as Withdrawal['method'])} className="input-field">
              <option value="paypal">PayPal</option>
              <option value="bank">Transferencia bancaria</option>
              <option value="stripe">Stripe</option>
            </select>
            <Button variant="orange" onClick={submitWithdraw}>Confirmar retiro</Button>
          </div>
        )}
      </div>

      {/* Withdrawals history */}
      {myWithdrawals.length > 0 && (
        <div className="card-white overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Mis retiros</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {myWithdrawals.map(w => (
              <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-gray-900">€{w.amount} <span className="text-xs text-gray-400 font-normal">vía {w.method}</span></p>
                  <p className="text-xs text-gray-400">Solicitado {new Date(w.requestedAt).toLocaleDateString('es-ES')}{w.paidAt ? ` · Pagado ${new Date(w.paidAt).toLocaleDateString('es-ES')}` : ''}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  w.status === 'paid' ? 'bg-green-100 text-green-700' :
                  w.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-pink-100 text-brand-orange'
                }`}>
                  {w.status === 'paid' ? 'Pagado' : w.status === 'rejected' ? 'Rechazado' : 'Pendiente aprobación'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="card-white overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Historial de transacciones</h3>
          <span className="text-xs text-gray-400">{tx.length} movimientos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Concepto</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Bruto</th>
                <th className="text-right px-4 py-3">Comisión</th>
                <th className="text-right px-4 py-3">Neto</th>
              </tr>
            </thead>
            <tbody>
              {tx.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.date).toLocaleDateString('es-ES')}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{t.concept}</td>
                  <td className="px-4 py-3 text-gray-500">{t.clientName}</td>
                  <td className="px-4 py-3"><span className="text-xs">{sourceLabels[t.source]}</span></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${statusLabels[t.status].cls}`}>{statusLabels[t.status].label}</span></td>
                  <td className="px-4 py-3 text-right text-gray-700">€{t.gross}</td>
                  <td className="px-4 py-3 text-right text-red-500">-€{t.commission}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">€{t.net}</td>
                </tr>
              ))}
              {tx.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Aún no hay transacciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── COURSES ───────────────────────────────────────────────────────────────
const CoursesTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const { courses, addCourse, updateCourse, removeCourse } = usePerformerStore();
  const { addToast } = useUIStore();
  const myCourses = courses.filter(c => c.performerId === performerId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', price: 39, durationMin: 60,
    level: 'beginner' as Course['level'],
    thumbnail: '', videoUrl: '', isPublished: true
  });

  const submit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      addToast({ message: 'Completa título y descripción', type: 'error' });
      return;
    }
    addCourse({
      performerId,
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      durationMin: Number(form.durationMin) || 60,
      level: form.level,
      thumbnail: form.thumbnail || `https://picsum.photos/seed/${Date.now()}/400/250`,
      videoUrl: form.videoUrl,
      isPublished: form.isPublished,
    });
    setForm({ title: '', description: '', price: 39, durationMin: 60, level: 'beginner', thumbnail: '', videoUrl: '', isPublished: true });
    setShowForm(false);
    addToast({ message: 'Curso publicado', type: 'success' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-xl text-gray-900">Mis cursos</h2>
          <p className="text-gray-400 text-sm">Publica contenido formativo. La plataforma retiene 15%.</p>
        </div>
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Nuevo curso'}
        </Button>
      </div>

      {showForm && (
        <div className="card-white p-5 space-y-3">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título del curso" className="input-field" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows={3} className="input-field" />
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} placeholder="Precio €" className="input-field" />
            <input type="number" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: +e.target.value })} placeholder="Duración (min)" className="input-field" />
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value as any })} className="input-field">
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>
          <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="URL del vídeo (opcional)" className="input-field" />
          <input value={form.thumbnail} onChange={e => setForm({ ...form, thumbnail: e.target.value })} placeholder="URL miniatura (opcional)" className="input-field" />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="accent-brand-orange" />
            Publicar inmediatamente
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="orange" onClick={submit}>Publicar curso</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myCourses.map(c => {
          const split = splitAmount(c.price);
          return (
            <div key={c.id} className="card-white overflow-hidden">
              <img src={c.thumbnail} alt={c.title} className="w-full h-32 object-cover" />
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight flex-1">{c.title}</h4>
                  {!c.isPublished && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">BORRADOR</span>}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-lg font-black text-brand-orange">€{c.price}</p>
                    <p className="text-[10px] text-gray-400">Recibes €{split.net} (15% comisión)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-700 flex items-center gap-1"><Users className="w-3 h-3" /> {c.enrolledCount}</p>
                    <p className="text-[10px] text-gray-400">{c.level} · {c.durationMin}min</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => updateCourse(c.id, { isPublished: !c.isPublished })}
                    className="flex-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 py-2 rounded-lg text-gray-700"
                  >
                    {c.isPublished ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    onClick={() => { removeCourse(c.id); addToast({ message: 'Curso eliminado', type: 'info' }); }}
                    className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {myCourses.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no tienes cursos. Crea el primero.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CALENDAR ──────────────────────────────────────────────────────────────
const CalendarTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const { slots, addSlot, removeSlot } = usePerformerStore();
  const { addToast } = useUIStore();
  const mySlots = slots.filter(s => s.performerId === performerId).sort((a, b) => a.date.localeCompare(b.date));
  const [form, setForm] = useState({ date: '', startTime: '18:00', endTime: '20:00' });

  const submit = () => {
    if (!form.date) { addToast({ message: 'Elige una fecha', type: 'error' }); return; }
    addSlot({ performerId, date: form.date, startTime: form.startTime, endTime: form.endTime });
    setForm({ date: '', startTime: '18:00', endTime: '20:00' });
    addToast({ message: 'Disponibilidad añadida', type: 'success' });
  };

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof mySlots>();
    mySlots.forEach(s => {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries());
  }, [mySlots]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-black text-xl text-gray-900">Calendario de disponibilidad</h2>
        <p className="text-gray-400 text-sm">Define cuándo estás disponible para que los clientes reserven.</p>
      </div>

      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-3 text-sm">Añadir franja</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
          <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="input-field" />
          <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="input-field" />
          <Button variant="orange" onClick={submit} icon={<Plus className="w-4 h-4" />}>Añadir</Button>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(([date, daySlots]) => (
          <div key={date} className="card-white p-4">
            <p className="font-bold text-gray-900 text-sm mb-2">
              {new Date(date + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map(s => (
                <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${s.isBooked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  <Clock className="w-3 h-3" />
                  <span className="font-semibold">{s.startTime} – {s.endTime}</span>
                  {s.isBooked ? <span className="font-bold">RESERVADO</span> : <button onClick={() => removeSlot(s.id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {mySlots.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <CalIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no has añadido franjas de disponibilidad.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CLASSES ──────────────────────────────────────────────────────────────
const ClassesTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const { classes, setClassStatus, scheduleClass, recordTransaction } = usePerformerStore();
  const { addToast } = useUIStore();
  const myClasses = classes.filter(c => c.performerId === performerId).sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName: '', topic: '', scheduledAt: '', durationMin: 60, price: 60 });

  const submit = () => {
    if (!form.clientName || !form.topic || !form.scheduledAt) {
      addToast({ message: 'Completa todos los campos', type: 'error' }); return;
    }
    scheduleClass({
      performerId,
      clientName: form.clientName,
      clientId: 'u_' + Date.now(),
      topic: form.topic,
      scheduledAt: new Date(form.scheduledAt),
      durationMin: Number(form.durationMin),
      price: Number(form.price),
    });
    setShowForm(false);
    setForm({ clientName: '', topic: '', scheduledAt: '', durationMin: 60, price: 60 });
    addToast({ message: 'Clase programada', type: 'success' });
  };

  const startClass = (id: string) => {
    setClassStatus(id, 'live');
    addToast({ message: 'Clase en directo iniciada — pago retenido en escrow', type: 'success' });
  };
  const finishClass = (c: typeof myClasses[0]) => {
    setClassStatus(c.id, 'completed');
    const tx = recordTransaction({
      performerId: c.performerId, clientName: c.clientName,
      concept: `Clase online: ${c.topic}`, gross: c.price,
      status: 'released', source: 'class'
    });
    addToast({ message: `Clase completada. +€${tx.net} (comisión €${tx.commission})`, type: 'success' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-xl text-gray-900">Clases online</h2>
          <p className="text-gray-400 text-sm">Sesiones 1:1 con tus clientes. Comisión 15% al completarse.</p>
        </div>
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Programar clase'}
        </Button>
      </div>

      {showForm && (
        <div className="card-white p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Nombre del cliente" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} className="input-field" />
          <input placeholder="Tema de la clase" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="input-field" />
          <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
          <input type="number" placeholder="Duración (min)" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: +e.target.value })} className="input-field" />
          <input type="number" placeholder="Precio €" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} className="input-field" />
          <Button variant="orange" onClick={submit}>Programar</Button>
        </div>
      )}

      <div className="space-y-3">
        {myClasses.map(c => {
          const split = splitAmount(c.price);
          const isLive = c.status === 'live';
          return (
            <div key={c.id} className="card-white p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-orange/10 text-brand-orange'}`}>
                <Video className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-gray-900">{c.topic}</h4>
                  {c.status === 'scheduled' && <Badge variant="orange">Programada</Badge>}
                  {c.status === 'live' && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">🔴 En vivo</span>}
                  {c.status === 'completed' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Completada</span>}
                  {c.status === 'cancelled' && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">Cancelada</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{c.clientName} · {new Date(c.scheduledAt).toLocaleString('es-ES')} · {c.durationMin}min</p>
                <p className="text-xs text-gray-400 mt-1">Bruto €{c.price} → Neto €{split.net} (comisión €{split.commission})</p>
              </div>
              <div className="flex gap-2">
                {c.status === 'scheduled' && (
                  <Button variant="orange" size="sm" icon={<Play className="w-4 h-4" />} onClick={() => startClass(c.id)}>
                    Iniciar clase
                  </Button>
                )}
                {c.status === 'live' && (
                  <>
                    <a href={c.roomUrl} target="_blank" rel="noreferrer" className="btn-outline text-xs flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Sala
                    </a>
                    <Button variant="orange" size="sm" icon={<Check className="w-4 h-4" />} onClick={() => finishClass(c)}>
                      Finalizar
                    </Button>
                  </>
                )}
                {c.status === 'scheduled' && (
                  <button onClick={() => setClassStatus(c.id, 'cancelled')} className="text-xs text-red-500 font-semibold hover:underline px-2">Cancelar</button>
                )}
              </div>
            </div>
          );
        })}
        {myClasses.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no has programado clases online.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── OFFERS ────────────────────────────────────────────────────────────────
const OffersTab: React.FC<{ performerId: string }> = ({ performerId }) => {
  const { offers, respondOfferRequest, recordTransaction } = usePerformerStore();
  const { addToast } = useUIStore();
  const myOffers = offers.filter(o => o.performerId === performerId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  const acceptOffer = (o: OfferRequest) => {
    respondOfferRequest(o.id, 'accept');
    const tx = recordTransaction({
      performerId: o.performerId, clientName: o.clientName,
      concept: o.title, gross: o.proposedPrice,
      status: 'pending', source: 'offer'
    });
    addToast({ message: `Oferta aceptada — €${tx.net} en escrow (comisión €${tx.commission})`, type: 'success' });
  };

  const sendCounter = (o: OfferRequest) => {
    const p = parseFloat(counterPrice);
    if (!p) { addToast({ message: 'Introduce un contraprecio', type: 'error' }); return; }
    respondOfferRequest(o.id, 'counter', p);
    setCounterFor(null); setCounterPrice('');
    addToast({ message: 'Contrapropuesta enviada al cliente', type: 'info' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-black text-xl text-gray-900">Ofertas de clientes</h2>
        <p className="text-gray-400 text-sm">Acepta, rechaza o haz contraoferta. La plataforma retiene 15% al completarse.</p>
      </div>

      <div className="space-y-3">
        {myOffers.map(o => (
          <div key={o.id} className="card-white p-5">
            <div className="flex items-start gap-3">
              <Avatar src={o.clientAvatar} name={o.clientName} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-gray-900">{o.title}</h4>
                  {o.status === 'pending'   && <Badge variant="orange">Pendiente</Badge>}
                  {o.status === 'accepted'  && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Aceptada</span>}
                  {o.status === 'declined'  && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Rechazada</span>}
                  {o.status === 'countered' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">Contraoferta €{o.counterPrice}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{o.clientName} · Fecha solicitada {o.date}</p>
                <p className="text-sm text-gray-600 mt-2">{o.description}</p>
                <p className="text-2xl font-black text-brand-orange mt-2">€{o.proposedPrice} <span className="text-xs text-gray-400 font-normal">(tu neto: €{splitAmount(o.proposedPrice).net})</span></p>
              </div>
            </div>
            {o.status === 'pending' && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button variant="orange" size="sm" icon={<Check className="w-4 h-4" />} onClick={() => acceptOffer(o)}>Aceptar</Button>
                <button onClick={() => setCounterFor(counterFor === o.id ? null : o.id)} className="btn-outline text-xs">Contraoferta</button>
                <button onClick={() => respondOfferRequest(o.id, 'decline')} className="text-xs font-semibold text-red-500 hover:underline px-2 flex items-center gap-1">
                  <X className="w-3 h-3" /> Rechazar
                </button>
                {counterFor === o.id && (
                  <div className="w-full flex gap-2 mt-2">
                    <input type="number" placeholder="Nuevo precio €" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} className="input-field flex-1" />
                    <Button variant="orange" size="sm" onClick={() => sendCounter(o)}>Enviar contraoferta</Button>
                  </div>
                )}
              </div>
            )}
            {o.status === 'accepted' && (
              <div className="mt-3 p-2 bg-pink-50 rounded-lg text-xs text-gray-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-orange" />
                Pago retenido en escrow. Se liberará al confirmar el servicio.
              </div>
            )}
          </div>
        ))}
        {myOffers.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no has recibido ofertas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── FAN / BUYER DASHBOARD ─────────────────────────────────────────────────
// ── Ticket mini card with real QR ────────────────────────────────────────────
const TicketMiniCard: React.FC<{ ticket: any }> = ({ ticket }) => {
  const [expanded, setExpanded] = React.useState(false);
  const statusColor = ticket.status === 'valid' ? 'border-emerald-300 bg-emerald-50' : ticket.status === 'used' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50';
  const statusLabel = ticket.status === 'valid' ? '✅ Válida' : ticket.status === 'used' ? '✔ Usada' : ticket.status === 'refunded' ? '↩ Reembolsada' : '❌ Expirada';

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${statusColor}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">{ticket.event_title || 'Evento'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ticket.section_name || 'General'} · {ticket.quantity || 1} entrada{(ticket.quantity || 1) > 1 ? 's' : ''}</p>
            <p className="text-xs font-bold text-brand-orange mt-1">€{Number(ticket.price || 0).toFixed(2)}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-[10px] font-bold">{statusLabel}</span>
            <p className="text-[10px] text-gray-400 mt-0.5">{expanded ? '▲ Ocultar QR' : '▼ Ver QR'}</p>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-dashed border-gray-200 p-4 flex flex-col items-center gap-2 bg-white">
          <QRCodeCanvas token={ticket.qr_token} size={160} />
          <p className="text-[10px] text-gray-400 font-mono break-all text-center">{ticket.qr_token}</p>
          {ticket.status === 'valid' && (
            <button onClick={() => downloadTicketQR(ticket.qr_token, `entrada-${ticket.id}.png`)}
              className="text-xs text-brand-orange font-bold hover:underline flex items-center gap-1">
              ⬇️ Descargar imagen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FanDashboard: React.FC<{ userId: string; userName: string }> = ({ userId, userName }) => {
  const { transactions, confirmServiceOK } = usePerformerStore();
  const { orders } = useOrdersStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [fanTab, setFanTab] = useState<'classes' | 'tickets' | 'orders' | 'promo' | 'payments'>('classes');
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) { setLoadingTickets(false); return; }
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!cancelled) { setMyTickets(data || []); setLoadingTickets(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);
  const [classBookings, setClassBookings] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [reviewBooking, setReviewBooking] = useState<any | null>(null);

  // Cargar clases reservadas del usuario (con timeout de seguridad)
  useEffect(() => {
    let cancelled = false;
    // Timeout de seguridad: 6s max para evitar spinner infinito
    const safetyTimer = setTimeout(() => {
      if (!cancelled) { console.warn('[dashboard] bookings load timeout'); setLoadingClasses(false); }
    }, 6000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[dashboard] session for classes:', session?.user?.id);
        if (!session) { setLoadingClasses(false); return; }

        const { data, error } = await supabase
          .from('class_bookings')
          .select('*, class_offerings(title, cover_image, duration_minutes, style), availability_slots(starts_at, ends_at)')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false });

        if (cancelled) return;
        console.log('[dashboard] bookings:', { count: data?.length, error });

        if (error) {
          console.error('[dashboard] bookings error:', error);
          setClassBookings([]);
          setLoadingClasses(false);
          return;
        }

        // Normalizar: el JOIN devuelve nested objects con nombres en plural
        const normalized = (data || []).map((b: any) => ({
          ...b,
          offering: b.class_offerings || null,
          slot: b.availability_slots || null,
        }));
        setClassBookings(normalized);
      } catch (e) {
        console.error('[dashboard] bookings catch:', e);
        setClassBookings([]);
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    })();

    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [userId]);

  // Pedidos de escrow (BookingModal)
  const myEscrowOrders = transactions
    .filter(t => t.clientId === userId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const pendingCount = myEscrowOrders.filter(t => t.status === 'pending').length;

  const confirm = (id: string, concept: string) => {
    confirmServiceOK(id);
    addToast({ message: `Servicio "${concept}" confirmado. Fondos liberados al creador.`, type: 'success' });
  };

  const cancelBooking = async (bookingId: string) => {
    if (!window.confirm('¿Cancelar esta reserva? Si la clase es en más de 24h recibirás un reembolso completo.')) return;
    const { error } = await supabase
      .from('class_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('student_id', userId);
    if (error) {
      addToast({ type: 'error', message: `Error al cancelar: ${error.message}` });
    } else {
      addToast({ type: 'success', message: '✅ Reserva cancelada. El reembolso se procesará en 3–5 días hábiles.' });
      setClassBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'confirmed') return <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">✅ Confirmado</span>;
    if (status === 'completed') return <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">✔ Completado</span>;
    if (status === 'cancelled') return <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">❌ Cancelado</span>;
    return <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase">⏳ Pendiente</span>;
  };

  return (
    <div className="space-y-4">
      <div className="card-white rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
        <button onClick={() => setFanTab('classes')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            fanTab === 'classes' ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
          }`}>
          <Video className="w-4 h-4" /> Mis clases
          {classBookings.length > 0 && <span className="bg-white text-pink-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">{classBookings.length}</span>}
        </button>
        <button onClick={() => setFanTab('tickets')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            fanTab === 'tickets' ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
          }`}>
          🎫 Entradas
          {myTickets.length > 0 && <span className="bg-white text-brand-orange text-[10px] font-black px-1.5 py-0.5 rounded-full">{myTickets.length}</span>}
        </button>
        <button onClick={() => setFanTab('orders')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            fanTab === 'orders' ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
          }`}>
          <Briefcase className="w-4 h-4" /> Mis pedidos
          {pendingCount > 0 && <span className="bg-white text-brand-orange text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
        </button>
        <button onClick={() => setFanTab('promo')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            fanTab === 'promo' ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
          }`}>
          📢 Promociones
          {orders.length > 0 && <span className="bg-white text-brand-orange text-[10px] font-black px-1.5 py-0.5 rounded-full">{orders.length}</span>}
        </button>
        <button onClick={() => setFanTab('payments')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            fanTab === 'payments' ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
          }`}>
          <CreditCard className="w-4 h-4" /> Métodos de pago
        </button>
      </div>

      {fanTab === 'payments' && (
        <PaymentMethodsPanel userId={userId} holderDefault={userName} />
      )}

      {/* ── Mis Clases reservadas (sala Jitsi) ── */}
      {fanTab === 'classes' && (
        <div className="space-y-3">
          <div className="card-white p-5 bg-brand-orange border border-pink-100">
            <h2 className="font-display font-black text-xl text-gray-900 mb-1 flex items-center gap-2">
              <Video className="w-5 h-5 text-pink-500" /> Mis clases reservadas
            </h2>
            <p className="text-gray-500 text-sm">Accede a la sala 10 minutos antes del horario. Tu profesor te estará esperando.</p>
          </div>

          {loadingClasses && (
            <div className="card-white p-12 text-center">
              <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">Cargando tus reservas…</p>
            </div>
          )}

          {!loadingClasses && classBookings.length === 0 && (
            <div className="card-white p-12 text-center text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-1 font-bold text-gray-700">Aún no tienes clases reservadas</p>
              <p className="text-xs mb-4">Explora nuestras clases online y reserva la tuya</p>
              <button onClick={() => navigate('/clases')} className="bg-brand-orange text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                🎓 Ver clases disponibles
              </button>
            </div>
          )}

          {classBookings.map(b => {
            const startsAt = b.slot?.starts_at ? new Date(b.slot.starts_at) : null;
            const minutesUntil = startsAt ? Math.round((startsAt.getTime() - Date.now()) / 60000) : null;
            const canJoin = minutesUntil !== null && minutesUntil <= 15 && minutesUntil >= -120;
            const isPast = minutesUntil !== null && minutesUntil < -120;

            return (
              <div key={b.id} className="card-white overflow-hidden border-2 border-pink-100 hover:border-pink-300 transition-all">
                <div className="flex flex-col sm:flex-row">
                  {/* Cover */}
                  <div className="w-full sm:w-40 h-32 sm:h-auto bg-brand-orange relative flex-shrink-0">
                    {b.offering?.cover_image && (
                      <img src={b.offering.cover_image} alt={b.offering.title} className="w-full h-full object-cover" />
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isPast ? 'bg-gray-500 text-white' :
                      canJoin ? 'bg-red-500 text-white animate-pulse' :
                      'bg-blue-500 text-white'
                    }`}>
                      {isPast ? '📋 Finalizada' : canJoin ? '🔴 ¡Empieza ya!' : '📅 Programada'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col gap-2">
                    <div>
                      <h3 className="font-black text-base text-gray-900">{b.offering?.title || 'Clase reservada'}</h3>
                      {startsAt && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <CalIcon className="w-3 h-3" />
                          {startsAt.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                        <span>⏱ {b.offering?.duration_minutes || 60}min</span>
                        <span>•</span>
                        <span>€{b.amount_paid}</span>
                        <span>•</span>
                        <span className="text-green-600 font-bold">✓ Pagado</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-2 mt-1">
                      {canJoin && !isPast && (
                        <button onClick={() => navigate(`/clase/${b.id}`)}
                          className="flex-1 bg-red-500 text-white font-black px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-red-500/30 active:scale-95 flex items-center justify-center gap-2">
                          <Video className="w-4 h-4" /> Entrar a la sala ahora
                        </button>
                      )}
                      {!canJoin && !isPast && (
                        <button onClick={() => navigate(`/clase/${b.id}`)}
                          className="flex-1 bg-brand-orange text-white font-black px-4 py-2.5 rounded-xl text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2">
                          <Video className="w-4 h-4" /> Acceder a la sala
                          {minutesUntil !== null && minutesUntil > 15 && (
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                              en {minutesUntil > 60 ? `${Math.floor(minutesUntil/60)}h` : `${minutesUntil}min`}
                            </span>
                          )}
                        </button>
                      )}
                      {isPast && (
                        <>
                          <button onClick={() => setReviewBooking(b)}
                            className="flex-1 bg-amber-500 text-white font-black px-4 py-2.5 rounded-xl text-sm shadow-lg active:scale-95 flex items-center justify-center gap-1">
                            ⭐ Valorar clase
                          </button>
                          <button onClick={() => navigate(`/clase/${b.id}`)}
                            className="bg-gray-100 text-gray-600 font-bold px-3 py-2.5 rounded-xl text-sm active:scale-95">
                            Ver
                          </button>
                        </>
                      )}
                      {!isPast && ['confirmed','pending'].includes(b.status) && (
                        <button onClick={() => cancelBooking(b.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="text-center pt-3">
            <button onClick={() => navigate('/clases')} className="text-pink-600 text-sm font-bold hover:underline">
              + Reservar otra clase
            </button>
          </div>
        </div>
      )}

      {reviewBooking && (
        <ClassReviewModal
          open={!!reviewBooking}
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => setReviewBooking(null)}
        />
      )}

      {/* ── Mis Entradas de eventos (QR real) ── */}
      {fanTab === 'tickets' && (
        <div className="space-y-3">
          <div className="card-white p-5 bg-brand-orange border border-orange-100">
            <h2 className="font-display font-black text-xl text-gray-900 mb-1 flex items-center gap-2">
              🎫 Mis entradas
            </h2>
            <p className="text-gray-500 text-sm">Presenta el código QR en la entrada del evento.</p>
          </div>
          {loadingTickets ? (
            <div className="card-white p-12 text-center">
              <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">Cargando entradas…</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="card-white p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🎫</p>
              <p className="font-bold text-gray-700 text-sm mb-1">No tienes entradas todavía</p>
              <p className="text-xs mb-4">Explora los eventos y compra tu entrada</p>
              <button onClick={() => navigate('/eventos')} className="bg-brand-orange text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                Ver eventos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myTickets.map((t: any) => (
                <TicketMiniCard key={t.id} ticket={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pedidos de escrow (Reservas directas) ── */}
      {fanTab === 'orders' && (
      <>
      <div className="card-white p-5">
        <h2 className="font-display font-black text-xl text-gray-900 mb-1">Mis pedidos</h2>
        <p className="text-gray-400 text-sm">Confirma que recibiste el servicio correctamente para liberar el pago al creador (escrow).</p>
      </div>

      <div className="space-y-3">
        {myEscrowOrders.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm mb-3">Aún no tienes pedidos. Explora artistas y eventos.</p>
            <button onClick={() => navigate('/artistas')} className="btn-orange text-xs">Explorar artistas</button>
          </div>
        )}
        {myEscrowOrders.map(t => (
          <div key={t.id} className="card-white p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-gray-900">{t.concept}</h4>
                {t.status === 'pending'   && <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase">⏳ En escrow</span>}
                {t.status === 'released'  && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">✅ Confirmado</span>}
                {t.status === 'withdrawn' && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">Liquidado</span>}
                {t.status === 'refunded'  && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Reembolsado</span>}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Proveedor: <span className="font-semibold">{t.performerName || t.performerId}</span> · {new Date(t.date).toLocaleDateString('es-ES')}
              </p>
              <p className="text-sm text-gray-400 mt-1">Tu pago: <span className="font-bold text-gray-900">€{t.gross}</span></p>
            </div>
            {t.status === 'pending' && (
              <div className="flex gap-2">
                <Button variant="orange" size="sm" icon={<Check className="w-4 h-4" />} onClick={() => confirm(t.id, t.concept)}>
                  Confirmar servicio OK
                </Button>
                <button className="text-xs font-semibold text-red-500 hover:underline px-2">Abrir disputa</button>
              </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}

      {/* ── Pedidos de Promociónate (carrito) ── */}
      {fanTab === 'promo' && (
      <>
      <div className="card-white p-5">
        <h2 className="font-display font-black text-xl text-gray-900 mb-1">📢 Pedidos de Promociónate</h2>
        <p className="text-gray-400 text-sm">Historial de servicios de promoción contratados vía Promociónate.</p>
      </div>

      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="card-white p-12 text-center text-gray-400">
            <span className="text-4xl block mb-3">🛒</span>
            <p className="text-sm mb-3">Aún no has contratado servicios de promoción.</p>
            <button onClick={() => navigate('/promocionate')} className="btn-orange text-xs">
              Ver Promociónate
            </button>
          </div>
        )}
        {orders.map(order => (
          <div key={order.id} className="card-white p-5 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {statusBadge(order.status)}
                  <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{order.paymentProvider}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-xl text-gray-900">€{order.total.toFixed(2)}</p>
                <p className="text-[10px] text-gray-400">{order.items.length} servicio{order.items.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <img src={item.sellerAvatar} alt={item.sellerName} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-400">{item.sellerName}</p>
                  </div>
                  <span className="text-xs font-bold text-pink-600">€{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {/* Seller breakdown */}
            {order.sellerBreakdown.length > 0 && (
              <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                <p className="font-bold text-gray-600 mb-1">Distribución:</p>
                {order.sellerBreakdown.map(s => (
                  <div key={s.sellerId} className="flex justify-between">
                    <span>{s.sellerName}</span>
                    <span className="text-green-600 font-semibold">€{s.net.toFixed(2)} neto</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
};

export default DashboardPage;
