/**
 * Importador inteligente:
 *  - 🔗 Desde link (IA): pega una URL y la IA clasifica/extrae evento, local o perfil.
 *  - 📋 JSON/CSV: importación masiva de perfiles (modo clásico).
 */
import React, { useMemo, useState } from 'react';
import {
  Loader2, Upload, AlertCircle, CheckCircle2, FileText, Link2, Sparkles,
  Calendar, MapPin, User, Pencil,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore, useAuthStore } from '../store/appStore';
import { resolveCityCoords } from '../lib/geo';

type Row = Record<string, any>;

const KNOWN_FIELDS = [
  'name', 'email', 'role', 'city', 'bio', 'phone',
  'avatar_url', 'cover_url',
  'instagram_url', 'tiktok_url', 'youtube_url', 'spotify_url', 'website',
  'styles', 'tags',
];

function parseCSV(text: string): Row[] {
  const sep = text.includes('\t') && !text.includes(',') ? '\t' : ',';
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(sep).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(sep);
    const row: Row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

function parseInput(text: string): Row[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const v = JSON.parse(t);
      return Array.isArray(v) ? v : [v];
    } catch { return []; }
  }
  return parseCSV(t);
}

function normalizeRow(raw: Row): Row {
  const r: Row = {};
  for (const k of Object.keys(raw)) {
    const key = k.trim().toLowerCase().replace(/\s+/g, '_');
    r[key] = raw[k];
  }
  for (const k of ['styles', 'tags']) {
    if (typeof r[k] === 'string') {
      r[k] = r[k].split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
    }
  }
  if (!r.role) r.role = 'user';
  if (r.city && (r.lat == null || r.lng == null)) {
    const c = resolveCityCoords(r.city);
    if (c) { r.lat = c.lat; r.lng = c.lng; }
  }
  const out: Row = {};
  for (const f of KNOWN_FIELDS) if (r[f] !== undefined && r[f] !== '') out[f] = r[f];
  if (typeof r.lat === 'number') out.lat = r.lat;
  if (typeof r.lng === 'number') out.lng = r.lng;
  return out;
}

// ── Importación por LINK (IA) ───────────────────────────────────
type SmartType = 'event' | 'venue' | 'profile';
interface SmartResult { type: SmartType; confidence?: number; data: Row; source: string }

const TYPE_META: Record<SmartType, { label: string; icon: React.ReactNode; color: string; table: string }> = {
  event:   { label: 'Evento',  icon: <Calendar className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700', table: 'events' },
  venue:   { label: 'Local',   icon: <MapPin className="w-4 h-4" />,   color: 'bg-emerald-100 text-emerald-700', table: 'venues' },
  profile: { label: 'Perfil',  icon: <User className="w-4 h-4" />,     color: 'bg-pink-100 text-pink-700', table: 'profiles' },
};

const ProfileImporter: React.FC = () => {
  const addToast = useUIStore(s => s.addToast);
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'link' | 'bulk'>('link');

  // modo bulk (clásico)
  const [input, setInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<{ ok: number; failed: number; errors: { row: number; msg: string }[] } | null>(null);

  // modo link (IA)
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartResult | null>(null);
  const [editJson, setEditJson] = useState('');
  const [savingSmart, setSavingSmart] = useState(false);

  const preview = useMemo(() => parseInput(input).slice(0, 5).map(normalizeRow), [input]);
  const totalParsed = useMemo(() => parseInput(input).length, [input]);

  // ── Analizar URL con la edge function ──
  const analyze = async () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) { addToast({ type: 'error', message: 'Pega una URL válida (https://...)' }); return; }
    setAnalyzing(true); setResult(null);
    try {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-import`;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
        body: JSON.stringify({ url: u }),
      });
      const json = await res.json();
      if (!res.ok || !json?.type || !json?.data) {
        addToast({ type: 'error', message: json?.error || 'No se pudo analizar la página' });
        setAnalyzing(false);
        return;
      }
      setResult(json as SmartResult);
      setEditJson(JSON.stringify(json.data, null, 2));
    } catch (e: any) {
      addToast({ type: 'error', message: 'Error analizando: ' + (e?.message || e) });
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Guardar el resultado en su tabla ──
  const importSmart = async () => {
    if (!result) return;
    let data: Row;
    try { data = JSON.parse(editJson); } catch { addToast({ type: 'error', message: 'El JSON editado no es válido' }); return; }

    setSavingSmart(true);
    try {
      // limpiar nulls
      const clean: Row = {};
      for (const k of Object.keys(data)) if (data[k] !== null && data[k] !== '') clean[k] = data[k];

      // geo por ciudad
      if (clean.city && clean.lat == null) {
        const c = resolveCityCoords(String(clean.city));
        if (c) { clean.lat = c.lat; clean.lng = c.lng; }
      }

      let error;
      if (result.type === 'event') {
        const row: Row = {
          title: clean.title, description: clean.description, date: clean.date,
          time: clean.time, end_time: clean.end_time, city: clean.city, country: clean.country,
          location: clean.location || clean.venue_name, venue_name: clean.venue_name,
          price: clean.price, currency: clean.currency || 'EUR', category: clean.category || 'social',
          image_url: clean.image_url, cover: clean.image_url, artists: clean.artists,
          lat: clean.lat, lng: clean.lng,
          admin_status: 'approved', created_by: user?.id || null, owner_id: user?.id || null,
          type: clean.category || 'social',
        };
        ({ error } = await supabase.from('events').insert(strip(row)));
      } else if (result.type === 'venue') {
        const row: Row = {
          name: clean.name, description: clean.description, city: clean.city, country: clean.country,
          address: clean.address, type: clean.type || 'Social', style: clean.style,
          image_url: clean.image_url, cover: clean.image_url, email: clean.email,
          whatsapp: clean.whatsapp, open_hours: clean.open_hours,
          lat: clean.lat, lng: clean.lng,
          status: 'active', admin_status: 'approved', owner_id: user?.id || null,
        };
        ({ error } = await supabase.from('venues').insert(strip(row)));
      } else {
        const row = normalizeRow(clean);
        ({ error } = await supabase.from('profiles').insert(strip(row)));
      }

      if (error) addToast({ type: 'error', message: error.message });
      else {
        addToast({ type: 'success', message: `✅ ${TYPE_META[result.type].label} importado correctamente` });
        setResult(null); setEditJson(''); setUrl('');
      }
    } finally {
      setSavingSmart(false);
    }
  };

  const strip = (o: Row) => { const r: Row = {}; for (const k of Object.keys(o)) if (o[k] !== undefined && o[k] !== null && o[k] !== '') r[k] = o[k]; return r; };

  // ── Importación masiva clásica ──
  const handleImport = async () => {
    const rows = parseInput(input).map(normalizeRow).filter(r => r.name || r.email);
    if (rows.length === 0) { addToast({ type: 'error', message: 'No hay filas válidas' }); return; }

    setImporting(true);
    setStats(null);
    const errors: { row: number; msg: string }[] = [];
    let ok = 0;

    const BATCH = 20;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const hasEmail = chunk.every(r => !!r.email);
      let res;
      if (hasEmail) {
        res = await supabase.from('profiles').upsert(chunk, { onConflict: 'email' }).select('id');
      } else {
        res = await supabase.from('profiles').insert(chunk).select('id');
      }
      if (res.error) {
        for (let j = 0; j < chunk.length; j++) {
          const r = chunk[j];
          const single = r.email
            ? await supabase.from('profiles').upsert(r, { onConflict: 'email' })
            : await supabase.from('profiles').insert(r);
          if (single.error) errors.push({ row: i + j + 1, msg: single.error.message });
          else ok++;
        }
      } else {
        ok += chunk.length;
      }
    }
    setStats({ ok, failed: errors.length, errors });
    setImporting(false);
    addToast({ type: ok > 0 ? 'success' : 'error', message: `Importados: ${ok} · Fallidos: ${errors.length}` });
  };

  const sampleJSON = `[
  {
    "name": "DJ Mambo King",
    "role": "dj",
    "city": "Madrid",
    "instagram_url": "@mambokingdj",
    "styles": ["Salsa", "Mambo"]
  }
]`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-pink-500" /> Importador inteligente
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pega un <b>link</b> y la IA detecta si es un evento, un local o un perfil — o importa perfiles en masa con JSON/CSV.
        </p>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2">
        <button onClick={() => setMode('link')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${mode === 'link' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <Sparkles className="w-4 h-4" /> Desde link (IA)
        </button>
        <button onClick={() => setMode('bulk')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${mode === 'bulk' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
          <FileText className="w-4 h-4" /> JSON / CSV
        </button>
      </div>

      {mode === 'link' ? (
        <div className="space-y-4">
          {/* URL + analizar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !analyzing && analyze()}
                placeholder="https://www.goandance.com/es/evento/..."
                className="input-field pl-9"
              />
            </div>
            <button onClick={analyze} disabled={analyzing || !url.trim()}
              className="btn-orange flex items-center gap-2 whitespace-nowrap">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Analizando…' : 'Analizar con IA'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Funciona con páginas de eventos (goandance, festivales…), locales/academias y perfiles de artistas. La IA lee la página y rellena los campos.
          </p>

          {/* Resultado */}
          {result && (
            <div className="card-white p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${TYPE_META[result.type].color}`}>
                  {TYPE_META[result.type].icon} Detectado: {TYPE_META[result.type].label}
                </span>
                {typeof result.confidence === 'number' && (
                  <span className="text-xs text-gray-400">confianza {result.confidence}%</span>
                )}
                {/* Cambiar tipo manualmente */}
                <div className="ml-auto flex gap-1">
                  {(Object.keys(TYPE_META) as SmartType[]).map(t => (
                    <button key={t} onClick={() => setResult({ ...result, type: t })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold ${result.type === t ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Imagen detectada */}
              {(() => { try { const d = JSON.parse(editJson); const img = d.image_url || d.avatar_url; return img
                ? <img src={img} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
                : null; } catch { return null; } })()}

              {/* Datos editables */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Datos extraídos (puedes editarlos)
                </label>
                <textarea value={editJson} onChange={e => setEditJson(e.target.value)}
                  rows={14} className="input-field font-mono text-xs resize-none" />
              </div>

              <button onClick={importSmart} disabled={savingSmart}
                className="btn-orange flex items-center gap-2">
                {savingSmart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar como {TYPE_META[result.type].label}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Datos</label>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                placeholder={sampleJSON}
                rows={18}
                className="input-field font-mono text-xs resize-none" />
              <div className="text-xs text-gray-500 mt-1">{totalParsed} fila(s) detectada(s)</div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Vista previa (5 primeras)</label>
              <div className="card-white p-3 max-h-[460px] overflow-y-auto text-xs">
                {preview.length === 0
                  ? <div className="text-gray-400">Pega datos para ver el preview...</div>
                  : <pre className="whitespace-pre-wrap break-words">{JSON.stringify(preview, null, 2)}</pre>}
              </div>
            </div>
          </div>

          <button onClick={handleImport} disabled={importing || totalParsed === 0}
            className="btn-orange flex items-center gap-2">
            {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {importing ? 'Importando...' : `Importar ${totalParsed} perfil(es)`}
          </button>

          {stats && (
            <div className="card-white p-4 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4" /> {stats.ok} OK</span>
                <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-4 h-4" /> {stats.failed} fallidos</span>
              </div>
              {stats.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-xs">
                  {stats.errors.map(e => (
                    <div key={e.row} className="text-red-500">Fila {e.row}: {e.msg}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileImporter;
