import React from 'react';
import { format } from 'date-fns';
import { StatusBadge } from '../../../components/StatusBadge';
import { PUNTO_CRITICO_COLOR, AMBIENTAL_COLOR, type SidebarTab } from '../lib/constants';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';
import { openDirections } from '../lib/geo';

interface ActivitySidebarProps {
  sidebarTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  puntoCriticoCount: number;
  ambientalCount: number;
  rechazadasCount: number;
  viewMode: string;
  sidebarActivitiesWithIndex: Array<{ activity: any; displayIdx: number }>;
  selectedActivityId?: string;
  focusActivityId?: string | null;
  onFocusActivity: (activity: any) => void;
  onVerDetalle: (activity: any) => void;
}

export const ActivitySidebar: React.FC<ActivitySidebarProps> = ({
  sidebarTab,
  onTabChange,
  puntoCriticoCount,
  ambientalCount,
  rechazadasCount,
  viewMode,
  sidebarActivitiesWithIndex,
  selectedActivityId,
  focusActivityId,
  onFocusActivity,
  onVerDetalle,
}) => {
  return (
    <aside className="flex flex-col w-full h-full bg-white">
      <div className="shrink-0 border-b border-neutral-100">
        {/* Sidebar Tabs */}
        <div className="flex">
          <button
            onClick={() => onTabChange('puntos-criticos')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${sidebarTab === 'puntos-criticos'
              ? 'border-green-500 text-green-700'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PUNTO_CRITICO_COLOR }}></span>
              Puntos ({puntoCriticoCount})
            </span>
          </button>
          <button
            onClick={() => onTabChange('ambiental')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${sidebarTab === 'ambiental'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: AMBIENTAL_COLOR }}></span>
              Amb. ({ambientalCount})
            </span>
          </button>
          <button
            onClick={() => onTabChange('rechazadas')}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${sidebarTab === 'rechazadas'
              ? 'border-red-500 text-red-700'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
              }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0 bg-red-600"></span>
              Rechazadas ({rechazadasCount})
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sidebarActivitiesWithIndex.length === 0 ? (
          <div className="text-center py-10 px-6">
            <p className="text-sm text-neutral-400">
              {sidebarTab === 'ambiental' ? 'No hay actividades ambientales registradas.'
               : sidebarTab === 'rechazadas' ? 'No tienes actividades rechazadas.'
               : 'No hay puntos de residuos registrados.'}
            </p>
          </div>
        ) : (
          sidebarActivitiesWithIndex.map(({ activity, displayIdx }) => {
            // Mono-subtipo: toda actividad de este repo ya es punto de
            // acumulación (ver CLAUDE.md) — operativoSubtipo no existe en
            // este backend. Bug real corregido 2026-07-29.
            const isPuntoCritico = true;
            const residuos = isPuntoCritico ? getResiduos(activity) : [];
            const recogidos = residuos.filter(r => r.recogido).length;
            const accentColor = isPuntoCritico ? 'green' : 'blue';
            return (
              <div
                key={activity.id}
                className={`group p-4 md:p-5 rounded-2xl border transition-all cursor-pointer relative shadow-sm hover:shadow-md pr-12 ${(selectedActivityId === activity.id && viewMode === 'activity-detail') || focusActivityId === activity.id
                  ? `bg-${accentColor}-50/50 border-${accentColor}-200 ring-1 ring-${accentColor}-100`
                  : `bg-white border-neutral-100 hover:border-${accentColor}-200`
                  }`}
                onClick={() => onFocusActivity(activity)}
              >
                <div className="flex flex-wrap items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-neutral-500 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded shrink-0">#{displayIdx}</span>
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex-1 min-w-[80px]">
                      {format(new Date(activity.createdAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <StatusBadge status={activity.status} size="sm" />
                </div>
                <h3 className={`text-sm md:text-base font-extrabold transition-colors line-clamp-1 mb-1 ${(selectedActivityId === activity.id && viewMode === 'activity-detail') || focusActivityId === activity.id ? `text-${accentColor}-700` : `text-neutral-800 group-hover:text-${accentColor}-600`
                  }`}>
                  {activity.barrio}
                </h3>
                <div className="flex items-center gap-2 text-[11px] md:text-xs text-neutral-400 font-medium flex-wrap">
                  {isPuntoCritico ? (
                    <>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {residuos.length} residuo{residuos.length !== 1 ? 's' : ''}
                      </span>
                      {recogidos > 0 && (
                        <span className="text-green-600 font-bold">· {recogidos} recogido{recogidos !== 1 ? 's' : ''}</span>
                      )}
                      {isPuntoEmergencia(activity) && (
                        <span className="text-amber-600 font-extrabold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shadow-sm animate-pulse">
                          ⚠️ Vencido
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {activity.results || 'Actividad Ambiental'}
                    </span>
                  )}
                </div>
                {focusActivityId === activity.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onVerDetalle(activity)}
                      className={`flex-1 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPuntoCritico ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      Ver Detalle
                    </button>
                    <button
                      onClick={() => openDirections(activity.lat, activity.lng)}
                      className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      Ir con Maps
                    </button>
                  </div>
                )}
                <div className="absolute top-1/2 -translate-y-1/2 right-3 transition-opacity md:opacity-0 group-hover:opacity-100">
                  <svg className={`w-5 h-5 text-${accentColor}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
