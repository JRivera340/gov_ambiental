import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getEnv } from './env';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { Proceso } from '../procesos/entities/proceso.entity';
import { PuntoAsignacion } from '../asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../rutas-semanales/entities/ruta-semanal.entity';
import { VisitaPunto } from '../visitas/entities/visita-punto.entity';

// DataSource para la CLI de TypeORM (generar/correr/revertir migraciones).
// Separado del useFactory de typeorm.config.ts (que usa autoLoadEntities):
// la CLI necesita una lista explícita de entidades, no puede resolver el
// glob "**/*.entity.ts" fuera del contexto de Nest.
//
// El schema base (puntos_residuo, punto_asignacion, ruta_semanal, procesos)
// ya existe en producción — se creó vía `synchronize` antes de que este
// repo tuviera control de migraciones versionado. Las migraciones acá
// arrancan desde visitas_punto en adelante: no hay una migración "inicial"
// que recree tablas que ya existen.
const env = getEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: false,
  entities: [PuntoResiduo, Proceso, PuntoAsignacion, RutaSemanal, VisitaPunto],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  logging: true,
});
