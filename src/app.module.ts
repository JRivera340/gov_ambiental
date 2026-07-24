import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PuntosModule } from './puntos/puntos.module';
import { ProcesosModule } from './procesos/procesos.module';
import { AsignacionesModule } from './asignaciones/asignaciones.module';
import { RutasSemanalesModule } from './rutas-semanales/rutas-semanales.module';
import { SectoresModule } from './sectores/sectores.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmConfig), AuthModule, PuntosModule, ProcesosModule, AsignacionesModule, RutasSemanalesModule, SectoresModule, CatalogosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
