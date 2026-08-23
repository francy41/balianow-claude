/**
 * DanceProgressPanel — Panel de progreso del alumno en DanceFlow
 * Muestra: clases completadas, estrellas totales, % medio de sincronía e historial.
 */
import React, { useEffect, useState } from 'react';
import { Trophy, Star, Target, Activity, Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Summary {
  classes_completed: number;
  total_stars: number;
  avg_sync: number;
  avg_score: number;
  steps_passed: number;
  last_active: string | null;
}
interface ProgressRow {
  id: string; genre: string | null; level: string | null; choreographer: string | null;
  step_name: string | null; score: number; sync: number; rhythm: number; stars: number;
  class_complete: boolean; created_at: string;
}

const DanceProgressPanel: React.FC<{ userId?: string; refreshKey?: number }> = ({ userId, refreshKey }) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sum }, { data: hist }] = await Promise.all([
        supabase.from('dance_progress_summary').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('dance_progress').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      setSummary((sum as Summary) || null);
      setHistory((hist as ProgressRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (!userId) {
    return (
      <div className="text-center py-8 text-white/40">
        <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inicia sesión para ver tu progreso.</p>
      </div>
    );
  }

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#ff3e6c] mx-auto" /></div>;

  const stats = [
    { icon: GraduationCap, label: 'Clases', value: summary?.classes_completed ?? 0, color: 'text-emerald-400' },
    { icon: Star, label: 'Estrellas', value: summary?.total_stars ?? 0, color: 'text-yellow-400' },
    { icon: Target, label: 'Sync medio', value: `${summary?.avg_sync ?? 0}%`, color: 'text-pink-400' },
    { icon: Activity, label: 'Pasos', value: summary?.steps_passed ?? 0, color: 'text-fuchsia-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
            <s.icon className={`w-6 h-6 mx-auto mb-1.5 ${s.color}`} />
            <p className="text-2xl font-black text-white leading-none">{s.value}</p>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Historial */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Historial reciente</p>
        {history.length === 0 ? (
          <div className="text-center py-8 text-white/40 bg-white/5 rounded-2xl">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aún no tienes actividad. ¡Empieza tu primera clase! 💃</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${h.class_complete ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'}`}>
                {h.class_complete
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  : <div className="flex-shrink-0">{Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < h.stars ? '' : 'opacity-20'}`}>⭐</span>))}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-bold truncate">
                    {h.class_complete ? '🏆 Clase completada' : (h.step_name || 'Paso')}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">
                    {[h.choreographer, h.genre, h.level].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {h.sync >= 0 && <p className="text-[11px] text-pink-300 font-bold">🎯 {h.sync}%</p>}
                  <p className="text-[10px] text-white/40">🎵 {h.rhythm}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DanceProgressPanel;
