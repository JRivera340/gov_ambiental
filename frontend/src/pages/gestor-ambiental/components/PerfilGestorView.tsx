import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { BarrioCoberturaBars } from './BarrioCoberturaBars';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';

export const PerfilGestorView: React.FC = () => {
  const { user, activities, setViewMode, openActivity } = useGestorAmbientalCtx();

  // Mono-subtipo: toda actividad de este repo ya es punto de acumulación
  // (ver CLAUDE.md) — operativoSubtipo no existe en este backend. Bug real
  // corregido 2026-07-29: las estadísticas del perfil siempre daban cero.
  const acumulacion = activities;

  // "Visitado por mí" = hice seguimiento real en el punto: marqué un residuo
  // recogido o identifiqué uno nuevo (revisadoPorUserId es de la revisión
  // Fase 2, un flujo distinto que casi nunca se usa en Ambiental).
  const visitados = useMemo(
    () => acumulacion.filter(a =>
      getResiduos(a).some(r => r.recogidoByUserId === user?.id || r.createdByUserId === user?.id)
    ),
    [acumulacion, user]
  );

  const stats = useMemo(() => {
    let identificados = 0;
    let recogidos = 0;
    visitados.forEach(a => {
      const residuos = getResiduos(a);
      identificados += residuos.length;
      recogidos += residuos.filter(r => r.recogido).length;
    });
    return { identificados, recogidos };
  }, [visitados]);

  const cobertura = acumulacion.length > 0
    ? Math.round((visitados.length / acumulacion.length) * 100)
    : 0;

  const barriosSinVisitar = useMemo(() => {
    const visitadosIds = new Set(visitados.map(a => a.id));
    const sinVisitar = acumulacion.filter(a => !visitadosIds.has(a.id));
    const counts: Record<string, number> = {};
    sinVisitar.forEach(a => { counts[a.barrio] = (counts[a.barrio] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([barrio, count]) => ({ barrio, count }));
  }, [acumulacion, visitados]);

  const maxBarrioCount = barriosSinVisitar[0]?.count ?? 1;

  // Actividad reciente: último residuo tocado por mí en cada punto (recogido
  // o identificado), no la revisión Fase 2 (flujo eliminado, ya no se usa).
  const timeline = useMemo(() => {
    const eventos = visitados.map(a => {
      const residuosMios = getResiduos(a).filter(r => r.recogidoByUserId === user?.id || r.createdByUserId === user?.id);
      const fechas = residuosMios
        .map(r => r.fechaRecogida || r.dateTime)
        .filter((f): f is string => !!f)
        .sort((x, y) => new Date(y).getTime() - new Date(x).getTime());
      return {
        activity: a,
        fecha: fechas[0],
        recogidos: residuosMios.filter(r => r.recogido).length,
      };
    }).filter((e): e is typeof e & { fecha: string } => !!e.fecha);
    const hace7Dias = Date.now() - 7 * 86400000;
    return eventos
      .filter(e => new Date(e.fecha).getTime() >= hace7Dias)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [visitados, user]);

  // Puntos visitados en los últimos 7 días — subconjunto de `visitados`
  // (histórico completo). Se van agregando a medida que pasa la semana.
  const visitadosSemanaIds = useMemo(
    () => new Set(timeline.map(e => e.activity.id)),
    [timeline]
  );

  const criticos = useMemo(() =>
    acumulacion
      .filter(a => isPuntoEmergencia(a) && a.createdByUserId === user?.id)
      .sort((a, b) => {
        const dA = Math.max(0, ...getResiduos(a).filter(r => !r.recogido).map(r => differenceInDays(new Date(), new Date(r.dateTime))));
        const dB = Math.max(0, ...getResiduos(b).filter(r => !r.recogido).map(r => differenceInDays(new Date(), new Date(r.dateTime))));
        return dB - dA;
      }),
    [acumulacion, user]
  );

  const mapCenter: [number, number] =
    visitados.length > 0 ? [visitados[0].lat, visitados[0].lng] : [4.5981, -74.0758];

  const createColorIcon = (color: string, destacado = false) =>
    L.divIcon({
      className: '',
      html: destacado
        ? `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid #2563eb;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`
        : `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
      iconSize: destacado ? [14, 14] : [12, 12],
      iconAnchor: destacado ? [7, 7] : [6, 6],
    });

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-neutral-100 bg-white shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('general-map')} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-black text-neutral-900">Mi Perfil</h2>
            <p className="text-[11px] text-neutral-400">{user?.name} {user?.lastname}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-neutral-100">
            <p className="text-[10px] text-neutral-500 font-medium mb-1">Puntos visitados esta semana</p>
            <p className="text-xl font-black" style={{ color: '#2563eb' }}>{visitadosSemanaIds.size}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">de {visitados.length} históricos</p>
          </div>
          {[
            { label: 'Residuos recogidos', value: stats.recogidos, color: '#16a34a' },
            { label: 'Residuos identificados', value: stats.identificados, color: '#f97316' },
            { label: '% Cobertura', value: `${cobertura}%`, color: '#7c3aed' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-neutral-100">
              <p className="text-[10px] text-neutral-500 font-medium mb-1">{label}</p>
              <p className="text-xl font-black" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Columna principal — mapa + actividad reciente */}
          <div className="flex flex-col gap-6 w-full md:col-span-2">
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-100">
                <h3 className="text-xs font-black text-neutral-900">Mapa de puntos visitados</h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Histórico completo · resaltados en azul los de esta semana
                </p>
              </div>
              <div className="h-[280px] md:h-[380px]">
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <BoundaryLayer
                    filterByName="Santa Fe"
                    color="#dc2626"
                    fillColor="#dc2626"
                    fillOpacity={0.1}
                    weight={2}
                  />
                  {visitados.map(a => {
                    const color = isPuntoEmergencia(a)
                      ? '#dc2626'
                      : getResiduos(a).every(r => r.recogido) ? '#16a34a' : '#f97316';
                    return (
                      <Marker
                        key={a.id}
                        position={[a.lat, a.lng]}
                        icon={createColorIcon(color, visitadosSemanaIds.has(a.id))}
                      />
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
              <h3 className="text-xs font-black text-neutral-900 mb-3">Actividad reciente (últimos 7 días)</h3>
              {timeline.length === 0 && <p className="text-[11px] text-neutral-400">Sin actividad en los últimos 7 días</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {timeline.map(({ activity: a, fecha, recogidos }) => (
                  <button
                    key={a.id}
                    onClick={() => openActivity(a)}
                    className="flex items-start justify-between gap-3 text-left hover:bg-blue-50/60 rounded-lg p-1 -m-1 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-[10px] font-black text-blue-500 shrink-0 mt-0.5">#{a.pointNumber}</span>
                      <div>
                        <p className="text-[11px] font-bold text-neutral-800">
                          {a.barrio}
                          {recogidos > 0 && (
                            <span className="text-green-600 ml-1">· {recogidos} recogido{recogidos > 1 ? 's' : ''}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {format(new Date(fecha), "d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 shrink-0">Ver →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna lateral — barrios sin visitar + puntos críticos */}
          <div className="flex flex-col gap-6 w-full md:col-span-1 md:sticky md:top-6">
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
              <h3 className="text-xs font-black text-neutral-900 mb-3">Barrios con más puntos sin visitar</h3>
              <BarrioCoberturaBars data={barriosSinVisitar} maxCount={maxBarrioCount} />
            </div>

            {criticos.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
                <h3 className="text-xs font-black text-red-700 mb-3">
                  Puntos críticos a tu cargo ({criticos.length})
                </h3>
                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {criticos.slice(0, 10).map(a => {
                    const maxDias = Math.max(0, ...getResiduos(a).filter(r => !r.recogido).map(r =>
                      differenceInDays(new Date(), new Date(r.dateTime))
                    ));
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-xl border border-red-50 bg-red-50">
                        <div>
                          <p className="text-[11px] font-bold text-neutral-800">#{a.pointNumber} {a.barrio}</p>
                          <p className="text-[10px] text-red-600 font-medium">{maxDias} días vencido</p>
                        </div>
                        <button
                          onClick={() => openActivity(a)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 shrink-0"
                        >
                          Ver →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
