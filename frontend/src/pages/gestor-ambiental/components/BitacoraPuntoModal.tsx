import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activity } from '../../../types';
import { activityService } from '../../../services/activity.service';
import { tipoResiduoLabels } from '../lib/constants';
import { RESIDUO_TIPOS } from '../../../types/residuoTipos';

interface BitacoraPuntoModalProps {
  activity: Activity;
  canAdd: boolean;
  onClose: () => void;
  onUpdated: (updated: Activity) => void;
  setToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const BitacoraPuntoModal: React.FC<BitacoraPuntoModalProps> = ({
  activity,
  canAdd,
  onClose,
  onUpdated,
  setToast,
}) => {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoResiduo, setTipoResiduo] = useState('');
  const [hora, setHora] = useState('');
  const [saving, setSaving] = useState(false);

  const bitacora = activity.bitacora || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !cedula.trim() || !direccion.trim() || !tipoResiduo || !hora) return;
    setSaving(true);
    try {
      const updated = await activityService.agregarBitacora(activity.id, {
        nombrePersona: nombre.trim(),
        cedula: cedula.trim(),
        direccion: direccion.trim(),
        tipoResiduo,
        hora,
      });
      onUpdated(updated);
      setToast({ message: 'Actor agregado a la bitácora', type: 'success' });
      setNombre('');
      setCedula('');
      setDireccion('');
      setTipoResiduo('');
      setHora('');
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al agregar a la bitácora', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" style={{ maxHeight: '90dvh' }}>
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">Bitácora de Actores</h2>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
              Punto · {activity.barrio}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors bg-neutral-50 rounded-xl hover:bg-neutral-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actors list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-hide">
          {bitacora.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
              <p className="text-sm font-bold text-neutral-400">No hay actores registrados</p>
            </div>
          ) : (
            bitacora.map((b) => (
              <div key={b.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{b.nombrePersona}</p>
                  <p className="text-[11px] text-neutral-400 font-bold">
                    {format(new Date(b.fecha), "d MMM yyyy", { locale: es })}, {b.hora}
                  </p>
                </div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  {tipoResiduoLabels[b.tipoResiduo] || b.tipoResiduo}
                </p>
                <div className="text-sm text-neutral-600 leading-relaxed grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <p><span className="text-neutral-400">CC:</span> {b.cedula}</p>
                  <p><span className="text-neutral-400">Dirección:</span> {b.direccion}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add actor form */}
        {canAdd && (
          <form onSubmit={handleSubmit} className="shrink-0 p-4 sm:p-6 border-t-2 border-slate-100 bg-slate-50/50 space-y-3">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-widest">Agregar actor</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de quien deposita el residuo"
              className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Cédula"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
              />
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
              />
            </div>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección del actor"
              className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
            />
            <select
              value={tipoResiduo}
              onChange={(e) => setTipoResiduo(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
            >
              <option value="">Selecciona el tipo de residuo</option>
              {RESIDUO_TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={saving || !nombre.trim() || !cedula.trim() || !direccion.trim() || !tipoResiduo || !hora}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-white bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-700/20 transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Agregar actor'}
              </button>
            </div>
          </form>
        )}

        {!canAdd && (
          <div className="shrink-0 p-4 sm:p-6 border-t border-neutral-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-neutral-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
