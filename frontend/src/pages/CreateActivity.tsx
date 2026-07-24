import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import { activityService } from '../services/activity.service';
import { BoundaryLayer } from '../components/BoundaryLayer';
import { BarriosLayer } from '../components/BarriosLayer';
import { MapLayerControl, type LayerVisibility } from '../components/MapLayerControl';
import { SurveyFieldInput } from '../components/create-activity/SurveyFieldInput';
import { catalogService } from '../services/catalog.service';
import { Toast } from '../components/Toast';
import { Loading } from '../components/Loading';
import { PhotosUpload } from '../components/PhotosUpload';
import { ActaUpload } from '../components/ActaUpload';
import { useAuthStore } from '../store/authStore';
import { surveyService, type SurveySchema, type SurveyQuestion } from '../services/survey.service';
import type { Catalogs, ResiduoEntry } from '../types';
import { CATEGORIA_ENCUESTAS_NAME, SUBTYPE_MAPPING, resolveSubtipo } from '../config/areasCatalog';
import { isFieldVisible } from '../lib/fieldVisibility';
import { RESIDUO_TIPOS } from '../types/residuoTipos';
import { ACTORES_INDISCIPLINA } from '../types/ambientalCampos';
import { loadSantaFeBoundaries, isPointInBoundaries, isPointInCandelaria, findBarrioByPoint } from '../utils/boundaryValidation';
import type { GeoJSON } from 'geojson';

// Este componente es el único punto de registro de puntos de acumulación en
// este repo (recortado del `CreateActivity` genérico del monolito, que
// también manejaba IVC/Espacio Público/PYBA). Acá la categoría y el subtipo
// siempre son AMBIENTAL / AMBIENTAL_PUNTOS_ACUMULACION — no hay selector.
//
// Nota: `entidad_responsable`/`entidades_acompanantes`/gestores acompañantes
// no se envían al backend todavía — la entidad `PuntoResiduo` de este repo
// no tiene esos campos (no existían en el diseño original de la extracción).
// Si la encuesta los pide, el formulario los muestra pero no se guardan;
// pendiente para una fase futura si se necesitan.

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

// Campos del survey de Puntos de Acumulación que se capturan POR RESIDUO (no en el formulario general)
const PUNTOS_RESIDUO_SURVEY_NAMES = ['quienDispuso', 'tipoResiduo', 'percibeOlores', 'percibeVectores', 'areaLinealMetros', 'fotos_evidencia'];

interface DynamicFieldsProps {
  questions: SurveyQuestion[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  catalogs: Catalogs | null;
  boundaries: GeoJSON | null;
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
  onToggleAllLayers: (visible: boolean) => void;
  setLat: (lat: number) => void;
  setLng: (lng: number) => void;
  setBarrio: (barrio: string) => void;
  getLocation: (qId: string) => void;
  gettingLocation: boolean;
  locationAccuracy: number | null;
  locationError: string;
  barrio: string;
}

const DynamicFields: React.FC<DynamicFieldsProps> = ({
  questions, values, onChange, catalogs, boundaries, layerVisibility,
  onLayerVisibilityChange, onToggleAllLayers, setLat, setLng, setBarrio,
  getLocation, gettingLocation, locationAccuracy, locationError, barrio,
}) => {
  const isQuestionVisible = (q: SurveyQuestion) =>
    isFieldVisible(q.config?.visibleIf, (name: string) => {
      const targetQ = questions.find(prevQ => prevQ.name === name);
      return targetQ ? values[targetQ.id] : undefined;
    });

  const handleMapClickInternal = async (qId: string, newLat: number, newLng: number) => {
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
    onChange(qId, { lat: newLat, lng: newLng });
    try {
      const barrioName = await findBarrioByPoint(newLat, newLng);
      if (barrioName && catalogs?.barrios.includes(barrioName)) {
        setBarrio(barrioName);
        const barrioQuestion = questions.find(q => q.name === 'barrio_detectado');
        if (barrioQuestion) onChange(barrioQuestion.id, barrioName);
      }
    } catch (e) { console.error(e); }
  };

  const groupedQuestions = useMemo(() => {
    const groups: { header?: SurveyQuestion; questions: SurveyQuestion[] }[] = [];
    let currentGroup: { header?: SurveyQuestion; questions: SurveyQuestion[] } = { questions: [] };
    const sortedQuestions = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));
    sortedQuestions.forEach(q => {
      if (q.type.toUpperCase() === 'SECTION_HEADER') {
        if (currentGroup.questions.length > 0 || currentGroup.header) groups.push(currentGroup);
        currentGroup = { header: q, questions: [] };
      } else {
        currentGroup.questions.push(q);
      }
    });
    if (currentGroup.questions.length > 0 || currentGroup.header) groups.push(currentGroup);
    return groups;
  }, [questions]);

  return (
    <div className="space-y-10">
      {groupedQuestions.map((group, gIdx) => (
        <div key={gIdx} className="section-box bg-neutral-50/30 rounded-3xl border border-neutral-100 p-6 md:p-8 space-y-6 shadow-sm">
          {group.header && (
            <div className="border-b border-neutral-200 pb-4 mb-2">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                {group.header.label}
              </h3>
              {group.header.placeholder && <p className="text-sm text-neutral-500 mt-1 ml-3">{group.header.placeholder}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {group.questions.map((q) => {
              if (!isQuestionVisible(q)) return null;
              const type = q.type.toUpperCase();
              const fullWidth = ['LOCATION', 'FILE', 'TEXTAREA', 'MULTISELECT'].includes(type);
              const colSpan = fullWidth ? 'col-span-full' : 'col-span-1';
              return (
                <div key={q.id} className={`${colSpan} space-y-2`}>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    {q.label} {q.required && <span className="text-red-500">*</span>}
                  </label>

                  {['NUMBER', 'TEXT', 'TEXTAREA', 'DATE', 'RADIO', 'SELECT'].includes(type) ? (
                    <SurveyFieldInput question={q} value={values[q.id]} onChange={onChange} />
                  ) : type === 'FILE' ? (
                    (q.name?.toLowerCase().includes('acta') || q.label?.toLowerCase().includes('acta') || (q.config?.accept && String(q.config.accept).includes('pdf'))) ? (
                      <ActaUpload onUploadSuccess={(url) => onChange(q.id, url)} existingUrl={Array.isArray(values[q.id]) ? values[q.id][0] : values[q.id]} />
                    ) : (
                      <PhotosUpload onUploadSuccess={(urls) => onChange(q.id, urls)} existingUrls={values[q.id] || []} />
                    )
                  ) : type === 'LOCATION' ? (
                    <div className="space-y-4 bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
                      <button type="button" onClick={() => getLocation(q.id)} disabled={gettingLocation} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
                        {gettingLocation
                          ? locationAccuracy !== null ? `Refinando GPS... (±${Math.round(locationAccuracy)}m)` : 'Buscando señal GPS...'
                          : 'Usar mi ubicación actual'}
                      </button>
                      {locationError && <p className="text-xs text-red-500">{locationError}</p>}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Latitud</span>
                          <span className="text-xs font-mono text-neutral-700">{values[q.id]?.lat?.toFixed(6) || '---'}</span>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Longitud</span>
                          <span className="text-xs font-mono text-neutral-700">{values[q.id]?.lng?.toFixed(6) || '---'}</span>
                        </div>
                      </div>
                      <div className="h-80 rounded-2xl overflow-hidden border-2 border-neutral-100 shadow-inner relative">
                        <MapContainer center={[values[q.id]?.lat || 4.6097, values[q.id]?.lng || -74.0817]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapLayerControl layerVisibility={layerVisibility} onLayerVisibilityChange={onLayerVisibilityChange} onToggleAll={onToggleAllLayers} position="topright" />
                          <BoundaryLayer kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz" color="#DC2626" fillOpacity={0.1} />
                          <BarriosLayer color="#2563eb" fillColor="#2563eb" fillOpacity={0.05} weight={1} />
                          <ChangeView center={[values[q.id]?.lat || 4.6097, values[q.id]?.lng || -74.0817]} />
                          <Marker position={[values[q.id]?.lat || 4.6097, values[q.id]?.lng || -74.0817]} icon={defaultIcon} />
                          <MapClickHandler onClick={(lat, lng) => handleMapClickInternal(q.id, lat, lng)} />
                        </MapContainer>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
                        <span className="text-[10px] text-emerald-600 uppercase font-bold block">Barrio detectado</span>
                        <span className="text-sm font-bold text-emerald-800">{barrio || 'Toca el mapa para detectar el barrio'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id={q.id} checked={values[q.id] ?? false} onChange={(e) => onChange(q.id, e.target.checked)} className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary" />
                      <label htmlFor={q.id} className="text-sm text-neutral-700 cursor-pointer">Confirmar</label>
                    </div>
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
  const [searchParams] = useSearchParams();
  const processId = searchParams.get('processId');
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    barrios: false, carrera7: false, colegios: false, cestas: false, falloSanVictorino: false,
    propiedadHorizontal: false, upz: false, cambuches: false, bodegas: false,
  });

  const user = useAuthStore((state) => state.user);
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

  const [operativoSubtipo, setOperativoSubtipo] = useState<string>('AMBIENTAL_PUNTOS_ACUMULACION');
  const [surveySchema, setSurveySchema] = useState<SurveySchema | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyError, setSurveyError] = useState<{ type: 'not_found' | 'technical', message: string } | null>(null);
  const [operativoDataValues, setOperativoDataValues] = useState<Record<string, any>>({});

  useEffect(() => {
    loadCatalogs();
    loadBoundaries();
  }, []);

  useEffect(() => {
    loadSurveySchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operativoSubtipo]);

  const loadSurveySchema = async () => {
    setSurveyLoading(true);
    setSurveyError(null);
    setOperativoDataValues({});
    setResiduos([]);
    setShowResiduoForm(false);
    setNuevoResiduoValues({});
    try {
      const schema = await surveyService.getSurvey(CATEGORIA_ENCUESTAS_NAME, operativoSubtipo);
      if (!schema || (Array.isArray(schema) && schema.length === 0)) {
        setSurveyError({ type: 'not_found', message: 'No hay un formulario activo para Ambiental en este momento. Por favor, contacta al administrador.' });
        setSurveySchema(null);
      } else {
        setSurveySchema(Array.isArray(schema) ? schema[0] : schema);
      }
    } catch (error) {
      setSurveyError({ type: 'technical', message: 'Estamos trabajando en ello. Por favor, intenta de nuevo en unos momentos.' });
      setSurveySchema(null);
    } finally {
      setSurveyLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const data = await catalogService.getAll();
      setCatalogs(data);
    } catch (e) { console.error(e); } finally { setCatalogsLoading(false); }
  };

  const loadBoundaries = async () => {
    setBoundaries(await loadSantaFeBoundaries());
  };

  const getLocation = (qId: string) => {
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
      const locationValue = { lat: latitude, lng: longitude };
      setOperativoDataValues(prev => ({ ...prev, [qId]: locationValue, ubicacion_mapa: locationValue }));
      const bName = await findBarrioByPoint(latitude, longitude);
      if (bName) {
        setBarrio(bName);
        const barrioQ = surveySchema?.questions.find(q => q.name === 'barrio_detectado');
        setOperativoDataValues(prev => ({ ...prev, barrio_detectado: bName, ...(barrioQ ? { [barrioQ.id]: bName } : {}) }));
      }
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

  const handleOperativoDataChange = (key: string, value: any) => {
    setOperativoDataValues(prev => ({ ...prev, [key]: value }));
  };

  const onSubmit = async () => {
    if (!surveySchema) return;
    const { esPuntosAcumulacion } = resolveSubtipo(operativoSubtipo);

    if (esPuntosAcumulacion && residuos.length === 0) {
      setToast({ message: 'Debe agregar al menos un residuo al punto', type: 'error' });
      return;
    }

    const isQuestionVisibleAtSubmit = (q: SurveyQuestion): boolean =>
      isFieldVisible(q.config?.visibleIf, (name: string) => {
        const targetQ = surveySchema.questions.find(p => p.name === name);
        return targetQ ? operativoDataValues[targetQ.id] : undefined;
      });

    const isAnswered = (q: SurveyQuestion, val: any): boolean => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim() !== '';
      if (Array.isArray(val)) return val.length > 0;
      if (q.type === 'LOCATION') return typeof val?.lat === 'number' && typeof val?.lng === 'number';
      if (typeof val === 'object') return Object.keys(val).length > 0;
      return true;
    };

    const missingRequired = surveySchema.questions.filter(q =>
      q.required && q.type !== 'SECTION_HEADER' && isQuestionVisibleAtSubmit(q) &&
      !(esPuntosAcumulacion && PUNTOS_RESIDUO_SURVEY_NAMES.includes(q.name ?? '')) &&
      !isAnswered(q, operativoDataValues[q.id]),
    );

    if (missingRequired.length > 0) {
      setToast({ message: `Faltan campos obligatorios: ${missingRequired.map(q => q.label).join(', ')}`, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const findValue = (name: string) => {
        const q = surveySchema.questions.find(q => q.name === name);
        return q ? operativoDataValues[q.id] : undefined;
      };

      const dateTimeVal = findValue('fecha_operativo') || new Date().toISOString();
      const locationVal = findValue('ubicacion_mapa') || { lat, lng };
      const photosVal = findValue('fotos_evidencia') || [];
      const barrioVal = findValue('barrio_detectado') || barrio;

      const actaQuestion = surveySchema.questions.find(q =>
        q.name?.toLowerCase().includes('acta') || q.label?.toLowerCase().includes('acta') ||
        (q.config?.accept && String(q.config.accept).includes('pdf')),
      );
      const actaRaw = actaQuestion ? operativoDataValues[actaQuestion.id] : undefined;
      const actaUrl = Array.isArray(actaRaw) ? actaRaw[0] : (actaRaw || undefined);

      const dto: any = {
        dateTime: new Date(dateTimeVal).toISOString(),
        lat: locationVal.lat,
        lng: locationVal.lng,
        barrio: barrioVal,
        photos: photosVal,
        actaPdfUrl: actaUrl,
        ...(esPuntosAcumulacion ? { residuos } : {}),
      };
      if (processId) dto.processId = processId;

      const created = await activityService.create(dto);
      await activityService.send(created.id);

      setToast({ message: 'Punto registrado y enviado a validación con éxito', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1500);
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
            <button onClick={() => navigate('/dashboard')} className="text-neutral-600 mr-4">←</button>
            <h1 className="text-xl font-bold text-institutional-black">Registrar Punto</h1>
          </div>
          <span className="badge badge-primary">Ambiental</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card mb-8 p-6 bg-white rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Tipo de registro</h2>
          <select
            value={operativoSubtipo}
            onChange={(e) => setOperativoSubtipo(e.target.value)}
            className="input-field"
          >
            <option value="AMBIENTAL_PUNTOS_ACUMULACION">{SUBTYPE_MAPPING['AMBIENTAL_PUNTOS_ACUMULACION']}</option>
          </select>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {surveyLoading ? (
            <div className="py-12 flex flex-col items-center gap-4 bg-white rounded-3xl border border-neutral-100 shadow-sm">
              <Loading />
              <p className="text-sm text-neutral-400 font-medium animate-pulse">Cargando formulario dinámico...</p>
            </div>
          ) : surveyError ? (
            <div className="py-12 px-6 text-center bg-white rounded-3xl border-2 border-dashed border-neutral-200 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-800 mb-2 uppercase tracking-wide">Formulario no disponible</h3>
              <p className="text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">{surveyError.message}</p>
            </div>
          ) : surveySchema ? (
            <>
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-neutral-200/50 border border-neutral-100">
                {(() => {
                  const { esPuntosAcumulacion } = resolveSubtipo(operativoSubtipo);
                  const visibleQuestions = esPuntosAcumulacion
                    ? surveySchema.questions.filter(q => !PUNTOS_RESIDUO_SURVEY_NAMES.includes(q.name ?? ''))
                    : surveySchema.questions;
                  return (
                    <DynamicFields
                      questions={visibleQuestions}
                      values={operativoDataValues}
                      onChange={handleOperativoDataChange}
                      catalogs={catalogs}
                      boundaries={boundaries}
                      layerVisibility={layerVisibility}
                      onLayerVisibilityChange={(l, v) => setLayerVisibility(p => ({ ...p, [l]: v }))}
                      onToggleAllLayers={(v) => setLayerVisibility({ barrios: v, carrera7: v, colegios: v, cestas: v, falloSanVictorino: v, propiedadHorizontal: v, upz: v, cambuches: v, bodegas: v })}
                      setLat={setLat}
                      setLng={setLng}
                      setBarrio={setBarrio}
                      getLocation={getLocation}
                      gettingLocation={gettingLocation}
                      locationAccuracy={locationAccuracy}
                      locationError={locationError}
                      barrio={barrio}
                    />
                  );
                })()}
              </div>

              {resolveSubtipo(operativoSubtipo).esPuntosAcumulacion && (
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
                    <div id="residuo-form-create" className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-primary uppercase tracking-wider">{editingResiduoId ? 'Editar Residuo' : 'Nuevo Residuo'}</h3>
                        <button type="button" onClick={() => { setShowResiduoForm(false); setNuevoResiduoValues({}); setEditingResiduoId(null); }} className="text-neutral-400 hover:text-neutral-600 text-sm">Cancelar</button>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipo de Residuo *</label>
                        <div className="grid grid-cols-1 gap-2">
                          {RESIDUO_TIPOS.map(opt => (
                            <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.tipoResiduo === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                              <input type="radio" name="nr_tipoResiduo" value={opt.value} checked={nuevoResiduoValues.tipoResiduo === opt.value} onChange={() => setNuevoResiduoValues(prev => ({ ...prev, tipoResiduo: opt.value }))} className="accent-primary" />
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
                          ].map(opt => (
                            <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.quienDispuso === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                              <input type="radio" name="nr_quienDispuso" value={opt.value} checked={nuevoResiduoValues.quienDispuso === opt.value} onChange={() => setNuevoResiduoValues(prev => ({ ...prev, quienDispuso: opt.value }))} className="accent-primary" />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Actores que generan indisciplina</label>
                        <div className="grid grid-cols-1 gap-2">
                          {ACTORES_INDISCIPLINA.map(opt => {
                            const seleccionados: string[] = Array.isArray(nuevoResiduoValues.actoresIndisciplina) ? nuevoResiduoValues.actoresIndisciplina : [];
                            const checked = seleccionados.includes(opt.value);
                            return (
                              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                                <input type="checkbox" checked={checked} onChange={() => setNuevoResiduoValues(prev => {
                                  const prevSel: string[] = Array.isArray(prev.actoresIndisciplina) ? prev.actoresIndisciplina : [];
                                  const next = checked ? prevSel.filter(v => v !== opt.value) : [...prevSel, opt.value];
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
                        <input type="datetime-local" value={nuevoResiduoValues.dateTime ? nuevoResiduoValues.dateTime.slice(0, 16) : new Date().toISOString().slice(0, 16)} onChange={e => setNuevoResiduoValues(prev => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))} className="input-field" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">¿Se perciben olores? *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(opt => (
                            <label key={String(opt.value)} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.percibeOlores === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                              <input type="radio" name="nr_percibeOlores" checked={nuevoResiduoValues.percibeOlores === opt.value} onChange={() => setNuevoResiduoValues(prev => ({ ...prev, percibeOlores: opt.value }))} className="accent-primary" />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">¿Se perciben vectores? (Roedores, Palomas, Insectos, Perros, Gatos) *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(opt => (
                            <label key={String(opt.value)} className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${nuevoResiduoValues.percibeVectores === opt.value ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-neutral-200 hover:border-primary/30'}`}>
                              <input type="radio" name="nr_percibeVectores" checked={nuevoResiduoValues.percibeVectores === opt.value} onChange={() => setNuevoResiduoValues(prev => ({ ...prev, percibeVectores: opt.value }))} className="accent-primary" />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Área lineal estimada (metros) *</label>
                        <input type="number" min="0" step="0.01" placeholder="Ej: 10" value={nuevoResiduoValues.areaLinealMetros ?? ''} onChange={e => setNuevoResiduoValues(prev => ({ ...prev, areaLinealMetros: e.target.value ? parseFloat(e.target.value) : undefined }))} className="input-field" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Observaciones</label>
                        <textarea rows={2} placeholder="Observaciones adicionales..." value={nuevoResiduoValues.observaciones ?? ''} onChange={e => setNuevoResiduoValues(prev => ({ ...prev, observaciones: e.target.value }))} className="input-field resize-none" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Foto de Evidencia * (máx. 1)</label>
                        <PhotosUpload onUploadSuccess={urls => setNuevoResiduoValues(prev => ({ ...prev, photos: urls.slice(0, 1) }))} existingUrls={nuevoResiduoValues.photos || []} maxPhotos={1} />
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
                            setResiduos(prev => prev.map((r, i) => {
                              const currId = r.id || `idx-${i}`;
                              return currId === editingResiduoId ? { ...nuevoResiduoValues, id: currId, recogido: r.recogido || false } as ResiduoEntry : r;
                            }));
                            setToast({ message: 'Residuo actualizado', type: 'success' });
                          } else {
                            setResiduos(prev => [...prev, {
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
            </>
          ) : (
            <div className="py-12 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-neutral-200 flex flex-col items-center gap-4">
              <p className="text-neutral-500 font-medium italic">Cargando formulario...</p>
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={loading || !surveySchema} className="btn-primary w-full py-4 text-lg shadow-xl shadow-primary/20 disabled:opacity-50 disabled:shadow-none transition-all">
              {loading ? 'Guardando...' : 'Finalizar Registro'}
            </button>
          </div>
        </form>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
