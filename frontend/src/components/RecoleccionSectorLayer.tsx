import React, { useEffect, useState, useCallback } from 'react';
import { GeoJSON, Tooltip, useMap } from 'react-leaflet';
import type { GeoJSON as GeoJSONType } from 'geojson';
import type { Layer } from 'leaflet';
// @ts-ignore
import toGeoJSON from '@mapbox/togeojson';
import JSZip from 'jszip';

const KMZ_PATH = '/boundaries/RecoleccionUrbana.kmz';

export interface SectorFeature {
  id: string;
  type: 'Feature';
  geometry: any; // Permitimos cualquier tipo, filtraremos luego
  properties: Record<string, any>;
}

interface Props {
  visible?: boolean;
  onSectorClick?: (sector: SectorFeature) => void;
  selectedSectorId?: string | null;
  /** Solo renderizar los sectores cuyo ID esté en este set */
  activeSectorIds?: Set<string>;
  /** Mapa de sectorId -> cantidad de pendientes para colorear */
  sectorStats?: Record<string, { totalPendientes: number; totalRecogidos: number }>;
}

/**
 * Función auxiliar robusta para parsear la tabla HTML en la descripción de un sector en el KMZ
 */
const parseDescription = (html: string): Record<string, string> => {
  const data: Record<string, string> = {};
  if (!html) return data;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim() || '';
        const val = cells[1].textContent?.trim() || '';
        if (key) data[key] = val;
      }
    });
  } catch (e) {
    console.warn('[KMZ Parser] Error parseando HTML con DOMParser, usando fallback regex:', e);
    const regex = /<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gi;
    let match;
    const cleanHtml = html.replace(/\s+/g, ' ');
    while ((match = regex.exec(cleanHtml)) !== null) {
      const k = match[1].replace(/<[^>]*>/g, '').trim();
      const v = match[2].replace(/<[^>]*>/g, '').trim();
      if (k) data[k] = v;
    }
  }
  return data;
};

/**
 * Componente que carga y renderiza el KMZ de sectores de recolección de Promoambiental.
 * Los polígonos son interactivos: hover para ver nombre, click para abrir panel de sector.
 */
export const RecoleccionSectorLayer: React.FC<Props> = ({
  visible = true,
  onSectorClick,
  selectedSectorId,
  activeSectorIds,
  sectorStats = {},
}) => {
  const map = useMap();
  const [sectors, setSectors] = useState<SectorFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(KMZ_PATH);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const kmlFileName = Object.keys(zip.files).find((f) =>
          f.toLowerCase().endsWith('.kml'),
        );
        if (!kmlFileName) return;
        const kmlText = await zip.files[kmlFileName].async('string');
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        const geoJson = toGeoJSON.kml(kml);
        if (!geoJson || geoJson.type !== 'FeatureCollection') {
          console.warn('[RecoleccionSectorLayer] El KMZ no contiene una FeatureCollection válida');
          setSectors([]);
          return;
        }

        console.log(`[RecoleccionSectorLayer] ${geoJson.features.length} features encontrados en el KMZ`);

        const loaded = geoJson.features
          .filter((f: any) => {
            if (!f.geometry) return false;
            const type = f.geometry.type;
            if (type === 'Polygon' || type === 'MultiPolygon') return true;
            if (type === 'GeometryCollection') {
              return (f.geometry.geometries || []).some((g: any) => g.type === 'Polygon' || g.type === 'MultiPolygon');
            }
            return false;
          })
          .map((f: any, i: number) => {
            // Normalizar geometría si es GeometryCollection
            let geometry = f.geometry;
            if (geometry.type === 'GeometryCollection') {
               const polygons = (geometry.geometries || []).filter((g: any) => g.type === 'Polygon' || g.type === 'MultiPolygon');
               if (polygons.length === 1) {
                 geometry = polygons[0];
               } else if (polygons.length > 1) {
                 const allCoords: any[] = [];
                 polygons.forEach((p: any) => {
                   if (p.type === 'Polygon') allCoords.push(p.coordinates);
                   else allCoords.push(...p.coordinates);
                 });
                 geometry = { type: 'MultiPolygon', coordinates: allCoords };
               }
            }

            const description = f.properties?.description || '';
            const extractedData = parseDescription(description);

            // Buscar campos específicos (flexibles con nombres del KMZ)
            const getVal = (possibleKeys: string[]) => {
              for (const pk of possibleKeys) {
                const foundKey = Object.keys(extractedData).find(ek => ek.toLowerCase() === pk.toLowerCase());
                if (foundKey) return extractedData[foundKey];
              }
              return '';
            };

            const macro = getVal(['Macro', 'Macro ruta', 'MACRO_RUTA', 'MacroRuta', 'Macro_Ruta']);
            const micro = getVal(['Micro', 'Micro ruta', 'MICRO_RUTA', 'MicroRuta', 'Micro_Ruta']);
            const turno = getVal(['Turno', 'TURNO', 'turno']);
            const barrio = getVal(['Barrio', 'BARRIO', 'barrio']);
            const localidad = getVal(['Localidad', 'LOCALIDAD', 'localidad']);

            // Función para hash rápido de geometría (primer punto) para estabilidad de IDs
            const getCoordHash = (geom: any): string => {
               try {
                 let coords: any = [];
                 if (geom.type === 'Polygon') coords = geom.coordinates[0];
                 else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
                 if (coords && coords.length > 0) {
                   const p = coords[0];
                   return `${Number(p[0]).toFixed(6)}_${Number(p[1]).toFixed(6)}`;
                 }
               } catch(e) {}
               return 'no-geom';
            };

            const coordHash = getCoordHash(geometry);
            // ID determinista basado en Macro-Micro-Hash (independiente del índice de bucle)
            const idBase = (macro && micro) ? `${macro}-${micro}` : 'sector';
            const safeId = `${idBase}-${coordHash}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            const props = { 
               ...(f.properties || {}), 
               ...extractedData,
               macro_ruta: macro,
               micro_ruta: micro,
               turno: turno,
               barrio: barrio,
               localidad: localidad
            };

            // Construir nombre legible
            let name = '';
            if (micro && macro) {
              name = `Micro ${micro} (Macro ${macro})`;
            } else if (micro || macro) {
              name = micro || macro;
            } else {
              name = f.properties?.name || f.properties?.Name || f.properties?.Nombre || `Sector ${i + 1}`;
            }
            if (barrio) name += ` - ${barrio}`;
            if (turno) name += ` [${turno.toUpperCase()}]`;

            return {
              id: safeId,
              type: 'Feature' as const,
              geometry: geometry,
              properties: { ...props, name },
            };
          });

        console.log(`[RecoleccionSectorLayer] ${loaded.length} sectores válidos procesados`);
        setSectors(loaded);
      } catch (e) {
        console.error('[RecoleccionSectorLayer] Error cargando KMZ:', e);
        setSectors([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getColor = useCallback(
    (sectorId: string) => {
      if (sectorId === selectedSectorId) return '#6366f1'; // indigo = seleccionado
      const stats = sectorStats[sectorId];
      if (!stats) return '#059669'; // verde esmeralda por defecto (sector sin estadísticas)
      if (stats.totalPendientes === 0 && stats.totalRecogidos > 0)
        return '#22c55e'; // verde brillante = todo recogido
      if (stats.totalPendientes > 0) return '#f59e0b'; // amarillo = hay pendientes
      return '#059669'; // esmeralda = sin residuos ordinarios
    },
    [selectedSectorId, sectorStats],
  );

  if (!visible || loading || sectors.length === 0) return null;

  // Filtrar solo sectores activos (si se proporcionó el set)
  const visibleSectors = activeSectorIds && activeSectorIds.size > 0
    ? sectors.filter(s => activeSectorIds.has(s.id))
    : sectors;

  return (
    <>
      {visibleSectors.map((sector) => {
        const isSelected = sector.id === selectedSectorId;
        const color = getColor(sector.id);
        // Obtener nombre del sector para el tooltip
        const sectorName =
          sector.properties?.name ||
          sector.properties?.Name ||
          sector.properties?.Nombre ||
          sector.id;
        // Extra: macro_ruta y turno para contexto
        const macroRuta =
          sector.properties?.MACRO_RUTA ||
          sector.properties?.MacroRuta ||
          sector.properties?.macro_ruta;
        const turno =
          sector.properties?.TURNO ||
          sector.properties?.Turno ||
          sector.properties?.turno;

        return (
          <GeoJSON
            key={sector.id}
            data={sector as unknown as GeoJSONType}
            style={() => ({
              color,
              fillColor: color,
              fillOpacity: isSelected ? 0.35 : 0.18,
              weight: isSelected ? 3 : 1.5,
              dashArray: isSelected ? '' : '5 3',
              opacity: isSelected ? 1 : 0.85,
            })}
            eventHandlers={{
              click: (e) => {
                // Evitar que el click se propague al mapa y cierre el panel
                e.originalEvent?.stopPropagation?.();
                onSectorClick?.(sector);
              },
              mouseover: (e) => {
                // Resaltar el sector al pasar el mouse
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: isSelected ? 0.45 : 0.3,
                  weight: isSelected ? 4 : 2.5,
                });
              },
              mouseout: (e) => {
                // Restaurar estilo al salir el mouse
                const layer = e.target;
                layer.setStyle({
                  fillOpacity: isSelected ? 0.35 : 0.18,
                  weight: isSelected ? 3 : 1.5,
                });
              },
            }}
          >
            <Tooltip sticky>
              <div style={{ fontFamily: 'inherit', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                  {sectorName}
                </div>
                {macroRuta && (
                  <div style={{ color: '#64748b', fontSize: 11 }}>
                    Macro ruta: <strong>{macroRuta}</strong>
                  </div>
                )}
                {turno && (
                  <div style={{ color: '#64748b', fontSize: 11 }}>
                    Turno: <strong>{turno}</strong>
                  </div>
                )}
                <div style={{ color: '#059669', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                  Click para ver detalle del sector
                </div>
              </div>
            </Tooltip>
          </GeoJSON>
        );
      })}
    </>
  );
};

export type { Props as RecoleccionSectorLayerProps };
