import React, { useState } from 'react';
import { Check, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore, type UserRole } from '../store/appStore';

const ROLE_LABEL: Record<string, string> = {
  user: 'Usuario', dancer: 'Bailarín/a', dj: 'DJ', artist: 'Artista', instructor: 'Instructor/a',
  musician: 'Músico/a', band: 'Banda', venue: 'Local', business: 'Negocio', promoter: 'Promotor/a',
  partner: 'Partner', admin: 'Admin', superadmin: 'Superadmin',
};

// Roles que un usuario puede autoasignarse. admin/superadmin quedan fuera
// (el RPC add_secondary_role también los rechaza del lado del servidor).
const ADDABLE_ROLES: UserRole[] = ['dancer', 'dj', 'artist', 'instructor', 'musician', 'band', 'venue', 'business', 'promoter'];

/** Gestión de roles múltiples de la cuenta: añadir un rol adicional (ej. ser
 *  bailarín Y instructor a la vez) y elegir cuál está activo ahora mismo. */
const RoleManager: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!user) return null;
  const myRoles = user.roles && user.roles.length ? user.roles : [user.role];
  const addable = ADDABLE_ROLES.filter(r => !myRoles.includes(r));

  const addRole = async (role: UserRole) => {
    setAdding(true);
    const { error } = await supabase.rpc('add_secondary_role', { p_role: role });
    setAdding(false);
    setPickerOpen(false);
    if (error) { addToast({ message: `No se pudo añadir: ${error.message}`, type: 'error' }); return; }
    updateUser({ roles: [...myRoles, role] });
    addToast({ message: `✅ Ahora también eres ${ROLE_LABEL[role] || role}`, type: 'success' });
  };

  const switchActive = async (role: string) => {
    if (role === user.role) return;
    setSwitching(role);
    const { error } = await supabase.rpc('set_primary_role', { p_role: role });
    setSwitching(null);
    if (error) { addToast({ message: `No se pudo cambiar: ${error.message}`, type: 'error' }); return; }
    updateUser({ role: role as UserRole });
    addToast({ message: `Rol activo: ${ROLE_LABEL[role] || role}`, type: 'success' });
  };

  return (
    <div className="card-white rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="font-black text-gray-900 dark:text-white text-sm">Mis roles</h3>
        <p className="text-xs text-gray-400 mt-0.5">Puedes tener varios roles en la misma cuenta. El resaltado es el que ven los demás en tu perfil.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {myRoles.map(r => (
          <button key={r} onClick={() => switchActive(r)} disabled={switching === r}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-60 ${
              r === user.role ? 'bg-brand-orange text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}>
            {switching === r ? <Loader2 className="w-3 h-3 animate-spin" /> : r === user.role ? <Check className="w-3 h-3" /> : null}
            {ROLE_LABEL[r] || r}
          </button>
        ))}
        {addable.length > 0 && (
          <div className="relative">
            <button onClick={() => setPickerOpen(o => !o)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 flex items-center gap-1 hover:border-brand-orange hover:text-brand-orange transition-all">
              <Plus className="w-3 h-3" /> Añadir rol
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                <div className="absolute z-20 top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-1.5 min-w-[160px] max-h-60 overflow-y-auto">
                  {addable.map(r => (
                    <button key={r} onClick={() => addRole(r)} disabled={adding}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
                      {ROLE_LABEL[r] || r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManager;
