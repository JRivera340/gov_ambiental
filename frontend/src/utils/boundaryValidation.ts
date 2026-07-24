import type { GeoJSON } from 'geojson';

/**
 * Verifica si un punto está dentro de un polígono usando el algoritmo ray casting
 */
function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Función recursiva para verificar si un punto está en una geometría (Polygon o MultiPolygon)
 */
function isPointInPolygonRecursive(point: [number, number], coordinates: any[], type: string): boolean {
  if (type === 'Polygon') {
    // coordinates[0] es el anillo exterior
    return pointInPolygon(point, coordinates[0]);
  }
  if (type === 'MultiPolygon') {
    return coordinates.some((polygonCoords: any) => pointInPolygon(point, polygonCoords[0]));
  }
  return false;
}

/**
 * Verifica si un punto está dentro de cualquier polígono de un GeoJSON
 */
export function isPointInBoundaries(
  lat: number,
  lng: number,
  geoJson: GeoJSON
): boolean {
  if (!geoJson || geoJson.type !== 'FeatureCollection') {
    return false;
  }

  const point: [number, number] = [lng, lat]; // GeoJSON usa [lng, lat]

  for (const feature of geoJson.features) {
    if (!feature.geometry) continue;

    if (feature.geometry.type === 'GeometryCollection') {
      const geometries = (feature.geometry as any).geometries;
      for (const geom of geometries) {
        if (!geom || !geom.coordinates) continue;
        if (isPointInPolygonRecursive(point, geom.coordinates, geom.type)) {
          return true;
        }
      }
    } else {
      const geom = feature.geometry as any;
      if (isPointInPolygonRecursive(point, geom.coordinates, geom.type)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Carga los límites de Candelaria desde los archivos KMZ
 */
export async function loadCandelariaBoundaries(): Promise<GeoJSON | null> {
  try {
    const response = await fetch(`/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('No se pudo cargar los límites');
    }

    const arrayBuffer = await response.arrayBuffer();
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);

    const kmlFile = Object.keys(zip.files).find(name => name.endsWith('.kml'));
    if (!kmlFile) {
      throw new Error('No se encontró archivo KML dentro del KMZ');
    }

    const kmlText = await zip.files[kmlFile].async('string');
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');

    const parseError = kml.querySelector('parsererror');
    if (parseError) {
      throw new Error('Error al parsear el archivo KML');
    }

    // @ts-ignore
    const toGeoJSON = (await import('@mapbox/togeojson')).default;
    let geoJson = toGeoJSON.kml(kml);

    if (geoJson.type === 'FeatureCollection') {
      geoJson = {
        ...geoJson,
        features: geoJson.features.filter((feature: any) => {
          const props = feature.properties || {};
          const description = (props.description || props.Description || '').toLowerCase();

          return description.includes('la candelaria') || description.includes('<td>17</td>');
        }),
      };
    }

    return geoJson;
  } catch (error) {
    console.error('Error cargando límites de Candelaria:', error);
    return null;
  }
}

/**
 * Verifica si un punto está dentro de Candelaria
 */
export async function isPointInCandelaria(lat: number, lng: number): Promise<boolean> {
  try {
    const boundaries = await loadCandelariaBoundaries();
    if (!boundaries) return false;
    return isPointInBoundaries(lat, lng, boundaries);
  } catch (error) {
    console.error('Error verificando Candelaria:', error);
    return false;
  }
}

/**
 * Carga los límites de Santa Fe desde los archivos KMZ
 */
export async function loadSantaFeBoundaries(): Promise<GeoJSON | null> {
  try {
    const response = await fetch(`/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('No se pudo cargar los límites de Santa Fe');
    }

    const arrayBuffer = await response.arrayBuffer();
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);

    const kmlFile = Object.keys(zip.files).find(name => name.endsWith('.kml'));
    if (!kmlFile) throw new Error('No se encontró archivo KML dentro del KMZ');

    const kmlText = await zip.files[kmlFile].async('string');
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');

    // @ts-ignore
    const toGeoJSON = (await import('@mapbox/togeojson')).default;
    let geoJson = toGeoJSON.kml(kml);

    if (geoJson.type === 'FeatureCollection') {
      const santaFeFeatures = geoJson.features.filter((feature: any) => {
        const props = feature.properties || {};
        const description = (props.description || props.Description || '').toLowerCase();
        const name = (props.name || props.Name || '').toLowerCase();

        return description.includes('santa fe') ||
          description.includes('santafe') ||
          description.includes('<td>03</td>') ||
          description.includes('>03<') ||
          name.includes('santa fe');
      });

      if (santaFeFeatures.length > 0) {
        geoJson = { ...geoJson, features: santaFeFeatures };
      }
    }

    return geoJson;
  } catch (error) {
    console.error('Error cargando límites de Santa Fe:', error);
    return null;
  }
}

let barriosGeoJsonCache: GeoJSON | null = null;

/**
 * Carga los límites de barrios desde el archivo KML
 */
export async function loadBarriosBoundaries(): Promise<GeoJSON | null> {
  if (barriosGeoJsonCache) return barriosGeoJsonCache;

  try {
    const response = await fetch(`/boundaries/doc.kml?t=${Date.now()}`);
    if (!response.ok) throw new Error('No se pudo cargar el archivo de barrios');

    const kmlText = await response.text();
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');

    // @ts-ignore
    const toGeoJSON = (await import('@mapbox/togeojson')).default;
    const geoJson = toGeoJSON.kml(kml);

    barriosGeoJsonCache = geoJson;
    return geoJson;
  } catch (error) {
    console.error('Error cargando límites de barrios:', error);
    return null;
  }
}

/**
 * Busca el barrio al que pertenece un punto
 */
export async function findBarrioByPoint(lat: number, lng: number): Promise<string | null> {
  try {
    const geoJson = await loadBarriosBoundaries();
    if (!geoJson || geoJson.type !== 'FeatureCollection') return null;

    const point: [number, number] = [lng, lat];

    for (const feature of geoJson.features) {
      if (!feature.geometry) continue;

      let isInFeature = false;
      const geomType = feature.geometry.type;

      if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        isInFeature = isPointInPolygonRecursive(point, (feature.geometry as any).coordinates, geomType);
      } else if (geomType === 'GeometryCollection') {
        isInFeature = (feature.geometry as any).geometries.some((geom: any) => {
          if (!geom || !geom.coordinates) return false;
          return isPointInPolygonRecursive(point, geom.coordinates, geom.type);
        });
      }

      if (isInFeature) {
        const props = feature.properties || {};
        const barrioName = props.name || props.Name || props.SCaNombre || null;
        if (barrioName) return barrioName.trim();
      }
    }

    return null;
  } catch (error) {
    console.error('Error encontrando barrio:', error);
    return null;
  }
}

