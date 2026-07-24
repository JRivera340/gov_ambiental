import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Invalida el tamaño del mapa tras montar para evitar tiles grises.
export const InvalidateMap = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Centra el mapa sobre un punto (animado). `nonce` permite re-centrar el mismo
// punto al hacer click otra vez.
export const MapFocus: React.FC<{ point: [number, number] | null; nonce?: number }> = ({ point, nonce }) => {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.flyTo(point, Math.max(map.getZoom(), 16), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.[0], point?.[1], nonce]);
  return null;
};
