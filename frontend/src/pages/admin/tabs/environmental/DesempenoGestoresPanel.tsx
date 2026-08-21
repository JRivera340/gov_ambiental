// DesempenoGestoresPanel.tsx — cumplimiento por gestor en las dos semanas del ciclo
import React, { useCallback, useEffect, useState } from 'react';
import { ambientalService, type DesempenoGestorDTO } from '../../../../services/ambiental.service';
import { usersService } from '../../../../services/users.service';

function pctColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#EAB308';
  return '#DC2626';
}

export const DesempenoGestoresPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gestores, setGestores] = useState<DesempenoGestorDTO[]>([]);
  const [nombrePorId, setNombrePorId] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resumen = await ambientalService.getDesempeno(filtro || undefined);
      setGestores(resumen.gestores);
    } catch (e) {
      setError('No se pudo cargar el desempeño de gestores. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }

    // Nombres: best-effort desde el hub (mismo endpoint que usa
    // AsignacionPuntosPanel). Si falla, se muestra el id.
    try {
      const lista = await usersService.getGestores();
      setNombrePorId(Object.fromEntries(lista.map(g => [g.id, `${g.name} ${g.lastname}`.trim()])));
    } catch (e) {
      setNombrePorId({});
    }
  }, [filtro]);

  useEffect(() => {
    load();
  }, [load]);

  const nombreDe = (gestorId: string) => nombrePorId[gestorId] || `Gestor ${gestorId.slice(0, 8)}`;

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 text-[11px] text-neutral-500">
        Cargando desempeño de gestores…
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2 flex-wrap gap-2">
        <div>
          <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Desempeño de Gestores</h3>
          <p className="text-[9px] text-neutral-400 mt-0.5">
            Ciclo de dos semanas · % de los puntos de cada semana que ya se visitaron
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="text-[10px] p-1 border rounded bg-neutral-50 outline-none focus:ring-1 focus:ring-[#9333ea]"
          >
            <option value="">Todos los gestores</option>
            {gestores.map((g) => (
              <option key={g.gestorId} value={g.gestorId}>{nombreDe(g.gestorId)}</option>
            ))}
          </select>
          <button
            onClick={() => load()}
            className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold bg-white border-[#9333ea] text-[#9333ea] hover:bg-[#9333ea]/5"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-700 font-bold">
          {error}
        </div>
      )}

      {gestores.length === 0 ? (
        <p className="text-[9px] text-neutral-400 italic p-2">Sin gestores con puntos asignados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gestores.map((g) => (
            <div key={g.gestorId} className="rounded-2xl border border-neutral-100 shadow-sm bg-white p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-neutral-800">{nombreDe(g.gestorId)}</span>

              {/* Una fila por semana del ciclo: así una visita a un punto de la
                  semana siguiente se ve como avance de esa semana, en vez de
                  perderse como pasaba con el plan de una sola mitad. */}
              {g.semanas.map((s) => (
                <div key={s.inicioISO} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-neutral-600 truncate">
                      {s.etiqueta}
                      <span className="text-neutral-400 font-medium"> · {s.esActual ? 'en curso' : 'siguiente'}</span>
                    </span>
                    <span className="text-[10px] font-black shrink-0" style={{ color: pctColor(s.pct) }}>{s.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: pctColor(s.pct) }} />
                  </div>
                  <span className="text-[9px] text-neutral-500">{s.visitados} de {s.planificados} planificados</span>
                </div>
              ))}

              <div className="flex items-center justify-between text-[9px] text-neutral-500 border-t border-neutral-100 pt-1.5">
                <span>{g.asignados} asignados en total</span>
                {g.visitasFueraDePlan > 0 && (
                  <span className="text-neutral-400">+{g.visitasFueraDePlan} fuera de plan</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
