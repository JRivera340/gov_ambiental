import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuntoAsignacion } from './entities/punto-asignacion.entity';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from './asignaciones.service';

@Module({
  imports: [TypeOrmModule.forFeature([PuntoAsignacion])],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}
