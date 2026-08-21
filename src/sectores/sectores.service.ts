import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { KmzParserService } from './kmz-parser.service';
import { isInsideGeometry, boundingBoxOf } from '../common/geo.util';

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(PuntoResiduo)
    private readonly puntoRepo: Repository<PuntoResiduo>,
    private readonly kmzParser: KmzParserService,
  ) {}

  async marcarSectorComoRecogido(
    sectorId: string,
    userId: string,
    userEmail: string,
    fechaRecogida?: string,
    photosRecogida?: string[],
    desde?: string,
    hasta?: string,
    frontendSectorBarrio?: string,
  ) {
    const sector = await this.kmzParser.getSectorById(sectorId);
    if (!sector) throw new BadRequestException('Sector no encontrado');

    const finalFecha = fechaRecogida || new Date().toISOString();
    const finalPhotos = photosRecogida || [];

    const where: any = { status: In(['ENVIADA', 'PUBLICADA']) };
    const sectorBarrioRaw = frontendSectorBarrio || sector.properties?.barrio || sector.properties?.Barrio || sector.properties?.BARRIO;
    const { lats, lngs } = boundingBoxOf(sector.geometry);

    if (lats.length > 0) {
      where.lat = Between(Math.min(...lats) - 0.005, Math.max(...lats) + 0.005);
      where.lng = Between(Math.min(...lngs) - 0.005, Math.max(...lngs) + 0.005);
    } else if (sectorBarrioRaw) {
      where.barrio = ILike(`%${String(sectorBarrioRaw).trim()}%`);
    }

    if (desde || hasta) {
      const start = desde ? new Date(desde.includes('T') ? desde : `${desde}T00:00:00.000Z`) : null;
      const end = hasta ? new Date(hasta.includes('T') ? hasta : `${hasta}T23:59:59.999Z`) : null;
      if (start && end) where.dateTime = Between(start, end);
      else if (start) where.dateTime = MoreThanOrEqual(start);
      else if (end) where.dateTime = LessThanOrEqual(end);
    }

    const puntos = await this.puntoRepo.find({ where });
    const puntosEnSector = puntos.filter((p) => p.lat != null && p.lng != null && isInsideGeometry(p.lat, p.lng, sector.geometry));

    let puntosAfectados = 0;
    let residuosMarcados = 0;

    for (const punto of puntosEnSector) {
      let changed = false;
      for (const residuo of punto.residuos) {
        const normalizedTipo = String(residuo.tipoResiduo || '').toUpperCase().replace(/_/g, ' ').trim();
        if (!normalizedTipo.includes('ORDINARIO')) continue;
        if (!residuo.recogido) {
          residuo.recogido = true;
          residuo.fechaRecogida = finalFecha;
          residuo.photosRecogida = finalPhotos;
          residuo.recogidoByUserId = userId;
          residuo.recogidoByNombre = userEmail;
          residuosMarcados++;
          changed = true;
        }
      }
      if (changed) {
        await this.puntoRepo.save(punto);
        puntosAfectados++;
      }
    }

    return { puntosAfectados, residuosMarcados };
  }

  async getPuntosEnSector(sectorId: string, desde?: string, hasta?: string, status?: string, sectorBarrio?: string) {
    const sector = await this.kmzParser.getSectorById(sectorId);
    if (!sector) throw new BadRequestException('Sector no encontrado');

    const where: any = {};
    const barrio = sectorBarrio || sector.properties?.barrio || sector.properties?.Barrio || sector.properties?.BARRIO;
    const { lats, lngs } = boundingBoxOf(sector.geometry);

    if (lats.length > 0) {
      where.lat = Between(Math.min(...lats) - 0.005, Math.max(...lats) + 0.005);
      where.lng = Between(Math.min(...lngs) - 0.005, Math.max(...lngs) + 0.005);
    } else if (barrio) {
      where.barrio = ILike(`%${String(barrio).trim()}%`);
    }

    where.status = status ? In(status.split(',').map((s) => s.trim())) : In(['ENVIADA', 'PUBLICADA']);

    if (desde || hasta) {
      const start = desde ? new Date(desde.includes('T') ? desde : `${desde}T00:00:00.000Z`) : null;
      const end = hasta ? new Date(hasta.includes('T') ? hasta : `${hasta}T23:59:59.999Z`) : null;
      if (start && end) where.dateTime = Between(start, end);
      else if (start) where.dateTime = MoreThanOrEqual(start);
      else if (end) where.dateTime = LessThanOrEqual(end);
    }

    const puntosCrudos = await this.puntoRepo.find({ where });
    const puntosEnSector = puntosCrudos.filter((p) => p.lat != null && p.lng != null && isInsideGeometry(p.lat, p.lng, sector.geometry));

    const puntos = puntosEnSector.map((p) => {
      const recogidos = p.residuos.filter((r) => r.recogido).length;
      const pendientes = p.residuos.filter((r) => !r.recogido).length;
      return {
        puntoId: p.id, barrio: p.barrio, lat: p.lat, lng: p.lng, status: p.status, dateTime: p.dateTime,
        totalResiduos: p.residuos.length, recogidos, pendientes, residuos: p.residuos,
      };
    });

    const allResiduos = puntos.flatMap((p) => p.residuos);
    return {
      sectorId,
      nombre: sector.properties?.name || sector.properties?.Name || sector.id,
      properties: sector.properties,
      totalPuntos: puntos.length,
      totalResiduosOrdinarios: allResiduos.length,
      totalRecogidos: allResiduos.filter((r) => r.recogido).length,
      totalPendientes: allResiduos.filter((r) => !r.recogido).length,
      puntos,
    };
  }
}
