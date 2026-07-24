import { useState, useRef } from 'react';
import { filesService } from '../services/files.service';
import { Toast } from './Toast';

interface PhotosUploadProps {
  onUploadSuccess: (urls: string[]) => void;
  existingUrls?: string[];
  activityId?: string;
  disabled?: boolean;
  maxPhotos?: number;
}

export const PhotosUpload = ({ onUploadSuccess, existingUrls = [], activityId, disabled, maxPhotos = 5 }: PhotosUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Solo permitir una foto a la vez
    const file = files[0];

    // Validar cantidad total (máximo maxPhotos fotos incluyendo las existentes)
    if (existingUrls.length >= maxPhotos) {
      setError(`Ya ha alcanzado el límite de ${maxPhotos} foto${maxPhotos !== 1 ? 's' : ''}. Elimine una foto para poder agregar otra.`);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('La foto debe ser JPG, PNG o WebP');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar tamaño (10MB máximo por foto)
    if (file.size > 10 * 1024 * 1024) {
      setError('La foto no puede exceder 10MB');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError(null);
    setUploading(true);

    // Crear preview
    const previewPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    const previewUrl = await previewPromise;
    setPreviews([previewUrl]);

    try {
      const response = await filesService.uploadPhotos([file], activityId);
      // Agregar la nueva foto a las existentes en lugar de reemplazarlas
      const newUrls = response.keys || response.urls;
      const allUrls = [...existingUrls, ...newUrls];
      onUploadSuccess(allUrls);
      setSuccess('Foto subida exitosamente');
      setTimeout(() => setSuccess(null), 3000);
      setPreviews([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al subir la foto');
      setPreviews([]);
    } finally {
      setUploading(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newUrls = existingUrls.filter((_, i) => i !== index);
    onUploadSuccess(newUrls);
  };

  const allPhotos = [...(existingUrls || []), ...previews];

  // Asegurar que el componente siempre se renderice
  if (onUploadSuccess === undefined) {
    console.error('[PhotosUpload] onUploadSuccess is required');
    return (
      <div className="space-y-2 w-full p-4 border border-red-300 rounded bg-red-50">
        <p className="text-red-600 text-sm">Error: No se pudo inicializar el componente de carga de fotos. Por favor, recarga la página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full" style={{ minHeight: '200px' }}>
      <label className="block text-sm font-medium text-gray-700">
        Fotos de Evidencia <span className="text-red-500">*</span>
        <span className="text-xs text-gray-500 ml-2">
          Máximo {maxPhotos} foto{maxPhotos !== 1 ? 's' : ''} en total, máximo 10MB cada una
          {existingUrls.length > 0 && ` (${existingUrls.length}/${maxPhotos})`}
        </span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={uploading || disabled || existingUrls.length >= maxPhotos}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {existingUrls.length >= maxPhotos && (
        <p className="text-xs text-gray-500 mt-1">
          Ya ha alcanzado el límite de {maxPhotos} foto{maxPhotos !== 1 ? 's' : ''}. Elimine una foto para poder agregar otra.
        </p>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Subiendo fotos...
        </div>
      )}

      {allPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4">
          {allPhotos.map((urlOrKey, index) => {
            // data: (preview local) y http(s) se usan tal cual.
            // Una key relativa (p.ej. "photos/<id>/<file>.jpg") se convierte a URL
            // pública de R2 directamente, sin pasar por /api/files (que falla con keys anidadas).
            const isPreview = urlOrKey.startsWith('data:');
            const isHttp = urlOrKey.startsWith('http');
            const displayUrl =
              isPreview || isHttp
                ? urlOrKey
                : `https://pub-cabe26a560384a89a7e2a82367fb1813.r2.dev/${urlOrKey}`;

            return (
              <div key={index} className="relative group">
                <img
                  src={displayUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    // Si falla la carga, intentar usar la key como URL pública
                    if (!isPreview && !urlOrKey.startsWith('http')) {
                      const publicUrl = 'https://pub-cabe26a560384a89a7e2a82367fb1813.r2.dev';
                      (e.target as HTMLImageElement).src = `${publicUrl}/${urlOrKey}`;
                    }
                  }}
                />
                {!disabled && existingUrls.includes(urlOrKey) && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar foto"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {existingUrls.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {existingUrls.length} foto(s) subida(s)
        </p>
      )}

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess(null)} />}
    </div>
  );
};
