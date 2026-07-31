import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';

import { BoundaryLayer } from './BoundaryLayer';
import { BarriosLayer } from './BarriosLayer';
import { MapLayerControl, type LayerVisibility } from './MapLayerControl';
import { PhotosUpload } from './PhotosUpload';
import { ActaUpload } from './ActaUpload';
import type { CampoDef, SeccionCampos } from '../config/camposAmbientalShared';
import { isFieldVisible } from '../lib/fieldVisibility';
import type { User } from '../types';
import type { GeoJSON } from 'geojson';

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

export const CampoInput: React.FC<CampoInputProps> = ({ campo, value, onChange, gestores, currentUserId }) => {
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
  secciones: SeccionCampos[];
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
  highlightedCampo?: string | null;
}

export const CamposGenerales: React.FC<CamposGeneralesProps> = ({
  secciones, values, onChange, lat, lng, barrio, boundaries, layerVisibility,
  onLayerVisibilityChange, onToggleAllLayers, onMapClick,
  getLocation, gettingLocation, locationAccuracy, locationError,
  gestores, currentUserId, highlightedCampo,
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
              const isHighlighted = highlightedCampo === campo.name;
              return (
                <div
                  key={campo.name}
                  id={`campo-${campo.name}`}
                  className={`${colSpan} space-y-2 rounded-2xl transition-shadow ${isHighlighted ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                >
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
