import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { RutaPolylineLayer } from './RutaPolylineLayer';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { EdgeDrawer } from '../../../components/shell/EdgeDrawer';
import type { SegmentoRuta } from '../lib/ruta.types';

const SEGMENT_COLORS: Record<'A' | 'B', string> = {
  A: '#2563eb',
  B: '#16a34a',
};

const ESTADO_BADGE: Record<SegmentoRuta['estado'], string> = {
  pendiente: 'bg-neutral-100 text-neutral-500',
  en_progreso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
};

const ESTADO_LABEL: Record<SegmentoRuta['estado'], string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado ✓',
};

export const RutaActivaView: React.FC = () => {
  const { rutaActiva, entrarSegmento, finalizarRuta, cancelarRuta, setViewMode } = useGestorAmbientalCtx();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);

  if (!rutaActiva) return null;

  const allParadas = rutaActiva.segmentos.flatMap(s => s.paradas);
  const totalVisitados = allParadas.filter(p => p.visitado).length;
  const porcentaje = rutaActiva.totalPuntos > 0
    ? Math.round((totalVisitados / rutaActiva.totalPuntos) * 100)
    : 0;
  const todosCompletados = rutaActiva.segmentos.every(s => s.estado === 'completado');
  const center: [number, number] =
    allParadas.length > 0 ? [allParadas[0].lat, allParadas[0].lng] : [4.5981, -74.0758];

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-neutral-100">
        <button
          onClick={() => setViewMode('planificador-ruta')}
          className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700 mb-2 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver a Planificar Ruta
        </button>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black text-neutral-900">Ruta en Progreso</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCancelar(true)}
              className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 border border-neutral-200 hover:border-neutral-300 px-2 py-1 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-all"
            >
              Finalizar
            </button>
          </div>
        </div>
        <p className="text-[11px] text-neutral-500">
          {format(new Date(rutaActiva.fechaCreacion), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
        </p>
      </div>

      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-neutral-600">Progreso general</span>
          <span className="text-[11px] font-bold text-blue-600">{totalVisitados}/{rutaActiva.totalPuntos}</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
        <p className="text-[10px] text-neutral-400 mt-1">{porcentaje}% completado</p>
        {todosCompletados && (
          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-[11px] font-bold text-green-700">✓ Todos los puntos visitados</p>
            <button
              onClick={() => setShowConfirm(true)}
              className="mt-1 w-full text-[11px] font-bold bg-green-600 text-white py-1.5 rounded-lg hover:bg-green-700 transition-all"
            >
              Finalizar y guardar
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {rutaActiva.segmentos.map(seg => {
          const visitados = seg.paradas.filter(p => p.visitado).length;
          const pct = seg.paradas.length > 0 ? Math.round((visitados / seg.paradas.length) * 100) : 0;
          return (
            <div key={seg.id} className="border border-neutral-100 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: SEGMENT_COLORS[seg.id] }} />
                  <span className="text-xs font-bold text-neutral-800">{seg.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_BADGE[seg.estado]}`}>
                  {ESTADO_LABEL[seg.estado]}
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: SEGMENT_COLORS[seg.id] }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">{visitados}/{seg.paradas.length} puntos</span>
                <button
                  onClick={() => entrarSegmento(seg.id)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Entrar →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:w-80 shrink-0 flex-col bg-white border-r border-neutral-100 overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Aleta desplegable en móvil — abierta por defecto al entrar (recién calculada la ruta) */}
      <EdgeDrawer label="Ver progreso" defaultOpen>{sidebarContent}</EdgeDrawer>

      <div className="flex-1 relative">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundaryLayer
            filterByName="Santa Fe"
            color="#dc2626"
            fillColor="#dc2626"
            fillOpacity={0.1}
            weight={2}
          />
          {rutaActiva.segmentos.map(seg => (
            <RutaPolylineLayer
              key={seg.id}
              paradas={seg.paradas}
              color={SEGMENT_COLORS[seg.id]}
              showNumbers={false}
            />
          ))}
        </MapContainer>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[92vw] max-w-sm mx-4">
            <h3 className="text-sm font-black text-neutral-900 mb-2">Finalizar ruta</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Esto terminará la ruta y la guardará en tu historial con los {totalVisitados} puntos marcados como visitados.
              Los {rutaActiva.totalPuntos - totalVisitados} puntos no visitados no se registrarán. ¿Continuar?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={() => { setShowConfirm(false); finalizarRuta(); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Finalizar y guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelar && (
        <div className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[92vw] max-w-sm mx-4">
            <h3 className="text-sm font-black text-neutral-900 mb-2">Cancelar ruta</h3>
            {totalVisitados > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                <span className="text-amber-500 text-base shrink-0">⚠</span>
                <p className="text-[11px] text-amber-700 font-medium">
                  Ya visitaste {totalVisitados} punto{totalVisitados !== 1 ? 's' : ''}. La ruta se guardará en el historial como cancelada.
                </p>
              </div>
            )}
            <p className="text-xs text-neutral-600 mb-4">
              {totalVisitados === 0
                ? 'La ruta se cancelará sin guardar progreso. ¿Confirmar?'
                : 'Los puntos visitados quedarán registrados. ¿Confirmar cancelación?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelar(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
              >
                Volver
              </button>
              <button
                onClick={() => { setShowCancelar(false); cancelarRuta(); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-neutral-700 text-white hover:bg-neutral-800 transition-all"
              >
                Cancelar ruta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
