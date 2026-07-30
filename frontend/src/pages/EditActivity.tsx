import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import { activityService } from '../services/activity.service';
import { catalogService } from '../services/catalog.service';
import { usersService } from '../services/users.service';
import { BoundaryLayer } from '../components/BoundaryLayer';
import { BarriosLayer } from '../components/BarriosLayer';
import { Toast } from '../components/Toast';
import { Loading } from '../components/Loading';
import { PhotosUpload } from '../components/PhotosUpload';
import { ActaUpload } from '../components/ActaUpload';
import type { Activity, Catalogs, ResiduoEntry, User } from '../types';
import { RESIDUO_TIPOS } from '../types/residuoTipos';
import { loadSantaFeBoundaries, isPointInBoundaries, isPointInCandelaria, findBarrioByPoint } from '../utils/boundaryValidation';
import type { GeoJSON } from 'geojson';

// Reescrito (no es un recorte línea por línea del `EditActivity` genérico del
// monolito — ese maneja IVC/Espacio Público/PYBA con campos legacy que no
// existen en este backend). Acá el alcance es el real de este repo: corregir
// un punto en BORRADOR o RECHAZADA (lat/lng/barrio/fotos/acta/residuos) antes
// de reenviarlo a validación — el backend (`PATCH /puntos/:id`) solo permite
// editar en esos dos estados, igual que antes.

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export const EditActivity: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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

  const [entidadResponsable, setEntidadResponsable] = useState('');
  const [entidadesAcompanantes, setEntidadesAcompanantes] = useState<string[]>([]);
  const [gestoresInvolucradosIds, setGestoresInvolucradosIds] = useState<string[]>([]);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [gestores, setGestores] = useState<User[]>([]);

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
      if (data.status !== 'BORRADOR' && data.status !== 'RECHAZADA') {
        setToast({ message: 'Solo se puede editar un punto en borrador o rechazado', type: 'error' });
        setTimeout(() => navigate('/gestor-ambiental/dashboard'), 2000);
        return;
      }
      setActivity(data);
      setLat(data.lat);
      setLng(data.lng);
      setBarrio(data.barrio);
      setPhotos(data.photos || []);
      setActaPdfUrl(data.actaPdfUrl || '');
      setResiduos(data.residuos || []);
      setEntidadResponsable(data.entidadResponsable || '');
      setEntidadesAcompanantes(data.entidadesAcompanantes || []);
      setGestoresInvolucradosIds((data.gestoresInvolucrados || []).map((g) => g.id));
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'Error al cargar el punto', type: 'error' });
      setTimeout(() => navigate('/gestor-ambiental/dashboard'), 2000);
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
    const barrioName = await findBarrioByPoint(newLat, newLng);
    if (barrioName) setBarrio(barrioName);
  };

  const save = async (thenSend: boolean) => {
    if (!activity) return;
    if (residuos.length === 0) {
      setToast({ message: 'Debe haber al menos un residuo', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await activityService.update(activity.id, {
        lat, lng, barrio, photos, actaPdfUrl, residuos,
        entidadResponsable, entidadesAcompanantes, gestoresInvolucradosIds,
      } as any);
      if (thenSend) {
        await activityService.send(activity.id);
        setToast({ message: 'Punto corregido y reenviado a validación', type: 'success' });
      } else {
        setToast({ message: 'Cambios guardados', type: 'success' });
      }
      setTimeout(() => navigate('/gestor-ambiental/dashboard'), 1500);
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (!activity) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/gestor-ambiental/dashboard')} className="text-neutral-600 mr-4">←</button>
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

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100 space-y-6">
          <h2 className="text-lg font-bold text-primary">Ubicación</h2>
          <div className="h-80 rounded-2xl overflow-hidden border-2 border-neutral-100 shadow-inner">
            <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <BoundaryLayer kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz" color="#DC2626" fillOpacity={0.1} />
              <BarriosLayer color="#2563eb" fillColor="#2563eb" fillOpacity={0.05} weight={1} />
              <Marker position={[lat, lng]} icon={defaultIcon} />
              <MapClickHandler onClick={handleMapClick} />
            </MapContainer>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-emerald-600 uppercase font-bold block">Barrio</span>
            <span className="text-sm font-bold text-emerald-800">{barrio || 'Toca el mapa para detectar el barrio'}</span>
          </div>

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
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Entidad responsable</label>
            <select value={entidadResponsable} onChange={(e) => setEntidadResponsable(e.target.value)} className="input-field">
              <option value="">Seleccionar entidad</option>
              {(catalogs?.entidades || []).map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

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
          <button onClick={() => save(false)} disabled={saving} className="btn-secondary flex-1 py-4">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="btn-primary flex-1 py-4">
            {saving ? 'Guardando...' : 'Guardar y Reenviar a Validación'}
          </button>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
