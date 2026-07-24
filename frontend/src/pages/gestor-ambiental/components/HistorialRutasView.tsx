import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import type { RutaActiva } from '../lib/ruta.types';

const SEGMENT_COLORS: Record<'A' | 'B' | 'C', string> = {
  A: '#2563eb', B: '#16a34a', C: '#7c3aed',
};

interface RutaHistorialCardProps {
  ruta: RutaActiva;
  onVer: (ruta: RutaActiva) => void;
  onDelete: (ruta: RutaActiva) => void;
}

const RutaHistorialCard: React.FC<RutaHistorialCardProps> = ({ ruta, onVer, onDelete }) => {
  const visitados = ruta.segmentos.flatMap(s => s.paradas).filter(p => p.visitado).length;
  const porcentaje = ruta.totalPuntos > 0 ? Math.round((visitados / ruta.totalPuntos) * 100) : 0;
  const isCancelada = ruta.estado === 'cancelada';
  // fechaCierre = momento real en que se canceló/finalizó/se cerró sola.
  // Entradas viejas (antes de este campo) caen a fechaCreacion como respaldo.
  const fechaMostrada = ruta.fechaCierre ?? ruta.fechaCreacion;
  const etiquetaFecha = isCancelada ? 'Cancelada el' : 'Finalizada el';
  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 ${
        isCancelada
          ? 'bg-red-50 border-red-100'
          : 'bg-white border-neutral-100'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs font-black text-neutral-900">
              {etiquetaFecha} {format(new Date(fechaMostrada), "d 'de' MMMM yyyy · HH:mm", { locale: es })}
            </p>
            {isCancelada && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Cancelada</span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500">
            {ruta.totalPuntos} planificados · {ruta.puntosVencidos} vencidos
          </p>
        </div>
        <button
          onClick={() => onDelete(ruta)}
          className="text-neutral-300 hover:text-red-500 transition-colors"
          title="Eliminar del historial"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500">Visitados</span>
          <span className="text-[10px] font-bold text-neutral-700">{visitados}/{ruta.totalPuntos} · {porcentaje}%</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${porcentaje}%`, background: isCancelada ? '#ef4444' : '#3b82f6' }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        {ruta.segmentos.map(seg => (
          <div key={seg.id} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: SEGMENT_COLORS[seg.id] }} />
            <span className={`text-[10px] font-bold ${seg.estado === 'completado' ? 'text-green-600' : 'text-neutral-400'}`}>
              {seg.id} {seg.estado === 'completado' ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={() => onVer(ruta)}
        className={`w-full py-2 rounded-xl text-[11px] font-bold border transition-all ${
          isCancelada
            ? 'border-red-200 text-red-600 hover:bg-red-100'
            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        Ver detalle →
      </button>
    </div>
  );
};

export const HistorialRutasView: React.FC = () => {
  const { historialRutas, verHistorialRuta, eliminarRutaHistorial, setViewMode } =
    useGestorAmbientalCtx();
  const [confirmDelete, setConfirmDelete] = useState<RutaActiva | null>(null);

  const handleDelete = (ruta: RutaActiva) => {
    const visitados = ruta.segmentos.flatMap(s => s.paradas).filter(p => p.visitado).length;
    if (visitados > 0) {
      setConfirmDelete(ruta);
    } else {
      eliminarRutaHistorial(ruta.id);
    }
  };

  const finalizadas = historialRutas.filter(r => r.estado !== 'cancelada');
  const canceladas = historialRutas.filter(r => r.estado === 'cancelada');

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-y-auto">
      <div className="p-4 md:p-6 border-b border-neutral-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('planificador-ruta')}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-black text-neutral-900">Historial de Rutas</h2>
            <p className="text-[11px] text-neutral-400">{historialRutas.length} rutas guardadas</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-3 max-w-2xl">
        {historialRutas.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-neutral-400 font-medium">No hay rutas guardadas todavía</p>
            <p className="text-xs text-neutral-300 mt-1">Las rutas finalizadas aparecerán aquí</p>
          </div>
        )}
        {finalizadas.length > 0 && (
          <div className="mb-2">
            <h3 className="text-[11px] font-black text-neutral-500 uppercase tracking-widest mb-2 px-1">
              Finalizadas ({finalizadas.length})
            </h3>
            <div className="flex flex-col gap-3">
              {finalizadas.map(ruta => (
                <RutaHistorialCard key={ruta.id} ruta={ruta} onVer={verHistorialRuta} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
        {canceladas.length > 0 && (
          <div>
            <h3 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-2 px-1">
              Canceladas ({canceladas.length})
            </h3>
            <div className="flex flex-col gap-3">
              {canceladas.map(ruta => (
                <RutaHistorialCard key={ruta.id} ruta={ruta} onVer={verHistorialRuta} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-sm font-black text-neutral-900 mb-2">Eliminar ruta</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Esta ruta tiene{' '}
              {confirmDelete.segmentos.flatMap(s => s.paradas).filter(p => p.visitado).length}{' '}
              puntos visitados registrados. ¿Seguro que deseas eliminarla del historial? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { eliminarRutaHistorial(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
