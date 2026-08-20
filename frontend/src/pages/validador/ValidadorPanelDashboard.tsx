import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { ValidadorActividadPanel } from '../../components/ValidadorActividadPanel';
import { StatusBadge } from '../../components/StatusBadge';
import { Loading } from '../../components/Loading';
import type { Activity, User } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HUB_URL } from '../../config/hub';

// Panel de listado del validador — historial/pendientes con filtros, tabla,
// paginación. Existía en el módulo acoplado (ValidadorDashboard genérico,
// compartido con IVC/PYBA/Espacio Público) pero nunca se portó acá: el único
// landing de validador en este repo era el mapa (ValidadorMapaDashboard),
// que no tiene vista de lista/historial. Reescrito mono-dominio (solo
// ambiental, sin las ramas de categoría/subtipo del genérico) en vez de
// portado línea por línea.
//
// Estados reales de este backend (ver EstadoPunto): ENVIADA = pendiente de
// revisión, PUBLICADA/RECHAZADA = ya resueltos por un validador. APROBADA
// nunca se usa — approve() salta directo a PUBLICADA.
const PAGE_SIZE = 15;

export const ValidadorPanelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gestores, setGestores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [barrioFilter, setBarrioFilter] = useState('');
  const [gestorFilter, setGestorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Activity | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await activityService.getAll();
      setActivities(data);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    usersService.getGestores().then(setGestores).catch(() => setGestores([]));
  }, []);

  const gestoresMap = useMemo(() => {
    const map = new Map<string, string>();
    gestores.forEach((g) => map.set(g.id, `${g.name} ${g.lastname || ''}`.trim()));
    return map;
  }, [gestores]);

  const barriosUnicos = useMemo(
    () => Array.from(new Set(activities.map((a) => a.barrio).filter(Boolean))).sort(),
    [activities],
  );

  const filtered = useMemo(() => {
    const base = activities.filter((a) =>
      activeTab === 'pending' ? a.status === 'ENVIADA' : (a.status === 'PUBLICADA' || a.status === 'RECHAZADA'),
    );
    return base.filter((a) => {
      if (barrioFilter && a.barrio !== barrioFilter) return false;
      if (gestorFilter && a.createdByUserId !== gestorFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesNumber = (a.pointNumber ?? '').toString() === q;
        const matchesBarrio = (a.barrio || '').toLowerCase().includes(q);
        if (!matchesNumber && !matchesBarrio) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [activities, activeTab, barrioFilter, gestorFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendientesCount = activities.filter((a) => a.status === 'ENVIADA').length;
  const historialCount = activities.filter((a) => a.status === 'PUBLICADA' || a.status === 'RECHAZADA').length;

  const changeTab = (tab: 'pending' | 'history') => { setActiveTab(tab); setPage(1); };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-red-700 to-rose-600 px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-white text-lg font-black">Panel del Validador</h1>
            <p className="text-white/70 text-xs">Puntos de acumulación · Ambiental</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/validador/residuos')}
              className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl transition-colors"
            >
              Ver Mapa
            </button>
            <button
              onClick={() => { window.location.href = HUB_URL; }}
              className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => changeTab('pending')}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-colors ${activeTab === 'pending' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200'}`}
          >
            Pendientes ({pendientesCount})
          </button>
          <button
            onClick={() => changeTab('history')}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200'}`}
          >
            Historial ({historialCount})
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por # de punto o barrio"
            className="flex-1 min-w-[180px] bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <select
            value={barrioFilter}
            onChange={(e) => { setBarrioFilter(e.target.value); setPage(1); }}
            className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-medium outline-none"
          >
            <option value="">Todos los barrios</option>
            {barriosUnicos.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={gestorFilter}
            onChange={(e) => { setGestorFilter(e.target.value); setPage(1); }}
            className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-medium outline-none"
          >
            <option value="">Todos los gestores</option>
            {gestores.map((g) => <option key={g.id} value={g.id}>{g.name} {g.lastname}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          {pageItems.length === 0 ? (
            <p className="text-xs text-neutral-400 p-6 text-center">Sin puntos {activeTab === 'pending' ? 'pendientes' : 'en el historial'}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 uppercase tracking-wider text-[10px]">
                    <th className="text-left px-4 py-3 font-bold">#</th>
                    <th className="text-left px-4 py-3 font-bold">Barrio</th>
                    <th className="text-left px-4 py-3 font-bold">Gestor</th>
                    <th className="text-left px-4 py-3 font-bold">Fecha</th>
                    <th className="text-left px-4 py-3 font-bold">Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="border-b border-neutral-50 last:border-0 hover:bg-red-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-neutral-700">{a.pointNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-600">{a.barrio}</td>
                      <td className="px-4 py-3 text-neutral-500">{gestoresMap.get(a.createdByUserId) || '—'}</td>
                      <td className="px-4 py-3 text-neutral-400">{format(new Date(a.dateTime), 'd MMM yyyy', { locale: es })}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} size="sm" /></td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">Ver →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-neutral-200 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-xs text-neutral-500 font-bold">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-neutral-200 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>

      {selected && (
        <ValidadorActividadPanel
          activity={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
};
