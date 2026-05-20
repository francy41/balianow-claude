import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import CookieBanner from './components/CookieBanner';
import { ToastContainer, FullPageLoader } from './components/ui';
import { useSupabaseAuthListener } from './hooks/useSupabaseAuth';

// DevRoleSwitcher — solo en desarrollo
const DevRoleSwitcher = import.meta.env.DEV
  ? lazy(() => import('./components/DevRoleSwitcher'))
  : () => null;

// Lazy load pages
const HomePage          = lazy(() => import('./pages/HomePage'));
const ExplorePage       = lazy(() => import('./pages/ExplorePage'));
const ArtistsPage       = lazy(() => import('./pages/ArtistsPage'));
const ArtistProfilePage = lazy(() => import('./pages/ArtistProfilePage'));
const EventsPage        = lazy(() => import('./pages/EventsPage'));
const MarketplacePage   = lazy(() => import('./pages/MarketplacePage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const LiveNowPage       = lazy(() => import('./pages/LiveNowPage'));
const VenuesPage        = lazy(() => import('./pages/VenuesPage'));
const ChatPage          = lazy(() => import('./pages/ChatPage'));
const DashboardPage     = lazy(() => import('./pages/DashboardPage'));
const WalletPage        = lazy(() => import('./pages/WalletPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const MapPage           = lazy(() => import('./pages/MapPage'));
const AuthPage          = lazy(() => import('./pages/AuthPage'));
const AdminPage         = lazy(() => import('./pages/AdminPage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const AffiliatePage     = lazy(() => import('./pages/AffiliatePage'));
const VendedoresPage    = lazy(() => import('./pages/VendedoresPage'));
const PromocionatePage  = lazy(() => import('./pages/PromocionatePage'));
const PagoExitosoPage   = lazy(() => import('./pages/PagoExitosoPage'));
const LegalPage         = lazy(() => import('./pages/LegalPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));

// Error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Algo salió mal</h2>
            <p className="text-gray-400 mb-6">{this.state.error?.message || 'Error inesperado'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  useSupabaseAuthListener();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    if (localStorage.getItem('bailanow-dark') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300">
          {/* Sidebar — fixed left, hidden on mobile until toggled */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main column — offset by sidebar width on desktop */}
          <div className="lg:ml-60">
            <Navbar onMenuToggle={() => setSidebarOpen(s => !s)} />

            <main className="pt-14 pb-20 lg:pb-6 min-h-screen">
              <Suspense fallback={<FullPageLoader />}>
                <Routes>
                  {/* ── Main pages ── */}
                  <Route path="/"                    element={<HomePage />} />
                  <Route path="/explorar"            element={<ExplorePage />} />
                  <Route path="/artistas"            element={<ArtistsPage />} />
                  <Route path="/artistas/:id"        element={<ArtistProfilePage />} />
                  <Route path="/eventos"             element={<EventsPage />} />
                  <Route path="/eventos/:id"         element={<EventsPage />} />
                  <Route path="/marketplace"         element={<MarketplacePage />} />
                  <Route path="/marketplace/:id"     element={<ServiceDetailPage />} />
                  <Route path="/live"                element={<LiveNowPage />} />
                  <Route path="/live/:id"            element={<LiveNowPage />} />
                  <Route path="/venues"              element={<VenuesPage />} />
                  <Route path="/venues/:id"          element={<VenuesPage />} />
                  <Route path="/mapa"                element={<MapPage />} />
                  <Route path="/chat"                element={<ChatPage />} />
                  <Route path="/dashboard"           element={<DashboardPage />} />
                  <Route path="/perfil"              element={<ProfilePage />} />
                  <Route path="/wallet"              element={<WalletPage />} />
                  <Route path="/subscripciones"      element={<SubscriptionsPage />} />
                  <Route path="/auth"                element={<AuthPage />} />
                  <Route path="/afiliados"           element={<AffiliatePage />} />
                  <Route path="/vendedores"          element={<VendedoresPage />} />
                  <Route path="/promocionate"        element={<PromocionatePage />} />
                  <Route path="/admin"               element={<AdminPage />} />
                  <Route path="/admin/:section"      element={<AdminPage />} />

                  {/* ── Payment success (Stripe redirect) ── */}
                  <Route path="/pago-exitoso"        element={<PagoExitosoPage />} />

                  {/* ── Legal pages ── */}
                  <Route path="/legal/:type"         element={<LegalPage />} />
                  <Route path="/legal"               element={<Navigate to="/legal/terminos" replace />} />
                  <Route path="/terminos"            element={<Navigate to="/legal/terminos" replace />} />
                  <Route path="/privacidad"          element={<Navigate to="/legal/privacidad" replace />} />
                  <Route path="/cookies"             element={<Navigate to="/legal/cookies" replace />} />

                  {/* ── 404 ── */}
                  <Route path="*"                    element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
          </div>

          {/* Mobile bottom nav */}
          <BottomNav />
          <ToastContainer />
          <CookieBanner />

          {/* DevRoleSwitcher — solo en modo desarrollo */}
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <DevRoleSwitcher />
            </Suspense>
          )}
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
