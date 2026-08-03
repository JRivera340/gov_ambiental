import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { activityService } from '../services/activity.service';
import { catalogService } from '../services/catalog.service';
import { usersService } from '../services/users.service';
import { Toast } from '../components/Toast';
import { Loading } from '../components/Loading';
import { PhotosUpload } from '../components/PhotosUpload';
import { ActaUpload } from '../components/ActaUpload';
import { CamposGenerales } from '../components/CamposGenerales';
import type { LayerVisibility } from '../components/MapLayerControl';
import { SECCIONES_PUNTO_ACUMULACION } from '../config/camposPuntoAcumulacion';
import type { Activity, Catalogs, ResiduoEntry, User } from '../types';
import { RESIDUO_TIPOS } from '../types/residuoTipos';
import { loadSantaFeBoundaries, isPointInBoundaries, isPointInCandelaria, findBarrioByPoint } from '../utils/boundaryValidation';
import { useAuthStore } from '../store/authStore';
import type { GeoJSON } from 'geojson';

// Reescrito (no es un recorte línea por línea del `EditActivity` genérico del
// monolito — ese maneja IVC/Espacio Público/PYBA con campos legacy que no
// existen en este backend). Compartido por 3 roles, igual que en el hub
// (`canEdit` de utils/permissions.ts): GESTOR_AMBIENTAL corrige lo suyo en
// BORRADOR/RECHAZADA y puede reenviar a validación; ADMIN edita cualquier
// punto en cualquier estado; VALIDADOR_AMBIENTAL edita cualquier punto solo
// mientras está ENVIADA — ninguno de los dos últimos "reenvía" (ver botón
// más abajo, gateado por rol). Corregido 2026-08-01: antes esta vista
// SIEMPRE expulsaba a `/gestor-ambiental/dashboard` (guard de carga, botón
// "volver" y navegación tras guardar), sin importar qué rol/ruta la abrió —
// un VALIDADOR_AMBIENTAL que entraba a editar terminaba en el panel de
// gestor, cruzando una frontera de rol que nunca debía cruzar.
//
// Corregido 2026-08-01 (recorrido visual siguiente): el formulario abría con
// los 26 campos del formulario fijo (frecuenciaAcumulacion, tipoZona,
// tipoSuelo, camarasPunto, identificacionGenerador, etc. — ver
// config/camposPuntoAcumulacion.ts) completamente ausentes — nunca se
// renderizaban acá, solo ubicación/fotos/acta/entidad/residuos. Ahora usa
// `CamposGenerales` (extraído de CreateActivity.tsx a
// components/CamposGenerales.tsx para no reconstruirlo a mano) precargado
// con `camposValues` desde el punto cargado.

export const EditActivity: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  // "Volver" acá es SIEMPRE navigate(-1) (corregido 2026-08-03, segunda
  // vuelta): esta vista solo se entra vía push desde otra pantalla ya
  // existente (detalle de admin/validador, o dashboard/detalle del gestor —
  // ver todos los `navigate('/gestor-ambiental/editar-actividad/...')` del
  // repo, ninguno es un punto de entrada directo de la app). Un intento
  // previo (`navigate(backTo, {replace:true})` con backTo calculado por rol)
  // arreglaba el bucle infinito pero dejaba DOS entradas de detalle apiladas
  // (la original + la de reemplazo), así que la flecha "volver" del detalle
  // necesitaba dos clics para salir del punto — reportado como "no me deja
  // devolverme". navigate(-1) no apila nada nuevo: un solo clic devuelve a
  // la pantalla real de origen.

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [lat, setLat] = useState<number>(4.6097);
  const [lng, setLng] = useState<number>(-74.0817);
  const [barrio, setBarrio] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [actaPdfUrl, setActaPdfUrl] = useState('');
  const [boundaries, setBoundaries] = useState<GeoJSON | null>(null);

  const [residuos, setResiduos] = useState<ResiduoEntry[]>([]);
  const [showResiduoForm, setShowResiduoForm] = useState(false);
  const [nuevoResiduoValues, setNuevoResiduoValues] = useState<Record<string, any>>({});
  const [editingResiduoId, setEditingResiduoId] = useState<string | null>(null);

  const [entidadesAcompanantes, setEntidadesAcompanantes] = useState<string[]>([]);
  const [gestoresInvolucradosIds, setGestoresInvolucradosIds] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [gestores, setGestores] = useState<User[]>([]);

  // Los 26 campos del formulario fijo (ver config/camposPuntoAcumulacion.ts),
  // renderizados con el mismo CamposGenerales que CreateActivity.tsx.
  const [camposValues, setCamposValues] = useState<Record<string, any>>({});
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    barrios: false, carrera7: false, colegios: false, cestas: false, falloSanVictorino: false,
    propiedadHorizontal: false, upz: false, cambuches: false, bodegas: false,
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState('');

  const handleCampoChange = (name: string, value: any) => {
    setCamposValues((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    loadData();
    loadSantaFeBoundaries().then(setBoundaries);
    catalogService.getAll().then(setCatalogs).catch(() => setCatalogs(null));
    usersService.getGestores().then(setGestores).catch(() => setGestores([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const data = await activityService.getById(id);
      // Mismo permiso que el backend (puntos.service.ts::update) — ver
      // comentario del archivo. GESTOR_AMBIENTAL: solo BORRADOR/RECHAZADA.
      // ADMIN: cualquier estado. VALIDADOR_AMBIENTAL: solo ENVIADA.
      const puedeEditar = role === 'ADMIN'
        || (role === 'VALIDADOR_AMBIENTAL' && data.status === 'ENVIADA')
        || (role === 'GESTOR_AMBIENTAL' && (data.status === 'BORRADOR' || data.status === 'RECHAZADA'));
      if (!puedeEditar) {
        setToast({ message: 'No tiene permiso para editar este punto en su estado actual', type: 'error' });
        setTimeout(() => navigate(-1), 2000);
        return;
      }
      setActivity(data);
      setLat(data.lat);
      setLng(data.lng);
      setBarrio(data.barrio);
      setPhotos(data.photos || []);
      setActaPdfUrl(data.actaPdfUrl || '');
      setResiduos(data.residuos || []);
      setEntidadesAcompanantes(data.entidadesAcompanantes || []);
      setGestoresInvolucradosIds((data.gestoresInvolucrados || []).map((g) => g.id));
      setCamposValues({
        ubicacion_mapa: { lat: data.lat, lng: data.lng },
        fecha_operativo: data.dateTime ? data.dateTime.slice(0, 16) : undefined,
        entidad_responsable: data.entidadResponsable || undefined,
        frecuenciaAcumulacion: data.frecuenciaAcumulacion ?? undefined,
        observaciones: data.observaciones ?? undefined,
        entornoEscolar: data.entornoEscolar ?? undefined,
        nombreEntornoEscolar: data.nombreEntornoEscolar ?? undefined,
        especificarEntorno: data.especificarEntorno ?? undefined,
        tipoZona: data.tipoZona ?? undefined,
        tipoSuelo: data.tipoSuelo ?? undefined,
        condicionesZona: data.condicionesZona ?? undefined,
        poblacionHabitanteCalle: data.poblacionHabitanteCalle ?? undefined,
        factoresAcumulacion: data.factoresAcumulacion ?? undefined,
        camarasPunto: data.camarasPunto ?? undefined,
        operadorAseo: data.operadorAseo ?? undefined,
        recoleccionPuertaAPuerta: data.recoleccionPuertaAPuerta ?? undefined,
        m2Invasion: data.m2Invasion ?? undefined,
        actoresIndisciplina: data.actoresIndisciplina ?? undefined,
        intervencionesPropuestas: data.intervencionesPropuestas ?? undefined,
        identificacionGenerador: data.identificacionGenerador ?? undefined,
        tipoGenerador: data.tipoGenerador ?? undefined,
        nombreResponsable: data.nombreResponsable ?? undefined,
        direccionResponsable: data.direccionResponsable ?? undefined,
        observoDisposicion: data.observoDisposicion ?? undefined,
        fechaObservacion: data.fechaObservacion ? data.fechaObservacion.slice(0, 16) : undefined,
        metodoIdentificacion: data.metodoIdentificacion ?? undefined,
        actoresEstrategicos: data.actoresEstrategicos ?? undefined,
        telefonoActor: data.telefonoActor ?? undefined,
        intervencionesRecomendadas: data.intervencionesRecomendadas ?? undefined,
      });
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'Error al cargar el punto', type: 'error' });
      setTimeout(() => navigate(-1), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (newLat: number, newLng: number) => {
    const inCandelaria = await isPointInCandelaria(newLat, newLng);
    if (inCandelaria) {
      setToast({ message: 'Las actividades no pueden registrarse dentro de la localidad de Candelaria.', type: 'error' });
      return;
    }
    if (boundaries && !isPointInBoundaries(newLat, newLng, boundaries)) {
      setToast({ message: 'La ubicación debe estar dentro de los límites de Santa Fe.', type: 'error' });
      return;
    }
    setLat(newLat);
    setLng(newLng);
    handleCampoChange('ubicacion_mapa', { lat: newLat, lng: newLng });
    const barrioName = await findBarrioByPoint(newLat, newLng);
    if (barrioName) setBarrio(barrioName);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no disponible en este navegador');
      return;
    }
    setLocationError('');
    setLocationAccuracy(null);
    setGettingLocation(true);

    const ACCURACY_THRESHOLD = 150;
    let watchId: number;
    let bestPos: GeolocationPosition | null = null;

    const applyPosition = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      const inCandelaria = await isPointInCandelaria(latitude, longitude);
      if (inCandelaria) {
        setLocationError('Ubicación dentro de Candelaria — no permitida');
        setGettingLocation(false);
        setLocationAccuracy(null);
        return;
      }
      if (boundaries && !isPointInBoundaries(latitude, longitude, boundaries)) {
        setLocationError('Ubicación fuera de los límites de Santa Fe — debe estar dentro de la localidad');
        setGettingLocation(false);
        setLocationAccuracy(null);
        return;
      }
      setLat(latitude);
      setLng(longitude);
      handleCampoChange('ubicacion_mapa', { lat: latitude, lng: longitude });
      const bName = await findBarrioByPoint(latitude, longitude);
      if (bName) setBarrio(bName);
      setGettingLocation(false);
      setLocationAccuracy(null);
    };

    const fallbackTimer = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (bestPos) applyPosition(bestPos);
      else { setLocationError('No se pudo obtener ubicación'); setGettingLocation(false); setLocationAccuracy(null); }
    }, 10000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        bestPos = pos;
        setLocationAccuracy(pos.coords.accuracy);
        if (pos.coords.accuracy <= ACCURACY_THRESHOLD) {
          clearTimeout(fallbackTimer);
          navigator.geolocation.clearWatch(watchId);
          applyPosition(pos);
        }
      },
      (err) => {
        clearTimeout(fallbackTimer);
        navigator.geolocation.clearWatch(watchId);
        setLocationError(err.code === 1 ? 'Permiso de ubicación denegado' : 'Error al obtener ubicación');
        setGettingLocation(false);
        setLocationAccuracy(null);
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  };

  const save = async (thenSend: boolean) => {
    if (!activity) return;
    if (residuos.length === 0) {
      setToast({ message: 'Debe haber al menos un residuo', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      // Mismo mapeo de camposValues -> DTO que CreateActivity.tsx (rama
      // PUNTO_ACUMULACION de onSubmit), para no divergir en cómo se coercionan
      // los booleanos guardados como radio 'true'/'false'.
      await activityService.update(activity.id, {
        lat, lng, barrio, photos, actaPdfUrl, residuos,
        entidadResponsable: camposValues['entidad_responsable'],
        entidadesAcompanantes, gestoresInvolucradosIds,
        frecuenciaAcumulacion: camposValues['frecuenciaAcumulacion'],
        observaciones: camposValues['observaciones'],
        entornoEscolar: camposValues['entornoEscolar'] !== undefined ? camposValues['entornoEscolar'] === 'true' || camposValues['entornoEscolar'] === true : undefined,
        nombreEntornoEscolar: camposValues['nombreEntornoEscolar'],
        especificarEntorno: camposValues['especificarEntorno'],
        tipoZona: camposValues['tipoZona'],
        tipoSuelo: camposValues['tipoSuelo'],
        condicionesZona: camposValues['condicionesZona'],
        poblacionHabitanteCalle: camposValues['poblacionHabitanteCalle'] !== undefined ? camposValues['poblacionHabitanteCalle'] === 'true' || camposValues['poblacionHabitanteCalle'] === true : undefined,
        factoresAcumulacion: camposValues['factoresAcumulacion'],
        camarasPunto: camposValues['camarasPunto'],
        operadorAseo: camposValues['operadorAseo'],
        recoleccionPuertaAPuerta: camposValues['recoleccionPuertaAPuerta'] !== undefined ? camposValues['recoleccionPuertaAPuerta'] === 'true' || camposValues['recoleccionPuertaAPuerta'] === true : undefined,
        m2Invasion: camposValues['m2Invasion'],
        actoresIndisciplina: camposValues['actoresIndisciplina'],
        intervencionesPropuestas: camposValues['intervencionesPropuestas'],
        identificacionGenerador: camposValues['identificacionGenerador'],
        tipoGenerador: camposValues['tipoGenerador'],
        nombreResponsable: camposValues['nombreResponsable'],
        direccionResponsable: camposValues['direccionResponsable'],
        observoDisposicion: camposValues['observoDisposicion'] !== undefined ? camposValues['observoDisposicion'] === 'true' || camposValues['observoDisposicion'] === true : undefined,
        fechaObservacion: camposValues['fechaObservacion'] ? new Date(camposValues['fechaObservacion']).toISOString() : undefined,
        metodoIdentificacion: camposValues['metodoIdentificacion'],
        actoresEstrategicos: camposValues['actoresEstrategicos'],
        telefonoActor: camposValues['telefonoActor'],
        intervencionesRecomendadas: camposValues['intervencionesRecomendadas'],
      } as any);
      if (thenSend) {
        await activityService.send(activity.id);
        setToast({ message: 'Punto corregido y reenviado a validación', type: 'success' });
      } else {
        setToast({ message: 'Cambios guardados', type: 'success' });
      }
      setTimeout(() => navigate(-1), 1500);
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // "Reenviar a validación" es una acción exclusiva de GESTOR_AMBIENTAL
  // corrigiendo lo suyo (BORRADOR/RECHAZADA) — el backend `send()` es
  // creador-only, y no tiene sentido para VALIDADOR_AMBIENTAL/ADMIN
  // editando un punto ajeno ya ENVIADA/PUBLICADA.
  const puedeReenviar = role === 'GESTOR_AMBIENTAL';

  if (loading) return <Loading />;
  if (!activity) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="text-neutral-600 mr-4">←</button>
            <h1 className="text-xl font-bold text-institutional-black">Corregir Punto</h1>
          </div>
          {activity.status === 'RECHAZADA' && (
            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">Rechazado — corregir y reenviar</span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {activity.validationNotes && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-semibold text-red-800 mb-1">Observaciones del validador:</h3>
            <p className="text-red-700 text-sm">{activity.validationNotes}</p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
          <CamposGenerales
            secciones={SECCIONES_PUNTO_ACUMULACION}
            values={camposValues}
            onChange={handleCampoChange}
            lat={lat}
            lng={lng}
            barrio={barrio}
            boundaries={boundaries}
            layerVisibility={layerVisibility}
            onLayerVisibilityChange={(l, v) => setLayerVisibility((p) => ({ ...p, [l]: v }))}
            onToggleAllLayers={(v) => setLayerVisibility({ barrios: v, carrera7: v, colegios: v, cestas: v, falloSanVictorino: v, propiedadHorizontal: v, upz: v, cambuches: v, bodegas: v })}
            onMapClick={handleMapClick}
            getLocation={getLocation}
            gettingLocation={gettingLocation}
            locationAccuracy={locationAccuracy}
            locationError={locationError}
            gestores={gestores}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100 space-y-6">
          <h2 className="text-lg font-bold text-primary">Fotos y Acta</h2>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Fotos del punto</label>
            <PhotosUpload onUploadSuccess={setPhotos} existingUrls={photos} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Acta (opcional)</label>
            <ActaUpload onUploadSuccess={setActaPdfUrl} existingUrl={actaPdfUrl} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100 space-y-6">
          <h2 className="text-lg font-bold text-primary">Entidades y Gestores</h2>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Entidades acompañantes</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(catalogs?.entidades || []).map((e) => (
                <label key={e} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${entidadesAcompanantes.includes(e) ? 'border-primary bg-primary/5' : 'border-neutral-200'}`}>
                  <input
                    type="checkbox"
                    checked={entidadesAcompanantes.includes(e)}
                    onChange={() => setEntidadesAcompanantes((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])}
                    className="accent-primary"
                  />
                  <span className="text-sm">{e}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Gestores acompañantes</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gestores.map((g) => (
                <label key={g.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${gestoresInvolucradosIds.includes(g.id) ? 'border-primary bg-primary/5' : 'border-neutral-200'}`}>
                  <input
                    type="checkbox"
                    checked={gestoresInvolucradosIds.includes(g.id)}
                    onChange={() => setGestoresInvolucradosIds((prev) => prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id])}
                    className="accent-primary"
                  />
                  <span className="text-sm">{g.name} {g.lastname}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-institutional-black tracking-tight">Residuos Identificados</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {residuos.length} residuo{residuos.length !== 1 ? 's' : ''}
            </span>
          </div>

          {residuos.length > 0 && (
            <div className="space-y-3 mb-6">
              {residuos.map((r, i) => (
                <div key={r.id || i} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{i + 1}. {r.tipoResiduo?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{r.quienDispuso?.replace(/_/g, ' ')} · {r.areaLinealMetros} m</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => {
                        const rid = r.id || `idx-${i}`;
                        setEditingResiduoId(rid);
                        setNuevoResiduoValues({ ...r });
                        setShowResiduoForm(true);
                      }} className="text-primary hover:text-primary-dark p-2 text-sm font-semibold">Editar</button>
                      <button type="button" onClick={() => setResiduos(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 p-2 text-xl font-bold leading-none">×</button>
                    </div>
                  </div>
                  {r.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.photos.map((url, pi) => (
                        <img key={pi} src={url.startsWith('http') ? url : `https://pub-cabe26a560384a89a7e2a82367fb1813.r2.dev/${url}`} alt="" className="w-14 h-14 object-cover rounded-lg border border-neutral-200" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showResiduoForm ? (
            <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider">{editingResiduoId ? 'Editar Residuo' : 'Nuevo Residuo'}</h3>
                <button type="button" onClick={() => { setShowResiduoForm(false); setNuevoResiduoValues({}); setEditingResiduoId(null); }} className="text-neutral-400 hover:text-neutral-600 text-sm">Cancelar</button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipo de Residuo *</label>
                <div className="grid grid-cols-1 gap-2">
                  {RESIDUO_TIPOS.map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${nuevoResiduoValues.tipoResiduo === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200'}`}>
                      <input type="radio" checked={nuevoResiduoValues.tipoResiduo === opt.value} onChange={() => setNuevoResiduoValues((p: any) => ({ ...p, tipoResiduo: opt.value }))} className="accent-primary" />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Área lineal estimada (metros) *</label>
                <input type="number" min="0" step="0.01" value={nuevoResiduoValues.areaLinealMetros ?? ''} onChange={e => setNuevoResiduoValues((p: any) => ({ ...p, areaLinealMetros: e.target.value ? parseFloat(e.target.value) : undefined }))} className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Observaciones</label>
                <textarea rows={2} value={nuevoResiduoValues.observaciones ?? ''} onChange={e => setNuevoResiduoValues((p: any) => ({ ...p, observaciones: e.target.value }))} className="input-field resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Foto de Evidencia (máx. 1)</label>
                <PhotosUpload onUploadSuccess={urls => setNuevoResiduoValues((p: any) => ({ ...p, photos: urls.slice(0, 1) }))} existingUrls={nuevoResiduoValues.photos || []} maxPhotos={1} />
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => {
                  if (!nuevoResiduoValues.tipoResiduo) { setToast({ message: 'Seleccione el tipo de residuo', type: 'error' }); return; }
                  if (nuevoResiduoValues.areaLinealMetros === undefined) { setToast({ message: 'Ingrese el área estimada', type: 'error' }); return; }

                  if (editingResiduoId) {
                    setResiduos(prev => prev.map((r, i) => {
                      const currId = r.id || `idx-${i}`;
                      return currId === editingResiduoId ? { ...nuevoResiduoValues, id: currId, recogido: r.recogido || false } as ResiduoEntry : r;
                    }));
                  } else {
                    setResiduos(prev => [...prev, {
                      ...nuevoResiduoValues,
                      id: crypto.randomUUID(),
                      recogido: false,
                      dateTime: new Date().toISOString(),
                      photos: nuevoResiduoValues.photos || [],
                    } as ResiduoEntry]);
                  }
                  setNuevoResiduoValues({});
                  setEditingResiduoId(null);
                  setShowResiduoForm(false);
                }} className="btn-primary">Guardar Residuo</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowResiduoForm(true)} className="w-full py-3 border-2 border-dashed border-primary/40 rounded-xl text-primary font-semibold hover:bg-primary/5">
              + Agregar Residuo
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <button onClick={() => save(false)} disabled={saving} className={`btn-secondary py-4 ${puedeReenviar ? 'flex-1' : 'w-full'}`}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          {puedeReenviar && (
            <button onClick={() => save(true)} disabled={saving} className="btn-primary flex-1 py-4">
              {saving ? 'Guardando...' : 'Guardar y Reenviar a Validación'}
            </button>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
