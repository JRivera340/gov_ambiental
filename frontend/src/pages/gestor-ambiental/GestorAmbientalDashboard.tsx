import React from 'react';
import { Loading } from '../../components/Loading';
import { Toast } from '../../components/Toast';

import { PreviewImage } from './components/ResiduoImages';
import { SeguimientoModal } from './components/SeguimientoModal';
import { ResiduoDetailModal } from './components/ResiduoDetailModal';
import { ActivityDetailView } from './components/ActivityDetailView';
import { ActivitySidebar } from './components/ActivitySidebar';
import { GeneralMapView } from './components/GeneralMapView';
import { PlanificadorRutaView } from './components/PlanificadorRutaView';
import { RutaActivaView } from './components/RutaActivaView';
import { RutaSegmentoView } from './components/RutaSegmentoView';
import { HistorialRutasView } from './components/HistorialRutasView';
import { HistorialRutaDetalleView } from './components/HistorialRutaDetalleView';
import { PerfilGestorView } from './components/PerfilGestorView';
import { useGestorAmbiental } from './hooks/useGestorAmbiental';
import { GestorAmbientalProvider } from './context/GestorAmbientalContext';
import { AppShell } from '../../components/shell/AppShell';
import { BottomSheet, type BottomSheetState } from '../../components/shell/BottomSheet';
import { AMBIENTAL_NAV_ITEMS, AMBIENTAL_SECONDARY_ACTIONS, getActiveNavKey, type NavKey } from './lib/navConfig';
import { HUB_URL } from '../../config/hub';

// ════════════════════════════════════════════════════════════════
// GestorAmbientalDashboard — orquestador liviano.
// Toda la lógica (estado, effects, memos, handlers) vive en
// `hooks/useGestorAmbiental.ts` y se expone via `GestorAmbientalContext`.
// La vista grande `GeneralMapView` consume el contexto; el resto
// (header, sidebar, detalle, modales) se cablea por props desde el hook.
// ════════════════════════════════════════════════════════════════
export const GestorAmbientalDashboard: React.FC = () => {
  const gad = useGestorAmbiental();
  const {
    navigate,
    user,
    viewMode, setViewMode,
    layerVisibility, setLayerVisibility,
    loading,
    toast, setToast,
    activities,
    selectedActivity, setSelectedActivity,
    showSeguimientoModal, setShowSeguimientoModal,
    seguimientoAction, setSeguimientoAction,
    selectedResiduo, setSelectedResiduo,
    selectedResidueDetail, setSelectedResidueDetail,
    previewImage, setPreviewImage,
    seguimientoPhotos, setSeguimientoPhotos,
    seguimientoFechaRecogida, setSeguimientoFechaRecogida,
    sidebarTab, setSidebarTab,
    loadActivities,
    openActivity,
    focusActivityId,
    focusActivityNonce,
    focusOnActivity,
    handleLogout,
    puntoCriticoActivities,
    ambientalActivities,
    filteredActivities,
    filteredActivitiesWithIndex,
    sidebarActivitiesWithIndex,
    rutaActiva,
    activeSegmento,
  } = gad;

  const [activeNavKey, setActiveNavKeyState] = React.useState<NavKey>('mapa');
  const [sheetState, setSheetState] = React.useState<BottomSheetState>('collapsed');

  React.useEffect(() => {
    if (activeNavKey === 'puntos') {
      setSheetState((prev) => (prev === 'collapsed' ? 'expanded' : prev));
    } else {
      setSheetState('collapsed');
    }
  }, [activeNavKey]);

  React.useEffect(() => {
    setSheetState((prev) => (prev === 'full' ? 'expanded' : prev));
  }, [focusActivityNonce]);

  React.useEffect(() => {
    setActiveNavKeyState((prev) => {
      // Volver a 'general-map' desde el detalle de actividad estando en el tab
      // Puntos no debe sacar al usuario de ese tab — ver onBack/onShowActividades.
      if (viewMode === 'general-map' && prev === 'puntos') return prev;
      return getActiveNavKey(viewMode, prev);
    });
  }, [viewMode]);

  const setActiveNavKey = (key: string) => {
    if (key === 'crear-punto') { navigate('/gestor-ambiental/crear-actividad'); return; }
    // Tocar "Puntos" de nuevo estando ya activo no navega a ningun lado —
    // solo abre/cierra (guarda por completo) el sheet.
    if (key === 'puntos' && activeNavKey === 'puntos') {
      setSheetState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'));
      return;
    }
    const navKey = key as NavKey;
    setActiveNavKeyState(navKey);
    if (navKey === 'mapa') setViewMode('general-map');
    else if (navKey === 'ruta') setViewMode(rutaActiva && rutaActiva.estado === 'en_progreso' ? 'ruta-activa' : 'planificador-ruta');
    else if (navKey === 'perfil') setViewMode('perfil');
    else if (navKey === 'puntos') setViewMode('general-map');
  };

  const secondaryActionHandlers: Record<typeof AMBIENTAL_SECONDARY_ACTIONS[number]['key'], () => void> = {
    'perfil': () => setActiveNavKey('perfil'),
    'volver-panel': () => { window.location.href = HUB_URL; },
    'logout': handleLogout,
  };
  const secondaryActions = AMBIENTAL_SECONDARY_ACTIONS.map((a) => ({
    ...a,
    onClick: secondaryActionHandlers[a.key],
  }));

  // ── Render ──
  if (loading && activities.length === 0) return <Loading />;

  return (
    <GestorAmbientalProvider value={gad}>
      <style>{`
        * { scrollbar-width: none; -ms-overflow-style: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
      <AppShell
        title="Gestión Ambiental"
        subtitle={`Puntos de Residuos · ${user?.name ?? ''} ${user?.lastname ?? ''}`}
        navItems={AMBIENTAL_NAV_ITEMS}
        activeNavKey={activeNavKey}
        onSelectNav={setActiveNavKey}
        secondaryActions={secondaryActions}
      >
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
          <>
            {/* ═══ VISTA: Mapa General ═══ */}
            {viewMode === 'general-map' && <GeneralMapView />}

            {/* ═══ VISTA: Planificador de Ruta ═══ */}
            {viewMode === 'planificador-ruta' && <PlanificadorRutaView />}

            {/* ═══ VISTA: Ruta Activa ═══ */}
            {viewMode === 'ruta-activa' && <RutaActivaView />}

            {/* ═══ VISTA: Segmento de Ruta ═══ */}
            {viewMode === 'ruta-segmento' && <RutaSegmentoView />}

            {/* ═══ VISTA: Historial de Rutas ═══ */}
            {viewMode === 'historial-rutas' && <HistorialRutasView />}

            {/* ═══ VISTA: Detalle de Ruta Histórica ═══ */}
            {viewMode === 'historial-ruta-detalle' && <HistorialRutaDetalleView />}

            {/* ═══ VISTA: Perfil del Gestor ═══ */}
            {viewMode === 'perfil' && <PerfilGestorView />}

            {/* ═══ VISTA: Detalle de Actividad ═══ */}
            {viewMode === 'activity-detail' && selectedActivity && (
              <ActivityDetailView
                activity={selectedActivity}
                displayIdx={filteredActivitiesWithIndex.find(a => a.activity.id === selectedActivity.id)?.displayIdx}
                layerVisibility={layerVisibility}
                setLayerVisibility={setLayerVisibility}
                onBack={() => {
                  if (rutaActiva && activeSegmento) {
                    setViewMode('ruta-segmento');
                  } else if (activeNavKey === 'puntos') {
                    setActiveNavKey('puntos');
                    setViewMode('general-map');
                  } else {
                    setViewMode('general-map');
                  }
                }}
                onOpenSeguimiento={() => { setShowSeguimientoModal(true); setSeguimientoAction(null); setSelectedResiduo(null); }}
                onResiduoDetail={setSelectedResidueDetail}
                onEdit={(id) => navigate('/gestor-ambiental/editar-actividad/' + id)}
                onShowActividades={() => { setActiveNavKey('puntos'); setViewMode('general-map'); }}
                actividadesCount={filteredActivities.length}
                onVolverARuta={rutaActiva && activeSegmento ? () => setViewMode('ruta-segmento') : undefined}
                onActivityUpdated={(updated) => { setSelectedActivity(updated); loadActivities(); }}
                setToast={setToast}
              />
            )}

            {activeNavKey === 'puntos' && viewMode !== 'activity-detail' && (
              <BottomSheet state={sheetState} onStateChange={setSheetState} title="Puntos" count={sidebarActivitiesWithIndex.length}>
                <ActivitySidebar
                  sidebarTab={sidebarTab}
                  onTabChange={setSidebarTab}
                  puntoCriticoCount={puntoCriticoActivities.length}
                  ambientalCount={ambientalActivities.length}
                  rechazadasCount={activities.filter(a => a.status === 'RECHAZADA' && a.createdByUserId === user?.id).length}
                  viewMode={viewMode}
                  sidebarActivitiesWithIndex={sidebarActivitiesWithIndex}
                  selectedActivityId={selectedActivity?.id}
                  focusActivityId={focusActivityId}
                  onFocusActivity={focusOnActivity}
                  onVerDetalle={openActivity}
                />
              </BottomSheet>
            )}
          </>

        </div>
      </AppShell>

      {showSeguimientoModal && selectedActivity && (
          <SeguimientoModal
            activity={selectedActivity}
            user={user}
            action={seguimientoAction}
            setAction={setSeguimientoAction}
            selectedResiduo={selectedResiduo}
            setSelectedResiduo={setSelectedResiduo}
            photos={seguimientoPhotos}
            setPhotos={setSeguimientoPhotos}
            fechaRecogida={seguimientoFechaRecogida}
            setFechaRecogida={setSeguimientoFechaRecogida}
            onPreview={setPreviewImage}
            onClose={() => { setShowSeguimientoModal(false); setSeguimientoAction(null); setSelectedResiduo(null); setSeguimientoPhotos([]); }}
            onUpdated={(updated) => { setSelectedActivity(updated); loadActivities(); }}
            setToast={setToast}
          />
        )}

      {/* Residue Detail Modal */}
      {selectedResidueDetail && (
        <ResiduoDetailModal
          residuo={selectedResidueDetail}
          barrio={selectedActivity?.barrio}
          activityDateTime={selectedActivity?.dateTime}
          activityCreatedByNombre={selectedActivity?.createdByNombre}
          onClose={() => setSelectedResidueDetail(null)}
          onPreview={setPreviewImage}
        />
      )}

      {
        toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )
      }
      {
        previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}
            className="animate-in fade-in duration-300"
          >
            <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <PreviewImage photo={previewImage} />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-0 right-0 m-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )
      }
    </GestorAmbientalProvider>
  );
};
