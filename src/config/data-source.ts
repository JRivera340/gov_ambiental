import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getEnv } from './env';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { Proceso } from '../procesos/entities/proceso.entity';
import { PuntoAsignacion } from '../asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../rutas-semanales/entities/ruta-semanal.entity';

// DataSource para la CLI de TypeORM (generar/correr/revertir migraciones).
// Separado del useFactory de app.module.ts (que usa autoLoadEntities): la
// CLI necesita una lista explicita de entidades, no puede resolver el
// glob "**/*.entity.ts" fuera del contexto de Nest.
const env = getEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: false,
  entities: [PuntoResiduo, Proceso, PuntoAsignacion, RutaSemanal],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  logging: true,
});
