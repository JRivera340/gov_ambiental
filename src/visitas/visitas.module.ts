import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitaPunto } from './entities/visita-punto.entity';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { RutasSemanalesModule } from '../rutas-semanales/rutas-semanales.module';
import { AsignacionesModule } from '../asignaciones/asignaciones.module';

@Module({
  imports: [TypeOrmModule.forFeature([VisitaPunto]), RutasSemanalesModule, AsignacionesModule],
  controllers: [VisitasController],
  providers: [VisitasService],
  exports: [VisitasService],
})
export class VisitasModule {}
