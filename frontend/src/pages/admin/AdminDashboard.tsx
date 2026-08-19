import React, { useEffect, useState } from 'react';
import { activityService } from '../../services/activity.service';
import type { Activity } from '../../types';
import { AsignacionPuntosPanel } from './tabs/environmental/AsignacionPuntosPanel';
import { IndicadoresAmbientalPanel } from './tabs/environmental/IndicadoresAmbientalPanel';
import { DesempenoGestoresPanel } from './tabs/environmental/DesempenoGestoresPanel';
import { ObjetivosDiariosTile } from './tabs/environmental/ObjetivosDiariosTile';

type Seccion = 'asignacion' | 'indicadores' | 'desempeno';

// Panel de administración de este módulo. Deliberadamente NO reusa
// EnvironmentalTab.tsx completo — ese componente viene del hub y trae
// bastante deuda propia de allá (campos operativoCategoria/operativoData
// que no existen en este backend, referencias a ~8 archivos KMZ de capas
// que no están en este repo, un link a una ruta /admin/actividad del hub).
// Portar eso es trabajo aparte; acá se arma un panel propio con los
// paneles que sí son autocontenidos y ya funcionan contra este backend.
export const AdminDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<Seccion>('asignacion');

  useEffect(() => {
    let cancelado = false;
    activityService.getAll()
      .then((data) => { if (!cancelado) setActivities(data); })
      .catch(() => { if (!cancelado) setError('No se pudo cargar la información de puntos.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const actividadesParaAsignacion = activities.map((a) => ({
    id: a.id,
    barrio: a.barrio,
    pointNumber: a.pointNumber,
  }));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col gap-3 p-3 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-base font-black text-neutral-900">Panel de Administración — Sector Ambiental</h1>
        <div className="flex gap-2">
          {([
            { key: 'asignacion', label: 'Asignación de Puntos', color: '#2563eb' },
            { key: 'indicadores', label: 'Indicadores', color: '#16a34a' },
            { key: 'desempeno', label: 'Desempeño', color: '#9333ea' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSeccion(tab.key)}
              className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold"
              style={seccion === tab.key
                ? { background: tab.color, borderColor: tab.color, color: 'white' }
                : { background: 'white', borderColor: tab.color, color: tab.color }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ObjetivosDiariosTile />

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-700 font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[11px] text-neutral-400">Cargando…</p>
      ) : (
        <>
          {seccion === 'asignacion' && <AsignacionPuntosPanel actividades={actividadesParaAsignacion} />}
          {seccion === 'indicadores' && <IndicadoresAmbientalPanel actividades={activities} />}
          {seccion === 'desempeno' && <DesempenoGestoresPanel />}
        </>
      )}
    </div>
  );
};
