import React, { useEffect, useRef } from 'react';
import { X, Star, CheckCircle, AlertCircle, Info, AlertTriangle, Search } from 'lucide-react';
import { useUIStore } from '../../store/appStore';
import type { Toast } from '../../store/appStore';
export { default as AppImage } from './AppImage';

// ── BUTTON ─────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'orange' | 'outline' | 'dark' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'orange', size = 'md', loading = false,
  icon, className = '', disabled, ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants = {
    orange:  'bg-brand-orange text-white hover:bg-brand-orange-dark shadow-orange',
    outline: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white',
    dark:    'bg-gray-900 text-white hover:bg-gray-800',
    ghost:   'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
    danger:  'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = { xs: 'px-2.5 py-1 text-xs', sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ── BADGE ──────────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; variant?: 'orange' | 'green' | 'red' | 'gray' | 'blue' | 'live'; className?: string; }

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => {
  const v = {
    orange: 'bg-brand-orange text-white',
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-600',
    gray:   'bg-gray-100 text-gray-500',
    blue:   'bg-blue-100 text-blue-700',
    live:   'bg-red-600 text-white animate-pulse',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${v[variant]} ${className}`}>{children}</span>;
};

// ── AVATAR ─────────────────────────────────────────────────────────────────
interface AvatarProps { src: string; name: string; size?: 'xs'|'sm'|'md'|'lg'|'xl'; isLive?: boolean; className?: string; }

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', isLive, className = '' }) => {
  const s = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20' };
  return (
    <div className={`relative flex-shrink-0 ${s[size]} ${className}`}>
      <img src={src} alt={name} className={`${s[size]} rounded-full object-cover ring-2 ${isLive ? 'ring-red-500' : 'ring-gray-200'}`}
        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EC4899&color=fff&size=200`; }} />
      {isLive && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />}
    </div>
  );
};

// ── STAR RATING ────────────────────────────────────────────────────────────
export const StarRating: React.FC<{ rating: number; count?: number; size?: 'sm'|'md'; className?: string }> = ({ rating, count, size = 'sm', className = '' }) => {
  const sz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={`${sz} ${i <= Math.round(rating) ? 'fill-brand-orange text-brand-orange' : 'text-gray-200'}`} />)}</div>
      <span className="text-brand-orange text-xs font-bold">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-gray-400 text-xs">({count})</span>}
    </div>
  );
};

// ── SKELETON ───────────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`skeleton ${className}`} />;
export const CardSkeleton: React.FC = () => (
  <div className="card-white overflow-hidden">
    <Skeleton className="h-44 w-full rounded-none rounded-t-xl" />
    <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
  </div>
);

// ── MODAL ──────────────────────────────────────────────────────────────────
interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl'; }

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const s = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${s[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-lg font-display font-bold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        )}
        {!title && <button onClick={onClose} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ── TOAST ──────────────────────────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => { const t = setTimeout(onRemove, 4000); return () => clearTimeout(t); }, [onRemove]);
  const icons = { success: <CheckCircle className="w-5 h-5 text-green-500" />, error: <AlertCircle className="w-5 h-5 text-red-500" />, info: <Info className="w-5 h-5 text-blue-500" />, warning: <AlertTriangle className="w-5 h-5 text-yellow-500" /> };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-card-hover min-w-[280px] animate-fade-in">
      {icons[toast.type]}
      <span className="text-gray-800 text-sm flex-1">{toast.message}</span>
      <button onClick={onRemove} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();
  return <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">{toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />)}</div>;
};

// ── INPUT ──────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; icon?: React.ReactNode; }
export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => (
  <div className="w-full space-y-1">
    {label && <label className="text-gray-600 text-sm font-medium">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
      <input className={`w-full bg-gray-50 border ${error ? 'border-red-400' : 'border-gray-200'} rounded-xl ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all ${className}`} {...props} />
    </div>
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

// ── SEARCH BAR ─────────────────────────────────────────────────────────────
export const SearchBar: React.FC<{ placeholder?: string; value: string; onChange: (v: string) => void; onSearch?: () => void; className?: string }> = ({ placeholder = 'Buscar...', value, onChange, onSearch, className = '' }) => (
  <div className={`relative w-full ${className}`}>
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input type="search" value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSearch?.()}
      placeholder={placeholder}
      className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all text-sm shadow-card" />
  </div>
);

// ── SECTION HEADER ─────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: { label: string; onClick: () => void } }> = ({ title, subtitle, action }) => (
  <div className="section-head">
    <div>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
    </div>
    {action && <button onClick={action.onClick} className="section-link">{action.label} →</button>}
  </div>
);

// ── TABS ───────────────────────────────────────────────────────────────────
interface TabsProps { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void; className?: string; }
export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-1 bg-gray-100 rounded-xl p-1 ${className}`}>
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => onChange(tab.id)}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${active === tab.id ? 'bg-white text-brand-orange shadow-card' : 'text-gray-500 hover:text-gray-700'}`}>
        {tab.label}
        {tab.count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === tab.id ? 'bg-brand-orange/10 text-brand-orange' : 'bg-gray-200 text-gray-500'}`}>{tab.count}</span>}
      </button>
    ))}
  </div>
);

// ── FILTER CHIPS ───────────────────────────────────────────────────────────
export const FilterChips: React.FC<{ options: string[]; selected: string[]; onChange: (v: string[]) => void; multi?: boolean }> = ({ options, selected, onChange, multi = false }) => (
  <div className="scroll-x">
    {options.map(opt => {
      const isSel = selected.includes(opt);
      return (
        <button key={opt} onClick={() => { if (multi) onChange(isSel ? selected.filter(s => s !== opt) : [...selected, opt]); else onChange(isSel ? [] : [opt]); }}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isSel ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-orange hover:text-brand-orange'}`}>
          {opt}
        </button>
      );
    })}
  </div>
);

// ── EMPTY STATE ────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; description: string; action?: React.ReactNode }> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
    <div className="text-6xl mb-4">{icon}</div>
    <h3 className="text-xl font-display font-bold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-400 text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

// ── SPINNER ────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm'|'md'|'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return <div className={`${s[size]} border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin ${className}`} />;
};

export const FullPageLoader: React.FC = () => (
  <div className="fixed inset-0 bg-white dark:bg-[#0a0a0a] flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl">💃</span>
      <Spinner size="lg" />
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  </div>
);

// ── CARD ───────────────────────────────────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; hover?: boolean }> = ({ children, className = '', onClick, hover = false }) => (
  <div onClick={onClick} className={`card-white ${hover ? 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200' : ''} ${className}`}>{children}</div>
);

// ── PRICE DISPLAY ──────────────────────────────────────────────────────────
export const PriceDisplay: React.FC<{ price: number; currency?: string; prefix?: string }> = ({ price, currency = 'EUR', prefix = 'Desde' }) => (
  <div className="flex items-baseline gap-1">
    {prefix && <span className="text-gray-400 text-xs">{prefix}</span>}
    <span className="font-bold text-gray-900 text-lg">{currency === 'EUR' ? '€' : '$'}{price}</span>
  </div>
);
