import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityService } from '../services/activity.service';
import { usersService } from '../services/users.service';
import { useFileUrl } from '../hooks/useFileUrl';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activity, User } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  activity: Activity;
  onClose: () => void;
  onUpdated: (activity: Activity) => void;
}

const PhotoItem: React.FC<{
  photoKey: string;
  onClick: (url: string) => void;
}> = ({ photoKey, onClick }) => {
  const url = useFileUrl(photoKey);
  return (
    <button
      onClick={() => url && onClick(url)}
      className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-neutral-100 hover:border-red-400 transition-all shadow-sm bg-neutral-100 flex items-center justify-center group"
    >
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
      )}
    </button>
  );
};

const TIPO_LABELS: Record<string, string> = {
  RESIDUOS_ORDINARIOS: 'Residuos Ordinarios',
  RESIDUOS_VOLUMINOSOS: 'Residuos Voluminosos',
  ESCOMBROS: 'Escombros',
  RESIDUOS_ORGANICOS: 'Residuos Orgánicos',
  PLANTAS: 'Plantas',
};

export const ValidadorActividadPanel: React.FC<Props> = ({ activity, onClose, onUpdated }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [loadingCreator, setLoadingCreator] = useState(false);
  const [showValidationFlow, setShowValidationFlow] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchCreator = async () => {
      setLoadingCreator(true);
      try {
        const u = await usersService.getUserById(activity.createdByUserId);
        setCreator(u);
      } catch (e) {
        console.error('[ValidadorActividadPanel] Error fetching creator:', e);
      } finally {
        setLoadingCreator(false);
      }
    };
    fetchCreator();
  }, [activity.createdByUserId]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };
    if (showActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsDropdown]);

  const residuos = useMemo(() => {
    const opData = (activity.operativoData as any) || {};
    if (Array.isArray(opData.residuos)) return opData.residuos;
    if (opData.tipoResiduo) return [{ 
      tipoResiduo: opData.tipoResiduo, 
      areaLinealMetros: opData.areaLinealMetros || 0,
      photos: activity.photos || []
    }];
    return [];
  }, [activity]);

  // Fotos que no pertenecen a ningún residuo específico
  const generalPhotos = useMemo(() => {
    const activityPhotos = Array.isArray(activity.photos) ? activity.photos : [];
    const residuePhotos = new Set<string>();
    residuos.forEach((r: any) => {
      if (Array.isArray(r.photos)) r.photos.forEach((p: string) => residuePhotos.add(p));
      if (Array.isArray(r.photosRecogida)) r.photosRecogida.forEach((p: string) => residuePhotos.add(p));
    });
    return activityPhotos.filter(p => !residuePhotos.has(p));
  }, [activity, residuos]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const updated = await activityService.approve(activity.id, notes || undefined);
      showToast('Actividad aprobada correctamente', 'success');
      onUpdated(updated);
      setShowValidationFlow(null);
      setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo aprobar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      showToast('Debes ingresar una nota para rechazar', 'error');
      return;
    }
    setProcessing(true);
    try {
      const updated = await activityService.reject(activity.id, notes);
      showToast('Actividad rechazada', 'success');
      onUpdated(updated);
      setShowValidationFlow(null);
      setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo rechazar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = () => {
    const editPath = activity.operativoCategoria === 'AMBIENTAL' 
      ? `/gestor-ambiental/editar-actividad/${activity.id}`
      : `/gestor/editar-actividad/${activity.id}`;
    navigate(editPath);
  };

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
      <div className="shrink-0 bg-gradient-to-r from-red-800 to-red-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest opacity-70 uppercase">Foco de Validación</span>
            </div>
            <h2 className="text-lg font-bold leading-tight">{activity.activityType}</h2>
            <p className="text-xs font-medium opacity-90 mt-0.5">{activity.barrio}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Status Section */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={activity.status} />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Fecha de Reporte</p>
            <p className="text-xs font-bold text-neutral-700">
              {format(new Date(activity.dateTime || activity.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </p>
          </div>
        </div>

        {/* Creator Info */}
        <div className="px-6 py-5 border-b border-neutral-100">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Responsable</h3>
          {loadingCreator ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-neutral-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-neutral-200 rounded" />
                <div className="h-2 w-24 bg-neutral-100 rounded" />
              </div>
            </div>
          ) : creator ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                {creator.name?.[0]}{creator.lastname?.[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-800">{creator.name} {creator.lastname}</p>
                <p className="text-xs text-neutral-500 font-medium">{creator.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">Información de creador no disponible</p>
          )}
        </div>

        {/* Residue Summary List with Photos */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Residuos y Evidencias</h3>
          {residuos.length > 0 ? (
            <div className="space-y-6">
              {residuos.map((r: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-black text-neutral-700 uppercase tracking-tight">{TIPO_LABELS[r.tipoResiduo] || r.tipoResiduo}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-lg">{r.areaLinealMetros || 0}m²</span>
                  </div>

                  {/* Photos for this residue */}
                  {((r.photos && r.photos.length > 0) || (r.photosRecogida && r.photosRecogida.length > 0)) ? (
                    <div className="flex gap-2 overflow-x-auto pb-1 ml-[-4px] pl-[4px] scrollbar-hide">
                      {r.photos?.map((p: string, pi: number) => (
                        <PhotoItem key={`init-${pi}`} photoKey={p} onClick={setExpandedPhoto} />
                      ))}
                      {r.photosRecogida?.map((p: string, pi: number) => (
                        <div key={`rec-${pi}`} className="relative">
                           <PhotoItem photoKey={p} onClick={setExpandedPhoto} />
                           <span className="absolute bottom-1 right-1 bg-green-600 text-[8px] font-bold text-white px-1 rounded uppercase">Fin</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-400 italic">Sin fotos específicas</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No hay residuos detallados</p>
          )}
        </div>

        {/* General Photos (if any) */}
        {generalPhotos.length > 0 && (
          <div className="px-6 py-5 border-b border-neutral-100">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Otras Fotografías</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 ml-[-4px] pl-[4px] scrollbar-hide">
              {generalPhotos.map((p, i) => (
                <PhotoItem key={i} photoKey={p} onClick={setExpandedPhoto} />
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {(activity.operativoData as any)?.observaciones && (
          <div className="px-6 py-5">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Observaciones Técnicas</h3>
            <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-2xl border border-neutral-100 italic">
              "{ (activity.operativoData as any).observaciones }"
            </p>
          </div>
        )}

        {/* Validation Notes (Section toggle) */}
        {showValidationFlow && (
          <div className="mx-6 p-5 bg-neutral-50 border border-neutral-200 rounded-3xl animate-in slide-in-from-top-4 duration-300 shadow-inner mt-2">
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${showValidationFlow === 'APPROVE' ? 'text-emerald-600' : 'text-red-600'}`}>
              Notas de {showValidationFlow === 'APPROVE' ? 'Validación' : 'Rechazo'}
            </h3>
            <textarea
              className="w-full text-sm border-2 border-neutral-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors min-h-[100px] resize-none shadow-sm"
              placeholder={showValidationFlow === 'APPROVE' ? "Opcional: Recomendaciones para el gestor..." : "Obligatorio: Motivo por el cual no se valida el reporte..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="shrink-0 p-6 bg-white border-t border-neutral-100 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        {showValidationFlow && (
          <div className="flex gap-3">
            <button
              disabled={processing}
              onClick={() => { setShowValidationFlow(null); setNotes(''); }}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              disabled={processing}
              onClick={showValidationFlow === 'APPROVE' ? handleApprove : handleReject}
              className={`flex-1 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 ${
                showValidationFlow === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'
              }`}
            >
              {processing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {showValidationFlow === 'APPROVE' ? 'Aprobar' : 'Rechazar'}
            </button>
          </div>
        )}
        {!showValidationFlow && (
          <>
            <div className="relative" ref={dropdownRef}>
              {(activity.status === 'ENVIADA' || activity.status === 'RECHAZADA') && (
                <>
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="w-full py-3.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg flex items-center justify-center gap-2 group"
                  >
                    <span>Acciones de Validación</span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${showActionsDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showActionsDropdown && (
                    <div className="absolute bottom-full left-0 w-full mb-3 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 z-[600]">
                      <button
                        onClick={() => { handleEdit(); setShowActionsDropdown(false); }}
                        className="w-full px-6 py-4 text-left text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-3 transition-colors border-b border-neutral-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="uppercase tracking-widest text-[10px]">Editar</span>
                          <span className="text-[10px] opacity-50 font-medium normal-case">Modificar datos del reporte</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowValidationFlow('APPROVE'); setShowActionsDropdown(false); }}
                        className="w-full px-6 py-4 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors border-b border-neutral-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="uppercase tracking-widest text-[10px]">Aprobar</span>
                          <span className="text-[10px] opacity-50 font-medium normal-case text-neutral-400">Validar y publicar actividad</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowValidationFlow('REJECT'); setShowActionsDropdown(false); }}
                        className="w-full px-6 py-4 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="uppercase tracking-widest text-[10px]">Rechazar</span>
                          <span className="text-[10px] opacity-50 font-medium normal-case text-neutral-400">Devolver para corrección</span>
                        </div>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <a
              href={`/validador/actividad/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-2xl border-2 border-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-widest hover:border-neutral-200 hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
            >
              <span>Ver Detalle Completo</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`absolute bottom-24 left-6 right-6 px-4 py-3 rounded-xl shadow-xl border z-50 text-xs font-bold flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* Expanded Photo */}
      {expandedPhoto && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-12" onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
          <button className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
