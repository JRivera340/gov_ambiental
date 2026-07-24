import React from 'react';
import { format, intervalToDuration, formatDuration } from 'date-fns';
import { es } from 'date-fns/locale';
import { tipoResiduoLabels } from '../lib/constants';
import { getActorIndisciplinaLabel, joinLabels } from '../../../types/ambientalCampos';
import { ResiduoDetailImage } from './ResiduoImages';

interface ResiduoDetailModalProps {
  residuo: any;
  barrio?: string;
  activityDateTime?: string;
  activityCreatedByNombre?: string;
  onClose: () => void;
  onPreview: (p: string) => void;
}

export const ResiduoDetailModal: React.FC<ResiduoDetailModalProps> = ({ residuo, barrio, activityDateTime, activityCreatedByNombre, onClose, onPreview }) => {
  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-none max-w-2xl w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" style={{ maxHeight: '90dvh' }}>
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Detalles del Residuo</h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {residuo.aprobado && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase text-emerald-700 bg-emerald-100 border border-emerald-200">
                  Validado
                </span>
              )}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${residuo.recogido ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'}`}>
                {residuo.recogido ? 'Recogido' : 'Pendiente'}
              </span>
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                {tipoResiduoLabels[residuo.tipoResiduo] || residuo.tipoResiduo}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors bg-neutral-50 rounded-xl hover:bg-neutral-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-hide">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Barrio</p>
              <p className="text-sm font-bold text-neutral-800">{barrio}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Fecha Detección</p>
              <p className="text-sm font-bold text-neutral-800">
                {residuo.dateTime
                  ? format(new Date(residuo.dateTime), 'dd/MM/yyyy HH:mm')
                  : (activityDateTime ? format(new Date(activityDateTime), 'dd/MM/yyyy HH:mm') : 'N/A')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Área</p>
              <p className="text-sm font-bold text-neutral-800">{residuo.areaLinealMetros} m</p>
            </div>
            {(residuo.createdByNombre || activityCreatedByNombre) && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Registrado por</p>
                <p className="text-sm font-bold text-neutral-800 underline decoration-primary/20">{residuo.createdByNombre || activityCreatedByNombre}</p>
              </div>
            )}
          </div>

          {/* Extra Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">¿Quién dispuso?</p>
                <p className="text-sm font-bold text-neutral-800">{residuo.quienDispuso}</p>
              </div>
              {Array.isArray((residuo as any).actoresIndisciplina) && (residuo as any).actoresIndisciplina.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Actores que generan indisciplina</p>
                  <p className="text-sm font-bold text-neutral-800">{joinLabels((residuo as any).actoresIndisciplina, getActorIndisciplinaLabel)}</p>
                </div>
              )}
              <div className="flex gap-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">¿Olores?</p>
                  <p className="text-sm font-bold text-neutral-800">{residuo.percibeOlores ? 'Sí' : 'No'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">¿Vectores?</p>
                  <p className="text-sm font-bold text-neutral-800">{residuo.percibeVectores ? 'Sí' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Observaciones</p>
              <p className="text-sm text-neutral-600 bg-neutral-50 p-4 rounded-2xl italic">
                "{residuo.observaciones || 'No hay observaciones registradas.'}"
              </p>
            </div>
          </div>

          {/* Photos (Initial) */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest px-1">Evidencia Detección</p>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 scrollbar-hide">
              {residuo.photos?.map((p: string, i: number) => (
                <ResiduoDetailImage key={i} photo={p} onPreview={onPreview} />
              ))}
              {(!residuo.photos || residuo.photos.length === 0) && (
                <div className="w-full py-8 text-center bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-100 italic text-neutral-400 text-xs">
                  No hay fotos de evidencia
                </div>
              )}
            </div>
          </div>

          {/* Collection Info (If collected) */}
          {residuo.recogido && (
            <div className="pt-6 border-t border-neutral-100 space-y-6">
              <div className="bg-green-50 p-4 sm:p-6 rounded-[24px] border border-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-600/20 shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-green-800 uppercase tracking-wider">Información de Recolección</h4>
                    <p className="text-xs text-green-600 font-bold">
                      Completado el {residuo.fechaRecogida ? format(new Date(residuo.fechaRecogida), 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </p>
                    {residuo.recogidoByNombre && (
                      <p className="text-[11px] text-green-700 font-black uppercase mt-1">Recogido por: {residuo.recogidoByNombre}</p>
                    )}
                    {residuo.dateTime && residuo.fechaRecogida && (
                      <p className="text-[11px] text-green-700 font-black uppercase mt-1 opacity-70">
                        Tiempo de respuesta: {(() => {
                          const duration = intervalToDuration({
                            start: new Date(residuo.dateTime),
                            end: new Date(residuo.fechaRecogida),
                          });
                          return formatDuration(duration, {
                            locale: es,
                            format: ['days', 'hours', 'minutes'],
                            delimiter: ', ',
                          }) || 'Menos de un minuto';
                        })()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-black text-green-700/50 uppercase tracking-widest px-1">Evidencia de Recolección</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                    {residuo.photosRecogida?.map((p: string, i: number) => (
                      <ResiduoDetailImage key={i} photo={p} isRecogida onPreview={onPreview} />
                    ))}
                    {(!residuo.photosRecogida || residuo.photosRecogida.length === 0) && (
                      <p className="text-xs text-green-600 italic">No hay fotos de recolección registradas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 sm:p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-neutral-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-neutral-900/10"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
