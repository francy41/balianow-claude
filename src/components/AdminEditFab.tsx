import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Record<string, any> | null>(null);

  const isAdmin = !!user && ['admin', 'superadmin'].includes(String(user.role));
  const cfg = DETAIL_EDIT[kind];

  const openEditor = async () => {
    if (!cfg || !id) return;
    setLoading(true);
    const { data, error } = await supabase.from(cfg.table).select('*').eq('id', id).maybeSingle();
    setLoading(false);
    if (error) { addToast({ type: 'error', message: `No se pudo cargar para editar: ${error.message}` }); return; }
    if (!data) { addToast({ type: 'warning', message: 'Este registro no está en la tabla editable (puede ser un perfil de usuario). Edítalo desde el panel admin.' }); return; }
    setRow(data);
    setOpen(true);
  };

  // Auto-abrir el editor cuando se llega con ?edit=1 (desde el panel admin).
  useEffect(() => {
    if (isAdmin && id && cfg && searchParams.get('edit') === '1') {
      openEditor();
      const sp = new URLSearchParams(searchParams);
      sp.delete('edit');
      setSearchParams(sp, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!isAdmin || !id || !cfg) return null;

  const label = kind === 'event' ? 'evento' : kind === 'artist' ? 'perfil' : kind === 'venue' ? 'local' : 'servicio';

  return (
    <>
      <button
        onClick={openEditor}
        disabled={loading}
        title={`Editar ${label} (admin)`}
        className="fixed z-[70] bottom-24 left-4 sm:bottom-8 sm:left-8 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-2xl shadow-fuchsia-500/40 hover:scale-105 transition-all ring-2 ring-white/40"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pencil className="w-5 h-5" />}
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
