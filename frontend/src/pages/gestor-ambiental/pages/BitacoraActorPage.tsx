import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../../services/activity.service';
import { useAuthStore } from '../../../store/authStore';
import { useFileUrl } from '../../../hooks/useFileUrl';
import { Loading } from '../../../components/Loading';
import type { Activity, ActorEvento } from '../../../types';
import { tipoResiduoLabels } from '../lib/constants';
import { BitacoraEventoForm } from '../components/BitacoraEventoForm';
import type { ActorTipo, EstadoActor } from '../../../types';
import {
  getEstadoActor,
  getTipoActorLabel,
  getActividadObservadaLabel,
  getCantidadAproximadaLabel,
  getEvidenciaTipoLabel,
  getDiaSemanaLabel,
  TIPO_ACTOR_OPTIONS,
  ESTADO_ACTOR_OPTIONS,
} from '../lib/bitacoraActores';

const EvidenciaThumb: React.FC<{ archivo: string }> = ({ archivo }) => {
  const url = useFileUrl(archivo);
  return (
    <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

interface EditarIdentidadFormProps {
  tipoActor: ActorTipo;
  nombre: string;
  cedulaNit: string;
  placa?: string;
  direccion?: string;
  estado: EstadoActor;
  onCancel: () => void;
  onSubmit: (values: { tipoActor: ActorTipo; nombre: string; cedulaNit: string; placa?: string; direccion?: string; estado: EstadoActor }) => Promise<void>;
}

const EditarIdentidadForm: React.FC<EditarIdentidadFormProps> = ({
  tipoActor: tipoActorInicial,
  nombre: nombreInicial,
  cedulaNit: cedulaNitInicial,
  placa: placaInicial,
  direccion: direccionInicial,
  estado: estadoInicial,
  onCancel,
  onSubmit,
}) => {
  const [tipoActor, setTipoActor] = useState<ActorTipo>(tipoActorInicial);
  const [nombre, setNombre] = useState(nombreInicial);
  const [cedulaNit, setCedulaNit] = useState(cedulaNitInicial);
  const [placa, setPlaca] = useState(placaInicial ?? '');
  const [direccion, setDireccion] = useState(direccionInicial ?? '');
  const [estado, setEstado] = useState<EstadoActor>(estadoInicial);
  const [saving, setSaving] = useState(false);

  const formValido = nombre.trim() && cedulaNit.trim();

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
        estado,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
      <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1">Estado del actor</label>
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
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
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
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
};

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">{label}</p>
    <div className="text-sm text-neutral-800 font-semibold mt-0.5">{children}</div>
  </div>
);

// Página de detalle de un actor: toda la información diligenciada, sin
// recortar nada — cada evento completo. Si es ADMIN, cada evento se puede
// editar en el mismo formulario que se usó para crearlo, precargado con
// exactamente lo que se guardó.
export const BitacoraActorPage: React.FC = () => {
  const { id, actorId } = useParams<{ id: string; actorId: string }>();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null);
  const [editandoIdentidad, setEditandoIdentidad] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await activityService.getById(id);
      setActivity(a);
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) return <Loading />;
  const actor = activity?.bitacoraActores?.find((a) => a.id === actorId);
  if (!activity || !actor) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm font-bold text-neutral-500">No se encontró el actor.</p>
      </div>
    );
  }

  const estadoInfo = getEstadoActor(actor.estado);
  const eventosOrdenados = [...actor.eventos].reverse();

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => window.close()} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-black text-neutral-900">{actor.nombre}</h1>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
              Punto {activity.pointNumber ? `#${activity.pointNumber}` : ''} · {activity.barrio}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-neutral-900">Identificación del actor</h2>
            {editandoIdentidad ? null : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: estadoInfo.color }} />
                  <span className="text-xs font-bold text-neutral-700">{estadoInfo.label}</span>
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setEditandoIdentidad(true)}
                    className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-slate-50 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            )}
          </div>
          {editandoIdentidad ? (
            <EditarIdentidadForm
              tipoActor={actor.tipoActor}
              nombre={actor.nombre}
              cedulaNit={actor.cedulaNit}
              placa={actor.placa}
              direccion={actor.direccion}
              estado={actor.estado}
              onCancel={() => setEditandoIdentidad(false)}
              onSubmit={async (values) => {
                try {
                  const updated = await activityService.editarActorIdentidad(activity.id, actor.id, values);
                  setActivity(updated);
                  showToast('Actor actualizado', 'success');
                  setEditandoIdentidad(false);
                } catch (err: any) {
                  showToast(err?.response?.data?.message || 'Error al guardar los cambios', 'error');
                  throw err;
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Tipo de actor">{getTipoActorLabel(actor.tipoActor)}</Campo>
              <Campo label="Nombre / razón social">{actor.nombre}</Campo>
              <Campo label="Cédula / NIT">{actor.cedulaNit}</Campo>
              <Campo label="Placa">{actor.placa || '—'}</Campo>
              <Campo label="Dirección">{actor.direccion || '—'}</Campo>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-black text-neutral-900 mb-3">Eventos registrados ({actor.eventos.length})</h2>
          <div className="flex flex-col gap-4">
            {eventosOrdenados.map((evento) => (
              <div key={evento.id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                {editandoEventoId === evento.id ? (
                  <BitacoraEventoForm
                    puntoId={activity.id}
                    submitLabel="Guardar cambios"
                    initialValues={{
                      tipoActor: actor.tipoActor,
                      nombre: actor.nombre,
                      cedulaNit: actor.cedulaNit,
                      placa: actor.placa,
                      direccion: actor.direccion,
                      fecha: evento.fecha.slice(0, 16),
                      tipoResiduo: evento.tipoResiduo,
                      actividadObservada: evento.actividadObservada,
                      cantidadAproximada: evento.cantidadAproximada,
                      descripcion: evento.descripcion,
                      evidenciaTipos: evento.evidenciaTipos,
                      evidenciaArchivos: evento.evidenciaArchivos,
                      numeroEvidencias: evento.numeroEvidencias,
                      estado: actor.estado,
                      coincideRecoleccion: evento.coincideRecoleccion,
                      diaRecoleccion: evento.diaRecoleccion,
                      tieneBolsas: evento.tieneBolsas,
                      bolsasNegras: evento.bolsasNegras,
                      bolsasBlancas: evento.bolsasBlancas,
                    }}
                    onCancel={() => setEditandoEventoId(null)}
                    onSubmit={async (payload) => {
                      try {
                        const updated = await activityService.editarBitacora(activity.id, actor.id, evento.id, payload);
                        setActivity(updated);
                        showToast('Evento actualizado', 'success');
                        setEditandoEventoId(null);
                      } catch (err: any) {
                        showToast(err?.response?.data?.message || 'Error al guardar los cambios', 'error');
                        throw err;
                      }
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-black text-neutral-900">
                        {format(new Date(evento.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => setEditandoEventoId(evento.id)}
                          className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-slate-50 transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Campo label="Tipo de residuo">{tipoResiduoLabels[evento.tipoResiduo] || evento.tipoResiduo}</Campo>
                      <Campo label="Actividad observada">{getActividadObservadaLabel(evento.actividadObservada)}</Campo>
                      <Campo label="Cantidad aproximada">{getCantidadAproximadaLabel(evento.cantidadAproximada)}</Campo>
                      <Campo label="Número de evidencias">{evento.numeroEvidencias}</Campo>
                      {evento.coincideRecoleccion !== undefined && (
                        <Campo label="¿Coincide con recolección?">
                          {evento.coincideRecoleccion ? `Sí — ${getDiaSemanaLabel(evento.diaRecoleccion || '')}` : 'No'}
                        </Campo>
                      )}
                      {evento.tieneBolsas !== undefined && (
                        <Campo label="Bolsas">
                          {evento.tieneBolsas ? `${evento.bolsasNegras ?? 0} negras, ${evento.bolsasBlancas ?? 0} blancas` : 'No'}
                        </Campo>
                      )}
                      <Campo label="Diligenciado por">{evento.autorNombre}</Campo>
                    </div>
                    <Campo label="Descripción">{evento.descripcion || '—'}</Campo>
                    <div className="mt-4">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-2">
                        Evidencia ({evento.evidenciaTipos.map(getEvidenciaTipoLabel).join(', ')})
                      </p>
                      {evento.evidenciaArchivos.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto">
                          {evento.evidenciaArchivos.map((a, i) => (
                            <EvidenciaThumb key={i} archivo={a} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 italic">Sin archivos adjuntos</p>
                      )}
                    </div>
                    {evento.editadoPorNombre && (
                      <p className="text-[11px] text-neutral-400 italic mt-4">
                        Editado por {evento.editadoPorNombre} el {format(new Date(evento.editadoEn!), "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl border z-50 text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
