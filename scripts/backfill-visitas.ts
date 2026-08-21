import 'dotenv/config';
import { crearDataSource, describirDestino } from './lib/backfill-datasource';
import { PuntoResiduo } from '../src/puntos/entities/punto-residuo.entity';
import { VisitaPunto } from '../src/visitas/entities/visita-punto.entity';
import { PuntoAsignacion } from '../src/asignaciones/entities/punto-asignacion.entity';
import {
  extraerVisitasDePunto, filtrarNuevas, claveDia, type VisitaSintetica,
} from '../src/visitas/lib/backfill-visitas.util';

// Reconstruye el historial de visitas_punto desde el JSONB de residuos.
//
// La tabla se creo el 2026-08-18 y el desempeño depende solo de ella, asi que
// todo el trabajo anterior de los gestores figuraba como no hecho. Ver
// src/visitas/lib/backfill-visitas.util.ts para las reglas de extraccion.
//
//   npm run backfill:visitas                        (dry-run: no escribe)
//   npm run backfill:visitas -- --apply
//   npm run backfill:visitas -- --gestor=<uuid>
//   npm run backfill:visitas -- --desde=2026-01-01
//   npm run backfill:visitas -- --apply --limpiar-huerfanas

function flag(nombre: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${nombre}=`));
  return arg ? arg.split('=')[1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const limpiarHuerfanas = process.argv.includes('--limpiar-huerfanas');
  const soloGestor = flag('gestor');
  const desde = flag('desde') ? new Date(`${flag('desde')}T00:00:00.000Z`) : null;

  const dataSource = crearDataSource([PuntoResiduo, VisitaPunto, PuntoAsignacion]);
  console.log(`[VISITAS] Base de datos: ${describirDestino()}`);
  console.log(`[VISITAS] Modo: ${apply ? 'APLICAR (escribe)' : 'dry-run (no escribe)'}`);

  await dataSource.initialize();
  const puntosRepo = dataSource.getRepository(PuntoResiduo);
  const visitasRepo = dataSource.getRepository(VisitaPunto);
  const asignacionesRepo = dataSource.getRepository(PuntoAsignacion);

  const puntos = await puntosRepo.find();
  const existentes = await visitasRepo.find();
  console.log(`[VISITAS] ${puntos.length} puntos, ${existentes.length} visitas ya registradas.`);

  const idsExistentes = new Set(existentes.map((v) => v.id));
  const clavesDiaExistentes = new Set(existentes.map((v) => claveDia({
    puntoResiduoId: v.puntoResiduoId, gestorId: v.gestorId, fecha: new Date(v.fecha),
  })));

  let candidatas: VisitaSintetica[] = puntos.flatMap(extraerVisitasDePunto);
  if (soloGestor) candidatas = candidatas.filter((v) => v.gestorId === soloGestor);
  if (desde) candidatas = candidatas.filter((v) => v.fecha >= desde);

  const nuevas = filtrarNuevas(candidatas, idsExistentes, clavesDiaExistentes);

  const contar = (clave: (v: VisitaSintetica) => string) => {
    const mapa = new Map<string, number>();
    for (const v of nuevas) mapa.set(clave(v), (mapa.get(clave(v)) || 0) + 1);
    return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  };

  console.log(`[VISITAS] Candidatas: ${candidatas.length} — nuevas a insertar: ${nuevas.length}`);

  console.log('[VISITAS] Por origen:');
  for (const [origen, n] of contar((v) => v.origen)) console.log(`  ${origen}: ${n}`);

  console.log('[VISITAS] Por semana:');
  for (const [semana, n] of contar((v) => v.semanaISO)) console.log(`  ${semana}: ${n}`);

  const porGestor = contar((v) => v.gestorId).sort((a, b) => b[1] - a[1]);
  console.log(`[VISITAS] Por gestor (top 20 de ${porGestor.length}):`);
  for (const [gestor, n] of porGestor.slice(0, 20)) console.log(`  ${gestor}: ${n}`);

  const asignados = new Set((await asignacionesRepo.find()).map((a) => a.puntoResiduoId));
  const sinAsignacion = new Set(nuevas.filter((v) => !asignados.has(v.puntoResiduoId)).map((v) => v.puntoResiduoId));
  console.log(`[VISITAS] Visitas sobre puntos hoy sin asignacion: ${sinAsignacion.size} puntos.`);

  const idsPuntos = new Set(puntos.map((p) => p.id));
  const huerfanas = existentes.filter((v) => !idsPuntos.has(v.puntoResiduoId));
  console.log(`[VISITAS] Visitas huerfanas (punto ya borrado): ${huerfanas.length}`);

  if (!apply) {
    console.log('[VISITAS] Dry-run — no se escribio nada. Correr con --apply para aplicar.');
    await dataSource.destroy();
    return;
  }

  // ON CONFLICT DO NOTHING sobre la PK: el id es determinístico, así que
  // correr el script dos veces no duplica.
  const LOTE = 500;
  for (let i = 0; i < nuevas.length; i += LOTE) {
    const lote = nuevas.slice(i, i + LOTE).map((v) => ({
      id: v.id,
      puntoResiduoId: v.puntoResiduoId,
      gestorId: v.gestorId,
      fecha: v.fecha,
      semanaISO: v.semanaISO,
    }));
    await visitasRepo.createQueryBuilder().insert().values(lote).orIgnore().execute();
  }
  console.log(`[VISITAS] Insertadas ${nuevas.length} visitas.`);

  if (limpiarHuerfanas && huerfanas.length > 0) {
    await visitasRepo.remove(huerfanas);
    console.log(`[VISITAS] Eliminadas ${huerfanas.length} visitas huerfanas.`);
  }

  await dataSource.destroy();
}

main().catch((e) => {
  console.error('[VISITAS] Error:', e);
  process.exit(1);
});
