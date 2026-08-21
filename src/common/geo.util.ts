// Punto-en-poligono (ray casting) compartido por los servicios que cruzan
// coordenadas contra capas KMZ/KML: sectores de recoleccion y barrios.
// Vivia dentro de sectores.service.ts; se movio acá cuando BarriosService
// necesitó exactamente la misma operación.

export function isInsideGeometry(lat: number, lng: number, geometry: any): boolean {
  if (!geometry || !geometry.type) return false;
  const checkPolygon = (polygon: number[][][], lat: number, lng: number) => {
    const exterior = polygon[0];
    let inside = false;
    for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      const xi = exterior[i][0], yi = exterior[i][1];
      const xj = exterior[j][0], yj = exterior[j][1];
      const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };
  if (geometry.type === 'Polygon') return checkPolygon(geometry.coordinates, lat, lng);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly: any) => checkPolygon(poly, lat, lng));
  if (geometry.type === 'GeometryCollection') return (geometry.geometries || []).some((g: any) => isInsideGeometry(lat, lng, g));
  return false;
}

export function boundingBoxOf(geometry: any): { lats: number[]; lngs: number[] } {
  const lats: number[] = [];
  const lngs: number[] = [];
  const extract = (g: any) => {
    if (g.type === 'Polygon') g.coordinates[0].forEach((c: any) => { lngs.push(c[0]); lats.push(c[1]); });
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p: any) => p[0].forEach((c: any) => { lngs.push(c[0]); lats.push(c[1]); }));
    else if (g.type === 'GeometryCollection') (g.geometries || []).forEach(extract);
  };
  extract(geometry);
  return { lats, lngs };
}
