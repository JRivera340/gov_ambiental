// DesempenoGestoresPanel.tsx — cumplimiento por gestor en las dos semanas del ciclo
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ambientalService, type DesempenoGestorDTO } from '../../../../services/ambiental.service';
import { usersService } from '../../../../services/users.service';

type Orden = 'cumplimiento' | 'asignados' | 'nombre';

const ORDENES: { key: Orden; label: string }[] = [
  { key: 'cumplimiento', label: 'Menor cumplimiento' },
  { key: 'asignados', label: 'Más puntos' },
  { key: 'nombre', label: 'Nombre' },
];

function pctColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#EAB308';
  return '#e4032e';
}

/** Cumplimiento del ciclo completo: visitas hechas sobre visitas planificadas. */
function pctCiclo(g: DesempenoGestorDTO): number {
  const planificados = g.semanas.reduce((t, s) => t + s.planificados, 0);
  const visitados = g.semanas.reduce((t, s) => t + s.visitados, 0);
  return planificados > 0 ? Math.round((visitados / planificados) * 100) : 0;
}

export const DesempenoGestoresPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<DesempenoGestorDTO[]>([]);
  const [nombrePorId, setNombrePorId] = useState<Record<string, string>>({});
  const [orden, setOrden] = useState<Orden>('cumplimiento');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resumen = await ambientalService.getDesempeno();
      setGestores(resumen.gestores);
    } catch {
      setError('No se pudo cargar el desempeño de gestores. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }

    // Nombres: best-effort desde el hub (mismo endpoint que usa
    // AsignacionPuntosPanel). Si falla, se muestra el id.
    try {
      const lista = await usersService.getGestores();
      setNombrePorId(Object.fromEntries(lista.map(g => [g.id, `${g.name} ${g.lastname}`.trim()])));
    } catch {
      setNombrePorId({});
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const nombreDe = useCallback(
    (gestorId: string) => nombrePorId[gestorId] || `Gestor ${gestorId.slice(0, 8)}`,
    [nombrePorId],
  );

  const ordenados = useMemo(() => {
    const copia = [...gestores];
    if (orden === 'cumplimiento') copia.sort((a, b) => pctCiclo(a) - pctCiclo(b));
    else if (orden === 'asignados') copia.sort((a, b) => b.asignados - a.asignados);
    else copia.sort((a, b) => nombreDe(a.gestorId).localeCompare(nombreDe(b.gestorId), 'es'));
    return copia;
  }, [gestores, orden, nombreDe]);

  const enRiesgo = ordenados.filter(g => pctCiclo(g) < 50).length;

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-5 text-[12px] font-semibold text-neutral-500">
        Cargando desempeño de gestores…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[14px] font-extrabold text-neutral-900 tracking-tight">Desempeño de gestores</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Porcentaje de los puntos de cada semana que ya se visitaron.
            {enRiesgo > 0 && (
              <span className="ml-1 font-semibold text-primary-600">
                {enRiesgo} {enRiesgo === 1 ? 'gestor va' : 'gestores van'} por debajo del 50%.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-neutral-500">Ordenar por</label>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="text-[11px] px-2 py-1.5 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20"
          >
            {ORDENES.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button
            onClick={() => load()}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-primary/40 text-primary font-bold bg-white hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel rounded-xl px-3 py-2 text-[12px] font-semibold text-primary-700 border-l-4 border-l-primary">
          {error}
        </div>
      )}

      {ordenados.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <p className="text-[13px] font-bold text-neutral-700">Todavía no hay gestores con puntos asignados</p>
          <p className="text-[11px] text-neutral-500 mt-1">Asigná puntos desde la vista Asignación para empezar a medir el ciclo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {ordenados.map((g, i) => {
            const total = pctCiclo(g);
            return (
              <article
                key={g.gestorId}
                className="glass-panel admin-lift admin-rise rounded-2xl p-4 flex flex-col gap-3"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-bold text-neutral-900 truncate">{nombreDe(g.gestorId)}</h3>
                    <p className="text-[11px] text-neutral-500 tabular">{g.asignados} puntos asignados</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="tabular text-2xl font-extrabold leading-none" style={{ color: pctColor(total) }}>{total}%</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400 mt-0.5">Ciclo</p>
                  </div>
                </div>

                {/* Una fila por semana: así una visita a un punto de la semana
                    siguiente se ve como avance de esa semana, en vez de
                    perderse como pasaba con el plan de una sola mitad. */}
                <div className="flex flex-col gap-2.5">
                  {g.semanas.map((s) => (
                    <div key={s.inicioISO}>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-neutral-600 truncate">
                          {s.etiqueta}
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                            {s.esActual ? 'en curso' : 'siguiente'}
                          </span>
                        </span>
                        <span className="tabular text-[12px] font-bold shrink-0" style={{ color: pctColor(s.pct) }}>{s.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: `${Math.min(s.pct, 100)}%`, background: pctColor(s.pct) }}
                        />
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1 tabular">{s.visitados} de {s.planificados} planificados</p>
                    </div>
                  ))}
                </div>

                {g.visitasFueraDePlan > 0 && (
                  <p
                    className="text-[10px] text-neutral-500 border-t border-neutral-200/70 pt-2"
                    title="Visitas a puntos que ya no están en el plan del ciclo (reasignados o sin asignación). Cuentan como trabajo hecho, pero no suman al porcentaje."
                  >
                    <span className="tabular font-bold text-neutral-700">+{g.visitasFueraDePlan}</span> visitas a puntos fuera del plan
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
