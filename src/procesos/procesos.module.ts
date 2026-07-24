import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from './entities/proceso.entity';
import { ProcesosController } from './procesos.controller';
import { ProcesosService } from './procesos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Proceso])],
  controllers: [ProcesosController],
  providers: [ProcesosService],
  exports: [ProcesosService],
})
export class ProcesosModule {}
