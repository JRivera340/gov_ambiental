import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import { activityService } from '../services/activity.service';
import { BoundaryLayer } from '../components/BoundaryLayer';
import { BarriosLayer } from '../components/BarriosLayer';
import { MapLayerControl, type LayerVisibility } from '../components/MapLayerControl';
import { catalogService } from '../services/catalog.service';
import { Toast } from '../components/Toast';
import { Loading } from '../components/Loading';
import { PhotosUpload } from '../components/PhotosUpload';
import { ActaUpload } from '../components/ActaUpload';
import { usersService } from '../services/users.service';
import { useAuthStore } from '../store/authStore';
import type { Catalogs, ResiduoEntry, User } from '../types';
import { SECCIONES_PUNTO_ACUMULACION, type CampoDef } from '../config/camposPuntoAcumulacion';
import { SECCIONES_AMBIENTAL_GENERICO } from '../config/camposAmbientalGenerico';
import { isFieldVisible } from '../lib/fieldVisibility';
import { RESIDUO_TIPOS } from '../types/residuoTipos';
import { ACTORES_INDISCIPLINA } from '../types/ambientalCampos';
import { loadSantaFeBoundaries, isPointInBoundaries, isPointInCandelaria, findBarrioByPoint } from '../utils/boundaryValidation';
import type { GeoJSON } from 'geojson';

// Único punto de registro de puntos de acumulación en este repo. El
// formulario general es fijo (ver config/camposPuntoAcumulacion.ts) — ya no
// depende de gov_encuestas_publico, se entrega solo como código fuente.
// Ver ESTADO-EXTRACCION.md para la regresión de datos que este cambio corrige
// (26 campos que antes se descartaban al guardar, ahora tienen columna propia).

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

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

interface CampoInputProps {
  campo: CampoDef;
  value: any;
  onChange: (name: string, value: any) => void;
  gestores?: User[];
  currentUserId?: string;
}

const CampoInput: React.FC<CampoInputProps> = ({ campo, value, onChange, gestores, currentUserId }) => {
  const val = value ?? '';

  if (campo.type === 'CHECKBOX') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={campo.name}
          checked={!!value}
          onChange={(e) => onChange(campo.name, e.target.checked)}
          className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary"
        />
        <label htmlFor={campo.name} className="text-sm text-neutral-700 cursor-pointer">Confirmar</label>
      </div>
    );
  }

  if (campo.type === 'FILE') {
    const isActa = campo.config?.accept?.includes('pdf');
    if (isActa) {
      return (
        <ActaUpload
          onUploadSuccess={(url) => onChange(campo.name, url)}
          existingUrl={value || null}
        />
      );
    }
    return (
      <PhotosUpload
        onUploadSuccess={(urls) => onChange(campo.name, urls)}
        existingUrls={value || []}
        maxPhotos={campo.config?.maxFiles ?? 5}
      />
    );
  }

  if (campo.type === 'ENTITY_SELECT') {
    const arr: string[] = Array.isArray(value) ? value : [];
    const opciones = (gestores || [])
      .filter((g) => g && g.id !== currentUserId)
      .map((g) => ({ value: `${g.name} ${g.lastname}`, label: `${g.name} ${g.lastname}` }));
    return (
      <div className="flex flex-wrap gap-2">
        {opciones.length === 0 && <p className="text-xs text-neutral-400">No hay gestores disponibles</p>}
        {opciones.map((o) => {
          const on = arr.includes(o.value);
          return (
            <button
              type="button" key={o.value}
              onClick={() => onChange(campo.name, on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-neutral-200 text-neutral-600'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (campo.type === 'NUMBER') {
    return (
      <input
        type="number" min="0" step="any"
        value={value ?? ''}
        onChange={(e) => onChange(campo.name, e.target.value === '' ? undefined : Number(e.target.value))}
        className="input-field" placeholder={campo.placeholder || '0'}
      />
    );
  }
  if (campo.type === 'TEXTAREA' || campo.type === 'TEXT') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(campo.name, e.target.value || undefined)}
        rows={campo.type === 'TEXTAREA' ? 4 : 1}
        className="input-field" placeholder={campo.placeholder || ''}
      />
    );
  }
  if (campo.type === 'DATE') {
    return (
      <input
        type="datetime-local"
        value={value ?? ''}
        onChange={(e) => onChange(campo.name, e.target.value)}
        className="input-field"
      />
    );
  }
  if (campo.type === 'RADIO' || campo.type === 'SELECT') {
    if (campo.type === 'SELECT') {
      return (
        <select value={val} onChange={(e) => onChange(campo.name, e.target.value)} className="input-field">
          <option value="">Seleccionar...</option>
          {(campo.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(campo.options || []).map((o) => (
          <label key={o.value} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${String(val) === o.value ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-neutral-100 hover:border-neutral-200'}`}>
            <input
              type="radio" name={campo.name} value={o.value}
              checked={String(val) === o.value}
              onChange={() => onChange(campo.name, o.value)}
              className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary"
            />
            <span className={`text-sm ${String(val) === o.value ? 'text-primary font-bold' : 'text-neutral-600'}`}>{o.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (campo.type === 'MULTISELECT') {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(campo.options || []).map((o) => {
          const on = arr.includes(o.value);
          return (
            <button
              type="button" key={o.value}
              onClick={() => onChange(campo.name, on ? arr.filter((x: string) => x !== o.value) : [...arr, o.value])}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${on ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-neutral-200 text-neutral-600'}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  return <input type="text" value={val} onChange={(e) => onChange(campo.name, e.target.value)} className="input-field" />;
};

interface CamposGeneralesProps {
  secciones: import('../config/camposAmbientalShared').SeccionCampos[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  lat: number;
  lng: number;
  barrio: string;
  boundaries: GeoJSON | null;
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
  onToggleAllLayers: (visible: boolean) => void;
  onMapClick: (lat: number, lng: number) => void;
  getLocation: () => void;
  gettingLocation: boolean;
  locationAccuracy: number | null;
  locationError: string;
  gestores: User[];
  currentUserId?: string;
}

const CamposGenerales: React.FC<CamposGeneralesProps> = ({
  secciones, values, onChange, lat, lng, barrio, boundaries, layerVisibility,
  onLayerVisibilityChange, onToggleAllLayers, onMapClick,
  getLocation, gettingLocation, locationAccuracy, locationError,
  gestores, currentUserId,
}) => {
  const resolveValueByName = (name: string) => values[name];

  return (
    <div className="space-y-10">
      {secciones.map((seccion, sIdx) => (
        <div key={sIdx} className="section-box bg-neutral-50/30 rounded-3xl border border-neutral-100 p-6 md:p-8 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4 mb-2">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              {seccion.titulo}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seccion.campos.map((campo) => {
              if (!isFieldVisible(campo.visibleIf, resolveValueByName)) return null;

              if (campo.type === 'SUBSECTION_HEADER') {
                return (
                  <div key={campo.name} className="col-span-full border-t border-neutral-200 pt-5 mt-1">
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">{campo.label}</h4>
                  </div>
                );
              }

              const fullWidth = ['LOCATION', 'TEXTAREA', 'MULTISELECT', 'FILE', 'ENTITY_SELECT'].includes(campo.type);
              const colSpan = fullWidth ? 'col-span-full' : 'col-span-1';
              return (
                <div key={campo.name} className={`${colSpan} space-y-2`}>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    {campo.label} {campo.required && <span className="text-red-500">*</span>}
                  </label>
                  {campo.type === 'LOCATION' ? (
                    <div className="space-y-4 bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                      <button type="button" onClick={getLocation} disabled={gettingLocation} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
                        {gettingLocation
                          ? locationAccuracy !== null ? `Refinando GPS... (±${Math.round(locationAccuracy)}m)` : 'Buscando señal GPS...'
                          : 'Usar mi ubicación actual'}
                      </button>
                      {locationError && <p className="text-xs text-red-500">{locationError}</p>}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Latitud</span>
                          <span className="text-xs font-mono text-neutral-700">{lat?.toFixed(6) || '---'}</span>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Longitud</span>
                          <span className="text-xs font-mono text-neutral-700">{lng?.toFixed(6) || '---'}</span>
                        </div>
                      </div>
                      <div className="h-80 rounded-2xl overflow-hidden border-2 border-neutral-100 shadow-inner relative">
                        <MapContainer center={[lat || 4.6097, lng || -74.0817]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapLayerControl layerVisibility={layerVisibility} onLayerVisibilityChange={onLayerVisibilityChange} onToggleAll={onToggleAllLayers} position="topright" />
                          <BoundaryLayer kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz" color="#DC2626" fillOpacity={0.1} />
                          <BarriosLayer color="#2563eb" fillColor="#2563eb" fillOpacity={0.05} weight={1} />
                          <ChangeView center={[lat || 4.6097, lng || -74.0817]} />
                          <Marker position={[lat || 4.6097, lng || -74.0817]} icon={defaultIcon} />
                          <MapClickHandler onClick={onMapClick} />
                        </MapContainer>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                        <span className="text-[10px] text-emerald-600 uppercase font-bold block">Barrio detectado</span>
                        <span className="text-sm font-bold text-emerald-800">{barrio || 'Toca el mapa para detectar el barrio'}</span>
                      </div>
                    </div>
                  ) : (
                    <CampoInput campo={campo} value={values[campo.name]} onChange={onChange} gestores={gestores} currentUserId={currentUserId} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const CreateActivity: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const processId = searchParams.get('processId');
  const [tipoOperativo, setTipoOperativo] = useState<'PUNTO_ACUMULACION' | 'GENERICO'>('PUNTO_ACUMULACION');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    barrios: false, carrera7: false, colegios: false, cestas: false, falloSanVictorino: false,
    propiedadHorizontal: false, upz: false, cambuches: false, bodegas: false,
  });

  const { handleSubmit } = useForm();

  const [loading, setLoading] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lat, setLat] = useState<number>(4.6097);
  const [lng, setLng] = useState<number>(-74.0817);
  const [barrio, setBarrio] = useState<string>('');
  const [boundaries, setBoundaries] = useState<GeoJSON | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState('');
  const [residuos, setResiduos] = useState<ResiduoEntry[]>([]);
  const [showResiduoForm, setShowResiduoForm] = useState(false);
  const [nuevoResiduoValues, setNuevoResiduoValues] = useState<Record<string, any>>({});
  const [editingResiduoId, setEditingResiduoId] = useState<string | null>(null);

  const [gestores, setGestores] = useState<User[]>([]);
  const [camposValues, setCamposValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadCatalogs();
    loadBoundaries();
    usersService.getGestores().then(setGestores).catch(() => setGestores([]));
  }, []);

  const loadCatalogs = async () => {
    try {
      const data = await catalogService.getAll();
      setCatalogs(data);
    } catch (e) { console.error(e); } finally { setCatalogsLoading(false); }
  };

  const loadBoundaries = async () => {
    setBoundaries(await loadSantaFeBoundaries());
  };

  const handleCampoChange = (name: string, value: any) => {
    setCamposValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapClick = async (newLat: number, newLng: number) => {
    const inCandelaria = await isPointInCandelaria(newLat, newLng);
    if (inCandelaria) {
      alert('Las actividades no pueden registrarse dentro de la localidad de Candelaria.');
      return;
    }
    if (boundaries && !isPointInBoundaries(newLat, newLng, boundaries)) {
      alert('La ubicación debe estar dentro de los límites de Santa Fe.');
      return;
    }
    setLat(newLat);
    setLng(newLng);
    try {
      const barrioName = await findBarrioByPoint(newLat, newLng);
      if (barrioName && catalogs?.barrios.includes(barrioName)) {
        setBarrio(barrioName);
      }
    } catch (e) { console.error(e); }
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

  const secciones = tipoOperativo === 'GENERICO' ? SECCIONES_AMBIENTAL_GENERICO : SECCIONES_PUNTO_ACUMULACION;
  const todosLosCampos = useMemo(() => secciones.flatMap((s) => s.campos), [secciones]);

  const handleTipoOperativoChange = (nuevo: 'PUNTO_ACUMULACION' | 'GENERICO') => {
    setTipoOperativo(nuevo);
    setCamposValues({});
    setResiduos([]);
  };

  const onSubmit = async () => {
    if (tipoOperativo === 'PUNTO_ACUMULACION' && residuos.length === 0) {
      setToast({ message: 'Debe agregar al menos un residuo al punto', type: 'error' });
      return;
    }

    const isCampoVisible = (campo: CampoDef): boolean =>
      isFieldVisible(campo.visibleIf, (name: string) => camposValues[name]);

    const isAnswered = (val: any): boolean => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      return true;
    };

    const missingRequired = todosLosCampos.filter((c) => c.required && isCampoVisible(c) && !isAnswered(camposValues[c.name]));
    if (!isAnswered(camposValues['ubicacion_mapa']) && !(lat && lng)) missingRequired.push({ name: 'ubicacion_mapa', label: 'Ubicación', type: 'LOCATION' });

    if (missingRequired.length > 0) {
      setToast({ message: `Faltan campos obligatorios: ${missingRequired.map((c) => c.label).join(', ')}`, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const dateTimeVal = camposValues['fecha_operativo'] || new Date().toISOString();

      let dto: any = {
        tipoOperativo,
        dateTime: new Date(dateTimeVal).toISOString(),
        lat,
        lng,
        barrio,
        entidadResponsable: camposValues['entidad_responsable'],
      };

      if (tipoOperativo === 'GENERICO') {
        // Gestores acompañantes: la pregunta guarda NOMBRES ("Nombre
        // Apellido"), hay que resolverlos a IDs — mismo patrón que el hub.
        const nombresAcompanantes: string[] = Array.isArray(camposValues['gestores_acompanantes'])
          ? camposValues['gestores_acompanantes']
          : [];
        const gestoresInvolucradosIds = Array.from(new Set(
          nombresAcompanantes
            .map((nombre) => gestores.find((g) => `${g.name} ${g.lastname}` === nombre)?.id)
            .filter((id): id is string => !!id),
        ));

        dto = {
          ...dto,
          residuos: [],
          results: camposValues['descripcion_general'],
          photos: camposValues['fotos_evidencia'] || [],
          actaPdfUrl: camposValues['acta_pdf'],
          isGroupOperativo: !!camposValues['en_grupo'] || gestoresInvolucradosIds.length > 0,
          gestoresInvolucradosIds,
          puntosCriticosEmergentesAtendidos: camposValues['puntosCriticosEmergentesAtendidos'],
          comparendosPedagogicos: camposValues['comparendosPedagogicos'],
          comparendos: camposValues['comparendos'],
          personasSensibilizadas: camposValues['personasSensibilizadas'],
          huertas: camposValues['huertas'],
          kgMaterialResiduosRecolectados: camposValues['kgMaterialResiduosRecolectados'],
          m2RecuperadosEspacioPublico: camposValues['m2RecuperadosEspacioPublico'],
        };
      } else {
        dto = {
          ...dto,
          residuos,
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
        };
      }
      if (processId) dto.processId = processId;

      const created = await activityService.create(dto);
      await activityService.send(created.id);

      setToast({ message: 'Punto registrado y enviado a validación con éxito', type: 'success' });
      setTimeout(() => navigate('/gestor-ambiental/dashboard'), 1500);
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'Error al guardar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (catalogsLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/gestor-ambiental/dashboard')} className="text-neutral-600 mr-4">←</button>
            <h1 className="text-xl font-bold text-institutional-black">Registrar Punto</h1>
          </div>
          <span className="badge badge-primary">Ambiental</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card mb-8 p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">1. Configuración del Operativo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Categoría</label>
              <div className="input-field bg-neutral-50 text-neutral-600 cursor-not-allowed">Ambiental</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Subtipo de Operativo</label>
              <select
                value={tipoOperativo}
                onChange={(e) => handleTipoOperativoChange(e.target.value as 'PUNTO_ACUMULACION' | 'GENERICO')}
                className="input-field"
              >
                <option value="PUNTO_ACUMULACION">Puntos de Acumulación de Residuos</option>
                <option value="GENERICO">Ambiental</option>
              </select>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
            <CamposGenerales
              secciones={secciones}
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
              currentUserId={user?.id}
            />
          </div>

          {tipoOperativo === 'PUNTO_ACUMULACION' && (
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-institutional-black tracking-tight">Residuos Identificados</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Agregue al menos un residuo detectado en el punto</p>
              </div>
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
                          const id = r.id || `idx-${i}`;
                          setEditingResiduoId(id);
                          setNuevoResiduoValues({ ...r });
                          setShowResiduoForm(true);
                          setTimeout(() => document.getElementById('residuo-form-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                        }} className="text-primary hover:text-primary-dark p-2 text-sm font-semibold">Editar</button>
                        <button type="button" onClick={() => setResiduos((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 p-2 text-xl font-bold leading-none">×</button>
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
              <div id="residuo-form-create" className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-primary uppercase tracking-wider">{editingResiduoId ? 'Editar Residuo' : 'Nuevo Residuo'}</h3>
                  <button type="button" onClick={() => { setShowResiduoForm(false); setNuevoResiduoValues({}); setEditingResiduoId(null); }} className="text-neutral-400 hover:text-neutral-600 text-sm">Cancelar</button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipo de Residuo *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {RESIDUO_TIPOS.map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.tipoResiduo === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                        <input type="radio" name="nr_tipoResiduo" value={opt.value} checked={nuevoResiduoValues.tipoResiduo === opt.value} onChange={() => setNuevoResiduoValues((prev) => ({ ...prev, tipoResiduo: opt.value }))} className="accent-primary" />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">¿Quién dispuso los residuos? *</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'COMUNIDAD', label: 'Comunidad' },
                      { value: 'ESTABLECIMIENTOS_COMERCIALES', label: 'Establecimientos comerciales' },
                      { value: 'VOLQUETAS', label: 'Volquetas' },
                      { value: 'HABITANTES_DE_CALLE', label: 'Habitantes de calle' },
                      { value: 'OTROS_NO_SE_CONOCE', label: 'Otros, no se conoce' },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.quienDispuso === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                        <input type="radio" name="nr_quienDispuso" value={opt.value} checked={nuevoResiduoValues.quienDispuso === opt.value} onChange={() => setNuevoResiduoValues((prev) => ({ ...prev, quienDispuso: opt.value }))} className="accent-primary" />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Actores que generan indisciplina</label>
                  <div className="grid grid-cols-1 gap-2">
                    {ACTORES_INDISCIPLINA.map((opt) => {
                      const seleccionados: string[] = Array.isArray(nuevoResiduoValues.actoresIndisciplina) ? nuevoResiduoValues.actoresIndisciplina : [];
                      const checked = seleccionados.includes(opt.value);
                      return (
                        <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                          <input type="checkbox" checked={checked} onChange={() => setNuevoResiduoValues((prev) => {
                            const prevSel: string[] = Array.isArray(prev.actoresIndisciplina) ? prev.actoresIndisciplina : [];
                            const next = checked ? prevSel.filter((v) => v !== opt.value) : [...prevSel, opt.value];
                            return { ...prev, actoresIndisciplina: next };
                          })} className="accent-primary" />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Fecha y Hora de Detección *</label>
                  <input type="datetime-local" value={nuevoResiduoValues.dateTime ? nuevoResiduoValues.dateTime.slice(0, 16) : new Date().toISOString().slice(0, 16)} onChange={(e) => setNuevoResiduoValues((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">¿Se perciben olores? *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map((opt) => (
                      <label key={String(opt.value)} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.percibeOlores === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                        <input type="radio" name="nr_percibeOlores" checked={nuevoResiduoValues.percibeOlores === opt.value} onChange={() => setNuevoResiduoValues((prev) => ({ ...prev, percibeOlores: opt.value }))} className="accent-primary" />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">¿Se perciben vectores? (Roedores, Palomas, Insectos, Perros, Gatos) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map((opt) => (
                      <label key={String(opt.value)} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.percibeVectores === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                        <input type="radio" name="nr_percibeVectores" checked={nuevoResiduoValues.percibeVectores === opt.value} onChange={() => setNuevoResiduoValues((prev) => ({ ...prev, percibeVectores: opt.value }))} className="accent-primary" />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Área lineal estimada (metros) *</label>
                  <input type="number" min="0" step="0.01" placeholder="Ej: 10" value={nuevoResiduoValues.areaLinealMetros ?? ''} onChange={(e) => setNuevoResiduoValues((prev) => ({ ...prev, areaLinealMetros: e.target.value ? parseFloat(e.target.value) : undefined }))} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Observaciones</label>
                  <textarea rows={2} placeholder="Observaciones adicionales..." value={nuevoResiduoValues.observaciones ?? ''} onChange={(e) => setNuevoResiduoValues((prev) => ({ ...prev, observaciones: e.target.value }))} className="input-field resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Foto de Evidencia * (máx. 1)</label>
                  <PhotosUpload onUploadSuccess={(urls) => setNuevoResiduoValues((prev) => ({ ...prev, photos: urls.slice(0, 1) }))} existingUrls={nuevoResiduoValues.photos || []} maxPhotos={1} />
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => {
                    if (!nuevoResiduoValues.tipoResiduo) { setToast({ message: 'Seleccione el tipo de residuo', type: 'error' }); return; }
                    if (!nuevoResiduoValues.quienDispuso) { setToast({ message: 'Seleccione quién dispuso los residuos', type: 'error' }); return; }
                    if (nuevoResiduoValues.percibeOlores === undefined) { setToast({ message: 'Indique si se perciben olores', type: 'error' }); return; }
                    if (nuevoResiduoValues.percibeVectores === undefined) { setToast({ message: 'Indique si se perciben vectores', type: 'error' }); return; }
                    if (nuevoResiduoValues.areaLinealMetros === undefined || nuevoResiduoValues.areaLinealMetros === '') { setToast({ message: 'Ingrese el área estimada', type: 'error' }); return; }
                    if (!nuevoResiduoValues.photos?.length) { setToast({ message: 'Suba la foto de evidencia del residuo', type: 'error' }); return; }

                    if (editingResiduoId) {
                      setResiduos((prev) => prev.map((r, i) => {
                        const currId = r.id || `idx-${i}`;
                        return currId === editingResiduoId ? { ...nuevoResiduoValues, id: currId, recogido: r.recogido || false } as ResiduoEntry : r;
                      }));
                      setToast({ message: 'Residuo actualizado', type: 'success' });
                    } else {
                      setResiduos((prev) => [...prev, {
                        ...nuevoResiduoValues,
                        id: crypto.randomUUID(),
                        recogido: false,
                        dateTime: nuevoResiduoValues.dateTime || new Date().toISOString(),
                        photos: nuevoResiduoValues.photos || [],
                      } as ResiduoEntry]);
                      setToast({ message: 'Residuo agregado', type: 'success' });
                    }
                    setNuevoResiduoValues({});
                    setEditingResiduoId(null);
                    setShowResiduoForm(false);
                  }} className="btn-primary">Guardar Residuo</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => {
                setShowResiduoForm(true);
                setTimeout(() => document.getElementById('residuo-form-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
              }} className="w-full py-3 border-2 border-dashed border-primary/40 rounded-xl text-primary font-semibold hover:bg-primary/5 transition-colors">
                + Agregar Residuo
              </button>
            )}
          </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all">
              {loading ? 'Guardando...' : 'Finalizar Registro'}
            </button>
          </div>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
