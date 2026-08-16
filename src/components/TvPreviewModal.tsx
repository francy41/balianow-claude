import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Tv, ArrowRight } from 'lucide-react';
import { useSiteConfigStore, getYouTubeId } from '../store/appStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TvPreviewModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { heroMedia } = useSiteConfigStore();
  if (!open) return null;

  const ytId = heroMedia.type === 'youtube' ? getYouTubeId(heroMedia.url) : null;
  const hasVideo = (heroMedia.type === 'youtube' && ytId) || (heroMedia.type === 'video' && heroMedia.url);

  const goToTv = () => { onClose(); navigate('/tv'); };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-black rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
          <X className="w-4 h-4" />
        </button>

        {hasVideo ? (
          <div className="aspect-video w-full">
            {ytId ? (
              <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} title="BailaNow TV" allow="autoplay; encrypted-media" allowFullScreen className="w-full h-full" style={{ border: 0 }} />
            ) : (
              <video src={heroMedia.url} controls autoPlay className="w-full h-full object-contain" />
            )}
          </div>
        ) : (
          <div className="aspect-video w-full flex flex-col items-center justify-center text-center px-6">
            <Tv className="w-10 h-10 text-white/40 mb-3" />
            <p className="text-white font-bold">Aún no hay vídeo destacado</p>
            <p className="text-white/50 text-sm mt-1">Explora todo el catálogo de BailaNow TV</p>
          </div>
        )}

        <div className="p-4 flex items-center justify-between bg-gray-950">
          <div>
            <p className="text-white font-black text-sm flex items-center gap-1.5"><Tv className="w-4 h-4 text-pink-400" /> BailaNow TV</p>
            <p className="text-white/40 text-xs mt-0.5">Clases, coreografías y shows en vídeo</p>
          </div>
          <button onClick={goToTv} className="bg-white text-gray-900 font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 hover:opacity-90 flex-shrink-0">
            Ver catálogo completo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TvPreviewModal;
