/**
 * WorldLeaderboard — ranking mundial de baile con banderas de países
 *
 * Modos:
 *  - variant="full": tabla completa con tabs Mundial/Países + tu posición
 *  - variant="widget": top 5 compacto para el home
 */
import React, { useEffect, useState } from 'react';
import { Trophy, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { useI18n } from '../lib/i18n';
import { countryFlag } from '../lib/countries';

interface RankRow {
  uid: string; name: string; avatar: string | null; country_code: string; country_name: string;
  total_points: number; level: number; best_genre: string | null; world_rank: number; is_demo: boolean;
}
interface CountryRow {
  country_code: string; country_name: string; players: number;
  country_points: number; top_score: number; country_position: number;
}

const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

const WorldLeaderboard: React.FC<{ variant?: 'full' | 'widget' }> = ({ variant = 'full' }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'world' | 'countries'>('world');
  const [rows, setRows] = useState<RankRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [myRank, setMyRank] = useState<RankRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const limit = variant === 'widget' ? 5 : 100;
      try {
        const { data } = await supabase
          .from('dance_world_leaderboard')
          .select('*')
          .order('world_rank', { ascending: true })
          .limit(limit);
        if (!cancelled) setRows((data as RankRow[]) || []);

        if (variant === 'full') {
          const { data: c } = await supabase
            .from('dance_country_ranking')
            .select('*')
            .order('country_position', { ascending: true })
            .limit(50);
          if (!cancelled) setCountries((c as CountryRow[]) || []);
        }

        // Tu posición
        if (user?.id) {
          const { data: mine } = await supabase
            .from('dance_world_leaderboard')
            .select('*')
            .eq('uid', user.id)
            .maybeSingle();
          if (!cancelled) setMyRank(mine as RankRow);
        }
      } catch (e) { console.warn('[leaderboard]', e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [variant, user?.id]);

  // ── WIDGET (home) ──────────────────────────────────────────
  if (variant === 'widget') {
    return (
      <section className="mx-3 sm:mx-4 mt-6">
        <div className="card-white p-4 sm:p-5 rounded-2xl border border-pink-100 dark:border-pink-900/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> {t('rank.title')}
            </h2>
            <button onClick={() => navigate('/baila-ia')} className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1">
              {t('rank.seeAll')} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-pink-500 mx-auto" /></div>
          ) : (
            <div className="space-y-1.5">
              {rows.map(r => (
                <div key={r.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span className="text-base font-black w-8 text-center">{medal(r.world_rank)}</span>
                  <span className="text-xl">{countryFlag(r.country_code)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-400">{r.country_name} · {t('df.level')} {r.level}</p>
                  </div>
                  <span className="font-black text-sm text-pink-600">{r.total_points.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ── FULL ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Tu posición */}
      {myRank ? (
        <div className="bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <span className="text-2xl font-black">{medal(myRank.world_rank)}</span>
          <span className="text-2xl">{countryFlag(myRank.country_code)}</span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider opacity-80">{t('df.yourRank')} · {t('df.world')}</p>
            <p className="font-black">{myRank.name} · {myRank.total_points.toLocaleString()} {t('df.points')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{t('df.level')} {myRank.level}</p>
          </div>
        </div>
      ) : user ? (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 text-center text-sm text-gray-500">
          Aún no tienes puntos. ¡Baila una sesión para entrar en el ranking! 💃
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('world')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'world' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
          🌍 {t('df.ranking')}
        </button>
        <button onClick={() => setTab('countries')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'countries' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
          🏳️ {t('df.countryRanking')}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-pink-500 mx-auto" /></div>
      ) : tab === 'world' ? (
        <div className="card-white rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map(r => {
            const isMe = user?.id === r.uid;
            return (
              <div key={r.uid} className={`flex items-center gap-3 p-3 ${isMe ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                <span className={`text-base font-black w-10 text-center ${r.world_rank <= 3 ? 'text-xl' : 'text-gray-400'}`}>{medal(r.world_rank)}</span>
                <span className="text-2xl">{countryFlag(r.country_code)}</span>
                {r.avatar
                  ? <img src={r.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
                  : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold">{r.name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    {r.name}
                    {isMe && <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full">{t('df.you')}</span>}
                  </p>
                  <p className="text-[11px] text-gray-400">{r.country_name}{r.best_genre ? ` · ${r.best_genre}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-pink-600">{r.total_points.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{t('df.level')} {r.level}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-white rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {countries.map(c => (
            <div key={c.country_code} className="flex items-center gap-3 p-3">
              <span className={`font-black w-10 text-center ${c.country_position <= 3 ? 'text-xl' : 'text-gray-400'}`}>{medal(c.country_position)}</span>
              <span className="text-2xl">{countryFlag(c.country_code)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-white">{c.country_name}</p>
                <p className="text-[11px] text-gray-400">{c.players} {t('df.players')}</p>
              </div>
              <p className="font-black text-sm text-pink-600">{Number(c.country_points).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorldLeaderboard;
