/**
 * DanceAvatarMirror — Avatar VRM 3D animado en tiempo real via MediaPipe + Kalidokit
 *
 * Recibe landmarks de MediaPipe Pose y anima un avatar VRM usando Kalidokit
 * para convertir landmarks → rotaciones de huesos VRM.
 *
 * Carga Three.js, @pixiv/three-vrm y kalidokit de forma lazy para no inflar el bundle principal.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, User } from 'lucide-react';
import type { Landmark } from '../lib/poseSync';

export interface DanceAvatarMirrorProps {
  landmarks: Landmark[] | null;
  worldLandmarks?: Landmark[] | null;
  vrmUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  /** 'user' espeja el avatar (flip horizontal); 'instructor' no */
  side?: 'user' | 'instructor';
  /** Color de fondo en CSS, default transparent */
  bgColor?: string;
}

// URL del avatar VRM por defecto (modelo oficial pixiv three-vrm)
const DEFAULT_VRM_URL =
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

// Suavizado de rotación (lerp factor) — mayor = más suave pero más lento
const LERP = 0.12;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const DanceAvatarMirror: React.FC<DanceAvatarMirrorProps> = ({
  landmarks,
  worldLandmarks,
  vrmUrl = DEFAULT_VRM_URL,
  width = 320,
  height = 480,
  className = '',
  side = 'user',
  bgColor = 'transparent',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null); // holds { renderer, scene, camera, vrm, clock, animId }
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const landmarksRef = useRef<Landmark[] | null>(null);
  const worldLandmarksRef = useRef<Landmark[] | null>(null);

  // Keep refs up to date without re-running the setup effect
  useEffect(() => { landmarksRef.current = landmarks; }, [landmarks]);
  useEffect(() => { worldLandmarksRef.current = worldLandmarks ?? null; }, [worldLandmarks]);

  const initScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Dynamic imports — Three.js es ~600KB, cargarlo lazy
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');
      const Kalidokit = await import('kalidokit');

      // ── Renderer ──────────────────────────────────────────────────
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // ── Scene ─────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      if (bgColor !== 'transparent') {
        scene.background = new THREE.Color(bgColor);
      }

      // ── Camera ────────────────────────────────────────────────────
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 20);
      camera.position.set(0, 1.3, 2.6); // framing: muestra de cintura para arriba

      // ── Lights ────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(1, 2, 3);
      scene.add(dir);
      const fill = new THREE.DirectionalLight(0x8888ff, 0.4);
      fill.position.set(-2, 1, -1);
      scene.add(fill);

      // ── Clock ─────────────────────────────────────────────────────
      const clock = new THREE.Clock();

      // ── Load VRM ─────────────────────────────────────────────────
      const loader = new GLTFLoader();
      loader.register((parser: any) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(vrmUrl);
      const vrm = gltf.userData.vrm;
      VRMUtils.removeUnnecessaryJoints(vrm.scene);

      // Mirror para el usuario (espejo natural)
      if (side === 'user') {
        vrm.scene.rotation.y = Math.PI; // girar 180° para verse como en espejo
      }

      scene.add(vrm.scene);

      // ── Pose a-stance inicial ─────────────────────────────────────
      const setInitialPose = () => {
        const h = vrm.humanoid;
        const arms = [
          { bone: 'rightUpperArm', z: -0.6 },
          { bone: 'leftUpperArm', z: 0.6 },
        ];
        arms.forEach(({ bone, z }) => {
          const b = h.getNormalizedBoneNode(bone);
          if (b) b.rotation.z = z;
        });
      };
      setInitialPose();

      // ── Helpers Kalidokit ──────────────────────────────────────────
      const rigPose = Kalidokit.Pose;

      const applyRotation = (boneName: string, rot: { x: number; y: number; z: number }) => {
        const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
        if (!bone) return;
        bone.rotation.x = lerp(bone.rotation.x, clamp(rot.x, -Math.PI, Math.PI), LERP);
        bone.rotation.y = lerp(bone.rotation.y, clamp(rot.y, -Math.PI, Math.PI), LERP);
        bone.rotation.z = lerp(bone.rotation.z, clamp(rot.z, -Math.PI, Math.PI), LERP);
      };

      const applyPoseRig = (rig: any) => {
        if (!rig) return;

        if (rig.Hips) {
          const hips = vrm.humanoid.getNormalizedBoneNode('hips');
          if (hips && rig.Hips.rotation) {
            hips.rotation.x = lerp(hips.rotation.x, rig.Hips.rotation.x * -1, LERP);
            hips.rotation.y = lerp(hips.rotation.y, rig.Hips.rotation.y * (side === 'user' ? -1 : 1), LERP);
            hips.rotation.z = lerp(hips.rotation.z, rig.Hips.rotation.z * (side === 'user' ? -1 : 1), LERP);
          }
          if (hips && rig.Hips.position) {
            hips.position.x = lerp(hips.position.x ?? 0, rig.Hips.position.x * (side === 'user' ? -1 : 1) * 0.5, LERP);
            hips.position.y = lerp(hips.position.y ?? 1.0, rig.Hips.position.y + 1.0, LERP);
          }
        }
        if (rig.Chest)       applyRotation('chest',        { x: rig.Chest.x,       y: rig.Chest.y * (side === 'user' ? -1 : 1),       z: rig.Chest.z * (side === 'user' ? -1 : 1) });
        if (rig.UpperChest)  applyRotation('upperChest',   { x: rig.UpperChest.x,  y: rig.UpperChest.y * (side === 'user' ? -1 : 1),  z: rig.UpperChest.z * (side === 'user' ? -1 : 1) });
        if (rig.Spine)       applyRotation('spine',        { x: rig.Spine.x,       y: rig.Spine.y * (side === 'user' ? -1 : 1),       z: rig.Spine.z * (side === 'user' ? -1 : 1) });

        if (rig.RightUpperArm) applyRotation('rightUpperArm', { x: rig.RightUpperArm.x, y: rig.RightUpperArm.y, z: rig.RightUpperArm.z });
        if (rig.LeftUpperArm)  applyRotation('leftUpperArm',  { x: rig.LeftUpperArm.x,  y: rig.LeftUpperArm.y,  z: rig.LeftUpperArm.z });
        if (rig.RightLowerArm) applyRotation('rightLowerArm', { x: rig.RightLowerArm.x, y: rig.RightLowerArm.y, z: rig.RightLowerArm.z });
        if (rig.LeftLowerArm)  applyRotation('leftLowerArm',  { x: rig.LeftLowerArm.x,  y: rig.LeftLowerArm.y,  z: rig.LeftLowerArm.z });

        if (rig.RightUpperLeg) applyRotation('rightUpperLeg', { x: rig.RightUpperLeg.x, y: rig.RightUpperLeg.y, z: rig.RightUpperLeg.z });
        if (rig.LeftUpperLeg)  applyRotation('leftUpperLeg',  { x: rig.LeftUpperLeg.x,  y: rig.LeftUpperLeg.y,  z: rig.LeftUpperLeg.z });
        if (rig.RightLowerLeg) applyRotation('rightLowerLeg', { x: rig.RightLowerLeg.x, y: rig.RightLowerLeg.y, z: rig.RightLowerLeg.z });
        if (rig.LeftLowerLeg)  applyRotation('leftLowerLeg',  { x: rig.LeftLowerLeg.x,  y: rig.LeftLowerLeg.y,  z: rig.LeftLowerLeg.z });

        if (rig.RightFoot) applyRotation('rightFoot', { x: rig.RightFoot.x, y: rig.RightFoot.y, z: rig.RightFoot.z });
        if (rig.LeftFoot)  applyRotation('leftFoot',  { x: rig.LeftFoot.x,  y: rig.LeftFoot.y,  z: rig.LeftFoot.z });
      };

      // ── Animation loop ────────────────────────────────────────────
      let animId = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        const lm = landmarksRef.current;
        const wlm = worldLandmarksRef.current;

        if (lm && lm.length >= 29) {
          try {
            // Kalidokit.Pose.solve espera NormalizedLandmark[] (x,y,z,visibility) + world coords
            const poseRig = rigPose.solve(
              wlm && wlm.length >= 29 ? wlm as any : undefined,
              lm as any,
              { runtime: 'mediapipe', video: undefined, imageSize: { width, height } }
            );
            applyPoseRig(poseRig);
          } catch {
            // silently ignore per-frame errors
          }
        }

        vrm.update(delta);
        renderer.render(scene, camera);
      };
      animate();

      sceneRef.current = { renderer, scene, camera, vrm, clock, animId };
      setStatus('ready');
    } catch (err: any) {
      console.error('[DanceAvatarMirror] init error', err);
      setErrorMsg(err?.message ?? 'Error cargando avatar');
      setStatus('error');
    }
  }, [vrmUrl, width, height, side, bgColor]);

  // Init scene on mount
  useEffect(() => {
    initScene();
    return () => {
      const s = sceneRef.current;
      if (!s) return;
      cancelAnimationFrame(s.animId);
      s.renderer.dispose();
      sceneRef.current = null;
    };
  }, [initScene]);

  // Resize renderer when props change
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.renderer.setSize(width, height);
    s.camera.aspect = width / height;
    s.camera.updateProjectionMatrix();
  }, [width, height]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff3e6c]" />
          <p className="text-xs text-white/70">Cargando avatar 3D…</p>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2 px-4 text-center">
          <User className="w-10 h-10 text-white/30" />
          <p className="text-xs text-white/50">Avatar no disponible</p>
          {errorMsg && <p className="text-[10px] text-red-400/70 break-all">{errorMsg.slice(0, 60)}</p>}
        </div>
      )}
    </div>
  );
};

export default DanceAvatarMirror;
