import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activity, ResiduoEntry } from '../../../types';
import { activityService } from '../../../services/activity.service';
import { tipoResiduoLabels } from '../lib/constants';

interface NotasResiduoModalProps {
  residuo: ResiduoEntry;
  puntoId: string;
  canAdd: boolean;
  onClose: () => void;
  onUpdated: (updated: Activity) => void;
  setToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const NotasResiduoModal: React.FC<NotasResiduoModalProps> = ({
  residuo,
  puntoId,
  canAdd,
  onClose,
  onUpdated,
  setToast,
}) => {
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notas = residuo.notas || [];

  const handleDelete = async (notaId: string) => {
    setDeletingId(notaId);
    try {
      const updated = await activityService.eliminarNotaResiduo(puntoId, residuo.id, notaId);
      onUpdated(updated);
      setToast({ message: 'Nota eliminada', type: 'success' });
      onClose();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al eliminar nota', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setSaving(true);
    try {
      const updated = await activityService.agregarNotaResiduo(puntoId, residuo.id, texto.trim());
      onUpdated(updated);
      setToast({ message: 'Nota agregada correctamente', type: 'success' });
      setTexto('');
      onClose();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al agregar nota', type: 'error' });
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
            <h2 className="text-lg font-black text-neutral-900 tracking-tight">Notas del Residuo</h2>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
              {tipoResiduoLabels[residuo.tipoResiduo] || residuo.tipoResiduo}
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

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-hide">
          {notas.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
              <p className="text-sm font-bold text-neutral-400">No hay notas registradas</p>
            </div>
          ) : (
            notas.map((n) => (
              <div key={n.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">{n.autorNombre}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[11px] text-neutral-400 font-bold">
                      {format(new Date(n.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                    {canAdd && (
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        title="Eliminar nota"
                        className="p-1 rounded-lg text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === n.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">{n.texto}</p>
              </div>
            ))
          )}
        </div>

        {/* Add note form */}
        {canAdd && (
          <form onSubmit={handleSubmit} className="shrink-0 p-4 sm:p-6 border-t-2 border-amber-100 bg-amber-50/50 space-y-3">
            <label className="block text-[11px] font-black text-amber-700 uppercase tracking-widest">Agregar nota</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe una nota sobre este residuo..."
              rows={3}
              className="w-full bg-white border-2 border-amber-200 rounded-2xl p-3 text-sm resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none font-medium"
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !texto.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Agregar nota'}
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
