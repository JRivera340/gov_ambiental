import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { KmzParserService } from './kmz-parser.service';
import { SectoresService } from './sectores.service';
import { SectoresController } from './sectores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PuntoResiduo])],
  controllers: [SectoresController],
  providers: [KmzParserService, SectoresService],
})
export class SectoresModule {}
