/**
 * ChoreoPlanner — Editor visual de coreografías (estilo "ensayo en pista")
 *
 * - Pista (escenario) vista cenital con bailarines arrastrables
 * - Línea de tiempo con keyframes por bailarín
 * - Reproducción que interpola posiciones (los bailarines se deslizan)
 * - Formaciones predefinidas (línea, círculo, V, cuadrícula…)
 * - Música de YouTube en la línea de tiempo
 * - Ajustes de escenario (forma, color, cuadrícula)
 *
 * Auto-contenido. El guardado lo gestiona la página padre vía onSave/onChange.
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Plus, Trash2, Save, Users, Music, Settings2, SkipBack,
  Sparkles, X, Square, Circle as CircleIcon, Diamond, Video, Film,
  Youtube, Music2, Upload, Loader2,
} from 'lucide-react';
import {
  type ProductionData, type Dancer, type Keyframe, type Formation, type Gender, type StageShape, type Move,
  emptyProduction, newDancer, positionAt, moveAt, formationPositions, FORMATION_LABELS,
  fmtTime, ytId, spotifyEmbed, DANCER_PALETTE,
} from '../lib/choreo';
import MoveRecorder from './MoveRecorder';
import { supabase } from '../lib/supabase';

interface Props {
  initialData?: ProductionData;
  userId?: string;
  onSave?: (data: ProductionData) => Promise<void> | void;
  onChange?: (data: ProductionData) => void;
  saving?: boolean;
}

type Positions = Record<string, { x: number; y: number }>;

// Normaliza datos antiguos que puedan no tener arrays nuevos
function normalize(d?: ProductionData): ProductionData {
  const base = emptyProduction();
  if (!d) return base;
  return { ...base, ...d, music: d.music || [], moves: d.moves || [], keyframes: d.keyframes || [], dancers: d.dancers || [] };
}

const ChoreoPlanner: React.FC<Props> = ({ initialData, userId, onSave, onChange, saving }) => {
  const [data, setData] = useState<ProductionData>(normalize(initialData));
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [panel, setPanel] = useState<'dancers' | 'formations' | 'moves' | 'music' | 'stage' | null>('dancers');
  const [showRecorder, setShowRecorder] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeMusicRef = useRef<ProductionData['music'][number] | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const playStartRef = useRef<{ wall: number; t: number } | null>(null);
  const draggingRef = useRef<string | null>(null);

  // Notificar cambios al padre
  useEffect(() => { onChange?.(data); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalcular posiciones desde keyframes en el tiempo actual
  const computePositions = useCallback((t: number): Positions => {
    const p: Positions = {};
    for (const d of data.dancers) p[d.id] = positionAt(data.keyframes, d.id, t);
    return p;
  }, [data.dancers, data.keyframes]);

  // Cuando cambian bailarines/keyframes o el tiempo (sin arrastrar), recalcular
  useEffect(() => {
    if (!draggingRef.current) setPositions(computePositions(currentTime));
  }, [computePositions, currentTime]);

  // ── Playback loop ──
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); playStartRef.current = null; return; }
    playStartRef.current = { wall: performance.now(), t: currentTime };
    const tick = () => {
      const ps = playStartRef.current;
      if (!ps) return;
      const elapsed = (performance.now() - ps.wall) / 1000;
      let nt = ps.t + elapsed;
      if (nt >= data.duration) { nt = data.duration; setCurrentTime(nt); setPlaying(false); return; }
      setCurrentTime(nt);
      setPositions(computePositions(nt));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutadores ──
  const patch = (p: Partial<ProductionData>) => setData(d => ({ ...d, ...p }));

  const addDancer = (gender: Gender) => {
    const d = newDancer(data.dancers.length, gender);
    setData(prev => {
      const dancers = [...prev.dancers, d];
      // keyframe inicial en t=0 con posición por defecto
      const startPos = { x: 0.5, y: 0.5 };
      const kf: Keyframe = { dancerId: d.id, t: 0, ...startPos };
      return { ...prev, dancers, keyframes: [...prev.keyframes, kf] };
    });
    setSelectedId(d.id);
  };

  const removeDancer = (id: string) => {
    setData(prev => ({
      ...prev,
      dancers: prev.dancers.filter(d => d.id !== id),
      keyframes: prev.keyframes.filter(k => k.dancerId !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  };

  const renameDancer = (id: string, name: string) =>
    setData(prev => ({ ...prev, dancers: prev.dancers.map(d => d.id === id ? { ...d, name } : d) }));

  const recolorDancer = (id: string, color: string) =>
    setData(prev => ({ ...prev, dancers: prev.dancers.map(d => d.id === id ? { ...d, color } : d) }));

  // Guardar posiciones actuales como keyframes en currentTime
  const addKeyframe = () => {
    setData(prev => {
      const t = Math.round(currentTime * 10) / 10;
      const others = prev.keyframes.filter(k => !(Math.abs(k.t - t) < 0.05));
      const news: Keyframe[] = prev.dancers.map(d => {
        const pos = positions[d.id] || { x: 0.5, y: 0.5 };
        // preservar move/video si existía en ese t
        const existing = prev.keyframes.find(k => k.dancerId === d.id && Math.abs(k.t - t) < 0.05);
        return { dancerId: d.id, t, x: pos.x, y: pos.y, move: existing?.move, videoUrl: existing?.videoUrl };
      });
      return { ...prev, keyframes: [...others, ...news] };
    });
  };

  // Aplicar formación a todos los bailarines en el tiempo actual
  const applyFormation = (f: Formation) => {
    const pts = formationPositions(f, data.dancers.length);
    const next: Positions = {};
    data.dancers.forEach((d, i) => { next[d.id] = pts[i] || { x: 0.5, y: 0.5 }; });
    setPositions(next);
    // guardar como keyframe
    setData(prev => {
      const t = Math.round(currentTime * 10) / 10;
      const others = prev.keyframes.filter(k => !(Math.abs(k.t - t) < 0.05));
      const news: Keyframe[] = prev.dancers.map((d, i) => ({
        dancerId: d.id, t, x: (pts[i]?.x ?? 0.5), y: (pts[i]?.y ?? 0.5),
      }));
      return { ...prev, keyframes: [...others, ...news] };
    });
  };

  // ── Drag de bailarines ──
  const stageToNorm = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (playing) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    draggingRef.current = id;
    setSelectedId(id);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const id = draggingRef.current;
    if (!id) return;
    const pos = stageToNorm(e.clientX, e.clientY);
    setPositions(p => ({ ...p, [id]: pos }));
  };
  const onPointerUp = () => { draggingRef.current = null; };

  // ── Movimientos grabados ──
  const onMoveSaved = (move: Move) => {
    setData(prev => ({ ...prev, moves: [...prev.moves, move] }));
    setShowRecorder(false);
    // Si hay un bailarín seleccionado, asignarlo automáticamente
    if (selectedId) assignMove(move, selectedId);
  };

  const assignMove = (move: Move, dancerId: string) => {
    setData(prev => {
      const t = Math.round(currentTime * 10) / 10;
      const pos = positions[dancerId] || positionAt(prev.keyframes, dancerId, t);
      const others = prev.keyframes.filter(k => !(k.dancerId === dancerId && Math.abs(k.t - t) < 0.05));
      const kf: Keyframe = { dancerId, t, x: pos.x, y: pos.y, move: move.name, videoUrl: move.videoUrl };
      return { ...prev, keyframes: [...others, kf] };
    });
  };

  const removeMove = (id: string) =>
    setData(prev => ({ ...prev, moves: prev.moves.filter(m => m.id !== id) }));

  // ── Música ──
  const addYouTube = () => {
    const url = window.prompt('Pega el enlace de YouTube de la canción:');
    if (!url) return;
    const label = window.prompt('Nombre de la canción:') || 'Canción';
    setData(prev => ({ ...prev, music: [...prev.music, { id: `m_${Date.now()}`, label, source: 'youtube', youtubeUrl: url, start: Math.round(currentTime) }] }));
  };

  const addSpotify = () => {
    const url = window.prompt('Pega el enlace de Spotify (canción, álbum o playlist):');
    if (!url) return;
    if (!spotifyEmbed(url)) { window.alert('Enlace de Spotify no válido. Copia el enlace desde "Compartir".'); return; }
    const label = window.prompt('Nombre de la canción:') || 'Spotify';
    setData(prev => ({ ...prev, music: [...prev.music, { id: `m_${Date.now()}`, label, source: 'spotify', spotifyUrl: url, start: Math.round(currentTime) }] }));
  };

  const onLocalAudio = async (file: File) => {
    setUploadingAudio(true);
    const id = `au_${Date.now()}`;
    const path = `${userId || 'anon'}/audio/${id}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    let url = '';
    const { error } = await supabase.storage.from('choreo-moves').upload(path, file, { contentType: file.type || 'audio/mpeg', upsert: true });
    url = error ? URL.createObjectURL(file) : supabase.storage.from('choreo-moves').getPublicUrl(path).data.publicUrl;
    setUploadingAudio(false);
    setData(prev => ({ ...prev, music: [...prev.music, { id, label: file.name.replace(/\.[^.]+$/, ''), source: 'local', audioUrl: url, start: Math.round(currentTime) }] }));
  };

  const seek = (t: number) => {
    setPlaying(false);
    const nt = Math.max(0, Math.min(data.duration, t));
    setCurrentTime(nt);
    setPositions(computePositions(nt));
    // Reposicionar el audio local
    const a = audioRef.current;
    if (a && activeMusicRef.current?.source === 'local') {
      a.currentTime = Math.max(0, nt - activeMusicRef.current.start);
    }
  };

  const selected = data.dancers.find(d => d.id === selectedId) || null;
  const dancerKfCount = (id: string) => data.keyframes.filter(k => k.dancerId === id).length;

  // Música activa (la última que ya empezó)
  const activeMusic = useMemo(() =>
    [...data.music].filter(m => m.start <= currentTime).sort((a, b) => b.start - a.start)[0] || null,
    [data.music, currentTime]);
  activeMusicRef.current = activeMusic;

  // Sincronizar el audio LOCAL con la reproducción de la coreografía
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (activeMusic?.source === 'local' && activeMusic.audioUrl) {
      if (a.getAttribute('src') !== activeMusic.audioUrl) a.src = activeMusic.audioUrl;
      if (playing) {
        const target = Math.max(0, currentTime - activeMusic.start);
        if (Math.abs(a.currentTime - target) > 0.35) a.currentTime = target;
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    } else {
      a.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, activeMusic?.id, activeMusic?.source]);

  const shapeClip = (shape: StageShape): string =>
    shape === 'circle' ? 'ellipse(50% 50% at 50% 50%)'
      : shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
        : 'none';

  return (
    <div className="flex flex-col lg:flex-row gap-3 w-full h-full">
      {/* ── PISTA ── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Barra superior */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setPlaying(p => !p)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold px-4 py-2 rounded-xl text-sm">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playing ? 'Pausa' : 'Reproducir'}
          </button>
          <button onClick={() => seek(0)} className="bg-white/10 text-white p-2 rounded-xl" title="Volver al inicio">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={addKeyframe} disabled={data.dancers.length === 0}
            className="flex items-center gap-1.5 bg-emerald-500/90 text-white font-bold px-3 py-2 rounded-xl text-sm disabled:opacity-40"
            title="Guardar las posiciones actuales como un punto de la coreografía">
            <Plus className="w-4 h-4" /> Marcar paso
          </button>
          <span className="text-white/70 text-sm font-mono ml-auto">{fmtTime(currentTime)} / {fmtTime(data.duration)}</span>
          {onSave && (
            <button onClick={() => onSave(data)} disabled={saving}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-2 rounded-xl text-sm">
              {saving ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />} Guardar
            </button>
          )}
        </div>

        {/* Escenario */}
        <div
          ref={stageRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="relative w-full rounded-2xl overflow-hidden select-none touch-none border border-white/10"
          style={{
            background: data.stage.color,
            aspectRatio: '16 / 10',
            clipPath: shapeClip(data.stage.shape),
          }}
        >
          {/* Cuadrícula */}
          {data.stage.grid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              {[...Array(9)].map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 10}%`} y1="0" x2={`${(i + 1) * 10}%`} y2="100%" stroke="#fff" strokeWidth="0.5" />
              ))}
              {[...Array(7)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 12.5}%`} x2="100%" y2={`${(i + 1) * 12.5}%`} stroke="#fff" strokeWidth="0.5" />
              ))}
            </svg>
          )}
          {/* Marca de frente (público) */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/40 font-bold tracking-widest pointer-events-none">▼ PÚBLICO ▼</div>

          {/* Trayectorias del seleccionado */}
          {selected && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={data.keyframes.filter(k => k.dancerId === selected.id).sort((a, b) => a.t - b.t)
                  .map(k => `${k.x * 100},${k.y * 100}`).join(' ')}
                fill="none" stroke={selected.color} strokeWidth="0.6" strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke" opacity="0.7"
              />
            </svg>
          )}

          {/* Bailarines */}
          {data.dancers.map(d => {
            const pos = positions[d.id] || { x: 0.5, y: 0.5 };
            const isSel = d.id === selectedId;
            const activeMove = playing ? moveAt(data.keyframes, d.id, currentTime) : null;
            return (
              <div
                key={d.id}
                onPointerDown={e => onPointerDown(e, d.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing flex flex-col items-center"
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, touchAction: 'none' }}
              >
                <div
                  className={`rounded-full flex items-center justify-center font-black text-white shadow-lg transition-transform ${isSel ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ width: 34, height: 34, background: d.color }}
                >
                  {d.gender === 'F' ? '♀' : d.gender === 'M' ? '♂' : '◆'}
                </div>
                <span className="text-[9px] text-white font-bold mt-0.5 bg-black/40 px-1 rounded whitespace-nowrap max-w-[80px] truncate">
                  {d.name}
                </span>
                {activeMove?.move && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white bg-[#ff3e6c] px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-0.5 animate-pulse">
                    <Film className="w-2.5 h-2.5" /> {activeMove.move}
                  </span>
                )}
              </div>
            );
          })}

          {data.dancers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-2 pointer-events-none">
              <Users className="w-10 h-10" />
              <p className="text-sm">Añade bailarines para empezar</p>
            </div>
          )}
        </div>

        {/* Línea de tiempo */}
        <div className="bg-[#0e0e1a] rounded-xl p-3 space-y-2">
          {/* Scrubber */}
          <input
            type="range" min={0} max={data.duration} step={0.1} value={currentTime}
            onChange={e => seek(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
          {/* Pistas de keyframes por bailarín */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.dancers.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <div className="relative flex-1 h-4 bg-white/5 rounded">
                  {data.keyframes.filter(k => k.dancerId === d.id).map((k, i) => (
                    <button key={i} onClick={() => seek(k.t)}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-black/40 hover:scale-150 transition-transform"
                      style={{ left: `${(k.t / data.duration) * 100}%`, background: d.color }}
                      title={`${d.name} · ${fmtTime(k.t)}`} />
                  ))}
                </div>
              </div>
            ))}
            {/* Música */}
            {data.music.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <Music className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <div className="relative flex-1 h-4">
                  <span className="absolute top-0 -translate-x-1/2 text-[9px] text-emerald-400 font-bold whitespace-nowrap"
                    style={{ left: `${(m.start / data.duration) * 100}%` }}>♪ {m.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANEL LATERAL ── */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-2">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#0e0e1a] rounded-xl p-1">
          {([['dancers', Users, 'Bailarines'], ['formations', Sparkles, 'Formación'], ['moves', Video, 'Movim.'], ['music', Music, 'Música'], ['stage', Settings2, 'Pista']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setPanel(panel === key ? null : key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-bold ${panel === key ? 'bg-pink-500 text-white' : 'text-white/60'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="bg-[#0e0e1a] rounded-xl p-3 flex-1 overflow-y-auto">
          {/* Bailarines */}
          {panel === 'dancers' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addDancer('F')} className="bg-pink-500/20 text-pink-300 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> ♀ Bailarina
                </button>
                <button onClick={() => addDancer('M')} className="bg-blue-500/20 text-blue-300 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> ♂ Bailarín
                </button>
              </div>
              <div className="space-y-1.5">
                {data.dancers.map(d => (
                  <div key={d.id} className={`p-2 rounded-lg border ${selectedId === d.id ? 'border-pink-500 bg-pink-500/10' : 'border-white/10'}`}
                    onClick={() => setSelectedId(d.id)}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <input value={d.name} onChange={e => renameDancer(d.id, e.target.value)}
                        className="flex-1 bg-transparent text-white text-xs font-bold focus:outline-none min-w-0" />
                      <span className="text-[9px] text-white/40">{dancerKfCount(d.id)} pts</span>
                      <button onClick={(e) => { e.stopPropagation(); removeDancer(d.id); }} className="text-white/40 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {selectedId === d.id && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {DANCER_PALETTE.map(c => (
                          <button key={c} onClick={(e) => { e.stopPropagation(); recolorDancer(d.id, c); }}
                            className={`w-4 h-4 rounded-full ${d.color === c ? 'ring-2 ring-white' : ''}`} style={{ background: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {data.dancers.length > 0 && (
                <p className="text-[10px] text-white/40">💡 Arrastra los bailarines por la pista y pulsa <b>Marcar paso</b> para guardar su posición en ese momento.</p>
              )}
            </div>
          )}

          {/* Formaciones */}
          {panel === 'formations' && (
            <div className="space-y-2">
              <p className="text-[11px] text-white/60 mb-2">Coloca a todos en una formación en el momento actual ({fmtTime(currentTime)}):</p>
              {(Object.keys(FORMATION_LABELS) as Formation[]).map(f => (
                <button key={f} onClick={() => applyFormation(f)} disabled={data.dancers.length === 0}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-30 flex items-center gap-2 px-3">
                  <Sparkles className="w-4 h-4 text-[#ff8c42]" /> {FORMATION_LABELS[f]}
                </button>
              ))}
            </div>
          )}

          {/* Movimientos */}
          {panel === 'moves' && (
            <div className="space-y-3">
              <button onClick={() => setShowRecorder(true)}
                className="w-full bg-gradient-to-r from-[#ff3e6c] to-[#ff8c42] text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                <Video className="w-4 h-4" /> Grabar movimiento con cámara
              </button>
              <p className="text-[11px] text-white/50">
                {selected
                  ? <>Graba o elige un movimiento para <b className="text-white">{selected.name}</b> en {fmtTime(currentTime)}.</>
                  : 'Selecciona un bailarín para asignarle movimientos.'}
              </p>
              <div className="space-y-2">
                {data.moves.length === 0 && <p className="text-white/30 text-xs text-center py-4">Aún no hay movimientos grabados.</p>}
                {data.moves.map(m => (
                  <div key={m.id} className="rounded-lg bg-white/5 overflow-hidden">
                    <div className="flex items-center gap-2 p-2">
                      {m.thumb
                        ? <img src={m.thumb} alt={m.name} className="w-14 h-9 object-cover rounded" />
                        : <div className="w-14 h-9 rounded bg-black/40 flex items-center justify-center"><Film className="w-4 h-4 text-white/40" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{m.name}</p>
                        <p className="text-white/40 text-[10px]">{m.durationSec}s</p>
                      </div>
                      <button onClick={() => removeMove(m.id)} className="text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {m.videoUrl && (
                      <video src={m.videoUrl} className="w-full aspect-video object-cover bg-black" controls preload="metadata" />
                    )}
                    <button onClick={() => selected && assignMove(m, selected.id)} disabled={!selected}
                      className="w-full bg-pink-500/20 text-pink-300 font-bold py-1.5 text-xs disabled:opacity-30">
                      ➕ Asignar a {selected?.name || 'bailarín'} ({fmtTime(currentTime)})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Música */}
          {panel === 'music' && (
            <div className="space-y-2">
              {/* Fuentes de audio */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={addYouTube} className="bg-red-500/15 text-red-300 font-bold py-2 rounded-lg text-[10px] flex flex-col items-center gap-0.5">
                  <Youtube className="w-4 h-4" /> YouTube
                </button>
                <button onClick={addSpotify} className="bg-green-500/15 text-green-300 font-bold py-2 rounded-lg text-[10px] flex flex-col items-center gap-0.5">
                  <Music2 className="w-4 h-4" /> Spotify
                </button>
                <label className="bg-blue-500/15 text-blue-300 font-bold py-2 rounded-lg text-[10px] flex flex-col items-center gap-0.5 cursor-pointer">
                  {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Mi archivo
                  <input type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onLocalAudio(f); }} />
                </label>
              </div>

              {/* Reproductor del audio activo */}
              {activeMusic?.source === 'spotify' && spotifyEmbed(activeMusic.spotifyUrl) && (
                <iframe key={activeMusic.id} src={spotifyEmbed(activeMusic.spotifyUrl)} className="w-full rounded-lg" height="152"
                  allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture" title={activeMusic.label} />
              )}
              {activeMusic?.source !== 'spotify' && activeMusic && ytId(activeMusic.youtubeUrl) && (
                <div className="rounded-lg overflow-hidden aspect-video">
                  <iframe src={`https://www.youtube-nocookie.com/embed/${ytId(activeMusic.youtubeUrl)}`}
                    className="w-full h-full" allow="autoplay; encrypted-media" title={activeMusic.label} />
                </div>
              )}
              {/* Audio local: se sincroniza con la reproducción de la pista */}
              <audio ref={audioRef} className="w-full" controls preload="auto" />

              <div className="space-y-1">
                {data.music.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    {m.source === 'spotify' ? <Music2 className="w-3.5 h-3.5 text-green-400" />
                      : m.source === 'local' ? <Upload className="w-3.5 h-3.5 text-blue-400" />
                      : <Youtube className="w-3.5 h-3.5 text-red-400" />}
                    <span className="flex-1 text-white text-xs truncate">{m.label}</span>
                    <span className="text-[9px] text-white/40">{fmtTime(m.start)}</span>
                    <button onClick={() => setData(prev => ({ ...prev, music: prev.music.filter(x => x.id !== m.id) }))}
                      className="text-white/40 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/40">
                El <b className="text-blue-300">archivo local</b> se sincroniza al reproducir la coreografía. Spotify/YouTube se reproducen aparte (referencia).
              </p>
            </div>
          )}

          {/* Pista / escenario */}
          {panel === 'stage' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase block mb-2">Forma del escenario</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['rect', Square, 'Rect.'], ['circle', CircleIcon, 'Círculo'], ['diamond', Diamond, 'Rombo']] as const).map(([s, Icon, label]) => (
                    <button key={s} onClick={() => patch({ stage: { ...data.stage, shape: s as StageShape } })}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold ${data.stage.shape === s ? 'bg-pink-500 text-white' : 'bg-white/5 text-white/60'}`}>
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase block mb-2">Color de la pista</label>
                <div className="flex gap-2 flex-wrap">
                  {['#1a1030', '#0a0a18', '#2d0a3a', '#0a2a2a', '#3a0a1a', '#ffffff', '#101820', '#2a1a0a'].map(c => (
                    <button key={c} onClick={() => patch({ stage: { ...data.stage, color: c } })}
                      className={`w-7 h-7 rounded-lg border ${data.stage.color === c ? 'ring-2 ring-pink-500' : 'border-white/20'}`} style={{ background: c }} />
                  ))}
                  <input type="color" value={data.stage.color} onChange={e => patch({ stage: { ...data.stage, color: e.target.value } })}
                    className="w-7 h-7 rounded-lg bg-transparent cursor-pointer" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-white text-sm">
                <input type="checkbox" checked={data.stage.grid} onChange={e => patch({ stage: { ...data.stage, grid: e.target.checked } })}
                  className="accent-pink-500" /> Mostrar cuadrícula
              </label>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase block mb-2">Duración: {fmtTime(data.duration)}</label>
                <input type="range" min={15} max={300} step={5} value={data.duration}
                  onChange={e => patch({ duration: Number(e.target.value) })} className="w-full accent-pink-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grabador de movimientos */}
      {showRecorder && (
        <MoveRecorder userId={userId} onSave={onMoveSaved} onClose={() => setShowRecorder(false)} />
      )}
    </div>
  );
};

export default ChoreoPlanner;
