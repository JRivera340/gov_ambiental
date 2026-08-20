import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PuntosRepository } from './puntos.repository';
import { PUNTOS_REPOSITORY } from './puntos.tokens';
import { EstadoPunto, PuntoResiduo, ResiduoEntry } from './entities/punto-residuo.entity';
import { CreatePuntoDto } from './dto/create-punto.dto';
import { UpdatePuntoDto } from './dto/update-punto.dto';
import { SeguimientoDto } from './dto/seguimiento.dto';
import { AsignacionesService } from '../asignaciones/asignaciones.service';
import { ProcesosService } from '../procesos/procesos.service';
import { VisitasService } from '../visitas/visitas.service';

export type PublicResiduo = Pick<
  ResiduoEntry,
  'id' | 'tipoResiduo' | 'areaLinealMetros' | 'percibeOlores' | 'percibeVectores' | 'observaciones' | 'photos' | 'recogido' | 'fechaRecogida' | 'photosRecogida'
>;

export type PublicPunto = {
  id: string;
  lat: number;
  lng: number;
  barrio: string;
  status: EstadoPunto;
  dateTime: Date;
  photos: string[];
  photosFase2?: string[];
  pointNumber?: number;
  publishedAt?: Date;
  residuos: PublicResiduo[];
};

export function toPublicPunto(punto: PuntoResiduo): PublicPunto {
  return {
    id: punto.id,
    lat: punto.lat,
    lng: punto.lng,
    barrio: punto.barrio,
    status: punto.status,
    dateTime: punto.dateTime,
    photos: punto.photos,
    photosFase2: punto.photosFase2,
    pointNumber: punto.pointNumber,
    publishedAt: punto.publishedAt,
    residuos: (punto.residuos || []).map((r) => ({
      id: r.id,
      tipoResiduo: r.tipoResiduo,
      areaLinealMetros: r.areaLinealMetros,
      percibeOlores: r.percibeOlores,
      percibeVectores: r.percibeVectores,
      observaciones: r.observaciones,
      photos: r.photos,
      recogido: r.recogido,
      fechaRecogida: r.fechaRecogida,
      photosRecogida: r.photosRecogida,
    })),
  };
}

@Injectable()
export class PuntosService {
  constructor(
    @Inject(PUNTOS_REPOSITORY) private readonly repo: PuntosRepository,
    private readonly asignacionesService: AsignacionesService,
    private readonly procesosService: ProcesosService,
    private readonly visitasService: VisitasService,
  ) {}

  async create(userId: string, dto: CreatePuntoDto): Promise<PuntoResiduo> {
    const residuos = (dto.residuos || []).map((r) => ({
      id: randomUUID(),
      ...(r as any),
      recogido: false,
      createdByUserId: userId,
    }));
    // Numeración secuencial — nunca se implementó en este backend (los
    // únicos puntos con pointNumber eran los migrados del hub, que ya lo
    // traían). Cualquier punto creado acá quedaba con "#—" para siempre.
    const maxActual = await this.repo.getMaxPointNumber();
    const punto = await this.repo.create({
      createdByUserId: userId,
      status: EstadoPunto.BORRADOR,
      dateTime: dto.dateTime ? new Date(dto.dateTime) : new Date(),
      lat: dto.lat,
      lng: dto.lng,
      barrio: dto.barrio,
      photos: dto.photos || [],
      actaPdfUrl: dto.actaPdfUrl,
      results: dto.results,
      entidadResponsable: dto.entidadResponsable,
      entidadesAcompanantes: dto.entidadesAcompanantes || [],
      isGroupOperativo: dto.isGroupOperativo || (dto.gestoresInvolucradosIds?.length ?? 0) > 0,
      gestoresInvolucradosIds: dto.gestoresInvolucradosIds || [],
      processId: dto.processId,
      pointNumber: maxActual + 1,
      residuos,
    } as Omit<PuntoResiduo, 'id' | 'createdAt' | 'updatedAt'>);
    await this.asignacionesService.asignarACreador(punto.id, userId);
    return punto;
  }

  async findMine(userId: string): Promise<PuntoResiduo[]> {
    return this.repo.findByCreator(userId);
  }

  // Solo el creador puede editar (o un ADMIN, que puede corregir cualquier
  // punto), y solo mientras no esté publicado (BORRADOR o RECHAZADA — para
  // corregir y reenviar). Una vez ENVIADA o PUBLICADA, los cambios pasan por
  // seguimiento/aprobar-residuo, no por acá.
  async update(id: string, userId: string, dto: UpdatePuntoDto, isAdmin = false): Promise<PuntoResiduo> {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    if (punto.createdByUserId !== userId && !isAdmin) throw new ForbiddenException('Solo el creador puede editar el punto');
    if (punto.status !== EstadoPunto.BORRADOR && punto.status !== EstadoPunto.RECHAZADA) {
      throw new BadRequestException('Solo se puede editar un punto en borrador o rechazado');
    }

    if (dto.lat !== undefined) punto.lat = dto.lat;
    if (dto.lng !== undefined) punto.lng = dto.lng;
    if (dto.barrio !== undefined) punto.barrio = dto.barrio;
    if (dto.dateTime !== undefined) punto.dateTime = new Date(dto.dateTime);
    if (dto.photos !== undefined) punto.photos = dto.photos;
    if (dto.actaPdfUrl !== undefined) punto.actaPdfUrl = dto.actaPdfUrl;
    if (dto.results !== undefined) punto.results = dto.results;
    if (dto.entidadResponsable !== undefined) punto.entidadResponsable = dto.entidadResponsable;
    if (dto.entidadesAcompanantes !== undefined) punto.entidadesAcompanantes = dto.entidadesAcompanantes;
    if (dto.gestoresInvolucradosIds !== undefined) {
      punto.gestoresInvolucradosIds = dto.gestoresInvolucradosIds;
      punto.isGroupOperativo = dto.gestoresInvolucradosIds.length > 0;
    }
    if (dto.residuos !== undefined) {
      punto.residuos = dto.residuos.map((r: any) => ({
        id: r.id || randomUUID(),
        recogido: false,
        createdByUserId: userId,
        ...r,
      }));
    }
    return this.repo.save(punto);
  }

  async send(id: string, userId: string, isAdmin = false) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    if (punto.createdByUserId !== userId && !isAdmin) throw new ForbiddenException('Solo el creador puede enviar el punto');
    punto.status = EstadoPunto.ENVIADA;
    return this.repo.save(punto);
  }

  // Solo ADMIN — borrado real, sin restricción de estado. Elimina también la
  // asignación asociada para no dejar una fila huérfana apuntando a un punto
  // que ya no existe.
  async remove(id: string): Promise<void> {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    await this.asignacionesService.eliminarDePunto(id);
    await this.repo.deleteMany([id]);
  }

  async approve(id: string, validatorUserId: string) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    punto.status = EstadoPunto.PUBLICADA;
    punto.validatorUserId = validatorUserId;
    punto.validatedAt = new Date();
    punto.publishedAt = new Date();
    const saved = await this.repo.save(punto);
    if (saved.processId) await this.procesosService.recalculateStatus(saved.processId);
    return saved;
  }

  async reject(id: string, validatorUserId: string, notes: string) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    punto.status = EstadoPunto.RECHAZADA;
    punto.validatorUserId = validatorUserId;
    punto.validatedAt = new Date();
    punto.validationNotes = notes;
    return this.repo.save(punto);
  }

  async findPending() {
    return this.repo.findPending();
  }

  async findPublished() {
    return this.repo.findPublished();
  }

  async findAll(filters?: { desde?: string; hasta?: string }) {
    return this.repo.findAll(filters);
  }

  async findOne(id: string) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    return punto;
  }

  async findOnePublic(id: string): Promise<PublicPunto> {
    const punto = await this.findOne(id);
    return toPublicPunto(punto);
  }

  async seguimiento(userId: string, email: string, id: string, body: SeguimientoDto) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    if (punto.status === EstadoPunto.RECHAZADA) {
      throw new BadRequestException('No se puede realizar seguimiento a un punto rechazado');
    }

    const residuos = [...punto.residuos];

    if (body.action === 'MARCAR_RECOGIDO') {
      if (!body.residuoId) throw new BadRequestException('residuoId es requerido');
      const residuo = residuos.find((r) => r.id === body.residuoId);
      if (!residuo) throw new NotFoundException('Residuo no encontrado');
      residuo.recogido = true;
      residuo.fechaRecogida = body.fechaRecogida || new Date().toISOString();
      residuo.photosRecogida = body.photosRecogida || [];
      residuo.recogidoByUserId = userId;
      residuo.recogidoByNombre = email;
    } else if (body.action === 'AGREGAR_RESIDUO') {
      if (!body.nuevoResiduo) throw new BadRequestException('nuevoResiduo es requerido');
      residuos.push({
        id: randomUUID(),
        ...(body.nuevoResiduo as any),
        recogido: false,
        createdByUserId: userId,
        createdByNombre: email,
      });
    }

    punto.residuos = residuos;
    const ahora = new Date();
    punto.ultimoSeguimientoAt = ahora;
    const guardado = await this.repo.save(punto);
    // Registra la visita para el dashboard de desempeño de gestores (ver
    // visitas.service.ts) — no bloquea la respuesta si falla el insert.
    await this.visitasService.registrarVisita(id, userId, ahora);
    return guardado;
  }

  async agregarNota(userId: string, email: string, id: string, body: { residuoId: string; texto: string }) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    const residuo = punto.residuos.find((r) => r.id === body.residuoId);
    if (!residuo) throw new NotFoundException('Residuo no encontrado');
    const nota = { id: randomUUID(), fecha: new Date().toISOString(), autorId: userId, autorNombre: email, texto: body.texto };
    residuo.notas = [...(residuo.notas || []), nota];
    const guardado = await this.repo.save(punto);
    await this.visitasService.registrarVisita(id, userId, new Date());
    return guardado;
  }

  async eliminarNota(id: string, body: { residuoId: string; notaId: string }) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    const residuo = punto.residuos.find((r) => r.id === body.residuoId);
    if (!residuo) throw new NotFoundException('Residuo no encontrado');
    residuo.notas = (residuo.notas || []).filter((n) => n.id !== body.notaId);
    return this.repo.save(punto);
  }

  async mergeResiduos(parentId: string, childIdsRaw: string[]) {
    const childIds = childIdsRaw.filter((id) => id !== parentId);
    if (childIds.length === 0) {
      throw new BadRequestException('No hay puntos hijos validos para fusionar (el padre no puede ser su propio hijo).');
    }
    const parent = await this.repo.findById(parentId);
    if (!parent) throw new NotFoundException('Punto padre no encontrado');

    const parentResiduos = [...parent.residuos];
    let copiedCount = 0;

    for (const childId of childIds) {
      const child = await this.repo.findById(childId);
      if (!child) continue;
      for (const r of child.residuos) {
        parentResiduos.push({ ...r, id: r.id || randomUUID(), dateTime: r.dateTime || child.dateTime.toISOString() });
        copiedCount++;
      }
    }

    parent.residuos = parentResiduos;
    const saved = await this.repo.save(parent);
    await this.repo.deleteMany(childIds);
    return saved;
  }

  async aprobarResiduo(id: string, residuos: PuntoResiduo['residuos']) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    punto.residuos = residuos;
    return this.repo.save(punto);
  }
}
