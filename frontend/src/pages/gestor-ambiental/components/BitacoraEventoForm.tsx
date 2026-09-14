import React, { useRef, useState } from 'react';
import type { ActorTipo, EstadoActor } from '../../../types';
import type { BitacoraActorPayload } from '../../../services/activity.service';
import { filesService } from '../../../services/files.service';
import { useFileUrl } from '../../../hooks/useFileUrl';
import { RESIDUO_TIPOS } from '../../../types/residuoTipos';
import {
  TIPO_ACTOR_OPTIONS,
  ACTIVIDAD_OBSERVADA_OPTIONS,
  CANTIDAD_APROXIMADA_OPTIONS,
  EVIDENCIA_TIPO_OPTIONS,
  ESTADO_ACTOR_OPTIONS,
  DIA_SEMANA_OPTIONS,
} from '../lib/bitacoraActores';

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

interface BitacoraEventoFormProps {
  puntoId: string;
  /** Si viene, el formulario arranca precargado con estos valores (editar). Si no, arranca vacío (crear). */
  initialValues?: BitacoraActorPayload;
  submitLabel?: string;
  helpText?: string;
  onSubmit: (payload: BitacoraActorPayload) => Promise<void>;
  onCancel: () => void;
}

export const BitacoraEventoForm: React.FC<BitacoraEventoFormProps> = ({
  puntoId,
  initialValues,
  submitLabel = 'Guardar',
  helpText,
  onSubmit,
  onCancel,
}) => {
  // Identificación del actor
  const [tipoActor, setTipoActor] = useState<ActorTipo>(initialValues?.tipoActor ?? 'PERSONA');
  const [nombre, setNombre] = useState(initialValues?.nombre ?? '');
  const [cedulaNit, setCedulaNit] = useState(initialValues?.cedulaNit ?? '');
  const [placa, setPlaca] = useState(initialValues?.placa ?? '');
  const [direccion, setDireccion] = useState(initialValues?.direccion ?? '');

  // Registro del evento
  const [fecha, setFecha] = useState(initialValues?.fecha ?? new Date().toISOString().slice(0, 16));
  const [tipoResiduo, setTipoResiduo] = useState(initialValues?.tipoResiduo ?? '');
  const [actividadObservada, setActividadObservada] = useState(initialValues?.actividadObservada ?? '');
  const [cantidadAproximada, setCantidadAproximada] = useState(initialValues?.cantidadAproximada ?? '');
  const [descripcion, setDescripcion] = useState(initialValues?.descripcion ?? '');

  // Recolección (solo Orgánicos)
  const [coincideRecoleccion, setCoincideRecoleccion] = useState<boolean | null>(initialValues?.coincideRecoleccion ?? null);
  const [diaRecoleccion, setDiaRecoleccion] = useState(initialValues?.diaRecoleccion ?? '');

  // Bolsas
  const [tieneBolsas, setTieneBolsas] = useState<boolean | null>(initialValues?.tieneBolsas ?? null);
  const [bolsasNegras, setBolsasNegras] = useState(initialValues?.bolsasNegras ?? 0);
  const [bolsasBlancas, setBolsasBlancas] = useState(initialValues?.bolsasBlancas ?? 0);

  // Evidencia
  const [evidenciaTipos, setEvidenciaTipos] = useState<string[]>(initialValues?.evidenciaTipos ?? []);
  const [evidenciaArchivos, setEvidenciaArchivos] = useState<string[]>(initialValues?.evidenciaArchivos ?? []);
  const [numeroEvidenciasManual, setNumeroEvidenciasManual] = useState(initialValues?.numeroEvidencias ?? 1);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seguimiento
  const [estado, setEstado] = useState<EstadoActor>(initialValues?.estado ?? 'IDENTIFICADO');

  const [saving, setSaving] = useState(false);

  const esOrganico = tipoResiduo === 'ORGANICOS';
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
      const response = await filesService.uploadPhotos([file], puntoId);
      const urls = response.keys || response.urls;
      setEvidenciaArchivos((prev) => [...prev, ...urls]);
    } catch {
      // El caller ya maneja el toast de error de envío; una foto que falla
      // solo se queda sin agregar, no bloquea el resto del formulario.
    } finally {
      setSubiendoArchivo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formValido =
    nombre.trim() && cedulaNit.trim() && fecha && tipoResiduo && actividadObservada && cantidadAproximada &&
    descripcion.trim() && evidenciaTipos.length > 0 && (!requiereArchivo || evidenciaArchivos.length > 0) &&
    (!esOrganico || coincideRecoleccion !== null && (coincideRecoleccion === false || !!diaRecoleccion)) &&
    tieneBolsas !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValido) return;
    setSaving(true);
    try {
      await onSubmit({
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
        coincideRecoleccion: esOrganico ? coincideRecoleccion ?? undefined : undefined,
        diaRecoleccion: esOrganico && coincideRecoleccion ? diaRecoleccion : undefined,
        tieneBolsas: tieneBolsas ?? undefined,
        bolsasNegras: tieneBolsas ? bolsasNegras : undefined,
        bolsasBlancas: tieneBolsas ? bolsasBlancas : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {helpText && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{helpText}</p>
      )}

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

        {esOrganico && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-2xl space-y-2">
            <label className="block text-[11px] font-bold text-green-700">¿Coincide con el día de recolección?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoincideRecoleccion(true)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                  coincideRecoleccion === true ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-200 text-green-700 hover:bg-green-100'
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => { setCoincideRecoleccion(false); setDiaRecoleccion(''); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                  coincideRecoleccion === false ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-200 text-green-700 hover:bg-green-100'
                }`}
              >
                No
              </button>
            </div>
            {coincideRecoleccion === true && (
              <select
                value={diaRecoleccion}
                onChange={(e) => setDiaRecoleccion(e.target.value)}
                className="w-full bg-white border-2 border-green-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-green-400/30 focus:border-green-400 outline-none font-medium"
              >
                <option value="">¿Cuál día?</option>
                {DIA_SEMANA_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Actividad observada</label>
          <select
            value={actividadObservada}
            onChange={(e) => setActividadObservada(e.target.value)}
            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
          >
            <option value="">Selecciona una opción</option>
            {ACTIVIDAD_OBSERVADA_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
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

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <label className="block text-[11px] font-bold text-slate-600">¿Hay bolsas?</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTieneBolsas(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                tieneBolsas === true ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setTieneBolsas(false)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                tieneBolsas === false ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              No
            </button>
          </div>
          {tieneBolsas === true && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bolsas negras</label>
                <input
                  type="number"
                  min={0}
                  value={bolsasNegras}
                  onChange={(e) => setBolsasNegras(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bolsas blancas</label>
                <input
                  type="number"
                  min={0}
                  value={bolsasBlancas}
                  onChange={(e) => setBolsasBlancas(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 outline-none font-medium"
                />
              </div>
            </div>
          )}
        </div>

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
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !formValido}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-white bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-700/20 transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
