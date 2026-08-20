import path from 'path';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { getEnv } from './env';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  useFactory: () => {
    const env = getEnv();
    return {
      type: 'postgres' as const,
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      synchronize: env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
      // Antes en false: correr migraciones quedaba en manual (`railway run
      // npm run migration:run`), un paso que se olvida fácil y bloquea
      // despliegues con cambios de schema pendientes. TypeORM lleva su
      // propia tabla de migraciones ya aplicadas — correrlas en cada boot es
      // idempotente y seguro.
      migrationsRun: true,
      logging: env.NODE_ENV !== 'production',
      retryAttempts: 10,
      retryDelay: 3000,
    };
  },
};
