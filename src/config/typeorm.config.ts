import * as path from 'path';
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
      // false en produccion (ya lo era) a partir de las migraciones
      // versionadas (src/migrations/). En local sigue true "por ahora" —
      // pendiente anotado en PLAN-MAESTRO.md, no se cambia en esta tarea.
      synchronize: env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [path.join(__dirname, '..', 'migrations', '*.{ts,js}')],
      migrationsRun: false,
      logging: env.NODE_ENV !== 'production',
      retryAttempts: 10,
      retryDelay: 3000,
    };
  },
};
