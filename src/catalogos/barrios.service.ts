import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import toGeoJSON from '@mapbox/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { isInsideGeometry } from '../common/geo.util';
import { BARRIOS } from './barrio.enum';

type BarrioFeature = { nombre: string; geometry: any };

// Resuelve el barrio de una coordenada del lado del servidor.
//
// Antes esto solo existia en el navegador (utils/boundaryValidation.ts):
// si el KML no cargaba, el formulario mandaba barrio vacio y el punto se
// guardaba sin barrio, sin que nada lo detectara. El servidor es ahora la
// autoridad: el cliente puede sugerir un barrio, pero si no manda uno valido
// se deriva de lat/lng acá.
//
// Los 32 nombres del KML coinciden 1:1 con BARRIOS, asi que el resultado
// siempre es un valor del catalogo.
@Injectable()
export class BarriosService {
  private readonly logger = new Logger(BarriosService.name);
  private _barrios: BarrioFeature[] | null = null;
  private readonly KML_PATH = path.resolve(process.cwd(), 'boundaries/doc.kml');

  private cargar(): BarrioFeature[] {
    if (this._barrios) return this._barrios;

    if (!fs.existsSync(this.KML_PATH)) {
      this.logger.warn(`KML de barrios no encontrado en ${this.KML_PATH} — no se podra resolver el barrio por coordenada`);
      this._barrios = [];
      return this._barrios;
    }

    const kmlText = fs.readFileSync(this.KML_PATH, 'utf8');
    const kml = new DOMParser().parseFromString(kmlText, 'text/xml');
    const geoJson = toGeoJSON.kml(kml);

    const features: BarrioFeature[] = [];
    for (const f of geoJson?.features || []) {
      const nombre = String(f.properties?.name || f.properties?.Name || '').trim().toUpperCase();
      if (!nombre || !f.geometry) continue;
      features.push({ nombre, geometry: f.geometry });
    }

    this.logger.log(`${features.length} barrios cargados desde el KML`);
    this._barrios = features;
    return features;
  }

  // Devuelve el nombre del barrio que contiene la coordenada, o null si cae
  // fuera de todos los poligonos (p. ej. un punto fuera de la localidad).
  resolverPorCoordenada(lat: number, lng: number): string | null {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    const barrio = this.cargar().find((b) => isInsideGeometry(lat, lng, b.geometry));
    return barrio ? barrio.nombre : null;
  }

  esBarrioValido(barrio?: string | null): boolean {
    return Boolean(barrio && BARRIOS.includes(barrio.trim().toUpperCase()));
  }

  // El barrio definitivo de un punto: se respeta el que manda el cliente si
  // pertenece al catalogo; si no, se deriva de la coordenada.
  resolver(barrioSugerido: string | undefined | null, lat: number, lng: number): string {
    if (this.esBarrioValido(barrioSugerido)) return barrioSugerido!.trim().toUpperCase();
    return this.resolverPorCoordenada(lat, lng) || '';
  }
}
