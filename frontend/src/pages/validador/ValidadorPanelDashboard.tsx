import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { useAuthStore } from '../../store/authStore';
import { ValidadorActividadPanel } from '../../components/ValidadorActividadPanel';
import { Loading } from '../../components/Loading';
import type { Activity, User } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { HUB_URL } from '../../config/hub';

// Panel de listado del validador — reconstruido para calzar con el look del
// panel de validación que existía en el módulo acoplado (2 KPIs grandes +
// tabs con subrayado + card de filtros + lista), que nunca se había portado
// acá (el único landing de validador en este repo era el mapa). Mono-dominio
// (solo ambiental) en vez del genérico compartido con IVC/PYBA del acoplado.
//
// Estados reales de este backend (ver EstadoPunto): ENVIADA = pendiente de
// revisión, PUBLICADA/RECHAZADA = ya resueltos. APROBADA nunca se usa —
// approve() salta directo a PUBLICADA.
const PAGE_SIZE = 15;

export const ValidadorPanelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [gestores, setGestores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [gestorSearch, setGestorSearch] = useState('');
  const [barrioFilter, setBarrioFilter] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
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

  const limpiarFiltros = () => {
    setSearch(''); setGestorSearch(''); setBarrioFilter(''); setDesde(''); setHasta(''); setPage(1);
  };

  const filtered = useMemo(() => {
    const base = activities.filter((a) =>
      activeTab === 'pending' ? a.status === 'ENVIADA' : (a.status === 'PUBLICADA' || a.status === 'RECHAZADA'),
    );
    return base.filter((a) => {
      if (barrioFilter && a.barrio !== barrioFilter) return false;
      if (desde && new Date(a.dateTime) < new Date(desde)) return false;
      if (hasta && new Date(a.dateTime) > new Date(`${hasta}T23:59:59`)) return false;
      if (gestorSearch.trim()) {
        const nombre = (gestoresMap.get(a.createdByUserId) || '').toLowerCase();
        if (!nombre.includes(gestorSearch.trim().toLowerCase())) return false;
      }
      if (search.trim() && (a.pointNumber ?? '').toString() !== search.trim()) return false;
      return true;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [activities, activeTab, barrioFilter, gestorSearch, search, desde, hasta, gestoresMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendientesCount = activities.filter((a) => a.status === 'ENVIADA').length;
  const historialCount = activities.filter((a) => a.status === 'PUBLICADA' || a.status === 'RECHAZADA').length;

  const changeTab = (tab: 'pending' | 'history') => { setActiveTab(tab); setPage(1); };

  const handleLogout = () => {
    logout();
    window.location.href = HUB_URL;
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-red-700 via-rose-700 to-red-600 px-4 py-4 sm:px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-white text-lg font-black">Sistema de Seguimiento Territorial</h1>
            <p className="text-white/70 text-xs">Alcaldía Local de Santa Fe · Panel de Validación Ambiental</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm">
                {(user?.name || 'V')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-tight">{user?.name} {user?.lastname}</p>
                <p className="text-white/60 text-[10px] leading-tight">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/validador/residuos')}
              className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl transition-colors"
            >
              Ver Mapa
            </button>
            <button
              onClick={handleLogout}
              className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-red-600 leading-none">{pendientesCount}</p>
              <p className="text-xs text-neutral-500 mt-1">Actividades Pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 leading-none">{historialCount}</p>
              <p className="text-xs text-neutral-500 mt-1">Validaciones Realizadas</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-neutral-200 mb-5">
          <button
            onClick={() => changeTab('pending')}
            className={`flex items-center gap-2 text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'pending' ? 'text-red-600 border-red-600' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}
          >
            Puntos Pendientes
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>{pendientesCount}</span>
          </button>
          <button
            onClick={() => changeTab('history')}
            className={`flex items-center gap-2 text-sm font-bold pb-3 border-b-2 transition-colors ${activeTab === 'history' ? 'text-red-600 border-red-600' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}
          >
            Historial
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'history' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>{historialCount}</span>
          </button>
          <button
            onClick={() => navigate('/validador/residuos')}
            className="flex items-center gap-2 text-sm font-bold pb-3 border-b-2 border-transparent text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Residuos
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Mapa</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 mb-5">
          <h3 className="text-sm font-black text-neutral-800 mb-3">Filtros</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Gestor</label>
              <input
                value={gestorSearch}
                onChange={(e) => { setGestorSearch(e.target.value); setPage(1); }}
                placeholder="Nombre"
                className="mt-1 w-full bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Barrio</label>
              <select
                value={barrioFilter}
                onChange={(e) => { setBarrioFilter(e.target.value); setPage(1); }}
                className="mt-1 w-full bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs font-medium outline-none"
              >
                <option value="">Todos</option>
                {barriosUnicos.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => { setDesde(e.target.value); setPage(1); }}
                className="mt-1 w-full bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs font-medium outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => { setHasta(e.target.value); setPage(1); }}
                className="mt-1 w-full bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs font-medium outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">N° Punto</label>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="#"
                className="mt-1 w-full bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h3 className="text-sm font-black text-neutral-800 mb-4">
            {activeTab === 'pending' ? `Actividades Pendientes de Validación (${filtered.length})` : `Historial de Validaciones (${filtered.length})`}
          </h3>

          {pageItems.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-sm font-bold text-neutral-500">
                {activeTab === 'pending' ? 'No hay actividades pendientes de validación' : 'Sin resultados en el historial'}
              </p>
              {activeTab === 'pending' && <p className="text-xs text-neutral-400 mt-1">Todas las actividades han sido revisadas</p>}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-50">
              {pageItems.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="flex items-center justify-between gap-3 py-3.5 text-left hover:bg-red-50/40 rounded-xl px-3 -mx-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-black text-red-500 shrink-0 w-8">#{a.pointNumber ?? '—'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-800 truncate">{a.barrio || 'Sin barrio'}</p>
                      <p className="text-[11px] text-neutral-400">
                        {gestoresMap.get(a.createdByUserId) || 'Gestor desconocido'} · {format(new Date(a.dateTime), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-600 shrink-0">Ver →</span>
                </button>
              ))}
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
