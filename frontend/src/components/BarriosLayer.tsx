import React, { useEffect, useState } from 'react';
import { GeoJSON, Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { GeoJSON as GeoJSONType } from 'geojson';
// @ts-ignore - @mapbox/togeojson no tiene tipos oficiales
import toGeoJSON from '@mapbox/togeojson';

interface BarriosLayerProps {
  /** Color del borde del polígono */
  color?: string;
  /** Color de relleno */
  fillColor?: string;
  /** Opacidad del relleno (0-1) */
  fillOpacity?: number;
  /** Grosor del borde */
  weight?: number;
  /** Mostrar/ocultar la capa */
  visible?: boolean;
}

/**
 * Componente para cargar y mostrar límites de barrios desde el archivo KML
 * 
 * Carga el archivo: packages/frontend/public/boundaries/doc.kml
 * 
 * Ejemplo de uso:
 * <BarriosLayer color="#3b82f6" fillColor="#3b82f6" fillOpacity={0.1} weight={1} />
 */
export const BarriosLayer: React.FC<BarriosLayerProps> = ({
  color = '#3b82f6',
  fillColor = '#3b82f6',
  fillOpacity = 0.1,
  weight = 1,
  visible = true,
}) => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barrioLabels, setBarrioLabels] = useState<Array<{ name: string; lat: number; lng: number }>>([]);

  useEffect(() => {
    const loadBarrios = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar el archivo KML de barrios
        const response = await fetch('/boundaries/doc.kml');
        if (!response.ok) {
          throw new Error('No se pudo cargar el archivo de barrios');
        }

        const kmlText = await response.text();

        // Parsear KML a GeoJSON
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        
        // Verificar errores de parsing
        const parseError = kml.querySelector('parsererror');
        if (parseError) {
          throw new Error('Error al parsear el archivo KML de barrios');
        }

        const geoJson = toGeoJSON.kml(kml);

        // Calcular centroides y nombres de barrios para las etiquetas
        const labels: Array<{ name: string; lat: number; lng: number }> = [];
        
        if (geoJson.type === 'FeatureCollection') {
          geoJson.features.forEach((feature: any) => {
            const barrioName = feature.properties?.name || feature.properties?.Name || '';
            if (!barrioName) return;

            let centroid: [number, number] | null = null;

            // Calcular el centroide del polígono
            if (feature.geometry.type === 'Polygon') {
              const coordinates = feature.geometry.coordinates[0];
              let sumLat = 0;
              let sumLng = 0;
              let count = 0;
              
              coordinates.forEach((coord: number[]) => {
                if (coord.length >= 2) {
                  sumLng += coord[0]; // GeoJSON usa [lng, lat]
                  sumLat += coord[1];
                  count++;
                }
              });
              
              if (count > 0) {
                centroid = [sumLat / count, sumLng / count];
              }
            } else if (feature.geometry.type === 'MultiPolygon') {
              // Para MultiPolygon, calcular el centroide del primer polígono
              const firstPolygon = feature.geometry.coordinates[0];
              if (firstPolygon && firstPolygon[0]) {
                const coordinates = firstPolygon[0];
                let sumLat = 0;
                let sumLng = 0;
                let count = 0;
                
                coordinates.forEach((coord: number[]) => {
                  if (coord.length >= 2) {
                    sumLng += coord[0];
                    sumLat += coord[1];
                    count++;
                  }
                });
                
                if (count > 0) {
                  centroid = [sumLat / count, sumLng / count];
                }
              }
            }

            if (centroid) {
              labels.push({
                name: barrioName,
                lat: centroid[0],
                lng: centroid[1],
              });
            }
          });
        }

        setGeoJsonData(geoJson);
        setBarrioLabels(labels);
      } catch (err) {
        console.error('Error cargando límites de barrios:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadBarrios();
  }, []);

  if (loading || !geoJsonData) {
    return null;
  }

  if (error) {
    console.warn('Error cargando límites de barrios:', error);
    return null;
  }

  if (!visible) {
    return null;
  }

  return (
    <>
      <GeoJSON
        data={geoJsonData}
        style={{
          color,
          fillColor,
          fillOpacity,
          weight,
        }}
        onEachFeature={(feature, layer) => {
          // Agregar tooltip con el nombre del barrio al pasar el mouse
          const barrioName = feature.properties?.name || feature.properties?.Name || 'Barrio';
          layer.bindTooltip(barrioName, {
            permanent: false,
            direction: 'center',
            className: 'barrio-tooltip',
          });
        }}
      />
      {/* Etiquetas de texto con nombres de barrios */}
      {barrioLabels.map((label, index) => {
        const icon = new DivIcon({
          html: `<div style="
            color: #000000;
            font-weight: 600;
            font-size: 12px;
            text-align: center;
            text-shadow: 
              -1px -1px 0 #ffffff,
              1px -1px 0 #ffffff,
              -1px 1px 0 #ffffff,
              1px 1px 0 #ffffff,
              0 0 2px #ffffff;
            pointer-events: none;
            white-space: nowrap;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">${label.name}</div>`,
          className: 'barrio-label',
          iconSize: [100, 20],
          iconAnchor: [50, 10],
        });

        return (
          <Marker
            key={`barrio-label-${index}`}
            position={[label.lat, label.lng]}
            icon={icon}
            interactive={false}
          />
        );
      })}
    </>
  );
};
