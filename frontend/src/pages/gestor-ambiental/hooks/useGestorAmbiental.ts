import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { activityService } from '../../../services/activity.service';
import type { Activity } from '../../../types';
import type { LayerVisibility } from '../../../components/MapLayerControl';

import { type ViewMode } from '../lib/constants';
import { getResiduos, isPuntoEmergencia, isPuntoRecogido } from '../lib/residuos';
import { useSeguimientoModal } from './useSeguimientoModal';
import { useAmbientalFilters } from './useAmbientalFilters';
import { useRutaAmbiental } from './useRutaAmbiental';
import { useSectoresAmbiental } from './useSectoresAmbiental';
import { useActividadesCalor } from './useActividadesCalor';

// ════════════════════════════════════════════════════════════════
// useGestorAmbiental — todo el estado/effects/memos/handlers del
// dashboard del Gestor Ambiental. Se expone via GestorAmbientalContext
// para que las vistas grandes (GeneralMapView) consuman sin prop-drilling.
// El tipo del contexto se deriva con ReturnType: tsc detecta cableado
// faltante igual que con props explícitas.
// ════════════════════════════════════════════════════════════════
export function useGestorAmbiental() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [viewMode, setViewMode] = useState<ViewMode>('general-map');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    barrios: false,
    carrera7: false,
    colegios: false,
    cestas: false,
    falloSanVictorino: false,
    propiedadHorizontal: false,
    upz: false,
    cambuches: false,
    bodegas: false,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [mapZoomEnabled, setMapZoomEnabled] = useState(true);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  // Punto al que se centra el mapa al tocar un marcador (sin abrir sectores).
  const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const focusOnPoint = useCallback((lat: number, lng: number) => {
    setFocusPoint([lat, lng]);
    setFocusNonce((n) => n + 1);
  }, []);
  // Id de actividad cuyo marker/popup debe abrirse en el mapa (disparado desde el bottom sheet "Puntos").
  const [focusActivityId, setFocusActivityId] = useState<string | null>(null);
  const [focusActivityNonce, setFocusActivityNonce] = useState(0);
  const focusOnActivity = useCallback((activity: { id: string; lat: number; lng: number }) => {
    focusOnPoint(activity.lat, activity.lng);
    setFocusActivityId(activity.id);
    setFocusActivityNonce((n) => n + 1);
  }, [focusOnPoint]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, []);

  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Seguimiento modal
  const seguimiento = useSeguimientoModal();

  // Filtros del dashboard (persistentes)
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const filters = useAmbientalFilters();
  const {
    genFilterTipo, genFilterEstado, genFilterSubtipo,
    sidebarTab, emergencyFilter, globalBarrio,
    listSearchNumber, mapaEstadoRecoleccionFilter,
  } = filters;

  // ── Planificador de ruta (dominio propio) ───────────────────────
  const ruta = useRutaAmbiental(activities, user, setViewMode, setToast);

  // "Mis puntos" (solo asignados) vs "Todos" — compartido entre mapa y el
  // stack de Puntos para que ambos muestren el mismo set. Por defecto
  // "Mis puntos" para optimizar la carga inicial en celulares de gama baja.
  const [soloMios, setSoloMios] = useState(true);
  const puntosAsignadosSet = useMemo(() => new Set(ruta.puntosAsignados), [ruta.puntosAsignados]);

  // Extraemos barrios unicos para el select
  const barriosUnicos = useMemo(() => {
    const barrios = activities.map(a => a.barrio).filter(Boolean);
    return Array.from(new Set(barrios)).sort();
  }, [activities]);

  // ── Sectores de Recolección (dominio propio) ──
  const sectores = useSectoresAmbiental(activities, user);
  const {
    activeSectorIds,
    activitySectorMap,
    collectionDayName,
    getSectorsCollectedToday,
  } = sectores;

  // ── Data Loading ──
  // Los puntos de residuos NUNCA desaparecen → cargar todos sin filtro de fecha
  const loadActivities = useCallback(async () => {
    setLoadingGeneral(true);
    try {
      const data = await activityService.getAll({
        operativoCategoria: 'AMBIENTAL',
        // Sin filtro de fecha: siempre mostrar todos los puntos históricos
        limit: 2000,
      });
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setToast({ message: 'Error al cargar actividades', type: 'error' });
    } finally {
      setLoadingGeneral(false);
      setLoading(false);
    }
  // Sin dependencias de fecha – siempre carga todos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // ── Actividades en calor y auto-marcado (dominio propio) ──
  const calor = useActividadesCalor({
    activities,
    user,
    setToast,
    loadActivities,
    activeSectorIds,
    activitySectorMap,
    collectionDayName,
    getSectorsCollectedToday,
  });

  // Sincronizar selectedActivity con datos frescos de la lista sin causar bucles
  useEffect(() => {
    if (selectedActivity) {
      const fresh = activities.find((a: Activity) => a.id === selectedActivity.id);
      if (fresh && fresh !== selectedActivity) {
        setSelectedActivity(fresh);
      }
    }
  }, [activities]);

  const openActivity = (a: Activity) => {
    setSelectedActivity(a);
    setViewMode('activity-detail');
    // Ya NO auto-selecciona sectores ni abre el panel de sector. Solo abre el detalle.
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  // ── Filtered activities ──
  const puntoCriticoActivities = useMemo(() => {
    return activities.filter((a: Activity) => a.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION');
  }, [activities]);

  const ambientalActivities = useMemo(() => {
    return activities.filter((a: Activity) => a.operativoSubtipo === 'AMBIENTAL');
  }, [activities]);

  const filteredActivities = useMemo(() => {
    let base = genFilterSubtipo === 'AMBIENTAL' ? ambientalActivities
      : genFilterSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' ? puntoCriticoActivities
        : activities;

    if (emergencyFilter) {
      base = base.filter((a: Activity) => isPuntoEmergencia(a));
    }

    if (globalBarrio) {
      base = base.filter((a: Activity) => a.barrio === globalBarrio);
    }
    if (mapaEstadoRecoleccionFilter !== 'ALL') {
      base = base.filter((a: Activity) => {
        if (a.operativoCategoria !== 'AMBIENTAL' && a.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return true;
        const recog = isPuntoRecogido(a);
        return mapaEstadoRecoleccionFilter === 'RECOGIDOS' ? recog : !recog;
      });
    }

    return base.filter((a: Activity) => {
      if (genFilterTipo && a.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION') {
        const residuos = getResiduos(a);
        const hasType = residuos.some(r => String(r.tipoResiduo).toUpperCase() === genFilterTipo);
        if (!hasType) return false;
      }
      if (genFilterEstado && a.status !== genFilterEstado) return false;
      return true;
    });
  }, [activities, genFilterTipo, genFilterEstado, genFilterSubtipo, ambientalActivities, puntoCriticoActivities, emergencyFilter, globalBarrio, mapaEstadoRecoleccionFilter]);

  const filteredActivitiesWithIndex = useMemo(() => {
    // Always use the persisted pointNumber from the DB — never recalculate dynamically.
    // Consistent across Admin, GestorAmbiental and ValidadorAmbiental panels.
    return filteredActivities.map((a) => ({
      activity: a,
      displayIdx: (a.pointNumber && a.pointNumber > 0) ? a.pointNumber : 0,
    }));
  }, [filteredActivities]);

  const mapActivitiesFinal = useMemo(() => {
    return filteredActivitiesWithIndex.filter(item => {
      if (soloMios && item.activity.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' && !puntosAsignadosSet.has(item.activity.id)) {
        return false;
      }
      if (listSearchNumber) {
        // Busqueda por numero EXACTO
        return item.displayIdx.toString() === listSearchNumber.trim();
      }
      return true;
    });
  }, [filteredActivitiesWithIndex, listSearchNumber, soloMios, puntosAsignadosSet]);

  const sidebarActivitiesWithIndex = useMemo(() => {
    return filteredActivitiesWithIndex
      .filter(({ activity: a }) => {
      if (sidebarTab === 'rechazadas') {
        return a.status === 'RECHAZADA' && a.createdByUserId === user?.id;
      }
      return sidebarTab === 'ambiental'
        ? a.operativoSubtipo === 'AMBIENTAL'
        : a.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION';
    }).filter(({ activity: a }) => {
      if (soloMios && a.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' && !puntosAsignadosSet.has(a.id)) {
        return false;
      }
      return true;
    }).filter(item => {
      if (listSearchNumber) {
        // Busqueda por numero EXACTO
        return item.displayIdx.toString() === listSearchNumber.trim();
      }
      return true;
    }).sort((a, b) => b.displayIdx - a.displayIdx);
  }, [filteredActivitiesWithIndex, sidebarTab, user?.id, listSearchNumber, soloMios, puntosAsignadosSet]);

  return {
    navigate,
    user,
    viewMode, setViewMode,
    layerVisibility, setLayerVisibility,
    loading, setLoading,
    toast, setToast,
    mapZoomEnabled, setMapZoomEnabled,
    layersPanelOpen, setLayersPanelOpen,
    focusPoint, setFocusPoint,
    focusNonce, setFocusNonce,
    focusOnPoint,
    focusActivityId, focusActivityNonce, focusOnActivity,
    activities, setActivities,
    selectedActivity, setSelectedActivity,
    soloMios, setSoloMios,
    ...seguimiento,
    ...filters,
    loadingGeneral, setLoadingGeneral,
    barriosUnicos,
    ...sectores,
    ...calor,
    loadActivities,
    openActivity,
    handleLogout,
    puntoCriticoActivities,
    ambientalActivities,
    filteredActivities,
    filteredActivitiesWithIndex,
    mapActivitiesFinal,
    sidebarActivitiesWithIndex,
    // ── Ruta ──
    ...ruta,
  };
}

export type GestorAmbientalValue = ReturnType<typeof useGestorAmbiental>;
