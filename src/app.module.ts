import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PuntosModule } from './puntos/puntos.module';
import { ProcesosModule } from './procesos/procesos.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [TypeOrmModule.forRootAsync(typeOrmConfig), AuthModule, PuntosModule, ProcesosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
