import 'dotenv/config';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { PuntoResiduo, EstadoPunto } from '../src/puntos/entities/punto-residuo.entity';
import { Proceso, ProcessStatus } from '../src/procesos/entities/proceso.entity';
import { PuntoAsignacion } from '../src/asignaciones/entities/punto-asignacion.entity';
import { RutaSemanal } from '../src/rutas-semanales/entities/ruta-semanal.entity';
import { limitesSemana } from '../src/rutas-semanales/lib/ruta-semanal.util';
import { TEST_IDENTITIES } from '../src/config/test-identities';

// Seed rico para que quien reciba este repo pueda usar TODO el módulo con
// datos ficticios: puntos en cada estado del ciclo de vida (para practicar
// enviar/aprobar/rechazar/corregir), un proceso, una asignación y una ruta
// semanal — no solo un registro suelto.

async function seed() {
  const env = getEnv();
  const dataSource = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    synchronize: true,
    entities: [PuntoResiduo, Proceso, PuntoAsignacion, RutaSemanal],
  });

  await dataSource.initialize();
  const puntoRepo = dataSource.getRepository(PuntoResiduo);
  const procesoRepo = dataSource.getRepository(Proceso);
  const asignacionRepo = dataSource.getRepository(PuntoAsignacion);
  const rutaRepo = dataSource.getRepository(RutaSemanal);

  const existentes = await puntoRepo.count();
  if (existentes > 0) {
    console.log(`[SEED] Ya hay ${existentes} puntos — no se duplica.`);
    await dataSource.destroy();
    return;
  }

  const gestor = TEST_IDENTITIES.GESTOR_AMBIENTAL;
  const validador = TEST_IDENTITIES.VALIDADOR_AMBIENTAL;
  const ahora = new Date();

  const proceso = await procesoRepo.save(
    procesoRepo.create({
      nombre: 'Proceso de prueba — recolección barrio ficticio',
      descripcion: 'Proceso de ejemplo para ver el seguimiento de varios puntos agrupados.',
      createdByUserId: gestor.id,
      status: ProcessStatus.EN_SEGUIMIENTO,
    }),
  );

  const puntoBorrador = await puntoRepo.save(
    puntoRepo.create({
      createdByUserId: gestor.id,
      status: EstadoPunto.BORRADOR,
      dateTime: ahora,
      lat: 4.596389,
      lng: -74.076111,
      barrio: 'Barrio de prueba 1',
      photos: ['photos/seed/borrador.jpg'],
      results: 'Punto recién detectado, todavía sin enviar a validación.',
      entidadResponsable: 'ALCALDIA_LOCAL',
      residuos: [
        {
          id: randomUUID(),
          tipoResiduo: 'ESCOMBROS',
          quienDispuso: 'COMUNIDAD',
          dateTime: ahora.toISOString(),
          percibeOlores: false,
          percibeVectores: false,
          areaLinealMetros: 3,
          photos: ['photos/seed/residuo1.jpg'],
          recogido: false,
        },
      ],
    }),
  );

  const puntoEnviada = await puntoRepo.save(
    puntoRepo.create({
      createdByUserId: gestor.id,
      status: EstadoPunto.ENVIADA,
      dateTime: ahora,
      lat: 4.598,
      lng: -74.08,
      barrio: 'Barrio de prueba 2',
      photos: ['photos/seed/enviada.jpg'],
      results: 'Punto enviado, esperando revisión del validador.',
      entidadResponsable: 'ALCALDIA_LOCAL',
      entidadesAcompanantes: ['POLICIA'],
      residuos: [
        {
          id: randomUUID(),
          tipoResiduo: 'RESIDUOS_VOLUMINOSOS',
          quienDispuso: 'ESTABLECIMIENTOS_COMERCIALES',
          dateTime: ahora.toISOString(),
          percibeOlores: true,
          percibeVectores: false,
          areaLinealMetros: 8,
          photos: ['photos/seed/residuo2.jpg'],
          recogido: false,
        },
      ],
    }),
  );

  const puntoRechazada = await puntoRepo.save(
    puntoRepo.create({
      createdByUserId: gestor.id,
      status: EstadoPunto.RECHAZADA,
      dateTime: ahora,
      lat: 4.601,
      lng: -74.07,
      barrio: 'Barrio de prueba 3',
      photos: ['photos/seed/rechazada.jpg'],
      results: 'Punto rechazado — falta evidencia clara.',
      validatorUserId: validador.id,
      validatedAt: ahora,
      validationNotes: 'La foto no muestra bien el área afectada, por favor subir una más clara.',
      residuos: [
        {
          id: randomUUID(),
          tipoResiduo: 'PLANTAS',
          quienDispuso: 'OTROS_NO_SE_CONOCE',
          dateTime: ahora.toISOString(),
          percibeOlores: false,
          percibeVectores: true,
          areaLinealMetros: 2,
          photos: ['photos/seed/residuo3.jpg'],
          recogido: false,
        },
      ],
    }),
  );

  const puntoPublicada = await puntoRepo.save(
    puntoRepo.create({
      createdByUserId: gestor.id,
      status: EstadoPunto.PUBLICADA,
      dateTime: ahora,
      lat: 4.603,
      lng: -74.065,
      barrio: 'Barrio de prueba 4',
      photos: ['photos/seed/publicada.jpg'],
      results: 'Punto validado y publicado, con seguimiento parcial de recolección.',
      entidadResponsable: 'ALCALDIA_LOCAL',
      gestoresInvolucradosIds: [],
      isGroupOperativo: false,
      validatorUserId: validador.id,
      validatedAt: ahora,
      publishedAt: ahora,
      pointNumber: 1,
      processId: proceso.id,
      residuos: [
        {
          id: randomUUID(),
          tipoResiduo: 'RESIDUOS_ORDINARIOS',
          quienDispuso: 'VOLQUETAS',
          dateTime: ahora.toISOString(),
          percibeOlores: false,
          percibeVectores: false,
          areaLinealMetros: 5,
          photos: ['photos/seed/residuo4a.jpg'],
          recogido: true,
          fechaRecogida: ahora.toISOString(),
          photosRecogida: ['photos/seed/residuo4a-recogido.jpg'],
          recogidoByUserId: gestor.id,
          recogidoByNombre: gestor.email,
        },
        {
          id: randomUUID(),
          tipoResiduo: 'ESCOMBROS',
          quienDispuso: 'HABITANTES_DE_CALLE',
          dateTime: ahora.toISOString(),
          percibeOlores: true,
          percibeVectores: true,
          areaLinealMetros: 6,
          photos: ['photos/seed/residuo4b.jpg'],
          recogido: false,
          notas: [
            {
              id: randomUUID(),
              fecha: ahora.toISOString(),
              autorId: gestor.id,
              autorNombre: gestor.email,
              texto: 'Pendiente coordinar recolección con volqueta.',
            },
          ],
        },
      ],
    }),
  );

  const todosLosPuntos = [puntoBorrador, puntoEnviada, puntoRechazada, puntoPublicada];
  for (const punto of todosLosPuntos) {
    await asignacionRepo.save(
      asignacionRepo.create({ puntoResiduoId: punto.id, gestorId: gestor.id, updatedByUserId: null }),
    );
  }

  const { inicioISO, finISO } = limitesSemana(ahora);
  await rutaRepo.save(
    rutaRepo.create({
      gestorId: gestor.id,
      semanaInicio: new Date(inicioISO),
      semanaFin: new Date(finISO),
      estado: 'en_progreso',
      paradas: todosLosPuntos.map((p) => ({
        puntoId: p.id,
        lat: p.lat,
        lng: p.lng,
        barrio: p.barrio,
        visitado: p.status === EstadoPunto.PUBLICADA,
      })),
      segmentos: [],
      arrastre: [],
    }),
  );

  console.log('[SEED] Listo:');
  console.log(`  - 1 proceso ("${proceso.nombre}")`);
  console.log(`  - 4 puntos: BORRADOR, ENVIADA, RECHAZADA, PUBLICADA (con residuos en distintos estados)`);
  console.log(`  - 4 asignaciones (todas al gestor de prueba)`);
  console.log(`  - 1 ruta semanal en progreso con los 4 puntos como paradas`);
  console.log('');
  console.log('  Identidades de prueba (usar con "npm run token:test <ROL>"):');
  console.log(`  - GESTOR_AMBIENTAL: ${gestor.email}`);
  console.log(`  - VALIDADOR_AMBIENTAL: ${validador.email}`);
  console.log(`  - ADMIN: ${TEST_IDENTITIES.ADMIN.email}`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
