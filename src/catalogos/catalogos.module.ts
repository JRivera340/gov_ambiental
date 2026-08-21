import { Module } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { BarriosService } from './barrios.service';

@Module({
  controllers: [CatalogosController],
  providers: [BarriosService],
  exports: [BarriosService],
})
export class CatalogosModule {}
