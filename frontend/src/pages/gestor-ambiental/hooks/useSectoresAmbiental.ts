import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Activity } from '../../../types';
import type { SectorFeature } from '../../../components/RecoleccionSectorLayer';
// @ts-ignore
import toGeoJSON from '@mapbox/togeojson';
import JSZip from 'jszip';
import { parseDescription } from '../lib/kml';
import { isInside } from '../lib/geo';

type SectoresUser = { email?: string } | null;

// Sectores de recolección: carga del KMZ, estado del panel, mapeo actividad→sector
// y helpers de horario de recolección. Autónomo dado (activities, user).
export function useSectoresAmbiental(activities: Activity[], user: SectoresUser) {
  const [showSectorPanel, setShowSectorPanel] = useState(false);
  // Lista de sectores: por defecto solo los señalados; "Ver más" muestra todos.
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [allSectors, setAllSectors] = useState<SectorFeature[]>([]);
  const [activeSectorIds, setActiveSectorIds] = useState<Set<string>>(new Set());
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [selectedSector, setSelectedSector] = useState<SectorFeature | null>(null);

  // Gestor nocturno (cuenta especial para ambiente nocturno)
  const isNocturnalGestor = user?.email === 'ambientenocturno@ambiente.gov.co';

  const getTodayDayNames = () => {
    const dayIndex = new Date().getDay();
    const names = [
      ['DOMINGO'],
      ['LUNES'],
      ['MARTES'],
      ['MIERCOLES', 'MIÉRCOLES'],
      ['JUEVES'],
      ['VIERNES'],
      ['SABADO', 'SÁBADO']
    ];
    return names[dayIndex];
  };

  const collectionDayName = getTodayDayNames()[0];

  const getSectorsCollectedToday = useCallback(() => {
    const todayNames = getTodayDayNames();
    return allSectors.filter(sector => {
      const propsStr = JSON.stringify(sector.properties || {}).toUpperCase();
      return todayNames.some(name => propsStr.includes(name));
    });
  }, [allSectors]);

  // Cargar sectores del KMZ (Proactivamente al inicio para habilitar auto-selección)
  useEffect(() => {
    if (allSectors.length > 0) return;
    const load = async () => {
      setSectorsLoading(true);
      try {
        const res = await fetch('/boundaries/RecoleccionUrbana.kmz');
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const kmlFile = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.kml'));
        if (!kmlFile) return;
        const kmlText = await zip.files[kmlFile].async('string');
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        const geoJson = toGeoJSON.kml(kml);
        if (!geoJson || geoJson.type !== 'FeatureCollection') {
          console.warn('[SectorPanel] El KMZ no contiene una FeatureCollection válida');
          setAllSectors([]);
          return;
        }

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

            // Extracción robusta e insensible a mayúsculas
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

            const properties = {
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
               } catch { /* geometria malformada, cae a 'no-geom' */ }
               return 'no-geom';
            };

            const coordHash = getCoordHash(geometry);
            // ID determinista basado en Macro-Micro-Hash (independiente del índice de bucle)
            const idBase = (macro && micro) ? `${macro}-${micro}` : 'sector';
            const safeId = `${idBase}-${coordHash}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            return {
              id: safeId,
              type: 'Feature' as const,
              geometry: geometry,
              properties: { ...properties, name }, // Guardar nombre final en properties para tooltips
            };
          });

        setAllSectors(loaded);
      } catch (e) {
        console.error('[SectorPanel] Error cargando KMZ:', e);
        setAllSectors([]);
      } finally {
        setSectorsLoading(false);
      }
    };
    load();
  }, []);

  // Mapeo de actividades a sectores (Memoizado para performance)
  const activitySectorMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (allSectors.length === 0 || activities.length === 0) return map;

    activities.forEach((a) => {
      if (!a.lat || !a.lng) return;
      const matchingSectors: string[] = [];
      for (const sector of allSectors) {
        if (isInside(a.lat, a.lng, sector.geometry)) {
          matchingSectors.push(sector.id);
        }
      }
      if (matchingSectors.length > 0) {
        map.set(a.id, matchingSectors);
      }
    });
    return map;
  }, [activities, allSectors]);

  return {
    showSectorPanel, setShowSectorPanel,
    showAllSectors, setShowAllSectors,
    allSectors, setAllSectors,
    activeSectorIds, setActiveSectorIds,
    sectorsLoading, setSectorsLoading,
    selectedSector, setSelectedSector,
    isNocturnalGestor,
    collectionDayName,
    getSectorsCollectedToday,
    activitySectorMap,
  };
}
