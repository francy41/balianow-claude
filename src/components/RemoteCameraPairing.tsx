/**
 * RemoteCameraPairing — Pantalla de emparejamiento (lado TV/PC), presentacional.
 *
 * Muestra el código de 6 dígitos + QR para que el móvil se conecte.
 * El enlace Realtime lo gestiona useRemoteCamera() en el componente padre.
 */
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, CheckCircle2, Loader2, Wifi } from 'lucide-react';
import type { DeviceType } from '../lib/deviceDetect';

interface Props {
  code: string;
  camUrl: string;
  connected: boolean;
  device?: DeviceType;
  onCancel?: () => void;
}

const RemoteCameraPairing: React.FC<Props> = ({ code, camUrl, connected, device = 'tv', onCancel }) => {
  const isTV = device === 'tv';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(camUrl, { width: 320, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(console.warn);
  }, [camUrl]);

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isTV ? 'gap-10' : 'gap-5'}`}>
      <div className="flex items-center gap-3">
        <Smartphone className={`text-pink-400 ${isTV ? 'w-14 h-14' : 'w-7 h-7'}`} />
        <h2 className={`font-black text-white ${isTV ? 'text-5xl' : 'text-xl'}`}>Tu móvil será la cámara</h2>
      </div>

      <p className={`text-white/60 max-w-xl ${isTV ? 'text-2xl' : 'text-sm'}`}>
        Escanea el QR con tu móvil, o entra en <b className="text-white">bailanow.com/baila-camara</b> y escribe el código.
      </p>

      <div className={`flex items-center ${isTV ? 'gap-16' : 'gap-5 flex-col sm:flex-row'}`}>
        {qrDataUrl && (
          <div className={`bg-white rounded-3xl ${isTV ? 'p-6' : 'p-3'}`}>
            <img src={qrDataUrl} alt="QR para conectar móvil" className={isTV ? 'w-64 h-64' : 'w-36 h-36'} />
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <span className={`text-white/40 uppercase tracking-widest font-bold ${isTV ? 'text-xl' : 'text-[10px]'}`}>Código</span>
          <div className={`font-black text-white tracking-[0.2em] bg-white/5 border-2 border-pink-500/40 rounded-2xl ${isTV ? 'text-7xl px-10 py-6' : 'text-4xl px-5 py-3'}`}>
            {code}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 font-bold ${isTV ? 'text-2xl' : 'text-sm'} ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
        {connected
          ? <><CheckCircle2 className={isTV ? 'w-8 h-8' : 'w-5 h-5'} /> ¡Móvil conectado! Ya puedes empezar.</>
          : <><Loader2 className={`${isTV ? 'w-8 h-8' : 'w-5 h-5'} animate-spin`} /> Esperando tu móvil…</>}
      </div>

      {onCancel && (
        <button onClick={onCancel} className={`text-white/50 hover:text-white underline ${isTV ? 'text-xl' : 'text-sm'}`}>
          ← Usar la cámara de este dispositivo
        </button>
      )}

      <p className={`text-white/25 max-w-md ${isTV ? 'text-lg' : 'text-[11px]'}`}>
        <Wifi className="w-3.5 h-3.5 inline mr-1" />
        Privado: tu vídeo se queda en el móvil. Solo viajan los puntos de tu esqueleto.
      </p>
    </div>
  );
};

export default RemoteCameraPairing;
