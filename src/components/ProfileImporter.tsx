/**
 * ProfileImporter — herramienta admin para importar perfiles en bloque
 *
 * Casos de uso:
 *  - Extraer perfiles de otras webs (ej. lista de DJs, bailarines, profes)
 *    y pegarlos como JSON / CSV / TSV
 *  - Bulk upsert con auto-geocoding desde la ciudad
 *  - Inserta en `profiles` con role configurable (artist/dj/dancer/instructor/venue)
 *
 * Acepta:
 *  - JSON array:    [{name, city, ...}, ...]
 *  - CSV:           cabecera + filas separadas por coma
 *  - TSV:           cabecera + filas separadas por tab
 *
 * Cada perfil mínimamente necesita un `name`. Resto opcional:
 *   email, full_name, bio, city, location, country, avatar_url, cover_photo,
 *   instagram_url, tiktok_url, youtube_url, facebook_url, website_url,
 *   spotify_url, soundcloud_url, twitch_url, whatsapp, phone, styles, tags,
 *   lat, lng
 *
 * Si el perfil no tiene lat/lng pero sí ciudad, se geocodifica automáticamente.
 * Si no tiene id, se genera uno (los importados no son cuentas auth — son
 * registros públicos visibles en directorio).
 */
import React, { useState, useMemo } from 'react';
import {
  Upload, FileText, Database, CheckCircle, AlertCircle, Loader2,
  X, Plus, Trash2, Eye, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
import { resolveCityCoords } from '../lib/geo';
import { Button } from './ui';

type Role = 'artist' | 'dj' | 'dancer' | 'instructor' | 'singer' | 'band' | 'venue' | 'business' | 'promoter';
type Format = 'json' | 'csv' | 'tsv';

interface ParsedProfile {
  // Identificación
  id?: string;
  name: string;             // requerido
  full_name?: string;
  email?: string;
  role: Role;

  // Visual
  avatar_url?: string;
  cover_photo?: string;
  bio?: string;

  // Ubicación
  city?: string;
  location?: string;
  country?: string;
  lat?: number;
  lng?: number;

  // Contacto + redes
  whatsapp?: string;
  phone?: string;
  instagram_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  facebook_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
  twitch_url?: string;
  website_url?: string;

  // Categorización
  styles?: string[];
  tags?: string[];

  // Marcadores
  verified?: boolean;
  is_premium?: boolean;

  // Metadata (no se envía a la BD)
  _row?: number;
  _error?: string;
}

const REQUIRED = ['name'];
const ARRAY_FIELDS = new Set(['styles', 'tags']);
const BOOL_FIELDS = new Set(['verified', 'is_premium']);
const NUM_FIELDS = new Set(['lat', 'lng']);

const SAMPLE_JSON = `[
  {
    "name": "DJ Mambo King",
    "role": "dj",
    "city": "Madrid",
    "bio": "El rey del mambo madrileño. 15 años moviendo pistas.",
    "avatar_url": "https://picsum.photos/seed/mambo/400",
    "instagram_url": "@mambokingdj",
    "styles": ["Salsa", "Mambo", "Timba"]
  },
  {
    "name": "Carla Bachata",
    "role": "dancer",
    "city": "Barcelona",
    "instagram_url": "@carlabachata",
    "styles": ["Bachata", "Bachata Sensual"]
  }
]`;

const SAMPLE_CSV = `name,role,city,bio,instagram_url,styles
DJ Mambo King,dj,Madrid,El rey del mambo,@mambokingdj,"Salsa;Mambo;Timba"
Carla Bachata,dancer,Barcelona,Profesional de bachata,@carlabachata,"Bachata;Sensual"`;

function parseCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseTabular(text: string, delim: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0], delim).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = parseCSVLine(line, delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

function coerceField(key: string, val: any): any {
  if (val === null || val === undefined || val === '') return undefined;
  if (ARRAY_FIELDS.has(key)) {
    if (Array.isArray(val)) return val;
    return String(val).split(/[;,]/).map(s => s.trim()).filter(Boolean);
  }
  if (BOOL_FIELDS.has(key)) {
    return val === true || val === 'true' || val === '1' || val === 1 || val === 'yes' || val === 'sí';
  }
  if (NUM_FIELDS.has(key)) {
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  }
  return val;
}

function normalizeRecord(raw: Record<string, any>, defaultRole: Role, idx: number): ParsedProfile {
  const profile: ParsedProfile = { name: '', role: defaultRole, _row: idx + 1 };
  for (const [k, v] of Object.entries(raw)) {
    const key = k.toLowerCase();
    const coerced = coerceField(key, v);
    if (coerced !== undefined) (profile as any)[key] = coerced;
  }
  // Aliases comunes
  if (!profile.name && (raw as any).full_name) profile.name = (raw as any).full_name;
  if (!profile.full_name && profile.name) profile.full_name = profile.name;
  if (!profile.city && profile.location) profile.city = profile.location;
  if (!profile.location && profile.city) profile.location = profile.city;
  if (!profile.role) profile.role = defaultRole;

  // Geo auto
  if ((!profile.lat || !profile.lng) && profile.city) {
    const coords = resolveCityCoords(profile.city);
    if (coords) { profile.lat = coords[0]; profile.lng = coords[1]; }
  }

  // Validación
  if (!profile.name?.trim()) profile._error = 'Falta name';
  return profile;
}

const ProfileImporter: React.FC = () => {
  const { addToast } = useUIStore();
  const [format, setFormat] = useState<Format>('json');
  const [text, setText] = useState('');
  const [defaultRole, setDefaultRole] = useState<Role>('artist');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ row: number; name: string; error: string }[]>([]);

  const parsed = useMemo<ParsedProfile[]>(() => {
    if (!text.trim()) return [];
    try {
      if (format === 'json') {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [data];
        return arr.map((r, i) => normalizeRecord(r, defaultRole, i));
      }
      const delim = format === 'csv' ? ',' : '\t';
      const rows = parseTabular(text, delim);
      return rows.map((r, i) => normalizeRecord(r, defaultRole, i));
    } catch (e: any) {
      return [];
    }
  }, [text, format, defaultRole]);

  const valid = parsed.filter(p => !p._error);
  const invalid = parsed.filter(p => p._error);

  const handleImport = async () => {
    if (valid.length === 0) {
      addToast({ message: 'No hay perfiles válidos para importar', type: 'error' });
      return;
    }

    if (!confirm(`Importar ${valid.length} perfiles a la BD?`)) return;

    setImporting(true);
    setErrors([]);
    setImportedCount(null);

    const ok: ParsedProfile[] = [];
    const fail: { row: number; name: string; error: string }[] = [];

    // Insert en lotes de 20 para no saturar
    const BATCH = 20;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      const rows = batch.map(p => {
        const { _row, _error, ...clean } = p as any;
        return clean;
      });

      // Intentamos upsert por email (si está) o id, si no, plain insert
      const hasEmails = rows.every(r => r.email);
      try {
        let query = supabase.from('profiles').insert(rows);
        if (hasEmails) query = supabase.from('profiles').upsert(rows, { onConflict: 'email' });

        const { data, error } = await query.select();
        if (error) throw error;
        ok.push(...batch);
      } catch (e: any) {
        // Fallback fila a fila para identificar el culpable
        for (const r of batch) {
          const { _row, _error, ...clean } = r as any;
          try {
            const { error } = await supabase.from('profiles').insert(clean);
            if (error) throw error;
            ok.push(r);
          } catch (rowErr: any) {
            fail.push({ row: r._row || 0, name: r.name, error: rowErr.message?.slice(0, 200) || 'desconocido' });
          }
        }
      }
    }

    setImportedCount(ok.length);
    setErrors(fail);
    setImporting(false);
    addToast({
      message: `✅ ${ok.length} importados · ${fail.length} fallos`,
      type: fail.length === 0 ? 'success' : 'warning',
    });
  };

  const loadSample = () => {
    setText(format === 'json' ? SAMPLE_JSON : SAMPLE_CSV);
  };

  const clearAll = () => {
    setText('');
    setImportedCount(null);
    setErrors([]);
  };

  return (
    <div className="space-y-5">
      <div className="card-white p-5">
        <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
          <div>
            <h2 className="font-display font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-orange" /> Importar perfiles en bloque
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              Pega JSON, CSV o TSV de perfiles extraídos de otras webs. Se geocodifican y guardan en <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">profiles</code>.
            </p>
          </div>
        </div>

        {/* Formato + rol por defecto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Formato</label>
            <div className="flex gap-1">
              {(['json', 'csv', 'tsv'] as Format[]).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${
                    format === f ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Rol por defecto (si la fila no lo trae)</label>
            <select value={defaultRole} onChange={e => setDefaultRole(e.target.value as Role)} className="input-field">
              <option value="artist">Artista</option>
              <option value="dj">DJ</option>
              <option value="dancer">Bailarín/a</option>
              <option value="instructor">Instructor/a</option>
              <option value="singer">Cantante</option>
              <option value="band">Banda</option>
              <option value="venue">Local / Venue</option>
              <option value="business">Vendedor / Business</option>
              <option value="promoter">Promotor</option>
            </select>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-2 mb-2 flex-wrap">
          <button onClick={loadSample} className="text-xs text-brand-orange hover:text-pink-600 font-bold flex items-center gap-1">
            <FileText className="w-3 h-3" /> Cargar ejemplo
          </button>
          {text && (
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={12}
          spellCheck={false}
          placeholder={format === 'json' ? 'Pega tu array JSON aquí...' : 'Pega tu ' + format.toUpperCase() + ' aquí (primera fila = cabeceras)'}
          className="w-full input-field font-mono text-xs"
          style={{ resize: 'vertical', minHeight: 200 }}
        />

        {/* Estadísticas */}
        {text && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{parsed.length}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Detectados</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-600">{valid.length}</p>
              <p className="text-[10px] text-green-700 uppercase font-bold">Válidos</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-600">{invalid.length}</p>
              <p className="text-[10px] text-red-700 uppercase font-bold">Con errores</p>
            </div>
          </div>
        )}

        {/* Errores de validación */}
        {invalid.length > 0 && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto text-xs">
            {invalid.slice(0, 10).map((p, i) => (
              <p key={i} className="text-red-700"><AlertCircle className="w-3 h-3 inline mr-1" /> Fila {p._row}: {p._error}</p>
            ))}
            {invalid.length > 10 && <p className="text-red-600 italic">…y {invalid.length - 10} más</p>}
          </div>
        )}

        {/* Botón importar */}
        {valid.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">Se insertarán {valid.length} perfiles. Si traen <code>email</code>, se hace upsert por email.</p>
            <Button
              variant="orange"
              icon={importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              onClick={handleImport}
              loading={importing}
            >
              {importing ? 'Importando…' : `Importar ${valid.length}`}
            </Button>
          </div>
        )}
      </div>

      {/* Preview de los primeros perfiles parseados */}
      {valid.length > 0 && (
        <div className="card-white p-5">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-brand-orange" /> Preview ({Math.min(5, valid.length)} de {valid.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {valid.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white font-black">{p.name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {p.role} · {p.city || 'sin ciudad'}
                    {p.lat ? ` · 📍 ${p.lat.toFixed(2)},${p.lng?.toFixed(2)}` : ''}
                    {(p.styles?.length ?? 0) > 0 ? ` · ${p.styles!.join(', ')}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado tras importar */}
      {importedCount !== null && (
        <div className="card-white p-5 border-2 border-green-500">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-black text-lg text-gray-900 dark:text-white">Importación completada</h3>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            ✅ {importedCount} perfiles guardados en la BD · {errors.length} fallaron
          </p>
          {errors.length > 0 && (
            <div className="mt-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 max-h-48 overflow-y-auto text-xs">
              {errors.map((e, i) => (
                <p key={i} className="text-red-700 mb-1">
                  <strong>Fila {e.row} ({e.name}):</strong> {e.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ayuda */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200">
        <p className="font-bold mb-2">💡 Tips para el JSON / CSV:</p>
        <ul className="space-y-1 pl-4 list-disc">
          <li><strong>name</strong> es el único campo obligatorio</li>
          <li><strong>city</strong> auto-geocodifica a lat/lng (Madrid, Barcelona, Paris, Miami, Cali, etc.)</li>
          <li><strong>styles</strong> y <strong>tags</strong> aceptan array JSON o lista separada por <code>;</code> en CSV</li>
          <li>Si traen <strong>email</strong>, se hace UPSERT (no duplica)</li>
          <li>Los perfiles importados aparecen en Cerca de mí, Artistas, Mapa según su <strong>role</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default ProfileImporter;
