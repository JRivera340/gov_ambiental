import React, { useEffect, useMemo, useState } from 'react';
import { ambientalService, type ResumenDesempenoDTO } from '../../../services/ambiental.service';
import { formatRangoCiclo } from '../../gestor-ambiental/lib/semanaLabel';

// Franja del ciclo — la pieza de cabecera del panel.
//
// Todo el módulo se organiza alrededor del ciclo de dos semanas: cada gestor
// recorre la mitad de sus puntos por semana. Esta franja muestra ese ciclo
// completo: cuánto se lleva de cada semana, en qué día del ciclo estamos, y el
// acumulado. Reemplaza al tile de "Objetivos" que mostraba los mismos números
// sin decir a qué semana pertenecían.
//
// Fuente: GET /visitas/desempeno (el mismo agregado que consume el panel de
// Desempeño, así los dos no pueden contradecirse).

const DIAS_CICLO = 14;
const DIA_MS = 86400000;

type SemanaAgregada = {
  etiqueta: string;
  esActual: boolean;
  planificados: number;
  visitados: number;
  pct: number;
};

function agregarSemanas(resumen: ResumenDesempenoDTO): SemanaAgregada[] {
  return [0, 1].map((slot) => {
    let planificados = 0;
    let visitados = 0;
    let etiqueta = '';
    let esActual = slot === 0;
    for (const gestor of resumen.gestores) {
      const semana = gestor.semanas[slot];
      if (!semana) continue;
      planificados += semana.planificados;
      visitados += semana.visitados;
      etiqueta = etiqueta || semana.etiqueta;
      esActual = semana.esActual;
    }
    return {
      etiqueta,
      esActual,
      planificados,
      visitados,
      pct: planificados > 0 ? Math.round((visitados / planificados) * 100) : 0,
    };
  });
}

/** Día del ciclo en curso (1..14). 0 si el ciclo todavía no arrancó. */
function diaDelCiclo(inicioISO: string, ahora = new Date()): number {
  if (!inicioISO) return 0;
  const transcurrido = ahora.getTime() - new Date(inicioISO).getTime();
  if (transcurrido < 0) return 0;
  return Math.min(DIAS_CICLO, Math.floor(transcurrido / DIA_MS) + 1);
}

export const CicloRibbon: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenDesempenoDTO | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    ambientalService.getDesempeno()
      .then((data) => { if (!cancelado) setResumen(data); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, []);

  const semanas = useMemo(() => (resumen ? agregarSemanas(resumen) : []), [resumen]);
  const dia = resumen ? diaDelCiclo(resumen.cicloInicioISO) : 0;
  const pctTotal = resumen && resumen.targetTotal > 0
    ? Math.round((resumen.actualTotal / resumen.targetTotal) * 100)
    : 0;

  return (
    <section className="glass-panel rounded-2xl px-4 py-3 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
      {/* Identidad del ciclo */}
      <div className="shrink-0">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600">
          Ciclo de dos semanas
        </p>
        <p className="text-[13px] font-semibold text-neutral-800 leading-tight">
          {resumen ? formatRangoCiclo(resumen.cicloInicioISO, resumen.cicloFinISO) : 'Cargando…'}
        </p>
        {dia > 0 && (
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Día <span className="tabular font-bold text-neutral-700">{dia}</span> de {DIAS_CICLO}
          </p>
        )}
      </div>

      {/* Las dos semanas */}
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(semanas.length > 0 ? semanas : [null, null]).map((semana, i) => (
          <div key={i} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold text-neutral-600 truncate">
                {semana?.etiqueta || (i === 0 ? 'Semana en curso' : 'Semana siguiente')}
                {semana && (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    {semana.esActual ? 'en curso' : 'siguiente'}
                  </span>
                )}
              </span>
              <span
                className="tabular text-[13px] font-bold shrink-0"
                style={{ color: semana && semana.esActual ? '#e4032e' : '#4a5568' }}
              >
                {semana ? `${semana.pct}%` : '—'}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${Math.min(semana?.pct ?? 0, 100)}%`,
                  background: semana && semana.esActual
                    ? 'linear-gradient(90deg, #e4032e, #ff4d5e)'
                    : 'linear-gradient(90deg, #276749, #48bb78)',
                }}
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 tabular">
              {semana ? `${semana.visitados} de ${semana.planificados} visitas planificadas` : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Acumulado del ciclo */}
      <div className="shrink-0 flex items-center gap-4 lg:pl-6 lg:border-l border-neutral-200/80">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Avance total</p>
          <p className="tabular text-2xl font-extrabold text-neutral-900 leading-none">
            {resumen ? `${resumen.actualTotal}` : '—'}
            <span className="text-base font-bold text-neutral-400"> / {resumen?.targetTotal ?? '—'}</span>
          </p>
        </div>
        <div
          className="relative w-14 h-14 rounded-full shrink-0"
          style={{
            background: `conic-gradient(#e4032e ${pctTotal * 3.6}deg, rgba(228,3,46,.12) ${pctTotal * 3.6}deg)`,
          }}
        >
          <div className="absolute inset-[5px] rounded-full bg-white/90 flex items-center justify-center">
            <span className="tabular text-[13px] font-extrabold text-neutral-800">{pctTotal}%</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[11px] font-semibold text-primary-600 shrink-0">
          No se pudo cargar el avance del ciclo.
        </p>
      )}
    </section>
  );
};
