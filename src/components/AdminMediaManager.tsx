import React, { useMemo, useRef, useState } from 'react';
import {
  Upload, Image, Video, X, Search, Trash2, Copy, Check, Film,
  FileImage, Link2, Grid, List
} from 'lucide-react';
import { useCMSStore, type MediaAsset } from '../store/cmsStore';
import { storage } from '../lib/supabase';

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  category: string;
  uploadedAt: string;
  size?: string;
}

const MEDIA_CATEGORIES = ['todos', 'banners', 'categorias', 'ciudades', 'venues', 'artistas', 'eventos', 'iconos', 'general'];

interface MediaManagerProps {
  onSelect?: (media: MediaItem) => void;
  selectionMode?: boolean;
  acceptType?: 'image' | 'video' | 'icon' | 'all';
}

const formatSize = (bytes?: number) => {
  if (!bytes) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mapAssetToItem = (item: MediaAsset): MediaItem => ({
  id: item.id,
  url: item.url,
  name: item.name,
  type: item.type,
  category: item.folder || 'general',
  uploadedAt: new Date(item.uploadedAt).toISOString().split('T')[0],
  size: formatSize(item.size),
});

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });

const inferTypeFromUrl = (url: string): MediaItem['type'] => {
  const clean = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(clean)) return 'video';
  return 'image';
};

const AdminMediaManager: React.FC<MediaManagerProps> = ({ onSelect, selectionMode = false, acceptType = 'all' }) => {
  const { media, addMedia, removeMedia } = useCMSStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlCategory, setUrlCategory] = useState('general');
  const [showUrlForm, setShowUrlForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => media.map(mapAssetToItem), [media]);

  const filtered = items.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'todos' || m.category === activeCategory;
    const matchType =
      acceptType === 'all' ||
      m.type === acceptType ||
      (acceptType === 'icon' && m.type === 'image' && m.category === 'iconos');
    return matchSearch && matchCat && matchType;
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        let finalUrl = '';
        const storagePath = `admin-media/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
        const uploaded = await storage.upload('media', storagePath, file);

        if (uploaded.url) {
          finalUrl = uploaded.url;
        } else {
          finalUrl = await fileToDataUrl(file);
        }

        addMedia({
          url: finalUrl,
          name: file.name,
          type: file.type.startsWith('video') ? 'video' : 'image',
          folder: 'general',
          size: file.size,
          mimeType: file.type,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    addMedia({
      url: trimmed,
      name: trimmed.split('/').pop()?.split('?')[0] || 'external-file',
      type: inferTypeFromUrl(trimmed),
      folder: urlCategory || 'general',
    });
    setUrlInput('');
    setUrlCategory('general');
    setShowUrlForm(false);
  };

  const handleCopy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <FileImage className="w-5 h-5 text-pink-500" />
          Media Manager
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUrlForm(!showUrlForm)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-pink-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-pink-300 transition-all"
          >
            <Link2 className="w-4 h-4" /> URL
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 px-4 py-1.5 rounded-lg transition-all"
          >
            <Upload className="w-4 h-4" /> Subir archivo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {showUrlForm && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto_auto] gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
          </div>
          <select
            value={urlCategory}
            onChange={(e) => setUrlCategory(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
          >
            {MEDIA_CATEGORIES.filter((c) => c !== 'todos').map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button onClick={handleAddUrl} className="bg-pink-500 text-white text-xs font-semibold px-3 py-2 rounded-lg">
            Añadir
          </button>
          <button onClick={() => setShowUrlForm(false)} className="text-gray-400 hover:text-gray-600 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${dragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-pink-500">
            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Guardando archivos...</span>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Arrastra archivos aquí o{' '}
              <button onClick={() => fileRef.current?.click()} className="text-pink-500 font-semibold hover:underline">
                selecciona
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, SVG, MP4, WebM - persistentes en la configuración</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/20"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {MEDIA_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${activeCategory === cat ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => selectionMode && onSelect?.(item)}
              className={`group relative rounded-xl overflow-hidden border transition-all ${selectionMode ? 'cursor-pointer hover:ring-2 hover:ring-pink-500' : ''} border-gray-200 hover:border-pink-300 bg-white`}
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {item.type === 'video' ? (
                  item.url.startsWith('data:video') ? (
                    <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film className="w-8 h-8 text-white/50" />
                    </div>
                  )
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all" title="Copiar URL">
                      {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-700" />}
                    </button>
                    {!selectionMode && (
                      <button onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50 transition-all" title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400">{item.size || item.category}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => selectionMode && onSelect?.(item)}
              className={`flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-pink-300 bg-white transition-all ${selectionMode ? 'cursor-pointer' : ''}`}
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {item.type === 'video' ? (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <Video className="w-5 h-5 text-white/50" />
                  </div>
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.type} • {item.category} • {item.uploadedAt}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Copiar URL">
                  {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                {!selectionMode && (
                  <button onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No se encontraron archivos</p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">{filtered.length} archivo(s) • Media persistente en el panel</p>
    </div>
  );
};

export default AdminMediaManager;
