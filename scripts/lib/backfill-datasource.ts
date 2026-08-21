import { DataSource } from 'typeorm';
import { getEnv } from '../../src/config/env';

// Conexion para los scripts de backfill.
//
// Por defecto usan la base del .env (desarrollo local). Para correrlos contra
// produccion sin tocar el .env ni arriesgarse a dejarlo apuntando a prod, se
// pasa la URL publica de Postgres que da Railway en la pestaña "Connect":
//
//   BACKFILL_DATABASE_URL="postgresql://user:pass@host.proxy.rlwy.net:12345/railway" npm run backfill:visitas
//
// SSL se activa solo si la URL no apunta a localhost (Railway lo pide en el
// proxy publico; en la red interna y en local no).
export function crearDataSource(entities: Function[]): DataSource {
  const url = process.env.BACKFILL_DATABASE_URL;

  if (url) {
    const esLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    return new DataSource({
      type: 'postgres',
      url,
      ssl: esLocal ? undefined : { rejectUnauthorized: false },
      synchronize: false,
      entities,
    });
  }

  const env = getEnv();
  return new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: false,
    entities,
  });
}

export function describirDestino(): string {
  const url = process.env.BACKFILL_DATABASE_URL;
  if (!url) return `${getEnv().DB_HOST}/${getEnv().DB_DATABASE} (del .env)`;
  // Nunca imprimir la contraseña.
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port}${u.pathname} (BACKFILL_DATABASE_URL)`;
  } catch {
    return 'BACKFILL_DATABASE_URL';
  }
}
