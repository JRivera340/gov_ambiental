import React from 'react';
import { useFileUrl } from '../../../hooks/useFileUrl';

// Miniatura de evidencia (lista de residuos).
export const ResiduoImage: React.FC<{ photo: string; onPreview?: (p: string) => void }> = ({ photo, onPreview }) => {
  const url = useFileUrl(photo);
  return (
    <div
      onClick={() => onPreview?.(photo)}
      className="shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-white/50 bg-neutral-100 group cursor-zoom-in"
    >
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Imagen de detalle (más grande, distingue foto de recogida).
export const ResiduoDetailImage: React.FC<{ photo: string; isRecogida?: boolean; onPreview?: (p: string) => void }> = ({ photo, isRecogida, onPreview }) => {
  const url = useFileUrl(photo);
  return (
    <div
      onClick={() => onPreview?.(photo)}
      className={`shrink-0 w-48 h-32 rounded-2xl overflow-hidden shadow-sm border cursor-zoom-in hover:shadow-md transition-all group ${isRecogida ? 'border-green-100' : 'border-neutral-100'}`}
    >
      {url ? (
        <img src={url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-50">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

// Imagen a pantalla completa (modal de preview).
export const PreviewImage: React.FC<{ photo: string }> = ({ photo }) => {
  const url = useFileUrl(photo);
  return url ? (
    <img src={url} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
  ) : (
    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
  );
};
