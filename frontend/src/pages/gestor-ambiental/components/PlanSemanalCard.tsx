import React, { useEffect, useMemo, useState } from 'react';
import { ambientalService } from '../../../services/ambiental.service';
import type { Activity } from '../../../types';

interface Props {
  activities: Activity[];
  onVerPunto: (activity: Activity) => void;
}

// Plan semanal automático del gestor: los puntos en emergencia (≥4 días sin
// recoger) siempre aparecen, más el 50% de los puntos regulares asignados
// que corresponde según la semana (la otra mitad aparece la semana
// siguiente, alternando — ver GET /rutas-semanales/plan). No se recalcula
// nada acá: el backend ya decidió qué ids van esta semana, este componente
// solo los cruza con `activities` para mostrar barrio/número.
export const PlanSemanalCard: React.FC<Props> = ({ activities, onVerPunto }) => {
  const [plan, setPlan] = useState<{ emergencia: string[]; regular: string[]; semanaISO: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visitados, setVisitados] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    ambientalService.getPlanSemanal()
      .then((data) => { if (!cancelado) setPlan(data); })
      .catch(() => { if (!cancelado) setError(true); })
      .finally(() => { if (!cancelado) setLoading(false); });
    ambientalService.getMiDesempeno()
      .then((data) => { if (!cancelado) setVisitados(data.gestores[0]?.visitados ?? 0); })
      .catch(() => { /* barra de progreso es un plus, no bloquea el resto de la card */ });
    return () => { cancelado = true; };
  }, []);

  const porId = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const puntosEmergencia = (plan?.emergencia ?? []).map((id) => porId.get(id)).filter((a): a is Activity => !!a);
  const puntosRegulares = (plan?.regular ?? []).map((id) => porId.get(id)).filter((a): a is Activity => !!a);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <p className="text-[11px] text-neutral-400">Cargando plan semanal…</p>
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <p className="text-[11px] text-red-500">No se pudo cargar el plan semanal.</p>
      </div>
    );
  }

  const total = puntosEmergencia.length + puntosRegulares.length;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-neutral-900">Puntos a visitar esta semana</h3>
          <p className="text-[10px] text-neutral-400 mt-0.5">Semana {plan.semanaISO} · {total} punto{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600">
            {puntosEmergencia.length} emergencia
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
            {puntosRegulares.length} regulares
          </span>
        </div>
      </div>

      {visitados !== null && total > 0 && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-neutral-500">Progreso de la semana</span>
            <span className="text-[10px] font-black text-neutral-700">
              {Math.min(visitados, total)} de {total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((visitados / total) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {total === 0 ? (
        <p className="text-[11px] text-neutral-400 p-4">Sin puntos planificados esta semana.</p>
      ) : (
        <div className="p-4 flex flex-col gap-1 max-h-[280px] overflow-y-auto">
          {puntosEmergencia.map((a) => (
            <button
              key={a.id}
              onClick={() => onVerPunto(a)}
              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-red-50/60 text-left transition-colors"
            >
              <span className="text-[11px] font-bold text-neutral-800">
                <span className="text-red-600">●</span> #{a.pointNumber} {a.barrio}
              </span>
              <span className="text-[10px] font-bold text-blue-600 shrink-0">Ver →</span>
            </button>
          ))}
          {puntosRegulares.map((a) => (
            <button
              key={a.id}
              onClick={() => onVerPunto(a)}
              className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-blue-50/60 text-left transition-colors"
            >
              <span className="text-[11px] font-bold text-neutral-800">
                <span className="text-blue-400">●</span> #{a.pointNumber} {a.barrio}
              </span>
              <span className="text-[10px] font-bold text-blue-600 shrink-0">Ver →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
