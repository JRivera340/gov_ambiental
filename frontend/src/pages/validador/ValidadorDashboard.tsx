import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { StatusBadge } from '../../components/StatusBadge';
import { Loading } from '../../components/Loading';
import { Pagination } from '../../components/Pagination';
import type { Activity, User } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfMonthStr as gSOM, endOfMonthStr as gEOM, startOfYearStr as gSOY, endOfYearStr as gEOY } from '../../utils/dateRanges';

// Ported desde gov-espacio-publico/packages/frontend/src/pages/validador/ValidadorDashboard.tsx
// (hallazgo del recorrido visual 2026-07-31: "Volver al Panel" SÍ apuntaba a
// una pantalla real y completa que este repo nunca portó — ver
// ESTADO-EXTRACCION.md). El hub sirve IVC/Espacio Público/PYBA/Ambiental
// desde el mismo componente, parametrizado por rol; este repo es
// mono-dominio, así que se elimina toda rama que no sea VALIDADOR_AMBIENTAL
// (selector de Categoría, turnos por operativo, subtipos de otros dominios)
// en vez de portarlas sin uso. Filtrado y paginación son 100% client-side:
// el backend de este repo no tiene los parámetros de query server-side que
// tiene el del hub (gestor/categoría/subtipo/turno/paginación) — mismo
// patrón ya usado en el resto de las vistas de este repo (GestorAmbientalDashboard,
// ValidadorMapaDashboard, AdminDashboard).

function tipoOperativoLabel(activity: Activity): string {
  return activity.tipoOperativo === 'GENERICO' ? 'Ambiental' : 'Puntos de Acumulación';
}

const monthToRange = (val: string): { desde: string; hasta: string } | null => {
  if (!val) return null;
  const [y, m] = val.split('-').map(Number);
  if (!y || !m) return null;
  const desde = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const hasta = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { desde, hasta };
};

const ITEMS_PER_PAGE = 10;

export const ValidadorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  const [pending, setPending] = useState<Activity[]>([]);
  const [history, setHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [gestores, setGestores] = useState<User[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);

  // Filtros — pendientes
  const [tipoFilter, setTipoFilter] = useState('');
  const [barrioFilter, setBarrioFilter] = useState('');
  const [gestorFilter, setGestorFilter] = useState('');
  const [gestorSearch, setGestorSearch] = useState('');
  const [showGestorDropdown, setShowGestorDropdown] = useState(false);
  const [pendingSearchNumber, setPendingSearchNumber] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [desdeFilter, setDesdeFilter] = useState(gSOM());
  const [hastaFilter, setHastaFilter] = useState(gEOM());

  // Filtros — historial
  const [historyTipoFilter, setHistoryTipoFilter] = useState('');
  const [historyBarrioFilter, setHistoryBarrioFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [historyCreatorFilter, setHistoryCreatorFilter] = useState('');
  const [historyCreatorSearch, setHistoryCreatorSearch] = useState('');
  const [showHistoryCreatorDropdown, setShowHistoryCreatorDropdown] = useState(false);
  const [historySearchNumber, setHistorySearchNumber] = useState('');
  // Default a año actual, igual que el hub (gSOY/gEOY) — antes quedaba sin
  // filtro por fecha (historial completo desde siempre), lo que hacía que el
  // conteo de esta pantalla (337, todo el historico) no se pudiera comparar
  // contra el de ValidadorMapaDashboard (38, acotado al mes actual): eran
  // ventanas de tiempo distintas, no un error de conteo.
  const [historyMonthFilter, setHistoryMonthFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [historyDesdeFilter, setHistoryDesdeFilter] = useState(gSOY());
  const [historyHastaFilter, setHistoryHastaFilter] = useState(gEOY());

  const gestoresMap = useMemo(() => {
    const map = new Map<string, { name: string; lastname: string; email: string }>();
    gestores.forEach((g) => map.set(g.id, { name: g.name, lastname: g.lastname, email: g.email }));
    return map;
  }, [gestores]);

  const loadGestores = useCallback(async () => {
    try {
      setGestores(await usersService.getGestores());
    } catch (e) { console.error(e); }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        activityService.getPending(),
        activityService.getAll(),
      ]);
      setPending(pendingData);
      setHistory(allData.filter((a) => a.status === 'PUBLICADA' || a.status === 'RECHAZADA'));
    } catch (e) {
      console.error('[ValidadorDashboard] Error cargando actividades:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGestores();
    loadData();
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadGestores, loadData]);

  useEffect(() => { setCurrentPage(1); }, [tipoFilter, barrioFilter, gestorFilter, desdeFilter, hastaFilter, pendingSearchNumber]);
  useEffect(() => { setCurrentPageHistory(1); }, [historyTipoFilter, historyBarrioFilter, historyStatusFilter, historyCreatorFilter, historyDesdeFilter, historyHastaFilter, historySearchNumber]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.gestor-filter-container')) setShowGestorDropdown(false);
      if (!target.closest('.history-creator-filter-container')) setShowHistoryCreatorDropdown(false);
    };
    if (showGestorDropdown || showHistoryCreatorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGestorDropdown, showHistoryCreatorDropdown]);

  const handleMonthChange = (val: string) => {
    setMonthFilter(val);
    const range = monthToRange(val);
    if (range) { setDesdeFilter(range.desde); setHastaFilter(range.hasta); }
  };
  const handleHistoryMonthChange = (val: string) => {
    setHistoryMonthFilter(val);
    const range = monthToRange(val);
    if (range) { setHistoryDesdeFilter(range.desde); setHistoryHastaFilter(range.hasta); }
  };

  const barriosUnicos = useMemo(() => Array.from(new Set(pending.map((a) => a.barrio))).sort(), [pending]);
  const historyBarriosUnicos = useMemo(() => Array.from(new Set(history.map((a) => a.barrio))).sort(), [history]);

  const filteredGestores = useMemo(() => {
    if (!gestorSearch.trim()) return gestores;
    const q = gestorSearch.toLowerCase().trim();
    return gestores.filter((g) => `${g.name} ${g.lastname}`.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
  }, [gestores, gestorSearch]);
  const selectedGestor = useMemo(() => gestores.find((g) => g.id === gestorFilter) || null, [gestores, gestorFilter]);

  const filteredHistoryCreators = useMemo(() => {
    if (!historyCreatorSearch.trim()) return gestores;
    const q = historyCreatorSearch.toLowerCase().trim();
    return gestores.filter((g) => `${g.name} ${g.lastname}`.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
  }, [gestores, historyCreatorSearch]);
  const selectedHistoryCreator = useMemo(() => gestores.find((g) => g.id === historyCreatorFilter) || null, [gestores, historyCreatorFilter]);

  const filteredPending = useMemo(() => {
    return pending.filter((a) => {
      if (tipoFilter && a.tipoOperativo !== tipoFilter) return false;
      if (barrioFilter && a.barrio !== barrioFilter) return false;
      if (gestorFilter && a.createdByUserId !== gestorFilter) return false;
      if (desdeFilter && new Date(a.dateTime) < new Date(desdeFilter)) return false;
      if (hastaFilter && new Date(a.dateTime) > new Date(`${hastaFilter}T23:59:59`)) return false;
      if (pendingSearchNumber.trim() && (a.pointNumber ?? 0).toString() !== pendingSearchNumber.trim()) return false;
      return true;
    });
  }, [pending, tipoFilter, barrioFilter, gestorFilter, desdeFilter, hastaFilter, pendingSearchNumber]);

  const filteredHistory = useMemo(() => {
    const filtradas = history.filter((a) => {
      if (historyTipoFilter && a.tipoOperativo !== historyTipoFilter) return false;
      if (historyBarrioFilter && a.barrio !== historyBarrioFilter) return false;
      if (historyStatusFilter && a.status !== historyStatusFilter) return false;
      if (historyCreatorFilter && a.createdByUserId !== historyCreatorFilter) return false;
      const fechaValidacion = a.validatedAt ? new Date(a.validatedAt) : null;
      if (historyDesdeFilter && (!fechaValidacion || fechaValidacion < new Date(historyDesdeFilter))) return false;
      if (historyHastaFilter && (!fechaValidacion || fechaValidacion > new Date(`${historyHastaFilter}T23:59:59`))) return false;
      if (historySearchNumber.trim() && (a.pointNumber ?? 0).toString() !== historySearchNumber.trim()) return false;
      return true;
    });
    // Mas reciente primero por fecha de validacion, igual que el hub
    // (sorver.repository.typeorm.ts: orderBy('activity.validatedAt', 'DESC')).
    return filtradas.sort((a, b) => {
      const ta = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
      const tb = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [history, historyTipoFilter, historyBarrioFilter, historyStatusFilter, historyCreatorFilter, historyDesdeFilter, historyHastaFilter, historySearchNumber]);

  const totalPagesPending = Math.max(1, Math.ceil(filteredPending.length / ITEMS_PER_PAGE));
  const paginatedPending = filteredPending.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPagesHistory = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedHistory = filteredHistory.slice((currentPageHistory - 1) * ITEMS_PER_PAGE, currentPageHistory * ITEMS_PER_PAGE);

  if (loading && pending.length === 0 && history.length === 0) return <Loading />;

  return (
    <div className="page-container">
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 60,
        background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 45%, #991b1b 100%)',
        boxShadow: '0 4px 20px rgba(153, 27, 27, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/images/alcaldialocalsantafe-sinfondo.png" alt="Alcaldía" className="h-[40px] sm:h-[50px] w-auto object-contain" />
          <div className="hidden sm:block w-[1px] h-[32px] bg-white/25" />
          <div className="hidden sm:block">
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Sistema de Seguimiento Territorial</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11 }}>Alcaldía Local de Santa Fe · Panel de Validación Ambiental</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)', border: '2px solid rgba(255,255,255,0.3)',
            }}>
              <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Usuario'}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 whitespace-nowrap" style={{
            padding: '6px 14px', background: 'rgba(255,255,255,0.15)', color: 'white',
            border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="page-content" style={{ marginTop: '60px' }}>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="stat-icon bg-red-100">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value text-red-600">{filteredPending.length}</p>
                <p className="stat-label">Actividades Pendientes</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="stat-icon bg-success-100">
                <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value text-success">{filteredHistory.length}</p>
                <p className="stat-label">Validaciones Realizadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-neutral-200">
            <nav className="-mb-px flex gap-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Puntos Pendientes
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">{filteredPending.length}</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'}`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Historial
                  <span className="bg-neutral-100 text-neutral-600 text-xs font-semibold px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                </span>
              </button>
              <Link
                to="/validador/residuos"
                className="py-3 px-1 border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 font-medium text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Residuos
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">Mapa</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Filtros — pendientes */}
        {activeTab === 'pending' && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative gestor-filter-container">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Gestor</label>
                <div className="relative">
                  <input
                    type="text" placeholder="Buscar gestor..." value={gestorSearch}
                    onChange={(e) => { setGestorSearch(e.target.value); setShowGestorDropdown(true); }}
                    onFocus={() => setShowGestorDropdown(true)}
                    className="input-field text-sm w-full pr-8"
                  />
                  {gestorFilter && (
                    <button onClick={() => { setGestorFilter(''); setGestorSearch(''); setShowGestorDropdown(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  {showGestorDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredGestores.length > 0 ? filteredGestores.map((g) => (
                        <button key={g.id} onClick={() => { setGestorFilter(g.id); setGestorSearch(`${g.name} ${g.lastname}`); setShowGestorDropdown(false); }} className={`w-full text-left px-4 py-2 hover:bg-neutral-100 ${gestorFilter === g.id ? 'bg-primary/10' : ''}`}>
                          <div className="text-sm font-medium text-neutral-900">{g.name} {g.lastname}</div>
                          <div className="text-xs text-neutral-500">{g.email}</div>
                        </button>
                      )) : <div className="px-4 py-2 text-sm text-neutral-500">No se encontraron gestores</div>}
                    </div>
                  )}
                </div>
                {selectedGestor && <div className="mt-1 text-xs text-neutral-600">Seleccionado: {selectedGestor.name} {selectedGestor.lastname}</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
                <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} className="input-field text-sm">
                  <option value="">Todos</option>
                  <option value="GENERICO">Gestión Ambiental</option>
                  <option value="PUNTO_ACUMULACION">Puntos de Residuos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Barrio</label>
                <select value={barrioFilter} onChange={(e) => setBarrioFilter(e.target.value)} className="input-field text-sm">
                  <option value="">Todos</option>
                  {barriosUnicos.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Mes</label>
                  <input type="month" className="input-field text-sm" value={monthFilter} onChange={(e) => handleMonthChange(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Desde</label>
                  <input type="date" className="input-field text-sm" value={desdeFilter} onChange={(e) => setDesdeFilter(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Hasta</label>
                  <input type="date" className="input-field text-sm" value={hastaFilter} onChange={(e) => setHastaFilter(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">N° Punto</label>
                <input type="number" min="1" placeholder="Ej: 42" className="input-field text-sm" value={pendingSearchNumber} onChange={(e) => setPendingSearchNumber(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setTipoFilter(''); setBarrioFilter(''); setGestorFilter(''); setGestorSearch(''); setShowGestorDropdown(false); setPendingSearchNumber('');
                    setMonthFilter(format(new Date(), 'yyyy-MM')); setDesdeFilter(gSOM()); setHastaFilter(gEOM());
                  }}
                  className="btn-secondary text-sm w-full"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros — historial */}
        {activeTab === 'history' && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
                <select value={historyTipoFilter} onChange={(e) => setHistoryTipoFilter(e.target.value)} className="input-field text-sm">
                  <option value="">Todos</option>
                  <option value="GENERICO">Gestión Ambiental</option>
                  <option value="PUNTO_ACUMULACION">Puntos de Residuos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Barrio</label>
                <select value={historyBarrioFilter} onChange={(e) => setHistoryBarrioFilter(e.target.value)} className="input-field text-sm">
                  <option value="">Todos</option>
                  {historyBarriosUnicos.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Estado</label>
                <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)} className="input-field text-sm">
                  <option value="">Todos</option>
                  <option value="PUBLICADA">Aprobadas/Publicadas</option>
                  <option value="RECHAZADA">Rechazadas</option>
                </select>
              </div>
              <div className="relative history-creator-filter-container">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Creador</label>
                <div className="relative">
                  <input
                    type="text" placeholder="Buscar creador..." value={historyCreatorSearch}
                    onChange={(e) => { setHistoryCreatorSearch(e.target.value); setShowHistoryCreatorDropdown(true); }}
                    onFocus={() => setShowHistoryCreatorDropdown(true)}
                    className="input-field text-sm w-full pr-8"
                  />
                  {historyCreatorFilter && (
                    <button onClick={() => { setHistoryCreatorFilter(''); setHistoryCreatorSearch(''); setShowHistoryCreatorDropdown(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                  {showHistoryCreatorDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredHistoryCreators.length > 0 ? filteredHistoryCreators.map((g) => (
                        <button key={g.id} onClick={() => { setHistoryCreatorFilter(g.id); setHistoryCreatorSearch(`${g.name} ${g.lastname}`); setShowHistoryCreatorDropdown(false); }} className={`w-full text-left px-4 py-2 hover:bg-neutral-100 ${historyCreatorFilter === g.id ? 'bg-primary/10' : ''}`}>
                          <div className="text-sm font-medium text-neutral-900">{g.name} {g.lastname}</div>
                          <div className="text-xs text-neutral-500">{g.email}</div>
                        </button>
                      )) : <div className="px-4 py-2 text-sm text-neutral-500">No se encontraron creadores</div>}
                    </div>
                  )}
                </div>
                {selectedHistoryCreator && <div className="mt-1 text-xs text-neutral-600">Seleccionado: {selectedHistoryCreator.name} {selectedHistoryCreator.lastname}</div>}
              </div>
              <div className="lg:col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Mes</label>
                  <input type="month" className="input-field text-sm" value={historyMonthFilter} onChange={(e) => handleHistoryMonthChange(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Desde</label>
                  <input type="date" className="input-field text-sm" value={historyDesdeFilter} onChange={(e) => setHistoryDesdeFilter(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Hasta</label>
                  <input type="date" className="input-field text-sm" value={historyHastaFilter} onChange={(e) => setHistoryHastaFilter(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">N° Punto</label>
                <input type="number" min="1" placeholder="Ej: 42" className="input-field text-sm" value={historySearchNumber} onChange={(e) => setHistorySearchNumber(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setHistoryTipoFilter(''); setHistoryBarrioFilter(''); setHistoryStatusFilter(''); setHistoryCreatorFilter(''); setHistoryCreatorSearch(''); setShowHistoryCreatorDropdown(false); setHistorySearchNumber('');
                    setHistoryMonthFilter(''); setHistoryDesdeFilter(''); setHistoryHastaFilter('');
                  }}
                  className="btn-secondary text-sm w-full"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listado — pendientes */}
        {activeTab === 'pending' && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Actividades Pendientes de Validación ({filteredPending.length})</h2>
            </div>
            {paginatedPending.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                {gestorFilter && selectedGestor ? (
                  <>
                    <p>Este gestor aún no ha enviado Actividades</p>
                    <p className="text-sm mt-2">{selectedGestor.name} {selectedGestor.lastname} no tiene actividades pendientes de validación</p>
                  </>
                ) : (
                  <>
                    <p>No hay actividades pendientes de validación</p>
                    <p className="text-sm mt-2">{(tipoFilter || barrioFilter || gestorFilter) ? 'Intenta con otros filtros' : 'Todas las actividades han sido revisadas'}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Barrio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Creador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {paginatedPending.map((activity) => {
                        const creator = gestoresMap.get(activity.createdByUserId);
                        return (
                          <tr key={activity.id} className="hover:bg-neutral-50">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-amber-700">{activity.pointNumber ? `#${activity.pointNumber}` : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{format(new Date(activity.dateTime), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                            <td className="px-6 py-4 text-sm text-neutral-900"><div className="font-medium">{tipoOperativoLabel(activity)}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{activity.barrio}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {creator ? (
                                <div>
                                  <div className="font-medium text-neutral-900">{creator.name} {creator.lastname}</div>
                                  <div className="text-xs text-neutral-500">{creator.email}</div>
                                </div>
                              ) : <span className="text-neutral-400">{gestores.length === 0 ? 'Cargando...' : 'Desconocido'}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={activity.status} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link to={`/validador/actividad/${activity.id}`} className="text-primary hover:text-primary-dark font-medium">Revisar</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPagesPending} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredPending.length} />
              </>
            )}
          </div>
        )}

        {/* Listado — historial */}
        {activeTab === 'history' && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Historial de Validaciones ({filteredHistory.length})</h2>
            </div>
            {paginatedHistory.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <p>{history.length === 0 ? 'No hay actividades validadas aún' : 'No hay actividades que coincidan con los filtros'}</p>
                <p className="text-sm mt-2">{history.length === 0 ? 'Aquí aparecerán todas las actividades aprobadas y rechazadas del sistema.' : 'Intenta ajustar los filtros'}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Fecha Validación</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Barrio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Creador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Resultado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {paginatedHistory.map((activity) => {
                        const creator = gestoresMap.get(activity.createdByUserId);
                        return (
                          <tr key={activity.id} className="hover:bg-neutral-50">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-amber-700">{activity.pointNumber ? `#${activity.pointNumber}` : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{activity.validatedAt ? format(new Date(activity.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}</td>
                            <td className="px-6 py-4 text-sm text-neutral-900"><div className="font-medium">{tipoOperativoLabel(activity)}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{activity.barrio}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {gestores.length === 0 ? <span className="text-neutral-400">Cargando...</span> : creator ? (
                                <div>
                                  <div className="font-medium text-neutral-900">{creator.name} {creator.lastname}</div>
                                  <div className="text-xs text-neutral-500">{creator.email}</div>
                                </div>
                              ) : <span className="text-neutral-400">Desconocido</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={activity.status} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Link to={`/validador/actividad/${activity.id}`} className="text-primary hover:text-primary-dark font-medium">Ver</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination currentPage={currentPageHistory} totalPages={totalPagesHistory} onPageChange={setCurrentPageHistory} itemsPerPage={ITEMS_PER_PAGE} totalItems={filteredHistory.length} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
