import React, { useState, useCallback, useEffect } from 'react';
import { activityService } from '../services/activity.service';
import { useFileUrl } from '../hooks/useFileUrl';
import type { Activity, ResiduoEntry } from '../types';
import { RESIDUO_TIPOS } from '../types/residuoTipos';
import { getResiduos as getResiduosFromActivity } from '../pages/gestor-ambiental/lib/residuos';

interface Props {
  activity: Activity;
  onClose: () => void;
  onUpdated: (activity: Activity) => void;
}

const TIPO_LABELS: Record<string, string> = Object.fromEntries(
  RESIDUO_TIPOS.map((t) => [t.value, t.label]),
);

const ResiduoPhotoItem: React.FC<{
  photoKey: string;
  alt: string;
  onClick: (url: string) => void;
}> = ({ photoKey, alt, onClick }) => {
  const url = useFileUrl(photoKey);
  return (
    <button
      onClick={() => url && onClick(url)}
      className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-neutral-200 hover:border-red-400 transition-colors shadow-sm bg-neutral-100 flex items-center justify-center"
    >
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
      )}
    </button>
  );
};

export const ValidadorResiduoPanel: React.FC<Props> = ({ activity, onClose, onUpdated }) => {
  // Local state for optimistic updates — updates immediately on action, syncs with server response
  const [localResiduos, setLocalResiduos] = useState<ResiduoEntry[]>(
    () => getResiduosFromActivity(activity),
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ResiduoEntry>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedPhotos, setExpandedPhotos] = useState<string | null>(null);
  
  const isPointValidated = activity.status === 'APROBADA' || activity.status === 'PUBLICADA';

  // Sync local state when parent activity changes (e.g., after server confirms)
  useEffect(() => {
    // Only update from activity prop if we are NOT currently saving
    // to avoid overwriting optimistic state with stale data from parent re-render
    if (!saving) {
      setLocalResiduos(getResiduosFromActivity(activity));
    }
  }, [activity, saving]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const patchResiduo = useCallback(async (idx: number, changes: Partial<ResiduoEntry>) => {
    // Optimistic update: apply immediately for instant UI feedback
    const prev = [...localResiduos];
    const optimistic = [...localResiduos];
    optimistic[idx] = { ...optimistic[idx], ...changes };
    setLocalResiduos(optimistic);
    setSaving(true);

    try {
      // Send update to server - the updated response is now correct thanks to backend fix
      const updated = await activityService.aprobarResiduo(activity.id, optimistic);
      console.log(`[PATCH_RESPONSE] Activity updated:`, updated);
      
      const freshResiduos = getResiduosFromActivity(updated);
      setLocalResiduos(freshResiduos);
      onUpdated(updated);
      showToast('Residuo actualizado correctamente', 'success');
    } catch (e: any) {
      // Revert on error
      setLocalResiduos(prev);
      showToast(`Error: ${e?.message || 'desconocido'}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [activity, localResiduos, onUpdated]);

  const handleAprobar = (idx: number) => {
    patchResiduo(idx, { aprobado: true, aprobadoAt: new Date().toISOString() });
  };

  const handleGuardarEdicion = (idx: number) => {
    patchResiduo(idx, editDraft);
    setEditingIdx(null);
    setEditDraft({});
  };

  const residuos = localResiduos;

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[500] flex flex-col overflow-hidden rounded-l-2xl"
      style={{ animation: 'slideInRight 0.25s ease' }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-red-700 to-rose-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-[11px] font-semibold tracking-wider opacity-80 uppercase">Punto #{activity.pointNumber ?? '—'} · {activity.barrio}</span>
            </div>
            <h2 className="text-sm font-bold leading-tight">{residuos.length} residuo{residuos.length !== 1 ? 's' : ''} identificados</h2>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(`/api/debug-sync/${activity.id}`);
                  const data = await res.json();
                  alert(`DB RAW DATA:\n\n${JSON.stringify(data.data?.residuos, null, 2)}`);
                } catch (e: any) {
                  alert(`Error diagnóstico: ${e.message}`);
                }
              }}
              className="text-[9px] font-bold bg-black/20 hover:bg-black/40 px-2 py-1 rounded uppercase tracking-tighter transition-colors"
            >
              🔍 Diagnóstico DB
            </button>
          </div>
        </div>

        {/* Stats rápidos - validador ve aprobación, no recogida */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-black">{(residuos as any[]).filter(r => !r.aprobado).length}</div>
            <div className="text-[9px] opacity-80 uppercase font-bold">Por Validar</div>
          </div>
          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
            <div className="text-lg font-black">{(residuos as any[]).filter(r => r.aprobado).length}</div>
            <div className="text-[9px] opacity-80 uppercase font-bold">Validados</div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="float-right opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Expanded photo overlay */}
      {expandedPhotos && (
        <div
          className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedPhotos(null)}
        >
          <img src={expandedPhotos} alt="Foto residuo" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Lista de residuos */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {residuos.length === 0 && (
          <div className="py-10 text-center text-neutral-400 text-sm">No hay residuos registrados en este punto.</div>
        )}

        {residuos.map((residuo, idx) => {
          const isEditing = editingIdx === idx;
          const isAprobado = !!(residuo as any).aprobado;

          return (
            <div
              key={residuo.id || idx}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isAprobado ? 'border-emerald-200 bg-emerald-50/40' : isEditing ? 'border-red-200 shadow-md' : 'border-neutral-200 bg-white hover:shadow-sm'
              }`}
            >
              {/* Cabecera residuo */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${!isAprobado ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-neutral-800 truncate">
                      {TIPO_LABELS[residuo.tipoResiduo] || String(residuo.tipoResiduo || '').replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-medium">
                      {residuo.areaLinealMetros || 0}m²
                      {residuo.quienDispuso ? ` · ${residuo.quienDispuso}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAprobado ? (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 rounded-lg px-2 py-1 border border-emerald-200 uppercase">Validado</span>
                  ) : (
                    <span className="text-[9px] font-black rounded-lg px-2 py-1 border uppercase text-amber-700 bg-amber-100 border-amber-200">
                      Por validar
                    </span>
                  )}
                </div>
              </div>

              {/* Fotos (Iniciales + Recogida) */}
              <div className="px-4 pb-3 space-y-2">
                {/* Iniciales */}
                {Array.isArray(residuo.photos) && residuo.photos.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1 tracking-wider">Evidencia Inicial</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {residuo.photos.map((photo: string, pIdx: number) => (
                        <ResiduoPhotoItem
                          key={`pre-${pIdx}`}
                          photoKey={photo}
                          alt="Evidencia Inicial"
                          onClick={(url) => setExpandedPhotos(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recogida */}
                {residuo.recogido && Array.isArray(residuo.photosRecogida) && residuo.photosRecogida.length > 0 && (
                  <div className="border-t border-neutral-100 pt-2">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1 tracking-wider flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Evidencia de Recogida
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {residuo.photosRecogida.map((photo: string, pIdx: number) => (
                        <ResiduoPhotoItem
                          key={`post-${pIdx}`}
                          photoKey={photo}
                          alt="Evidencia Recogida"
                          onClick={(url) => setExpandedPhotos(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(!residuo.photos || residuo.photos.length === 0) && (!residuo.photosRecogida || residuo.photosRecogida.length === 0) && (
                  <div className="py-2 px-3 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-center">
                    <p className="text-[10px] text-neutral-400 font-medium">Sin evidencia fotográfica</p>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              {residuo.observaciones && !isEditing && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-neutral-500 italic border-l-2 border-neutral-200 pl-2">{residuo.observaciones}</p>
                </div>
              )}

              {/* Formulario de edición */}
              {isEditing && (
                <div className="px-4 pb-3 space-y-2 border-t border-neutral-100 pt-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Tipo de Residuo</label>
                    <select
                      value={editDraft.tipoResiduo || residuo.tipoResiduo}
                      onChange={e => setEditDraft(d => ({ ...d, tipoResiduo: e.target.value }))}
                      className="w-full text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-red-400"
                    >
                      {Object.entries(TIPO_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Área (m²)</label>
                    <input
                      type="number"
                      value={editDraft.areaLinealMetros ?? residuo.areaLinealMetros ?? 0}
                      onChange={e => setEditDraft(d => ({ ...d, areaLinealMetros: parseFloat(e.target.value) || 0 }))}
                      className="w-full text-xs border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1 block">Observaciones</label>
                    <textarea
                      rows={2}
                      value={editDraft.observaciones ?? residuo.observaciones ?? ''}
                      onChange={e => setEditDraft(d => ({ ...d, observaciones: e.target.value }))}
                      className="w-full text-xs border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-400 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="px-4 py-2.5 border-t border-neutral-100 flex flex-col gap-2">
                {!isPointValidated && !isAprobado && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-[10px] text-amber-800 font-medium">
                      Debes validar el punto (actividad principal) antes de validar sus residuos.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => { setEditingIdx(null); setEditDraft({}); }}
                        className="flex-1 text-[11px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl py-2 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleGuardarEdicion(idx)}
                        disabled={saving}
                        className="flex-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl py-2 transition-all disabled:opacity-60 flex items-center justify-center gap-1"
                      >
                        {saving ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</> : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <>
                      {!isAprobado && (
                        <>
                          <button
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditDraft({
                                tipoResiduo: residuo.tipoResiduo,
                                areaLinealMetros: residuo.areaLinealMetros,
                                observaciones: residuo.observaciones,
                              });
                            }}
                            className="flex-1 text-[11px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl py-2 transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleAprobar(idx)}
                            disabled={saving || !isPointValidated}
                            className={`flex-1 text-[11px] font-bold text-white rounded-xl py-2 transition-all flex items-center justify-center gap-1 ${
                              !isPointValidated ? 'bg-neutral-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Validar'}
                          </button>
                        </>
                      )}
                      {isAprobado && (
                        <button
                          onClick={() => patchResiduo(idx, { aprobado: false, aprobadoAt: undefined })}
                          disabled={saving}
                          className="flex-1 text-[11px] font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl py-2 transition-all"
                        >
                          Deshacer validación
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
