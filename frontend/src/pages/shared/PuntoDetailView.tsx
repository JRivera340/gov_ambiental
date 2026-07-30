import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { useFileUrl } from '../../hooks/useFileUrl';
import { StatusBadge } from '../../components/StatusBadge';
import { ResiduoTipoIcon } from '../../components/ResiduoTipoIcon';
import { getResiduos } from '../gestor-ambiental/lib/residuos';
import { tipoResiduoLabels } from '../gestor-ambiental/lib/constants';
import { SECCIONES_PUNTO_ACUMULACION } from '../../config/camposPuntoAcumulacion';
import { createPuntoCriticoIcon } from '../gestor-ambiental/lib/icons';
import type { Activity, User } from '../../types';

// Vista de detalle compartida por ADMIN y VALIDADOR_AMBIENTAL — portada de
// components/ActivityDetail.tsx del hub (SOLO LECTURA), que también es UN
// SOLO componente compartido entre roles ahí (parametrizado por `role`,
// ver ActivityDetailPage.tsx de admin y de validador en el hub). La única
// diferencia entre roles en el hub es el botón "Actualizar punto"
// (role==='ADMIN'), que esta vista nunca tuvo — no hay nada que diferenciar.
//
// A diferencia del hub (que auto-renderiza respuestas de encuesta genéricas
// vía __fieldMeta), este repo tiene los 26 campos del formulario fijo como
// columnas propias — se renderizan aquí con su label real usando la misma
// config `SECCIONES_PUNTO_ACUMULACION` que usa el formulario de creación.
//
// Botón "Ver en Google Maps": no existe en el hub, mejora deliberada (ver
// ESTADO-EXTRACCION.md, Divergencias) — se mantiene acá.

const Photo: React.FC<{ photoKey: string; onClick: (url: string) => void }> = ({ photoKey, onClick }) => {
  const url = useFileUrl(photoKey);
  return (
    <button
      onClick={() => url && onClick(url)}
      className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-neutral-100 hover:border-primary transition-all shadow-sm bg-neutral-100 flex items-center justify-center"
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
  const [activity, setActivity] = useState<Activity | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationFlow, setShowValidationFlow] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

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

  const residuos = useMemo(() => (activity ? getResiduos(activity) : []), [activity]);

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

  const canValidate = activity.status === 'ENVIADA' || activity.status === 'RECHAZADA';

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
        {/* Información básica + mapa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-4">
            <h2 className="text-base font-semibold mb-3">Información Básica</h2>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-medium text-neutral-600">Fecha y Hora</dt><dd className="text-neutral-900">{format(new Date(activity.dateTime), 'dd/MM/yyyy HH:mm', { locale: es })}</dd></div>
              <div><dt className="font-medium text-neutral-600">Barrio</dt><dd className="text-neutral-900">{activity.barrio || 'Sin barrio'}</dd></div>
              <div><dt className="font-medium text-neutral-600">Entidad responsable</dt><dd className="text-neutral-900">{activity.entidadResponsable || '—'}</dd></div>
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
          <div className="card p-0 overflow-hidden" style={{ minHeight: 220 }}>
            <MapContainer center={[activity.lat, activity.lng]} zoom={16} style={{ height: '100%', width: '100%', minHeight: 220 }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[activity.lat, activity.lng]} icon={createPuntoCriticoIcon('#7c2d12', activity.pointNumber ?? undefined)} />
            </MapContainer>
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

        {/* Residuos identificados */}
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
                    <div><p className="text-xs text-neutral-500">Área</p><p className="text-neutral-800">{r.areaLinealMetros ?? '—'} m</p></div>
                    <div><p className="text-xs text-neutral-500">Olores</p><p className="text-neutral-800">{r.percibeOlores ? 'Sí' : 'No'}</p></div>
                    <div><p className="text-xs text-neutral-500">Vectores</p><p className="text-neutral-800">{r.percibeVectores ? 'Sí' : 'No'}</p></div>
                    {r.createdByNombre && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-neutral-500">Registrado por</p><p className="text-neutral-800 font-medium">{r.createdByNombre}</p></div>}
                  </div>
                  {r.observaciones && <p className="text-xs text-neutral-600 mt-2 italic">Obs: {r.observaciones}</p>}
                  {(r.photos?.length > 0 || (r.photosRecogida?.length ?? 0) > 0) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.photos?.map((p, pi) => <Photo key={`i-${pi}`} photoKey={p} onClick={setExpandedPhoto} />)}
                      {r.photosRecogida?.map((p, pi) => <Photo key={`r-${pi}`} photoKey={p} onClick={setExpandedPhoto} />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
