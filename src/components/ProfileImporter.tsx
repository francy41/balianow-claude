import React, { useMemo, useState } from 'react';
import { Loader2, Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
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
  // styles / tags pueden venir como string separado por comas
  for (const k of ['styles', 'tags']) {
    if (typeof r[k] === 'string') {
      r[k] = r[k].split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
    }
  }
  // role default
  if (!r.role) r.role = 'user';
  // geo
  if (r.city && (r.lat == null || r.lng == null)) {
    const c = resolveCityCoords(r.city);
    if (c) { r.lat = c.lat; r.lng = c.lng; }
  }
  // filtrar solo campos conocidos
  const out: Row = {};
  for (const f of KNOWN_FIELDS) if (r[f] !== undefined && r[f] !== '') out[f] = r[f];
  if (typeof r.lat === 'number') out.lat = r.lat;
  if (typeof r.lng === 'number') out.lng = r.lng;
  return out;
}

const ProfileImporter: React.FC = () => {
  const addToast = useUIStore(s => s.addToast);
  const [input, setInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<{ ok: number; failed: number; errors: { row: number; msg: string }[] } | null>(null);

  const preview = useMemo(() => parseInput(input).slice(0, 5).map(normalizeRow), [input]);
  const totalParsed = useMemo(() => parseInput(input).length, [input]);

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
        // fila a fila para identificar cuál falla
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
  },
  {
    "name": "Carla Bailarina",
    "role": "dancer",
    "city": "Barcelona",
    "email": "carla@example.com",
    "styles": "Bachata, Kizomba"
  }
]`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-pink-500" /> Importar perfiles
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pega JSON o CSV con columnas: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{KNOWN_FIELDS.join(', ')}</code>
        </p>
      </div>

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
    </div>
  );
};

export default ProfileImporter;
