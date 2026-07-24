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
      logging: env.NODE_ENV !== 'production',
      retryAttempts: 10,
      retryDelay: 3000,
    };
  },
};
