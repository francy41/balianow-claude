import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* 404 visual */}
        <div className="relative mb-8">
          <div className="text-[120px] font-black leading-none select-none">
            <span className="bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent">4</span>
            <span className="text-6xl mx-2">💃</span>
            <span className="bg-gradient-to-r from-fuchsia-500 to-purple-600 bg-clip-text text-transparent">4</span>
          </div>
        </div>

        <h1 className="font-black text-2xl text-gray-900 dark:text-white mb-2">
          ¡Esta página no baila aquí!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
          La página que buscas no existe o fue movida. ¡Pero hay mucho más por descubrir!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 px-5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold py-3 px-5 rounded-xl hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25"
          >
            <Home className="w-4 h-4" /> Ir al inicio
          </button>
          <button
            onClick={() => navigate('/explorar')}
            className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400 font-bold py-3 px-5 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all"
          >
            <Search className="w-4 h-4" /> Explorar
          </button>
        </div>

        {/* Quick links */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wide">Páginas populares</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: '🎧 Artistas', to: '/artistas' },
              { label: '🎉 Eventos', to: '/eventos' },
              { label: '🏪 Marketplace', to: '/marketplace' },
              { label: '📢 Promociónate', to: '/promocionate' },
              { label: '🎥 En Directo', to: '/live' },
            ].map(link => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 bg-gray-100 dark:bg-gray-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 px-3 py-1.5 rounded-full transition-all"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
