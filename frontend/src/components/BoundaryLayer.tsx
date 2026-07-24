import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { GeoJSON } from 'react-leaflet';
import type { GeoJSON as GeoJSONType } from 'geojson';
// @ts-ignore - @mapbox/togeojson no tiene tipos oficiales
import toGeoJSON from '@mapbox/togeojson';
import JSZip from 'jszip';

import L from 'leaflet';

interface BoundaryLayerProps {
  /** Ruta al archivo KML o KMZ (relativa a /public) */
  kmlPath?: string;
  /** Color del borde del polígono o del pin */
  color?: string;
  /** Color de relleno */
  fillColor?: string;
  /** Opacidad del relleno (0-1) */
  fillOpacity?: number;
  /** Grosor del borde */
  weight?: number;
  /** Filtrar features por nombre (ej: "Santa Fe", "SantaFe") */
  filterByName?: string;
  /** Mostrar/ocultar la capa */
  visible?: boolean;
  /** Si la capa debe responder a eventos del mouse (click, hover). Por defecto false para permitir "clics a través". */
  interactive?: boolean;
}

/**
 * Componente para cargar y mostrar límites geográficos desde archivos KML/KMZ
 */
export const BoundaryLayer: React.FC<BoundaryLayerProps> = ({
  kmlPath = '/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz',
  color = '#DC2626',
  fillColor = '#DC2626',
  fillOpacity = 0.1,
  weight = 2,
  filterByName,
  visible = true,
  interactive = false,
}) => {
  const map = useMap();
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBoundary = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(kmlPath);
        if (!response.ok) {
          throw new Error(`No se pudo cargar el archivo: ${kmlPath}`);
        }

        let kmlText: string;
        if (kmlPath.endsWith('.kmz')) {
          const arrayBuffer = await response.arrayBuffer();
          const zip = await JSZip.loadAsync(arrayBuffer);
          const kmlFile = Object.keys(zip.files).find(name => name.endsWith('.kml'));
          if (!kmlFile) throw new Error('No se encontró archivo KML dentro del KMZ');
          kmlText = await zip.files[kmlFile].async('string');
        } else {
          kmlText = await response.text();
        }

        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        const parseError = kml.querySelector('parsererror');
        if (parseError) throw new Error('Error al parsear el archivo KML');

        let geoJson = toGeoJSON.kml(kml);

        if (filterByName && geoJson.type === 'FeatureCollection') {
          const filterLower = filterByName.toLowerCase();
          const excludeLower = 'candelaria';
          geoJson = {
            ...geoJson,
            features: geoJson.features.filter((feature: any) => {
              const name = feature.properties?.name || feature.properties?.Name || '';
              const description = feature.properties?.description || feature.properties?.Description || '';
              const searchText = (name + ' ' + description).toLowerCase();
              return searchText.includes(filterLower) && !searchText.includes(excludeLower);
            }),
          };
        }

        setGeoJsonData(geoJson);
      } catch (err) {
        console.error('Error cargando límites:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadBoundary();
  }, [kmlPath, filterByName]);

  if (loading || !geoJsonData || !visible) return null;

  return (
    <GeoJSON
      data={geoJsonData}
      pointToLayer={(feature: any, latlng: L.LatLng) => {
        // Usamos CircleMarker para permitir colores personalizados fácilmente
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: fillColor || color,
          color: color,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
          interactive: interactive
        });
      }}
      style={{
        color,
        fillColor,
        fillOpacity,
        weight,
        interactive: interactive as any // Leaflet Path options include interactive
      }}
    />
  );
};

