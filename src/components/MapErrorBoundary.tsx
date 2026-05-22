/**
 * MapErrorBoundary — atrapa errores de Leaflet sin romper la app
 */
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MapErrorBoundary] caught error:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            <h3 className="font-black text-gray-900 dark:text-white mb-1">El mapa no pudo cargar</h3>
            <p className="text-xs text-gray-500 mb-4">{this.state.error?.message || 'Error desconocido'}</p>
            <button onClick={this.reset}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 mx-auto active:scale-95">
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default MapErrorBoundary;
