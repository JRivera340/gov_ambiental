import React from 'react';
import { format } from 'date-fns';
import type { Activity, ResiduoEntry } from '../../../types';
import { activityService } from '../../../services/activity.service';
import { PhotosUpload } from '../../../components/PhotosUpload';
import { getResiduos } from '../lib/residuos';
import { tipoResiduoLabels } from '../lib/constants';
import { ResiduoImage } from './ResiduoImages';

type SeguimientoAction = 'MARCAR_RECOGIDO' | 'AGREGAR_RESIDUO' | null;

interface SeguimientoModalProps {
  activity: Activity;
  user: any;
  action: SeguimientoAction;
  setAction: (a: SeguimientoAction) => void;
  selectedResiduo: ResiduoEntry | null;
  setSelectedResiduo: (r: ResiduoEntry | null) => void;
  photos: string[];
  setPhotos: (p: string[]) => void;
  fechaRecogida: string;
  setFechaRecogida: (s: string) => void;
  onPreview: (p: string) => void;
  onClose: () => void;
  onUpdated: (updated: Activity) => void;
  setToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const SeguimientoModal: React.FC<SeguimientoModalProps> = ({
  activity,
  user,
  action,
  setAction,
  selectedResiduo,
  setSelectedResiduo,
  photos,
  setPhotos,
  fechaRecogida,
  setFechaRecogida,
  onPreview,
  onClose,
  onUpdated,
  setToast,
}) => {
  const residuos = getResiduos(activity);
  const pendientes = residuos.filter((r) => !r.recogido);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-none max-w-lg w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" style={{ maxHeight: '90dvh' }}>
        <div className="shrink-0 p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Seguimiento</h2>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{activity.barrio}</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors bg-neutral-50 rounded-xl hover:bg-neutral-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          {!action ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-sm text-neutral-500 font-medium mb-2">¿Qué acción deseas realizar?</p>

              <button
                onClick={() => { setAction('MARCAR_RECOGIDO'); setPhotos([]); }}
                className="w-full text-left p-5 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-green-100 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-800 text-sm">Marcar como recogido</h4>
                    <p className="text-xs text-green-600/70 mt-0.5 font-medium">Registra la evidencia de limpieza del punto</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setAction('AGREGAR_RESIDUO'); setPhotos([]); }}
                className="w-full text-left p-5 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-800 text-sm">Agregar nuevo residuo</h4>
                    <p className="text-xs text-blue-600/70 mt-0.5 font-medium">Se detectó otro tipo de residuo en el mismo punto</p>
                  </div>
                </div>
              </button>
            </div>
          ) : action === 'MARCAR_RECOGIDO' ? (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              {!selectedResiduo ? (
                <>
                  <p className="text-sm text-neutral-500 font-medium mb-2">Selecciona el residuo recogido:</p>
                  <div className="space-y-2">
                    {pendientes.map((r, index) => (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedResiduo(r); setPhotos([]); }}
                        className="w-full text-left p-4 bg-white border border-neutral-200 rounded-2xl hover:border-green-400 hover:bg-green-50/50 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <span className="font-bold text-sm text-neutral-800">{index + 1}. {tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-neutral-200">·</span>
                            <span className="text-[11px] font-bold text-neutral-400 uppercase">{r.quienDispuso}</span>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-neutral-300 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <p className="text-[11px] font-black text-green-600 uppercase tracking-widest mb-1">Residuo seleccionado</p>
                    <p className="text-sm font-bold text-neutral-800">
                      {(() => {
                        const idx = pendientes.findIndex((p) => p.id === selectedResiduo.id);
                        return idx >= 0 ? `${idx + 1}. ` : '';
                      })()}
                      {tipoResiduoLabels[selectedResiduo.tipoResiduo] || selectedResiduo.tipoResiduo}
                    </p>
                  </div>

                  {selectedResiduo.photos && selectedResiduo.photos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Foto Inicial (Detección)</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {selectedResiduo.photos.map((p, i) => (
                          <div key={i} className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-neutral-200">
                            <ResiduoImage photo={p} onPreview={onPreview} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <PhotosUpload
                      onUploadSuccess={(urls) => setPhotos(urls.slice(0, 1))}
                      existingUrls={photos}
                      activityId={activity.id}
                      maxPhotos={1}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Fecha y Hora de Recolección</label>
                    <input
                      type="datetime-local"
                      value={fechaRecogida}
                      onChange={(e) => setFechaRecogida(e.target.value)}
                      required
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-green-500/20 outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setSelectedResiduo(null); setPhotos([]); }} className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-all">
                      Cambiar residuo
                    </button>
                    <button
                      type="button"
                      disabled={photos.length === 0}
                      onClick={async () => {
                        try {
                          const updated = await activityService.addSeguimiento(activity.id, {
                            action: 'MARCAR_RECOGIDO',
                            residuoId: selectedResiduo.id,
                            photosRecogida: photos,
                            fechaRecogida: new Date(fechaRecogida).toISOString(),
                            recogidoByNombre: user?.name ? `${user.name} ${user.lastname || ''}`.trim() : user?.email,
                          });
                          onUpdated(updated);
                          setToast({ message: 'Residuo marcado como recogido exitosamente', type: 'success' });
                          onClose();
                        } catch (err: any) {
                          setToast({ message: err?.response?.data?.message || 'Error al actualizar', type: 'error' });
                        }
                      }}
                      className="flex-[2] px-4 py-3 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                      Confirmar Recolección
                    </button>
                  </div>
                </div>
              )}
              {!selectedResiduo && (
                <button onClick={() => setAction(null)} className="text-xs text-neutral-400 hover:text-neutral-600 font-bold transition-colors">← Volver</button>
              )}
            </div>
          ) : (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <form className="space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);

                if (photos.length === 0) {
                  setToast({ message: 'Debes agregar evidencia fotográfica del residuo', type: 'error' });
                  return;
                }

                const data = {
                  action: 'AGREGAR_RESIDUO' as const,
                  nuevoResiduo: {
                    tipoResiduo: formData.get('tipoResiduo') as string,
                    quienDispuso: formData.get('quienDispuso') as string,
                    dateTime: new Date(formData.get('dateTime') as string).toISOString(),
                    percibeOlores: formData.get('percibeOlores') === 'true',
                    percibeVectores: formData.get('percibeVectores') === 'true',
                    areaLinealMetros: Number(formData.get('areaLinealMetros')),
                    observaciones: formData.get('observaciones') as string,
                    photos,
                    createdByUserId: user?.id,
                    createdByNombre: user?.name ? `${user.name} ${user.lastname || ''}`.trim() : user?.email,
                  },
                };

                try {
                  const updated = await activityService.addSeguimiento(activity.id, data);
                  onUpdated(updated);
                  setToast({ message: 'Nuevo residuo agregado correctamente', type: 'success' });
                  onClose();
                } catch (err: any) {
                  setToast({ message: err?.response?.data?.message || 'Error al agregar residuo', type: 'error' });
                }
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Tipo de Residuo</label>
                    <select name="tipoResiduo" required className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none">
                      {Object.entries(tipoResiduoLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">¿Quién dispuso?</label>
                    <select name="quienDispuso" required className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none">
                      <option value="COMUNIDAD">Comunidad</option>
                      <option value="ESTABLECIMIENTOS_COMERCIALES">Establecimientos comerciales</option>
                      <option value="VOLQUETAS">Volquetas</option>
                      <option value="HABITANTES_DE_CALLE">Habitantes de calle</option>
                      <option value="OTROS_NO_SE_CONOCE">Otros, no se conoce</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Fecha y Hora de Detección</label>
                    <input
                      name="dateTime"
                      type="datetime-local"
                      required
                      defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                      className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">¿Olores?</label>
                    <select name="percibeOlores" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">¿Vectores?</label>
                    <select name="percibeVectores" className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Área (m)</label>
                    <input name="areaLinealMetros" type="number" step="0.01" required className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-sm font-bold" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <PhotosUpload
                      onUploadSuccess={(urls) => setPhotos(urls.slice(0, 1))}
                      existingUrls={photos}
                      activityId={activity.id}
                      maxPhotos={1}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setAction(null); setPhotos([]); }} className="flex-1 px-4 py-3 rounded-xl text-xs font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-[2] px-4 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">
                    Guardar Residuo
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
