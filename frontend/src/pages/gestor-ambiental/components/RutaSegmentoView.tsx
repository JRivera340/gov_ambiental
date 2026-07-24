import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { RutaPolylineLayer } from './RutaPolylineLayer';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { EdgeDrawer } from '../../../components/shell/EdgeDrawer';
import { buildGoogleMapsUrls } from '../lib/geo';
import { tipoResiduoLabels } from '../lib/constants';
import type { ParadaRuta } from '../lib/ruta.types';

const SEGMENT_COLORS: Record<'A' | 'B' | 'C', string> = {
  A: '#2563eb',
  B: '#16a34a',
  C: '#7c3aed',
};

export const RutaSegmentoView: React.FC = () => {
  const {
    rutaActiva,
    activeSegmento,
    setViewMode,
    openActivity,
    activities,
  } = useGestorAmbientalCtx();

  const [paradaSeleccionada, setParadaSeleccionada] = useState<ParadaRuta | null>(null);

  const segmento = rutaActiva?.segmentos.find(s => s.id === activeSegmento);
  if (!segmento || !rutaActiva) return null;

  const color = SEGMENT_COLORS[segmento.id];
  const visitados = segmento.paradas.filter(p => p.visitado).length;
  const porcentaje = segmento.paradas.length > 0
    ? Math.round((visitados / segmento.paradas.length) * 100)
    : 0;

  const gmapsUrls = buildGoogleMapsUrls(segmento.paradas);

  const center: [number, number] =
    segmento.paradas.length > 0
      ? [segmento.paradas[0].lat, segmento.paradas[0].lng]
      : [4.5981, -74.0758];

  const handleVerDetalle = (activityId: string) => {
    const act = activities.find(a => a.id === activityId);
    if (act) openActivity(act);
    setParadaSeleccionada(null);
  };

  const sidebarContent = (
    <>
        <div className="p-4 border-b border-neutral-100">
          <button
            onClick={() => setViewMode('ruta-activa')}
            className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 hover:text-neutral-700 mb-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver a la ruta
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <h2 className="text-sm font-black text-neutral-900">{segmento.label}</h2>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${porcentaje}%`, background: color }} />
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">{visitados}/{segmento.paradas.length} puntos visitados</p>
        </div>

        <div className="p-4 border-b border-neutral-100">
          {gmapsUrls.length > 0 ? (
            <div className="flex flex-col gap-2">
              {gmapsUrls.map((url, idx) => {
                const total = segmento.paradas.filter(p => !p.visitado).length;
                const from = idx * 10 + 1;
                const to = Math.min((idx + 1) * 10, total);
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Google Maps {gmapsUrls.length > 1 ? `— paradas ${from}–${to}` : `(${total} puntos)`}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="py-2 text-center text-xs font-bold text-green-600">
              ✓ Todos los puntos de este segmento visitados
            </p>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-1">Paradas</p>
          {segmento.paradas.map(parada => (
            <div
              key={parada.activityId}
              className={`p-3 rounded-xl border transition-all ${
                parada.visitado
                  ? 'border-green-100 bg-green-50 opacity-60'
                  : parada.diasVencido >= 4
                    ? 'border-red-100 bg-red-50'
                    : 'border-neutral-100 bg-white hover:border-neutral-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                      style={{ background: parada.visitado ? '#16a34a' : color }}
                    >
                      {parada.numeroSegmento}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-800 truncate">{parada.barrio}</span>
                    {parada.visitado && <span className="text-[10px] text-green-600 font-bold">✓</span>}
                  </div>
                  {parada.tiposResiduo.length > 0 && (
                    <p className="text-[10px] text-neutral-500 ml-6">
                      {parada.tiposResiduo.map(t => tipoResiduoLabels[t] ?? t).join(', ')}
                    </p>
                  )}
                  {parada.diasVencido >= 4 && !parada.visitado && (
                    <p className="text-[10px] text-red-600 font-medium ml-6">{parada.diasVencido}d vencido</p>
                  )}
                  {parada.visitado && parada.fechaVisita && (
                    <p className="text-[10px] text-green-600 ml-6">
                      {format(new Date(parada.fechaVisita), 'HH:mm', { locale: es })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {parada.visitado && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                      ✓ Visitado
                    </span>
                  )}
                  <button
                    onClick={() => handleVerDetalle(parada.activityId)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:w-80 shrink-0 flex-col bg-white border-r border-neutral-100 overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Aleta desplegable en móvil, desde la izquierda — abierta por defecto al entrar al segmento */}
      <EdgeDrawer label="Paradas" side="left" defaultOpen>{sidebarContent}</EdgeDrawer>

      <div className="flex-1">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundaryLayer
            filterByName="Santa Fe"
            color="#dc2626"
            fillColor="#dc2626"
            fillOpacity={0.1}
            weight={2}
          />
          <RutaPolylineLayer
            paradas={segmento.paradas}
            color={color}
            showNumbers={true}
            onMarkerClick={(p) => { setParadaSeleccionada(p); }}
          />
        </MapContainer>
      </div>

      {paradaSeleccionada && (
        <div className="absolute bottom-6 right-6 z-[400] bg-white rounded-2xl shadow-xl border border-neutral-100 p-4 w-64 max-w-[calc(100vw-2rem)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-neutral-900">
                  #{paradaSeleccionada.numeroSegmento} — {paradaSeleccionada.barrio}
                </p>
                {paradaSeleccionada.visitado && <span className="text-[10px] text-green-600 font-bold">✓</span>}
              </div>
              {paradaSeleccionada.visitado && paradaSeleccionada.fechaVisita && (
                <p className="text-[10px] text-green-600">
                  Visitado {format(new Date(paradaSeleccionada.fechaVisita), 'HH:mm', { locale: es })}
                </p>
              )}
              {!paradaSeleccionada.visitado && paradaSeleccionada.diasVencido >= 4 && (
                <p className="text-[11px] text-red-600 font-medium">{paradaSeleccionada.diasVencido} días vencido</p>
              )}
              {paradaSeleccionada.tiposResiduo.length > 0 && (
                <p className="text-[10px] text-neutral-500">
                  {paradaSeleccionada.tiposResiduo.map(t => tipoResiduoLabels[t] ?? t).join(', ')}
                </p>
              )}
            </div>
            <button onClick={() => setParadaSeleccionada(null)} className="text-neutral-400 hover:text-neutral-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {paradaSeleccionada.visitado && (
            <span className="inline-block mb-2 text-[10px] font-bold px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
              ✓ Visitado
            </span>
          )}
          <button
            onClick={() => handleVerDetalle(paradaSeleccionada.activityId)}
            className="w-full py-2 rounded-xl text-[11px] font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
          >
            Ver detalle
          </button>
        </div>
      )}
    </div>
  );
};
