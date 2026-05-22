import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const DarkModeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bailanow-dark') === 'true';
  });

  // Apply class on mount + change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bailanow-dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bailanow-dark', 'false');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(v => !v)}
      className="fixed bottom-36 lg:bottom-4 right-4 z-[60] w-11 h-11 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 border-2 border-pink-500/30 hover:border-pink-500 hover:scale-110 active:scale-95"
      style={{
        background: darkMode
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)',
      }}
      title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {darkMode
        ? <Sun className="w-4 h-4 text-yellow-400" />
        : <Moon className="w-4 h-4 text-purple-500" />
      }
    </button>
  );
};

export default DarkModeToggle;
