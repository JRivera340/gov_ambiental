import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { activityService } from '../../services/activity.service';
import { usersService } from '../../services/users.service';
import { useFileUrl } from '../../hooks/useFileUrl';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Loading } from '../../components/Loading';
import type { Activity, ResiduoEntry, User } from '../../types';
import { RESIDUO_TIPOS } from '../../types/residuoTipos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet resuelve sus iconos por defecto vía rutas relativas del CSS que
// Vite no empaqueta — sin esto el marcador queda invisible (mismo fix que
// ya usan CreateActivity.tsx y EditActivity.tsx).
const defaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Página completa de detalle de actividad para el validador — replica el
// look del "Detalle de Actividad" del módulo acoplado (ver
// ActivityDetail.tsx del hub), no la card lateral compacta que ya existe
// (ValidadorActividadPanel, usada desde el mapa). El "Ver Detalle Completo"
// de esa card apunta acá.
function tipoLabel(tipo: string) {
  return RESIDUO_TIPOS.find((t) => t.value === tipo)?.label || tipo;
}

const Foto: React.FC<{ photoKey: string; onClick: (url: string) => void }> = ({ photoKey, onClick }) => {
  const url = useFileUrl(photoKey);
  return (
    <button
      onClick={() => url && onClick(url)}
      className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex items-center justify-center"
    >
      {url ? <img src={url} alt="Evidencia" className="w-full h-full object-cover" /> : (
        <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />
      )}
    </button>
  );
};

const Campo: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">{label}</p>
    <div className="text-sm text-neutral-800 font-semibold mt-0.5">{children}</div>
  </div>
);

export const ValidadorActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [validador, setValidador] = useState<User | null>(null);
  const [gestores, setGestores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [showFlow, setShowFlow] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await activityService.getById(id);
      setActivity(a);
      usersService.getUserById(a.createdByUserId).then(setCreator).catch(() => setCreator(null));
      if ((a as any).validatorUserId) {
        usersService.getUserById((a as any).validatorUserId).then(setValidador).catch(() => setValidador(null));
      }
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { usersService.getGestores().then(setGestores).catch(() => setGestores([])); }, []);

  const residuos: ResiduoEntry[] = useMemo(() => {
    const r = (activity as any)?.residuos;
    return Array.isArray(r) ? r : [];
  }, [activity]);

  const identificados = residuos.filter((r) => !r.recogido);
  const recogidos = residuos.filter((r) => r.recogido);

  const acompanantes = useMemo(() => {
    const ids = (activity as any)?.gestoresInvolucradosIds as string[] | undefined;
    if (!ids || ids.length === 0) return [];
    return gestores.filter((g) => ids.includes(g.id));
  }, [activity, gestores]);

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
      showToast('Actividad aprobada correctamente', 'success');
      setShowFlow(null); setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo aprobar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activity) return;
    if (!notes.trim()) { showToast('Debes ingresar una nota para rechazar', 'error'); return; }
    setProcessing(true);
    try {
      const updated = await activityService.reject(activity.id, notes);
      setActivity(updated);
      showToast('Actividad rechazada', 'success');
      setShowFlow(null); setNotes('');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo rechazar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    if (!activity) return;
    setProcessing(true);
    try {
      const updated = await activityService.send(activity.id);
      setActivity(updated);
      showToast('Punto enviado a validación', 'success');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo enviar'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    if (!window.confirm(`¿Eliminar el punto #${activity.pointNumber ?? '—'} de forma permanente? Esta acción no se puede deshacer.`)) return;
    setProcessing(true);
    try {
      await activityService.remove(activity.id);
      showToast('Punto eliminado', 'success');
      setTimeout(() => navigate('/validador/dashboard'), 1000);
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message || e?.message || 'No se pudo eliminar'}`, 'error');
      setProcessing(false);
    }
  };

  if (loading) return <Loading />;
  if (!activity) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm font-bold text-neutral-500">No se encontró la actividad.</p>
      </div>
    );
  }

  const soloLectura = !isAdmin && activity.status !== 'ENVIADA';

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/validador/dashboard')} className="text-neutral-400 hover:text-neutral-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-base font-black text-neutral-900">
              Detalle de Actividad <span className="text-red-600">#{activity.pointNumber ?? '—'}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <StatusBadge status={activity.status} />
            {creator && <span className="font-bold text-neutral-500">Reportado por: {creator.name} {creator.lastname}</span>}
            {soloLectura && <span className="text-neutral-400 italic">(Solo lectura)</span>}
          </div>
        </div>
      </header>

      <main className={`max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 ${(activity.status === 'ENVIADA' || isAdmin) ? 'pb-32' : ''}`}>
        {/* Información Básica + Datos Operativo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="text-sm font-black text-neutral-900">Información Básica</h2>
            <Campo label="N° Punto">#{activity.pointNumber ?? '—'}</Campo>
            <Campo label="Fecha y Hora">{format(new Date(activity.dateTime), "dd/MM/yyyy HH:mm", { locale: es })}</Campo>
            <Campo label="Tipo de Actividad">Ambiental - Punto de Acumulación de Residuos</Campo>
            <Campo label="Barrio">{activity.barrio || '—'}</Campo>
            <Campo label="Reportado por">{creator ? `${creator.name} ${creator.lastname}` : '—'}</Campo>
            <Campo label="Estado"><StatusBadge status={activity.status} size="sm" /></Campo>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="text-sm font-black text-neutral-900">Datos Operativo</h2>
            <Campo label="Categoría">AMBIENTAL</Campo>
            <Campo label="Subtipo">PUNTOS_ACUMULACION</Campo>
            <div className="border-t border-neutral-100 pt-3">
              <p className="text-sm font-black text-neutral-800 mb-2">Residuos Identificados ({identificados.length})</p>
              {identificados.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Sin residuos pendientes</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {identificados.map((r, i) => (
                    <div key={r.id ?? i} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-neutral-800">{tipoLabel(r.tipoResiduo)}</span>
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Pendiente</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                        <div><p className="text-neutral-400 font-bold uppercase">Dispuso</p><p className="font-bold text-neutral-700">{r.quienDispuso || '—'}</p></div>
                        <div><p className="text-neutral-400 font-bold uppercase">Volumen</p><p className="font-bold text-neutral-700">{r.volumenEstimadoM3 ? `${r.volumenEstimadoM3}m³` : '—'}</p></div>
                        <div><p className="text-neutral-400 font-bold uppercase">Área</p><p className="font-bold text-neutral-700">{r.areaLinealMetros ? `${r.areaLinealMetros}m` : '—'}</p></div>
                        <div><p className="text-neutral-400 font-bold uppercase">Olores</p><p className="font-bold text-neutral-700">{r.percibeOlores ? 'Sí' : 'No'}</p></div>
                        <div><p className="text-neutral-400 font-bold uppercase">Vectores</p><p className="font-bold text-neutral-700">{r.percibeVectores ? 'Sí' : 'No'}</p></div>
                      </div>
                      {r.createdByNombre && <p className="text-[10px] text-neutral-500 mb-2">Registrado por: <span className="font-bold text-neutral-700">{r.createdByNombre}</span></p>}
                      {r.observaciones && <p className="text-[11px] text-neutral-600 italic mb-2">Obs: {r.observaciones}</p>}
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {r.photos.map((p, pi) => <Foto key={pi} photoKey={p} onClick={setExpandedPhoto} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Residuos Recogidos */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-neutral-900 mb-3">Residuos Recogidos ({recogidos.length})</h2>
          {recogidos.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">Sin residuos recogidos todavía</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recogidos.map((r, i) => (
                <div key={r.id ?? i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-neutral-800">{i + 1}. {tipoLabel(r.tipoResiduo)}</span>
                    <div className="flex gap-1">
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Validado</span>
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Recogido</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px] mb-3">
                    <div><p className="text-neutral-400 font-bold uppercase">Fecha de Recolección</p><p className="font-bold text-neutral-700">{r.fechaRecogida ? format(new Date(r.fechaRecogida), "d 'de' MMMM, yyyy", { locale: es }) : '—'}</p></div>
                    <div className="min-w-0"><p className="text-neutral-400 font-bold uppercase">Recogido por</p><p className="font-bold text-neutral-700 break-words">{r.recogidoByNombre || '—'}</p></div>
                  </div>
                  {r.createdByNombre && <p className="text-[10px] text-neutral-500 mb-3">Registrado por: <span className="font-bold text-neutral-700">{r.createdByNombre}</span></p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Evidencia Inicial</p>
                      <div className="flex gap-2">{(r.photos || []).slice(0, 2).map((p, pi) => <Foto key={pi} photoKey={p} onClick={setExpandedPhoto} />)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Evidencia de Recolección</p>
                      <div className="flex gap-2">{(r.photosRecogida || []).slice(0, 2).map((p, pi) => <Foto key={pi} photoKey={p} onClick={setExpandedPhoto} />)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gestores Participantes */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-neutral-900 mb-3">Gestores Participantes</h2>
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-1">Gestor Creador</p>
          <div className="bg-neutral-50 rounded-xl p-3 mb-3">
            <p className="text-sm font-bold text-neutral-800">{creator ? `${creator.name} ${creator.lastname}` : '—'}</p>
            {creator && <p className="text-xs text-neutral-500">{creator.email}</p>}
          </div>
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-1">Gestores Acompañantes</p>
          <div className="bg-neutral-50 rounded-xl p-3">
            {acompanantes.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No es un operativo en grupo</p>
            ) : (
              <div className="flex flex-col gap-1">
                {acompanantes.map((g) => (
                  <p key={g.id} className="text-sm font-bold text-neutral-800">{g.name} {g.lastname}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Descripción General */}
        {activity.results && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-neutral-900 mb-2">Descripción General</h2>
            <p className="text-sm text-neutral-600">{activity.results}</p>
          </div>
        )}

        {/* Ubicación */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-neutral-900 mb-3">Ubicación</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Latitud</p>
              <p className="text-sm font-bold text-neutral-800 font-mono">{activity.lat.toFixed(6)}°</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Longitud</p>
              <p className="text-sm font-bold text-neutral-800 font-mono">{activity.lng.toFixed(6)}°</p>
            </div>
          </div>
          <div className="h-64 rounded-xl overflow-hidden border border-neutral-100">
            <MapContainer center={[activity.lat, activity.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <Marker position={[activity.lat, activity.lng]} icon={defaultIcon} />
            </MapContainer>
          </div>
        </div>

        {/* Información de Validación */}
        {(activity as any).validatedAt && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <h2 className="text-sm font-black text-neutral-900 mb-3">Información de Validación</h2>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Validado por">{validador ? `${validador.name} ${validador.lastname}` : '—'}</Campo>
              <Campo label="Fecha de Validación">{format(new Date((activity as any).validatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</Campo>
            </div>
            {(activity as any).validationNotes && (
              <p className="text-sm text-neutral-600 italic mt-3">"{(activity as any).validationNotes}"</p>
            )}
          </div>
        )}

      </main>

      {/* Barra de acciones flotante — Aprobar/Rechazar (validador) y
          Editar/Enviar/Eliminar (admin) se quedan visibles siempre, sin
          tener que scrollear hasta el final de una página larga. */}
      {(activity.status === 'ENVIADA' || isAdmin) && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
            {activity.status === 'ENVIADA' && (
            <>
            {showFlow ? (
              <div className="flex flex-col gap-3">
                <h3 className={`text-xs font-black uppercase tracking-widest ${showFlow === 'APPROVE' ? 'text-emerald-600' : 'text-red-600'}`}>
                  Notas de {showFlow === 'APPROVE' ? 'Validación' : 'Rechazo'}
                </h3>
                <textarea
                  className="w-full text-sm border-2 border-neutral-200 rounded-2xl px-4 py-3 outline-none focus:border-red-500 transition-colors min-h-[100px] resize-none"
                  placeholder={showFlow === 'APPROVE' ? 'Opcional: recomendaciones para el gestor...' : 'Obligatorio: motivo del rechazo...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex gap-3">
                  <button
                    disabled={processing}
                    onClick={() => { setShowFlow(null); setNotes(''); }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={processing}
                    onClick={showFlow === 'APPROVE' ? handleApprove : handleReject}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 ${showFlow === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {showFlow === 'APPROVE' ? 'Aprobar' : 'Rechazar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFlow('APPROVE')}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => setShowFlow('REJECT')}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
                >
                  Rechazar
                </button>
              </div>
            )}
            </>
            )}

            {/* Acciones de administración — Editar sirve en cualquier
                estado (el admin puede corregir hasta un punto ya
                publicado); Enviar a Validación solo tiene sentido en
                BORRADOR/RECHAZADA (mismo límite que el gestor creador);
                Eliminar no tiene restricción de estado. */}
            {isAdmin && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/gestor-ambiental/editar-actividad/${activity.id}`)}
                  className="flex-1 min-w-[140px] py-3 rounded-xl text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  Editar
                </button>
                {(activity.status === 'BORRADOR' || activity.status === 'RECHAZADA') && (
                  <button
                    disabled={processing}
                    onClick={handleSend}
                    className="flex-1 min-w-[140px] py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    Enviar a Validación
                  </button>
                )}
                <button
                  disabled={processing}
                  onClick={handleDelete}
                  className="flex-1 min-w-[140px] py-3 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-red-700 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl border z-50 text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {expandedPhoto && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4" onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
};
