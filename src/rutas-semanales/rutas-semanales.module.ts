import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import { RutasSemanalesController } from './rutas-semanales.controller';
import { RutasSemanalesService } from './rutas-semanales.service';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { AsignacionesModule } from '../asignaciones/asignaciones.module';

@Module({
  // TypeOrmModule.forFeature([PuntoResiduo]) directo (no PuntosModule): el
  // plan semanal solo necesita leer puntos por id, no la capa de servicio
  // completa de puntos — evita un ciclo de módulos con PuntosModule, que a
  // su vez depende de VisitasModule, que depende de este módulo.
  imports: [TypeOrmModule.forFeature([RutaSemanal, PuntoResiduo]), AsignacionesModule],
  controllers: [RutasSemanalesController],
  providers: [RutasSemanalesService],
  exports: [RutasSemanalesService],
})
export class RutasSemanalesModule {}
