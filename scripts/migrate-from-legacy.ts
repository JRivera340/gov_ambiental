import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { PuntoResiduo, EstadoPunto, ResiduoEntry } from '../src/puntos/entities/punto-residuo.entity';
import { PuntoAsignacion } from '../src/asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../src/rutas-semanales/entities/ruta-semanal.entity';
import { Proceso } from '../src/procesos/entities/proceso.entity';

// Migración/reconciliación RE-CORRIBLE desde el hub (gov-espacio-publico)
// hacia la base propia de ambiental. Reemplaza la versión anterior de este
// script, que tenía 3 problemas reales:
//   1. Filtraba por "operativoSubtipo = 'AMBIENTAL_PUNTOS_ACUMULACION'" (un
//      criterio angosto) en vez de "operativoCategoria = 'AMBIENTAL'" (el
//      criterio correcto, ya usado en la migración real que pobló esta base
//      — ver conteos reconciliados en producción: 346 puntos / 345
//      asignaciones / 12 rutas).
//   2. No migraba punto_asignacion ni ruta_semanal ni procesos, solo
//      puntos_residuo.
//   3. No era idempotente: abortaba si la base ya tenía datos, en vez de
//      hacer upsert — imposible de re-correr para traer actividad nueva del
//      hub sin duplicar ni perder lo ya migrado.
//
// Este módulo NO tiene tabla de usuarios propia (auth compartida con el hub,
// mismo JWT_SECRET — ver PLAN-MAESTRO.md) — no hace falta remapear ningún
// id de usuario, los UUIDs de gestor/validador del hub ya son válidos acá
// tal cual.
//
// Lee del hub en SOLO LECTURA. Escribe únicamente en la base de ambiental.
// No modifica ni borra nada en el hub. Upsert por id — correr de nuevo trae
// solo lo nuevo/cambiado, sin duplicar ni pisar nada por error.
//
// Variables esperadas en .env.migration (credenciales de SOLO LECTURA del
// hub, nunca commiteadas):
//   OLD_DB_HOST / OLD_DB_PORT / OLD_DB_USERNAME / OLD_DB_PASSWORD /
//   OLD_DB_DATABASE / OLD_DB_SSL
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
  // Formato legacy plano (una sola entrada de residuo al nivel superior).
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

  // Conexión de SOLO LECTURA a la BD del hub — este cliente nunca ejecuta
  // INSERT/UPDATE/DELETE, solo los SELECT de abajo.
  const oldDbSsl = process.env.OLD_DB_SSL !== 'false';
  const oldClient = new Client({
    host: process.env.OLD_DB_HOST,
    port: Number(process.env.OLD_DB_PORT || 5432),
    user: process.env.OLD_DB_USERNAME,
    password: process.env.OLD_DB_PASSWORD,
    database: process.env.OLD_DB_DATABASE,
    ssl: oldDbSsl ? { rejectUnauthorized: false } : undefined,
  });
  await oldClient.connect();

  const dbInfo = await oldClient.query('SELECT current_database()');
  console.log(`[MIGRACION] Conectado (solo lectura) a la BD del hub: ${dbInfo.rows[0].current_database}`);

  const { rows } = await oldClient.query<OldActivityRow>(`
    SELECT
      id, "createdByUserId", status, "dateTime", lat, lng, barrio,
      photos, "photosFase2", "fechaFinalizacion", "actaPdfUrl",
      "validatorUserId", "validatedAt", "validationNotes", "publishedAt",
      "processId", "descripcionAntes", "descripcionDespues",
      "revisadoPorUserId", "revisadoPorNombre", "fechaRevision",
      "pointNumber", "categorySeq", "dynamicAnswers", "createdAt", "updatedAt"
    FROM activities
    WHERE "operativoCategoria" = 'AMBIENTAL'
    ORDER BY "createdAt" ASC
  `);
  console.log(`[MIGRACION] ${rows.length} puntos ambientales encontrados en el hub.`);

  const rutasRes = await oldClient.query(`
    SELECT id, "gestorId", "semanaInicio", "semanaFin", estado, paradas, segmentos, arrastre, "createdAt", "updatedAt"
    FROM ruta_semanal
  `);
  console.log(`[MIGRACION] ${rutasRes.rows.length} rutas semanales encontradas en el hub.`);

  const asignacionesRes = await oldClient.query(`
    SELECT pa."activityId", pa."gestorId", pa."updatedByUserId", pa."updatedAt"
    FROM punto_asignacion pa
    JOIN activities a ON a.id = pa."activityId"
    WHERE a."operativoCategoria" = 'AMBIENTAL'
  `);
  console.log(`[MIGRACION] ${asignacionesRes.rows.length} asignaciones encontradas para puntos ambientales.`);

  const procesosRes = await oldClient.query(`
    SELECT id, nombre, descripcion, "createdByUserId", status, "createdAt", "updatedAt"
    FROM processes
    WHERE id IN (
      SELECT DISTINCT "processId" FROM activities
      WHERE "operativoCategoria" = 'AMBIENTAL' AND "processId" IS NOT NULL
    )
  `);
  console.log(`[MIGRACION] ${procesosRes.rows.length} procesos referenciados por puntos ambientales.`);

  await oldClient.end();

  // synchronize: false — la base de ambiental YA tiene el schema (creado por
  // trabajo previo de despliegue); este script solo escribe filas, nunca
  // toca el schema.
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: false,
    entities: [PuntoResiduo, PuntoAsignacion, RutaSemanal, Proceso],
  });
  await dataSource.initialize();

  const puntosRepo = dataSource.getRepository(PuntoResiduo);
  const asignacionesRepo = dataSource.getRepository(PuntoAsignacion);
  const rutasRepo = dataSource.getRepository(RutaSemanal);
  const procesosRepo = dataSource.getRepository(Proceso);

  let procesosMigrados = 0;
  for (const p of procesosRes.rows) {
    await procesosRepo.upsert(
      {
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion || undefined,
        createdByUserId: p.createdByUserId,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      } as any,
      ['id'],
    );
    procesosMigrados++;
  }
  console.log(`[MIGRACION] ${procesosMigrados} procesos migrados/actualizados.`);

  // Idempotencia POR REGISTRO (upsert por id) — correr de nuevo retoma sin
  // duplicar ni requerir limpiar nada primero.
  const BATCH_SIZE = 25;
  let migrados = 0;
  const sinResiduosDetectados: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const lote = rows.slice(i, i + BATCH_SIZE);
    for (const row of lote) {
      const residuos = mapResiduos(row);
      if (residuos.length === 0) sinResiduosDetectados.push(row.id);

      await puntosRepo.upsert(
        {
          id: row.id, // preserva el UUID original — punto_asignacion sigue apuntando al punto correcto
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
        } as any,
        ['id'],
      );
      migrados++;
    }
    console.log(`[MIGRACION] [progreso] puntos_residuo: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  console.log(`[MIGRACION] ${migrados} puntos migrados/actualizados en la base de ambiental.`);
  if (sinResiduosDetectados.length > 0) {
    console.warn(`[MIGRACION] ${sinResiduosDetectados.length} puntos sin residuos detectables — revisar manualmente: ${sinResiduosDetectados.join(', ')}`);
  }

  let rutasMigradas = 0;
  for (const r of rutasRes.rows) {
    const paradas = (r.paradas || []).map((p: any) => {
      const { activityId, ...rest } = p;
      return { puntoId: activityId, ...rest };
    });
    await rutasRepo.upsert(
      {
        id: r.id,
        gestorId: r.gestorId,
        semanaInicio: r.semanaInicio,
        semanaFin: r.semanaFin,
        estado: r.estado,
        paradas,
        segmentos: r.segmentos || [],
        arrastre: r.arrastre || [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      } as any,
      ['id'],
    );
    rutasMigradas++;
  }
  console.log(`[MIGRACION] ${rutasMigradas} rutas semanales migradas/actualizadas.`);

  let asignacionesMigradas = 0;
  for (const a of asignacionesRes.rows) {
    await asignacionesRepo.upsert(
      {
        puntoResiduoId: a.activityId,
        gestorId: a.gestorId,
        updatedByUserId: a.updatedByUserId,
        updatedAt: a.updatedAt,
      } as any,
      ['puntoResiduoId'],
    );
    asignacionesMigradas++;
  }
  console.log(`[MIGRACION] ${asignacionesMigradas} asignaciones migradas/actualizadas.`);

  console.log('[MIGRACION] Resumen:');
  console.log(`  puntos_residuo: ${migrados} (origen: ${rows.length})`);
  console.log(`  ruta_semanal: ${rutasMigradas} (origen: ${rutasRes.rows.length})`);
  console.log(`  punto_asignacion: ${asignacionesMigradas} (origen: ${asignacionesRes.rows.length})`);
  console.log(`  procesos: ${procesosMigrados} (origen: ${procesosRes.rows.length})`);

  await dataSource.destroy();
}

migrate().catch((err) => {
  console.error('[MIGRACION] Error:', err);
  process.exit(1);
});
