/**
 * ChoreographyPage — /coreografias
 *
 * Estudio Coreográfico: el coreógrafo crea PRODUCCIONES y diseña la coreografía
 * en una pista cenital con bailarines, línea de tiempo, formaciones y música.
 * Inspirado en software de planificación de ensayos con avatares.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, Calendar, Trash2, ArrowLeft, Globe, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { usePageMeta } from '../hooks/usePageMeta';
import ChoreoPlanner from '../components/ChoreoPlanner';
import { emptyProduction, type ProductionData } from '../lib/choreo';

interface Production {
  id: string;
  name: string;
  event_date: string | null;
  cover_emoji: string;
  data: ProductionData;
  is_public: boolean;
  updated_at: string;
}

const ChoreographyPage: React.FC = () => {
  usePageMeta({ title: 'Estudio Coreográfico · BailaNow', description: 'Diseña coreografías con bailarines, formaciones y música en una pista interactiva.' });
  const { user, isAuthenticated } = useAuthStore();
  const addToast = useUIStore(s => s.addToast);

  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Production | null>(null);
  const [saving, setSaving] = useState(false);
  const draftRef = React.useRef<ProductionData | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('dance_productions').select('*')
      .eq('owner_id', user.id).order('updated_at', { ascending: false });
    setProductions((data as Production[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const createProduction = async () => {
    if (!user?.id) return;
    const name = window.prompt('Nombre de la producción:', 'Nueva coreografía');
    if (!name) return;
    const { data, error } = await supabase.from('dance_productions').insert({
      owner_id: user.id, name, data: emptyProduction(), cover_emoji: '💃',
    }).select().single();
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    await load();
    setEditing(data as Production);
  };

  const saveProduction = async (prodId: string, newData: ProductionData) => {
    setSaving(true);
    const { error } = await supabase.from('dance_productions').update({ data: newData }).eq('id', prodId);
    setSaving(false);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    addToast({ type: 'success', message: '✅ Coreografía guardada' });
    setProductions(ps => ps.map(p => p.id === prodId ? { ...p, data: newData } : p));
  };

  const removeProduction = async (id: string) => {
    if (!window.confirm('¿Eliminar esta producción?')) return;
    await supabase.from('dance_productions').delete().eq('id', id);
    setProductions(ps => ps.filter(p => p.id !== id));
  };

  const togglePublic = async (p: Production) => {
    const next = !p.is_public;
    await supabase.from('dance_productions').update({ is_public: next }).eq('id', p.id);
    setProductions(ps => ps.map(x => x.id === p.id ? { ...x, is_public: next } : x));
    if (next) {
      const url = `${window.location.origin}/coreografias?ver=${p.id}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      addToast({ type: 'success', message: '🔗 Enlace público copiado al portapapeles' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 gap-4">
        <Sparkles className="w-16 h-16 text-pink-500" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Estudio Coreográfico</h1>
        <p className="text-gray-500 max-w-sm">Inicia sesión para crear y diseñar tus coreografías con bailarines, formaciones y música.</p>
        <Link to="/auth?redirect=/coreografias" className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-8 py-3 rounded-2xl">Iniciar sesión</Link>
      </div>
    );
  }

  // ── EDITOR ──
  if (editing) {
    return (
      <div className="fixed inset-0 z-[90] bg-[#070710] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
          <button onClick={() => { setEditing(null); load(); }} className="p-2 hover:bg-white/10 rounded-xl text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black truncate">{editing.cover_emoji} {editing.name}</h1>
            <p className="text-white/40 text-xs">Estudio Coreográfico</p>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <ChoreoPlanner
            initialData={editing.data && Object.keys(editing.data).length ? editing.data : emptyProduction()}
            userId={user?.id}
            saving={saving}
            onChange={(d) => { draftRef.current = d; }}
            onSave={(d) => saveProduction(editing.id, d)}
          />
        </div>
      </div>
    );
  }

  // ── LISTA ──
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="text-pink-500" /> Estudio Coreográfico
          </h1>
          <p className="text-gray-500 text-sm mt-1">Diseña tus coreografías con bailarines, formaciones, recorridos y música.</p>
        </div>
        <button onClick={createProduction} className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nueva producción
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
      ) : productions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Sparkles className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="font-bold text-lg">Aún no tienes producciones</p>
          <p className="text-sm mb-5">Crea tu primera coreografía y empieza a diseñar.</p>
          <button onClick={createProduction} className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2">
            <Plus className="w-5 h-5" /> Crear producción
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productions.map(p => (
            <div key={p.id} className="bg-white dark:bg-[#12121e] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden group">
              <button onClick={() => setEditing(p)}
                className="w-full aspect-video bg-gradient-to-br from-pink-500/20 to-fuchsia-600/20 flex items-center justify-center text-6xl">
                {p.cover_emoji || '💃'}
              </button>
              <div className="p-3">
                <h3 className="font-black text-gray-900 dark:text-white truncate">{p.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <Calendar className="w-3 h-3" />
                  {p.event_date || 'Sin fecha'}
                  <span className="ml-auto">{p.data?.dancers?.length || 0} 💃</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setEditing(p)} className="flex-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold py-2 rounded-xl text-xs">
                    Abrir editor
                  </button>
                  <button onClick={() => togglePublic(p)} title={p.is_public ? 'Público' : 'Privado'}
                    className={`p-2 rounded-xl ${p.is_public ? 'bg-green-500/10 text-green-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                    {p.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                  <button onClick={() => removeProduction(p.id)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChoreographyPage;
