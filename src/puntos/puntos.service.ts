import { randomUUID } from 'crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PuntosRepository } from './puntos.repository';
import { PUNTOS_REPOSITORY } from './puntos.tokens';
import { EstadoPunto, PuntoResiduo, ResiduoEntry } from './entities/punto-residuo.entity';
import { CreatePuntoDto } from './dto/create-punto.dto';
import { UpdatePuntoDto } from './dto/update-punto.dto';
import { SeguimientoDto } from './dto/seguimiento.dto';
import { AsignacionesService } from '../asignaciones/asignaciones.service';
import { ProcesosService } from '../procesos/procesos.service';
import { VisitasService } from '../visitas/visitas.service';
import { BarriosService } from '../catalogos/barrios.service';

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
  private readonly logger = new Logger(PuntosService.name);

  constructor(
    @Inject(PUNTOS_REPOSITORY) private readonly repo: PuntosRepository,
    private readonly asignacionesService: AsignacionesService,
    private readonly procesosService: ProcesosService,
    private readonly visitasService: VisitasService,
    private readonly barriosService: BarriosService,
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
      // El barrio lo decide el servidor: si el cliente no manda uno del
      // catalogo (le fallo la deteccion en el mapa, mando vacio), se deriva
      // de la coordenada. Se registraron puntos sin barrio justamente por
      // depender de que el navegador lograra cargar el KML.
      barrio: this.barriosService.resolver(dto.barrio, dto.lat, dto.lng),
      photos: dto.photos || [],
      actaPdfUrl: dto.actaPdfUrl,
      results: dto.results,
      entidadResponsable: dto.entidadResponsable,
      entidadesAcompanantes: dto.entidadesAcompanantes || [],
      isGroupOperativo: dto.isGroupOperativo || (dto.gestoresInvolucradosIds?.length ?? 0) > 0,
      gestoresInvolucradosIds: dto.gestoresInvolucradosIds || [],
      processId: dto.processId,
      datosFormulario: dto.datosFormulario,
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
    // El límite de estado (solo BORRADOR/RECHAZADA) es para el gestor
    // creador, que edita antes de reenviar. Un ADMIN puede corregir un
    // punto en cualquier estado, incluido ya publicado.
    if (!isAdmin && punto.status !== EstadoPunto.BORRADOR && punto.status !== EstadoPunto.RECHAZADA) {
      throw new BadRequestException('Solo se puede editar un punto en borrador o rechazado');
    }

    const moviendoUbicacion = dto.lat !== undefined || dto.lng !== undefined;
    if (dto.lat !== undefined) punto.lat = dto.lat;
    if (dto.lng !== undefined) punto.lng = dto.lng;
    if (dto.barrio !== undefined) punto.barrio = dto.barrio;
    // Igual que en create(): el servidor tiene la ultima palabra. Se recalcula
    // si tocaron el barrio o la ubicacion, o si el punto venia sin barrio
    // valido (los que quedaron rotos cuando faltaba el KML).
    if (moviendoUbicacion || dto.barrio !== undefined || !this.barriosService.esBarrioValido(punto.barrio)) {
      punto.barrio = this.barriosService.resolver(punto.barrio, punto.lat, punto.lng) || punto.barrio;
    }
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
    if (dto.datosFormulario !== undefined) {
      // Merge, no reemplazo — el form de edición puede reenviar solo un
      // subconjunto de preguntas (p. ej. si la encuesta cambió desde la
      // creación) sin borrar respuestas viejas que ya no se muestran.
      punto.datosFormulario = { ...(punto.datosFormulario || {}), ...dto.datosFormulario };
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
    await this.visitasService.eliminarDePunto(id);
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
    await this.registrarVisitaSinRomper(id, userId, ahora);
    return guardado;
  }

  // Registra la visita para el desempeño de gestores (ver visitas.service.ts).
  // El seguimiento ya se guardó: si el insert de la visita falla, se loguea
  // pero no se le devuelve un error al gestor por algo que ya quedó grabado.
  private async registrarVisitaSinRomper(puntoId: string, userId: string, fecha: Date): Promise<void> {
    try {
      await this.visitasService.registrarVisita(puntoId, userId, fecha);
    } catch (e) {
      this.logger.error(`No se pudo registrar la visita al punto ${puntoId} del gestor ${userId}`, e as Error);
    }
  }

  async agregarNota(userId: string, email: string, id: string, body: { residuoId: string; texto: string }) {
    const punto = await this.repo.findById(id);
    if (!punto) throw new NotFoundException('Punto no encontrado');
    const residuo = punto.residuos.find((r) => r.id === body.residuoId);
    if (!residuo) throw new NotFoundException('Residuo no encontrado');
    const ahora = new Date();
    const nota = { id: randomUUID(), fecha: ahora.toISOString(), autorId: userId, autorNombre: email, texto: body.texto };
    residuo.notas = [...(residuo.notas || []), nota];
    // Dejar una nota es seguimiento igual que marcar recogido o agregar un
    // residuo: antes no tocaba este campo, así que la nota contaba como visita
    // en el backend pero el punto seguía figurando sin visitar en la ruta.
    punto.ultimoSeguimientoAt = ahora;
    const guardado = await this.repo.save(punto);
    await this.registrarVisitaSinRomper(id, userId, ahora);
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
