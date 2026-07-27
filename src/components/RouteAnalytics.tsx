import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../lib/analytics';

// Registra una vista de página en GA4 en cada cambio de ruta del SPA.
const RouteAnalytics: React.FC = () => {
  const loc = useLocation();
  useEffect(() => {
    // pequeño retraso para que document.title (useSeo) ya esté actualizado
    const t = setTimeout(() => trackPageview(loc.pathname + loc.search), 60);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.search]);
  return null;
};

export default RouteAnalytics;
