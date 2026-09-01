import React, { useEffect, useMemo, useState } from 'react';
import { ambientalService, type ResumenDesempenoDTO } from '../../../services/ambiental.service';
import { formatRangoQuincena } from '../../gestor-ambiental/lib/rangoLabel';

// Franja de la quincena — la pieza de cabecera del panel.
//
// Todo el módulo se organiza alrededor de la quincena: 14 días corridos en los
// que cada gestor tiene que recorrer el 100% de sus puntos. Esta franja muestra
// ese periodo completo: qué día va, cuánto se lleva visitado y cuánto falta.
//
// Antes eran dos barras, una por semana, porque el ciclo repartía los puntos en
// mitades. Ese reparto ya no existe: una sola barra de 14 días.
//
// Fuente: GET /visitas/desempeno (el mismo agregado que consume el panel de
// Desempeño, así los dos no pueden contradecirse).

const DIAS_QUINCENA = 14;
const DIA_MS = 86400000;

/** Día de la quincena en curso (1..14). 0 si todavía no arrancó. */
function diaDeQuincena(inicioISO: string, ahora = new Date()): number {
  if (!inicioISO) return 0;
  const transcurrido = ahora.getTime() - new Date(inicioISO).getTime();
  if (transcurrido < 0) return 0;
  return Math.min(DIAS_QUINCENA, Math.floor(transcurrido / DIA_MS) + 1);
}

export const QuincenaRibbon: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenDesempenoDTO | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    ambientalService.getDesempeno()
      .then((data) => { if (!cancelado) setResumen(data); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, []);

  const dia = resumen ? diaDeQuincena(resumen.quincenaInicioISO) : 0;
  const diasRestantes = dia > 0 ? DIAS_QUINCENA - dia : null;
  const pctTotal = resumen && resumen.targetTotal > 0
    ? Math.round((resumen.actualTotal / resumen.targetTotal) * 100)
    : 0;

  // El avance esperado a esta altura de la quincena. Sirve de referencia: una
  // barra al 40% no dice nada si no se sabe que va el día 12 de 14.
  const pctEsperado = useMemo(
    () => (dia > 0 ? Math.round((dia / DIAS_QUINCENA) * 100) : 0),
    [dia],
  );
  const atrasado = dia > 0 && pctTotal < pctEsperado - 10;

  return (
    <section className="glass-panel rounded-2xl px-4 py-3 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
      {/* Identidad de la quincena */}
      <div className="shrink-0">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600">
          Quincena en curso
        </p>
        <p className="text-[13px] font-semibold text-neutral-800 leading-tight">
          {resumen ? formatRangoQuincena(resumen.quincenaInicioISO, resumen.quincenaFinISO) : 'Cargando…'}
        </p>
        {dia > 0 && (
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Día <span className="tabular font-bold text-neutral-700">{dia}</span> de {DIAS_QUINCENA}
            {diasRestantes !== null && diasRestantes > 0 && (
              <span className="text-neutral-400"> · quedan {diasRestantes}</span>
            )}
          </p>
        )}
      </div>

      {/* Barra de los 14 días */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-neutral-600">
            Avance de la quincena
          </span>
          <span
            className="tabular text-[13px] font-bold shrink-0"
            style={{ color: atrasado ? '#e4032e' : '#16a34a' }}
          >
            {pctTotal}%
          </span>
        </div>

        {/* Una celda por día: se ve de un vistazo cuánto queda de plazo. */}
        <div className="flex gap-[3px] h-2.5" aria-label={`Día ${dia} de ${DIAS_QUINCENA}`}>
          {Array.from({ length: DIAS_QUINCENA }, (_, i) => {
            const numeroDia = i + 1;
            const transcurrido = numeroDia <= dia;
            const esHoy = numeroDia === dia;
            return (
              <div
                key={numeroDia}
                className="flex-1 rounded-[3px] transition-colors duration-500"
                style={{
                  background: esHoy
                    ? '#e4032e'
                    : transcurrido
                      ? 'rgba(228,3,46,.32)'
                      : 'rgba(0,0,0,.07)',
                }}
              />
            );
          })}
        </div>

        {/* Cumplimiento sobre esa misma escala de 14 días. */}
        <div className="relative h-2.5 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner mt-1.5">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(pctTotal, 100)}%`,
              background: atrasado
                ? 'linear-gradient(90deg, #c9142f, #ff4d5e)'
                : 'linear-gradient(90deg, #16a34a, #4ade80)',
            }}
          />
        </div>

        <p className="text-[10px] text-neutral-500 mt-1 tabular">
          {resumen
            ? `${resumen.actualTotal} de ${resumen.targetTotal} puntos visitados`
            : '—'}
          {dia > 0 && (
            <span className={atrasado ? 'text-primary-600 font-semibold' : 'text-neutral-400'}>
              {' '}· esperado {pctEsperado}%
            </span>
          )}
        </p>
      </div>

      {/* Acumulado */}
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
          No se pudo cargar el avance de la quincena.
        </p>
      )}
    </section>
  );
};
