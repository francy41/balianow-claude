/**
 * ImageCropperModal — Editor visual de imagen con zoom y posición
 * Permite al usuario ajustar foto antes de subir.
 * - Crop circular (avatar) o rectangular (cover/banner)
 * - Zoom 1x-3x con slider
 * - Drag para mover
 * - Output: File listo para uploadHelper
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCw, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  imageFile: File | null;
  aspect: 'square' | '16:9' | '3:1';   // square=avatar, 16:9=cover, 3:1=banner
  shape?: 'circle' | 'rect';
  outputSize?: number;                  // px del lado largo final
  onClose: () => void;
  onSave: (file: File) => void;
}

const ImageCropperModal: React.FC<Props> = ({
  open, imageFile, aspect, shape = 'rect', outputSize = 800,
  onClose, onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [saving, setSaving] = useState(false);

  // Aspect ratio dimensions
  const aspectMap = { 'square': 1, '16:9': 16/9, '3:1': 3 };
  const ratio = aspectMap[aspect];
  const cropW = 400;
  const cropH = Math.round(cropW / ratio);

  // Load image
  useEffect(() => {
    if (!imageFile) { setImgSrc(''); return; }
    const reader = new FileReader();
    reader.onload = e => setImgSrc(e.target?.result as string);
    reader.readAsDataURL(imageFile);
    setZoom(1); setPos({ x: 0, y: 0 }); setRotation(0);
  }, [imageFile]);

  // Render preview
  const render = useCallback(() => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;

    canvas.width = cropW;
    canvas.height = cropH;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cropW, cropH);

    // Calc image size at current zoom (cover behavior)
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;
    const baseScale = Math.max(cropW / iw, cropH / ih);
    const scale = baseScale * zoom;
    const drawW = iw * scale;
    const drawH = ih * scale;
    const cx = cropW / 2 + pos.x;
    const cy = cropH / 2 + pos.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Circular mask
    if (shape === 'circle') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(cropW / 2, cropH / 2, Math.min(cropW, cropH) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [zoom, pos, rotation, cropW, cropH, shape]);

  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; render(); };
    img.src = imgSrc;
  }, [imgSrc, render]);

  useEffect(() => { render(); }, [render]);

  // Drag handlers
  const handleStart = (clientX: number, clientY: number) => {
    setDragging(true);
    setDragStart({ x: clientX, y: clientY, posX: pos.x, posY: pos.y });
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging) return;
    setPos({ x: dragStart.posX + (clientX - dragStart.x), y: dragStart.posY + (clientY - dragStart.y) });
  };
  const handleEnd = () => setDragging(false);

  // Save: render final at outputSize and emit File
  const handleSave = async () => {
    if (!imgRef.current) return;
    setSaving(true);
    try {
      const finalCanvas = document.createElement('canvas');
      const outW = outputSize;
      const outH = Math.round(outputSize / ratio);
      finalCanvas.width = outW;
      finalCanvas.height = outH;
      const ctx = finalCanvas.getContext('2d')!;
      const img = imgRef.current;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const baseScale = Math.max(outW / iw, outH / ih);
      const scale = baseScale * zoom;
      const drawW = iw * scale;
      const drawH = ih * scale;
      const scaleRatio = outW / cropW;
      const cx = outW / 2 + pos.x * scaleRatio;
      const cy = outH / 2 + pos.y * scaleRatio;

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, outW, outH);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (shape === 'circle') {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      finalCanvas.toBlob(blob => {
        if (!blob) { setSaving(false); return; }
        const file = new File([blob], `edited-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onSave(file);
        setSaving(false);
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('[cropper] error:', err);
      setSaving(false);
    }
  };

  if (!open || !imageFile) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-3" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-brand-orange text-white p-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-black text-base">✂️ Ajusta tu imagen</h2>
            <p className="text-xs opacity-90">Arrastra para mover · usa el zoom · gira si quieres</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas */}
        <div className="p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-950 select-none">
          <canvas
            ref={canvasRef}
            width={cropW}
            height={cropH}
            style={{
              maxWidth: '100%',
              borderRadius: shape === 'circle' ? '50%' : '12px',
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onMouseDown={e => handleStart(e.clientX, e.clientY)}
            onMouseMove={e => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleEnd}
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="range" min={1} max={3} step={0.05} value={zoom}
              onChange={e => setZoom(+e.target.value)}
              className="flex-1 accent-pink-500"
            />
            <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-bold text-gray-500 w-10 text-right">{zoom.toFixed(2)}x</span>
          </div>

          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2">
            <RotateCw className="w-3.5 h-3.5" /> Rotar 90°
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex items-center justify-end gap-2 flex-shrink-0 bg-gray-50 dark:bg-gray-950">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="bg-brand-orange text-white text-sm font-black px-5 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Aplicar y subir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
