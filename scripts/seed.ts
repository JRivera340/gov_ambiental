import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { PuntoResiduo, EstadoPunto, ResiduoEntry } from '../src/puntos/entities/punto-residuo.entity';
import { Proceso, ProcessStatus } from '../src/procesos/entities/proceso.entity';
import { PuntoAsignacion } from '../src/asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../src/rutas-semanales/entities/ruta-semanal.entity';
import { limitesSemana } from '../src/rutas-semanales/lib/ruta-semanal.util';
import { UserEntity } from '../src/users/entities/user.entity';
import { Role } from '../src/common/enums/role.enum';

// Seed para el entregable de donación: crea usuarios de prueba (login propio,
// con contraseña) y ~30 puntos ficticios en distintos estados, con barrios y
// coordenadas reales de Santa Fe (dato público, no personal) pero SIN ningún
// dato de persona real — nombres, correos y observaciones son todos
// inventados. Ver docs/README.md para las credenciales.
export const PASSWORD_DE_PRUEBA = 'Ambiental2026!';

const BARRIOS_SEED = [
  'LAS CRUCES', 'LAS AGUAS', 'LA CANDELARIA', 'LA MACARENA', 'LOURDES',
  'SAN BERNARDO', 'LA PERSEVERANCIA', 'LAS NIEVES', 'EL DORADO', 'SAMPER',
  'GIRARDOT', 'LA MERCED', 'BOSQUE IZQUIERDO', 'PARQUE NACIONAL', 'LOS LACHES',
];

const TIPOS_RESIDUO = ['RESIDUOS_ORDINARIOS', 'RESIDUOS_VOLUMINOSOS', 'ESCOMBROS', 'RESIDUOS_ORGANICOS', 'PLANTAS'];
const QUIEN_DISPUSO = ['COMUNIDAD', 'ESTABLECIMIENTOS_COMERCIALES', 'VOLQUETAS', 'HABITANTES_DE_CALLE', 'OTROS_NO_SE_CONOCE'];
const ENTIDADES_SEED = ['UAESP', 'Promoambiental', 'Alcaldía Local de Santa Fé', 'IVC'];
const OBSERVACIONES_SEED = [
  'Acumulación recurrente sobre el andén, cerca de la esquina.',
  'Escombros de una obra vecina, sin identificar responsable directo.',
  'Punto crítico histórico del sector, ya reportado antes.',
  'Residuos mezclados con material vegetal de poda.',
  'Zona de difícil acceso para el vehículo recolector.',
  'Se observa acumulación creciente en las últimas semanas.',
  'Cerca de un colegio, requiere atención prioritaria.',
  'Reportado por la comunidad a través de la línea de atención.',
];

function rand<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// 30 coordenadas verificadas con point-in-polygon contra el KMZ real de la
// localidad Santa Fe (frontend/public/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz,
// mismo algoritmo de frontend/src/utils/boundaryValidation.ts) — no son un
// bounding box aproximado, las 30 caen efectivamente dentro del polígono.
// Dato público (coordenadas geográficas), no de ninguna persona.
const COORDENADAS_SANTA_FE: [number, number][] = [
  [4.571468, -74.018109], [4.597436, -74.043508], [4.593376, -74.038645],
  [4.616399, -74.064062], [4.60715, -74.021301], [4.617322, -74.013451],
  [4.603422, -74.036287], [4.595858, -74.032386], [4.59804, -74.060054],
  [4.619574, -74.055135], [4.603519, -74.057755], [4.61746, -74.050748],
  [4.580696, -74.006947], [4.591731, -74.015436], [4.637781, -74.02212],
  [4.611029, -74.006311], [4.618991, -73.994918], [4.58196, -74.029352],
  [4.584864, -73.997132], [4.619055, -74.023673], [4.617028, -74.023506],
  [4.633174, -74.018622], [4.593229, -74.046877], [4.586059, -74.002557],
  [4.642424, -74.026186], [4.582145, -74.000331], [4.608113, -74.019315],
  [4.616739, -74.063156], [4.583278, -74.067833], [4.575099, -74.031552],
];

function coordCercaDeSantaFe(seed: number): { lat: number; lng: number } {
  const [lat, lng] = COORDENADAS_SANTA_FE[seed % COORDENADAS_SANTA_FE.length];
  return { lat, lng };
}

function crearResiduo(seed: number, recogido: boolean): ResiduoEntry {
  return {
    id: randomUUID(),
    tipoResiduo: rand(TIPOS_RESIDUO, seed) as any,
    quienDispuso: rand(QUIEN_DISPUSO, seed + 1) as any,
    dateTime: new Date().toISOString(),
    percibeOlores: seed % 3 === 0,
    percibeVectores: seed % 4 === 0,
    areaLinealMetros: 2 + (seed % 10),
    observaciones: rand(OBSERVACIONES_SEED, seed + 2),
    photos: [`photos/seed/residuo-${seed}.jpg`],
    recogido,
    ...(recogido ? { fechaRecogida: new Date().toISOString(), photosRecogida: [`photos/seed/residuo-${seed}-recogido.jpg`] } : {}),
  } as ResiduoEntry;
}

async function seed() {
  const env = getEnv();
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: false,
    entities: [PuntoResiduo, Proceso, PuntoAsignacion, RutaSemanal, UserEntity],
  });

  await dataSource.initialize();
  const puntoRepo = dataSource.getRepository(PuntoResiduo);
  const procesoRepo = dataSource.getRepository(Proceso);
  const asignacionRepo = dataSource.getRepository(PuntoAsignacion);
  const rutaRepo = dataSource.getRepository(RutaSemanal);
  const userRepo = dataSource.getRepository(UserEntity);

  const existentes = await puntoRepo.count();
  if (existentes > 0) {
    console.log(`[SEED] Ya hay ${existentes} puntos — no se duplica.`);
    await dataSource.destroy();
    return;
  }

  // ── Usuarios de prueba (ficticios, login propio) ──
  const passwordHash = await bcrypt.hash(PASSWORD_DE_PRUEBA, 10);
  const usuarios = [
    { id: randomUUID(), name: 'Admin', lastname: 'De Prueba', email: 'admin@ejemplo.local', role: Role.ADMIN },
    { id: randomUUID(), name: 'Validador', lastname: 'De Prueba', email: 'validador@ejemplo.local', role: Role.VALIDADOR_AMBIENTAL },
    { id: randomUUID(), name: 'Gestor', lastname: 'Uno', email: 'gestor1@ejemplo.local', role: Role.GESTOR_AMBIENTAL },
    { id: randomUUID(), name: 'Gestor', lastname: 'Dos', email: 'gestor2@ejemplo.local', role: Role.GESTOR_AMBIENTAL },
    { id: randomUUID(), name: 'Gestor', lastname: 'Tres', email: 'gestor3@ejemplo.local', role: Role.GESTOR_AMBIENTAL },
  ];
  for (const u of usuarios) {
    await userRepo.save(userRepo.create({ ...u, passwordHash, active: true }));
  }
  const admin = usuarios[0];
  const validador = usuarios[1];
  const gestores = usuarios.slice(2);

  // ── Proceso de ejemplo ──
  const proceso = await procesoRepo.save(
    procesoRepo.create({
      nombre: 'Proceso de prueba — recolección zona centro',
      descripcion: 'Proceso ficticio de ejemplo para ver el seguimiento de varios puntos agrupados.',
      createdByUserId: gestores[0].id,
      status: ProcessStatus.EN_SEGUIMIENTO,
    }),
  );

  // ── 30 puntos en estados variados ──
  const ESTADOS_CICLO: EstadoPunto[] = [
    EstadoPunto.BORRADOR, EstadoPunto.ENVIADA, EstadoPunto.APROBADA, EstadoPunto.RECHAZADA, EstadoPunto.PUBLICADA,
  ];
  const TOTAL_PUNTOS = 30;
  const puntosCreados: PuntoResiduo[] = [];
  let pointNumberSeq = 1;

  for (let i = 0; i < TOTAL_PUNTOS; i++) {
    const status = rand(ESTADOS_CICLO, i);
    const gestor = rand(gestores, i);
    const { lat, lng } = coordCercaDeSantaFe(i);
    const barrio = rand(BARRIOS_SEED, i);
    const esPublicada = status === EstadoPunto.PUBLICADA;
    const esValidada = status === EstadoPunto.APROBADA || status === EstadoPunto.PUBLICADA || status === EstadoPunto.RECHAZADA;

    const residuos = [
      crearResiduo(i, esPublicada && i % 2 === 0),
      ...(i % 3 === 0 ? [crearResiduo(i + 100, false)] : []),
    ];

    const punto = puntoRepo.create({
      createdByUserId: gestor.id,
      status,
      // El número de punto se asigna SIEMPRE al crear (igual que
      // PuntosService.create() en producción) — no solo al publicar. Es el
      // identificador visible del punto en toda la interfaz.
      pointNumber: pointNumberSeq++,
      dateTime: new Date(Date.now() - i * 6 * 3600 * 1000),
      lat, lng, barrio,
      photos: [`photos/seed/punto-${i}.jpg`],
      results: `Punto de prueba #${i + 1} — ${barrio}, generado por el seed.`,
      entidadResponsable: rand(ENTIDADES_SEED, i),
      residuos,
      ...(esValidada ? {
        validatorUserId: validador.id,
        validatedAt: new Date(Date.now() - i * 3 * 3600 * 1000),
      } : {}),
      ...(status === EstadoPunto.RECHAZADA ? {
        validationNotes: 'Rechazado en el seed: falta evidencia fotográfica clara del punto.',
      } : {}),
      ...(esPublicada ? {
        publishedAt: new Date(Date.now() - i * 2 * 3600 * 1000),
        processId: i % 5 === 0 ? proceso.id : undefined,
      } : {}),
    });
    puntosCreados.push(await puntoRepo.save(punto));
  }

  // ── Asignaciones repartidas entre los 3 gestores de prueba ──
  for (let i = 0; i < puntosCreados.length; i++) {
    const gestor = rand(gestores, i);
    await asignacionRepo.save(
      asignacionRepo.create({ puntoResiduoId: puntosCreados[i].id, gestorId: gestor.id, updatedByUserId: null }),
    );
  }

  // ── 2 rutas semanales: una cerrada (semana pasada) y una activa (semana actual) ──
  const ahora = new Date();
  const semanaPasada = new Date(ahora.getTime() - 14 * 86400000);

  const { inicioISO: inicioActualISO, finISO: finActualISO } = limitesSemana(ahora);
  const puntosSemanaActiva = puntosCreados.slice(0, 6);
  await rutaRepo.save(
    rutaRepo.create({
      gestorId: gestores[0].id,
      semanaInicio: new Date(inicioActualISO),
      semanaFin: new Date(finActualISO),
      estado: 'en_progreso',
      paradas: puntosSemanaActiva.map((p) => ({
        puntoId: p.id, lat: p.lat, lng: p.lng, barrio: p.barrio,
        visitado: p.status === EstadoPunto.PUBLICADA,
      })),
      segmentos: [],
      arrastre: [],
    }),
  );

  const { inicioISO: inicioPasadaISO, finISO: finPasadaISO } = limitesSemana(semanaPasada);
  const puntosSemanaCerrada = puntosCreados.slice(6, 12);
  await rutaRepo.save(
    rutaRepo.create({
      gestorId: gestores[1].id,
      semanaInicio: new Date(inicioPasadaISO),
      semanaFin: new Date(finPasadaISO),
      estado: 'completada',
      paradas: puntosSemanaCerrada.map((p) => ({
        puntoId: p.id, lat: p.lat, lng: p.lng, barrio: p.barrio,
        visitado: true,
      })),
      segmentos: [],
      arrastre: [],
    }),
  );

  console.log('[SEED] Listo:');
  console.log(`  - ${usuarios.length} usuarios de prueba (contraseña real, ficticios)`);
  console.log(`  - 1 proceso ("${proceso.nombre}")`);
  console.log(`  - ${TOTAL_PUNTOS} puntos en estados variados (borrador/enviada/aprobada/rechazada/publicada)`);
  console.log(`  - ${puntosCreados.length} asignaciones repartidas entre 3 gestores`);
  console.log('  - 2 rutas semanales (1 activa, 1 completada)');
  console.log('');
  console.log(`  Login de prueba (contraseña igual para todos: "${PASSWORD_DE_PRUEBA}"):`);
  for (const u of usuarios) console.log(`  - ${u.role}: ${u.email}`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
