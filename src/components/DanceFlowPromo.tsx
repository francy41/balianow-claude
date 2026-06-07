/**
 * DanceFlowPromo — banner vistoso del módulo DanceFlow para el home
 *
 * Invita a entrar a la "clase virtual" con avatares IA + cámara + ranking.
 * Muestra avatares en miniatura + top 3 del ranking como teaser.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, Trophy, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { countryFlag } from '../lib/countries';
import { useI18n } from '../lib/i18n';

const DanceFlowPromo: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [avatars, setAvatars] = useState<{ id: string; emoji: string; gradient: string; avatar_url?: string | null }[]>([]);
  const [top3, setTop3] = useState<{ name: string; country_code: string; total_points: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from('dance_choreographers')
        .select('id, avatar_emoji, gradient, avatar_url')
        .eq('active', true).limit(6);
      setAvatars((a || []).map((x: any) => ({ id: x.id, emoji: x.avatar_emoji, gradient: x.gradient, avatar_url: x.avatar_url })));

      const { data: r } = await supabase
        .from('dance_world_leaderboard')
        .select('name, country_code, total_points')
        .order('world_rank', { ascending: true }).limit(3);
      setTop3((r as any) || []);
    })();
  }, []);

  return (
    <section className="mx-3 sm:mx-4 mt-6">
      <div
        onClick={() => navigate('/baila-ia')}
        className="relative overflow-hidden rounded-3xl cursor-pointer group"
        style={{ background: 'linear-gradient(135deg, #1a0033 0%, #2d0052 50%, #060608 100%)' }}
      >
        {/* Glow decorativo */}
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 20% 20%, #ff3e6c 0%, transparent 40%), radial-gradient(circle at 80% 70%, #a855f7 0%, transparent 40%)' }} />

        <div className="relative p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-bold text-white mb-3 border border-white/10">
                <Sparkles className="w-3 h-3 text-[#ff3e6c]" /> NUEVO · ACADEMIA IA
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl leading-tight mb-1.5">
                <span className="bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] bg-clip-text text-transparent">DanceFlow</span>
                <span className="text-white"> — Baila con IA</span>
              </h2>
              <p className="text-white/60 text-xs sm:text-sm max-w-md mb-4">
                Entra a tu clase virtual: elige escenario, coreógrafo y aparece bailando con tu cámara 💃
              </p>

              {/* Features mini */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded-full"><Camera className="w-3 h-3" /> Tu cámara</span>
                <span className="inline-flex items-center gap-1 bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded-full">🪩 10 escenarios</span>
                <span className="inline-flex items-center gap-1 bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded-full"><Trophy className="w-3 h-3 text-[#f5c542]" /> Ranking mundial</span>
              </div>

              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold text-sm px-5 py-2.5 rounded-xl group-hover:scale-105 transition-transform shadow-lg shadow-[#ff3e6c]/30">
                <Play className="w-4 h-4 fill-white" /> Empezar mi clase
              </button>
            </div>

            {/* Avatares en miniatura (desktop) */}
            <div className="hidden sm:flex flex-col items-end gap-3 flex-shrink-0">
              <div className="flex -space-x-3">
                {avatars.slice(0, 5).map(a => (
                  <div key={a.id} className={`w-12 h-12 rounded-full border-2 border-[#1a0033] bg-gradient-to-br ${a.gradient} flex items-center justify-center overflow-hidden`}>
                    {a.avatar_url
                      ? <img src={a.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-xl">{a.emoji}</span>}
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-2 border-[#1a0033] bg-white/10 backdrop-blur flex items-center justify-center text-white text-[10px] font-bold">+15</div>
              </div>

              {/* Top 3 teaser */}
              {top3.length > 0 && (
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-2.5 border border-white/10 w-44">
                  <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><Trophy className="w-3 h-3 text-[#f5c542]" /> Top mundial</p>
                  {top3.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-xs">{['🥇','🥈','🥉'][i]}</span>
                      <span className="text-sm">{countryFlag(r.country_code)}</span>
                      <span className="text-white text-[11px] font-semibold truncate flex-1">{r.name}</span>
                      <span className="text-[#ff8c42] text-[10px] font-black">{(r.total_points / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DanceFlowPromo;
