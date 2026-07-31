import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { useAuthStore } from '../../store/authStore';
import { useFileUrl } from '../../hooks/useFileUrl';
import { StatusBadge } from '../../components/StatusBadge';
import { ResiduoTipoIcon } from '../../components/ResiduoTipoIcon';
import { PhotosUpload } from '../../components/PhotosUpload';
import { getResiduos } from '../gestor-ambiental/lib/residuos';
import { tipoResiduoLabels } from '../gestor-ambiental/lib/constants';
import { SECCIONES_PUNTO_ACUMULACION } from '../../config/camposPuntoAcumulacion';
import { createPuntoCriticoIcon } from '../gestor-ambiental/lib/icons';
import type { Activity, ResiduoEntry, User } from '../../types';

// Vista de detalle compartida por ADMIN y VALIDADOR_AMBIENTAL — portada de
// components/ActivityDetail.tsx del hub (SOLO LECTURA), que también es UN
// SOLO componente compartido entre roles ahí (parametrizado por `role`,
// ver ActivityDetailPage.tsx de admin y de validador en el hub). La
// diferencia entre roles la maneja `canEdit` (ver más abajo): ADMIN siempre,
// VALIDADOR_AMBIENTAL solo con status ENVIADA — corregido 2026-07-31, este
// comentario decía lo contrario (que "Actualizar punto" era ADMIN-only y
// esta vista "nunca lo tuvo"), quedó desactualizado frente al código real.
//
// A diferencia del hub (que auto-renderiza respuestas de encuesta genéricas
// vía __fieldMeta), este repo tiene los 26 campos del formulario fijo como
// columnas propias — se renderizan aquí con su label real usando la misma
// config `SECCIONES_PUNTO_ACUMULACION` que usa el formulario de creación.
// El bloque "Datos Operativo" (Categoría/Subtipo) del hub tampoco existe
// como campos propios acá — este backend es mono-dominio/mono-subtipo, así
// que se muestra el equivalente fijo (Ambiental / Punto de Residuos) en
// lugar de omitir el bloque.
//
// Botón "Ver en Google Maps": no existe en el hub, mejora deliberada (ver
// ESTADO-EXTRACCION.md, Divergencias) — se mantiene acá.
//
// Lo que el hub tiene y NO se pudo portar acá (ver ESTADO-EXTRACCION.md):
// - "Re-validar" (canSendToValidation, solo ADMIN sobre PUBLICADA/RECHAZADA):
//   en el hub reutiliza el mismo POST /:id/send. En este backend `send()`
//   exige `createdByUserId === userId` (puntos.service.ts:197) — un ADMIN
//   recibiría 403. Necesita relajar esa regla en el backend antes de portar
//   el botón; no se toca el backend en este pase.
// - "Eliminar" (canDelete, solo ADMIN): no existe DELETE /puntos/:id en el
//   backend de este repo (solo hay DELETE de nota de residuo). Agregar un
//   botón que llame un endpoint inexistente devolvería 404 enmascarado como
//   200 por el catch-all de Railway — se omite hasta que el backend lo tenga.

const Photo: React.FC<{ photoKey: string; onClick: (url: string) => void; tone?: 'neutral' | 'green' }> = ({ photoKey, onClick, tone = 'neutral' }) => {
  const url = useFileUrl(photoKey);
  const borderClass = tone === 'green'
    ? 'border-green-100 hover:border-green-400'
    : 'border-neutral-100 hover:border-primary';
  return (
    <button
      onClick={() => url && onClick(url)}
      className={`shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 ${borderClass} transition-all shadow-sm bg-neutral-100 flex items-center justify-center`}
    >
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
      ) : (
        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
      )}
    </button>
  );
};

function formatFieldValue(value: unknown, campo: { type: string; options?: { value: string; label: string }[] }): string {
  if (value === null || value === undefined || value === '') return '—';
  if (campo.type === 'RADIO' || campo.type === 'SELECT') {
    const opt = campo.options?.find(o => o.value === String(value));
    return opt?.label || String(value);
  }
  if (campo.type === 'MULTISELECT') {
    const arr = Array.isArray(value) ? value : [value];
    return arr.map(v => campo.options?.find(o => o.value === String(v))?.label || String(v)).join(', ') || '—';
  }
  if (campo.type === 'DATE') {
    const d = new Date(value as string);
    return isNaN(d.getTime()) ? String(value) : format(d, 'dd/MM/yyyy HH:mm', { locale: es });
  }
  return String(value);
}

export interface PuntoDetailViewProps {
  /** Ruta a la que vuelve el botón "Volver al panel" cuando el punto no carga. */
  backHref: string;
}

export const PuntoDetailView: React.FC<PuntoDetailViewProps> = ({ backHref }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore(s => s.user?.role);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationFlow, setShowValidationFlow] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Seguimiento — marcar un residuo pendiente como recogido (única acción
  // portada del modal de seguimiento del hub; "agregar residuo nuevo" queda
  // pendiente, ver reporte final).
  const [showSeguimiento, setShowSeguimiento] = useState(false);
  const [seguimientoResiduoId, setSeguimientoResiduoId] = useState<string | null>(null);
  const [seguimientoFecha, setSeguimientoFecha] = useState(() => new Date().toISOString().slice(0, 16));
  const [seguimientoPhotos, setSeguimientoPhotos] = useState<string[]>([]);
  const [seguimientoProcessing, setSeguimientoProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    activityService.getById(id)
      .then(setActivity)
      .catch(() => setError('No se pudo cargar el punto.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!activity?.createdByUserId) return;
    usersService.getUserById(activity.createdByUserId).then(setCreator).catch(() => setCreator(null));
  }, [activity?.createdByUserId]);

  // Fuente única de residuos — la misma lista alimenta el conteo del header
  // y el render de cada sección (identificados / pendientes / recogidos),
  // así que un conteo nunca puede quedar desincronizado del contenido
  // renderado (bug reportado: cabecera con más conteo que tarjetas visibles).
  const residuos = useMemo(() => (activity ? getResiduos(activity) : []), [activity]);
  const pendientes = useMemo(() => residuos.filter(r => !r.recogido), [residuos]);
  const recogidos = useMemo(() => residuos.filter(r => r.recogido), [residuos]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async () => {
    if (!activity) return;
    setProcessing(true);
    try {
      const updated = await activityService.approve(activity.id, notes || undefined);
      setActivity(updated);
      showToast('Punto aprobado correctamente', 'success');
      setShowValidationFlow(null);
      setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || 'No se pudo aprobar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activity) return;
    if (!notes.trim()) { showToast('Ingresá una nota para rechazar', 'error'); return; }
    setProcessing(true);
    try {
      const updated = await activityService.reject(activity.id, notes);
      setActivity(updated);
      showToast('Punto rechazado', 'success');
      setShowValidationFlow(null);
      setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || 'No se pudo rechazar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarcarRecogido = async () => {
    if (!activity || !seguimientoResiduoId) return;
    setSeguimientoProcessing(true);
    try {
      const updated = await activityService.addSeguimiento(activity.id, {
        action: 'MARCAR_RECOGIDO',
        residuoId: seguimientoResiduoId,
        fechaRecogida: new Date(seguimientoFecha).toISOString(),
        photosRecogida: seguimientoPhotos,
      });
      setActivity(updated);
      showToast('Residuo marcado como recogido', 'success');
      setShowSeguimiento(false);
      setSeguimientoResiduoId(null);
      setSeguimientoPhotos([]);
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || 'No se pudo registrar el seguimiento'}`, 'error');
    } finally {
      setSeguimientoProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">Cargando punto...</div>;
  }
  if (error || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <p className="text-sm text-red-600">{error || 'Punto no encontrado.'}</p>
        <button onClick={() => navigate(backHref)} className="btn-primary">Volver al panel</button>
      </div>
    );
  }

  // Permisos — copiados de utils/permissions.ts::getActivityPermissions del
  // hub (SOLO LECTURA), no inventados: canApprove/canReject solo con
  // status ENVIADA (RECHAZADA no tiene esas acciones en el hub — el gestor
  // corrige y reenvía, no se re-aprueba directo). canEdit: ADMIN siempre,
  // VALIDADOR_AMBIENTAL solo con ENVIADA (GESTOR_AMBIENTAL no pasa por esta
  // vista, tiene la suya con su propia regla de "solo lo asignado").
  const canValidate = activity.status === 'ENVIADA';
  const canEdit = role === 'ADMIN' || (role === 'VALIDADOR_AMBIENTAL' && activity.status === 'ENVIADA');
  const canSeguimiento = (role === 'ADMIN' || role === 'VALIDADOR_AMBIENTAL')
    && activity.status !== 'RECHAZADA' && activity.status !== 'ENVIADA'
    && pendientes.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header — mismo patrón que ActivityDetail.tsx del hub: volver + título + estado + creador */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-neutral-100 transition-colors" aria-label="Volver">
              <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-neutral-800">Punto #{activity.pointNumber ?? '—'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={activity.status} />
            {creator && <span className="text-xs font-bold text-neutral-500">Reportado por: {creator.name} {creator.lastname}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Información básica + Datos Operativo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Información Básica</h2>
              {/* Si tambien se muestra el bloque de Validacion (canValidate),
                  el boton Editar vive ahi agrupado con Aprobar/Rechazar (ver
                  hallazgo del recorrido visual 2026-07-31) — evita duplicarlo. */}
              {canEdit && !canValidate && (
                <button
                  onClick={() => navigate(`/gestor-ambiental/editar-actividad/${activity.id}`)}
                  className="btn-secondary text-xs"
                >
                  Editar
                </button>
              )}
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-medium text-neutral-600">N° Punto</dt><dd className="font-bold text-amber-700">#{activity.pointNumber ?? '—'}</dd></div>
              <div><dt className="font-medium text-neutral-600">Tipo de Actividad</dt><dd className="text-neutral-900">Ambiental - Identificación de Puntos de Acumulación de Residuos</dd></div>
              <div><dt className="font-medium text-neutral-600">Fecha y Hora</dt><dd className="text-neutral-900">{format(new Date(activity.dateTime), 'dd/MM/yyyy HH:mm', { locale: es })}</dd></div>
              <div><dt className="font-medium text-neutral-600">Barrio</dt><dd className="text-neutral-900">{activity.barrio || 'Sin barrio'}</dd></div>
              <div><dt className="font-medium text-neutral-600">Entidad responsable</dt><dd className="text-neutral-900">{activity.entidadResponsable || '—'}</dd></div>
              {creator && (
                <div><dt className="font-medium text-neutral-600">Reportado por</dt><dd className="text-neutral-900 font-medium">{creator.name} {creator.lastname}</dd></div>
              )}
              <div><dt className="font-medium text-neutral-600">Estado</dt><dd><StatusBadge status={activity.status} /></dd></div>
            </dl>
            <a
              href={`https://www.google.com/maps?q=${activity.lat},${activity.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-xs font-semibold border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ver en Google Maps
            </a>
          </div>

          {/* Datos Operativo — este backend es mono-dominio/mono-subtipo (no
              tiene columnas operativoCategoria/operativoSubtipo), se muestra
              el equivalente fijo en vez de omitir el bloque. */}
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-3">Datos Operativo</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-medium text-neutral-600">Categoría</dt><dd className="text-neutral-900">Ambiental</dd></div>
              <div><dt className="font-medium text-neutral-600">Subtipo</dt><dd className="text-neutral-900">Punto de Residuos (AMBIENTAL_PUNTOS_ACUMULACION)</dd></div>
            </dl>
          </div>
        </div>

        {/* Formulario fijo — 26 campos, misma config que CreateActivity.tsx */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3">Formulario de identificación</h2>
          <div className="space-y-4">
            {SECCIONES_PUNTO_ACUMULACION.map(seccion => {
              const camposConDato = seccion.campos.filter(c => (activity as any)[c.name] !== undefined && (activity as any)[c.name] !== null && (activity as any)[c.name] !== '');
              if (camposConDato.length === 0) return null;
              return (
                <div key={seccion.titulo}>
                  <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">{seccion.titulo}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {camposConDato.map(campo => (
                      <div key={campo.name} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                        <p className="text-[10px] uppercase font-bold text-neutral-500 mb-1">{campo.label}</p>
                        <p className="text-sm text-neutral-800 font-medium">{formatFieldValue((activity as any)[campo.name], campo)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Residuos identificados (todos, sin importar estado) */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3">Residuos identificados ({residuos.length})</h2>
          {residuos.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">No hay residuos registrados.</p>
          ) : (
            <div className="space-y-4">
              {residuos.map((r, i) => (
                <div key={r.id || i} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-2 font-bold text-neutral-900 text-sm">
                      <ResiduoTipoIcon tipo={r.tipoResiduo} size={20} />
                      {tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.recogido ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {r.recogido ? 'Recogido' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs text-neutral-500">Quién dispuso</p><p className="text-neutral-800">{r.quienDispuso?.replace(/_/g, ' ') || '—'}</p></div>
                    <div><p className="text-xs text-neutral-500">Volumen</p><p className="text-neutral-800">{r.volumenEstimadoM3 != null ? `${r.volumenEstimadoM3} m³` : '—'}</p></div>
                    <div><p className="text-xs text-neutral-500">Área</p><p className="text-neutral-800">{r.areaLinealMetros ?? '—'} m</p></div>
                    <div><p className="text-xs text-neutral-500">Olores</p><p className="text-neutral-800">{r.percibeOlores ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-xs text-neutral-500">Vectores</p><p className="text-neutral-800">{r.percibeVectores ? 'Sí' : 'No'}</p></div>
                    {r.createdByNombre && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-neutral-500">Registrado por</p><p className="text-neutral-800 font-medium">{r.createdByNombre}</p></div>}
                  </div>
                  {r.observaciones && <p className="text-xs text-neutral-600 mt-2 italic">Obs: {r.observaciones}</p>}
                  {(r.photos?.length > 0 || (r.photosRecogida?.length ?? 0) > 0) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.photos?.map((p, pi) => <Photo key={`i-${pi}`} photoKey={p} onClick={setExpandedPhoto} />)}
                      {r.photosRecogida?.map((p, pi) => <Photo key={`r-${pi}`} photoKey={p} onClick={setExpandedPhoto} tone="green" />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón de Seguimiento — porta la acción "Marcar Recogido" del modal
            de seguimiento del hub. "Agregar residuo nuevo" no se portó, ver
            comentario al inicio del archivo y reporte final. */}
        {canSeguimiento && (
          <div className="flex justify-end">
            <button
              onClick={() => { setShowSeguimiento(true); setSeguimientoResiduoId(pendientes[0]?.id ?? null); }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20 active:scale-95 flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Hacer Seguimiento
            </button>
          </div>
        )}

        {showSeguimiento && (
          <div className="card p-4 border-2 border-green-200">
            <h2 className="text-base font-semibold mb-3">Marcar residuo como recogido</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">Residuo</label>
                <select
                  className="w-full text-sm border-2 border-neutral-200 rounded-lg px-3 py-2"
                  value={seguimientoResiduoId ?? ''}
                  onChange={e => setSeguimientoResiduoId(e.target.value)}
                >
                  {pendientes.map(r => (
                    <option key={r.id} value={r.id}>{tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">Fecha de recolección</label>
                <input
                  type="datetime-local"
                  className="w-full text-sm border-2 border-neutral-200 rounded-lg px-3 py-2"
                  value={seguimientoFecha}
                  onChange={e => setSeguimientoFecha(e.target.value)}
                />
              </div>
              <PhotosUpload
                existingUrls={seguimientoPhotos}
                onUploadSuccess={setSeguimientoPhotos}
                activityId={activity.id}
              />
              <div className="flex gap-3">
                <button
                  disabled={seguimientoProcessing}
                  onClick={() => { setShowSeguimiento(false); setSeguimientoPhotos([]); }}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={seguimientoProcessing || !seguimientoResiduoId}
                  onClick={handleMarcarRecogido}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  Confirmar recolección
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Residuos Recogidos — porta la sección de detalle del hub: fecha de
            recolección, quién recogió, quién registró, y ambas evidencias
            (inicial y de recolección) con enlace directo. */}
        {recogidos.length > 0 && (
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-3">Residuos Recogidos ({recogidos.length})</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {recogidos.map((r, index) => (
                <div key={r.id || index} className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-green-900 text-sm">{index + 1}. {tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}</span>
                    {r.aprobado && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg uppercase tracking-wider">Validado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-green-200/50">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-neutral-400">Fecha de Recolección</p>
                      <p className="font-medium text-neutral-900 text-sm">
                        {r.fechaRecogida ? format(new Date(r.fechaRecogida), "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'}
                      </p>
                    </div>
                    {r.recogidoByNombre && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400">Recogido por</p>
                        <p className="font-medium text-neutral-900 text-sm">{r.recogidoByNombre}</p>
                      </div>
                    )}
                    {r.createdByNombre && (
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase font-bold text-neutral-400">Registrado por</p>
                        <p className="font-medium text-neutral-900 text-xs opacity-80">{r.createdByNombre}</p>
                      </div>
                    )}
                  </div>
                  <div className="gap-4 flex flex-col md:flex-row">
                    {r.photos && r.photos.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Evidencia Inicial</p>
                        <div className="flex gap-2.5 overflow-x-auto pb-1">
                          {r.photos.map((p, i) => <Photo key={`ei-${i}`} photoKey={p} onClick={setExpandedPhoto} />)}
                        </div>
                      </div>
                    )}
                    {r.photosRecogida && r.photosRecogida.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Evidencia de Recolección</p>
                        <div className="flex gap-2.5 overflow-x-auto pb-1">
                          {r.photosRecogida.map((p, i) => <Photo key={`er-${i}`} photoKey={p} onClick={setExpandedPhoto} tone="green" />)}
                        </div>
                      </div>
                    )}
                  </div>
                  {(r.photos?.length > 0 || (r.photosRecogida?.length ?? 0) > 0) && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          const first = (r.photos?.[0] || r.photosRecogida?.[0]);
                          if (first) setExpandedPhoto(first);
                        }}
                        className="text-xs font-semibold text-green-700 flex items-center gap-1 bg-green-100/80 px-2.5 py-1 rounded-xl shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644A10.114 10.114 0 0112 5.25c4.757 0 8.803 2.697 10.964 6.428a1.011 1.011 0 010 .644A10.114 10.114 0 0112 18.75c-4.757 0-8.803-2.697-10.964-6.428z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Abrir evidencia
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gestores Participantes */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3">Gestores Participantes</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-600 mb-2">Gestor Creador</h3>
              {creator ? (
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <p className="text-sm font-medium text-neutral-900">{creator.name} {creator.lastname}</p>
                  <p className="text-xs text-neutral-600 mt-1">{creator.email}</p>
                </div>
              ) : (
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <p className="text-sm text-neutral-500">Cargando información del creador...</p>
                </div>
              )}
            </div>
            {activity.isGroupOperativo && (activity.gestoresInvolucrados?.length ?? 0) > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-2">
                  Gestores Acompañantes ({activity.gestoresInvolucrados!.length})
                </h3>
                <div className="space-y-2">
                  {activity.gestoresInvolucrados!.map(gestor => (
                    <div key={gestor.id} className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <p className="text-sm font-medium text-neutral-900">{gestor.name} {gestor.lastname}</p>
                      <p className="text-xs text-neutral-600 mt-1">{gestor.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-neutral-600 mb-2">Gestores Acompañantes</h3>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <p className="text-sm text-neutral-500">No es un operativo en grupo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Descripción General */}
        {activity.results && (
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-2">Descripción General</h2>
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{activity.results}</p>
          </div>
        )}

        {/* Ubicación */}
        <div className="card p-4">
          <h2 className="text-base font-semibold mb-3">Ubicación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Latitud</p>
              <p className="text-base font-mono font-semibold text-blue-900">{activity.lat.toFixed(6)}°</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200/50">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Longitud</p>
              <p className="text-base font-mono font-semibold text-green-900">{activity.lng.toFixed(6)}°</p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ minHeight: 220 }}>
            <MapContainer center={[activity.lat, activity.lng]} zoom={16} style={{ height: 320, width: '100%', minHeight: 220 }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[activity.lat, activity.lng]} icon={createPuntoCriticoIcon('#7c2d12', activity.pointNumber ?? undefined)} />
            </MapContainer>
          </div>
        </div>

        {/* Información de Validación */}
        {activity.validatorUserId && (
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-3">Información de Validación</h2>
            <dl className="space-y-3 text-sm">
              {activity.validatorName && (
                <div>
                  <dt className="font-medium text-neutral-600">{activity.status === 'RECHAZADA' ? 'Rechazado por' : 'Validado por'}</dt>
                  <dd className="text-neutral-900">{activity.validatorName}</dd>
                </div>
              )}
              {activity.validatedAt && (
                <div>
                  <dt className="font-medium text-neutral-600">Fecha de Validación</dt>
                  <dd className="text-neutral-900">{format(new Date(activity.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Notas de validación existentes */}
        {activity.validationNotes && (
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-2">Notas de validación</h2>
            <p className="text-sm text-neutral-600 italic">"{activity.validationNotes}"</p>
          </div>
        )}

        {/* Acciones de validación — mismo endpoint que usa el validador */}
        {canValidate && (
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-3">Validación</h2>
            {showValidationFlow ? (
              <>
                <textarea
                  className="w-full text-sm border-2 border-neutral-200 rounded-xl px-4 py-3 mb-3 min-h-[90px] resize-none focus:outline-none focus:border-primary"
                  placeholder={showValidationFlow === 'APPROVE' ? 'Opcional: recomendaciones para el gestor...' : 'Obligatorio: motivo del rechazo...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <div className="flex gap-3">
                  <button disabled={processing} onClick={() => { setShowValidationFlow(null); setNotes(''); }} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50">Cancelar</button>
                  <button
                    disabled={processing}
                    onClick={showValidationFlow === 'APPROVE' ? handleApprove : handleReject}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 ${showValidationFlow === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {showValidationFlow === 'APPROVE' ? 'Aprobar' : 'Rechazar'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                {canEdit && (
                  <button onClick={() => navigate(`/gestor-ambiental/editar-actividad/${activity.id}`)} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50">Editar</button>
                )}
                <button onClick={() => setShowValidationFlow('APPROVE')} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100">Aprobar</button>
                <button onClick={() => setShowValidationFlow('REJECT')} className="flex-1 py-2.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100">Rechazar</button>
              </div>
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-6 left-6 right-6 sm:left-auto sm:w-96 px-4 py-3 rounded-xl shadow-xl border z-50 text-xs font-bold flex items-center justify-between ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {expandedPhoto && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4 md:p-12" onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};
