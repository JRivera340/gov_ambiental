import React, { useEffect, useMemo, useState } from 'react';
import { ambientalService, type PlanCicloDTO, type SemanaPlanDTO } from '../../../services/ambiental.service';
import { resumenSemana } from '../lib/rutasCiclo';
import type { Activity } from '../../../types';

interface Props {
  activities: Activity[];
  onVerPunto: (activity: Activity) => void;
}

// Las dos semanas del ciclo del gestor: entre ambas cubren el 100% de sus
// puntos asignados. Los puntos en emergencia (≥4 días sin recoger) se adelantan
// siempre a la semana en curso.
//
// El progreso sale del mismo llamado que el plan (GET /visitas/plan). Antes se
// mezclaban dos endpoints distintos —el plan por un lado y el desempeño por
// otro— y las dos cuentas no coincidían dentro de la misma pantalla.
const BloqueSemana: React.FC<{
  semana: SemanaPlanDTO;
  porId: Map<string, Activity>;
  onVerPunto: (a: Activity) => void;
}> = ({ semana, porId, onVerPunto }) => {
  const { total, visitados, pct } = resumenSemana(semana);
  const yaVisitado = new Set(semana.visitados);
  const emergencias = new Set(semana.emergencia);
  const puntos = semana.planificados.map((id) => porId.get(id)).filter((a): a is Activity => !!a);
  const color = semana.esActual ? '#2563eb' : '#64748b';

  return (
    <div className="border-t border-neutral-100 first:border-t-0">
      <div className="p-4 pb-2 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[11px] font-black text-neutral-900">{semana.etiqueta}</h4>
          <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color }}>
            {semana.esActual ? 'En curso' : 'Siguiente'} · {total} punto{total !== 1 ? 's' : ''}
          </p>
        </div>
        {semana.emergencia.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600 shrink-0">
            {semana.emergencia.length} emergencia
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-neutral-500">Progreso</span>
            <span className="text-[10px] font-black text-neutral-700">{visitados} de {total}</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {total === 0 ? (
        <p className="text-[11px] text-neutral-400 p-4">Sin puntos planificados en esta semana.</p>
      ) : (
        <div className="p-4 pt-3 flex flex-col gap-1 max-h-[240px] overflow-y-auto">
          {puntos.map((a) => {
            const visitado = yaVisitado.has(a.id);
            const emergencia = emergencias.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => onVerPunto(a)}
                className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
              >
                <span className={`text-[11px] font-bold ${visitado ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>
                  <span className={emergencia ? 'text-red-600' : 'text-blue-400'}>●</span> #{a.pointNumber} {a.barrio}
                </span>
                <span className="text-[10px] font-bold text-blue-600 shrink-0">
                  {visitado ? 'Visitado' : 'Ver →'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PlanSemanalCard: React.FC<Props> = ({ activities, onVerPunto }) => {
  const [plan, setPlan] = useState<PlanCicloDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    ambientalService.getPlanCiclo()
      .then((data) => { if (!cancelado) setPlan(data); })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const porId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <p className="text-[11px] text-neutral-400">Cargando plan del ciclo…</p>
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <p className="text-[11px] text-red-500">No se pudo cargar el plan del ciclo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-100">
        <h3 className="text-xs font-black text-neutral-900">Tus puntos por semana</h3>
        <p className="text-[10px] text-neutral-400 mt-0.5">
          {plan.asignados} punto{plan.asignados !== 1 ? 's' : ''} asignado{plan.asignados !== 1 ? 's' : ''}, repartidos en dos semanas
        </p>
      </div>
      {plan.semanas.map((semana) => (
        <BloqueSemana key={semana.inicioISO} semana={semana} porId={porId} onVerPunto={onVerPunto} />
      ))}
    </div>
  );
};
