import React, { useEffect, useMemo, useState } from 'react';
import {
  ambientalService,
  type QuincenaHistorialDTO,
  type ParadaHistorialDTO,
} from '../../../../services/ambiental.service';
import { estadoQuincena, cierreQuincena, totalesHistorial } from './historialRutas.lib';

// Historial de rutas de un gestor — quincenas ya cerradas.
//
// Se abre desde la card del gestor en Desempeño, que muestra solo la quincena
// en curso. Los datos salen de la tabla `ruta_semanal`: el historial que ve el
// gestor en su celular vive en localStorage y el admin no puede alcanzarlo.
//
// El agrupado por quincena lo hace el backend. Antes se listaba una card por
// fila de ruta, y como las rutas viejas duran 7 días, el panel mostraba semanas
// con etiqueta de quincena.

const ESTADOS: Record<string, { label: string; color: string; fondo: string }> = {
  cerrada: { label: 'Cerrada', color: '#16a34a', fondo: 'rgba(22,163,74,.10)' },
  parcial: { label: 'Parcial', color: '#EAB308', fondo: 'rgba(234,179,8,.12)' },
  cancelada: { label: 'Cancelada', color: '#e4032e', fondo: 'rgba(228,3,46,.10)' },
  sin_ruta: { label: 'Sin ruta', color: '#718096', fondo: 'rgba(113,128,150,.10)' },
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

const ListaPuntos: React.FC<{
  titulo: string;
  color: string;
  paradas: ParadaHistorialDTO[];
  vacio: string;
}> = ({ titulo, color, paradas, vacio }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color }}>
      {titulo} <span className="tabular">({paradas.length})</span>
    </p>
    {paradas.length === 0 ? (
      <p className="text-[10px] text-neutral-400">{vacio}</p>
    ) : (
      <ul className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto pr-1">
        {paradas.map((p) => (
          <li key={p.puntoId} className="flex items-baseline gap-1.5 text-[11px] leading-tight">
            <span className="tabular font-bold shrink-0" style={{ color }}>
              {p.pointNumber != null ? `#${p.pointNumber}` : '—'}
            </span>
            <span className="text-neutral-600 truncate">{p.barrio || 'Sin barrio'}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const QuincenaCard: React.FC<{ quincena: QuincenaHistorialDTO }> = ({ quincena }) => {
  const [abierta, setAbierta] = useState(false);
  const estado = ESTADOS[estadoQuincena(quincena)] ?? ESTADOS.cerrada;
  const visitados = quincena.paradas.filter((p) => p.visitado);
  const pendientes = quincena.paradas.filter((p) => !p.visitado);

  return (
    <article className="glass-panel rounded-2xl p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[12px] font-bold text-neutral-900 truncate">{quincena.etiqueta}</h4>
          <p className="text-[10px] text-neutral-500 tabular mt-0.5">
            Cerrada el {fechaCorta(cierreQuincena(quincena))}
            {/* Con datos viejos, una quincena puede venir de dos rutas semanales. */}
            {quincena.rutas.length > 1 && (
              <span className="text-neutral-400"> · {quincena.rutas.length} rutas</span>
            )}
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
          <span className="tabular text-[12px] font-bold" style={{ color: pctColor(quincena.pct) }}>
            {quincena.pct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-neutral-200/70 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(quincena.pct, 100)}%`, background: pctColor(quincena.pct) }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-neutral-500 tabular border-t border-neutral-200/70 pt-2">
        <span>
          <span className="font-bold text-neutral-700">{quincena.visitados}</span> de {quincena.planificados} visitados
        </span>
        {quincena.pendientes > 0 && (
          <span title="Puntos que quedaron sin visitar al cerrarse la quincena.">
            <span className="font-bold text-primary-600">{quincena.pendientes}</span> sin visitar
          </span>
        )}
      </div>

      {quincena.planificados > 0 && (
        <>
          <button
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            className="w-full py-1.5 rounded-xl text-[11px] font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {abierta ? 'Ocultar puntos' : 'Ver puntos'}
          </button>

          {abierta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-200/70 pt-2.5">
              <ListaPuntos
                titulo="Sin visitar"
                color="#e4032e"
                paradas={pendientes}
                vacio="Recorrió todos los puntos."
              />
              <ListaPuntos
                titulo="Visitados"
                color="#16a34a"
                paradas={visitados}
                vacio="No visitó ningún punto."
              />
            </div>
          )}
        </>
      )}
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
  const [quincenas, setQuincenas] = useState<QuincenaHistorialDTO[]>([]);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    ambientalService.getHistorialRutas(gestorId, 30)
      .then((data) => { if (!cancelado) setQuincenas(data); })
      .catch(() => { if (!cancelado) setError('No se pudo cargar el historial de rutas.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [gestorId]);

  const totales = useMemo(() => totalesHistorial(quincenas), [quincenas]);

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
            Una entrada por quincena de 14 días. La quincena en curso se ve en Desempeño.
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
      ) : quincenas.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-center">
          <p className="text-[13px] font-bold text-neutral-700">Este gestor todavía no cerró ninguna quincena</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            El historial se llena cuando termina la quincena en curso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {quincenas.map((q) => <QuincenaCard key={q.indice} quincena={q} />)}
        </div>
      )}
    </div>
  );
};
