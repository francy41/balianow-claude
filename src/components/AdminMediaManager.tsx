import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image, Video, X, Search, Trash2, Copy, Check, Film, FileImage, Link2, Grid, List } from 'lucide-react';

// ── TYPES ────────────────────────────────────────────────────────────────────
export interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'icon';
  category: string;
  uploadedAt: string;
  size?: string;
}

// ── DEMO MEDIA LIBRARY ──────────────────────────────────────────────────────
const DEMO_MEDIA: MediaItem[] = [
  { id: 'm1', url: 'https://picsum.photos/seed/hero1/1200/600', name: 'Hero Banner 1', type: 'image', category: 'banners', uploadedAt: '2025-05-18', size: '245 KB' },
  { id: 'm2', url: 'https://picsum.photos/seed/hero2/1200/600', name: 'Hero Banner 2', type: 'image', category: 'banners', uploadedAt: '2025-05-17', size: '312 KB' },
  { id: 'm3', url: 'https://picsum.photos/seed/cat-salsa/400/400', name: 'Categoría Salsa', type: 'image', category: 'categorias', uploadedAt: '2025-05-16', size: '89 KB' },
  { id: 'm4', url: 'https://picsum.photos/seed/cat-bachata/400/400', name: 'Categoría Bachata', type: 'image', category: 'categorias', uploadedAt: '2025-05-16', size: '92 KB' },
  { id: 'm5', url: 'https://picsum.photos/seed/city-madrid/800/400', name: 'Madrid Ciudad', type: 'image', category: 'ciudades', uploadedAt: '2025-05-15', size: '178 KB' },
  { id: 'm6', url: 'https://picsum.photos/seed/city-barcelona/800/400', name: 'Barcelona Ciudad', type: 'image', category: 'ciudades', uploadedAt: '2025-05-15', size: '195 KB' },
  { id: 'm7', url: 'https://picsum.photos/seed/venue-club1/800/400', name: 'Club Tropicana', type: 'image', category: 'venues', uploadedAt: '2025-05-14', size: '210 KB' },
  { id: 'm8', url: 'https://picsum.photos/seed/artist-dj1/400/400', name: 'DJ Profile', type: 'image', category: 'artistas', uploadedAt: '2025-05-14', size: '156 KB' },
];

const MEDIA_CATEGORIES = ['todos', 'banners', 'categorias', 'ciudades', 'venues', 'artistas', 'eventos', 'iconos'];

// ── MEDIA MANAGER COMPONENT ─────────────────────────────────────────────────
interface MediaManagerProps {
  onSelect?: (media: MediaItem) => void;
  selectionMode?: boolean;
  acceptType?: 'image' | 'video' | 'icon' | 'all';
}

const AdminMediaManager: React.FC<MediaManagerProps> = ({ onSelect, selectionMode = false, acceptType = 'all' }) => {
  const [media, setMedia] = useState<MediaItem[]>(DEMO_MEDIA);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlForm, setShowUrlForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = media.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'todos' || m.category === activeCategory;
    const matchType = acceptType === 'all' || m.type === acceptType;
    return matchSearch && matchCat && matchType;
  });

  const handleUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    // Simulate upload — in production this would upload to Supabase Storage
    setTimeout(() => {
      const newMedia: MediaItem[] = Array.from(files).map((file, i) => ({
        id: `upload_${Date.now()}_${i}`,
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : 'image',
        category: 'sin-categoría',
        uploadedAt: new Date().toISOString().split('T')[0],
        size: `${(file.size / 1024).toFixed(0)} KB`,
      }));
      setMedia(prev => [...newMedia, ...prev]);
      setUploading(false);
    }, 1000);
  }, []);

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    const newItem: MediaItem = {
      id: `url_${Date.now()}`,
      url: urlInput,
      name: urlInput.split('/').pop() || 'External image',
      type: 'image',
      category: 'sin-categoría',
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setMedia(prev => [newItem, ...prev]);
    setUrlInput('');
    setShowUrlForm(false);
  };

  const handleDelete = (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
          <FileImage className="w-5 h-5 text-pink-500" />
          Media Manager
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUrlForm(!showUrlForm)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-pink-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-pink-300 transition-all">
            <Link2 className="w-4 h-4" /> URL
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-sm font-semibold text-white bg-pink-500 hover:bg-pink-600 px-4 py-1.5 rounded-lg transition-all">
            <Upload className="w-4 h-4" /> Subir archivo
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* URL Input form */}
      {showUrlForm && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
            onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
          />
          <button onClick={handleAddUrl} className="bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-lg">Añadir</button>
          <button onClick={() => setShowUrlForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Drag & Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${dragOver ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-pink-500">
            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Subiendo archivos...</span>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Arrastra archivos aquí o <button onClick={() => fileRef.current?.click()} className="text-pink-500 font-semibold hover:underline">selecciona</button></p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, MP4, WebM — Máx 10MB</p>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar media..."
            value={search}
            onChange={e => setSearch(e.target.value)}
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

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {MEDIA_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${activeCategory === cat ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => selectionMode && onSelect?.(item)}
              className={`group relative rounded-xl overflow-hidden border transition-all ${selectionMode ? 'cursor-pointer hover:ring-2 hover:ring-pink-500' : ''} border-gray-200 hover:border-pink-300 bg-white`}
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {item.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <Film className="w-8 h-8 text-white/50" />
                  </div>
                ) : (
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all" title="Copiar URL">
                      {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-700" />}
                    </button>
                    {!selectionMode && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50 transition-all" title="Eliminar">
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
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => selectionMode && onSelect?.(item)}
              className={`flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-pink-300 bg-white transition-all ${selectionMode ? 'cursor-pointer' : ''}`}
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.type} • {item.category} • {item.uploadedAt}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleCopy(item.url, item.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Copiar URL">
                  {copiedId === item.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
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

      <p className="text-xs text-gray-400 text-center">{filtered.length} archivo(s) • Media almacenado en Supabase Storage</p>
    </div>
  );
};

export default AdminMediaManager;
