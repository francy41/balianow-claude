/**
 * GameHUD — Interfaz de videojuego para DanceFlow
 * Muestra: vidas, combo, estrellas, XP, banner de fase animado, score flotante
 */
import React, { useEffect, useRef, useState } from 'react';
import type { GamePhase } from '../hooks/useDanceGameLoop';
import type { DeviceType } from '../lib/deviceDetect';

interface Props {
  phase: GamePhase;
  lives: number;
  maxLives?: number;
  combo: number;
  comboMultiplier: number;
  stepStars: number;
  totalStars: number;
  sessionScore: number;
  stepIdx: number;
  stepCount: number;
  syncScore: number | null;
  liveMatch?: number;       // % sincronía DTW en vivo (-1 si no aplica)
  passSync?: number;        // sincronía final del paso superado (-1 si no aplica)
  passRhythm?: number;      // ritmo/movimiento final del paso superado
  device?: DeviceType;
  onRestart?: () => void;
  userName?: string;
}

// ── Configuración de cada fase ──────────────────────────────────
const PHASE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  idle:     { label: '',              color: 'text-white',         bg: 'bg-transparent',       emoji: '' },
  demo:     { label: '👀 MÍRAME',     color: 'text-yellow-300',    bg: 'bg-yellow-500/20',      emoji: '👀' },
  prepare:  { label: '¡PREPÁRATE!',  color: 'text-orange-300',    bg: 'bg-orange-500/20',      emoji: '⚡' },
  attempt:  { label: '🎯 ¡HAZLO TÚ!', color: 'text-pink-300',     bg: 'bg-pink-500/20',        emoji: '🎯' },
  pass:     { label: '✅ ¡SUPERADO!', color: 'text-emerald-300',   bg: 'bg-emerald-500/20',     emoji: '✅' },
  fail:     { label: '🔄 ¡INTÉNTALO!', color: 'text-red-300',     bg: 'bg-red-500/20',         emoji: '🔄' },
  gameover: { label: '💀 GAME OVER',  color: 'text-red-400',       bg: 'bg-red-900/40',         emoji: '💀' },
};

// ── Corazones de vida ────────────────────────────────────────────
const Hearts: React.FC<{ lives: number; max: number; isTV: boolean; isMobile?: boolean }> = ({ lives, max, isTV, isMobile }) => {
  const size = isTV ? 'text-4xl' : isMobile ? 'text-sm' : 'text-xl';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`transition-all duration-300 ${size} ${
            i < lives ? 'drop-shadow-[0_0_6px_#ff3e6c]' : 'opacity-20'
          } ${i < lives && lives === 1 ? 'animate-pulse' : ''}`}
        >
          {i < lives ? '❤️' : '🖤'}
        </span>
      ))}
    </div>
  );
};

// ── Estrellas ───────────────────────────────────────────────────
const Stars: React.FC<{ count: number; max?: number; size?: string; animate?: boolean }> = ({
  count, max = 3, size = 'text-lg', animate = false,
}) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <span
        key={i}
        className={`${size} transition-all duration-500 ${
          i < count
            ? `opacity-100 drop-shadow-[0_0_6px_#fbbf24] ${animate && i < count ? 'animate-bounce' : ''}`
            : 'opacity-20'
        }`}
        style={animate && i < count ? { animationDelay: `${i * 120}ms` } : undefined}
      >
        ⭐
      </span>
    ))}
  </div>
);

// ── Barra XP ────────────────────────────────────────────────────
const XPBar: React.FC<{ stepIdx: number; stepCount: number; color?: string; isTV: boolean }> = ({
  stepIdx, stepCount, color = '#ff3e6c', isTV,
}) => {
  const pct = stepCount > 0 ? ((stepIdx + 1) / stepCount) * 100 : 0;
  return (
    <div className={`w-full flex items-center gap-2 ${isTV ? 'gap-3' : ''}`}>
      <span className={`text-white/60 font-bold flex-shrink-0 ${isTV ? 'text-lg' : 'text-[10px]'}`}>
        P{stepIdx + 1}/{stepCount}
      </span>
      <div className={`flex-1 rounded-full bg-white/10 overflow-hidden ${isTV ? 'h-4' : 'h-2'}`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #ff8c42)` }}
        />
      </div>
    </div>
  );
};

// ── Score flotante (+50 pts) ─────────────────────────────────────
interface FloatMsg { id: number; text: string; x: number }
const useFloatingScores = (phase: GamePhase, pts: number) => {
  const [msgs, setMsgs] = useState<FloatMsg[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    if (phase === 'pass' && pts > 0) {
      const id = ++idRef.current;
      const x = 30 + Math.random() * 40;
      setMsgs(m => [...m, { id, text: `+${pts} pts`, x }]);
      setTimeout(() => setMsgs(m => m.filter(msg => msg.id !== id)), 1800);
    }
  }, [phase]);  // eslint-disable-line react-hooks/exhaustive-deps
  return msgs;
};

// ── Componente principal ─────────────────────────────────────────
const GameHUD: React.FC<Props> = ({
  phase, lives, maxLives = 3, combo, comboMultiplier, stepStars,
  totalStars, sessionScore, stepIdx, stepCount, syncScore, liveMatch = -1,
  passSync = -1, passRhythm = -1,
  device = 'desktop', onRestart, userName = '',
}) => {
  const isTV = device === 'tv';
  const isMobile = device === 'mobile';
  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
  const floats = useFloatingScores(phase, Math.round(sessionScore));

  // Animación de entrada del banner
  const [bannerKey, setBannerKey] = useState(0);
  useEffect(() => { setBannerKey(k => k + 1); }, [phase]);

  // ── TOP BAR ────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col">

      {/* TOP BAR */}
      <div className={`flex items-center justify-between gap-1 px-2 py-1.5 bg-gradient-to-b from-black/60 to-transparent ${isTV ? 'px-8 py-4' : ''}`}>

        {/* Vidas */}
        <Hearts lives={lives} max={maxLives} isTV={isTV} isMobile={isMobile} />

        {/* Combo */}
        {combo > 0 && (
          <div className={`flex items-center gap-1 bg-orange-500/25 border border-orange-500/40 rounded-full ${isTV ? 'px-6 py-2 gap-2' : 'px-2 py-0.5'}`}>
            <span className={isTV ? 'text-2xl' : 'text-sm'}>🔥</span>
            <span className={`font-black text-orange-300 ${isTV ? 'text-2xl' : 'text-xs'}`}>×{comboMultiplier}</span>
            {!isMobile && <span className={`text-orange-400 ${isTV ? 'text-xl' : 'text-xs'}`}>COMBO</span>}
          </div>
        )}

        {/* Score */}
        <div className="text-right">
          <p className={`font-black text-white leading-none ${isTV ? 'text-4xl' : isMobile ? 'text-sm' : 'text-xl'}`}>{sessionScore.toLocaleString()}</p>
          {!isMobile && <Stars count={totalStars} max={stepCount * 3} size={isTV ? 'text-xl' : 'text-xs'} />}
        </div>
      </div>

      {/* BANNER CENTRAL de fase */}
      {phase !== 'idle' && phase !== 'attempt' && (
        <div className="flex-1 flex items-center justify-center">
          <div
            key={bannerKey}
            className={`
              ${cfg.bg} border border-white/10 backdrop-blur-sm rounded-3xl px-8 py-4
              ${isTV ? 'px-16 py-8' : isMobile ? 'px-5 py-3' : 'px-10 py-5'}
              animate-[bounceIn_0.4s_ease-out]
            `}
            style={{ animation: 'hudBannerIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
          >
            <p className={`font-black text-center ${cfg.color} ${isTV ? 'text-6xl' : isMobile ? 'text-2xl' : 'text-4xl'}`}>
              {cfg.label}
            </p>
            {/* Estrellas + desglose ganados en PASS */}
            {phase === 'pass' && (
              <div className="flex flex-col items-center mt-2 gap-1.5">
                <Stars count={stepStars} max={3} size={isTV ? 'text-5xl' : 'text-3xl'} animate />
                <div className={`flex items-center gap-3 text-white/80 font-bold ${isTV ? 'text-2xl' : 'text-sm'}`}>
                  {passSync >= 0 && (
                    <span className="flex items-center gap-1">
                      🎯 <span className={passSync >= 75 ? 'text-emerald-300' : passSync >= 50 ? 'text-yellow-300' : 'text-red-300'}>{passSync}%</span>
                      <span className="text-white/40 font-normal">sync</span>
                    </span>
                  )}
                  {passRhythm >= 0 && (
                    <span className="flex items-center gap-1">
                      🎵 <span className={passRhythm >= 75 ? 'text-emerald-300' : passRhythm >= 50 ? 'text-yellow-300' : 'text-red-300'}>{passRhythm}%</span>
                      <span className="text-white/40 font-normal">ritmo</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANTALLA GAME OVER */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto">
          <div className="text-center space-y-6">
            <div className={`font-black text-red-400 ${isTV ? 'text-8xl' : 'text-5xl'}`}>💀 GAME OVER</div>
            {userName && (
              <p className={`text-white/80 ${isTV ? 'text-3xl' : 'text-lg'}`}>¡Buen intento, {userName}!</p>
            )}
            <div className={`flex flex-col items-center gap-2 ${isTV ? 'gap-4' : ''}`}>
              <p className={`text-white font-bold ${isTV ? 'text-4xl' : 'text-2xl'}`}>{sessionScore.toLocaleString()} pts</p>
              <Stars count={totalStars} max={stepCount * 3} size={isTV ? 'text-3xl' : 'text-xl'} />
            </div>
            {onRestart && (
              <button
                onClick={onRestart}
                className={`bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-transform focus:ring-4 focus:ring-white focus:outline-none ${isTV ? 'px-16 py-8 text-3xl rounded-3xl' : 'px-10 py-4 text-xl'}`}
              >
                🔄 ¡Volver a intentarlo!
              </button>
            )}
          </div>
        </div>
      )}

      {/* XP BAR (inferior) */}
      {phase !== 'gameover' && stepCount > 0 && (
        <div className={`mt-auto px-3 pb-2 ${isTV ? 'px-8 pb-4' : ''}`}>
          <XPBar stepIdx={stepIdx} stepCount={stepCount} isTV={isTV} />
        </div>
      )}

      {/* Scores flotantes */}
      {floats.map(f => (
        <div
          key={f.id}
          className="absolute font-black text-emerald-400 pointer-events-none"
          style={{
            left: `${f.x}%`,
            bottom: '35%',
            fontSize: isTV ? '3rem' : '1.5rem',
            textShadow: '0 0 12px #34d399',
            animation: 'floatUp 1.6s ease-out forwards',
          }}
        >
          {f.text}
        </div>
      ))}

      {/* MATCH en vivo (DTW: sincronía con el avatar) durante ATTEMPT */}
      {phase === 'attempt' && liveMatch >= 0 && (
        <div className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center ${isTV ? 'bottom-24' : 'bottom-12'}`}>
          <div className={`font-black ${isTV ? 'text-5xl' : 'text-2xl'} ${
            liveMatch >= 75 ? 'text-emerald-300' : liveMatch >= 50 ? 'text-yellow-300' : 'text-red-300'
          }`} style={{ textShadow: '0 0 12px currentColor' }}>
            {liveMatch}% MATCH
          </div>
          <div className={`rounded-full bg-white/15 overflow-hidden ${isTV ? 'w-72 h-3' : 'w-36 h-2'}`}>
            <div className="h-full rounded-full transition-all duration-200"
              style={{ width: `${liveMatch}%`, background: liveMatch >= 75 ? '#34d399' : liveMatch >= 50 ? '#fbbf24' : '#f87171' }} />
          </div>
          <span className={`text-white/60 font-bold mt-0.5 ${isTV ? 'text-base' : 'text-[9px]'}`}>sincronía con el profe</span>
        </div>
      )}

      {/* Sync score en modo ATTEMPT */}
      {phase === 'attempt' && syncScore !== null && (
        <div className={`absolute top-16 right-3 flex flex-col items-center ${isTV ? 'top-24 right-8' : ''}`}>
          <div className={`rounded-2xl px-3 py-2 text-center font-black backdrop-blur-md border ${
            syncScore >= 75 ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
            : syncScore >= 50 ? 'bg-yellow-500/25 border-yellow-400/50 text-yellow-300'
            : 'bg-red-500/25 border-red-400/50 text-red-300'
          } ${isTV ? 'text-5xl px-6 py-4 rounded-3xl' : 'text-3xl'}`}>
            {syncScore}
          </div>
          <span className={`text-white/60 mt-1 font-bold ${isTV ? 'text-lg' : 'text-[10px]'}`}>SYNC</span>
        </div>
      )}
    </div>
  );
};

export default GameHUD;
