import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuntoResiduo } from './entities/punto-residuo.entity';
import { PuntosController } from './puntos.controller';
import { PuntosService } from './puntos.service';
import { TypeOrmPuntosRepository } from './puntos.repository.typeorm';
import { PUNTOS_REPOSITORY } from './puntos.tokens';

@Module({
  imports: [TypeOrmModule.forFeature([PuntoResiduo])],
  controllers: [PuntosController],
  providers: [
    PuntosService,
    { provide: PUNTOS_REPOSITORY, useClass: TypeOrmPuntosRepository },
  ],
})
export class PuntosModule {}
