import 'dotenv/config';
import { crearDataSource, describirDestino } from './lib/backfill-datasource';
import { PuntoResiduo } from '../src/puntos/entities/punto-residuo.entity';
import { BarriosService } from '../src/catalogos/barrios.service';

// Recalcula el barrio de los puntos que quedaron guardados sin uno (o con uno
// fuera del catalogo) mientras el KML de barrios no estaba disponible en el
// frontend. Resuelve por lat/lng contra boundaries/doc.kml.
//
//   npm run backfill:barrios              (dry-run: no escribe nada)
//   npm run backfill:barrios -- --apply   (aplica los cambios)

async function main() {
  const apply = process.argv.includes('--apply');

  const dataSource = crearDataSource([PuntoResiduo]);
  console.log(`[BARRIOS] Base de datos: ${describirDestino()}`);
  console.log(`[BARRIOS] Modo: ${apply ? 'APLICAR (escribe)' : 'dry-run (no escribe)'}`);

  await dataSource.initialize();
  const repo = dataSource.getRepository(PuntoResiduo);
  const barrios = new BarriosService();

  const todos = await repo.find();
  const sinBarrio = todos.filter((p) => !barrios.esBarrioValido(p.barrio));

  console.log(`[BARRIOS] ${todos.length} puntos en total, ${sinBarrio.length} sin barrio valido.`);

  const resueltos: Array<{ punto: PuntoResiduo; barrio: string }> = [];
  const fueraDePoligono: PuntoResiduo[] = [];

  for (const punto of sinBarrio) {
    const barrio = barrios.resolverPorCoordenada(punto.lat, punto.lng);
    if (barrio) resueltos.push({ punto, barrio });
    else fueraDePoligono.push(punto);
  }

  const porBarrio = new Map<string, number>();
  for (const { barrio } of resueltos) porBarrio.set(barrio, (porBarrio.get(barrio) || 0) + 1);

  console.log(`[BARRIOS] Resueltos por coordenada: ${resueltos.length}`);
  for (const [barrio, n] of [...porBarrio.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${barrio}: ${n}`);
  }
  console.log(`[BARRIOS] Fuera de todos los poligonos: ${fueraDePoligono.length}`);
  for (const p of fueraDePoligono.slice(0, 20)) {
    console.log(`  #${p.pointNumber ?? '—'} (${p.lat}, ${p.lng}) id=${p.id}`);
  }
  if (fueraDePoligono.length > 20) console.log(`  ... y ${fueraDePoligono.length - 20} mas`);

  if (!apply) {
    console.log('[BARRIOS] Dry-run — no se escribio nada. Correr con --apply para aplicar.');
    await dataSource.destroy();
    return;
  }

  for (const { punto, barrio } of resueltos) {
    await repo.update(punto.id, { barrio });
  }
  console.log(`[BARRIOS] Actualizados ${resueltos.length} puntos.`);

  await dataSource.destroy();
}

main().catch((e) => {
  console.error('[BARRIOS] Error:', e);
  process.exit(1);
});
