/**
 * WeeklyScheduleEditor — editor visual de disponibilidad semanal (días + horas).
 * Usado en: ArtistAdminPanel, EntityAdminPanel (venues, services), ProfilePage.
 * Almacena: { day: string; from: string; to: string }[]
 */
import React from 'react';
import { Loader2, Save } from 'lucide-react';

export interface DaySlot { day: string; from: string; to: string; }

export const WEEK_DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Normaliza datos legacy (string[]) o nuevos ({ day, from, to }[]) al formato DaySlot[] */
export function normAvailability(raw: any): DaySlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item =>
      typeof item === 'string'
        ? { day: item, from: '09:00', to: '21:00' }
        : { day: item.day || '', from: item.from || '09:00', to: item.to || '21:00' }
    )
    .filter(s => s.day);
}

interface Props {
  value: any[];
  onChange: (v: DaySlot[]) => void;
  onSave: () => void;
  saving?: boolean;
  label?: string;
  description?: string;
}

const WeeklyScheduleEditor: React.FC<Props> = ({
  value,
  onChange,
  onSave,
  saving = false,
  label = '📅 Días y horarios disponibles',
  description = 'Activa los días y elige el rango horario',
}) => {
  const slots = normAvailability(value);

  const isOn = (d: string) => slots.some(s => s.day === d);

  const toggle = (d: string) => {
    if (isOn(d)) {
      onChange(slots.filter(s => s.day !== d));
    } else {
      onChange([...slots, { day: d, from: '09:00', to: '21:00' }]);
    }
  };

  const updateTime = (d: string, field: 'from' | 'to', val: string) => {
    onChange(slots.map(s => s.day === d ? { ...s, [field]: val } : s));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
        <p className="text-xs text-gray-400 mb-4">{description}</p>
        <div className="space-y-2">
          {WEEK_DAYS_FULL.map(d => {
            const on = isOn(d);
            const slot = slots.find(s => s.day === d);
            return (
              <div key={d} className={`rounded-xl border transition-all ${on ? 'border-fuchsia-300 bg-pink-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={() => toggle(d)}
                  className={`w-full px-4 py-3 flex items-center justify-between text-sm font-bold rounded-xl ${on ? 'text-fuchsia-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${on ? 'bg-brand-secondary border-brand-secondary text-white text-[10px]' : 'border-gray-300'}`}>
                      {on && '✓'}
                    </span>
                    {d}
                  </span>
                  {on && slot && (
                    <span className="text-xs font-semibold text-brand-secondary">{slot.from} – {slot.to}</span>
                  )}
                </button>

                {on && slot && (
                  <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-brand-secondary mb-1 uppercase tracking-wide">Desde</label>
                      <input
                        type="time"
                        value={slot.from}
                        onChange={e => updateTime(d, 'from', e.target.value)}
                        className="w-full border border-fuchsia-200 rounded-lg px-3 py-2 text-sm font-mono text-fuchsia-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-brand-secondary mb-1 uppercase tracking-wide">Hasta</label>
                      <input
                        type="time"
                        value={slot.to}
                        onChange={e => updateTime(d, 'to', e.target.value)}
                        className="w-full border border-fuchsia-200 rounded-lg px-3 py-2 text-sm font-mono text-fuchsia-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full bg-brand-orange text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar horario
      </button>
    </div>
  );
};

export default WeeklyScheduleEditor;
