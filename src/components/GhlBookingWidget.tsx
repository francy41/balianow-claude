/**
 * GhlBookingWidget — calendario de reservas embebido de GoHighLevel.
 * El admin configura el Calendar ID en site_config (key 'ghl_booking_calendar_id').
 * Si no hay nada configurado, usa el ID por defecto pasado como prop.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface Props {
  defaultCalendarId?: string;
  height?: number;
}

const GhlBookingWidget: React.FC<Props> = ({ defaultCalendarId = 'sw5dThSRsFlErTSSxBWZ', height = 620 }) => {
  const [calendarId, setCalendarId] = useState<string>(defaultCalendarId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('site_config').select('value').eq('key', 'ghl_booking_calendar_id').maybeSingle().then(({ data }) => {
      const v = data?.value?.id || data?.value;
      if (typeof v === 'string' && v.length > 5) setCalendarId(v);
    }, () => {});
    // Script del widget de GHL — necesario para que el iframe se ajuste correctamente
    if (!document.getElementById('ghl-form-embed-script')) {
      const script = document.createElement('script');
      script.id = 'ghl-form-embed-script';
      script.src = 'https://link.msgsndr.com/js/form_embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ minHeight: height }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
        </div>
      )}
      <iframe
        src={`https://api.leadconnectorhq.com/widget/booking/${calendarId}`}
        style={{ width: '100%', height, border: 'none' }}
        scrolling="no"
        title="Reservar llamada"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default GhlBookingWidget;
