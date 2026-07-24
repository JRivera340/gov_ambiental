import 'dotenv/config';
import { DataSource } from 'typeorm';
import { getEnv } from '../src/config/env';
import { PuntoResiduo, EstadoPunto } from '../src/puntos/entities/punto-residuo.entity';

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
    entities: [PuntoResiduo],
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(PuntoResiduo);

  const existentes = await repo.count();
  if (existentes > 0) {
    console.log(`[SEED] Ya hay ${existentes} puntos — no se duplica.`);
    await dataSource.destroy();
    return;
  }

  await repo.save(
    repo.create({
      createdByUserId: '00000000-0000-0000-0000-000000000001',
      status: EstadoPunto.BORRADOR,
      dateTime: new Date(),
      lat: 4.596389,
      lng: -74.076111,
      barrio: 'Barrio de prueba',
      photos: [],
      residuos: [
        {
          id: 'residuo-ficticio-1',
          tipoResiduo: 'Escombros',
          quienDispuso: 'Desconocido',
          dateTime: new Date().toISOString(),
          percibeOlores: false,
          percibeVectores: false,
          areaLinealMetros: 3,
          photos: [],
          recogido: false,
        },
      ],
    }),
  );

  console.log('[SEED] Punto de residuo ficticio creado.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
