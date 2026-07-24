import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { RutaPolylineLayer } from './RutaPolylineLayer';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { tipoResiduoLabels } from '../lib/constants';
import type { SegmentoRuta } from '../lib/ruta.types';

const SEGMENT_COLORS: Record<'A' | 'B' | 'C', string> = {
  A: '#2563eb', B: '#16a34a', C: '#7c3aed',
};

export const HistorialRutaDetalleView: React.FC = () => {
  const { historialRutaSeleccionada, setViewMode } = useGestorAmbientalCtx();
  const [selectedSeg, setSelectedSeg] = useState<SegmentoRuta | null>(null);

  if (!historialRutaSeleccionada) return null;

  const ruta = historialRutaSeleccionada;
  const isCancelada = ruta.estado === 'cancelada';
  const allParadas = ruta.segmentos.flatMap(s => s.paradas);
  const visitados = allParadas.filter(p => p.visitado).length;
  const displayParadas = selectedSeg ? selectedSeg.paradas : allParadas;
  const center: [number, number] =
    displayParadas.length > 0
      ? [displayParadas[0].lat, displayParadas[0].lng]
      : [4.5981, -74.0758];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 shrink-0 flex flex-col bg-white border-r border-neutral-100 overflow-y-auto">
        <div className="p-4 border-b border-neutral-100">
          {selectedSeg ? (
            <button
              onClick={() => setSelectedSeg(null)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700 mb-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Volver a la ruta
            </button>
          ) : (
            <button
              onClick={() => setViewMode('historial-rutas')}
              className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700 mb-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Historial
            </button>
          )}
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-sm font-black text-neutral-900">
              {selectedSeg
                ? selectedSeg.label
                : format(new Date(ruta.fechaCreacion), "d 'de' MMMM yyyy", { locale: es })}
            </h2>
            {isCancelada && !selectedSeg && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Cancelada</span>
            )}
          </div>
          {selectedSeg ? (
            <p className="text-[11px] text-neutral-500">
              {selectedSeg.paradas.filter(p => p.visitado).length}/{selectedSeg.paradas.length} visitados
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500">{visitados}/{ruta.totalPuntos} puntos visitados</p>
          )}
        </div>

        {selectedSeg ? (
          <div className="p-4 flex flex-col gap-2">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1">Paradas</p>
            {selectedSeg.paradas.map(p => (
              <div
                key={p.activityId}
                className={`p-3 rounded-xl border transition-all ${
                  p.visitado ? 'border-green-100 bg-green-50' : 'border-neutral-100 bg-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white mt-0.5"
                    style={{ background: p.visitado ? '#16a34a' : '#9ca3af' }}
                  >
                    {p.numeroSegmento}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-neutral-800 truncate">{p.barrio}</p>
                    {p.tiposResiduo.length > 0 && (
                      <p className="text-[10px] text-neutral-500">
                        {p.tiposResiduo.map(t => tipoResiduoLabels[t] ?? t).join(', ')}
                      </p>
                    )}
                    {p.visitado && p.fechaVisita && (
                      <p className="text-[10px] text-green-600 font-medium">
                        Visitado {format(new Date(p.fechaVisita), 'HH:mm', { locale: es })}
                      </p>
                    )}
                    {!p.visitado && (
                      <p className="text-[10px] text-neutral-400">No visitado</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {ruta.segmentos.map(seg => {
              const segVisitados = seg.paradas.filter(p => p.visitado).length;
              const pct = seg.paradas.length > 0 ? Math.round((segVisitados / seg.paradas.length) * 100) : 0;
              return (
                <div key={seg.id} className="border border-neutral-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEGMENT_COLORS[seg.id] }} />
                    <span className="text-xs font-bold text-neutral-800 flex-1">{seg.label}</span>
                    <span className={`text-[10px] font-bold ${seg.estado === 'completado' ? 'text-green-600' : 'text-neutral-400'}`}>
                      {segVisitados}/{seg.paradas.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SEGMENT_COLORS[seg.id] }} />
                  </div>
                  <button
                    onClick={() => setSelectedSeg(seg)}
                    className="w-full py-1.5 rounded-lg text-[10px] font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
                  >
                    Ver paradas →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundaryLayer
            filterByName="Santa Fe"
            color="#2563eb"
            fillColor="#2563eb"
            fillOpacity={0.04}
            weight={2}
          />
          {selectedSeg ? (
            <RutaPolylineLayer
              paradas={selectedSeg.paradas}
              color={SEGMENT_COLORS[selectedSeg.id]}
              showNumbers={true}
              modoHistorial={true}
            />
          ) : (
            ruta.segmentos.map(seg => (
              <RutaPolylineLayer
                key={seg.id}
                paradas={seg.paradas}
                color={SEGMENT_COLORS[seg.id]}
                showNumbers={false}
                modoHistorial={true}
              />
            ))
          )}
        </MapContainer>
      </div>
    </div>
  );
};
