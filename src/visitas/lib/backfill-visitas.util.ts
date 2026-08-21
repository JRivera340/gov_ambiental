import { createHash } from 'crypto';
import type { PuntoResiduo } from '../../puntos/entities/punto-residuo.entity';
import { isoWeekLabel } from '../../rutas-semanales/lib/plan-semanal.util';

// Reconstruye las visitas historicas a partir del JSONB de residuos.
//
// La tabla visitas_punto se creo el 2026-08-18: todo el seguimiento anterior
// no tiene fila ahi, y como el desempeño se calcula solo con esa tabla, meses
// de trabajo real de los gestores figuraban como no hechos. Los tres eventos
// de la regla de negocio (recogido / residuo nuevo / nota) si quedaron
// registrados dentro del JSONB con autor y fecha, asi que se pueden derivar.

export type OrigenVisita = 'RECOGIDO' | 'CREADO' | 'NOTA';

export type VisitaSintetica = {
  id: string;
  puntoResiduoId: string;
  gestorId: string;
  fecha: Date;
  semanaISO: string;
  origen: OrigenVisita;
};

function fechaValida(valor: unknown): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor as string);
  if (Number.isNaN(fecha.getTime())) return null;
  // Descarta fechas absurdas (campos basura en datos migrados).
  const ano = fecha.getUTCFullYear();
  if (ano < 2015 || ano > 2100) return null;
  return fecha;
}

// UUID determinístico (formato v5) para que el mismo evento produzca siempre
// el mismo id: la PK hace de dedupe y el insert puede ir con
// ON CONFLICT DO NOTHING, sin agregar constraints nuevas a la tabla.
export function idDeterministico(puntoId: string, gestorId: string, fechaISO: string, origen: string): string {
  const hash = createHash('sha1')
    .update(`gov-ambiental:visita:${puntoId}|${gestorId}|${fechaISO}|${origen}`)
    .digest('hex');
  const bytes = hash.slice(0, 32).split('');
  // Version 5 y variante RFC 4122.
  bytes[12] = '5';
  bytes[16] = ((parseInt(bytes[16], 16) & 0x3) | 0x8).toString(16);
  const h = bytes.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// Clave por dia para no duplicar contra las visitas organicas que ya existen
// (mismo punto, mismo gestor, mismo dia). No cambia ningun porcentaje —el
// conteo usa DISTINCT puntoResiduoId— pero mantiene limpia la auditoria.
export function claveDia(v: { puntoResiduoId: string; gestorId: string; fecha: Date }): string {
  const bogota = new Date(v.fecha.getTime() - 5 * 3600000);
  const dia = bogota.toISOString().slice(0, 10);
  return `${v.puntoResiduoId}|${v.gestorId}|${dia}`;
}

export function extraerVisitasDePunto(punto: PuntoResiduo): VisitaSintetica[] {
  const visitas: VisitaSintetica[] = [];

  const agregar = (gestorId: unknown, fechaCruda: unknown, origen: OrigenVisita) => {
    if (typeof gestorId !== 'string' || !gestorId.trim()) return;
    const fecha = fechaValida(fechaCruda);
    if (!fecha) return;
    const fechaISO = fecha.toISOString();
    visitas.push({
      id: idDeterministico(punto.id, gestorId, fechaISO, origen),
      puntoResiduoId: punto.id,
      gestorId,
      fecha,
      semanaISO: isoWeekLabel(fecha),
      origen,
    });
  };

  for (const residuo of punto.residuos || []) {
    if (residuo.recogido) {
      agregar(residuo.recogidoByUserId, residuo.fechaRecogida || residuo.dateTime, 'RECOGIDO');
    }
    // El residuo inicial del registro no siempre trae createdByUserId: en ese
    // caso el autor es quien creo el punto.
    agregar(
      residuo.createdByUserId || punto.createdByUserId,
      residuo.dateTime || punto.dateTime,
      'CREADO',
    );
    for (const nota of residuo.notas || []) {
      agregar(nota.autorId, nota.fecha, 'NOTA');
    }
  }

  return visitas;
}

// Deduplica por id (mismo evento visto dos veces) y contra las claves de dia
// que ya existen en la tabla.
export function filtrarNuevas(
  candidatas: VisitaSintetica[],
  idsExistentes: Set<string>,
  clavesDiaExistentes: Set<string>,
): VisitaSintetica[] {
  const vistas = new Set<string>();
  const nuevas: VisitaSintetica[] = [];
  for (const v of candidatas) {
    if (idsExistentes.has(v.id) || vistas.has(v.id)) continue;
    if (clavesDiaExistentes.has(claveDia(v))) continue;
    vistas.add(v.id);
    nuevas.push(v);
  }
  return nuevas;
}
