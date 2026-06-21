import React, { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore } from '../store/appStore';
import { DETAIL_EDIT } from '../config/editFields';
import AdminEditModal from './AdminEditModal';

/**
 * Botón flotante de edición para administradores en las páginas de detalle.
 * Solo se muestra a admin/superadmin. Carga la fila REAL completa de la tabla
 * y abre el modal genérico con TODOS los campos editables de esa categoría.
 *
 * Uso:
 *   <AdminEditFab kind="event" id={eventId} onSaved={reload} />
 */
interface Props {
  kind: 'event' | 'artist' | 'venue' | 'service';
  id?: string;
  onSaved?: () => void;
}

const AdminEditFab: React.FC<Props> = ({ kind, id, onSaved }) => {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Record<string, any> | null>(null);

  const isAdmin = !!user && ['admin', 'superadmin'].includes(String(user.role));
  const cfg = DETAIL_EDIT[kind];
  if (!isAdmin || !id || !cfg) return null;

  const openEditor = async () => {
    setLoading(true);
    const { data, error } = await supabase.from(cfg.table).select('*').eq('id', id).maybeSingle();
    setLoading(false);
    if (error) { addToast({ type: 'error', message: `No se pudo cargar para editar: ${error.message}` }); return; }
    if (!data) { addToast({ type: 'warning', message: 'Este registro no está en la tabla editable (puede ser un perfil de usuario). Edítalo desde el panel admin.' }); return; }
    setRow(data);
    setOpen(true);
  };

  const label = kind === 'event' ? 'evento' : kind === 'artist' ? 'perfil' : kind === 'venue' ? 'local' : 'servicio';

  return (
    <>
      <button
        onClick={openEditor}
        disabled={loading}
        title={`Editar ${label} (admin)`}
        className="fixed z-[60] bottom-24 right-4 sm:bottom-8 sm:right-8 flex items-center gap-2 bg-gray-900 text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-2xl hover:bg-black hover:scale-105 transition-all border border-white/10"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
        Editar {label}
      </button>

      {open && row && (
        <AdminEditModal
          open
          onClose={() => setOpen(false)}
          title={`Editar ${label}`}
          entity={cfg.entity}
          item={row as any}
          fields={cfg.fields}
          onSaved={() => {
            setOpen(false);
            if (onSaved) onSaved();
            else setTimeout(() => window.location.reload(), 400);
          }}
        />
      )}
    </>
  );
};

export default AdminEditFab;
