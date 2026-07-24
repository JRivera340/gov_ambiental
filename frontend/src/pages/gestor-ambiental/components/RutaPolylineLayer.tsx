import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { ParadaRuta } from '../lib/ruta.types';

interface RutaPolylineLayerProps {
  paradas: ParadaRuta[];
  color: string;
  showNumbers: boolean;
  onMarkerClick?: (parada: ParadaRuta) => void;
  modoHistorial?: boolean;
}

export const RutaPolylineLayer: React.FC<RutaPolylineLayerProps> = ({
  paradas,
  color,
  showNumbers,
  onMarkerClick,
  modoHistorial = false,
}) => {
  const positions = paradas.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <>
      <Polyline positions={positions} color={color} weight={3} opacity={0.75} dashArray="8 4" />
      {paradas.map((parada) => {
        const isVisitado = parada.visitado;
        const markerColor = modoHistorial
          ? (isVisitado ? '#16a34a' : '#9ca3af')
          : parada.visitado
            ? '#16a34a'
            : (parada as any).pendienteAnterior
              ? '#d97706'
              : parada.diasVencido >= 4
                ? '#dc2626'
                : '#f97316';

        const label = showNumbers ? parada.numeroSegmento : parada.numeroGlobal;
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${markerColor};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);${isVisitado && !modoHistorial ? 'opacity:0.7;' : ''}">${label}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        return (
          <Marker
            key={parada.puntoId}
            position={[parada.lat, parada.lng]}
            icon={icon}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(parada) } : {}}
          />
        );
      })}
    </>
  );
};
