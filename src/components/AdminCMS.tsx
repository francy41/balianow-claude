import React, { useState, useRef } from 'react';
import {
  Layers, Menu as MenuIcon, LayoutDashboard, Image as ImageIcon, History,
  Plus, ChevronUp, ChevronDown, Copy, Trash2, RotateCcw, Eye, EyeOff,
  Save, Upload, FolderPlus, X, Edit3, ExternalLink
} from 'lucide-react';
import { useCMSStore, type CMSCategory, type HomeModule, type CMSMenuItem, type MediaAsset } from '../store/cmsStore';
import { useUIStore } from '../store/appStore';
import { Button } from './ui';

type CMSTab = 'categories' | 'menu' | 'modules' | 'media' | 'history';

const TABS: { id: CMSTab; label: string; icon: React.ReactNode }[] = [
  { id: 'categories', label: 'Categorías',     icon: <Layers className="w-4 h-4" /> },
  { id: 'menu',       label: 'Menús',          icon: <MenuIcon className="w-4 h-4" /> },
  { id: 'modules',    label: 'Constructor Home', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'media',      label: 'Media Library',  icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'history',    label: 'Versiones',      icon: <History className="w-4 h-4" /> },
];

const AdminCMS: React.FC = () => {
  const [tab, setTab] = useState<CMSTab>('categories');
  return (
    <div>
      <div>
        <h2 className="font-display font-black text-2xl text-gray-900">Panel CMS</h2>
        <p className="text-gray-400 text-sm">Edita categorías, menús, secciones del home y media sin tocar código. Cambios en vivo.</p>
      </div>

      <div className="card-white rounded-2xl p-1.5 my-6 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'menu'       && <MenuPanel />}
      {tab === 'modules'    && <ModulesPanel />}
      {tab === 'media'      && <MediaPanel />}
      {tab === 'history'    && <HistoryPanel />}
    </div>
  );
};

// ── CATEGORÍAS ────────────────────────────────────────────────────────────
const CategoriesPanel: React.FC = () => {
  const cms = useCMSStore();
  const { addToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Partial<CMSCategory> | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const visible = cms.categories.filter(c => showDeleted ? c.isDeleted : !c.isDeleted).sort((a, b) => a.order - b.order);

  const save = () => {
    if (!edit?.name?.trim()) { addToast({ message: 'Falta el nombre', type: 'error' }); return; }
    cms.snapshot('categories', `Edición de "${edit.name}"`);
    if (edit.id) {
      cms.updateCategory(edit.id, edit);
      addToast({ message: 'Categoría actualizada', type: 'success' });
    } else {
      cms.addCategory(edit);
      addToast({ message: 'Categoría creada', type: 'success' });
    }
    setEdit(null); setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={() => setShowDeleted(false)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg ${!showDeleted ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
            Activas ({cms.categories.filter(c => !c.isDeleted).length})
          </button>
          <button onClick={() => setShowDeleted(true)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg ${showDeleted ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
            Papelera ({cms.categories.filter(c => c.isDeleted).length})
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { cms.snapshot('categories', 'Reset categorías'); cms.resetCategories(); addToast({ message: 'Categorías reseteadas', type: 'info' }); }}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold">↺ Reset</button>
          <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => { setEdit({}); setShowForm(true); }}>
            Nueva categoría
          </Button>
        </div>
      </div>

      {showForm && edit && (
        <div className="card-white p-5 border-2 border-brand-orange">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={edit.name || ''} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre" className="input-field" />
            <input value={edit.slug || ''} onChange={e => setEdit({ ...edit, slug: e.target.value })} placeholder="slug-url-amigable" className="input-field font-mono" />
            <input value={edit.icon || ''} onChange={e => setEdit({ ...edit, icon: e.target.value })} placeholder="Emoji icono (ej. 🎤)" className="input-field text-center text-2xl" />
            <div className="flex items-center gap-2">
              <input type="color" value={edit.color || '#EC4899'} onChange={e => setEdit({ ...edit, color: e.target.value })} className="h-10 w-16 rounded-lg cursor-pointer" />
              <input value={edit.color || ''} onChange={e => setEdit({ ...edit, color: e.target.value })} placeholder="#EC4899" className="input-field font-mono flex-1" />
            </div>
            <select value={edit.layout || 'grid'} onChange={e => setEdit({ ...edit, layout: e.target.value as any })} className="input-field">
              <option value="grid">Grid</option>
              <option value="list">Lista</option>
              <option value="carousel">Carrusel</option>
            </select>
            <select value={edit.template || 'default'} onChange={e => setEdit({ ...edit, template: e.target.value as any })} className="input-field">
              <option value="default">Default</option>
              <option value="feature">Feature</option>
              <option value="compact">Compact</option>
            </select>
            <select value={edit.parentId || ''} onChange={e => setEdit({ ...edit, parentId: e.target.value || null })} className="input-field md:col-span-2">
              <option value="">— Sin padre (top level) —</option>
              {cms.categories.filter(c => !c.isDeleted && c.id !== edit.id).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} placeholder="Descripción opcional" className="input-field md:col-span-3" />
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="orange" icon={<Save className="w-4 h-4" />} onClick={save}>Guardar</Button>
            <button onClick={() => { setEdit(null); setShowForm(false); }} className="text-sm text-gray-500 hover:text-gray-800 px-3">Cancelar</button>
          </div>
        </div>
      )}

      <div className="card-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-3 w-12">Orden</th>
              <th className="text-left px-3 py-3">Categoría</th>
              <th className="text-left px-3 py-3">Slug</th>
              <th className="text-left px-3 py-3">Layout</th>
              <th className="text-left px-3 py-3">Padre</th>
              <th className="text-left px-3 py-3">Estado</th>
              <th className="text-right px-3 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, i, arr) => {
              const isFirst = i === 0;
              const isLast = i === arr.length - 1;
              const parent = cms.categories.find(p => p.id === c.parentId);
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    {!showDeleted && (
                      <div className="flex flex-col">
                        <button disabled={isFirst} onClick={() => cms.moveCategoryUp(c.id)} className="disabled:opacity-30"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
                        <button disabled={isLast} onClick={() => cms.moveCategoryDown(c.id)} className="disabled:opacity-30"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: c.color + '20', color: c.color }}>{c.icon}</div>
                      <div>
                        <p className="font-bold text-gray-900">{c.name}</p>
                        {c.description && <p className="text-[10px] text-gray-400">{c.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{c.slug}</td>
                  <td className="px-3 py-2 text-xs capitalize text-gray-600">{c.layout} / {c.template}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{parent ? `${parent.icon} ${parent.name}` : '—'}</td>
                  <td className="px-3 py-2">
                    {c.isDeleted ? <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Eliminada</span>
                      : c.isActive ? <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Activa</span>
                      : <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">Oculta</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {showDeleted ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => cms.restoreCategory(c.id)} className="bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">Restaurar</button>
                        <button onClick={() => { if (confirm('¿Borrar permanentemente?')) cms.hardDeleteCategory(c.id); }} className="bg-red-100 hover:bg-red-200 text-red-700 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => cms.updateCategory(c.id, { isActive: !c.isActive })} className="bg-gray-50 hover:bg-gray-100 p-1.5 rounded" title={c.isActive ? 'Ocultar' : 'Mostrar'}>
                          {c.isActive ? <Eye className="w-3.5 h-3.5 text-gray-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                        <button onClick={() => { setEdit(c); setShowForm(true); }} className="bg-blue-50 hover:bg-blue-100 p-1.5 rounded" title="Editar"><Edit3 className="w-3.5 h-3.5 text-blue-600" /></button>
                        <button onClick={() => cms.cloneCategory(c.id)} className="bg-purple-50 hover:bg-purple-100 p-1.5 rounded" title="Duplicar"><Copy className="w-3.5 h-3.5 text-purple-600" /></button>
                        <button onClick={() => cms.softDeleteCategory(c.id)} className="bg-red-50 hover:bg-red-100 p-1.5 rounded" title="Mover a papelera"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin categorías {showDeleted ? 'en papelera' : 'activas'}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── MENÚS ─────────────────────────────────────────────────────────────────
const MenuPanel: React.FC = () => {
  const cms = useCMSStore();
  const { addToast } = useUIStore();
  const [draft, setDraft] = useState<Partial<CMSMenuItem>>({});
  const sorted = [...cms.menu].sort((a, b) => a.order - b.order);

  const add = () => {
    if (!draft.label?.trim()) { addToast({ message: 'Falta el texto', type: 'error' }); return; }
    cms.snapshot('menu', `Añadir "${draft.label}"`);
    cms.addMenuItem(draft);
    setDraft({});
    addToast({ message: 'Enlace añadido', type: 'success' });
  };

  return (
    <div className="space-y-4">
      <div className="card-white p-5">
        <h3 className="font-bold text-gray-900 mb-3">Añadir enlace al menú</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={draft.icon || ''} onChange={e => setDraft({ ...draft, icon: e.target.value })} placeholder="🎵" className="input-field text-center text-xl" />
          <input value={draft.label || ''} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="Texto del enlace" className="input-field md:col-span-2" />
          <input value={draft.to || ''} onChange={e => setDraft({ ...draft, to: e.target.value })} placeholder="/ruta o https://externa" className="input-field font-mono" />
          <Button variant="orange" onClick={add} icon={<Plus className="w-4 h-4" />}>Añadir</Button>
        </div>
      </div>

      <div className="card-white overflow-hidden">
        {sorted.map((m, i, arr) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => cms.moveMenuItemUp(m.id)} className="disabled:opacity-30"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
              <button disabled={i === arr.length - 1} onClick={() => cms.moveMenuItemDown(m.id)} className="disabled:opacity-30"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
            </div>
            <span className="text-2xl w-8 text-center">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <input value={m.label} onChange={e => cms.updateMenuItem(m.id, { label: e.target.value })}
                className="font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-brand-orange focus:outline-none w-full" />
              <input value={m.to} onChange={e => cms.updateMenuItem(m.id, { to: e.target.value })}
                className="text-xs text-gray-400 font-mono bg-transparent border-b border-transparent hover:border-gray-200 focus:border-brand-orange focus:outline-none w-full mt-0.5" />
            </div>
            <button onClick={() => cms.toggleMenuItem(m.id)} className={`text-[10px] px-2 py-1 rounded font-bold ${m.isVisible ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {m.isVisible ? '👁 Visible' : '🚫 Oculto'}
            </button>
            <button onClick={() => { cms.removeMenuItem(m.id); addToast({ message: 'Enlace eliminado', type: 'info' }); }} className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="text-right">
        <button onClick={() => { cms.snapshot('menu', 'Reset menú'); cms.resetMenu(); addToast({ message: 'Menú reseteado', type: 'info' }); }}
          className="text-xs text-gray-500 hover:text-gray-800 font-semibold">↺ Resetear menú al default</button>
      </div>
    </div>
  );
};

// ── CONSTRUCTOR HOME ──────────────────────────────────────────────────────
const ModulesPanel: React.FC = () => {
  const cms = useCMSStore();
  const { addToast } = useUIStore();
  const sorted = [...cms.modules].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-gray-700 flex items-start gap-2">
        <LayoutDashboard className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p>Cada bloque corresponde a una sección de la home. Reordena con las flechas, activa/desactiva con el toggle y los cambios se aplican en vivo en <code className="bg-blue-100 px-1 rounded">/</code>.</p>
      </div>

      <div className="card-white overflow-hidden">
        {sorted.map((m, i, arr) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
            <div className="flex flex-col">
              <button disabled={i === 0} onClick={() => cms.moveModuleUp(m.id)} className="disabled:opacity-30"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
              <button disabled={i === arr.length - 1} onClick={() => cms.moveModuleDown(m.id)} className="disabled:opacity-30"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="flex-1">
              <input value={m.title} onChange={e => cms.updateModuleTitle(m.id, e.target.value)}
                className="font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-brand-orange focus:outline-none w-full" />
              <p className="text-[10px] text-gray-400 font-mono">type: {m.type}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={m.enabled} onChange={() => cms.toggleModule(m.id)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-brand-orange transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
            </label>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase w-16 text-center ${m.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {m.enabled ? 'Activo' : 'Oculto'}
            </span>
          </div>
        ))}
      </div>
      <div className="text-right">
        <button onClick={() => { cms.snapshot('modules', 'Reset módulos home'); cms.resetModules(); addToast({ message: 'Módulos reseteados', type: 'info' }); }}
          className="text-xs text-gray-500 hover:text-gray-800 font-semibold">↺ Resetear orden default</button>
      </div>
    </div>
  );
};

// ── MEDIA LIBRARY ─────────────────────────────────────────────────────────
const MediaPanel: React.FC = () => {
  const cms = useCMSStore();
  const { addToast } = useUIStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string>('General');
  const [folderInput, setFolderInput] = useState('');
  const [urlAdd, setUrlAdd] = useState('');

  const folders = Array.from(new Set(['General', ...cms.media.map(m => m.folder)]));
  const items = cms.media.filter(m => m.folder === folder).sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    cms.snapshot('media', `Subir ${files.length} archivos`);
    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith('video/');
      if (isVideo) {
        // Videos: use object URL (too large for base64/localStorage)
        const url = URL.createObjectURL(file);
        cms.addMedia({ type: 'video', url, name: file.name, folder, size: file.size, mimeType: file.type });
      } else {
        // Images: convert to base64 so they persist after reload
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxW = 1200, maxH = 900;
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.85);
            cms.addMedia({ type: 'image', url: base64, name: file.name, folder, size: file.size, mimeType: file.type });
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
    addToast({ message: `${files.length} archivo(s) subidos a "${folder}"`, type: 'success' });
  };

  const addFromUrl = () => {
    if (!urlAdd.trim()) return;
    const isVideo = /\.(mp4|webm|mov)$/i.test(urlAdd) || urlAdd.includes('youtube') || urlAdd.includes('vimeo');
    cms.addMedia({
      type: isVideo ? 'video' : 'image',
      url: urlAdd.trim(),
      name: urlAdd.split('/').pop() || 'asset',
      folder,
    });
    setUrlAdd('');
    addToast({ message: 'Asset añadido desde URL', type: 'success' });
  };

  return (
    <div className="space-y-4">
      <div className="card-white p-5">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {folders.map(f => (
            <button key={f} onClick={() => setFolder(f)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg ${folder === f ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
              📁 {f} <span className="opacity-60">({cms.media.filter(m => m.folder === f).length})</span>
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input value={folderInput} onChange={e => setFolderInput(e.target.value)} placeholder="Nueva carpeta" className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg w-32" />
            <button onClick={() => { if (folderInput.trim()) { setFolder(folderInput.trim()); setFolderInput(''); } }}
              className="bg-gray-900 text-white text-xs font-bold p-1.5 rounded-lg"><FolderPlus className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 hover:border-brand-orange bg-gray-50 hover:bg-pink-50 transition-all rounded-2xl p-8 text-center cursor-pointer">
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-gray-700">Arrastra archivos aquí o haz click para subir</p>
          <p className="text-xs text-gray-400 mt-1">Imágenes y vídeos · destino: <span className="font-bold text-brand-orange">{folder}</span></p>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />

        <div className="flex gap-2 mt-3">
          <input value={urlAdd} onChange={e => setUrlAdd(e.target.value)} placeholder="O pega una URL (imagen, mp4, YouTube...)" className="input-field flex-1" />
          <Button variant="orange" onClick={addFromUrl}>Añadir desde URL</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map(m => (
          <div key={m.id} className="card-white overflow-hidden group relative">
            <div className="aspect-square bg-gray-100 overflow-hidden">
              {m.type === 'video' ? (
                m.url.includes('youtube') || m.url.includes('vimeo')
                  ? <div className="w-full h-full bg-black flex items-center justify-center text-white text-3xl">▶</div>
                  : <video src={m.url} className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-2">
              <p className="text-[10px] font-bold text-gray-700 truncate">{m.name}</p>
              <p className="text-[9px] text-gray-400">{m.type} · {m.size ? `${(m.size / 1024).toFixed(0)} KB` : '—'}</p>
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => { navigator.clipboard.writeText(m.url); addToast({ message: 'URL copiada', type: 'success' }); }}
                className="bg-white shadow text-gray-700 text-[10px] font-bold px-2 py-1 rounded">Copiar URL</button>
              <button onClick={() => cms.removeMedia(m.id)} className="bg-red-500 text-white p-1 rounded shadow"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <ImageIcon className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm">Carpeta vacía. Sube archivos arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── HISTORY ────────────────────────────────────────────────────────────────
const HistoryPanel: React.FC = () => {
  const cms = useCMSStore();
  const { addToast } = useUIStore();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{cms.history.length} snapshot(s). Se guardan los últimos 30 cambios.</p>
        <button onClick={() => { if (confirm('¿Vaciar todo el historial?')) { cms.clearHistory(); addToast({ message: 'Historial vaciado', type: 'info' }); } }}
          className="text-xs text-red-500 hover:text-red-700 font-semibold">Vaciar historial</button>
      </div>
      <div className="card-white overflow-hidden">
        {cms.history.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">Aún no hay snapshots. Cada edición crea uno automáticamente.</p>
        )}
        {cms.history.map(h => (
          <div key={h.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase font-bold w-20 text-center">{h.slice}</span>
            <div className="flex-1">
              <p className="font-bold text-sm text-gray-900">{h.description}</p>
              <p className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString('es-ES')}</p>
            </div>
            <button onClick={() => { cms.rollback(h.id); addToast({ message: `Restaurado: ${h.description}`, type: 'success' }); }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCMS;
