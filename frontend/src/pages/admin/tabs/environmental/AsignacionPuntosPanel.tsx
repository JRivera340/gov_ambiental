// AsignacionPuntosPanel.tsx — Panel de asignación de puntos ambientales por gestor
import React, { useCallback, useEffect, useState } from 'react';
import { ambientalService } from '../../../../services/ambiental.service';
import { usersService } from '../../../../services/users.service';
import type { User } from '../../../../types';
import { groupAsignacionesByGestor } from './asignacionPuntos.lib';

export interface AsignacionPuntosActividad {
  id: string;
  barrio?: string;
  pointNumber?: number;
}

export interface AsignacionPuntosPanelProps {
  actividades?: AsignacionPuntosActividad[];
}

function puntoLabel(puntoResiduoId: string, actividades?: AsignacionPuntosActividad[]): string {
  const actividad = actividades?.find(a => a.id === puntoResiduoId);
  if (!actividad) return puntoResiduoId;
  if (actividad.pointNumber !== undefined && actividad.barrio) {
    return `#${actividad.pointNumber} — ${actividad.barrio}`;
  }
  if (actividad.barrio) return actividad.barrio;
  if (actividad.pointNumber !== undefined) return `#${actividad.pointNumber}`;
  return puntoResiduoId;
}

export const AsignacionPuntosPanel: React.FC<AsignacionPuntosPanelProps> = ({ actividades }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<User[]>([]);
  const [grouped, setGrouped] = useState<Record<string, string[]>>({});
  const [sinAsignar, setSinAsignar] = useState<string[]>([]);
  const [pendingSelection, setPendingSelection] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getGestores() se resuelve aparte: depende del hub (ver
      // PLAN-MAESTRO.md HITO 2 - proxy de usuarios), y si el hub esta caido
      // no debe tumbar la vista de asignaciones/sin-asignar, que son datos
      // propios de ambiental y no dependen de eso.
      const [asignaciones, sinAsignarRows] = await Promise.all([
        ambientalService.getAsignacionAll(),
        ambientalService.getSinAsignar(),
      ]);
      setGrouped(groupAsignacionesByGestor(asignaciones));
      setSinAsignar(sinAsignarRows);
    } catch (e) {
      setError('No se pudo cargar la asignación de puntos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }

    try {
      setGestores(await usersService.getGestores());
    } catch (e) {
      setGestores([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReasignar = async (puntoResiduoId: string, gestorId: string | null) => {
    if (!gestorId) return;
    try {
      await ambientalService.reasignarPunto(puntoResiduoId, gestorId);
      await load();
    } catch (e) {
      setError('No se pudo reasignar el punto. Intenta de nuevo.');
    }
  };

  // Solo gestores activos = los que tienen al menos un punto asignado.
  // Oculta cuentas inactivas/de prueba con 0 pts (tanto en tarjetas como en el selector).
  const gestoresActivos = gestores.filter(g => (grouped[g.id]?.length ?? 0) > 0);

  const selectGestores = (puntoResiduoId: string, currentGestorId: string | null) => {
    const selected = pendingSelection[puntoResiduoId] ?? currentGestorId ?? '';
    return (
      <select
        value={selected}
        onChange={e => setPendingSelection(prev => ({ ...prev, [puntoResiduoId]: e.target.value }))}
        className="text-[10px] p-1 border rounded bg-neutral-50 outline-none focus:ring-1 focus:ring-[#2563eb] min-w-0 max-w-[45vw] sm:max-w-none"
      >
        <option value="" disabled>Selecciona gestor</option>
        {gestoresActivos.map(g => (
          <option key={g.id} value={g.id}>{g.name} {g.lastname}</option>
        ))}
      </select>
    );
  };

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 text-[11px] text-neutral-500">
        Cargando asignación de puntos…
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
        <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Asignación de Puntos</h3>
        <button
          onClick={() => load()}
          className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold bg-white border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/5"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-700 font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {gestoresActivos.map(gestor => {
          const puntos = grouped[gestor.id] || [];
          return (
            <div key={gestor.id} className="rounded-2xl border border-neutral-100 shadow-sm bg-white p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-800">{gestor.name} {gestor.lastname}</span>
                <span className="text-[9px] font-black text-[#16a34a]">{puntos.length} pts</span>
              </div>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5">
                {puntos.length === 0 && (
                  <p className="text-[9px] text-neutral-400 italic">Sin puntos asignados</p>
                )}
                {puntos.map(puntoResiduoId => (
                  <div key={puntoResiduoId} className="flex flex-wrap items-center justify-between gap-1.5 bg-neutral-50 rounded-lg border border-neutral-100 px-2 py-1">
                    <span className="text-[9px] text-neutral-600 truncate flex-1 min-w-0 basis-full sm:basis-auto">{puntoLabel(puntoResiduoId, actividades)}</span>
                    {selectGestores(puntoResiduoId, gestor.id)}
                    <button
                      onClick={() => handleReasignar(puntoResiduoId, pendingSelection[puntoResiduoId] ?? gestor.id)}
                      className="text-[8px] px-1.5 py-1 rounded border border-[#2563eb] text-[#2563eb] font-bold hover:bg-[#2563eb]/5"
                    >
                      Reasignar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-100 shadow-sm bg-amber-50/60 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-neutral-800">Sin asignar</span>
          <span className="text-[9px] font-black text-amber-600">{sinAsignar.length} pts</span>
        </div>
        <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
          {sinAsignar.length === 0 && (
            <p className="text-[9px] text-neutral-400 italic">Todos los puntos tienen gestor asignado</p>
          )}
          {sinAsignar.map(puntoResiduoId => (
            <div key={puntoResiduoId} className="flex flex-wrap items-center justify-between gap-1.5 bg-white rounded-lg border border-neutral-100 px-2 py-1">
              <span className="text-[9px] text-neutral-600 truncate flex-1 min-w-0 basis-full sm:basis-auto">{puntoLabel(puntoResiduoId, actividades)}</span>
              {selectGestores(puntoResiduoId, null)}
              <button
                onClick={() => handleReasignar(puntoResiduoId, pendingSelection[puntoResiduoId] ?? null)}
                disabled={!pendingSelection[puntoResiduoId]}
                title={!pendingSelection[puntoResiduoId] ? 'Selecciona un gestor antes de asignar' : undefined}
                className="text-[8px] px-1.5 py-1 rounded border border-[#16a34a] text-[#16a34a] font-bold hover:bg-[#16a34a]/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Asignar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
