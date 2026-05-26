/**
 * GhlChatWidget — chat de soporte automático de GoHighLevel
 *
 * Carga el widget de chat de GHL globalmente. El admin configura el Widget ID
 * en site_config (key='ghl_chat_widget_id') desde el panel admin → integraciones.
 *
 * El widget se carga UNA sola vez por sesión. Si no hay ID configurado, no hace nada.
 *
 * Cómo obtener el Widget ID:
 *  1) En GHL → Sites → Chat Widget
 *  2) Crear o seleccionar widget
 *  3) Install Code → buscar `data-widget-id="..."` y copiar el valor
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const GhlChatWidget: React.FC = () => {
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 1) Cargar widget ID desde site_config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('site_config')
          .select('value')
          .eq('key', 'ghl_chat_widget_id')
          .maybeSingle();
        const id = data?.value?.id || data?.value;
        if (!cancelled && typeof id === 'string' && id.trim().length > 5) {
          setWidgetId(id.trim());
        }
      } catch (e) { console.warn('[ghl-chat] load id', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) Inyectar el script del widget (solo una vez)
  useEffect(() => {
    if (!widgetId || loaded) return;
    if (document.querySelector('script[data-ghl-chat-widget]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://widgets.leadconnectorhq.com/loader.js';
    script.async = true;
    script.setAttribute('data-resources-url', 'https://widgets.leadconnectorhq.com/chat-widget/loader.js');
    script.setAttribute('data-widget-id', widgetId);
    script.setAttribute('data-ghl-chat-widget', 'true');
    script.onload = () => setLoaded(true);
    script.onerror = () => console.warn('[ghl-chat] failed to load widget script');
    document.body.appendChild(script);
  }, [widgetId, loaded]);

  return null;
};

export default GhlChatWidget;
