import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Proceso, ProcessStatus } from './entities/proceso.entity';
import { PuntoResiduo, EstadoPunto } from '../puntos/entities/punto-residuo.entity';

@Injectable()
export class ProcesosService {
  constructor(
    @InjectRepository(Proceso)
    private readonly processRepo: Repository<Proceso>,
    private readonly dataSource: DataSource,
  ) {}

  private async summarize(processes: Proceso[]) {
    const puntoRepo = this.dataSource.getRepository(PuntoResiduo);
    return Promise.all(
      processes.map(async (p) => {
        const [puntos, total] = await puntoRepo.findAndCount({ where: { processId: p.id } });
        const publicados = puntos.filter((a) => a.status === EstadoPunto.PUBLICADA).length;
        return {
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          status: p.status,
          createdAt: p.createdAt,
          createdByUserId: p.createdByUserId,
          totalPuntos: total,
          puntosPublicados: publicados,
        };
      }),
    );
  }

  async create(userId: string, body: { nombre: string; descripcion?: string }) {
    if (!body.nombre?.trim()) {
      throw new BadRequestException('El nombre del proceso es requerido');
    }
    const proceso = this.processRepo.create({
      nombre: body.nombre.trim(),
      descripcion: body.descripcion?.trim() || undefined,
      createdByUserId: userId,
      status: ProcessStatus.ACTIVO,
    });
    return this.processRepo.save(proceso);
  }

  async listMine(userId: string) {
    const processes = await this.processRepo.find({ where: { createdByUserId: userId }, order: { createdAt: 'DESC' } });
    return this.summarize(processes);
  }

  async listAll() {
    const processes = await this.processRepo.find({ order: { createdAt: 'DESC' } });
    return this.summarize(processes);
  }

  async getOne(id: string) {
    const proceso = await this.processRepo.findOne({ where: { id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    const puntoRepo = this.dataSource.getRepository(PuntoResiduo);
    const puntos = await puntoRepo.find({ where: { processId: id }, order: { createdAt: 'ASC' } });
    return { ...proceso, puntos };
  }

  async update(userId: string, id: string, body: { nombre?: string; descripcion?: string }) {
    const proceso = await this.processRepo.findOne({ where: { id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    if (proceso.createdByUserId !== userId) throw new ForbiddenException('Solo el creador puede editar el proceso');
    if (body.nombre) proceso.nombre = body.nombre.trim();
    if (body.descripcion !== undefined) proceso.descripcion = body.descripcion?.trim() || undefined;
    return this.processRepo.save(proceso);
  }

  async remove(id: string) {
    const proceso = await this.processRepo.findOne({ where: { id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    const puntoRepo = this.dataSource.getRepository(PuntoResiduo);
    const count = await puntoRepo.count({ where: { processId: id } });
    if (count > 0) {
      throw new BadRequestException('No se puede eliminar un proceso con puntos. Elimina los puntos primero.');
    }
    await this.processRepo.remove(proceso);
    return { success: true, message: 'Proceso eliminado' };
  }

  async recalculateStatus(processId: string) {
    const proceso = await this.processRepo.findOne({ where: { id: processId } });
    if (!proceso) return;
    const puntoRepo = this.dataSource.getRepository(PuntoResiduo);
    const puntos = await puntoRepo.find({ where: { processId } });
    if (puntos.length === 0) {
      proceso.status = ProcessStatus.ACTIVO;
    } else if (puntos.every((p) => p.status === EstadoPunto.PUBLICADA)) {
      proceso.status = ProcessStatus.FINALIZADO;
    } else {
      proceso.status = ProcessStatus.EN_SEGUIMIENTO;
    }
    await this.processRepo.save(proceso);
  }
}
