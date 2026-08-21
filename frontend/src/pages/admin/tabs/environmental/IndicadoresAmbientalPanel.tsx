import React from 'react';
import type { Activity } from '../../../../types';
import {
  tiempoMedioRecoleccionDias, pctPuntosSinPendientes, puntosVencidos, residuosPorTipo, puntosReincidentes,
} from '../../../gestor-ambiental/lib/indicadoresAmbiental.lib';

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

  const KPI = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3 border border-neutral-100">
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-black text-neutral-800">{value}</p>
    </div>
  );

  if (puntos.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-neutral-100">
        <h3 className="text-sm font-black text-neutral-900 mb-2">Indicadores Ambiental</h3>
        <p className="text-xs text-neutral-400">Sin datos suficientes</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-neutral-100 space-y-4">
      <h3 className="text-sm font-black text-neutral-900">Indicadores Ambiental</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPI label="Tiempo recolección" value={`${tiempo.toFixed(1)} d`} />
        <KPI label="Sin pendientes" value={`${sinPendientes}%`} />
        <KPI label="Puntos vencidos" value={`${vencidos}`} />
        <KPI label="Reincidentes" value={`${reincidentes.length}`} />
      </div>

      <div>
        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Residuos por tipo</p>
        <div className="space-y-1.5">
          {porTipo.length === 0 && <p className="text-xs text-neutral-400">Sin datos suficientes</p>}
          {porTipo.map(t => (
            <div key={t.tipo} className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-600 w-32 truncate">{t.tipo}</span>
              <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(t.total / maxTipo) * 100}%`, background: '#16a34a' }} />
              </div>
              <span className="text-[10px] text-neutral-500 w-16 text-right">{t.recogidos}/{t.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Puntos reincidentes</p>
        {reincidentes.length === 0 && <p className="text-xs text-neutral-400">Ninguno</p>}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {reincidentes.slice(0, 10).map(p => (
            <div key={p.puntoResiduoId} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-neutral-50">
              <span className="text-neutral-700 truncate">{p.barrio}</span>
              <span className="font-bold text-red-600">{p.ciclos} ciclos</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
