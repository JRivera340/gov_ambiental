import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RutaSemanal } from './entities/ruta-semanal.entity';
import { RutasSemanalesController } from './rutas-semanales.controller';
import { RutasSemanalesService } from './rutas-semanales.service';

@Module({
  imports: [TypeOrmModule.forFeature([RutaSemanal])],
  controllers: [RutasSemanalesController],
  providers: [RutasSemanalesService],
  exports: [RutasSemanalesService],
})
export class RutasSemanalesModule {}
