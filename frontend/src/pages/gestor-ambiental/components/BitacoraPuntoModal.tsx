import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activity, ActorTipo, EstadoActor, PuntoActor } from '../../../types';
import { activityService } from '../../../services/activity.service';
import { filesService } from '../../../services/files.service';
import { tipoResiduoLabels } from '../lib/constants';
import { RESIDUO_TIPOS } from '../../../types/residuoTipos';
import { useFileUrl } from '../../../hooks/useFileUrl';
import {
  TIPO_ACTOR_OPTIONS,
  ACTIVIDAD_OBSERVADA_OPTIONS,
  CANTIDAD_APROXIMADA_OPTIONS,
  EVIDENCIA_TIPO_OPTIONS,
  ESTADO_ACTOR_OPTIONS,
  getActividadObservadaLabel,
  getCantidadAproximadaLabel,
  getEstadoActor,
} from '../lib/bitacoraActores';

interface BitacoraPuntoModalProps {
  activity: Activity;
  canAdd: boolean;
  onClose: () => void;
  onUpdated: (updated: Activity) => void;
  setToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

const EstadoDot: React.FC<{ estado: string }> = ({ estado }) => {
  const info = getEstadoActor(estado);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
      <span className="text-xs font-bold text-neutral-700">{info.label}</span>
    </span>
  );
};

const EvidenciaThumb: React.FC<{ archivo: string }> = ({ archivo }) => {
  const url = useFileUrl(archivo);
  return (
    <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

function ultimoEvento(actor: PuntoActor) {
  return actor.eventos.reduce((mas, e) => (new Date(e.fecha) > new Date(mas.fecha) ? e : mas), actor.eventos[0]);
}

export const BitacoraPuntoModal: React.FC<BitacoraPuntoModalProps> = ({
  activity,
  canAdd,
  onClose,
  onUpdated,
  setToast,
}) => {
  const actores = activity.bitacoraActores || [];
  const [modo, setModo] = useState<'lista' | 'form'>('lista');
  const [actorExpandido, setActorExpandido] = useState<string | null>(null);

  // Identificación del actor
  const [tipoActor, setTipoActor] = useState<ActorTipo>('PERSONA');
  const [nombre, setNombre] = useState('');
  const [cedulaNit, setCedulaNit] = useState('');
  const [placa, setPlaca] = useState('');
  const [direccion, setDireccion] = useState('');

  // Registro del evento
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [tipoResiduo, setTipoResiduo] = useState('');
  const [actividadObservada, setActividadObservada] = useState('');
  const [cantidadAproximada, setCantidadAproximada] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Evidencia
  const [evidenciaTipos, setEvidenciaTipos] = useState<string[]>([]);
  const [evidenciaArchivos, setEvidenciaArchivos] = useState<string[]>([]);
  const [numeroEvidenciasManual, setNumeroEvidenciasManual] = useState(1);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seguimiento
  const [estado, setEstado] = useState<EstadoActor>('IDENTIFICADO');

  const [saving, setSaving] = useState(false);

  const requiereArchivo = evidenciaTipos.some((t) => t !== 'OBSERVACION_DIRECTA');
  const soloObservacionDirecta = evidenciaTipos.length > 0 && !requiereArchivo;
  const numeroEvidencias = requiereArchivo ? evidenciaArchivos.length : numeroEvidenciasManual;

  const toggleEvidenciaTipo = (value: string) => {
    setEvidenciaTipos((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleArchivoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoArchivo(true);
    try {
      const response = await filesService.uploadPhotos([file], activity.id);
      const urls = response.keys || response.urls;
      setEvidenciaArchivos((prev) => [...prev, ...urls]);
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al subir el archivo', type: 'error' });
    } finally {
      setSubiendoArchivo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setTipoActor('PERSONA');
    setNombre('');
    setCedulaNit('');
    setPlaca('');
    setDireccion('');
    setFecha(new Date().toISOString().slice(0, 16));
    setTipoResiduo('');
    setActividadObservada('');
    setCantidadAproximada('');
    setDescripcion('');
    setEvidenciaTipos([]);
    setEvidenciaArchivos([]);
    setNumeroEvidenciasManual(1);
    setEstado('IDENTIFICADO');
  };

  const formValido =
    nombre.trim() && cedulaNit.trim() && fecha && tipoResiduo && actividadObservada && cantidadAproximada &&
    descripcion.trim() && evidenciaTipos.length > 0 && (!requiereArchivo || evidenciaArchivos.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValido) return;
    setSaving(true);
    try {
      const updated = await activityService.agregarBitacora(activity.id, {
        tipoActor,
        nombre: nombre.trim(),
        cedulaNit: cedulaNit.trim(),
        placa: placa.trim() || undefined,
        direccion: direccion.trim() || undefined,
        fecha: new Date(fecha).toISOString(),
        tipoResiduo,
        actividadObservada,
        cantidadAproximada,
        descripcion: descripcion.trim(),
        evidenciaTipos,
        evidenciaArchivos,
        numeroEvidencias,
        estado,
      });
      onUpdated(updated);
      setToast({ message: 'Actor y evento registrados', type: 'success' });
      resetForm();
      setModo('lista');
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al agregar a la bitácora', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300" style={{ maxHeight: '90dvh' }}>
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          {modo === 'lista' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Actores asociados al punto
                </h3>
                {actores.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
                    <p className="text-sm font-bold text-neutral-400">No hay actores registrados</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.6fr_0.7fr_1fr_1.2fr] gap-2 px-3 py-2 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span>Actor</span>
                      <span>Eventos</span>
                      <span>Último evento</span>
                      <span>Estado</span>
                    </div>
                    {actores.map((actor) => {
                      const ultimo = ultimoEvento(actor);
                      const expandido = actorExpandido === actor.id;
                      return (
                        <div key={actor.id} className="border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setActorExpandido(expandido ? null : actor.id)}
                            className="w-full grid grid-cols-[1.6fr_0.7fr_1fr_1.2fr] gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors items-center"
                          >
                            <span className="text-sm font-bold text-slate-800 truncate">{actor.nombre}</span>
                            <span className="text-sm font-bold text-slate-600">{actor.eventos.length}</span>
                            <span className="text-xs text-neutral-500 font-bold">
                              {format(new Date(ultimo.fecha), "d MMM yyyy", { locale: es })}
                            </span>
                            <EstadoDot estado={actor.estado} />
                          </button>
                          {expandido && (
                            <div className="px-3 pb-3 space-y-2 bg-slate-50/50">
                              {[...actor.eventos].reverse().map((evento) => (
                                <div key={evento.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                      {tipoResiduoLabels[evento.tipoResiduo] || evento.tipoResiduo}
                                    </p>
                                    <p className="text-[11px] text-neutral-400 font-bold">
                                      {format(new Date(evento.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                                    </p>
                                  </div>
                                  <p className="text-xs text-neutral-500">
                                    {getActividadObservadaLabel(evento.actividadObservada)} · {getCantidadAproximadaLabel(evento.cantidadAproximada)}
                                  </p>
                                  {evento.descripcion && (
                                    <p className="text-sm text-neutral-700">{evento.descripcion}</p>
                                  )}
                                  {evento.evidenciaArchivos.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pt-1 scrollbar-hide">
                                      {evento.evidenciaArchivos.map((a, i) => (
                                        <EvidenciaThumb key={i} archivo={a} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canAdd && (
                <button
                  onClick={() => setModo('form')}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-700/20 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Agregar actor / evento
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                Si el actor ya existe en este punto (misma cédula/NIT o mismo nombre), este evento se suma a su historial en vez de crear un actor duplicado.
              </p>

              {/* 1. Identificación del actor */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">1. Identificación del actor</h3>
                <select
                  value={tipoActor}
                  onChange={(e) => setTipoActor(e.target.value as ActorTipo)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                >
                  {TIPO_ACTOR_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre / razón social"
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={cedulaNit}
                    onChange={(e) => setCedulaNit(e.target.value)}
                    placeholder="Cédula / NIT"
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                  />
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    placeholder="Placa (si aplica)"
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                  />
                </div>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección del actor (opcional)"
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                />
              </div>

              {/* 2. Registro del evento */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">2. Registro del evento</h3>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Fecha y hora del evento</label>
                  <input
                    type="datetime-local"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                  />
                </div>
                <select
                  value={tipoResiduo}
                  onChange={(e) => setTipoResiduo(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                >
                  <option value="">Tipo de residuo</option>
                  {RESIDUO_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <select
                  value={actividadObservada}
                  onChange={(e) => setActividadObservada(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                >
                  <option value="">Actividad observada</option>
                  {ACTIVIDAD_OBSERVADA_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                <select
                  value={cantidadAproximada}
                  onChange={(e) => setCantidadAproximada(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                >
                  <option value="">Cantidad aproximada</option>
                  {CANTIDAD_APROXIMADA_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del evento"
                  rows={3}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm resize-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                />
              </div>

              {/* 3. Evidencia */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">3. Evidencia</h3>
                <div className="flex flex-wrap gap-2">
                  {EVIDENCIA_TIPO_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleEvidenciaTipo(t.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        evidenciaTipos.includes(t.value)
                          ? 'bg-slate-700 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {requiereArchivo && (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap items-center">
                      {evidenciaArchivos.map((a, i) => (
                        <div key={i} className="relative">
                          <EvidenciaThumb archivo={a} />
                          <button
                            type="button"
                            onClick={() => setEvidenciaArchivos((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={subiendoArchivo}
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        {subiendoArchivo ? (
                          <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={evidenciaTipos.includes('VIDEO') || evidenciaTipos.includes('DOCUMENTO') ? undefined : 'image/jpeg,image/jpg,image/png,image/webp'}
                        onChange={handleArchivoSelect}
                        className="hidden"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Número de evidencias: {numeroEvidencias}</p>
                  </div>
                )}

                {soloObservacionDirecta && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Número de evidencias</label>
                    <input
                      type="number"
                      min={1}
                      value={numeroEvidenciasManual}
                      onChange={(e) => setNumeroEvidenciasManual(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                    />
                  </div>
                )}
              </div>

              {/* 4. Seguimiento del actor */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">4. Seguimiento del actor</h3>
                <div className="flex flex-wrap gap-2">
                  {ESTADO_ACTOR_OPTIONS.map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setEstado(op.value as EstadoActor)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        estado === op.value ? 'border-slate-700 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: op.color }} />
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pb-1">
                <button
                  type="button"
                  onClick={() => { resetForm(); setModo('lista'); }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formValido}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-white bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-700/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {!canAdd && modo === 'lista' && (
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
