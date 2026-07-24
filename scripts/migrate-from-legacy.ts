import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { PuntoResiduo, EstadoPunto, ResiduoEntry } from '../src/puntos/entities/punto-residuo.entity';

// Carga .env.migration además del .env normal (credenciales de la BD vieja,
// de solo lectura, nunca commiteadas).
const migrationEnvPath = path.join(__dirname, '..', '.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  for (const line of fs.readFileSync(migrationEnvPath, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

type OldActivityRow = {
  id: string;
  createdByUserId: string;
  status: string;
  dateTime: Date;
  lat: number;
  lng: number;
  barrio: string;
  photos: string[] | null;
  photosFase2: string[] | null;
  fechaFinalizacion: Date | null;
  actaPdfUrl: string | null;
  validatorUserId: string | null;
  validatedAt: Date | null;
  validationNotes: string | null;
  publishedAt: Date | null;
  processId: string | null;
  descripcionAntes: string | null;
  descripcionDespues: string | null;
  revisadoPorUserId: string | null;
  revisadoPorNombre: string | null;
  fechaRevision: Date | null;
  pointNumber: number | null;
  categorySeq: number | null;
  dynamicAnswers: any;
  createdAt: Date;
  updatedAt: Date;
};

function mapResiduos(row: OldActivityRow): ResiduoEntry[] {
  const da = row.dynamicAnswers;
  if (da?.residuos && Array.isArray(da.residuos) && da.residuos.length > 0) {
    return da.residuos as ResiduoEntry[];
  }
  // Formato legacy plano (una sola entrada de residuo al nivel superior)
  if (da?.tipoResiduo) {
    return [
      {
        id: 'legacy-0',
        tipoResiduo: da.tipoResiduo,
        quienDispuso: da.quienDispuso || '',
        dateTime: (row.dateTime || row.createdAt).toISOString(),
        percibeOlores: da.percibeOlores ?? false,
        percibeVectores: da.percibeVectores ?? false,
        volumenEstimadoM3: da.volumenEstimadoM3,
        areaLinealMetros: da.areaLinealMetros || 0,
        observaciones: da.observaciones || '',
        photos: row.photos || [],
        recogido: false,
      },
    ];
  }
  return [];
}

async function migrate() {
  const requiredOldVars = ['OLD_DB_HOST', 'OLD_DB_USERNAME', 'OLD_DB_PASSWORD', 'OLD_DB_DATABASE'];
  for (const key of requiredOldVars) {
    if (!process.env[key]) {
      throw new Error(`Falta ${key} — completá .env.migration antes de correr esta migración.`);
    }
  }

  const env = getEnv();

  // Conexión de SOLO LECTURA a la BD vieja — este cliente nunca ejecuta
  // INSERT/UPDATE/DELETE, solo el SELECT de abajo.
  const oldClient = new Client({
    host: process.env.OLD_DB_HOST,
    port: Number(process.env.OLD_DB_PORT || 5432),
    user: process.env.OLD_DB_USERNAME,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
  });
  await oldClient.connect();

  const { rows } = await oldClient.query<OldActivityRow>(`
    SELECT
      id, "createdByUserId", status, "dateTime", lat, lng, barrio,
      photos, "photosFase2", "fechaFinalizacion", "actaPdfUrl",
      "validatorUserId", "validatedAt", "validationNotes", "publishedAt",
      "processId", "descripcionAntes", "descripcionDespues",
      "revisadoPorUserId", "revisadoPorNombre", "fechaRevision",
      "pointNumber", "categorySeq", "dynamicAnswers", "createdAt", "updatedAt"
    FROM activities
    WHERE "operativoSubtipo" = 'AMBIENTAL_PUNTOS_ACUMULACION'
  `);

  console.log(`[MIGRACION] ${rows.length} puntos de residuos encontrados en la BD vieja.`);
  await oldClient.end();

  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: true,
    entities: [PuntoResiduo],
  });
  await dataSource.initialize();
  const repo = dataSource.getRepository(PuntoResiduo);

  const yaMigrados = await repo.count();
  if (yaMigrados > 0) {
    console.log(`[MIGRACION] La BD nueva ya tiene ${yaMigrados} puntos — no se duplica. Abortando.`);
    await dataSource.destroy();
    return;
  }

  const sinResiduosDetectados: string[] = [];
  let migrados = 0;

  for (const row of rows) {
    const residuos = mapResiduos(row);
    if (residuos.length === 0) sinResiduosDetectados.push(row.id);

    await repo.save(
      repo.create({
        createdByUserId: row.createdByUserId,
        status: row.status as EstadoPunto,
        dateTime: row.dateTime,
        lat: row.lat,
        lng: row.lng,
        barrio: row.barrio,
        photos: row.photos || [],
        photosFase2: row.photosFase2 || undefined,
        fechaFinalizacion: row.fechaFinalizacion || undefined,
        actaPdfUrl: row.actaPdfUrl || undefined,
        validatorUserId: row.validatorUserId || undefined,
        validatedAt: row.validatedAt || undefined,
        validationNotes: row.validationNotes || undefined,
        publishedAt: row.publishedAt || undefined,
        processId: row.processId || undefined,
        descripcionAntes: row.descripcionAntes || undefined,
        descripcionDespues: row.descripcionDespues || undefined,
        revisadoPorUserId: row.revisadoPorUserId || undefined,
        revisadoPorNombre: row.revisadoPorNombre || undefined,
        fechaRevision: row.fechaRevision || undefined,
        pointNumber: row.pointNumber || undefined,
        categorySeq: row.categorySeq || undefined,
        residuos,
        ultimoSeguimientoAt: row.dynamicAnswers?.ultimoSeguimientoAt
          ? new Date(row.dynamicAnswers.ultimoSeguimientoAt)
          : undefined,
      }),
    );
    migrados++;
  }

  console.log(`[MIGRACION] ${migrados} puntos migrados a la BD nueva.`);
  if (sinResiduosDetectados.length > 0) {
    console.warn(
      `[MIGRACION] ${sinResiduosDetectados.length} puntos sin residuos detectables (formato legacy no reconocido) — revisar manualmente: ${sinResiduosDetectados.join(', ')}`,
    );
  }

  await dataSource.destroy();
}

migrate().catch((err) => {
  console.error('[MIGRACION] Error:', err);
  process.exit(1);
});
