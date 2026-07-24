import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as JSZip from 'jszip';
// @ts-ignore
import toGeoJSON from '@mapbox/togeojson';
import { DOMParser } from '@xmldom/xmldom';

export interface SectorFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];
  };
  properties: Record<string, any>;
  id: string;
}

@Injectable()
export class KmzParserService {
  private _sectors: SectorFeature[] | null = null;
  private readonly KMZ_PATH = path.resolve(process.cwd(), 'boundaries/RecoleccionUrbana.kmz');

  async getSectors(): Promise<SectorFeature[]> {
    if (this._sectors) return this._sectors;
    this._sectors = await this.loadSectors();
    return this._sectors;
  }

  private async loadSectors(): Promise<SectorFeature[]> {
    const kmzPath = this.KMZ_PATH;
    if (!fs.existsSync(kmzPath)) {
      console.warn(`[KmzParserService] KMZ no encontrado en ${kmzPath}`);
      return [];
    }

    const buffer = fs.readFileSync(kmzPath);
    const zip = await JSZip.loadAsync(buffer);
    const kmlFileName = Object.keys(zip.files).find((f) => f.toLowerCase().endsWith('.kml'));
    if (!kmlFileName) {
      console.warn(`[KmzParserService] No se encontro KML dentro del KMZ`);
      return [];
    }

    const kmlText = await zip.files[kmlFileName].async('string');
    const parser = new DOMParser();
    const kml = parser.parseFromString(kmlText, 'text/xml');
    const geoJson = toGeoJSON.kml(kml);

    if (!geoJson || geoJson.type !== 'FeatureCollection') return [];

    const sectors: SectorFeature[] = [];
    for (let i = 0; i < geoJson.features.length; i++) {
      const f = geoJson.features[i];

      if (f.geometry?.type === 'GeometryCollection') {
        const polygons = (f.geometry.geometries || []).filter(
          (g: any) => g.type === 'Polygon' || g.type === 'MultiPolygon',
        );
        if (polygons.length === 1) {
          f.geometry = polygons[0];
        } else if (polygons.length > 1) {
          const allCoords: any[] = [];
          polygons.forEach((p: any) => {
            if (p.type === 'Polygon') allCoords.push(p.coordinates);
            else allCoords.push(...p.coordinates);
          });
          f.geometry = { type: 'MultiPolygon', coordinates: allCoords };
        } else {
          continue;
        }
      }

      if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) continue;

      const properties: any = f.properties || {};
      const description = String(properties.description || '');
      const extractedData: Record<string, string> = {};
      const cleanHtml = description.replace(/\s+/g, ' ');
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

      let trMatch;
      while ((trMatch = trRegex.exec(cleanHtml)) !== null) {
        const rowHtml = trMatch[1];
        const tds: string[] = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
          tds.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
        }
        if (tds.length >= 2 && tds[0]) extractedData[tds[0]] = tds[1];
      }

      const getVal = (possibleKeys: string[]) => {
        for (const k of possibleKeys) {
          const foundKey = Object.keys(extractedData).find((ek) => ek.toLowerCase() === k.toLowerCase());
          if (foundKey) return extractedData[foundKey];
        }
        return '';
      };

      const macro = getVal(['Macro', 'Macro ruta', 'MACRO_RUTA', 'MacroRuta', 'Macro_Ruta']);
      const micro = getVal(['Micro', 'Micro ruta', 'MICRO_RUTA', 'MicroRuta', 'Micro_Ruta']);
      const turno = getVal(['Turno', 'TURNO', 'turno']);
      const barrio = getVal(['Barrio', 'BARRIO', 'barrio']);
      const localidad = getVal(['Localidad', 'LOCALIDAD', 'localidad']);

      const getCoordHash = (geom: any): string => {
        try {
          let coords: any = [];
          if (geom.type === 'Polygon') coords = geom.coordinates[0];
          else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
          if (coords && coords.length > 0) {
            const p = coords[0];
            return `${Number(p[0]).toFixed(6)}_${Number(p[1]).toFixed(6)}`;
          }
        } catch (e) {}
        return 'no-geom';
      };

      const coordHash = getCoordHash(f.geometry);
      const idBase = macro && micro ? `${macro}-${micro}` : 'sector';
      const safeId = `${idBase}-${coordHash}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      let displayName = properties.name || properties.Name || properties.Nombre || `Sector ${i}`;
      if (micro && macro) {
        displayName = `Micro ${micro} (Macro ${macro})`;
        if (barrio) displayName += ` - ${barrio}`;
        if (turno) displayName += ` [${turno.toUpperCase()}]`;
      }

      const getArea = (geometry: any): number => {
        if (!geometry) return Infinity;
        const coords = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        let area = 0;
        coords.forEach((poly: any) => {
          const exterior = poly[0];
          if (!exterior) return;
          for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
            area += (exterior[j][0] + exterior[i][0]) * (exterior[j][1] - exterior[i][1]);
          }
        });
        return Math.abs(area);
      };

      const currentArea = getArea(f.geometry);

      sectors.push({
        type: 'Feature',
        id: safeId,
        geometry: f.geometry,
        properties: {
          ...properties,
          name: displayName,
          macro_ruta: macro,
          micro_ruta: micro,
          turno,
          barrio,
          localidad,
          extracted_metadata: extractedData,
          area_approx: currentArea,
        },
      });
    }
    console.log(`[KmzParserService] ${sectors.length} sectores cargados desde el KMZ`);
    return sectors;
  }

  async findSectorsContaining(lat: number, lng: number): Promise<SectorFeature[]> {
    const booleanPointInPolygon = (await import('@turf/boolean-point-in-polygon')).default;
    const { point } = await import('@turf/helpers');
    const sectors = await this.getSectors();
    const pt = point([lng, lat]);
    const matches: SectorFeature[] = [];
    for (const sector of sectors) {
      if (booleanPointInPolygon(pt, sector as any)) matches.push(sector);
    }
    return matches;
  }

  async findSectorContaining(lat: number, lng: number): Promise<SectorFeature | null> {
    const matches = await this.findSectorsContaining(lat, lng);
    return matches.length > 0 ? matches[0] : null;
  }

  async getSectorById(sectorId: string): Promise<SectorFeature | null> {
    const sectors = await this.getSectors();
    return sectors.find((s) => s.id === sectorId) || null;
  }
}
