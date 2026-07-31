import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import {
  PuntoResiduo, EstadoPunto, ResiduoEntry,
  FrecuenciaAcumulacion, TipoZona, TipoSuelo, CamarasPunto,
  IdentificacionGenerador, TipoGenerador, MetodoIdentificacion,
} from '../src/puntos/entities/punto-residuo.entity';
import { PuntoAsignacion } from '../src/asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../src/rutas-semanales/entities/ruta-semanal.entity';
import { Proceso } from '../src/procesos/entities/proceso.entity';

// Migración de UNA SOLA VEZ (batch) desde el hub (gov-espacio-publico) hacia
// la base propia de ambiental. Lee del hub en SOLO LECTURA (regla permanente,
// ver CLAUDE.md/PLAN-MAESTRO.md) y escribe únicamente en la base de
// ambiental. No modifica ni borra nada en el hub.
//
// Migra: puntos_residuo (con las 26 columnas del formulario fijo, ver
// ESTADO-EXTRACCION.md), residuos y notas embebidas, ruta_semanal,
// punto_asignacion. Criterio de alcance: operativoCategoria = 'AMBIENTAL'
// (decisión ya tomada, ver ESTADO-EXTRACCION.md/PLAN-MAESTRO.md — el criterio
// amplio, no el subtipo estrecho).
//
// Variables esperadas en .env.migration (credenciales de SOLO LECTURA del
// hub, nunca commiteadas):
//   OLD_DB_HOST=...
//   OLD_DB_PORT=5432
//   OLD_DB_USERNAME=...
//   OLD_DB_PASSWORD=...
//   OLD_DB_DATABASE=...
//   OLD_DB_SSL=true   (default true; poner false solo si la BD vieja no usa SSL)
const migrationEnvPath = path.join(__dirname, '..', '.env.migration');
if (fs.existsSync(migrationEnvPath)) {
  for (const line of fs.readFileSync(migrationEnvPath, 'utf-8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

// Mapa id-de-pregunta -> nombre de campo, capturado 2026-07-29 desde la
// encuesta real "AMBIENTAL - Identificación de Puntos de Acumulación de
// Residuos" en gov_encuestas_publico (ver ESTADO-EXTRACCION.md). El frontend
// del hub guarda operativoDataValues por ID de pregunta (UUID), no por
// nombre - dynamicAnswers real usa estas mismas claves. Es un snapshot fijo
// a propósito: refleja cómo quedaron codificados los datos HISTÓRICOS, no
// depende de que la encuesta siga existiendo en el futuro.
const QUESTION_ID_TO_NAME: Record<string, string> = {
  '6603ae6e-8b59-45ec-9db5-ba46ab9267c3': 'frecuenciaAcumulacion',
  '45050c65-622c-4d7d-8f96-807da08ad00b': 'observaciones',
  '34b88df3-12d0-4eeb-adb0-c14a78f37b0c': 'entornoEscolar',
  'c8d4ea3e-25eb-4c4c-9110-f9cb71c2932c': 'nombreEntornoEscolar',
  '38f7adb9-0dba-4286-8d81-e45d3beb404b': 'especificarEntorno',
  'b8661859-0fb6-4146-9876-00538063ef24': 'tipoZona',
  '5fa498dd-80b7-4569-87d9-689c40c88f2f': 'tipoSuelo',
  '0e65abff-8fd4-4c54-a1c5-adb681ef7bc8': 'condicionesZona',
  '2c70d100-6337-4069-8f19-0c6aa1dd3652': 'poblacionHabitanteCalle',
  '0458be33-69c7-4695-8f2c-753078349a4c': 'factoresAcumulacion',
  'aef3f316-1ea5-4907-97dd-24256fbc5913': 'camarasPunto',
  'fd3cdf52-239a-43b6-b963-e2eed861f1db': 'operadorAseo',
  'b7d6bf12-e714-4d45-aa3e-c3395c3544d4': 'recoleccionPuertaAPuerta',
  'a0bfda9f-131d-4815-8905-eb490ef2df54': 'm2Invasion',
  '4a0151c2-e7c7-45db-b2b7-ab76254826de': 'actoresIndisciplina',
  '5254933e-58a8-464b-ab55-117ab5a7b2a4': 'intervencionesPropuestas',
  'b3a041b2-1b60-4b26-94a9-a6fbd9c40196': 'identificacionGenerador',
  '5660312d-3749-4914-9f48-c0b6be47c339': 'tipoGenerador',
  '3a1745bf-c288-467b-b93f-fc00c4e9bc92': 'nombreResponsable',
  'c23c9b53-b570-41bd-a914-807ad664f7e3': 'direccionResponsable',
  'd1a508e9-8e4b-41f0-b599-3d7972d8ab81': 'observoDisposicion',
  'ceba726b-f481-432a-8f68-1344c02e5f39': 'fechaObservacion',
  'd664fba9-f8cc-4e76-a1fc-be35abf12df9': 'metodoIdentificacion',
  '9d9ac6d8-ce07-4ea1-bb13-824c98675e08': 'actoresEstrategicos',
  'dfac2ebc-b00f-4a35-8758-2477b740be42': 'telefonoActor',
  'a7349775-70d5-4380-b4f0-413f63c8a64f': 'intervencionesRecomendadas',
};

const BOOLEAN_FIELDS = new Set(['entornoEscolar', 'poblacionHabitanteCalle', 'recoleccionPuertaAPuerta', 'observoDisposicion']);
const DATE_FIELDS = new Set(['fechaObservacion']);
// MULTISELECT en el formulario - la columna es text[]. Datos viejos del hub a
// veces guardan un string suelto en vez de un array de un elemento (p. ej.
// "N/A") - se normaliza a array en vez de romper el insert.
const ARRAY_FIELDS = new Set(['condicionesZona', 'factoresAcumulacion', 'actoresEstrategicos', 'intervencionesRecomendadas']);
const ENUM_VALUES: Record<string, Set<string>> = {
  frecuenciaAcumulacion: new Set(Object.values(FrecuenciaAcumulacion)),
  tipoZona: new Set(Object.values(TipoZona)),
  tipoSuelo: new Set(Object.values(TipoSuelo)),
  camarasPunto: new Set(Object.values(CamarasPunto)),
  identificacionGenerador: new Set(Object.values(IdentificacionGenerador)),
  tipoGenerador: new Set(Object.values(TipoGenerador)),
  metodoIdentificacion: new Set(Object.values(MetodoIdentificacion)),
};

function coerceValue(name: string, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (BOOLEAN_FIELDS.has(name)) {
    if (typeof raw === 'boolean') return raw;
    return String(raw).toLowerCase() === 'true';
  }
  if (DATE_FIELDS.has(name)) {
    const d = new Date(raw as string);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (ARRAY_FIELDS.has(name)) {
    if (Array.isArray(raw)) return raw;
    return [String(raw)];
  }
  const enumSet = ENUM_VALUES[name];
  if (enumSet && !enumSet.has(String(raw))) {
    // Valor que no coincide con ningun enum conocido (dato viejo/inconsistente
    // en el hub) - se descarta en vez de romper el insert.
    return undefined;
  }
  return raw;
}

// Extrae los 26 campos del formulario fijo desde dynamicAnswers, sin importar
// si quedaron guardados por ID de pregunta (UUID, el caso mas comun en datos
// reales), por nombre plano (formato legado mas viejo), o no estan presentes.
function mapCamposFormularioFijo(dynamicAnswers: any): Record<string, unknown> {
  const da = dynamicAnswers || {};
  const byName: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(da)) {
    const name = QUESTION_ID_TO_NAME[key];
    if (name) byName[name] = value;
  }
  const result: Record<string, unknown> = {};
  for (const name of new Set(Object.values(QUESTION_ID_TO_NAME))) {
    const raw = byName[name] !== undefined ? byName[name] : da[name];
    const coerced = coerceValue(name, raw);
    if (coerced !== undefined) result[name] = coerced;
  }
  return result;
}

function mapResiduos(dynamicAnswers: any, fallbackPhotos: string[] | null): ResiduoEntry[] {
  const da = dynamicAnswers || {};
  if (Array.isArray(da.residuos) && da.residuos.length > 0) {
    return da.residuos as ResiduoEntry[];
  }
  // Formato legado plano (una sola entrada de residuo al nivel superior,
  // visto en filas viejas del hub sin el array residuos[]).
  if (da.tipoResiduo) {
    return [
      {
        id: 'legacy-0',
        tipoResiduo: da.tipoResiduo,
        quienDispuso: da.quienDispuso || '',
        dateTime: new Date().toISOString(),
        percibeOlores: da.percibeOlores ?? false,
        percibeVectores: da.percibeVectores ?? false,
        areaLinealMetros: da.areaLinealMetros || 0,
        observaciones: da.observaciones || '',
        photos: fallbackPhotos || [],
        recogido: false,
      },
    ];
  }
  return [];
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
  results: string | null;
  entidadResponsable: string | null;
  entidadesAcompanantes: string[] | null;
  isGroupOperativo: boolean;
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
      results, "entidadResponsable", "entidadesAcompanantes", "isGroupOperativo",
      "validatorUserId", "validatedAt", "validationNotes", "publishedAt",
      "processId", "descripcionAntes", "descripcionDespues",
      "revisadoPorUserId", "revisadoPorNombre", "fechaRevision",
      "pointNumber", "categorySeq", "dynamicAnswers", "createdAt", "updatedAt"
    FROM activities
    WHERE "operativoCategoria" = 'AMBIENTAL'
    ORDER BY "createdAt" ASC
  `);
  console.log(`[MIGRACION] ${rows.length} puntos ambientales encontrados en el hub (operativoCategoria = 'AMBIENTAL').`);

  const gestoresRes = await oldClient.query<{ activityId: string; userId: string }>(`
    SELECT "activityId", "userId" FROM activity_gestores
    WHERE "activityId" IN (SELECT id FROM activities WHERE "operativoCategoria" = 'AMBIENTAL')
  `);
  const gestoresPorActividad = new Map<string, string[]>();
  for (const r of gestoresRes.rows) {
    const arr = gestoresPorActividad.get(r.activityId) || [];
    arr.push(r.userId);
    gestoresPorActividad.set(r.activityId, arr);
  }
  console.log(`[MIGRACION] ${gestoresRes.rows.length} filas de gestores involucrados (activity_gestores) para actividades ambientales.`);

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

  // Procesos (agrupan puntos/actividades) — mismo shape en ambos lados
  // (tabla "processes" en el hub, "procesos" acá). Alcance: solo los
  // procesos referenciados por al menos un punto ambiental (por processId),
  // no toda la tabla del hub (que también agrupa IVC/Espacio Público/PYBA).
  const procesosRes = await oldClient.query(`
    SELECT id, nombre, descripcion, "createdByUserId", status, "createdAt", "updatedAt"
    FROM processes
    WHERE id IN (
      SELECT DISTINCT "processId" FROM activities
      WHERE "operativoCategoria" = 'AMBIENTAL' AND "processId" IS NOT NULL
    )
  `);
  console.log(`[MIGRACION] ${procesosRes.rows.length} procesos encontrados referenciados por puntos ambientales.`);

  await oldClient.end();

  // Base de ambiental: NUNCA synchronize contra producción (regla permanente,
  // ver CLAUDE.md). Las 26 columnas ya están migradas con su propia migración
  // versionada antes de correr este script.
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

  // Procesos primero: puntos_residuo.processId los referencia (FK logica).
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

  // Idempotencia POR REGISTRO (upsert por id), no por tabla. Si el proceso se
  // corta a mitad, volver a correrlo retoma sin duplicar ni requerir limpiar
  // nada primero — los registros ya migrados se reescriben igual (mismo
  // resultado), y los que faltan se insertan. Requisito para el corte real,
  // ver PLAN-MAESTRO.md.
  const BATCH_SIZE = 25;
  let migrados = 0;
  const sinResiduosDetectados: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const lote = rows.slice(i, i + BATCH_SIZE);
    for (const row of lote) {
      const residuos = mapResiduos(row.dynamicAnswers, row.photos);
      if (residuos.length === 0) sinResiduosDetectados.push(row.id);
      const camposFijos = mapCamposFormularioFijo(row.dynamicAnswers);
      const gestoresInvolucradosIds = gestoresPorActividad.get(row.id) || [];
      const ultimoSeguimientoAt = row.dynamicAnswers?.ultimoSeguimientoAt
        ? new Date(row.dynamicAnswers.ultimoSeguimientoAt)
        : undefined;

      await puntosRepo.upsert(
        {
          id: row.id, // preserva el UUID original — necesario para que punto_asignacion siga apuntando al punto correcto
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
          results: row.results || undefined,
          entidadResponsable: row.entidadResponsable || undefined,
          entidadesAcompanantes: row.entidadesAcompanantes || undefined,
          isGroupOperativo: row.isGroupOperativo || gestoresInvolucradosIds.length > 0,
          gestoresInvolucradosIds: gestoresInvolucradosIds.length > 0 ? gestoresInvolucradosIds : undefined,
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
          ultimoSeguimientoAt,
          ...camposFijos,
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
  for (let i = 0; i < rutasRes.rows.length; i += BATCH_SIZE) {
    const lote = rutasRes.rows.slice(i, i + BATCH_SIZE);
    for (const r of lote) {
      // paradas del hub usan la clave "activityId"; en ambiental es "puntoId".
      // Mismo valor de UUID (los puntos se migraron preservando su id), solo
      // cambia el nombre de la clave dentro del JSON.
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
    console.log(`[MIGRACION] [progreso] ruta_semanal: ${Math.min(i + BATCH_SIZE, rutasRes.rows.length)}/${rutasRes.rows.length}`);
  }
  console.log(`[MIGRACION] ${rutasMigradas} rutas semanales migradas/actualizadas.`);

  let asignacionesMigradas = 0;
  for (let i = 0; i < asignacionesRes.rows.length; i += BATCH_SIZE) {
    const lote = asignacionesRes.rows.slice(i, i + BATCH_SIZE);
    for (const a of lote) {
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
    console.log(`[MIGRACION] [progreso] punto_asignacion: ${Math.min(i + BATCH_SIZE, asignacionesRes.rows.length)}/${asignacionesRes.rows.length}`);
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
