import React, { Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import { ToastContainer, FullPageLoader } from './components/ui';

// Lazy load pages
const HomePage         = lazy(() => import('./pages/HomePage'));
const ExplorePage      = lazy(() => import('./pages/ExplorePage'));
const ArtistsPage      = lazy(() => import('./pages/ArtistsPage'));
const ArtistProfilePage= lazy(() => import('./pages/ArtistProfilePage'));
const EventsPage       = lazy(() => import('./pages/EventsPage'));
const MarketplacePage  = lazy(() => import('./pages/MarketplacePage'));
const ServiceDetailPage= lazy(() => import('./pages/ServiceDetailPage'));
const LiveNowPage      = lazy(() => import('./pages/LiveNowPage'));
const VenuesPage       = lazy(() => import('./pages/VenuesPage'));
const ChatPage         = lazy(() => import('./pages/ChatPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const WalletPage       = lazy(() => import('./pages/WalletPage'));
const SubscriptionsPage= lazy(() => import('./pages/SubscriptionsPage'));
const MapPage          = lazy(() => import('./pages/MapPage'));
const AuthPage         = lazy(() => import('./pages/AuthPage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));

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
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
            <p className="text-gray-400 mb-6">{this.state.error?.message || 'Error inesperado'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              className="btn-orange"
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Sidebar — fixed left, hidden on mobile until toggled */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Main column — offset by sidebar width on desktop */}
          <div className="lg:ml-60">
            <Navbar onMenuToggle={() => setSidebarOpen(s => !s)} />

            <main className="pt-14 pb-20 lg:pb-6 min-h-screen">
              <Suspense fallback={<FullPageLoader />}>
                <Routes>
                  <Route path="/"                element={<HomePage />} />
                  <Route path="/explorar"         element={<ExplorePage />} />
                  <Route path="/artistas"         element={<ArtistsPage />} />
                  <Route path="/artistas/:id"     element={<ArtistProfilePage />} />
                  <Route path="/eventos"          element={<EventsPage />} />
                  <Route path="/eventos/:id"      element={<EventsPage />} />
                  <Route path="/marketplace"      element={<MarketplacePage />} />
                  <Route path="/marketplace/:id"  element={<ServiceDetailPage />} />
                  <Route path="/live"             element={<LiveNowPage />} />
                  <Route path="/live/:id"         element={<LiveNowPage />} />
                  <Route path="/venues"           element={<VenuesPage />} />
                  <Route path="/venues/:id"       element={<VenuesPage />} />
                  <Route path="/mapa"             element={<MapPage />} />
                  <Route path="/chat"             element={<ChatPage />} />
                  <Route path="/dashboard"        element={<DashboardPage />} />
                  <Route path="/wallet"           element={<WalletPage />} />
                  <Route path="/subscripciones"   element={<SubscriptionsPage />} />
                  <Route path="/auth"             element={<AuthPage />} />
                  <Route path="/admin"            element={<AdminPage />} />
                  <Route path="/admin/:section"   element={<AdminPage />} />
                  <Route path="*"                 element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>

          {/* Mobile bottom nav */}
          <BottomNav />
          <ToastContainer />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
