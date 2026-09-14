// DesempenoGestoresPanel.tsx — cumplimiento por gestor en la quincena en curso
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ambientalService, type DesempenoGestorDTO, type ResumenDesempenoDTO } from '../../../../services/ambiental.service';
import { usersService } from '../../../../services/users.service';
import { HistorialRutasPanel } from './HistorialRutasPanel';
import { formatRangoCorto } from '../../../gestor-ambiental/lib/rangoLabel';

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

// El backend ya manda el porcentaje de la quincena; antes había que sumar
// las dos semanas del ciclo acá.

interface Props {
  /** Lleva a la vista de operación con ese punto filtrado. */
  onVerPunto?: (pointNumber: number) => void;
}

export const DesempenoGestoresPanel: React.FC<Props> = ({ onVerPunto }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<DesempenoGestorDTO[]>([]);
  // El rango de la quincena que se está midiendo. Sin esto las cards decían
  // "Quincena" a secas y no había forma de saber de qué periodo hablaban.
  const [quincena, setQuincena] = useState<{ inicioISO: string; finISO: string; etiqueta: string } | null>(null);
  const [nombrePorId, setNombrePorId] = useState<Record<string, string>>({});
  const [orden, setOrden] = useState<Orden>('cumplimiento');
  // Gestor cuyo historial se está mirando. El historial reemplaza la grilla en
  // vez de abrirse en un modal: son muchas quincenas y necesitan el ancho.
  const [historialDe, setHistorialDe] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resumen: ResumenDesempenoDTO = await ambientalService.getDesempeno();
      setGestores(resumen.gestores);
      setQuincena({
        inicioISO: resumen.quincenaInicioISO,
        finISO: resumen.quincenaFinISO,
        etiqueta: resumen.etiqueta,
      });
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
    if (orden === 'cumplimiento') copia.sort((a, b) => a.pct - b.pct);
    else if (orden === 'asignados') copia.sort((a, b) => b.asignados - a.asignados);
    else copia.sort((a, b) => nombreDe(a.gestorId).localeCompare(nombreDe(b.gestorId), 'es'));
    return copia;
  }, [gestores, orden, nombreDe]);

  const enRiesgo = ordenados.filter(g => g.pct < 50).length;

  if (historialDe) {
    return (
      <HistorialRutasPanel
        gestorId={historialDe}
        nombre={nombreDe(historialDe)}
        onVolver={() => setHistorialDe(null)}
        onVerPunto={onVerPunto}
      />
    );
  }

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
            {quincena ? `${quincena.etiqueta}. ` : ''}Porcentaje de los puntos asignados que cumplen la frecuencia mínima de visita de la quincena.
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
          <p className="text-[11px] text-neutral-500 mt-1">Asigná puntos desde la vista Asignación para empezar a medir la quincena.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {ordenados.map((g, i) => (
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
                  <p className="tabular text-2xl font-extrabold leading-none" style={{ color: pctColor(g.pct) }}>{g.pct}%</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400 mt-0.5">
                    {quincena ? formatRangoCorto(quincena.inicioISO, quincena.finISO) : 'Quincena'}
                  </p>
                </div>
              </div>

              {/* Una sola barra: la quincena es un bloque único y el gestor
                  tiene todos sus puntos disponibles durante todo el periodo. */}
              <div>
                <div className="w-full h-2.5 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.min(g.pct, 100)}%`, background: pctColor(g.pct) }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 tabular">
                  {g.visitados} de {g.planificados} puntos visitados
                </p>
              </div>

              {g.visitasFueraDePlan > 0 && (
                <p
                  className="text-[10px] text-neutral-500"
                  title="Visitas a puntos que ya no están en el plan de la quincena (reasignados o sin asignación). Cuentan como trabajo hecho, pero no suman al porcentaje."
                >
                  <span className="tabular font-bold text-neutral-700">+{g.visitasFueraDePlan}</span> visitas a puntos fuera del plan
                </p>
              )}

              <button
                onClick={() => setHistorialDe(g.gestorId)}
                className="mt-auto w-full py-2 rounded-xl text-[11px] font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Historial de rutas →
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
