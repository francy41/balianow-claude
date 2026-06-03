/**
 * RouteErrorBoundary — captura errores en cada ruta sin tumbar toda la app
 *
 * Si un componente lazy-loaded falla, solo se rompe esa ruta.
 * Reporta a Sentry automáticamente.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { captureError } from '../lib/sentry';

interface State { hasError: boolean; error: Error | null; }

class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const RouteErrorFallback: React.FC<{ error: Error | null; onReset: () => void }> = ({ error, onReset }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-3">😞</div>
      <h2 className="font-display font-black text-2xl text-gray-900 dark:text-white mb-2">
        Esta sección tuvo un problema
      </h2>
      <p className="text-sm text-gray-500 max-w-md mb-1">
        El resto de la app sigue funcionando. Hemos avisado a nuestro equipo.
      </p>
      {error && (
        <details className="text-[10px] text-gray-400 mt-2 mb-4 max-w-md text-left">
          <summary className="cursor-pointer">Detalles técnicos</summary>
          <pre className="mt-1 font-mono break-all whitespace-pre-wrap">{error.message}</pre>
        </details>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => { onReset(); navigate('/', { replace: true }); }}
          className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-5 py-2.5 rounded-xl"
        >
          Ir al inicio
        </button>
        <button onClick={onReset} className="border border-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl">
          Reintentar
        </button>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
