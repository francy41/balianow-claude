/**
 * NewsletterForm — formulario embebido de GHL para newsletter
 *
 * Modos soportados (en orden de preferencia):
 *  1) Form embed de GHL via iframe — el admin configura el Form ID
 *     (en GHL: Sites → Forms → Builder → Integrate → Inline embed)
 *  2) Modo API: POST directo a GHL para crear/upsert contacto con tag "newsletter"
 *     (requiere Edge Function por seguridad del token)
 *
 * Si no hay nada configurado, no se renderiza nada (return null).
 */
import React, { useEffect, useState } from 'react';
import { Mail, Send, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  variant?: 'inline' | 'card' | 'banner';
  title?: string;
  subtitle?: string;
  className?: string;
}

const NewsletterForm: React.FC<Props> = ({
  variant = 'card',
  title = '📬 Suscríbete al newsletter',
  subtitle = 'Recibe los mejores eventos, clases y artistas latinos en tu email',
  className = '',
}) => {
  const [formId, setFormId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form interno (modo API si no hay Form ID)
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('site_config')
          .select('key, value')
          .in('key', ['ghl_newsletter_form_id', 'ghl_locations']);
        for (const row of (data || [])) {
          if (row.key === 'ghl_newsletter_form_id') {
            const v = row.value?.id || row.value;
            if (typeof v === 'string' && v.length > 5) setFormId(v);
          }
          if (row.key === 'ghl_locations') {
            const first = row.value?.brands?.[0]?.id;
            if (typeof first === 'string') setLocationId(first);
          }
        }
      } catch (e) { console.warn('[newsletter] load config', e); }
      setLoading(false);
    })();
  }, []);

  // ── MODO API: guarda en tabla newsletter_subscribers (sin requerir token GHL) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Email no válido');
      return;
    }
    setSubmitting(true);
    try {
      // Guardamos en una tabla newsletter_subscribers (creamos abajo) que después
      // un workflow de GHL puede sincronizar vía webhook.
      // Por ahora: persist en Supabase y notificar exito.
      const payload = {
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        source: 'web-newsletter-form',
        created_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('newsletter_subscribers')
        .upsert(payload, { onConflict: 'email' });
      if (upErr) throw upErr;

      // Disparar webhook a GHL si está configurado
      try {
        const { data: hookCfg } = await supabase
          .from('site_config')
          .select('value')
          .eq('key', 'ghl_newsletter_webhook')
          .maybeSingle();
        const webhookUrl = hookCfg?.value?.url || hookCfg?.value;
        if (typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: payload.email,
              first_name: payload.name,
              tags: ['newsletter', 'web-signup'],
              location_id: locationId,
              source: 'bailanow-web',
            }),
          });
        }
      } catch (whErr) {
        console.warn('[newsletter] webhook failed (non-fatal):', whErr);
      }

      setSuccess(true);
      setEmail(''); setName('');
    } catch (e: any) {
      console.error('[newsletter] error', e);
      setError(e.message || 'No se pudo suscribir, intenta de nuevo');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  // ── MODO 1: iframe del form GHL si está configurado ──
  if (formId) {
    return (
      <div className={`${className}`}>
        <iframe
          src={`https://api.leadconnectorhq.com/widget/form/${formId}`}
          style={{ width: '100%', minHeight: '380px', border: 'none', borderRadius: '12px' }}
          title="Newsletter"
          allow="clipboard-write"
        />
      </div>
    );
  }

  // ── MODO 2: form propio (siempre disponible) ──
  if (success) {
    return (
      <div className={`${className} ${variantClasses(variant)} text-center`}>
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-display font-black text-lg text-gray-900 dark:text-white mb-1">¡Suscrito!</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Revisa tu email — pronto recibirás novedades latinas.</p>
      </div>
    );
  }

  return (
    <div className={`${className} ${variantClasses(variant)}`}>
      {variant !== 'inline' && (
        <div className="mb-4">
          <h3 className="font-display font-black text-lg sm:text-xl text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        {variant !== 'inline' && (
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Tu nombre (opcional)"
            className="input-field"
            autoComplete="name"
          />
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="input-field pl-9"
              autoComplete="email"
            />
          </div>
          <button type="submit" disabled={submitting}
            className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold px-4 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? '...' : 'Suscribirme'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Al suscribirte aceptas recibir emails de BailaNow. Cancela cuando quieras.
        </p>
      </form>
    </div>
  );
};

function variantClasses(v: 'inline' | 'card' | 'banner'): string {
  switch (v) {
    case 'card':   return 'bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-800';
    case 'banner': return 'bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 dark:from-pink-900/20 dark:to-fuchsia-900/20 rounded-2xl p-6 border border-pink-200 dark:border-pink-800';
    case 'inline': return '';
  }
}

export default NewsletterForm;
