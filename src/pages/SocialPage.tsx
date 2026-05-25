/**
 * SocialPage — Gestor de redes sociales
 *
 * Embebe el Social Planner de GoHighLevel (GHL) via iframe.
 * GHL maneja: Facebook, Instagram, TikTok, YouTube, LinkedIn, X, Google My Business.
 *
 * Setup:
 *  1) Admin pega el Location ID de GHL en /admin (sección "Integraciones")
 *  2) Se guarda en site_config como key='ghl_location_id'
 *  3) Esta página lo lee y monta el iframe
 *
 * Si no hay Location ID configurado, muestra wizard explicando cómo conseguirlo.
 */
import React, { useEffect, useState } from 'react';
import { Share2, ExternalLink, Settings, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';

const SocialPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role ?? '');

  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Cargar Location ID desde site_config
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('site_config')
          .select('value')
          .eq('key', 'ghl_location_id')
          .maybeSingle();
        const id = data?.value?.id || data?.value || null;
        setLocationId(typeof id === 'string' && id.trim().length > 5 ? id.trim() : null);
      } catch (e) {
        console.warn('[social] load location id', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
        <Share2 className="w-12 h-12 text-pink-500" />
        <h2 className="font-display font-black text-xl">Inicia sesión para gestionar tus redes</h2>
        <button onClick={() => navigate('/auth')} className="btn-orange">Iniciar sesión</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // ── Sin Location ID configurado: wizard de setup ──────────────
  if (!locationId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-4 py-5">
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <Share2 className="w-6 h-6" /> Gestor de Redes Sociales
          </h1>
          <p className="text-white/80 text-sm mt-1">Publica en Facebook, Instagram, TikTok, YouTube y más desde aquí</p>
        </div>

        <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
          {/* Hero */}
          <div className="card-white p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-fuchsia-100 dark:from-pink-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-pink-500" />
            </div>
            <h2 className="font-display font-black text-xl text-gray-900 dark:text-white mb-2">
              Conecta tus redes con GoHighLevel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Usamos GoHighLevel (GHL) para que puedas publicar simultáneamente en todas tus redes:
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {['📘 Facebook', '📷 Instagram', '🎵 TikTok', '🎥 YouTube', '💼 LinkedIn', '𝕏 Twitter', '📍 Google My Business'].map(p => (
                <span key={p} className="px-3 py-1 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 text-xs font-bold rounded-full">{p}</span>
              ))}
            </div>
          </div>

          {/* Setup wizard */}
          {isAdmin ? (
            <div className="card-white p-6 space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-500" /> Configuración inicial (solo admin)
              </h3>
              <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <p className="font-semibold">Entra a tu cuenta de GHL</p>
                    <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer"
                      className="text-pink-500 hover:underline text-xs inline-flex items-center gap-1">
                      app.gohighlevel.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <p className="font-semibold">Settings → Company → copia el "Location ID"</p>
                    <p className="text-xs text-gray-500">Es un código alfanumérico (ej: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">x4kf9aB2c8dE1fGh</code>)</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <p className="font-semibold">Pégalo abajo y guarda</p>
                  </div>
                </li>
              </ol>
              <LocationIdForm onSaved={(id) => setLocationId(id)} />
            </div>
          ) : (
            <div className="card-white p-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Función no disponible aún</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    El administrador debe configurar la integración con GoHighLevel. Vuelve más tarde.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Con Location ID: iframe del Social Planner ────────────────
  const planurl = `https://app.gohighlevel.com/v2/location/${locationId}/social-planner`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          <h1 className="font-bold">Gestor de Redes Sociales</h1>
        </div>
        <a href={planurl} target="_blank" rel="noopener noreferrer"
          className="text-white/80 hover:text-white text-xs flex items-center gap-1">
          Abrir en pestaña <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Iframe del Social Planner de GHL */}
      <div className="flex-1 relative">
        {iframeError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="card-white p-6 max-w-md text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No se pudo cargar el panel</h3>
              <p className="text-sm text-gray-500 mb-4">
                Verifica que el Location ID es correcto o intenta abrirlo en una nueva pestaña.
              </p>
              <a href={planurl} target="_blank" rel="noopener noreferrer" className="btn-orange inline-flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir en nueva pestaña
              </a>
            </div>
          </div>
        ) : (
          <iframe
            src={planurl}
            className="w-full h-full border-0"
            title="Social Planner"
            onError={() => setIframeError(true)}
            allow="camera; microphone; clipboard-read; clipboard-write"
          />
        )}
      </div>
    </div>
  );
};

// ── Form para guardar Location ID en site_config ─────────────────
const LocationIdForm: React.FC<{ onSaved: (id: string) => void }> = ({ onSaved }) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const id = value.trim();
    if (id.length < 5) { setError('Location ID inválido'); return; }
    setSaving(true);
    setError('');
    try {
      const { error: upErr } = await supabase
        .from('site_config')
        .upsert({ key: 'ghl_location_id', value: { id }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (upErr) throw upErr;
      onSaved(id);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 pt-2">
      <input
        type="text" value={value} onChange={e => setValue(e.target.value)}
        placeholder="Pega aquí tu Location ID de GHL"
        className="input-field font-mono text-sm"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button onClick={save} disabled={saving || value.trim().length < 5}
        className="btn-orange w-full flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {saving ? 'Guardando...' : 'Activar gestor de redes'}
      </button>
    </div>
  );
};

export default SocialPage;
