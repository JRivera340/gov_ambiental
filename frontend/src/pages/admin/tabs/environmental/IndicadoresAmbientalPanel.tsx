import React from 'react';
import type { Activity } from '../../../../types';
import {
  tiempoMedioRecoleccionDias, pctPuntosSinPendientes, puntosVencidos, residuosPorTipo, puntosReincidentes,
} from '../../../gestor-ambiental/lib/indicadoresAmbiental.lib';

const KPI: React.FC<{ label: string; value: string; nota: string; color: string; delay: number }> = ({
  label, value, nota, color, delay,
}) => (
  <div
    className="glass-panel admin-lift admin-rise rounded-2xl p-4 relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: color }} />
    <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{label}</p>
    <p className="tabular text-[26px] font-extrabold leading-none mt-1.5" style={{ color }}>{value}</p>
    <p className="text-[11px] text-neutral-500 mt-1.5">{nota}</p>
  </div>
);

export const IndicadoresAmbientalPanel: React.FC<{ actividades: Activity[] }> = ({ actividades }) => {
  // Mono-subtipo: toda actividad de este repo ya es punto de acumulación —
  // operativoSubtipo no existe en este backend. Filtrar por él dejaba este
  // panel siempre en "sin datos suficientes".
  const puntos = actividades;
  const tiempo = tiempoMedioRecoleccionDias(puntos);
  const sinPendientes = pctPuntosSinPendientes(puntos);
  const vencidos = puntosVencidos(puntos).length;
  const reincidentes = puntosReincidentes(puntos);
  const porTipo = residuosPorTipo(puntos);
  const maxTipo = Math.max(1, ...porTipo.map(t => t.total));

  if (puntos.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center">
        <p className="text-[13px] font-bold text-neutral-700">Todavía no hay puntos registrados</p>
        <p className="text-[11px] text-neutral-500 mt-1">Los indicadores aparecen cuando los gestores empiezan a registrar residuos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-panel rounded-2xl px-4 py-3">
        <h2 className="font-display text-[14px] font-extrabold text-neutral-900 tracking-tight">Indicadores del sector</h2>
        <p className="text-[11px] text-neutral-500 mt-0.5 tabular">Calculados sobre {puntos.length} puntos registrados</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPI label="Tiempo de recolección" value={`${tiempo.toFixed(1)} d`} nota="Promedio entre registro y retiro" color="#2563eb" delay={0} />
        <KPI label="Puntos al día" value={`${sinPendientes}%`} nota="Sin ningún residuo pendiente" color="#16a34a" delay={60} />
        <KPI label="Puntos vencidos" value={`${vencidos}`} nota="Con residuos de 4 días o más" color={vencidos > 0 ? '#e4032e' : '#718096'} delay={120} />
        <KPI label="Reincidentes" value={`${reincidentes.length}`} nota="Vuelven a acumular tras el retiro" color="#EAB308" delay={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="glass-panel admin-rise rounded-2xl p-4">
          <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-neutral-600 mb-3">Residuos por tipo</h3>
          {porTipo.length === 0 ? (
            <p className="text-[12px] text-neutral-500">Sin datos suficientes.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {porTipo.map(t => (
                <div key={t.tipo}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-neutral-700 truncate">{t.tipo}</span>
                    <span className="tabular text-[11px] font-bold text-neutral-500 shrink-0">
                      {t.recogidos} recogidos de {t.total}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${(t.total / maxTipo) * 100}%`, background: 'linear-gradient(90deg, #276749, #48bb78)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel admin-rise rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-neutral-600">Puntos reincidentes</h3>
            <span className="tabular text-[12px] font-extrabold text-amber-600">{reincidentes.length}</span>
          </div>
          {reincidentes.length === 0 ? (
            <p className="text-[12px] text-neutral-500">Ningún punto volvió a acumular después del retiro.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {reincidentes.slice(0, 20).map(p => (
                <div
                  key={p.puntoResiduoId}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/70"
                >
                  <span className="text-[11px] font-semibold text-neutral-700 truncate">{p.barrio || 'Sin barrio'}</span>
                  <span className="tabular text-[11px] font-bold text-primary-600 shrink-0">{p.ciclos} ciclos</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
