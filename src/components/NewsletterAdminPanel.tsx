/**
 * NewsletterAdminPanel — Gestión de suscriptores del newsletter
 *
 * - Lista todos los suscriptores con filtros (sincronizados a GHL, baja, etc)
 * - Exportar CSV
 * - Buscar por email
 * - Eliminar suscriptor individual (RGPD: derecho de supresión)
 * - Marcar como dado de baja (unsubscribed) sin eliminar
 *
 * Requiere rol admin/superadmin (RLS de la tabla)
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Mail, Search, Download, Trash2, RefreshCw, UserX, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/appStore';
import { audit } from '../lib/audit';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string;
  tags: string[] | null;
  synced_to_ghl: boolean;
  ghl_contact_id: string | null;
  unsubscribed: boolean;
  created_at: string;
  updated_at: string;
}

const NewsletterAdminPanel: React.FC = () => {
  const addToast = useUIStore(s => s.addToast);
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed' | 'synced' | 'pending'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      setItems((data || []) as Subscriber[]);
    } catch (e: any) {
      addToast({ type: 'error', message: `Error: ${e.message}` });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(s => {
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()) && !(s.name || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'active'        && s.unsubscribed)         return false;
      if (filter === 'unsubscribed'  && !s.unsubscribed)        return false;
      if (filter === 'synced'        && !s.synced_to_ghl)       return false;
      if (filter === 'pending'       && s.synced_to_ghl)        return false;
      return true;
    });
  }, [items, search, filter]);

  const stats = useMemo(() => ({
    total:    items.length,
    active:   items.filter(s => !s.unsubscribed).length,
    unsub:    items.filter(s => s.unsubscribed).length,
    synced:   items.filter(s => s.synced_to_ghl).length,
    pending:  items.filter(s => !s.synced_to_ghl).length,
  }), [items]);

  const exportCsv = () => {
    const headers = ['email', 'name', 'source', 'tags', 'synced_to_ghl', 'unsubscribed', 'created_at'];
    const rows = filtered.map(s => [
      s.email,
      s.name || '',
      s.source,
      (s.tags || []).join(';'),
      s.synced_to_ghl ? 'yes' : 'no',
      s.unsubscribed ? 'yes' : 'no',
      s.created_at,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: `Exportados ${filtered.length} suscriptores` });
    audit('export', 'newsletter_subscribers', null, { metadata: { count: filtered.length } });
  };

  const handleUnsub = async (s: Subscriber) => {
    const action = s.unsubscribed ? 'reactivar' : 'dar de baja';
    if (!confirm(`¿${action} a ${s.email}?`)) return;
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ unsubscribed: !s.unsubscribed })
      .eq('id', s.id);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    audit('update', 'newsletter_subscribers', s.id, { metadata: { action } });
    addToast({ type: 'success', message: `${s.email} ${action === 'reactivar' ? 'reactivado' : 'dado de baja'}` });
    load();
  };

  const handleDelete = async (s: Subscriber) => {
    if (!confirm(`¿Eliminar PERMANENTEMENTE a ${s.email}? Esto es irreversible (cumple RGPD derecho de supresión).`)) return;
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', s.id);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    audit('delete', 'newsletter_subscribers', s.id, { metadata: { email: s.email } });
    addToast({ type: 'success', message: `${s.email} eliminado` });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-black text-2xl flex items-center gap-2">
          <Mail className="w-6 h-6 text-pink-500" /> Newsletter
        </h2>
        <p className="text-sm text-gray-500 mt-1">Gestiona suscriptores del email marketing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color="bg-gray-50 text-gray-900" />
        <StatCard label="Activos" value={stats.active} color="bg-green-50 text-green-700" />
        <StatCard label="Bajas" value={stats.unsub} color="bg-red-50 text-red-700" />
        <StatCard label="Sync GHL" value={stats.synced} color="bg-blue-50 text-blue-700" />
        <StatCard label="Pendientes" value={stats.pending} color="bg-orange-50 text-orange-700" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="input-field pl-9 text-sm"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="input-field text-sm w-auto">
          <option value="all">Todos ({stats.total})</option>
          <option value="active">Activos ({stats.active})</option>
          <option value="unsubscribed">Dados de baja ({stats.unsub})</option>
          <option value="synced">Sincronizados GHL ({stats.synced})</option>
          <option value="pending">Pendientes ({stats.pending})</option>
        </select>
        <button onClick={load} className="border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
        <button onClick={exportCsv} disabled={filtered.length === 0}
          className="btn-orange text-sm px-3 py-2 flex items-center gap-1 disabled:opacity-50">
          <Download className="w-4 h-4" /> Exportar CSV ({filtered.length})
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          Cargando suscriptores...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{items.length === 0 ? 'Aún no hay suscriptores' : 'No hay suscriptores que coincidan'}</p>
        </div>
      ) : (
        <div className="card-white overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-bold text-gray-600">Email</th>
                <th className="text-left p-3 font-bold text-gray-600">Nombre</th>
                <th className="text-left p-3 font-bold text-gray-600 hidden sm:table-cell">Fuente</th>
                <th className="text-left p-3 font-bold text-gray-600">Estado</th>
                <th className="text-left p-3 font-bold text-gray-600 hidden md:table-cell">Fecha</th>
                <th className="text-right p-3 font-bold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className={s.unsubscribed ? 'opacity-50' : ''}>
                  <td className="p-3 font-mono text-xs truncate max-w-[200px]">{s.email}</td>
                  <td className="p-3 text-gray-700">{s.name || '—'}</td>
                  <td className="p-3 text-gray-500 hidden sm:table-cell">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{s.source}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {s.unsubscribed
                        ? <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 w-fit"><UserX className="w-3 h-3" /> Baja</span>
                        : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Activo</span>}
                      {s.synced_to_ghl
                        ? <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-flex items-center gap-1 w-fit">📬 GHL</span>
                        : <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded inline-flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" /> Pendiente</span>}
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(s.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleUnsub(s)}
                        title={s.unsubscribed ? 'Reactivar' : 'Dar de baja'}
                        className={`p-1.5 rounded hover:bg-gray-100 ${s.unsubscribed ? 'text-green-500' : 'text-orange-500'}`}>
                        {s.unsubscribed ? <CheckCircle className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(s)}
                        title="Eliminar (RGPD)"
                        className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className={`${color} rounded-xl p-3`}>
    <p className="text-2xl font-black">{value}</p>
    <p className="text-xs font-bold opacity-70">{label}</p>
  </div>
);

export default NewsletterAdminPanel;
