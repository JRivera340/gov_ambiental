import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getEnv } from './config/env';

function parseCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
}

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = parseCorsOrigins(env.CORS_ORIGIN);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`[AMBIENTAL] Corriendo en http://0.0.0.0:${env.PORT}/api`);
}

bootstrap();
