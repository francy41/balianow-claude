import React from 'react';
import { QrCode, ScanLine, Wine, CalendarCheck, BarChart3, Users, ArrowRight } from 'lucide-react';

interface Tool {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
  action: 'qr' | 'split' | 'nav';
  path?: string;
}

const TOOLS: Tool[] = [
  { id: 'qr',       icon: <QrCode className="w-5 h-5" />,        title: 'Código QR',       desc: 'QR a tu perfil, reservas o enlace',        gradient: 'from-fuchsia-500 to-purple-600', action: 'qr' },
  { id: 'checkin',  icon: <ScanLine className="w-5 h-5" />,      title: 'Check-in en puerta', desc: 'Escanea entradas con la cámara',        gradient: 'from-blue-500 to-indigo-600',    action: 'nav', path: '/dashboard?tab=scanner' },
  { id: 'mesas',    icon: <Wine className="w-5 h-5" />,          title: 'Mesas VIP',       desc: 'Bottle service y palcos en eventos',       gradient: 'from-amber-500 to-orange-600',   action: 'nav', path: '/eventos' },
  { id: 'reservas', icon: <CalendarCheck className="w-5 h-5" />, title: 'Reservas con seña', desc: 'Cobra un depósito, resto en el local',   gradient: 'from-pink-500 to-rose-600',      action: 'nav', path: '/eventos' },
  { id: 'stats',    icon: <BarChart3 className="w-5 h-5" />,     title: 'Estadísticas',    desc: 'Ganancias y métricas del negocio',         gradient: 'from-emerald-500 to-teal-600',   action: 'nav', path: '/dashboard?tab=earnings' },
  { id: 'split',    icon: <Users className="w-5 h-5" />,         title: 'Dividir pago',    desc: 'Reparte una mesa entre el grupo',          gradient: 'from-teal-500 to-cyan-600',      action: 'split' },
];

interface BusinessToolsHubProps {
  onNavigate: (path: string) => void;
  onOpenQR: () => void;
  onOpenSplit: () => void;
}

const BusinessToolsHub: React.FC<BusinessToolsHubProps> = ({ onNavigate, onOpenQR, onOpenSplit }) => {
  const handle = (tool: Tool) => {
    if (tool.action === 'qr') return onOpenQR();
    if (tool.action === 'split') return onOpenSplit();
    if (tool.path) onNavigate(tool.path);
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
          🧰 Herramientas de tu negocio
        </h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Acceso directo</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => handle(tool)}
            className="group card-white rounded-2xl p-4 text-left hover:shadow-lg transition-all flex flex-col"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white mb-3`}>
              {tool.icon}
            </div>
            <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1">
              {tool.title}
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{tool.desc}</p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default BusinessToolsHub;
