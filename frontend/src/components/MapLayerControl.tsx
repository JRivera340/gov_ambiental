import React from 'react';
import { useMap } from 'react-leaflet';

export interface LayerVisibility {
  barrios: boolean;
  carrera7: boolean;
  colegios: boolean;
  cestas: boolean;
  falloSanVictorino: boolean;
  propiedadHorizontal: boolean;
  upz: boolean;
  cambuches: boolean;
  bodegas: boolean;
}

interface MapLayerControlProps {
  /** Estado de visibilidad de las capas */
  layerVisibility: LayerVisibility;
  /** Callback cuando cambia la visibilidad de una capa */
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
  /** Callback para cambiar todas las capas a la vez (ej: Quitar todas) */
  onToggleAll?: (visible: boolean) => void;
  /** Posición del control en el mapa */
  position?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
  /** Callback cuando el panel desplegable se abre o cierra */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Componente de control para mostrar/ocultar capas del mapa
 */
export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  layerVisibility,
  onLayerVisibilityChange,
  onToggleAll,
  position = 'topright',
  onOpenChange,
}) => {
  const map = useMap();

  // Posicionamiento del control según la posición especificada
  const positionClasses = {
    topright: 'top-2 right-2',
    topleft: 'top-2 left-2',
    bottomright: 'bottom-2 right-2',
    bottomleft: 'bottom-2 left-2',
  };

  const handleToggle = (layer: keyof LayerVisibility) => {
    onLayerVisibilityChange(layer, !layerVisibility[layer]);
  };

  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  };

  // Al desmontar (cambio de vista), avisar que el panel quedó cerrado
  React.useEffect(() => {
    return () => onOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layersInfo: Array<{ key: keyof LayerVisibility; label: string; color: string }> = [
    { key: 'barrios', label: 'Barrios', color: '#3b82f6' },
    { key: 'carrera7', label: 'Carrera 7', color: '#0891b2' },
    { key: 'colegios', label: 'Colegios', color: '#ca8a04' },
    { key: 'cestas', label: 'Cestas', color: '#3b82f6' },
    { key: 'falloSanVictorino', label: 'Fallo San Victorino', color: '#f43f5e' },
    { key: 'propiedadHorizontal', label: 'Propiedad Horizontal', color: '#eab308' },
    { key: 'upz', label: 'UPZ', color: '#f97316' },
    { key: 'cambuches', label: 'Cambuches', color: '#ef4444' },
    { key: 'bodegas', label: 'Bodegas', color: '#7c3aed' },
  ];


  return (
    <div className={`absolute ${positionClasses[position]} z-[1000] flex flex-col items-end`}>
      {/* Toggle Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleOpen();
        }}
        className="bg-white hover:bg-neutral-50 p-1.5 md:p-2.5 rounded-lg shadow-lg border border-neutral-200 transition-colors duration-200 flex items-center justify-center group"
        title="Capas del mapa"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 md:w-5 md:h-5 text-neutral-700 group-hover:text-blue-600 transition-colors">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 12 12 17 22 12"></polyline>
          <polyline points="2 17 12 22 22 17"></polyline>
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="mt-1.5 md:mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 p-2 md:p-3 w-[min(62vw,260px)] md:w-[min(85vw,360px)] max-h-[220px] md:max-h-[350px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          <div className="flex justify-between items-center mb-1.5 md:mb-3 pb-1.5 md:pb-2 border-b border-neutral-100">
            <div className="text-[11px] md:text-sm font-semibold text-neutral-800">
              Capas del Mapa
            </div>
            {onToggleAll && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleAll(false);
                }}
                className="text-[9px] md:text-[10px] text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-1.5 md:px-2 py-0.5 rounded transition-colors"
              >
                Quitar todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-1 md:gap-x-2 gap-y-0.5 md:gap-y-1 mt-1">
            {layersInfo.map((layer) => (
              <label key={layer.key} className="flex items-center cursor-pointer group py-1 px-0.5 md:py-1.5 md:px-1 hover:bg-neutral-50 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={layerVisibility[layer.key]}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggle(layer.key);
                  }}
                  className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all shrink-0"
                />
                <span className="ml-1.5 md:ml-2.5 text-[10px] md:text-xs text-neutral-600 group-hover:text-neutral-900 flex items-center transition-colors truncate" title={layer.label}>
                  <span
                    className="inline-block w-2 h-2 md:w-2.5 md:h-2.5 rounded-full mr-1 md:mr-1.5 shrink-0 shadow-sm"
                    style={{ backgroundColor: layer.color }}
                  ></span>
                  <span className="truncate">{layer.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
