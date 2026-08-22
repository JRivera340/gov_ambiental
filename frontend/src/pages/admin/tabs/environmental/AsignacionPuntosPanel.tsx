// AsignacionPuntosPanel.tsx — qué gestor atiende cada punto ambiental
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  if (!actividad) return `Punto ${puntoResiduoId.slice(0, 8)}`;
  if (actividad.pointNumber !== undefined && actividad.barrio) return `#${actividad.pointNumber} · ${actividad.barrio}`;
  if (actividad.barrio) return actividad.barrio;
  if (actividad.pointNumber !== undefined) return `#${actividad.pointNumber}`;
  return `Punto ${puntoResiduoId.slice(0, 8)}`;
}

export const AsignacionPuntosPanel: React.FC<AsignacionPuntosPanelProps> = ({ actividades }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<User[]>([]);
  const [grouped, setGrouped] = useState<Record<string, string[]>>({});
  const [asignados, setAsignados] = useState<Set<string>>(new Set());
  const [pendingSelection, setPendingSelection] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asignaciones, todosLosUsuarios] = await Promise.all([
        ambientalService.getAsignacionAll(),
        usersService.getGestores(),
      ]);
      setGrouped(groupAsignacionesByGestor(asignaciones));
      setAsignados(new Set(asignaciones.filter(a => a.gestorId).map(a => a.puntoResiduoId)));
      setGestores(todosLosUsuarios.filter(u => u.role === 'GESTOR_AMBIENTAL'));
    } catch {
      setError('No se pudo cargar la asignación de puntos. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Puntos sin gestor: se derivan de la lista real de puntos, no del endpoint
  // /asignaciones/sin-asignar — ese solo devuelve los que ya tienen fila con
  // gestor nulo, así que los puntos migrados sin fila quedaban invisibles: ni
  // asignados a nadie ni disponibles para asignar.
  const sinAsignar = useMemo(
    () => (actividades ?? []).filter(a => !asignados.has(a.id)).map(a => a.id),
    [actividades, asignados],
  );

  const handleReasignar = async (puntoResiduoId: string, gestorId: string | null) => {
    if (!gestorId) return;
    setGuardando(puntoResiduoId);
    try {
      await ambientalService.reasignarPunto(puntoResiduoId, gestorId);
      await load();
    } catch {
      setError('No se pudo reasignar el punto. Intentá de nuevo.');
    } finally {
      setGuardando(null);
    }
  };

  // Todos los gestores del hub son elegibles. Antes solo se listaban los que
  // ya tenían al menos un punto, así que a un gestor nuevo no había forma de
  // asignarle el primero: no aparecía en ningún selector.
  const gestoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const conNombre = gestores.map(g => ({ ...g, nombre: `${g.name} ${g.lastname || ''}`.trim() }));
    const visibles = q ? conNombre.filter(g => g.nombre.toLowerCase().includes(q)) : conNombre;
    return visibles.sort((a, b) => (grouped[b.id]?.length ?? 0) - (grouped[a.id]?.length ?? 0));
  }, [gestores, busqueda, grouped]);

  const selectGestores = (puntoResiduoId: string, currentGestorId: string | null) => (
    <select
      value={pendingSelection[puntoResiduoId] ?? currentGestorId ?? ''}
      onChange={e => setPendingSelection(prev => ({ ...prev, [puntoResiduoId]: e.target.value }))}
      className="text-[11px] px-2 py-1 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 min-w-0 max-w-[45vw] sm:max-w-[160px]"
    >
      <option value="" disabled>Elegir gestor</option>
      {gestores.map(g => (
        <option key={g.id} value={g.id}>{g.name} {g.lastname}</option>
      ))}
    </select>
  );

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-5 text-[12px] font-semibold text-neutral-500">
        Cargando asignación de puntos…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[14px] font-extrabold text-neutral-900 tracking-tight">Asignación de puntos</h2>
          <p className="text-[11px] text-neutral-500 mt-0.5 tabular">
            {gestores.length} gestores · {asignados.size} puntos con gestor · {sinAsignar.length} sin asignar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar gestor"
            className="text-[11px] px-3 py-1.5 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20 w-40"
          />
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

      {/* Puntos sin gestor: primero, porque es lo que hay que resolver */}
      {sinAsignar.length > 0 && (
        <section className="glass-panel admin-rise rounded-2xl p-4 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.16em] text-neutral-600">Sin gestor asignado</h3>
            <span className="tabular text-[13px] font-extrabold text-amber-600">{sinAsignar.length}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {sinAsignar.map(puntoResiduoId => (
              <div
                key={puntoResiduoId}
                className="flex flex-wrap items-center justify-between gap-2 bg-white/70 rounded-xl border border-white/70 px-2.5 py-2"
              >
                <span className="text-[11px] font-semibold text-neutral-700 truncate flex-1 min-w-0">
                  {puntoLabel(puntoResiduoId, actividades)}
                </span>
                {selectGestores(puntoResiduoId, null)}
                <button
                  onClick={() => handleReasignar(puntoResiduoId, pendingSelection[puntoResiduoId] ?? null)}
                  disabled={!pendingSelection[puntoResiduoId] || guardando === puntoResiduoId}
                  title={!pendingSelection[puntoResiduoId] ? 'Elegí un gestor antes de asignar' : undefined}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-emerald-500/50 text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  {guardando === puntoResiduoId ? 'Asignando…' : 'Asignar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Carga por gestor */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {gestoresFiltrados.map((gestor, i) => {
          const puntos = grouped[gestor.id] || [];
          return (
            <article
              key={gestor.id}
              className="glass-panel admin-lift admin-rise rounded-2xl p-4 flex flex-col gap-2.5"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-neutral-900 truncate">{gestor.name} {gestor.lastname}</h3>
                <span className={`tabular text-[12px] font-extrabold shrink-0 ${puntos.length === 0 ? 'text-neutral-400' : 'text-emerald-600'}`}>
                  {puntos.length} pts
                </span>
              </div>

              {puntos.length === 0 ? (
                <p className="text-[11px] text-neutral-500 bg-white/60 border border-white/70 rounded-xl px-3 py-2">
                  Sin puntos asignados. Asignale uno desde la lista de arriba.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {puntos.map(puntoResiduoId => (
                    <div
                      key={puntoResiduoId}
                      className="flex flex-wrap items-center justify-between gap-1.5 bg-white/70 rounded-xl border border-white/70 px-2.5 py-1.5"
                    >
                      <span className="text-[11px] text-neutral-700 truncate flex-1 min-w-0 basis-full sm:basis-auto">
                        {puntoLabel(puntoResiduoId, actividades)}
                      </span>
                      {selectGestores(puntoResiduoId, gestor.id)}
                      <button
                        onClick={() => handleReasignar(puntoResiduoId, pendingSelection[puntoResiduoId] ?? gestor.id)}
                        disabled={guardando === puntoResiduoId}
                        className="text-[10px] px-2 py-1.5 rounded-lg border border-primary/40 text-primary font-bold bg-white hover:bg-primary/5 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {guardando === puntoResiduoId ? 'Guardando…' : 'Reasignar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
