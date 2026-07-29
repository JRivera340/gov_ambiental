import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getEnv } from './config/env';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../package.json');

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
      // Un origen no listado NUNCA debe lanzar: `cors` propaga cualquier Error
      // a través de Express/Nest como excepción no manejada (500 genérico en
      // TODA la app, no solo en la ruta que se está probando). callback(null,
      // false) simplemente omite las cabeceras CORS de la respuesta -- eso ya
      // basta para que el navegador bloquee la lectura de un fetch cross-site;
      // no bloquea la petición en el servidor, que es lo que de verdad importa
      // para POST de navegación de página completa como /api/handoff (ahí no
      // aplica CORS en absoluto, solo el fetch/XHR lo respeta).
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  // Respuesta simple en la raíz real (fuera del prefijo /api) para quien
  // entre por error a la URL del backend sin saber que es una API.
  app.getHttpAdapter().get('/', (_req, res) => {
    res.json({ service: name, version, status: 'ok' });
  });

  app.setGlobalPrefix('api');
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`[AMBIENTAL] Corriendo en http://0.0.0.0:${env.PORT}/api`);
}

bootstrap();
