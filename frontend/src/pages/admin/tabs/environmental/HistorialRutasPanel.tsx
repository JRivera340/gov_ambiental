import React, { useEffect, useMemo, useState } from 'react';
import { ambientalService } from '../../../../services/ambiental.service';
import { formatRangoQuincena } from '../../../gestor-ambiental/lib/rangoLabel';
import { resumirRuta, totalesHistorial, type RutaResumen } from './historialRutas.lib';

// Historial de rutas de un gestor — quincenas ya cerradas.
//
// Se abre desde la card del gestor en Desempeño, que muestra solo la quincena
// en curso. Los datos salen de la tabla `ruta_semanal`: el historial que ve el
// gestor en su celular vive en localStorage y el admin no puede alcanzarlo.

const ESTADOS: Record<string, { label: string; color: string; fondo: string }> = {
  cerrada: { label: 'Cerrada', color: '#16a34a', fondo: 'rgba(22,163,74,.10)' },
  completada: { label: 'Completada', color: '#16a34a', fondo: 'rgba(22,163,74,.10)' },
  cancelada: { label: 'Cancelada', color: '#e4032e', fondo: 'rgba(228,3,46,.10)' },
  en_progreso: { label: 'En progreso', color: '#0277BD', fondo: 'rgba(2,119,189,.10)' },
};

function pctColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#EAB308';
  return '#e4032e';
}

function fechaCorta(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 5 * 3600000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

const RutaCard: React.FC<{ ruta: RutaResumen }> = ({ ruta }) => {
  const estado = ESTADOS[ruta.estado] ?? ESTADOS.cerrada;
  return (
    <article className="glass-panel rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[12px] font-bold text-neutral-900 truncate">
            {formatRangoQuincena(ruta.inicioISO, ruta.finISO)}
          </h4>
          <p className="text-[10px] text-neutral-500 tabular mt-0.5">
            Cerrada el {fechaCorta(ruta.cerradaISO)}
          </p>
        </div>
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
          style={{ color: estado.color, background: estado.fondo }}
        >
          {estado.label}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-[10px] font-semibold text-neutral-500">Cumplimiento</span>
          <span className="tabular text-[12px] font-bold" style={{ color: pctColor(ruta.pct) }}>
            {ruta.pct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(ruta.pct, 100)}%`, background: pctColor(ruta.pct) }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-neutral-500 tabular border-t border-neutral-200/70 pt-2">
        <span>
          <span className="font-bold text-neutral-700">{ruta.visitados}</span> de {ruta.planificados} visitados
        </span>
        {ruta.pendientes > 0 && (
          <span title="Puntos que quedaron sin visitar al cerrarse la quincena.">
            <span className="font-bold text-primary-600">{ruta.pendientes}</span> pendientes
          </span>
        )}
      </div>
    </article>
  );
};

interface Props {
  gestorId: string;
  nombre: string;
  onVolver: () => void;
}

export const HistorialRutasPanel: React.FC<Props> = ({ gestorId, nombre, onVolver }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rutas, setRutas] = useState<RutaResumen[]>([]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    ambientalService.getHistorialRutas(gestorId, 30)
      .then((dtos) => { if (!cancelado) setRutas(dtos.map(resumirRuta)); })
      .catch(() => { if (!cancelado) setError('No se pudo cargar el historial de rutas.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [gestorId]);

  const totales = useMemo(() => totalesHistorial(rutas), [rutas]);

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-panel rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onVolver}
              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 border border-neutral-200 hover:border-neutral-300 px-2 py-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ← Desempeño
            </button>
            <h2 className="font-display text-[14px] font-extrabold text-neutral-900 tracking-tight truncate">
              Historial de rutas · {nombre}
            </h2>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Quincenas ya cerradas. La quincena en curso se ve en Desempeño.
          </p>
        </div>

        {!loading && totales.quincenas > 0 && (
          <div className="flex items-center gap-5 shrink-0">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">Quincenas</p>
              <p className="tabular text-lg font-extrabold text-neutral-900 leading-none">{totales.quincenas}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">Acumulado</p>
              <p className="tabular text-lg font-extrabold leading-none" style={{ color: pctColor(totales.pct) }}>
                {totales.pct}%
              </p>
            </div>
            {totales.canceladas > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">Canceladas</p>
                <p className="tabular text-lg font-extrabold text-primary-600 leading-none">{totales.canceladas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel rounded-xl px-3 py-2 text-[12px] font-semibold text-primary-700 border-l-4 border-l-primary">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl p-5 text-[12px] font-semibold text-neutral-500">
          Cargando historial…
        </div>
      ) : rutas.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <p className="text-[13px] font-bold text-neutral-700">Este gestor todavía no cerró ninguna quincena</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            El historial se llena cuando termina la quincena en curso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {rutas.map((r) => <RutaCard key={r.id} ruta={r} />)}
        </div>
      )}
    </div>
  );
};
